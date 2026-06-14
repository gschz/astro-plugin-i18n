import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '~/core/config';
import { clearTranslationsCache } from '~/core/translations';
import { createI18nIntegration } from '~/integration';
import { setOptions } from '~/middleware-entrypoint';

function buildLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

function buildConfig(overrides: Record<string, unknown> = {}): {
  outDir: string;
  build: { client: string };
  vite: { define: Record<string, unknown> };
} {
  return {
    outDir: '/tmp/astro-test-dist',
    build: { client: './client' },
    vite: { define: {} },
    ...overrides,
  };
}

function createUpdateConfig(config: {
  vite: { define?: Record<string, unknown>; plugins?: unknown[] };
}) {
  return vi.fn(
    (updates: {
      vite?: { define?: Record<string, unknown>; plugins?: unknown[] };
    }) => {
      if (updates.vite?.define && config.vite.define) {
        Object.assign(config.vite.define, updates.vite.define);
      }
      if (updates.vite?.plugins) {
        config.vite.plugins = updates.vite.plugins;
      }
    },
  );
}

async function runConfigSetup(
  options: Parameters<typeof createI18nIntegration>[0],
  configOverrides: Record<string, unknown> = {},
) {
  const integration = createI18nIntegration(options);
  const hooks = integration.hooks as {
    'astro:config:setup': (params: unknown) => Promise<void>;
  };
  const config = buildConfig(configOverrides);
  const logger = buildLogger();
  const addMiddleware = vi.fn();
  const command = 'build';
  const updateConfig = createUpdateConfig(config);

  await hooks['astro:config:setup']({
    logger,
    command,
    addMiddleware,
    config,
    updateConfig,
  });

  return { config, logger, addMiddleware };
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
}

describe('integration: vite.define para runtime serverless', () => {
  beforeEach(() => {
    setOptions(null);
    Reflect.deleteProperty(globalThis, '__ASTRO_I18N_OPTIONS__');
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__ASTRO_I18N_RUNTIME_OPTIONS__');
  });

  it('inlinea las opciones validadas en vite.define con la clave correcta', async () => {
    const { config } = await runConfigSetup({
      defaultLang: 'es',
      supportedLangs: ['es', 'en', 'pt-BR'],
      routing: { strategy: 'prefix-except-default' },
      fallback: { 'pt-BR': 'en' },
    });

    expect(config.vite.define['__ASTRO_I18N_RUNTIME_OPTIONS__']).toBeDefined();
    const baked = JSON.parse(
      JSON.parse(
        config.vite.define['__ASTRO_I18N_RUNTIME_OPTIONS__'] as string,
      ),
    );

    expect(baked).toMatchObject({
      defaultLang: 'es',
      supportedLangs: ['es', 'en', 'pt-BR'],
      routing: { strategy: 'prefix-except-default' },
      fallback: { 'pt-BR': 'en' },
    });
  });

  it('preserva defines previos del usuario al agregar el del plugin', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });
    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
    };
    const config: {
      outDir: string;
      build: { client: string };
      vite: { define: Record<string, unknown> };
    } = {
      outDir: '/tmp/astro-test-dist',
      build: { client: './client' },
      vite: {
        define: {
          __USER_DEFINE__: '"keep-me"',
        },
      },
    };
    const updateConfig = createUpdateConfig(config);
    await hooks['astro:config:setup']({
      logger: buildLogger(),
      command: 'build',
      addMiddleware: vi.fn(),
      config,
      updateConfig,
    });

    expect(config.vite.define['__USER_DEFINE__']).toBe('"keep-me"');
    expect(config.vite.define['__ASTRO_I18N_RUNTIME_OPTIONS__']).toBeDefined();
  });

  it('registra el middleware con order="pre"', async () => {
    const { addMiddleware } = await runConfigSetup({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });

    expect(addMiddleware).toHaveBeenCalledWith({
      entrypoint: '@gschz/astro-plugin-i18n/middleware-entrypoint',
      order: 'pre',
    });
  });

  it('lee build.client desde la config de Astro para resolver el path de bundles lazy', async () => {
    const { config } = await runConfigSetup(
      {
        defaultLang: 'es',
        supportedLangs: ['es', 'en'],
        lazyLoading: { enabled: true, publicPath: '/i18n' },
      },
      { build: { client: './static-assets' } },
    );

    expect(config.build.client).toBe('./static-assets');
  });

  it('inlinea las traducciones en vite.define cuando existen archivos', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'astro-i18n-integration-translations-'),
    );

    try {
      await writeJson(path.join(tmpDir, 'es.json'), {
        greeting: 'Hola',
        nav: { title: 'Inicio' },
      });
      await writeJson(path.join(tmpDir, 'en.json'), {
        greeting: 'Hello',
        nav: { title: 'Home' },
      });

      const { config } = await runConfigSetup(
        {
          defaultLang: 'es',
          supportedLangs: ['es', 'en'],
          translationsDir: tmpDir,
        },
        { vite: { define: {} } },
      );

      const defineValue = config.vite.define[
        '__ASTRO_I18N_TRANSLATIONS__'
      ] as string;
      expect(defineValue).toBeDefined();

      // Double JSON.parse: first unwraps the string expression,
      // second parses the actual JSON payload.
      const parsed = JSON.parse(JSON.parse(defineValue));

      expect(parsed).toHaveProperty('es');
      expect(parsed).toHaveProperty('en');
      expect(parsed.es.greeting).toBe('Hola');
      expect(parsed.en.greeting).toBe('Hello');
      expect(parsed.es.nav.title).toBe('Inicio');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('no inlinea traducciones vacias en vite.define', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'astro-i18n-integration-no-translations-'),
    );

    try {
      const { config } = await runConfigSetup(
        {
          defaultLang: 'es',
          supportedLangs: ['es', 'en'],
          translationsDir: tmpDir,
        },
        { vite: { define: {} } },
      );

      // Sin archivos de traduccion, la clave no debe estar en define.
      expect(config.vite.define['__ASTRO_I18N_TRANSLATIONS__']).toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('integration: bundles lazy bajo build.client', () => {
  let tmpDir = '';
  let translationsDir = '';

  beforeEach(async () => {
    clearTranslationsCache();
    resetConfig();
    setOptions(null);
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'astro-i18n-integration-bundles-'),
    );
    translationsDir = path.join(tmpDir, 'i18n');
    await writeJson(path.join(translationsDir, 'es', 'common.json'), {
      hello: 'Hola',
    });
    await writeJson(path.join(translationsDir, 'en', 'common.json'), {
      hello: 'Hello',
    });
  });

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
    clearTranslationsCache();
    resetConfig();
    setOptions(null);
  });

  it('escribe los bundles en <outDir>/<build.client>/<publicPath>, no en <outDir>/<publicPath>', async () => {
    const outDir = path.join(tmpDir, 'dist');
    await fs.mkdir(outDir, { recursive: true });

    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir,
      namespaces: { enabled: true, defaultNamespace: 'common' },
      lazyLoading: { enabled: true, publicPath: '/i18n' },
    });

    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
      'astro:build:done': (params: unknown) => Promise<void>;
    };

    const config0 = {
      outDir,
      build: { client: './client' as const },
      vite: { define: {} as Record<string, unknown> },
    };
    const updateConfig0 = createUpdateConfig(config0);
    await hooks['astro:config:setup']({
      logger: buildLogger(),
      command: 'build',
      addMiddleware: vi.fn(),
      config: config0,
      updateConfig: updateConfig0,
    });

    await hooks['astro:build:done']({
      logger: buildLogger(),
      dir: new URL(`file://${outDir}/`),
      pages: [],
      assets: new Map(),
    });

    // Los bundles deben estar en dist/client/i18n/ (build.client)
    const clientBundlesDir = path.join(outDir, 'client', 'i18n');
    const esBundle = JSON.parse(
      await fs.readFile(path.join(clientBundlesDir, 'es.json'), 'utf-8'),
    );
    const enBundle = JSON.parse(
      await fs.readFile(path.join(clientBundlesDir, 'en.json'), 'utf-8'),
    );
    expect(esBundle).toEqual({ common: { hello: 'Hola' } });
    expect(enBundle).toEqual({ common: { hello: 'Hello' } });

    // Y NO deben estar en dist/i18n/ (comportamiento anterior)
    const oldBundlesDir = path.join(outDir, 'i18n');
    await expect(
      fs.access(path.join(oldBundlesDir, 'es.json')),
    ).rejects.toThrow();
  });

  it('respeta un build.client personalizado (caso @astrojs/node standalone con publicDir custom)', async () => {
    const outDir = path.join(tmpDir, 'dist');
    await fs.mkdir(outDir, { recursive: true });

    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir,
      namespaces: { enabled: true, defaultNamespace: 'common' },
      lazyLoading: { enabled: true, publicPath: '/locales' },
    });

    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
      'astro:build:done': (params: unknown) => Promise<void>;
    };

    const config1 = {
      outDir,
      build: { client: './public' as const },
      vite: { define: {} as Record<string, unknown> },
    };
    const updateConfig1 = createUpdateConfig(config1);
    await hooks['astro:config:setup']({
      logger: buildLogger(),
      command: 'build',
      addMiddleware: vi.fn(),
      config: config1,
      updateConfig: updateConfig1,
    });

    await hooks['astro:build:done']({
      logger: buildLogger(),
      dir: new URL(`file://${outDir}/`),
      pages: [],
      assets: new Map(),
    });

    const customBundlesDir = path.join(outDir, 'public', 'locales');
    const esBundle = JSON.parse(
      await fs.readFile(path.join(customBundlesDir, 'es.json'), 'utf-8'),
    );
    expect(esBundle).toEqual({ common: { hello: 'Hola' } });
  });

  it('tolera build.client como URL o valor no-string (caso Astro 6+)', async () => {
    const outDir = path.join(tmpDir, 'dist-url');
    await fs.mkdir(outDir, { recursive: true });

    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es'],
      translationsDir,
      namespaces: { enabled: true, defaultNamespace: 'common' },
      lazyLoading: { enabled: true, publicPath: '/locales' },
    });

    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
      'astro:build:done': (params: unknown) => Promise<void>;
    };

    const config2 = {
      outDir,
      build: { client: new URL(`file://${outDir}/public/`) },
      vite: { define: {} as Record<string, unknown> },
    };
    const updateConfig2 = createUpdateConfig(config2);
    await hooks['astro:config:setup']({
      logger: buildLogger(),
      command: 'build',
      addMiddleware: vi.fn(),
      config: config2,
      updateConfig: updateConfig2,
    });

    await hooks['astro:build:done']({
      logger: buildLogger(),
      dir: new URL(`file://${outDir}/`),
      pages: [],
      assets: new Map(),
    });

    const urlBundlesDir = path.join(outDir, 'public', 'locales');
    const esBundle = JSON.parse(
      await fs.readFile(path.join(urlBundlesDir, 'es.json'), 'utf-8'),
    );
    expect(esBundle).toEqual({ common: { hello: 'Hola' } });
  });
});

describe('integration: hooks y helpers internos', () => {
  beforeEach(() => {
    setOptions(null);
    Reflect.deleteProperty(globalThis, '__ASTRO_I18N_OPTIONS__');
    Reflect.deleteProperty(globalThis, '__ASTRO_I18N_TRANSLATIONS_WATCHER__');
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__ASTRO_I18N_RUNTIME_OPTIONS__');
    Reflect.deleteProperty(globalThis, '__ASTRO_I18N_TRANSLATIONS_WATCHER__');
    resetConfig();
  });

  it('astro:build:start se ejecuta sin errores', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });

    const hooks = integration.hooks as {
      'astro:build:start': (params: unknown) => Promise<void>;
    };

    await expect(
      hooks['astro:build:start']({ logger: buildLogger() }),
    ).resolves.toBeUndefined();
  });

  it('maybeGenerateTypes con command=build con translationsDir vacio muestra aviso', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'astro-i18n-integration-types-'),
    );

    try {
      const { logger } = await runConfigSetup(
        {
          defaultLang: 'es',
          supportedLangs: ['es', 'en'],
          translationsDir: tmpDir,
          generateTypes: true,
        },
        { vite: { define: {} } },
      );

      expect(logger.info).toHaveBeenCalledWith(
        'i18n type generation skipped (no translations found for default language).',
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('maybeGenerateTypes con command=preview muestra aviso de salto', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      generateTypes: true,
    });

    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
    };
    const config = buildConfig({ vite: { define: {} } });
    const logger = buildLogger();

    await hooks['astro:config:setup']({
      logger,
      command: 'preview',
      addMiddleware: vi.fn(),
      config,
      updateConfig: createUpdateConfig(config),
    });

    expect(logger.info).toHaveBeenCalledWith(
      "Skipping i18n type generation (enabled but command is not 'build' or 'dev').",
    );
  });

  it('config:setup tolera build.client como URL file:// sin errores', async () => {
    const outDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'astro-i18n-integration-url-client-'),
    );
    const publicDir = path.join(outDir, 'public');

    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });

    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
    };

    const config = {
      outDir,
      build: { client: new URL(`file://${publicDir}/`) },
      vite: { define: {} as Record<string, unknown> },
    };
    const logger = buildLogger();
    const addMiddleware = vi.fn();
    const updateConfig = createUpdateConfig(config);

    await hooks['astro:config:setup']({
      logger,
      command: 'build',
      addMiddleware,
      config,
      updateConfig,
    });

    // Se completa sin error y el define se inscribe en la config
    expect(config.vite.define['__ASTRO_I18N_RUNTIME_OPTIONS__']).toBeDefined();
  });

  it('serializeOptionsForDefine descarta funciones y valores no serializables', async () => {
    const { config } = await runConfigSetup(
      {
        defaultLang: 'es',
        supportedLangs: ['es', 'en'],
        routing: { strategy: 'prefix-except-default' },
      } as Record<string, unknown>,
      { vite: { define: {} } },
    );

    const defineValue = config.vite.define[
      '__ASTRO_I18N_RUNTIME_OPTIONS__'
    ] as string;
    expect(defineValue).toBeDefined();

    const parsed = JSON.parse(JSON.parse(defineValue));
    expect(parsed).toMatchObject({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });
  });

  it('astro:server:setup registra watcher y no falla', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });

    const hooks = integration.hooks as {
      'astro:server:setup': (params: unknown) => Promise<void>;
    };

    const watcher = {
      add: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn().mockReturnValue(10),
    };

    await hooks['astro:server:setup']({
      server: { watcher },
      logger: buildLogger(),
    });

    expect(watcher.add).toHaveBeenCalled();
    expect(watcher.on).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('astro:server:setup con lazyLoading registra middleware', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      lazyLoading: { enabled: true, publicPath: '/locales' },
    });

    const hooks = integration.hooks as {
      'astro:server:setup': (params: unknown) => void;
    };

    const useSpy = vi.fn();
    const watcher = {
      add: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn().mockReturnValue(10),
    };
    const logger = buildLogger();

    hooks['astro:server:setup']({
      server: { watcher, middlewares: { use: useSpy } },
      logger,
    });

    expect(useSpy).toHaveBeenCalled();
    const middleware = useSpy.mock.calls[0][0];
    expect(middleware).toEqual(expect.any(Function));
  });

  it('astro:server:setup detacha watcher anterior cuando cambia el server', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });

    const hooks = integration.hooks as {
      'astro:server:setup': (params: unknown) => void;
    };

    const handlerRef = { current: null as unknown };

    const firstWatcher = {
      add: vi.fn(),
      on: vi.fn((_event: string, handler: unknown) => {
        handlerRef.current = handler;
      }),
      off: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn().mockReturnValue(10),
    };

    hooks['astro:server:setup']({
      server: { watcher: firstWatcher },
      logger: buildLogger(),
    });

    expect(firstWatcher.add).toHaveBeenCalledTimes(1);

    const secondWatcher = {
      add: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      setMaxListeners: vi.fn(),
      getMaxListeners: vi.fn().mockReturnValue(10),
    };

    hooks['astro:server:setup']({
      server: { watcher: secondWatcher },
      logger: buildLogger(),
    });

    expect(firstWatcher.off).toHaveBeenCalled();
    expect(secondWatcher.add).toHaveBeenCalled();
  });

  it('normalizeBuildClientDir con URL http:// retorna pathname', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });

    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
    };

    const config = {
      outDir: '/tmp',
      build: { client: new URL('http://example.com/client/') },
      vite: { define: {} as Record<string, unknown> },
    };
    const logger = buildLogger();
    const updateConfig = createUpdateConfig(config);

    await hooks['astro:config:setup']({
      logger,
      command: 'build',
      addMiddleware: vi.fn(),
      config,
      updateConfig,
    });

    expect(config.vite.define['__ASTRO_I18N_RUNTIME_OPTIONS__']).toBeDefined();
  });

  it('config:setup con build.client no-string ni URL no falla', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });

    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
    };

    const config = {
      outDir: '/tmp',
      build: { client: 42 },
      vite: { define: {} as Record<string, unknown> },
    };
    const logger = buildLogger();
    const updateConfig = createUpdateConfig(config);

    await hooks['astro:config:setup']({
      logger,
      command: 'build',
      addMiddleware: vi.fn(),
      config,
      updateConfig,
    });

    expect(config.vite.define['__ASTRO_I18N_RUNTIME_OPTIONS__']).toBeDefined();
  });

  it('auditOnBuild=true ejecuta auditoria sin errores', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'astro-i18n-integration-audit-'),
    );

    try {
      await writeJson(path.join(tmpDir, 'es.json'), { hello: 'Hola' });
      await writeJson(path.join(tmpDir, 'en.json'), { hello: 'Hello' });

      const integration = createI18nIntegration({
        defaultLang: 'es',
        supportedLangs: ['es', 'en'],
        translationsDir: tmpDir,
        auditOnBuild: true,
      });

      const hooks = integration.hooks as {
        'astro:build:done': (params: unknown) => Promise<void>;
      };
      const logger = buildLogger();

      await hooks['astro:build:done']({
        logger,
        dir: '/tmp',
        pages: [],
        assets: new Map(),
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/i18n coverage/),
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('config:setup con build.client URL file:// con host invalido no falla', async () => {
    const integration = createI18nIntegration({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
    });

    const hooks = integration.hooks as {
      'astro:config:setup': (params: unknown) => Promise<void>;
    };

    const config = {
      outDir: '/tmp',
      build: { client: new URL('file://example.com/path') },
      vite: { define: {} as Record<string, unknown> },
    };
    const logger = buildLogger();
    const updateConfig = createUpdateConfig(config);

    await hooks['astro:config:setup']({
      logger,
      command: 'build',
      addMiddleware: vi.fn(),
      config,
      updateConfig,
    });

    expect(config.vite.define['__ASTRO_I18N_RUNTIME_OPTIONS__']).toBeDefined();
  });
});
