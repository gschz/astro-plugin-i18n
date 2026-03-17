import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import { getI18nClientBootstrapPayload, reloadTranslations } from '../src/core/setup';
import { clearTranslationsCache, loadTranslations } from '../src/core/translations';

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
    expect(payload.allTranslations.es.demo.title).toBe('Hola');
    expect(payload.allTranslations.en.demo.title).toBe('Hello');
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
