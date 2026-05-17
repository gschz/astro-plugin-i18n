import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import { bundleLanguageTranslations, generateBundles } from '../src/core/bundle-builder';
import { clearTranslationsCache } from '../src/core/translations';

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
}

describe('bundle builder', () => {
  let tmpDir = '';

  beforeEach(async () => {
    clearTranslationsCache();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-i18n-bundle-tests-'));
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
    clearTranslationsCache();
    resetConfig();
  });

  it('combina namespaces de un idioma', async () => {
    await writeJson(path.join(tmpDir, 'es', 'common.json'), { nav: { home: 'Inicio' } });
    await writeJson(path.join(tmpDir, 'es', 'auth.json'), { login: { title: 'Iniciar sesion' } });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmpDir,
      namespaces: { enabled: true },
    });

    const bundled = await bundleLanguageTranslations('es');

    expect(bundled).toEqual({
      common: { nav: { home: 'Inicio' } },
      auth: { login: { title: 'Iniciar sesion' } },
    });
  });

  it('genera bundles para todos los idiomas', async () => {
    await writeJson(path.join(tmpDir, 'es', 'common.json'), { nav: { home: 'Inicio' } });
    await writeJson(path.join(tmpDir, 'en', 'common.json'), { nav: { home: 'Home' } });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmpDir,
      namespaces: { enabled: true },
    });

    const outputDir = path.join(tmpDir, 'dist', 'i18n');
    await generateBundles(outputDir);

    const esBundle = JSON.parse(await fs.readFile(path.join(outputDir, 'es.json'), 'utf-8'));
    const enBundle = JSON.parse(await fs.readFile(path.join(outputDir, 'en.json'), 'utf-8'));

    expect(esBundle).toEqual({ common: { nav: { home: 'Inicio' } } });
    expect(enBundle).toEqual({ common: { nav: { home: 'Home' } } });
  });

  it('funciona en modo legacy (archivo unico)', async () => {
    await writeJson(path.join(tmpDir, 'pt.json'), { hello: 'Ola' });

    initConfig({
      defaultLang: 'pt',
      supportedLangs: ['pt'],
      translationsDir: tmpDir,
      namespaces: { enabled: false },
    });

    const bundled = await bundleLanguageTranslations('pt');
    expect(bundled).toEqual({ hello: 'Ola' });
  });
});
