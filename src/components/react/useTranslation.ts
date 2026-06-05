import { useEffect, useState } from 'react';
import type {
  Language,
  TranslationKey,
  TranslationOptions,
} from '~/types/index';
import {
  changeLanguage,
  getCurrentLanguage,
  setupLanguageObserver,
} from '~/core/language';
import { t } from '~/core/translate';

/**
 * Hook de React que expone las funciones de traducción y reacciona automáticamente
 * a los cambios de idioma.
 */
export function useTranslation(): {
  language: Language;
  changeLanguage: typeof changeLanguage;
  t: (
    key: TranslationKey,
    options?: Omit<TranslationOptions, 'lang'>,
  ) => string;
} {
  const [language, setLanguage] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = setupLanguageObserver((newLang) => {
      setLanguage(newLang);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    language,
    changeLanguage,
    t: (key: TranslationKey, options?: Omit<TranslationOptions, 'lang'>) =>
      t(key, { ...options, lang: language }),
  };
}
