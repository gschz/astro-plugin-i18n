/**
 * Helpers SEO para enlaces alternos y metadatos Open Graph por idioma.
 */

import type { I18nPluginOptions, Language } from '../types';
import { normalizeRoutingOptions, resolveDefaultLanguage, resolveSupportedLanguages } from './routing';

/**
 * Tabla de casos especiales para la conversión BCP-47 → OG locale.
 * Cubre las variantes regionales más frecuentes que no siguen el patrón genérico.
 */
const OG_LOCALE_OVERRIDES: Readonly<Record<string, string>> = {
  'zh-CN': 'zh_CN',
  'zh-TW': 'zh_TW',
  'zh-HK': 'zh_HK',
  'pt-BR': 'pt_BR',
  'pt-PT': 'pt_PT',
  'es-MX': 'es_MX',
  'es-AR': 'es_AR',
  'fr-CA': 'fr_CA',
  'en-GB': 'en_GB',
  'en-AU': 'en_AU',
  'en-CA': 'en_CA',
  'en-US': 'en_US',
  'de-AT': 'de_AT',
  'de-CH': 'de_CH',
  'nl-BE': 'nl_BE',
  'sr-Latn': 'sr_Latn_RS',
};

/**
 * Convierte un código BCP-47 al formato requerido por Open Graph (`ll_RR`).
 *
 * Prioriza la tabla de casos especiales; si no existe una entrada, genera
 * la forma estándar reemplazando el guión por guión bajo.
 *
 * @param lang - Código de idioma BCP-47 (ej: `"pt-BR"`, `"en"`, `"es"`).
 * @returns Locale OG (ej: `"pt_BR"`, `"en_US"`, `"es_ES"`).
 */
export function langToOgLocale(lang: Language): string {
  const key = String(lang);

  if (OG_LOCALE_OVERRIDES[key]) {
    return OG_LOCALE_OVERRIDES[key];
  }

  // Para idiomas simples sin región (ej: 'es', 'en', 'de'), duplicamos el
  // código como región para producir el formato estándar ('es_ES', 'en_EN').
  // Nota: este fallback genérico es suficiente para og:locale:alternate.
  const normalized = key.replace('-', '_');
  if (!normalized.includes('_')) {
    const upper = normalized.toUpperCase();
    return `${normalized}_${upper}`;
  }

  return normalized;
}

/**
 * Genera el mapa OG locale para todos los idiomas soportados.
 *
 * Permite que `I18nHead` construya los metadatos Open Graph sin que el
 * consumidor tenga que definir el mapa manualmente.
 *
 * @param langs - Lista de idiomas soportados (ej: `['es', 'en', 'pt-BR']`).
 * @returns Mapa `{ lang → ogLocale }` (ej: `{ 'pt-BR': 'pt_BR', 'en': 'en_EN' }`).
 *
 * @example
 * ```ts
 * getOgLocaleMap(['es', 'en', 'pt-BR'])
 * // → { es: 'es_ES', en: 'en_EN', 'pt-BR': 'pt_BR' }
 * ```
 */
export function getOgLocaleMap(langs: Language[]): Record<string, string> {
  return Object.fromEntries(langs.map((lang) => [lang, langToOgLocale(lang)]));
}

function normalizePath(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function stripLanguagePrefix(pathname: string, supportedLangs: Language[]): string {
  const normalizedPath = normalizePath(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  const firstSegment = segments[0].toLowerCase();
  const hasLangPrefix = supportedLangs.some((lang) => lang.toLowerCase() === firstSegment);

  if (!hasLangPrefix) {
    return normalizedPath;
  }

  const nextSegments = segments.slice(1);

  if (nextSegments.length === 0) {
    return '/';
  }

  return `/${nextSegments.join('/')}`;
}

function buildPrefixedPath(basePath: string, lang: Language): string {
  if (basePath === '/') {
    return `/${lang}/`;
  }

  return `/${lang}${basePath}`;
}

/**
 * Calcula el path localizado para un idioma según la estrategia de routing.
 *
 * @param pathname - Path actual (puede incluir o no prefijo de idioma).
 * @param lang - Idioma objetivo para el path resultante.
 * @param options - Opciones i18n activas para resolver estrategia y defaultLang.
 * @returns Path localizado listo para usarse en enlaces alternos.
 */
export function getLocalizedPath(pathname: string, lang: Language, options: Partial<I18nPluginOptions>): string {
  const supportedLangs = resolveSupportedLanguages(options);
  const defaultLang = resolveDefaultLanguage(options, supportedLangs);
  const routing = normalizeRoutingOptions(options.routing);
  const basePath = stripLanguagePrefix(pathname, supportedLangs);

  if (routing.strategy === 'manual') {
    return basePath;
  }

  if (routing.strategy === 'prefix') {
    return buildPrefixedPath(basePath, lang);
  }

  if (lang === defaultLang && !routing.prefixDefaultLocale) {
    return basePath;
  }

  return buildPrefixedPath(basePath, lang);
}

/**
 * Construye href absolutos por idioma para etiquetas hreflang.
 *
 * @param pathname - Path base de la pagina actual.
 * @param siteUrl - URL base absoluta del sitio.
 * @param options - Configuracion i18n activa.
 * @returns Lista de enlaces alternos por idioma soportado.
 */
export function getAlternateLinks(
  pathname: string,
  siteUrl: string,
  options: Partial<I18nPluginOptions>,
): Array<{ lang: Language; href: string }> {
  const supportedLangs = resolveSupportedLanguages(options);

  return supportedLangs.map((lang) => {
    const localizedPath = getLocalizedPath(pathname, lang, options);
    return {
      lang,
      href: new URL(localizedPath, siteUrl).toString(),
    };
  });
}

/**
 * Calcula el href absoluto para hreflang x-default.
 *
 * @param pathname - Path base de la pagina actual.
 * @param siteUrl - URL base absoluta del sitio.
 * @param options - Configuracion i18n activa.
 * @returns URL absoluta para el idioma por defecto efectivo.
 */
export function getXDefaultHref(pathname: string, siteUrl: string, options: Partial<I18nPluginOptions>): string {
  const supportedLangs = resolveSupportedLanguages(options);
  const defaultLang = resolveDefaultLanguage(options, supportedLangs);
  const localizedPath = getLocalizedPath(pathname, defaultLang, options);

  return new URL(localizedPath, siteUrl).toString();
}
