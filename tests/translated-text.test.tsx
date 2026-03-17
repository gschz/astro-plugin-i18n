import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import TranslatedText from '../src/components/TranslatedText';
import { populateClientCache } from '../src/core/translate';

function clearClientCache(): void {
  const runtimeGlobal = globalThis as typeof globalThis & {
    __ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__?: Record<string, string>;
  };

  const cache = runtimeGlobal.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__;

  if (!cache) {
    return;
  }

  for (const key of Object.keys(cache)) {
    delete cache[key];
  }
}

describe('TranslatedText component', () => {
  beforeEach(() => {
    resetConfig();
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      missingKeyStrategy: 'key',
    });
    clearClientCache();
  });

  it('renderiza contenido traducido con wrapper por defecto', () => {
    populateClientCache('es', {
      demo: {
        title: 'Titulo demo',
      },
    });

    const html = renderToStaticMarkup(<TranslatedText textKey="demo.title" />);

    expect(html).toBe('<span>Titulo demo</span>');
  });

  it('usa fallback cuando la estrategia devuelve la key', () => {
    const html = renderToStaticMarkup(<TranslatedText textKey="demo.missing" fallback="Texto fallback" />);

    expect(html).toBe('<span>Texto fallback</span>');
  });

  it('permite render prop sin wrapper extra', () => {
    populateClientCache('es', {
      demo: {
        title: 'Titulo avanzado',
      },
    });

    const html = renderToStaticMarkup(
      <TranslatedText
        textKey="demo.title"
        render={({ content, language, isFallback }) => (
          <h2 data-lang={language} data-fallback={String(isFallback)}>
            {content}
          </h2>
        )}
      />,
    );

    expect(html).toBe('<h2 data-lang="es" data-fallback="false">Titulo avanzado</h2>');
  });

  it('usa lang explicito para renderizar otro idioma', () => {
    populateClientCache('es', {
      demo: {
        title: 'Titulo ES',
      },
    });

    populateClientCache('en', {
      demo: {
        title: 'Title EN',
      },
    });

    const html = renderToStaticMarkup(<TranslatedText textKey="demo.title" lang="en" as="h3" />);

    expect(html).toBe('<h3>Title EN</h3>');
  });
});
