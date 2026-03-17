// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import { bootstrapClientI18n, changeLanguage, getCurrentLanguage, setupLanguageObserver } from '../src/core/language';
import { t } from '../src/core/translate';

function clearClientCache(): void {
  const runtimeGlobal = globalThis as typeof globalThis & {
    __ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__?: Record<string, string>;
  };

  const cache = runtimeGlobal.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__;

  if (!cache) {
    return;
  }

  for (const key of Object.keys(cache)) {
    delete cache[key];
  }
}

describe('language lifecycle', () => {
  beforeEach(() => {
    resetConfig();
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      autoDetect: false,
    });

    clearClientCache();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');

    const runtimeWindow = window as Window & {
      __INITIAL_I18N_STATE__?: {
        lang?: string;
        translations?: Record<string, any>;
      };
      __INITIAL_I18N_ALL_TRANSLATIONS__?: Record<string, Record<string, any>>;
    };

    runtimeWindow.__INITIAL_I18N_STATE__ = {
      lang: 'es',
      translations: {
        demo: {
          title: 'Titulo ES',
        },
      },
    };

    runtimeWindow.__INITIAL_I18N_ALL_TRANSLATIONS__ = {
      es: {
        demo: {
          title: 'Titulo ES',
        },
      },
      en: {
        demo: {
          title: 'Title EN',
        },
      },
    };
  });

  it('bootstrapClientI18n hidrata cache y emite i18nready', () => {
    const readySpy = vi.fn();
    document.addEventListener('i18nready', readySpy);

    bootstrapClientI18n();

    expect(getCurrentLanguage()).toBe('es');
    expect(t('demo.title')).toBe('Titulo ES');
    expect(readySpy).toHaveBeenCalledTimes(1);
  });

  it('changeLanguage actualiza html, localStorage y notifica observers', () => {
    bootstrapClientI18n();

    const observerSpy = vi.fn();
    const unsubscribe = setupLanguageObserver(observerSpy);

    changeLanguage('en');

    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('language')).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
    expect(observerSpy).toHaveBeenCalledWith('en');
    expect(t('demo.title')).toBe('Title EN');

    unsubscribe();
  });

  it('prioriza idioma persistido cuando es soportado', () => {
    localStorage.setItem('language', 'en');

    bootstrapClientI18n();

    expect(getCurrentLanguage()).toBe('en');
    expect(t('demo.title')).toBe('Title EN');
  });
});
