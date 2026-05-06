import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initConfig, resetConfig, updateConfig } from '../src/core/config';
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

describe('translate API (client cache)', () => {
  beforeEach(() => {
    resetConfig();
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      missingKeyStrategy: 'key',
    });
    clearClientCache();
  });

  it('resuelve traducciones con interpolacion desde cache', () => {
    populateClientCache('es', {
      demo: {
        welcome: 'Hola {name}',
      },
    });

    expect(t('demo.welcome', { values: { name: 'Gera' } })).toBe('Hola Gera');
  });

  it('aplica estrategia missingKeyStrategy=empty', () => {
    updateConfig({ missingKeyStrategy: 'empty' });

    expect(t('demo.missing')).toBe('');
  });

  it('aplica estrategia missingKeyStrategy=error', () => {
    updateConfig({ missingKeyStrategy: 'error' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(t('demo.missing')).toBe('[MISSING: demo.missing]');
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('devuelve la key cuando missingKeyStrategy=key', () => {
    updateConfig({ missingKeyStrategy: 'key' });

    expect(t('demo.missing')).toBe('demo.missing');
  });

  it('usa fallback de idioma en cliente antes de missingKeyStrategy', () => {
    updateConfig({
      fallback: {
        fr: 'en',
      },
      missingKeyStrategy: 'key',
    });

    populateClientCache('en', {
      demo: {
        welcome: 'Hello',
      },
    });

    expect(t('demo.welcome', { lang: 'fr' })).toBe('Hello');
  });

  it('evita ciclos en fallback de cliente y retorna key cuando falta', () => {
    updateConfig({
      fallback: {
        fr: 'en',
        en: 'fr',
      },
      missingKeyStrategy: 'key',
    });

    expect(t('demo.missing', { lang: 'fr' })).toBe('demo.missing');
  });

  it('resuelve namespaces en cache cliente y usa defaultNamespace', () => {
    updateConfig({
      namespaces: {
        enabled: true,
        defaultNamespace: 'common',
        separator: ':',
      },
    });

    populateClientCache('es', {
      common: {
        nav: {
          home: 'Inicio',
        },
      },
      auth: {
        login: {
          title: 'Ingresar',
        },
      },
    });

    expect(t('nav.home')).toBe('Inicio');
    expect(t('auth:login.title')).toBe('Ingresar');
  });

  it('resuelve pluralizacion basada en count', () => {
    populateClientCache('es', {
      items: {
        count_zero: 'No hay items',
        count_one: 'Hay {count} item',
        count_other: 'Hay {count} items',
      },
    });

    expect(t('items.count', { values: { count: 0 } })).toBe('No hay items');
    expect(t('items.count', { values: { count: 1 } })).toBe('Hay 1 item');
    expect(t('items.count', { values: { count: 5 } })).toBe('Hay 5 items');
  });
});
