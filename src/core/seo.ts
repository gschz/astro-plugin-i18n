/**
 * Helpers SEO para enlaces alternos y metadatos Open Graph por idioma.
 */

import type { I18nPluginOptions, Language } from '../types';
import { normalizeRoutingOptions, resolveDefaultLanguage, resolveSupportedLanguages } from './routing';

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
