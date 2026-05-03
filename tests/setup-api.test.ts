import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import { getLanguageRedirect, isLanguageSupported } from '../src/core/setup';

describe('setup API helpers', () => {
  beforeEach(() => {
    resetConfig();
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });
  });

  it('reporta idiomas soportados correctamente', () => {
    expect(isLanguageSupported('es')).toBe(true);
    expect(isLanguageSupported('en')).toBe(true);
    expect(isLanguageSupported('fr')).toBe(false);
  });

  it('no redirige por defecto cuando strategy=manual', () => {
    const source = new URL('https://example.dev/docs/getting-started');
    expect(getLanguageRedirect(source)).toBeNull();
  });

  it('genera redirect con strategy=prefix cuando la ruta no tiene prefijo de idioma', () => {
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix',
      },
    });

    const source = new URL('https://example.dev/docs/getting-started');
    const redirected = getLanguageRedirect(source);

    expect(redirected?.pathname).toBe('/es/docs/getting-started');
  });

  it('no genera redirect cuando la ruta ya incluye idioma con strategy=prefix', () => {
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix',
      },
    });

    const source = new URL('https://example.dev/en/docs/getting-started');

    expect(getLanguageRedirect(source)).toBeNull();
  });

  it('elimina prefijo del idioma default con strategy=prefix-except-default', () => {
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix-except-default',
      },
    });

    const source = new URL('https://example.dev/es/docs/getting-started');
    const redirected = getLanguageRedirect(source);

    expect(redirected?.pathname).toBe('/docs/getting-started');
  });
});
