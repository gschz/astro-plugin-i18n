import { derived, writable, type Readable } from 'svelte/store';
import {
  changeLanguage as coreChangeLanguage,
  getCurrentLanguage,
  setupLanguageObserver,
} from '~/core/language';
import { t as coreT } from '~/core/translate';
import type {
  Language,
  TranslationKey,
  TranslationOptions,
} from '~/types/index';

const _languageStore = writable<Language>(
  getCurrentLanguage(),
  (set: (value: Language) => void) => {
    const unsubscribe = setupLanguageObserver((newLang) => {
      set(newLang);
    });

    return unsubscribe;
  },
);

export const language: Readable<Language> = {
  subscribe: _languageStore.subscribe,
};

export async function changeLanguage(lang: Language): Promise<void> {
  await coreChangeLanguage(lang);
}
function getCurrentLangFromStore(): Language {
  let lang: Language = getCurrentLanguage();
  const unsubscribe = language.subscribe((value: Language) => {
    lang = value;
  });
  unsubscribe();
  return lang;
}

export function translate(
  key: TranslationKey,
  options?: Omit<TranslationOptions, 'lang'>,
): string {
  const lang = getCurrentLangFromStore();
  return coreT(key, { ...options, lang });
}

/**
 * Store derivado para uso reactivo en plantillas Svelte.
 *
 * @example
 * ```svelte
 * <p>{$t('nav.home')}</p>
 * ```
 */
export const t = derived(
  language,
  ($lang) =>
    (key: TranslationKey, options?: Omit<TranslationOptions, 'lang'>) => {
      return coreT(key, { ...options, lang: $lang });
    },
);
