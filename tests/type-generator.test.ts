import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { initConfig, resetConfig } from '../src/core/config';
import { generateTranslationTypes } from '../src/utils/type-generator';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'astro-i18n-plugin-tests-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

describe('type generator', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('incluye namespaces y claves base de pluralizacion', async () => {
    const tmp = createTempDir();

    writeJson(path.join(tmp, 'es', 'common.json'), {
      nav: {
        home: 'Inicio',
      },
      items: {
        count_one: 'Hay {count} item',
        count_other: 'Hay {count} items',
      },
    });

    writeJson(path.join(tmp, 'es', 'auth.json'), {
      login: {
        title: 'Ingresar',
      },
    });

    const outputPath = path.join(tmp, 'types', 'i18n-types.d.ts');

    initConfig({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir: tmp,
      typesOutputPath: outputPath,
      namespaces: {
        enabled: true,
        defaultNamespace: 'common',
        separator: ':',
      },
    });

    const generatedPath = await generateTranslationTypes();
    const contents = fs.readFileSync(generatedPath, 'utf-8');

    expect(contents).toContain("'auth:login.title'");
    expect(contents).toContain("'common:nav.home'");
    expect(contents).toContain("'nav.home'");
    expect(contents).toContain("'items.count'");
  });
});
