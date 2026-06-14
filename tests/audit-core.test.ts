import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { auditTranslationCoverage } from '~/core/audit';
import { initConfig, resetConfig } from '~/core/config';
import { clearTranslationsCache } from '~/core/translations';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'astro-i18n-audit-tests-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

describe('audit translation coverage', () => {
  beforeEach(() => {
    clearTranslationsCache();
    resetConfig();
  });

  it('reporta cobertura completa cuando todos los idiomas tienen las mismas claves', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), { title: 'Titulo', desc: 'Desc' });
    writeJson(path.join(tmp, 'en.json'), { title: 'Title', desc: 'Desc' });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const result = await auditTranslationCoverage();

    expect(result.defaultLang).toBe('es');
    expect(result.languages).toEqual(['es', 'en']);
    expect(result.totalKeys).toBe(2);
    expect(result.missing).toEqual({ es: [], en: [] });
    expect(result.isComplete).toBe(true);
  });

  it('reporta claves faltantes cuando un idioma carece de algunas', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), {
      title: 'Titulo',
      desc: 'Desc',
      extra: 'Extra',
    });
    writeJson(path.join(tmp, 'en.json'), { title: 'Title' });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const result = await auditTranslationCoverage();

    expect(result.totalKeys).toBe(3);
    expect(result.missing.es).toEqual([]);
    expect(result.missing.en).toEqual(['desc', 'extra']);
    expect(result.isComplete).toBe(false);
  });

  it('maneja un solo idioma soportado', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), { title: 'Titulo' });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
    });

    const result = await auditTranslationCoverage();

    expect(result.languages).toEqual(['es']);
    expect(result.missing.es).toEqual([]);
    expect(result.isComplete).toBe(true);
  });

  it('reporta array vacio cuando no hay traducciones', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), {});

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
    });

    const result = await auditTranslationCoverage();

    expect(result.totalKeys).toBe(0);
    expect(result.isComplete).toBe(true);
  });

  it('sobrescribe opciones de routing pasadas como parametro', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), { title: 'Titulo' });
    writeJson(path.join(tmp, 'en.json'), { title: 'Title' });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en', 'fr'],
      translationsDir: tmp,
    });

    const result = await auditTranslationCoverage({
      supportedLangs: ['es', 'fr'],
    });

    expect(result.totalKeys).toBe(1);
    expect(result.languages).toEqual(['es', 'fr']);
  });
});
