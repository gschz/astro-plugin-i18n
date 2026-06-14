// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initConfig, resetConfig } from '~/core/config';
import { changeLanguage } from '~/core/language';
import { populateClientCache } from '~/core/translate';

function clearClientCache(): void {
  const runtime = globalThis as {
    __ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__?: Record<string, unknown>;
  };
  if (runtime.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__) {
    for (const key of Object.keys(
      runtime.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__,
    )) {
      Reflect.deleteProperty(
        runtime.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__,
        key,
      );
    }
  }
}

describe('useTranslation hook client-side (useEffect)', () => {
  beforeEach(() => {
    resetConfig();
    initConfig({
      defaultLang: 'en',
      supportedLangs: ['en', 'es'],
      autoDetect: false,
      missingKeyStrategy: 'key',
    });
    clearClientCache();
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
  });

  afterEach(() => {
    resetConfig();
    clearClientCache();
  });

  it('useEffect se suscribe a languagechange y actualiza el idioma', async () => {
    populateClientCache('en', { greeting: 'Hello' });
    populateClientCache('es', { greeting: 'Hola' });

    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { useTranslation } =
      await import('~/components/react/useTranslation');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    function TestComponent() {
      const { language, t } = useTranslation();
      const text = t('greeting');
      return React.createElement(
        'div',
        { id: 'result', 'data-lang': language },
        text,
      );
    }

    root.render(React.createElement(TestComponent));

    await vi.waitFor(() => {
      expect(document.getElementById('result')?.dataset.lang).toBe('en');
    });

    await changeLanguage('es');

    await vi.waitFor(() => {
      expect(document.getElementById('result')?.dataset.lang).toBe('es');
    });

    expect(document.getElementById('result')?.textContent).toBe('Hola');

    root.unmount();
    container.remove();
  });

  it('despues de unmount changeLanguage no afecta al componente desmontado', async () => {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    const { useTranslation } =
      await import('~/components/react/useTranslation');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let renders = 0;
    function TestComponent() {
      const { language } = useTranslation();
      renders++;
      return React.createElement('div', { 'data-lang': language });
    }

    root.render(React.createElement(TestComponent));

    await vi.waitFor(() => {
      expect(
        container.querySelector('[data-lang]')?.getAttribute('data-lang'),
      ).toBe('en');
    });

    const rendersAfterMount = renders;
    root.unmount();

    await changeLanguage('es');

    await new Promise((r) => setTimeout(r, 20));

    expect(document.documentElement.lang).toBe('es');
    expect(renders).toBe(rendersAfterMount);

    container.remove();
  });
});
