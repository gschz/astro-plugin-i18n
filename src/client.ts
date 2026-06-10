/**
 * Entrypoint exclusivo para el navegador de @gschz/astro-plugin-i18n.
 *
 * Importa desde `@gschz/astro-plugin-i18n/client` (en vez del entrypoint raíz)
 * para evitar que Vite/Rollup intente incluir módulos de Node.js (`fs`, `path`)
 * en el bundle del cliente, lo que generaría advertencias y fallos en el browser.
 *
 * @module @gschz/astro-plugin-i18n/client
 */

import { allTranslations as _i18nAllTranslations } from 'virtual:@gschz/astro-plugin-i18n/internal';
import { populateClientCache } from './core/translate';
import type { Language } from './types';

// Poblamos la caché del cliente con todas las traducciones al cargar el módulo.
// Esto garantiza que t() funcione inmediatamente sin necesidad de bootstrap ni
// fetch(). El módulo virtual es resuelto por Vite en tiempo de build/dev.
for (const [lang, translations] of Object.entries(_i18nAllTranslations)) {
  populateClientCache(lang as Language, translations as Record<string, any>);
}

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
