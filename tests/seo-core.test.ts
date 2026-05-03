import { describe, expect, it } from 'vitest';
import { getAlternateLinks, getLocalizedPath, getXDefaultHref } from '../src/core/seo';

describe('seo core', () => {
  it('genera paths localizados para strategy=prefix', () => {
    const options = {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix' as const,
      },
    };

    expect(getLocalizedPath('/about', 'es', options)).toBe('/es/about');
    expect(getLocalizedPath('/about', 'en', options)).toBe('/en/about');
  });

  it('respeta strategy=prefix-except-default en idioma por defecto', () => {
    const options = {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix-except-default' as const,
      },
    };

    expect(getLocalizedPath('/es/about', 'es', options)).toBe('/about');
    expect(getLocalizedPath('/es/about', 'en', options)).toBe('/en/about');
  });

  it('genera enlaces absolutos alternos y x-default', () => {
    const options = {
      defaultLang: 'es',
      supportedLangs: ['es', 'en', 'pt-BR'],
      routing: {
        strategy: 'prefix-except-default' as const,
      },
    };

    const links = getAlternateLinks('/es/features', 'https://example.dev', options);

    expect(links).toEqual([
      { lang: 'es', href: 'https://example.dev/features' },
      { lang: 'en', href: 'https://example.dev/en/features' },
      { lang: 'pt-BR', href: 'https://example.dev/pt-BR/features' },
    ]);

    expect(getXDefaultHref('/en/features', 'https://example.dev', options)).toBe('https://example.dev/features');
  });
});
