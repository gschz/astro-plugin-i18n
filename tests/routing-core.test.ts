import { describe, expect, it } from 'vitest';
import {
  getPathLanguage,
  getRoutingRedirect,
  matchSupportedLanguage,
  normalizeRoutingOptions,
  resolveDefaultLanguage,
  resolveSupportedLanguages,
} from '~/core/routing';

describe('routing core', () => {
  it('normaliza defaults de routing', () => {
    expect(normalizeRoutingOptions(undefined)).toEqual({
      strategy: 'manual',
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    });

    expect(
      normalizeRoutingOptions({
        strategy: 'prefix',
      }),
    ).toEqual({
      strategy: 'prefix',
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    });
  });

  it('resuelve idiomas soportados y default con fallback seguro', () => {
    expect(resolveSupportedLanguages({ defaultLang: 'es' })).toEqual(['es']);
    expect(resolveSupportedLanguages({})).toEqual(['en']);

    const supportedLangs = ['es', 'en'];
    expect(resolveDefaultLanguage({ defaultLang: 'es' }, supportedLangs)).toBe(
      'es',
    );
    expect(resolveDefaultLanguage({ defaultLang: 'fr' }, supportedLangs)).toBe(
      'es',
    );
  });

  it('detecta idioma por segmento URL con match flexible', () => {
    expect(getPathLanguage('/en/docs', ['es', 'en'])).toBe('en');
    expect(getPathLanguage('/en-US/docs', ['es', 'en'])).toBe('en');
    expect(getPathLanguage('/docs', ['es', 'en'])).toBeNull();
  });

  it('calcula redirect con strategy=prefix', () => {
    const redirect = getRoutingRedirect(new URL('https://example.dev/about'), {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix',
      },
    });

    expect(redirect?.pathname).toBe('/es/about');
  });

  it('calcula redirect con strategy=prefix-except-default', () => {
    const redirect = getRoutingRedirect(
      new URL('https://example.dev/es/about'),
      {
        defaultLang: 'es',
        supportedLangs: ['es', 'en'],
        routing: {
          strategy: 'prefix-except-default',
        },
      },
    );

    expect(redirect?.pathname).toBe('/about');
  });

  it('no redirige con strategy=manual', () => {
    const redirect = getRoutingRedirect(new URL('https://example.dev/about'), {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'manual',
      },
    });

    expect(redirect).toBeNull();
  });

  it('matchSupportedLanguage retorna null cuando prefix base no hace match', () => {
    const result = matchSupportedLanguage('/fr/about', ['es', 'en']);

    expect(result).toBeNull();
  });

  it('stripLanguagePrefix retorna / cuando despues de quitar el prefijo no queda nada y redirige', () => {
    const redirect = getRoutingRedirect(new URL('https://example.dev/en/'), {
      defaultLang: 'en',
      supportedLangs: ['en', 'es'],
      routing: {
        strategy: 'prefix-except-default',
        prefixDefaultLocale: false,
      },
    });

    expect(redirect).not.toBeNull();
    expect(redirect?.pathname).toBe('/');
  });

  it('getRoutingRedirect con prefix-except-default y prefixDefaultLocale=true redirige defaultLang sin prefijo', () => {
    const redirect = getRoutingRedirect(new URL('https://example.dev/about'), {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix-except-default',
        prefixDefaultLocale: true,
        redirectToDefaultLocale: true,
      },
    });

    expect(redirect?.pathname).toBe('/es/about');
  });

  it('getRoutingRedirect retorna null cuando URL actual ya tiene el formato correcto', () => {
    const redirect = getRoutingRedirect(
      new URL('https://example.dev/es/about'),
      {
        defaultLang: 'es',
        supportedLangs: ['es', 'en'],
        routing: {
          strategy: 'prefix',
          prefixDefaultLocale: true,
          redirectToDefaultLocale: false,
        },
      },
    );

    expect(redirect).toBeNull();
  });
});
