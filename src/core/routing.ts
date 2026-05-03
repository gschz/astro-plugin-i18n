/**
 * Utilidades de routing multilingue.
 *
 * Este modulo concentra la logica de:
 * - normalizacion de configuracion de routing,
 * - deteccion de idioma por segmento URL,
 * - calculo de redirects segun estrategia.
 */

import type { I18nPluginOptions, I18nRoutingOptions, I18nRoutingStrategy, Language } from '../types';

const VALID_ROUTING_STRATEGIES: ReadonlySet<I18nRoutingStrategy> = new Set([
  'manual',
  'prefix',
  'prefix-except-default',
]);

export interface NormalizedRoutingOptions {
  strategy: I18nRoutingStrategy;
  prefixDefaultLocale: boolean;
  redirectToDefaultLocale: boolean;
}

function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function removeTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

/**
 * Valida si un string es una estrategia de routing soportada.
 */
export function isI18nRoutingStrategy(value: string): value is I18nRoutingStrategy {
  return VALID_ROUTING_STRATEGIES.has(value as I18nRoutingStrategy);
}

/**
 * Intenta mapear un candidato de idioma a uno soportado por la configuracion.
 */
export function matchSupportedLanguage(
  candidate: string | null | undefined,
  supportedLangs: Language[],
): Language | null {
  if (!candidate || typeof candidate !== 'string') {
    return null;
  }

  const normalizedCandidate = candidate.trim().toLowerCase();

  if (!normalizedCandidate || normalizedCandidate === '*') {
    return null;
  }

  const exact = supportedLangs.find((lang) => lang.toLowerCase() === normalizedCandidate);

  if (exact) {
    return exact;
  }

  const candidateBase = normalizedCandidate.split('-')[0];
  const baseExact = supportedLangs.find((lang) => lang.toLowerCase() === candidateBase);

  if (baseExact) {
    return baseExact;
  }

  const basePrefix = supportedLangs.find((lang) => lang.toLowerCase().split('-')[0] === candidateBase);

  return basePrefix ?? null;
}

/**
 * Devuelve la lista de idiomas soportados con fallback robusto.
 */
export function resolveSupportedLanguages(options: Partial<I18nPluginOptions>): Language[] {
  const configured = Array.isArray(options.supportedLangs)
    ? options.supportedLangs.filter((lang): lang is Language => typeof lang === 'string' && lang.trim().length > 0)
    : [];

  if (configured.length > 0) {
    return configured;
  }

  if (typeof options.defaultLang === 'string' && options.defaultLang.trim().length > 0) {
    return [options.defaultLang];
  }

  return ['en'];
}

/**
 * Resuelve el idioma por defecto efectivo para la configuracion actual.
 */
export function resolveDefaultLanguage(options: Partial<I18nPluginOptions>, supportedLangs: Language[]): Language {
  const normalizedDefault = matchSupportedLanguage(options.defaultLang, supportedLangs);

  if (normalizedDefault) {
    return normalizedDefault;
  }

  return supportedLangs[0] || 'en';
}

/**
 * Normaliza opciones de routing a un estado completo y consistente.
 */
export function normalizeRoutingOptions(routing: I18nRoutingOptions | undefined): NormalizedRoutingOptions {
  const strategy = routing?.strategy ?? 'manual';

  return {
    strategy,
    prefixDefaultLocale: routing?.prefixDefaultLocale ?? strategy === 'prefix',
    redirectToDefaultLocale: routing?.redirectToDefaultLocale ?? strategy === 'prefix',
  };
}

/**
 * Obtiene el idioma del primer segmento de la ruta si es soportado.
 */
export function getPathLanguage(pathname: string, supportedLangs: Language[]): Language | null {
  const normalized = normalizePathname(pathname);
  const segment = normalized.split('/').find(Boolean);
  const result = matchSupportedLanguage(segment, supportedLangs);
  console.error(
    `[getPathLanguage] pathname=${pathname}, normalized=${normalized}, segment=${segment}, result=${result}, supportedLangs=${supportedLangs.join(',')}`,
  );
  return result;
}

function prefixPathWithLanguage(pathname: string, lang: Language): string {
  const normalized = normalizePathname(pathname);

  if (normalized === '/') {
    return `/${lang}/`;
  }

  return `/${lang}${normalized}`;
}

function stripLanguagePrefix(pathname: string, lang: Language): string {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split('/').filter(Boolean);

  if (segments.length === 0) {
    return '/';
  }

  if (segments[0].toLowerCase() !== lang.toLowerCase()) {
    return normalized;
  }

  const rest = segments.slice(1);

  if (rest.length === 0) {
    return '/';
  }

  return `/${rest.join('/')}`;
}

/**
 * Calcula si la URL actual requiere redirect de acuerdo a la estrategia de routing.
 */
export function getRoutingRedirect(url: URL, options: Partial<I18nPluginOptions>): URL | null {
  const supportedLangs = resolveSupportedLanguages(options);
  const defaultLang = resolveDefaultLanguage(options, supportedLangs);
  const routing = normalizeRoutingOptions(options.routing);

  if (routing.strategy === 'manual') {
    return null;
  }

  const currentPathname = normalizePathname(url.pathname);
  const pathLang = getPathLanguage(currentPathname, supportedLangs);

  let targetPathname: string | null = null;

  if (routing.strategy === 'prefix') {
    if (!pathLang && routing.redirectToDefaultLocale) {
      targetPathname = prefixPathWithLanguage(currentPathname, defaultLang);
    }
  } else if (pathLang === defaultLang && !routing.prefixDefaultLocale) {
    targetPathname = stripLanguagePrefix(currentPathname, defaultLang);
  } else if (!pathLang && routing.redirectToDefaultLocale && routing.prefixDefaultLocale) {
    targetPathname = prefixPathWithLanguage(currentPathname, defaultLang);
  }

  if (!targetPathname) {
    return null;
  }

  const normalizedCurrent = removeTrailingSlash(currentPathname);
  const normalizedTarget = removeTrailingSlash(targetPathname);

  if (normalizedCurrent === normalizedTarget) {
    return null;
  }

  const redirectUrl = new URL(url.toString());
  redirectUrl.pathname = targetPathname;
  return redirectUrl;
}
