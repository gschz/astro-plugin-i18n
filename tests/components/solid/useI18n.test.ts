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

vi.mock('solid-js', () => ({
  createSignal: <T>(
    initial: T,
  ): [() => T, (updater: T | ((prev: T) => T)) => void] => {
    let value = initial;
    const getter = () => value;
    const setter = (updater: T | ((prev: T) => T)) => {
      value =
        typeof updater === 'function'
          ? (updater as (prev: T) => T)(value)
          : updater;
    };
    return [getter, setter];
  },
  onMount: (fn: () => void) => fn(),
  onCleanup: (fn: () => void) => fn(),
}));

// ── Tests ───

describe('useI18n (Solid)', () => {
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

  it('debe retornar language (signal), changeLanguage y t', async () => {
    const { useI18n } = await import('~/components/solid/useI18n');
    const { language, changeLanguage, t } = useI18n();

    expect(typeof language).toBe('function');
    expect(typeof changeLanguage).toBe('function');
    expect(typeof t).toBe('function');
  });

  it('language() debe inicializarse con el idioma actual', async () => {
    const { useI18n } = await import('~/components/solid/useI18n');
    const { language } = useI18n();

    expect(language()).toBe('en');
  });

  it('t debe traducir usando el idioma activo', async () => {
    populateClientCache('en', { greeting: 'Hello' });
    populateClientCache('es', { greeting: 'Hola' });

    const { useI18n } = await import('~/components/solid/useI18n');
    const { t } = useI18n();

    expect(t('greeting')).toBe('Hello');
  });

  it('t debe devolver la clave si la traducción no existe', async () => {
    const { useI18n } = await import('~/components/solid/useI18n');
    const { t } = useI18n();

    expect(t('missing.key')).toBe('missing.key');
  });

  it('t debe soportar interpolación de variables', async () => {
    populateClientCache('en', { greeting: 'Hello, {name}!' });

    const { useI18n } = await import('~/components/solid/useI18n');
    const { t } = useI18n();

    expect(t('greeting', { values: { name: 'World' } })).toBe('Hello, World!');
  });

  it('changeLanguage debe actualizar language()', async () => {
    const { useI18n } = await import('~/components/solid/useI18n');
    const { language, changeLanguage } = useI18n();

    await changeLanguage('es');

    expect(language()).toBe('es');
  });

  it('el módulo solid/index exporta useI18n correctamente', async () => {
    const solidModule = await import('~/components/solid/index');

    expect(typeof solidModule.useI18n).toBe('function');
  });
});
