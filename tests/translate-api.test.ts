import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initConfig, resetConfig, updateConfig } from '~/core/config';
import { populateClientCache, t } from '~/core/translate';

function clearClientCache(): void {
  const runtimeGlobal = globalThis as typeof globalThis & {
    __ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__?: Record<string, string>;
  };

  const cache = runtimeGlobal.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__;

  if (!cache) {
    return;
  }

  for (const key of Object.keys(cache)) {
    Reflect.deleteProperty(cache, key);
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
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    });

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

  it('pluralizacion desactivada retorna la clave base sin sufijo', () => {
    updateConfig({
      pluralization: { enabled: false, field: 'count' },
    });

    populateClientCache('es', {
      items: {
        count: 'Cantidad',
      },
    });

    expect(t('items.count', { values: { count: 3 } })).toBe('Cantidad');
  });

  it('valores de count no finitos no activan pluralizacion', () => {
    expect(t('items.count', { values: { count: Number.NaN } })).toBe(
      'items.count',
    );
    expect(t('items.count', { values: { count: Infinity } })).toBe(
      'items.count',
    );
  });

  it('count como string se convierte a numero para pluralizacion', () => {
    populateClientCache('en', {
      items: {
        count_one: '{count} item',
        count_other: '{count} items',
      },
    });

    expect(t('items.count', { values: { count: '1' }, lang: 'en' })).toBe(
      '1 item',
    );
    expect(t('items.count', { values: { count: '5' }, lang: 'en' })).toBe(
      '5 items',
    );
  });

  it('fallback de plural key en cliente', () => {
    updateConfig({
      fallback: { es: 'en' },
    });

    populateClientCache('en', {
      items: {
        count_one: '{count} item from en',
        count_other: '{count} items from en',
      },
    });

    expect(t('items.count', { values: { count: 1 }, lang: 'es' })).toBe(
      '1 item from en',
    );
  });
});
