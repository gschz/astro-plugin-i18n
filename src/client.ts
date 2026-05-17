/**
 * Entrypoint exclusivo para el navegador de @gschz/astro-plugin-i18n.
 *
 * Importa desde `@gschz/astro-plugin-i18n/client` (en vez del entrypoint raíz)
 * para evitar que Vite/Rollup intente incluir módulos de Node.js (`fs`, `path`)
 * en el bundle del cliente, lo que generaría advertencias y fallos en el browser.
 *
 * Re-exporta únicamente las funciones y tipos que son seguros para ejecutarse en
 * el navegador. Las funciones de carga de archivos (`loadTranslations`, etc.)
 * quedan disponibles solo a través del entrypoint raíz para uso en SSR.
 *
 * @module @gschz/astro-plugin-i18n/client
 */

export type {
  AstroI18nTypeRegistry,
  I18nLazyLoadingOptions,
  I18nLazyLoadingStrategy,
  I18nNamespacesOptions,
  I18nPluralizationOptions,
  Language,
  TranslationKey,
  TranslationOptions,
  TranslationValues,
} from './types';

export { bindDataI18n, renderDataI18n } from './core/dom';

export { getConfig, getSupportedLanguages } from './core/config';

export {
  bootstrapClientI18n,
  changeLanguage,
  getCurrentLanguage,
  setupLanguage,
  setupLanguageObserver,
  syncLanguageRoute,
} from './core/language';

export { populateClientCache, t } from './core/translate';

// useTranslation vive en su propio módulo para no acoplar React al core.
// Se re-exporta aquí para mantener compatibilidad total con v1.x
export { useTranslation } from './core/react/useTranslation';
