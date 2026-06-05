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
    delete cache[key];
  }
}

// ── Mocks ──

vi.mock('vue', () => ({
  ref: <T>(initial: T) => ({ value: initial }),
  onMounted: (fn: () => void) => fn(),
  onUnmounted: (fn: () => void) => fn(),
}));

// ── Tests ──

describe('useI18n (Vue)', () => {
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

  it('debe retornar language, changeLanguage y t', async () => {
    const { useI18n } = await import('../../../src/components/vue/useI18n');
    const { language, changeLanguage, t } = useI18n();

    expect(language).toBeDefined();
    expect(language).toHaveProperty('value');
    expect(typeof changeLanguage).toBe('function');
    expect(typeof t).toBe('function');
  });

  it('language.value debe inicializarse con el idioma actual', async () => {
    const { useI18n } = await import('../../../src/components/vue/useI18n');
    const { language } = useI18n();

    expect(language.value).toBe('en');
  });

  it('t debe traducir usando el idioma activo', async () => {
    populateClientCache('en', { greeting: 'Hello' });
    populateClientCache('es', { greeting: 'Hola' });

    const { useI18n } = await import('../../../src/components/vue/useI18n');
    const { t } = useI18n();

    expect(t('greeting')).toBe('Hello');
  });

  it('t debe devolver la clave si la traducción no existe (missingKeyStrategy: key)', async () => {
    const { useI18n } = await import('../../../src/components/vue/useI18n');
    const { t } = useI18n();

    expect(t('missing.key')).toBe('missing.key');
  });

  it('t debe soportar interpolación de variables', async () => {
    populateClientCache('en', { greeting: 'Hello, {name}!' });

    const { useI18n } = await import('../../../src/components/vue/useI18n');
    const { t } = useI18n();

    expect(t('greeting', { values: { name: 'World' } })).toBe('Hello, World!');
  });

  it('changeLanguage debe actualizar language.value', async () => {
    const { useI18n } = await import('../../../src/components/vue/useI18n');
    const { language, changeLanguage } = useI18n();

    await changeLanguage('es');

    expect(language.value).toBe('es');
  });

  it('el módulo vue/index exporta useI18n correctamente', async () => {
    const vueModule = await import('../../../src/components/vue/index');

    expect(typeof vueModule.useI18n).toBe('function');
  });
});
