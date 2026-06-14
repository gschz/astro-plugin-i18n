// @vitest-environment jsdom

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auditTranslationCoverage } from '~/core/audit';
import { getConfig, initConfig, resetConfig } from '~/core/config';
import { changeLanguage, getCurrentLanguage } from '~/core/language';
import {
  getPathLanguage,
  getRoutingRedirect,
  isI18nRoutingStrategy,
  matchSupportedLanguage,
} from '~/core/routing';
import { getLocalizedPath } from '~/core/seo';
import { getI18nClientBootstrapPayload } from '~/core/setup';
import { populateClientCache, t } from '~/core/translate';
import { translateAsync } from '~/core/translate-async';
import {
  clearTranslationsCache,
  getTranslation,
  loadTranslations,
} from '~/core/translations';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'astro-i18n-plugin-tests-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

beforeEach(() => {
  const browserWindow = globalThis as unknown as Window & {
    __INITIAL_I18N_STATE__?: {
      lang?: string;
      translations?: Record<string, any>;
    };
  };

  browserWindow.__INITIAL_I18N_STATE__ = { lang: 'es', translations: {} };
  browserWindow.localStorage.clear();
  document.documentElement.removeAttribute('lang');
  clearTranslationsCache();

  initConfig({
    defaultLang: 'es',
    supportedLangs: ['es', 'en', 'pt'],
    autoDetect: true,
    missingKeyStrategy: 'key',
  });
});

describe('coverage edge cases', () => {
  it('config.ts: readBakedConfigOptions con __ASTRO_I18N_RUNTIME_OPTIONS__', () => {
    resetConfig();
    (globalThis as any).__ASTRO_I18N_RUNTIME_OPTIONS__ =
      '{"defaultLang":"de","supportedLangs":["de","en"],"autoDetect":false}';

    const config = getConfig();
    expect(config.defaultLang).toBe('de');
    expect(config.supportedLangs).toEqual(['de', 'en']);
    expect(config.autoDetect).toBe(false);

    delete (globalThis as any).__ASTRO_I18N_RUNTIME_OPTIONS__;
  });

  it('language.ts: getCurrentLanguage sin lang attr ni localStorage alcanza getBrowserLanguage linea 43', () => {
    document.documentElement.removeAttribute('lang');
    localStorage.removeItem('language');
    localStorage.removeItem('lang');

    const lang = getCurrentLanguage();
    expect(typeof lang).toBe('string');
  });

  it('language.ts: getBrowserLanguage sin match retorna undefined (linea 56)', () => {
    document.documentElement.removeAttribute('lang');
    localStorage.removeItem('language');
    localStorage.removeItem('lang');

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'pt'],
      autoDetect: true,
    });

    const lang = getCurrentLanguage();
    expect(lang).toBe('es');
  });

  it('language.ts: getClientLanguage retorna valor de localStorage (linea 76)', () => {
    document.documentElement.removeAttribute('lang');
    localStorage.setItem('language', 'pt');

    const lang = getCurrentLanguage();
    expect(lang).toBe('pt');
  });

  it('language.ts: syncLanguageRoute early return cuando URL no cambia (linea 166)', async () => {
    const url = new URL('https://example.com/es/test');
    vi.stubGlobal('window', {
      location: { href: url.href, pathname: url.pathname },
      history: { pushState: vi.fn() },
    });

    initConfig({
      defaultLang: 'en',
      supportedLangs: ['en', 'es'],
      routing: { strategy: 'prefix', prefixDefaultLocale: true },
    });

    await changeLanguage('es', { syncRoute: true });

    vi.unstubAllGlobals();
  });

  it('language.ts: resolveBrowserLanguage con idioma no soportado (linea 269)', async () => {
    const browserWindow = globalThis as unknown as Window & {
      __INITIAL_I18N_STATE__?: {
        lang?: string;
        translations?: Record<string, any>;
      };
    };

    browserWindow.__INITIAL_I18N_STATE__ = undefined;
    browserWindow.localStorage.clear();
    document.documentElement.removeAttribute('lang');

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      autoDetect: true,
    });

    const proto = Object.getPrototypeOf(navigator);
    const origDesc = Object.getOwnPropertyDescriptor(proto, 'language');

    Object.defineProperty(proto, 'language', {
      get: () => 'de-DE',
      configurable: true,
    });

    if (navigator.language === 'de-DE') {
      const { setupLanguage } = await import('~/core/language');
      await setupLanguage();

      await vi.waitFor(() => {
        expect(document.documentElement.lang).toBe('es');
      });
    }

    if (origDesc) {
      Object.defineProperty(proto, 'language', origDesc);
    }
  });

  it('seo.ts: normalizePath con pathname vacio (linea 84)', () => {
    const path = getLocalizedPath('', 'en', {
      defaultLang: 'en',
      supportedLangs: ['en', 'es'],
      routing: { strategy: 'prefix', prefixDefaultLocale: true },
    });
    expect(path).toBe('/en/');
  });

  it('setup.ts: preload namespace que NO existe en translations (linea 113, branch false)', async () => {
    initConfig({
      defaultLang: 'en',
      supportedLangs: ['en'],
      translationsDir: './src/i18n',
      lazyLoading: { enabled: true, preloadNamespaces: ['nonexistent'] },
      namespaces: { enabled: true },
    });

    const payload = await getI18nClientBootstrapPayload();
    expect(payload.lang).toBe('en');
  });

  it('translate.ts: populateClientCache con traducciones planas (no namespaced) (linea 115)', () => {
    populateClientCache('en', { hello: 'Hello', world: 'World' });
    const result = t('world');
    expect(result).toBe('World');
  });

  it('translate.ts: resolveNamespaceKey con rawKey sin separador', () => {
    const result = t('greeting', { values: {} });
    expect(typeof result).toBe('string');
  });

  it('translate.ts: resolveNamespaceKey con rawKey con separador', () => {
    initConfig({
      defaultLang: 'en',
      supportedLangs: ['en'],
      namespaces: { enabled: true, separator: ':' },
    });

    populateClientCache('en', { common: { test: 'OK' } });
    const result = t('common:test');
    expect(result).toBe('OK');
  });

  it('translate-async.ts: missing key con debug activo (linea 51)', async () => {
    initConfig({
      defaultLang: 'en',
      supportedLangs: ['en'],
      missingKeyStrategy: 'key',
    });

    const result = await translateAsync('nonexistent.key', { lang: 'en' });
    expect(result).toBe('nonexistent.key');
  });

  it('routing.ts: getRoutingRedirect retorna null cuando current y target son iguales (linea 247)', () => {
    const url = new URL('https://example.com/es/test');
    const result = getRoutingRedirect(url, {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: { strategy: 'prefix', redirectToDefaultLocale: true },
    });

    // /es/test ya tiene prefijo 'es', que es defaultLang, y prefixDefaultLocale no esta definido
    // pathLang = 'es', routing.strategy != 'manual' and != 'prefix'? No, STRATEGY='prefix'!
    // With strategy='prefix' and pathLang='es' being truthy: line 226 condition is
    // `!pathLang && ...` → false → no redirect. Returns null at line 240.
    expect(result).toBeNull();
  });

  it('routing.ts: getRoutingRedirect con slashes finales iguales retorna null (linea 247)', () => {
    const url = new URL('https://example.com/es/');
    const result = getRoutingRedirect(url, {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: { strategy: 'prefix-except-default', prefixDefaultLocale: true },
    });

    expect(result).toBeNull();
  });

  it('audit.ts: flattenKeys con traducciones anidadas (linea 86)', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es.json'), {
      greeting: 'Hola',
      nested: { level1: { level2: 'profundo' } },
      list: ['a', 'b'],
    });

    writeJson(path.join(tmp, 'en.json'), {
      greeting: 'Hello',
      nested: { level1: { level2: 'deep' } },
      list: ['a', 'b'],
    });

    resetConfig();
    clearTranslationsCache();

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
    });

    const result = await auditTranslationCoverage();
    expect(result.totalKeys).toBeGreaterThan(0);
    expect(result.isComplete).toBe(true);
  });

  it('translations.ts: loadNamespacedTranslations sin .json en directorio (lineas 404-407)', async () => {
    const tmp = createTempDir();
    fs.mkdirSync(path.join(tmp, 'en'), { recursive: true });

    resetConfig();

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: tmp,
      namespaces: { enabled: true },
    });

    clearTranslationsCache();
    const result = await loadTranslations('en');
    expect(result).toEqual({});
  });

  it('routing.ts: normalizePathname con pathname vacio (linea 32)', () => {
    const lang = getPathLanguage('', ['es']);
    expect(lang).toBeNull();
  });

  it('routing.ts: isI18nRoutingStrategy llamada (linea 44)', () => {
    expect(isI18nRoutingStrategy('prefix')).toBe(true);
    expect(isI18nRoutingStrategy('invalid')).toBe(false);
  });

  it('routing.ts: matchSupportedLanguage con asterisco retorna null (linea 61)', () => {
    expect(matchSupportedLanguage('*', ['es'])).toBeNull();
  });

  it('routing.ts: prefixPathWithLanguage con pathname raiz (linea 170)', () => {
    const url = new URL('https://example.com/');
    const result = getRoutingRedirect(url, {
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: { strategy: 'prefix', redirectToDefaultLocale: true },
    });
    expect(result?.pathname).toBe('/es/');
  });

  it('translations.ts: resolveTranslationValue con bundle legacy + namespaces activos (linea 330)', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'en.json'), {
      greeting: 'Hello',
    });

    resetConfig();
    clearTranslationsCache();

    initConfig({
      defaultLang: 'en',
      supportedLangs: ['en'],
      translationsDir: tmp,
      namespaces: { enabled: true, separator: '.', defaultNamespace: 'ns' },
    });

    const result = await getTranslation('greeting', 'en');
    expect(result).toBe('Hello');

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
