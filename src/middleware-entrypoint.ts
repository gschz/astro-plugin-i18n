/**
 * Middleware de Astro para @gschz/astro-plugin-i18n.
 *
 * Se registra automáticamente con orden `"pre"` por la integración principal.
 * Su responsabilidad es inyectar la configuración del plugin en `locals.i18n`
 * para que páginas y layouts puedan acceder a ella durante el renderizado SSR
 * sin necesidad de importar el módulo de configuración directamente.
 */

import type { APIContext, MiddlewareNext } from 'astro';
import { defineMiddleware } from 'astro/middleware';
import {
  getPathLanguage,
  getRoutingRedirect,
  matchSupportedLanguage,
  resolveDefaultLanguage,
  resolveSupportedLanguages,
} from './core/routing';
import type { I18nPluginOptions, Language } from './types';
import { debugLog } from './utils/debug';

/**
 * Opciones validadas que se comparten con el middleware desde la integración.
 * Se inicializa con `null` y se rellena en {@link setOptions}.
 */
let validatedOptions: Partial<I18nPluginOptions> | null = null;

/**
 * Constante inlinada por Vite en build time cuando la integracion
 * `createI18nIntegration` se registra en `astro.config.*`. Se usa como primer
 * fallback de {@link getOptions} para que el middleware tenga las opciones
 * disponibles en runtimes serverless (Vercel, Cloudflare, Netlify) donde
 * `globalThis` del build no llega al runtime.
 *
 * Se declara como `string` (no `Partial<I18nPluginOptions>`) para evitar que
 * Vite intente serializar el objeto directamente y mantener el JSON portable
 * entre runtimes.
 *
 * El identificador se accede a traves de un helper que combina:
 *  - el lookup bare (Vite `define` lo reemplaza por un literal string), y
 *  - un fallback en `globalThis.__ASTRO_I18N_RUNTIME_OPTIONS__` que permite
 *    tests y consumidores avanzados fijar las opciones en runtime.
 */
declare const __ASTRO_I18N_RUNTIME_OPTIONS__: string | undefined;

function readBakedOptions(): string | undefined {
  // 1. Camino "build": Vite inlinea el identificador con un literal string.
  if (
    typeof __ASTRO_I18N_RUNTIME_OPTIONS__ === 'string' &&
    __ASTRO_I18N_RUNTIME_OPTIONS__.length > 0
  ) {
    return __ASTRO_I18N_RUNTIME_OPTIONS__;
  }

  // 2. Camino "test / consumidor avanzado": permite setear el JSON en globalThis
  //    sin depender de la sustitucion de Vite.
  if (typeof globalThis !== 'undefined') {
    try {
      const fromGlobal = (
        globalThis as { __ASTRO_I18N_RUNTIME_OPTIONS__?: unknown }
      ).__ASTRO_I18N_RUNTIME_OPTIONS__;
      if (typeof fromGlobal === 'string' && fromGlobal.length > 0) {
        return fromGlobal;
      }
    } catch {
      // Ignoramos entornos donde globalThis es read-only.
    }
  }
  return undefined;
}

type LanguageResolutionContext = Pick<
  APIContext,
  'url' | 'request' | 'cookies'
>;

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
 * Recupera las opciones almacenadas siguiendo este orden:
 * 1. Variable de modulo `validatedOptions` (seteada por {@link setOptions}).
 * 2. `globalThis.__ASTRO_I18N_OPTIONS__` (seteada por {@link setOptions}
 *    como respaldo, util en `astro dev` y reimports de modulo).
 * 3. Constante inlinada `__ASTRO_I18N_RUNTIME_OPTIONS__` que la integracion
 *    registra via `vite.define` en `astro:config:setup`. Es la unica fuente
 *    fiable en runtimes serverless porque se serializa en el bundle.
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

  // Fallback de runtime serverless: opciones inlinadas por Vite en build time.
  const bakedRaw = readBakedOptions();
  if (bakedRaw) {
    try {
      const baked = JSON.parse(bakedRaw) as Partial<I18nPluginOptions>;
      if (baked && typeof baked === 'object') {
        return baked;
      }
    } catch {
      // Si el JSON esta corrupto, seguimos con el flujo normal.
    }
  }

  console.warn(
    '[i18n] No se encontraron opciones en el middleware. Verifica la configuración de la integración.',
  );
  return null;
}

/**
 * Parsea `Accept-Language` y devuelve el primer idioma soportado según
 * prioridad por `q` (quality value) y orden original en caso de empate.
 */
function parseAcceptLanguageHeader(
  headerValue: string | null,
  supportedLangs: Language[],
): Language | null {
  if (!headerValue) {
    return null;
  }

  debugLog(`[parseAcceptLanguageHeader] headerValue=${headerValue}`);

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

  for (const preference of preferences) {
    const match = matchSupportedLanguage(preference.lang, supportedLangs);

    if (match) {
      debugLog(
        `[parseAcceptLanguageHeader] matched: ${preference.lang} -> ${match}`,
      );
      return match;
    }
  }

  return null;
}

/**
 * Resuelve el idioma de una request con prioridad:
 * 1) segmento URL, 2) cookie i18n-lang, 3) Accept-Language, 4) defaultLang.
 */
function resolveLanguageFromRequest(
  context: LanguageResolutionContext,
  options: Partial<I18nPluginOptions>,
): Language {
  const supportedLangs = resolveSupportedLanguages(options);
  const defaultLang = resolveDefaultLanguage(options, supportedLangs);

  // 1. Intenta extraer idioma del segmento de URL (ej: /en/, /pt-BR/)
  const urlLang = getPathLanguage(context.url.pathname, supportedLangs);
  if (urlLang) {
    debugLog(`[middleware] idioma resuelto desde URL: ${urlLang}`);
    return urlLang;
  }

  // 2. Cookie de preferencia guardada
  const cookieLang = matchSupportedLanguage(
    context.cookies?.get?.('i18n-lang')?.value,
    supportedLangs,
  );

  if (cookieLang) {
    debugLog(`[middleware] idioma resuelto desde cookie: ${cookieLang}`);
    return cookieLang;
  }

  // 3. Header Accept-Language
  const headerLang = parseAcceptLanguageHeader(
    context.request.headers.get('accept-language'),
    supportedLangs,
  );

  if (headerLang) {
    debugLog(
      `[middleware] idioma resuelto desde Accept-Language: ${headerLang}`,
    );
    return headerLang;
  }

  // 4. Idioma por defecto
  debugLog(`[middleware] usando idioma por defecto: ${defaultLang}`);
  return defaultLang;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
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
export const onRequest = defineMiddleware(
  (context: APIContext, next: MiddlewareNext) => {
    debugLog(`[middleware] processing request: ${context.url.pathname}`);

    const options = getOptions();
    const activeOptions = options || {};
    const redirectUrl = getRoutingRedirect(context.url, activeOptions);

    if (redirectUrl) {
      debugLog(
        `[middleware] redirecting ${context.url.pathname} → ${redirectUrl.pathname}`,
      );
      return Response.redirect(redirectUrl, 302);
    }

    const resolvedLanguage = resolveLanguageFromRequest(context, activeOptions);
    debugLog(
      `[middleware] resolved language: ${resolvedLanguage} for ${context.url.pathname}`,
    );

    if (!options) {
      console.warn(
        '[i18n] No hay opciones disponibles en el middleware. Verifica la configuración de la integración.',
      );
    }

    if (typeof context.locals === 'object' && context.locals !== null) {
      context.locals.i18n ??= {};

      // Inyectamos la config para que esté disponible durante el renderizado SSR.
      context.locals.i18n.config = options || {};
      context.locals.i18n.lang = resolvedLanguage;

      if (!options?.defaultLang) {
        console.warn(
          '[i18n] `defaultLang` no configurado en el middleware. El idioma por defecto puede ser incorrecto.',
        );
      }
    } else {
      console.warn(
        '[i18n] `context.locals` no es un objeto. El middleware no pudo inyectar la config i18n.',
      );
    }

    return next();
  },
);

export default onRequest;
