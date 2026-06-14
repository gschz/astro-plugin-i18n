import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '~/core/config';
import { i18nVirtualModulePlugin } from '~/vite-plugin-i18n';

const VIRTUAL_MODULE_ID = 'virtual:@gschz/astro-plugin-i18n/internal';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'astro-i18n-virtual-module-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

describe('i18nVirtualModulePlugin', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
    resetConfig();
  });

  afterEach(() => {
    resetConfig();
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('devuelve un plugin con nombre y enforce correctos', () => {
    const plugin = i18nVirtualModulePlugin();

    expect(plugin.name).toBe('astro-plugin-i18n:virtual-module');
    expect(plugin.enforce).toBe('pre');
  });

  it('resolveId resuelve el ID virtual', () => {
    const plugin = i18nVirtualModulePlugin();

    const resolved = (plugin.resolveId as (id: string) => string | undefined)(
      VIRTUAL_MODULE_ID,
    );

    expect(resolved).toBe('\0' + VIRTUAL_MODULE_ID);
  });

  it('resolveId retorna undefined para IDs no virtuales', () => {
    const plugin = i18nVirtualModulePlugin();

    const result = (plugin.resolveId as (id: string) => string | undefined)(
      'some-other-module',
    );

    expect(result).toBeUndefined();
  });

  it('resolveId retorna undefined para IDs con prefijo vacio', () => {
    const plugin = i18nVirtualModulePlugin();

    const result = (plugin.resolveId as (id: string) => string | undefined)('');

    expect(result).toBeUndefined();
  });

  it('load retorna codigo con traducciones y config cuando hay archivos', async () => {
    writeJson(path.join(tmpDir, 'es.json'), { greeting: 'Hola' });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmpDir,
      fallback: undefined,
      namespaces: {
        enabled: false,
        defaultNamespace: 'common',
        separator: ':',
      },
      pluralization: { enabled: true, field: 'count' },
      routing: {
        strategy: 'manual',
        prefixDefaultLocale: false,
        redirectToDefaultLocale: false,
      },
      lazyLoading: {
        enabled: false,
        strategy: 'language',
        publicPath: '/i18n',
      },
    });

    const plugin = i18nVirtualModulePlugin();
    const resolved = (plugin.resolveId as (id: string) => string | undefined)(
      VIRTUAL_MODULE_ID,
    ) as string;

    const result = await (
      plugin.load as (
        id: string,
      ) => Promise<{ code: string; map: null } | undefined>
    )(resolved);

    expect(result).toBeDefined();
    expect(result?.code).toContain('allTranslations');
    expect(result?.code).toContain('Hola');
    expect(result?.code).toContain('defaultLang');
    expect(result?.code).toContain('es');
  });

  it('load retorna undefined para IDs no resueltos', async () => {
    const plugin = i18nVirtualModulePlugin();

    const result = await (
      plugin.load as (
        id: string,
      ) => Promise<{ code: string; map: null } | undefined>
    )('some-random-id');

    expect(result).toBeUndefined();
  });
});
