// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import { bootstrapClientI18n, changeLanguage, getCurrentLanguage, setupLanguageObserver } from '../src/core/language';
import { populateClientCache, t } from '../src/core/translate';

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
    const browserWindow = globalThis as unknown as Window & {
      __INITIAL_I18N_STATE__?: {
        lang?: string;
        translations?: Record<string, any>;
      };
      __INITIAL_I18N_ALL_TRANSLATIONS__?: Record<string, Record<string, any>>;
    };

    resetConfig();
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      autoDetect: false,
    });

    clearClientCache();
    browserWindow.localStorage.clear();
    document.documentElement.removeAttribute('lang');

    browserWindow.__INITIAL_I18N_STATE__ = {
      lang: 'es',
      translations: {
        demo: {
          title: 'Titulo ES',
        },
      },
    };

    browserWindow.__INITIAL_I18N_ALL_TRANSLATIONS__ = {
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

  it('prefiere navigator.languages cuando no hay estado SSR ni preferencia guardada', () => {
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en', 'pt-BR'],
      autoDetect: true,
    });

    const browserWindow = globalThis as unknown as Window & {
      __INITIAL_I18N_STATE__?: {
        lang?: string;
        translations?: Record<string, any>;
      };
    };

    browserWindow.__INITIAL_I18N_STATE__ = undefined;
    browserWindow.localStorage.clear();
    document.documentElement.removeAttribute('lang');

    vi.spyOn(browserWindow.navigator, 'languages', 'get').mockReturnValue(['pt-BR', 'en-US']);
    vi.spyOn(browserWindow.navigator, 'language', 'get').mockReturnValue('pt-BR');

    expect(getCurrentLanguage()).toBe('pt-BR');
  });

  it('bootstrapClientI18n hidrata cache y emite i18nready', async () => {
    const readySpy = vi.fn();
    document.addEventListener('i18nready', readySpy);

    bootstrapClientI18n();

    await vi.waitFor(() => {
      expect(readySpy).toHaveBeenCalledTimes(1);
    });

    expect(getCurrentLanguage()).toBe('es');
    expect(t('demo.title')).toBe('Titulo ES');
  });

  it('changeLanguage actualiza html, localStorage y notifica observers', () => {
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en', 'pt-BR'],
      routing: {
        strategy: 'prefix-except-default',
        prefixDefaultLocale: false,
        redirectToDefaultLocale: true,
      },
    });

    const browserWindow = globalThis as unknown as Window;

    browserWindow.history.replaceState({}, '', '/en/');
    bootstrapClientI18n();

    const observerSpy = vi.fn();
    const unsubscribe = setupLanguageObserver(observerSpy);

    changeLanguage('pt-BR');

    expect(browserWindow.location.pathname).toBe('/pt-BR/');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(browserWindow.localStorage.getItem('language')).toBe('pt-BR');
    expect(browserWindow.localStorage.getItem('lang')).toBe('pt-BR');
    expect(observerSpy).toHaveBeenCalledWith('pt-BR');
    expect(t('demo.title')).toBe('demo.title');

    unsubscribe();
  });

  it('prioriza idioma persistido cuando es soportado', () => {
    const browserWindow = globalThis as unknown as Window & {
      __INITIAL_I18N_STATE__?: {
        lang?: string;
        translations?: Record<string, any>;
      };
    };

    browserWindow.__INITIAL_I18N_STATE__ = undefined;

    browserWindow.localStorage.setItem('language', 'en');

    bootstrapClientI18n();

    expect(getCurrentLanguage()).toBe('en');
    expect(t('demo.title')).toBe('Title EN');
  });

  it('en SSR prioriza locals.i18n.lang sobre defaultLang en config', () => {
    const ssrLocals = {
      i18n: {
        lang: 'en',
        config: {
          defaultLang: 'es',
          supportedLangs: ['es', 'en'],
        },
      },
    };

    expect(getCurrentLanguage(ssrLocals)).toBe('en');
  });

  it('changeLanguage hace fetch cuando lazyLoading esta activo y no hay cache', async () => {
    const fetchSpy = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({ demo: { title: 'Title EN' } }),
      } as Response),
    );

    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchSpy;

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      autoDetect: false,
      lazyLoading: {
        enabled: true,
        publicPath: '/i18n',
      },
    });

    await changeLanguage('en');

    expect(fetchSpy).toHaveBeenCalledWith('/i18n/en.json');
    expect(t('demo.title', { lang: 'en' })).toBe('Title EN');
  });

  it('changeLanguage no hace fetch si el idioma ya esta en cache', async () => {
    const fetchSpy = vi.fn();
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchSpy as typeof fetch;

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      autoDetect: false,
      lazyLoading: {
        enabled: true,
        publicPath: '/i18n',
      },
    });

    populateClientCache('en', {
      demo: {
        title: 'Title EN',
      },
    });

    await changeLanguage('en');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(t('demo.title', { lang: 'en' })).toBe('Title EN');
  });

  it('con lazyLoading y preloadNamespaces hace fetch al bootstrap para completar el idioma SSR', async () => {
    const fetchSpy = vi.fn(async () =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          common: { welcome: 'Hola completo' },
          meta: { environment: 'Demo' },
        }),
      } as Response),
    );

    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchSpy;

    resetConfig();
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      autoDetect: false,
      namespaces: {
        enabled: true,
        defaultNamespace: 'common',
        separator: ':',
      },
      lazyLoading: {
        enabled: true,
        publicPath: '/i18n',
        preloadNamespaces: ['common'],
      },
    });

    const browserWindow = globalThis as unknown as Window & {
      __INITIAL_I18N_STATE__?: {
        lang?: string;
        translations?: Record<string, any>;
      };
      __INITIAL_I18N_ALL_TRANSLATIONS__?: Record<string, Record<string, any>>;
    };

    clearClientCache();
    browserWindow.localStorage.clear();
    document.documentElement.removeAttribute('lang');

    browserWindow.__INITIAL_I18N_STATE__ = {
      lang: 'es',
      translations: {
        common: {
          welcome: 'SSR parcial',
        },
      },
    };

    browserWindow.__INITIAL_I18N_ALL_TRANSLATIONS__ = {};

    bootstrapClientI18n();

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/i18n/es.json');
    });

    await vi.waitFor(() => {
      expect(t('meta:environment')).toBe('Demo');
    });
  });
});
