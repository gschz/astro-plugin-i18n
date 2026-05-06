import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import { clearTranslationsCache } from '../src/core/translations';
import { translateAsync } from '../src/core/translate';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'astro-i18n-plugin-tests-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

describe('translateAsync (server)', () => {
  beforeEach(() => {
    clearTranslationsCache();
    resetConfig();
  });

  it('resuelve namespaces y pluralizacion en servidor', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es', 'common.json'), {
      items: {
        count_zero: 'No hay items',
        count_one: 'Hay {count} item',
        count_other: 'Hay {count} items',
      },
    });

    writeJson(path.join(tmp, 'es', 'auth.json'), {
      login: {
        title: 'Ingresar',
      },
    });

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
      namespaces: {
        enabled: true,
        defaultNamespace: 'common',
        separator: ':',
      },
    });

    await expect(translateAsync('auth:login.title', { lang: 'es' })).resolves.toBe('Ingresar');
    await expect(translateAsync('items.count', { lang: 'es', values: { count: 0 } })).resolves.toBe('No hay items');
    await expect(translateAsync('items.count', { lang: 'es', values: { count: 2 } })).resolves.toBe('Hay 2 items');
  });
});
