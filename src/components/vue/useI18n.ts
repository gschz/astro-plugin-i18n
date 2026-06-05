import { ref, onMounted, onUnmounted, type Ref } from 'vue';
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
 * Composable de Vue que expone el idioma activo, una función para cambiarlo
 * y una función de traducción pre-vinculada al idioma reactivo.
 */
export function useI18n(): {
  language: Ref<Language>;
  changeLanguage: (lang: Language) => Promise<void>;
  t: (
    key: TranslationKey,
    options?: Omit<TranslationOptions, 'lang'>,
  ) => string;
} {
  const language: Ref<Language> = ref(getCurrentLanguage());
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    unsubscribe = setupLanguageObserver((newLang) => {
      language.value = newLang;
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  const changeLanguage = async (lang: Language): Promise<void> => {
    await coreChangeLanguage(lang);

    language.value = lang;
  };

  const translate = (
    key: TranslationKey,
    options?: Omit<TranslationOptions, 'lang'>,
  ): string => {
    return t(key, { ...options, lang: language.value });
  };

  return {
    language,
    changeLanguage,
    t: translate,
  };
}
