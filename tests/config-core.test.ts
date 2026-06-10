import { beforeEach, describe, expect, it } from 'vitest';
import {
  getConfig,
  getDefaultLanguage,
  getSupportedLanguages,
  initConfig,
  resetConfig,
  updateConfig,
} from '~/core/config';
import type { I18nPluginOptions } from '~/types';

describe('config core', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('normaliza valores por defecto', () => {
    const config = getConfig();

    expect(config.defaultLang).toBe('en');
    expect(config.supportedLangs).toEqual(['en']);
    expect(config.routing).toEqual({
      strategy: 'manual',
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    });
    expect(config.translationsDir).toBe('./src/i18n');
    expect(config.namespaces).toEqual({
      enabled: undefined,
      defaultNamespace: 'common',
      separator: ':',
    });
    expect(config.pluralization).toEqual({
      enabled: true,
      field: 'count',
    });
    expect(config.autoDetect).toBe(true);
    expect(config.generateTypes).toBe(false);
    expect(config.typesOutputPath).toBe('./src/types/i18n-types.d.ts');
    expect(config.missingKeyStrategy).toBe('key');
  });

  it('initConfig y updateConfig aplican cambios', () => {
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      missingKeyStrategy: 'empty',
      routing: {
        strategy: 'prefix',
      },
    });

    updateConfig({ missingKeyStrategy: 'error', autoDetect: false });

    const config = getConfig();

    expect(config.defaultLang).toBe('es');
    expect(config.supportedLangs).toEqual(['es', 'en']);
    expect(config.routing).toEqual({
      strategy: 'prefix',
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    });
    expect(config.missingKeyStrategy).toBe('error');
    expect(config.autoDetect).toBe(false);
  });

  it('hydrateConfigFromGlobal lee desde __ASTRO_I18N_RUNTIME_OPTIONS__ (serverless)', () => {
    // Simula el escenario serverless: sin initConfig, pero con la constante
    // inlinada por Vite (simulada via globalThis).
    resetConfig();

    const bakedConfig: Partial<I18nPluginOptions> = {
      defaultLang: 'pt-BR',
      supportedLangs: ['pt-BR', 'en'],
      routing: { strategy: 'prefix-except-default' },
    };
    globalThis.__ASTRO_I18N_RUNTIME_OPTIONS__ = JSON.stringify(bakedConfig);

    const config = getConfig();
    expect(config.defaultLang).toBe('pt-BR');
    expect(config.supportedLangs).toEqual(['pt-BR', 'en']);
    expect(config.routing!.strategy).toBe('prefix-except-default');

    // cleanup
    delete globalThis.__ASTRO_I18N_RUNTIME_OPTIONS__;
    resetConfig();
  });

  it('getSupportedLanguages y getDefaultLanguage devuelven valores normalizados', () => {
    expect(getDefaultLanguage()).toBe('en');
    expect(getSupportedLanguages()).toEqual(['en']);

    initConfig({ defaultLang: 'es', supportedLangs: ['es', 'en'] });

    expect(getDefaultLanguage()).toBe('es');
    expect(getSupportedLanguages()).toEqual(['es', 'en']);
  });
});
