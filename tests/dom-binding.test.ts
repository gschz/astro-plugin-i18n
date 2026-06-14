// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '~/core/config';
import { bindDataI18n } from '~/core/dom';
import { bootstrapClientI18n, changeLanguage } from '~/core/language';
import { populateClientCache } from '~/core/translate';

function setBootstrapGlobals(): void {
  const runtimeWindow = window as Window & {
    __INITIAL_I18N_STATE__?: {
      lang?: string;
      translations?: Record<string, any>;
    };
  };

  runtimeWindow.__INITIAL_I18N_STATE__ = {
    lang: 'es',
    translations: {
      demo: {
        title: 'Hola',
        welcome: 'Hola {name}',
      },
    },
  };
}

describe('bindDataI18n', () => {
  beforeEach(() => {
    resetConfig();
    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      autoDetect: false,
    });

    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    document.body.innerHTML = '';

    setBootstrapGlobals();
    bootstrapClientI18n();
    populateClientCache('en', {
      demo: { title: 'Hello', welcome: 'Hello {name}' },
    });
  });

  it('renderiza data-i18n-key inicial y rerenderiza al cambiar idioma', () => {
    document.body.innerHTML = [
      '<h1 id="title" data-i18n-key="demo.title"></h1>',
      '<p id="welcome" data-i18n-key="demo.welcome" data-i18n-values=\'{"name":"Gera"}\'></p>',
    ].join('\n');

    const cleanup = bindDataI18n();

    expect(document.getElementById('title')?.textContent).toBe('Hola');
    expect(document.getElementById('welcome')?.textContent).toBe('Hola Gera');

    changeLanguage('en');

    expect(document.getElementById('title')?.textContent).toBe('Hello');
    expect(document.getElementById('welcome')?.textContent).toBe('Hello Gera');

    cleanup();
  });

  it('cleanup se puede ejecutar de forma segura', () => {
    document.body.innerHTML = '<h1 id="title" data-i18n-key="demo.title"></h1>';

    const cleanup = bindDataI18n();

    expect(document.getElementById('title')?.textContent).toBe('Hola');

    cleanup();
    expect(() => changeLanguage('en')).not.toThrow();
  });

  it('waitForReady difiere el render hasta recibir i18nready', () => {
    document.body.innerHTML = '<h1 id="title" data-i18n-key="demo.title"></h1>';

    const cleanup = bindDataI18n({ waitForReady: true });

    expect(document.getElementById('title')?.textContent).toBe('');

    document.dispatchEvent(
      new CustomEvent('i18nready', { detail: { language: 'es' } }),
    );

    expect(document.getElementById('title')?.textContent).toBe('Hola');
    cleanup();
  });

  it('soporta keyAttribute/valuesAttribute, allowedKeys y onAfterRender', () => {
    document.body.innerHTML = [
      '<h1 id="ok" data-l10n-key="demo.title" data-l10n-values=\'{"name":"Ana"}\'></h1>',
      '<p id="blocked" data-l10n-key="demo.welcome" data-l10n-values=\'{"name":"Ana"}\'></p>',
    ].join('\n');

    const renderedLanguages: string[] = [];

    const cleanup = bindDataI18n({
      keyAttribute: 'data-l10n-key',
      valuesAttribute: 'data-l10n-values',
      allowedKeys: ['demo.title'],
      onAfterRender: (lang) => {
        renderedLanguages.push(lang);
      },
    });

    expect(document.getElementById('ok')?.textContent).toBe('Hola');
    expect(document.getElementById('blocked')?.textContent).toBe('');
    expect(renderedLanguages).toEqual(['es']);

    changeLanguage('en');

    expect(document.getElementById('ok')?.textContent).toBe('Hello');
    expect(document.getElementById('blocked')?.textContent).toBe('');
    expect(renderedLanguages).toEqual(['es', 'en']);

    cleanup();
  });

  it('ignora elementos con data-i18n-key vacio', () => {
    document.body.innerHTML = [
      '<h1 id="empty-key" data-i18n-key=""></h1>',
      '<h1 id="valid" data-i18n-key="demo.title"></h1>',
    ].join('\n');

    bindDataI18n();

    expect(document.getElementById('empty-key')?.textContent).toBe('');
    expect(document.getElementById('valid')?.textContent).toBe('Hola');
  });

  it('ignora elementos con clave no traducida en lugar de mostrar la clave', () => {
    document.body.innerHTML =
      '<h1 id="missing" data-i18n-key="demo.nonexistent"></h1>';

    bindDataI18n();

    expect(document.getElementById('missing')?.textContent).toBe('');
  });

  it('valores JSON invalidos en data-i18n-values no rompen el render', () => {
    document.body.innerHTML =
      '<h1 id="bad-json" data-i18n-key="demo.title" data-i18n-values="not-json"></h1>';

    bindDataI18n();

    expect(document.getElementById('bad-json')?.textContent).toBe('Hola');
  });
});
