import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '~/core/config';
import { populateClientCache } from '~/core/translate';

describe('useTranslation hook', () => {
  beforeEach(() => {
    resetConfig();
    initConfig({
      defaultLang: 'en',
      supportedLangs: ['en', 'es'],
      missingKeyStrategy: 'key',
    });
  });

  afterEach(() => {
    resetConfig();
  });

  it('expone el idioma actual', async () => {
    const { useTranslation } =
      await import('~/components/react/useTranslation');

    let lang: string | undefined;
    function TestComponent() {
      const { language } = useTranslation();
      lang = language;
      return null;
    }

    renderToStaticMarkup(<TestComponent />);

    expect(lang).toBe('en');
  });

  it('t resuelve traducciones del cliente', async () => {
    populateClientCache('en', { greeting: 'Hello' });

    const { useTranslation } =
      await import('~/components/react/useTranslation');

    let translated: string | undefined;
    function TestComponent() {
      const { t } = useTranslation();
      translated = t('greeting');
      return null;
    }

    renderToStaticMarkup(<TestComponent />);

    expect(translated).toBe('Hello');
  });

  it('t devuelve la key cuando no existe traduccion', async () => {
    const { useTranslation } =
      await import('~/components/react/useTranslation');

    let translated: string | undefined;
    function TestComponent() {
      const { t } = useTranslation();
      translated = t('missing.key');
      return null;
    }

    renderToStaticMarkup(<TestComponent />);

    expect(translated).toBe('missing.key');
  });

  it('t soporta interpolacion de valores', async () => {
    populateClientCache('en', { greeting: 'Hello, {name}!' });

    const { useTranslation } =
      await import('~/components/react/useTranslation');

    let translated: string | undefined;
    function TestComponent() {
      const { t } = useTranslation();
      translated = t('greeting', { values: { name: 'World' } });
      return null;
    }

    renderToStaticMarkup(<TestComponent />);

    expect(translated).toBe('Hello, World!');
  });

  it('expone changeLanguage como funcion', async () => {
    const { useTranslation } =
      await import('~/components/react/useTranslation');

    let changeLang: unknown;
    function TestComponent() {
      const { changeLanguage } = useTranslation();
      changeLang = changeLanguage;
      return null;
    }

    renderToStaticMarkup(<TestComponent />);

    expect(typeof changeLang).toBe('function');
  });
});
