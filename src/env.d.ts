/// <reference types="astro/client" />

declare module 'virtual:@gschz/astro-plugin-i18n/internal' {
  import type { I18nPluginOptions, Language } from './types';

  export const allTranslations: Record<string, Record<string, any>>;
  export const config: Partial<I18nPluginOptions>;
  export const defaultLang: Language;
  export const supportedLangs: Language[];
}
