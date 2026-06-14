import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '~/core/config';
import { clearTranslationsCache } from '~/core/translations';
import { generateTranslationTypes } from '~/utils/type-generator';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'astro-i18n-plugin-tests-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

describe('type generator legacy path', () => {
  beforeEach(() => {
    resetConfig();
    clearTranslationsCache();
  });

  it('recolecta claves legacy (sin namespaces) (lineas 208-211)', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), {
      greeting: 'Hola',
      nav: { home: 'Inicio' },
    });

    const outputPath = path.join(tmp, 'types', 'i18n-types.d.ts');

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
      typesOutputPath: outputPath,
    });

    const generatedPath = await generateTranslationTypes();
    const contents = fs.readFileSync(generatedPath, 'utf-8');

    expect(contents).toContain("'greeting'");
    expect(contents).toContain("'nav.home'");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('genera I18nKey = string cuando no hay claves hoja (linea 113)', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), {
      empty: {},
    });

    const outputPath = path.join(tmp, 'types', 'i18n-types.d.ts');

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
      typesOutputPath: outputPath,
    });

    const generatedPath = await generateTranslationTypes();
    const contents = fs.readFileSync(generatedPath, 'utf-8');

    expect(contents).toContain('export type I18nKey = string;');

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('retorna sin sufijo plural cuando pluralization esta desactivado (linea 296)', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), {
      items_count_one: 'un item',
      items_count_other: '{count} items',
    });

    const outputPath = path.join(tmp, 'types', 'i18n-types.d.ts');

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
      typesOutputPath: outputPath,
      pluralization: { enabled: false },
    });

    const generatedPath = await generateTranslationTypes();
    const contents = fs.readFileSync(generatedPath, 'utf-8');

    expect(contents).toContain("'items_count_one'");
    expect(contents).toContain("'items_count_other'");

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
