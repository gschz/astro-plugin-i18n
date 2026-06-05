import { createSignal, onMount, onCleanup } from 'solid-js';
import {
  getCurrentLanguage,
  changeLanguage as coreChangeLanguage,
  setupLanguageObserver,
} from '~/core/language';
import { t } from '~/core/translate';
import type {
  Language,
  TranslationKey,
  TranslationOptions,
} from '~/types/index';

/**
 * Hook de Solid que expone el idioma activo como señal reactiva, una función
 * para cambiarlo y una función de traducción vinculada a esa señal.
 */
export function useI18n(): {
  language: () => Language;
  changeLanguage: (lang: Language) => Promise<void>;
  t: (
    key: TranslationKey,
    options?: Omit<TranslationOptions, 'lang'>,
  ) => string;
} {
  const [language, setLanguage] = createSignal<Language>(getCurrentLanguage());
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = setupLanguageObserver((newLang) => {
      setLanguage(() => newLang);
    });
  });

  onCleanup(() => {
    unsubscribe?.();
  });

  const changeLanguage = async (lang: Language): Promise<void> => {
    await coreChangeLanguage(lang);

    setLanguage(() => lang);
  };

  const translate = (
    key: TranslationKey,
    options?: Omit<TranslationOptions, 'lang'>,
  ): string => {
    return t(key, { ...options, lang: language() });
  };

  return {
    language,
    changeLanguage,
    t: translate,
  };
}
