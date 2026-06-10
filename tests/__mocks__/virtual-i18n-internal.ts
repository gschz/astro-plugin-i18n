import type { I18nPluginOptions, Language } from '~/types';

export const allTranslations: Record<string, Record<string, any>> = {};
export const config: Partial<I18nPluginOptions> = {};
export const defaultLang: Language = 'es';
export const supportedLangs: Language[] = ['es'];
