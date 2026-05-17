/**
 * Helpers auxiliares de alto nivel para @gschz/astro-plugin-i18n.
 *
 * Estas funciones son convenientes para código de aplicación (middlewares
 * personalizados, páginas, scripts de servidor) que necesita info sobre la
 * configuración activa sin importar los módulos core directamente.
 */

import type { I18nPluginOptions, Language } from '../types';
import { getConfig, getSupportedLanguages } from './config';
import { getCurrentLanguage } from './language';
import { getTranslationsForLanguage, clearTranslationsCache } from './translations';
import { getRoutingRedirect } from './routing';

/**
 * Estructura de estado inicial para hidratar i18n en el cliente.
 */
export interface I18nClientBootstrapPayload {
  /** Idioma resuelto en SSR para la request actual. */
  lang: Language;
  /** Traducciones del idioma inicial (útiles para primer render sin FOUC). */
  translations: Record<string, any>;
  /** Mapa de todos los idiomas soportados para cambios instantáneos en cliente. */
  allTranslations: Record<Language, Record<string, any>>;
  /** Lista final de idiomas usados para construir `allTranslations`. */
  supportedLangs: Language[];
  /** Configuración efectiva del plugin para hidratar el cliente. */
  config: ReturnType<typeof getConfig>;
}

/**
 * Invalida la caché de traducciones en memoria, forzando que la próxima lectura
 * acceda al sistema de archivos.
 *
 * Útil cuando los archivos JSON de traducción cambian en caliente durante el
 * desarrollo (HMR manual) o en escenarios de prueba que requieren estado limpio.
 */
export function reloadTranslations(): void {
  clearTranslationsCache();
}

/**
 * Indica si el idioma dado es soportado por la configuración activa.
 *
 * @param lang - Código de idioma a verificar.
 * @returns `true` si el idioma está en `supportedLangs`.
 */
export function isLanguageSupported(lang: Language): boolean {
  return getSupportedLanguages().includes(lang);
}

/**
 * Determina si la URL dada necesita ser redirigida según la configuración de
 * routing i18n activa.
 *
 * El comportamiento depende de `config.routing.strategy`:
 * - `manual`: nunca redirige.
 * - `prefix`: exige prefijo de idioma para todas las rutas.
 * - `prefix-except-default`: el idioma por defecto no lleva prefijo.
 *
 * @param url - URL de la petición entrante.
 * @returns Nueva URL con el prefijo de idioma, o `null` si no se necesita redirección.
 *
 * @example
 * ```ts
 * // En un middleware de Astro personalizado:
 * const redirect = getLanguageRedirect(context.url);
 * if (redirect) return Response.redirect(redirect);
 * ```
 */
export function getLanguageRedirect(url: URL): URL | null {
  return getRoutingRedirect(url, getConfig());
}

/**
 * Construye el payload SSR recomendado para inicializar i18n en el cliente.
 *
 * Esta función reduce el boilerplate típico en layouts Astro al centralizar:
 * - resolución de idioma de servidor,
 * - carga de traducciones iniciales,
 * - y precarga opcional de todos los idiomas soportados.
 *
 * @param locals - `Astro.locals` de la request actual.
 * @returns Payload listo para inyectarse en `window.__INITIAL_I18N_STATE__` y
 *   `window.__INITIAL_I18N_ALL_TRANSLATIONS__`.
 */
export async function getI18nClientBootstrapPayload(
  locals?: Record<string, any>,
  options?: { preloadNamespaces?: string[] },
): Promise<I18nClientBootstrapPayload> {
  const lang = getCurrentLanguage(locals);
  const translations = await getTranslationsForLanguage(lang);
  const config = getConfig();

  let initialTranslations = translations;
  const lazyLoading = config.lazyLoading;
  const preloadNamespaces = options?.preloadNamespaces ?? lazyLoading?.preloadNamespaces;

  if (
    lazyLoading?.enabled &&
    Array.isArray(preloadNamespaces) &&
    preloadNamespaces.length > 0 &&
    config.namespaces?.enabled
  ) {
    const filtered: Record<string, any> = {};

    for (const namespace of preloadNamespaces) {
      if (namespace in translations) {
        filtered[namespace] = translations[namespace];
      }
    }

    initialTranslations = filtered;
  }

  const localsConfig = locals?.i18n?.config as Partial<I18nPluginOptions> | undefined;

  let supportedLangs = [lang];
  if (localsConfig?.supportedLangs && localsConfig.supportedLangs.length > 0) {
    supportedLangs = localsConfig.supportedLangs;
  } else if (config.supportedLangs && config.supportedLangs.length > 0) {
    supportedLangs = config.supportedLangs;
  }

  const allTranslations = lazyLoading?.enabled
    ? ({} as Record<Language, Record<string, any>>)
    : (Object.fromEntries(
        await Promise.all(
          supportedLangs.map(async (supportedLang) => [supportedLang, await getTranslationsForLanguage(supportedLang)]),
        ),
      ) as Record<Language, Record<string, any>>);

  return {
    lang,
    translations: initialTranslations,
    allTranslations,
    supportedLangs,
    config,
  };
}
