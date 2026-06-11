import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initConfig, resetConfig, updateConfig } from '~/core/config';
import {
  bundleAllTranslations,
  clearTranslationsCache,
  getTranslation,
  loadTranslations,
} from '~/core/translations';

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

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    });

    const missing = await loadTranslations('es');
    expect(missing).toEqual({});

    fs.writeFileSync(path.join(tmp, 'es.json'), '{invalid}', 'utf-8');
    clearTranslationsCache();

    const invalid = await loadTranslations('es');
    expect(invalid).toEqual({});

    errorSpy.mockRestore();
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
    await expect(getTranslation('demo.group.nested', 'es')).resolves.toBe(
      'Valor',
    );

    await expect(getTranslation('demo.missing', 'es')).resolves.toBe(
      'demo.missing',
    );

    updateConfig({ missingKeyStrategy: 'empty' });
    await expect(getTranslation('demo.missing', 'es')).resolves.toBe('');

    updateConfig({ missingKeyStrategy: 'error' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      /* empty */
    });

    await expect(getTranslation('demo.missing', 'es')).resolves.toBe(
      '[MISSING: demo.missing]',
    );
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
    await expect(getTranslation('demo.unknown', 'fr')).resolves.toBe(
      'demo.unknown',
    );
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
    await expect(getTranslation('demo.missing', 'fr')).resolves.toBe(
      'demo.missing',
    );
  });

  it('resuelve namespaces y aplica defaultNamespace en servidor', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es', 'common.json'), {
      nav: {
        home: 'Inicio',
      },
    });

    writeJson(path.join(tmp, 'es', 'auth.json'), {
      login: {
        title: 'Ingresar',
      },
    });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
      namespaces: {
        enabled: true,
        defaultNamespace: 'common',
        separator: ':',
      },
    });

    await expect(getTranslation('auth:login.title', 'es')).resolves.toBe(
      'Ingresar',
    );
    await expect(getTranslation('nav.home', 'es')).resolves.toBe('Inicio');
  });

  describe('baked translations via vite.define (serverless)', () => {
    afterEach(() => {
      Reflect.deleteProperty(globalThis, '__ASTRO_I18N_TRANSLATIONS__');
    });

    it('carga desde globalThis.__ASTRO_I18N_TRANSLATIONS__ si el define no esta disponible', async () => {
      const tmp = createTempDir();

      try {
        writeJson(path.join(tmp, 'es.json'), { greeting: 'Hola' });
        writeJson(path.join(tmp, 'en.json'), { greeting: 'Hello' });

        initConfig({
          defaultLang: 'es',
          supportedLangs: ['es', 'en'],
          translationsDir: tmp,
        });

        // Simulamos el valor que Vite inyectaria via `vite.define`.
        const allTranslations = await bundleAllTranslations();
        (
          globalThis as typeof globalThis & Record<string, unknown>
        ).__ASTRO_I18N_TRANSLATIONS__ = JSON.stringify(allTranslations);

        clearTranslationsCache();
        const es = await loadTranslations('es');
        expect(es.greeting).toBe('Hola');

        clearTranslationsCache();
        const en = await loadTranslations('en');
        expect(en.greeting).toBe('Hello');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('cae a disco si no hay baked translations', async () => {
      const tmp = createTempDir();

      try {
        writeJson(path.join(tmp, 'es.json'), { greeting: 'Hola' });

        initConfig({
          defaultLang: 'es',
          supportedLangs: ['es'],
          translationsDir: tmp,
        });

        // Sin globalThis.__ASTRO_I18N_TRANSLATIONS__ debe leer del disco.
        clearTranslationsCache();
        const es = await loadTranslations('es');
        expect(es.greeting).toBe('Hola');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('carga namespaces desde baked translations', async () => {
      const tmp = createTempDir();

      try {
        writeJson(path.join(tmp, 'es', 'common.json'), {
          nav: { home: 'Inicio' },
        });
        writeJson(path.join(tmp, 'es', 'auth.json'), {
          login: { title: 'Ingresar' },
        });

        initConfig({
          defaultLang: 'es',
          supportedLangs: ['es'],
          translationsDir: tmp,
          namespaces: {
            enabled: true,
            defaultNamespace: 'common',
            separator: ':',
          },
        });

        const allTranslations = await bundleAllTranslations();
        (
          globalThis as typeof globalThis & Record<string, unknown>
        ).__ASTRO_I18N_TRANSLATIONS__ = JSON.stringify(allTranslations);

        clearTranslationsCache();
        await expect(getTranslation('auth:login.title', 'es')).resolves.toBe(
          'Ingresar',
        );
        await expect(getTranslation('nav.home', 'es')).resolves.toBe('Inicio');
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });
});
