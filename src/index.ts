/**
 * Entrypoint principal de @gschz/astro-plugin-i18n.
 *
 * Expone la API pública completa del plugin: tipos, funciones de traducción,
 * gestión de idioma, configuración, carga de archivos (servidor) y componentes.
 *
 * Para código de cliente (browser), usa el entrypoint dedicado:
 * `@gschz/astro-plugin-i18n/client`
 *
 * @module @gschz/astro-plugin-i18n
 */

// ── Tipos públicos ─────────────────────────────────────────────────────────
export type {
  AstroI18nTypeRegistry,
  I18nPluginOptions,
  Language,
  TranslationConfig,
  TranslationKey,
  TranslationOptions,
  TranslationValues,
} from './types';

// ── Traducción (cliente + servidor) ────────────────────────────────────────
export { populateClientCache, t, translateAsync, useTranslation } from './core/translate';

// ── Gestión de idioma ──────────────────────────────────────────────────────
export {
  bootstrapClientI18n,
  changeLanguage,
  getCurrentLanguage,
  setupLanguage,
  setupLanguageObserver,
} from './core/language';

// ── Configuración ──────────────────────────────────────────────────────────
export {
  getConfig,
  getDefaultLanguage,
  getSupportedLanguages,
  initConfig,
  resetConfig,
  updateConfig,
} from './core/config';

// ── Carga de traducciones (solo servidor) ──────────────────────────────────
export {
  clearTranslationsCache,
  getTranslation,
  getTranslationsForLanguage,
  loadTranslations,
} from './core/translations';

// ── Helpers auxiliares ─────────────────────────────────────────────────────
export {
  getI18nClientBootstrapPayload,
  getLanguageRedirect,
  isLanguageSupported,
  reloadTranslations,
} from './core/setup';

// ── Componentes ────────────────────────────────────────────────────────────
export { LangToggle } from './components/LangToggle';
export { TranslatedText } from './components/TranslatedText';

// ── Integración y utilidades de build ──────────────────────────────────────
export { default as createI18nIntegration } from './integration';
export { generateTranslationTypes } from './utils/type-generator';
