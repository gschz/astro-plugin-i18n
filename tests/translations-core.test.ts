import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initConfig, resetConfig, updateConfig } from '../src/core/config';
import { clearTranslationsCache, getTranslation, loadTranslations } from '../src/core/translations';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'astro-i18n-plugin-tests-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

describe('translations core', () => {
  beforeEach(() => {
    clearTranslationsCache();
    resetConfig();
  });

  it('carga traducciones desde disco y usa cache en lecturas siguientes', async () => {
    const tmp = createTempDir();
    const filePath = path.join(tmp, 'es.json');

    writeJson(filePath, { demo: { title: 'Titulo v1' } });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const first = await loadTranslations('es');
    expect(first.demo.title).toBe('Titulo v1');

    writeJson(filePath, { demo: { title: 'Titulo v2' } });

    const second = await loadTranslations('es');
    expect(second.demo.title).toBe('Titulo v1');

    clearTranslationsCache();
    const third = await loadTranslations('es');
    expect(third.demo.title).toBe('Titulo v2');
  });

  it('retorna objeto vacio cuando falta archivo o json es invalido', async () => {
    const tmp = createTempDir();

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const missing = await loadTranslations('es');
    expect(missing).toEqual({});

    fs.writeFileSync(path.join(tmp, 'es.json'), '{invalid}', 'utf-8');
    clearTranslationsCache();

    const invalid = await loadTranslations('es');
    expect(invalid).toEqual({});
  });

  it('resuelve claves anidadas y aplica missingKeyStrategy', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), {
      demo: {
        title: 'Titulo',
        group: {
          nested: 'Valor',
        },
      },
    });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
      missingKeyStrategy: 'key',
    });

    await expect(getTranslation('demo.title', 'es')).resolves.toBe('Titulo');
    await expect(getTranslation('demo.group.nested', 'es')).resolves.toBe('Valor');

    await expect(getTranslation('demo.missing', 'es')).resolves.toBe('demo.missing');

    updateConfig({ missingKeyStrategy: 'empty' });
    await expect(getTranslation('demo.missing', 'es')).resolves.toBe('');

    updateConfig({ missingKeyStrategy: 'error' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getTranslation('demo.missing', 'es')).resolves.toBe('[MISSING: demo.missing]');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('aplica fallback de idioma antes de missingKeyStrategy', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), {
      demo: {
        title: 'Titulo ES',
      },
    });

    writeJson(path.join(tmp, 'pt-BR.json'), {
      demo: {
        title: 'Titulo PT',
      },
    });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'pt-BR', 'fr'],
      translationsDir: tmp,
      missingKeyStrategy: 'key',
      fallback: {
        fr: 'pt-BR',
        'pt-BR': 'es',
      },
    });

    await expect(getTranslation('demo.title', 'fr')).resolves.toBe('Titulo PT');
    await expect(getTranslation('demo.unknown', 'fr')).resolves.toBe('demo.unknown');
  });

  it('evita ciclos en cadena de fallback y aplica missingKeyStrategy', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'fr.json'), {
      demo: {
        title: 'Titre FR',
      },
    });

    writeJson(path.join(tmp, 'pt-BR.json'), {
      demo: {
        title: 'Titulo PT',
      },
    });

    initConfig({
      defaultLang: 'fr',
      supportedLangs: ['fr', 'pt-BR'],
      translationsDir: tmp,
      missingKeyStrategy: 'key',
      fallback: {
        fr: 'pt-BR',
        'pt-BR': 'fr',
      },
    });

    await expect(getTranslation('demo.title', 'fr')).resolves.toBe('Titre FR');
    await expect(getTranslation('demo.missing', 'fr')).resolves.toBe('demo.missing');
  });
});
