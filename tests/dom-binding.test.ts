// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import { bindDataI18n } from '../src/core/dom';
import { bootstrapClientI18n, changeLanguage } from '../src/core/language';

function setBootstrapGlobals(): void {
  const runtimeWindow = window as Window & {
    __INITIAL_I18N_STATE__?: {
      lang?: string;
      translations?: Record<string, any>;
    };
    __INITIAL_I18N_ALL_TRANSLATIONS__?: Record<string, Record<string, any>>;
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

  runtimeWindow.__INITIAL_I18N_ALL_TRANSLATIONS__ = {
    es: {
      demo: {
        title: 'Hola',
        welcome: 'Hola {name}',
      },
    },
    en: {
      demo: {
        title: 'Hello',
        welcome: 'Hello {name}',
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

    document.dispatchEvent(new CustomEvent('i18nready', { detail: { language: 'es' } }));

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
});
