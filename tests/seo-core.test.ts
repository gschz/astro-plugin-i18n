import { describe, expect, it } from 'vitest';
import {
  getAlternateLinks,
  getLocalizedPath,
  getOgLocaleMap,
  getXDefaultHref,
  langToOgLocale,
} from '~/core/seo';

describe('langToOgLocale', () => {
  it('convierte codigos con override directo', () => {
    expect(langToOgLocale('pt-BR')).toBe('pt_BR');
    expect(langToOgLocale('zh-CN')).toBe('zh_CN');
    expect(langToOgLocale('en-GB')).toBe('en_GB');
    expect(langToOgLocale('sr-Latn')).toBe('sr_Latn_RS');
  });

  it('convierte idiomas simples sin region duplicando codigo', () => {
    expect(langToOgLocale('en')).toBe('en_EN');
    expect(langToOgLocale('es')).toBe('es_ES');
    expect(langToOgLocale('de')).toBe('de_DE');
  });

  it('convierte codigos con region sin override', () => {
    expect(langToOgLocale('fr-BE')).toBe('fr_BE');
    expect(langToOgLocale('it-CH')).toBe('it_CH');
  });
});

describe('getOgLocaleMap', () => {
  it('genera mapa de locale para lista de idiomas', () => {
    const map = getOgLocaleMap(['es', 'en', 'pt-BR']);
    expect(map).toEqual({
      es: 'es_ES',
      en: 'en_EN',
      'pt-BR': 'pt_BR',
    });
  });

  it('retorna objeto vacio para lista vacia', () => {
    expect(getOgLocaleMap([])).toEqual({});
  });
});

describe('getLocalizedPath', () => {
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

  it('retorna basePath con strategy=manual', () => {
    const options = {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'manual' as const,
      },
    };

    expect(getLocalizedPath('/about', 'es', options)).toBe('/about');
    expect(getLocalizedPath('/about', 'en', options)).toBe('/about');
  });

  it('prefija incluso idioma por defecto con prefixDefaultLocale=true', () => {
    const options = {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix-except-default' as const,
        prefixDefaultLocale: true,
      },
    };

    expect(getLocalizedPath('/about', 'es', options)).toBe('/es/about');
    expect(getLocalizedPath('/about', 'en', options)).toBe('/en/about');
  });

  it('maneja path raiz con prefix strategy', () => {
    const options = {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix' as const,
      },
    };

    expect(getLocalizedPath('/', 'en', options)).toBe('/en/');
  });
});

describe('getAlternateLinks / getXDefaultHref', () => {
  it('genera enlaces absolutos alternos y x-default', () => {
    const options = {
      defaultLang: 'es',
      supportedLangs: ['es', 'en', 'pt-BR'],
      routing: {
        strategy: 'prefix-except-default' as const,
      },
    };

    const links = getAlternateLinks(
      '/es/features',
      'https://example.dev',
      options,
    );

    expect(links).toEqual([
      { lang: 'es', href: 'https://example.dev/features' },
      { lang: 'en', href: 'https://example.dev/en/features' },
      { lang: 'pt-BR', href: 'https://example.dev/pt-BR/features' },
    ]);

    expect(
      getXDefaultHref('/en/features', 'https://example.dev', options),
    ).toBe('https://example.dev/features');
  });

  it('genera x-default con strategy=prefix', () => {
    const options = {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix' as const,
      },
    };

    expect(getXDefaultHref('/about', 'https://example.dev', options)).toBe(
      'https://example.dev/es/about',
    );
  });
});
