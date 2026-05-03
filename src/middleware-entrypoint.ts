/**
 * Middleware de Astro para @gschz/astro-plugin-i18n.
 *
 * Se registra automáticamente con orden `"pre"` por la integración principal.
 * Su responsabilidad es inyectar la configuración del plugin en `locals.i18n`
 * para que páginas y layouts puedan acceder a ella durante el renderizado SSR
 * sin necesidad de importar el módulo de configuración directamente.
 */

import { defineMiddleware } from 'astro/middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import type { I18nPluginOptions, Language } from './types';
import {
  getPathLanguage,
  getRoutingRedirect,
  matchSupportedLanguage,
  resolveDefaultLanguage,
  resolveSupportedLanguages,
} from './core/routing';

/**
 * Opciones validadas que se comparten con el middleware desde la integración.
 * Se inicializa con `null` y se rellena en {@link setOptions}.
 */
let validatedOptions: Partial<I18nPluginOptions> | null = null;

type LanguageResolutionContext = Pick<APIContext, 'url' | 'request' | 'cookies'>;

/**
 * Almacena las opciones del plugin para que el middleware pueda acceder a ellas
 * en cada petición. Lo llama la integración en los hooks `astro:config:setup`
 * y `astro:server:setup` para garantizar que las opciones estén disponibles
 * antes de que llegue la primera petición.
 *
 * También las persiste en `globalThis.__ASTRO_I18N_OPTIONS__` como mecanismo
 * de respaldo en entornos donde el módulo puede ser reimportado.
 *
 * @param options - Opciones validadas del plugin, o `null` para limpiar.
 */
export function setOptions(options: Partial<I18nPluginOptions> | null): void {
  validatedOptions = options;

  if (typeof globalThis !== 'undefined') {
    try {
      globalThis.__ASTRO_I18N_OPTIONS__ = options || undefined;
    } catch {
      // Silenciamos errores en entornos donde `globalThis` es read-only.
    }
  }
}

/**
 * Recupera las opciones almacenadas, consultando primero la variable de módulo
 * y luego el fallback en `globalThis.__ASTRO_I18N_OPTIONS__`.
 *
 * @returns Opciones del plugin o `null` si no se han configurado.
 */
function getOptions(): Partial<I18nPluginOptions> | null {
  if (validatedOptions) {
    return validatedOptions;
  }

  if (typeof globalThis !== 'undefined') {
    try {
      const globalOptions = globalThis.__ASTRO_I18N_OPTIONS__;
      if (globalOptions) {
        return globalOptions;
      }
    } catch {
      // Silenciamos errores en entornos donde `globalThis` es read-only.
    }
  }

  console.warn('[i18n] No se encontraron opciones en el middleware. Verifica la configuración de la integración.');
  return null;
}

/**
 * Parsea `Accept-Language` y devuelve el primer idioma soportado según
 * prioridad por `q` (quality value) y orden original en caso de empate.
 */
function parseAcceptLanguageHeader(headerValue: string | null, supportedLangs: Language[]): Language | null {
  if (!headerValue) {
    return null;
  }

  console.error(`[parseAcceptLanguageHeader] headerValue=${headerValue}, supportedLangs=${supportedLangs.join(',')}`);

  const preferences = headerValue
    .split(',')
    .map((segment, index) => {
      const [langToken, ...params] = segment.trim().split(';');
      const lang = langToken?.trim();

      if (!lang) {
        return null;
      }

      let quality = 1;

      for (const param of params) {
        const normalizedParam = param.trim();

        if (!normalizedParam.startsWith('q=')) {
          continue;
        }

        const parsedQuality = Number(normalizedParam.slice(2));

        if (!Number.isNaN(parsedQuality)) {
          quality = Math.max(0, Math.min(parsedQuality, 1));
        }
      }

      if (quality <= 0) {
        return null;
      }

      return {
        lang,
        quality,
        index,
      };
    })
    .filter(
      (entry): entry is { lang: string; quality: number; index: number } =>
        entry !== null && entry.quality > 0 && entry.lang.length > 0,
    )
    .sort((a, b) => {
      if (b.quality === a.quality) {
        return a.index - b.index;
      }

      return b.quality - a.quality;
    });

  console.error(`[parseAcceptLanguageHeader] preferences after parsing: ${JSON.stringify(preferences)}`);

  for (const preference of preferences) {
    const match = matchSupportedLanguage(preference.lang, supportedLangs);

    if (match) {
      console.error(`[parseAcceptLanguageHeader] Matched: ${preference.lang} -> ${match}`);
      return match;
    }
  }

  return null;
}

/**
 * Resuelve el idioma de una request con prioridad:
 * 1) segmento URL, 2) cookie i18n-lang, 3) Accept-Language, 4) defaultLang.
 */
function resolveLanguageFromRequest(context: LanguageResolutionContext, options: Partial<I18nPluginOptions>): Language {
  console.error(`[CRITICAL-DEBUG] Entering resolveLanguageFromRequest for ${context.url.pathname}`);
  const supportedLangs = resolveSupportedLanguages(options);
  console.error(`[CRITICAL-DEBUG] supportedLangs resolved to: ${JSON.stringify(supportedLangs)}`);
  const defaultLang = resolveDefaultLanguage(options, supportedLangs);

  // 1. Intenta extraer idioma del segmento de URL (ej: /en/, /pt-BR/)
  const urlLang = getPathLanguage(context.url.pathname, supportedLangs);
  if (urlLang) {
    console.error(`[i18n] Idioma resuelto desde URL: ${urlLang}`);
    return urlLang;
  }

  // 2. Cookie de preferencia guardada
  const cookieLang = matchSupportedLanguage(context.cookies?.get?.('i18n-lang')?.value, supportedLangs);
  if (cookieLang) {
    console.error(`[i18n] Idioma resuelto desde cookie: ${cookieLang}`);
    return cookieLang;
  }

  // 3. Header Accept-Language
  const headerLang = parseAcceptLanguageHeader(context.request.headers.get('accept-language'), supportedLangs);
  if (headerLang) {
    console.error(`[i18n] Idioma resuelto desde Accept-Language: ${headerLang}`);
    return headerLang;
  }

  // 4. Idioma por defecto
  console.error(`[i18n] Usando idioma por defecto: ${defaultLang}`);
  return defaultLang;
}

declare global {
  namespace App {
    interface Locals {
      /** Contexto i18n inyectado por el middleware en cada petición SSR. */
      i18n?: {
        /** Idioma resuelto para la request actual. */
        lang?: Language;
        /** Configuración activa del plugin para este request. */
        config?: Partial<I18nPluginOptions>;
      };
    }
  }
}

/**
 * Handler del middleware Astro que inyecta la configuración i18n en `locals`.
 *
 * Al exponer la config en `locals.i18n.config`, los layouts y páginas pueden
 * llamar a `getCurrentLanguage(Astro.locals)` para obtener el idioma correcto
 * en SSR sin depender de cookies, headers ni detección de navegador.
 */
export const onRequest = defineMiddleware((context: APIContext, next: MiddlewareNext) => {
  console.error(`[i18n-middleware] Processing request: ${context.url.pathname}`);
  const options = getOptions();
  const activeOptions = options || {};
  const redirectUrl = getRoutingRedirect(context.url, activeOptions);

  if (redirectUrl) {
    console.error(`[i18n-middleware] Redirecting ${context.url.pathname} to ${redirectUrl.pathname}`);
    return Response.redirect(redirectUrl, 302);
  }

  const resolvedLanguage = resolveLanguageFromRequest(context, activeOptions);
  console.error(`[i18n-middleware] Final resolved language: ${resolvedLanguage} for ${context.url.pathname}`);

  if (!options) {
    console.warn('[i18n] No hay opciones disponibles en el middleware. La configuración puede estar incompleta.');
  }

  if (typeof context.locals === 'object' && context.locals !== null) {
    const locals = context.locals as any;

    if (!locals.i18n) {
      locals.i18n = {};
    }

    // Inyectamos la config para que esté disponible durante el renderizado SSR.
    locals.i18n.config = options || {};
    locals.i18n.lang = resolvedLanguage;

    if (!options?.defaultLang) {
      console.warn('[i18n] `defaultLang` no configurado en el middleware. El idioma por defecto puede ser incorrecto.');
    }
  } else {
    console.warn('[i18n] `context.locals` no es un objeto. El middleware no pudo inyectar la config i18n.');
  }

  return next();
});

export default onRequest;
