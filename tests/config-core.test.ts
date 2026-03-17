import { beforeEach, describe, expect, it } from 'vitest';
import {
  getConfig,
  getDefaultLanguage,
  getSupportedLanguages,
  initConfig,
  resetConfig,
  updateConfig,
} from '../src/core/config';

describe('config core', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('normaliza valores por defecto', () => {
    const config = getConfig();

    expect(config.defaultLang).toBe('en');
    expect(config.supportedLangs).toEqual(['en']);
    expect(config.translationsDir).toBe('./src/i18n');
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
    });

    updateConfig({ missingKeyStrategy: 'error', autoDetect: false });

    const config = getConfig();

    expect(config.defaultLang).toBe('es');
    expect(config.supportedLangs).toEqual(['es', 'en']);
    expect(config.missingKeyStrategy).toBe('error');
    expect(config.autoDetect).toBe(false);
  });

  it('getSupportedLanguages y getDefaultLanguage devuelven valores normalizados', () => {
    expect(getDefaultLanguage()).toBe('en');
    expect(getSupportedLanguages()).toEqual(['en']);

    initConfig({ defaultLang: 'es', supportedLangs: ['es', 'en'] });

    expect(getDefaultLanguage()).toBe('es');
    expect(getSupportedLanguages()).toEqual(['es', 'en']);
  });
});
