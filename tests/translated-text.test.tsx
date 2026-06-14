import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { TranslatedText } from '~/components/react/TranslatedText';
import { initConfig, resetConfig } from '~/core/config';
import { populateClientCache } from '~/core/translate';

function clearClientCache(): void {
  const runtimeGlobal = globalThis as typeof globalThis & {
    __ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__?: Record<string, string>;
  };

  const cache = runtimeGlobal.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__;

  if (!cache) {
    return;
  }

  for (const key of Object.keys(cache)) {
    Reflect.deleteProperty(cache, key);
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
    const html = renderToStaticMarkup(
      <TranslatedText textKey="demo.missing" fallback="Texto fallback" />,
    );

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

    expect(html).toBe(
      '<h2 data-lang="es" data-fallback="false">Titulo avanzado</h2>',
    );
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

    const html = renderToStaticMarkup(
      <TranslatedText textKey="demo.title" lang="en" as="h3" />,
    );

    expect(html).toBe('<h3>Title EN</h3>');
  });

  it('renderiza con un elemento custom mediante prop as', () => {
    populateClientCache('es', {
      demo: { title: 'Titulo' },
    });

    const html = renderToStaticMarkup(
      <TranslatedText textKey="demo.title" as="div" />,
    );

    expect(html).toBe('<div>Titulo</div>');
  });

  it('pasa props adicionales al elemento contenedor', () => {
    populateClientCache('es', {
      demo: { title: 'Titulo' },
    });

    const html = renderToStaticMarkup(
      <TranslatedText textKey="demo.title" className="foo" id="bar" />,
    );

    expect(html).toBe('<span class="foo" id="bar">Titulo</span>');
  });

  it('soporta interpolacion de valores en la traduccion', () => {
    populateClientCache('es', {
      demo: { greeting: 'Hola, {name}!' },
    });

    const html = renderToStaticMarkup(
      <TranslatedText textKey="demo.greeting" values={{ name: 'Mundo' }} />,
    );

    expect(html).toBe('<span>Hola, Mundo!</span>');
  });

  it('render prop recibe isFallback=true cuando usa fallback', () => {
    const html = renderToStaticMarkup(
      <TranslatedText
        textKey="missing.key"
        fallback="Fallback"
        render={({ content, isFallback }) => (
          <span data-fallback={String(isFallback)}>{content}</span>
        )}
      />,
    );

    expect(html).toBe('<span data-fallback="true">Fallback</span>');
  });

  it('renderiza con render prop y lang forzado sin wrapper extra', () => {
    populateClientCache('en', {
      demo: { title: 'English Title' },
    });

    const html = renderToStaticMarkup(
      <TranslatedText
        textKey="demo.title"
        lang="en"
        render={({ text, language }) => <p data-lang={language}>{text}</p>}
      />,
    );

    expect(html).toBe('<p data-lang="en">English Title</p>');
  });

  it('render prop recibe key correcto', () => {
    populateClientCache('es', {
      demo: { title: 'Titulo' },
    });

    const html = renderToStaticMarkup(
      <TranslatedText
        textKey="demo.title"
        render={({ key, language }) => (
          <span data-key={key} data-lang={language} />
        )}
      />,
    );

    expect(html).toBe('<span data-key="demo.title" data-lang="es"></span>');
  });
});
