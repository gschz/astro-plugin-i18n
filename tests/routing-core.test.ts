import { describe, expect, it } from 'vitest';
import {
  getPathLanguage,
  getRoutingRedirect,
  normalizeRoutingOptions,
  resolveDefaultLanguage,
  resolveSupportedLanguages,
} from '../src/core/routing';

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
    expect(resolveDefaultLanguage({ defaultLang: 'es' }, supportedLangs)).toBe('es');
    expect(resolveDefaultLanguage({ defaultLang: 'fr' }, supportedLangs)).toBe('es');
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
    const redirect = getRoutingRedirect(new URL('https://example.dev/es/about'), {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix-except-default',
      },
    });

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
});
