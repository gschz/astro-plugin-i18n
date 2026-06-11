import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initConfig, resetConfig } from '~/core/config';
import { populateClientCache } from '~/core/translate';

// ── Helpers ──

function clearClientCache(): void {
  const runtimeGlobal = globalThis as typeof globalThis & {
    __ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__?: Record<string, string>;
  };
  const cache = runtimeGlobal.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__;
  if (!cache) return;
  for (const key of Object.keys(cache)) {
    Reflect.deleteProperty(cache, key);
  }
}

// ── Mocks ──

vi.mock('svelte/store', () => {
  const writable = <T>(
    initial: T,
    start?: (set: (value: T) => void) => () => void,
  ) => {
    let currentValue = initial;
    const subscribers = new Set<(value: T) => void>();

    const set = (value: T) => {
      currentValue = value;
      subscribers.forEach((fn) => fn(value));
    };

    let cleanup: (() => void) | undefined;
    if (start) {
      cleanup = start(set) ?? undefined;
    }

    const subscribe = (fn: (value: T) => void) => {
      fn(currentValue);
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
        if (subscribers.size === 0 && cleanup) {
          cleanup();
        }
      };
    };

    return {
      subscribe,
      set,
      update: (fn: (v: T) => T) => set(fn(currentValue)),
    };
  };

  const derived = <T, U>(
    store: { subscribe: (fn: (v: T) => void) => () => void },
    fn: (v: T) => U,
  ) => {
    let currentValue: U;
    const subscribe = (subscriber: (v: U) => void) => {
      const unsub = store.subscribe((v) => {
        currentValue = fn(v);
        subscriber(currentValue);
      });
      return unsub;
    };
    return { subscribe };
  };

  return { writable, derived };
});

// ── Tests ──

describe('i18n store (Svelte)', () => {
  beforeEach(() => {
    clearClientCache();
    resetConfig();
    initConfig({
      defaultLang: 'en',
      supportedLangs: ['en', 'es'],
      missingKeyStrategy: 'key',
    });
  });

  afterEach(() => {
    resetConfig();
    clearClientCache();
  });

  it('debe exportar language store, changeLanguage y t', async () => {
    const { language, changeLanguage, t } =
      await import('~/components/svelte/i18n');

    expect(language).toBeDefined();
    expect(language).toHaveProperty('subscribe');
    expect(typeof changeLanguage).toBe('function');
    expect(t).toHaveProperty('subscribe');
  });

  it('language store debe inicializarse con el idioma actual', async () => {
    const { language } = await import('~/components/svelte/i18n');

    let currentLang: string | undefined;
    const unsubscribe = language.subscribe((lang: string) => {
      currentLang = lang;
    });

    expect(currentLang).toBe('en');
    unsubscribe();
  });

  it('t debe traducir usando el idioma activo del store', async () => {
    populateClientCache('en', { greeting: 'Hello' });
    populateClientCache('es', { greeting: 'Hola' });

    const { t } = await import('~/components/svelte/i18n');
    let $t: any;
    t.subscribe((v: any) => ($t = v))();

    expect($t('greeting')).toBe('Hello');
  });

  it('t debe devolver la clave si la traducción no existe', async () => {
    const { t } = await import('~/components/svelte/i18n');
    let $t: any;
    t.subscribe((v: any) => ($t = v))();

    expect($t('missing.key')).toBe('missing.key');
  });

  it('t debe soportar interpolación de variables', async () => {
    populateClientCache('en', { greeting: 'Hello, {name}!' });

    const { t } = await import('~/components/svelte/i18n');
    let $t: any;
    t.subscribe((v: any) => ($t = v))();

    expect($t('greeting', { values: { name: 'World' } })).toBe('Hello, World!');
  });

  it('translate se exporta como funcion', async () => {
    const { translate } = await import('~/components/svelte/i18n');

    expect(typeof translate).toBe('function');
  });

  it('translate traduce usando el idioma activo', async () => {
    populateClientCache('en', { greeting: 'Hello' });

    const { translate } = await import('~/components/svelte/i18n');

    expect(translate('greeting')).toBe('Hello');
  });

  it('translate soporta interpolacion de valores', async () => {
    populateClientCache('en', { greeting: 'Hello, {name}!' });

    const { translate } = await import('~/components/svelte/i18n');

    expect(translate('greeting', { values: { name: 'World' } })).toBe(
      'Hello, World!',
    );
  });

  it('translate devuelve la key si no existe traduccion', async () => {
    const { translate } = await import('~/components/svelte/i18n');

    expect(translate('missing.key')).toBe('missing.key');
  });

  it('el módulo svelte/index exporta todos los símbolos correctamente', async () => {
    const svelteModule = await import('~/components/svelte/index');

    expect(svelteModule).toHaveProperty('language');
    expect(svelteModule).toHaveProperty('changeLanguage');
    expect(svelteModule).toHaveProperty('t');
    expect(svelteModule).toHaveProperty('translate');
  });
});
