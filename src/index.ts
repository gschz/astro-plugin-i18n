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
  I18nLazyLoadingOptions,
  I18nLazyLoadingStrategy,
  I18nNamespacesOptions,
  I18nPluginOptions,
  I18nPluralizationOptions,
  Language,
  TranslationConfig,
  TranslationKey,
  TranslationOptions,
  TranslationValues,
} from './types';

// ── Traducción (cliente + servidor) ────────────────────────────────────────
export { populateClientCache, t } from './core/translate';
export { translateAsync } from './core/translate-async';

// ── Hook React (re-exportado para compatibilidad con v1.x) ─────────────────
export { useTranslation } from './core/react/useTranslation';

// ── Gestión de idioma ──────────────────────────────────────────────────────
export {
  bootstrapClientI18n,
  changeLanguage,
  getCurrentLanguage,
  setupLanguage,
  setupLanguageObserver,
  syncLanguageRoute,
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

// ── SEO multilingüe ────────────────────────────────────────────────────────
export { getAlternateLinks, getLocalizedPath, getOgLocaleMap, getXDefaultHref, langToOgLocale } from './core/seo';

// ── Componentes ────────────────────────────────────────────────────────────
export { LangToggle } from './components/LangToggle';
export { TranslatedText } from './components/TranslatedText';

// ── DOM declarativo (browser-only) ─────────────────────────────────────────
export { bindDataI18n, renderDataI18n } from './core/dom';
export type { DataI18nBinderOptions, DataI18nRenderOptions } from './core/dom';

// ── Integración y utilidades de build ──────────────────────────────────────
export { default as createI18nIntegration } from './integration';
export { generateTranslationTypes } from './utils/type-generator';

// ── Auditoría de cobertura (server-only) ───────────────────────────────────
export { auditTranslationCoverage } from './core/audit';
export type { TranslationCoverageResult } from './core/audit';
