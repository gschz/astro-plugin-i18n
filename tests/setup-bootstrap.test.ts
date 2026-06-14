import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '~/core/config';
import {
  getI18nClientBootstrapPayload,
  reloadTranslations,
} from '~/core/setup';
import { clearTranslationsCache, loadTranslations } from '~/core/translations';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'astro-i18n-bootstrap-tests-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

describe('setup bootstrap payload', () => {
  beforeEach(() => {
    resetConfig();
    clearTranslationsCache();
  });

  it('getI18nClientBootstrapPayload usa soportados de locals y precarga todos', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), { demo: { title: 'Hola' } });
    writeJson(path.join(tmp, 'en.json'), { demo: { title: 'Hello' } });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
      routing: { strategy: 'prefix-except-default' },
    });

    const payload = await getI18nClientBootstrapPayload({
      i18n: {
        config: {
          defaultLang: 'es',
          supportedLangs: ['es', 'en'],
        },
      },
    });

    expect(payload.lang).toBe('es');
    expect(payload.supportedLangs).toEqual(['es', 'en']);
    expect(payload.translations.demo.title).toBe('Hola');
    expect(payload.allTranslations).toEqual({});

    // Verifica que el config en el payload refleje la config real, no defaults
    expect(payload.config.defaultLang).toBe('es');
    expect(payload.config.supportedLangs).toEqual(['es', 'en']);
    expect(payload.config.routing?.strategy).toBe('prefix-except-default');
    expect(payload.config.missingKeyStrategy).toBe('key');
  });

  it('getI18nClientBootstrapPayload no precarga todos los idiomas con lazyLoading', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), { demo: { title: 'Hola' } });
    writeJson(path.join(tmp, 'en.json'), { demo: { title: 'Hello' } });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
      lazyLoading: {
        enabled: true,
      },
    });

    const payload = await getI18nClientBootstrapPayload({
      i18n: {
        config: {
          defaultLang: 'es',
          supportedLangs: ['es', 'en'],
        },
      },
    });

    expect(payload.lang).toBe('es');
    expect(payload.translations.demo.title).toBe('Hola');
    expect(Object.keys(payload.allTranslations)).toHaveLength(0);
  });

  it('getI18nClientBootstrapPayload filtra preloadNamespaces con lazyLoading', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es', 'common.json'), { title: 'Hola' });
    writeJson(path.join(tmp, 'es', 'auth.json'), { login: 'Ingresar' });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
      lazyLoading: {
        enabled: true,
        preloadNamespaces: ['common'],
      },
      namespaces: {
        enabled: true,
        defaultNamespace: 'common',
      },
    });

    const payload = await getI18nClientBootstrapPayload();

    expect(payload.lang).toBe('es');
    expect(payload.translations).toEqual({ common: { title: 'Hola' } });
    expect(Object.keys(payload.allTranslations)).toHaveLength(0);
  });

  it('getI18nClientBootstrapPayload funciona sin locals', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), { title: 'Hola' });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const payload = await getI18nClientBootstrapPayload();

    expect(payload.lang).toBe('es');
    expect(payload.supportedLangs).toEqual(['es', 'en']);
    expect(payload.translations.title).toBe('Hola');
    expect(payload.config.defaultLang).toBe('es');
    expect(payload.config.supportedLangs).toEqual(['es', 'en']);
  });

  it('getI18nClientBootstrapPayload hidrata config desde __ASTRO_I18N_RUNTIME_OPTIONS__ (serverless)', async () => {
    // Simula serverless: sin initConfig, pero con la constante inlinada por Vite
    resetConfig();
    clearTranslationsCache();

    const tmp = createTempDir();
    writeJson(path.join(tmp, 'es.json'), { greeting: 'Hola' });

    globalThis.__ASTRO_I18N_RUNTIME_OPTIONS__ = JSON.stringify({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const payload = await getI18nClientBootstrapPayload({
      i18n: { lang: 'es' },
    });

    expect(payload.lang).toBe('es');
    expect(payload.supportedLangs).toEqual(['es', 'en']);
    expect(payload.translations.greeting).toBe('Hola');
    expect(payload.config.defaultLang).toBe('es');
    expect(payload.config.supportedLangs).toEqual(['es', 'en']);

    delete globalThis.__ASTRO_I18N_RUNTIME_OPTIONS__;
    resetConfig();
    clearTranslationsCache();
  });

  it('getI18nClientBootstrapPayload usa supportedLangs de config si locals no tiene', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), { title: 'Hola' });
    writeJson(path.join(tmp, 'en.json'), { title: 'Hello' });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const payload = await getI18nClientBootstrapPayload({
      i18n: { config: { defaultLang: 'es', supportedLangs: [] } },
    });

    expect(payload.supportedLangs).toEqual(['es', 'en']);
    expect(payload.allTranslations).toEqual({});
  });

  it('reloadTranslations invalida cache de servidor', async () => {
    const tmp = createTempDir();
    const filePath = path.join(tmp, 'es.json');

    writeJson(filePath, { demo: { title: 'A' } });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const first = await loadTranslations('es');
    expect(first.demo.title).toBe('A');

    writeJson(filePath, { demo: { title: 'B' } });

    const cached = await loadTranslations('es');
    expect(cached.demo.title).toBe('A');

    reloadTranslations();

    const reloaded = await loadTranslations('es');
    expect(reloaded.demo.title).toBe('B');
  });
});
