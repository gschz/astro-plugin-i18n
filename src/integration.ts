/**
 * Integración principal de @gschz/astro-plugin-i18n con Astro.
 *
 * Exporta {@link createI18nIntegration} como función de fábrica que devuelve
 * un objeto `AstroIntegration` listo para incluir en `astro.config.mjs`.
 * La integración registra el middleware automáticamente y opcionalmente genera
 * tipos TypeScript a partir de los archivos JSON de traducción.
 */

import type { AstroIntegration, HookParameters } from 'astro';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig, initConfig } from './core/config';
import type { I18nPluginOptions } from './types';
import { generateTranslationTypes } from './utils/type-generator';
import { setOptions } from './middleware-entrypoint';
import { clearTranslationsCache } from './core/translations';
import { auditTranslationCoverage, type TranslationCoverageResult } from './core/audit';
import { debugLog } from './utils/debug';
import { bundleLanguageTranslations, generateBundles } from './core/bundle-builder';
import { matchSupportedLanguage } from './core/routing';

/** Nombre del paquete registrado en `AstroIntegration.name`. */
const packageName = '@gschz/astro-plugin-i18n';

/**
 * Directorio de salida de Astro (`outDir`) según la configuración del proyecto.
 */
type AstroOutDir = string | URL | undefined;

let astroOutDir: AstroOutDir;

type TranslationWatcher = {
  add: (path: string) => void;
  on: (event: string, listener: (filePath: string) => void) => void;
  off?: (event: string, listener: (filePath: string) => void) => void;
  removeListener?: (event: string, listener: (filePath: string) => void) => void;
  setMaxListeners?: (n: number) => void;
  getMaxListeners?: () => number;
};

type TranslationWatcherState = {
  dir?: string;
  handler?: (filePath: string) => void;
  watcher?: TranslationWatcher;
};

/**
 * Logger del hook `astro:build:done` de Astro.
 */
type BuildDoneLogger = HookParameters<'astro:build:done'>['logger'];

/**
 * Crea la integración Astro para el plugin i18n.
 *
 * Registra los hooks necesarios del ciclo de vida de Astro:
 * - `astro:config:setup`: inicializa la config, guarda opciones en `global`,
 *   registra el middleware y opcionalmente genera tipos.
 * - `astro:server:setup`: re-sincroniza las opciones con el middleware del
 *   servidor de desarrollo (en dev, los módulos pueden recargarse); invalidación
 *   de caché al cambiar JSON; middleware opcional para servir bundles en dev.
 * - `astro:build:start`: log de inicio de build.
 * - `astro:build:done`: auditoría opcional de cobertura (`auditOnBuild`),
 *   generación de bundles lazy en disco y logs de cierre.
 *
 * @param options - Opciones de configuración del plugin. `defaultLang` y
 *   `supportedLangs` son obligatorios en tiempo de ejecución.
 * @returns Instancia de `AstroIntegration` para incluir en `integrations: []`.
 */
export function createI18nIntegration(options: Partial<I18nPluginOptions> = {}): AstroIntegration {
  // Validamos antes de retornar la integración para que los errores de
  // configuración se detecten al iniciar el servidor, no en la primera petición.
  validateOptions(options);
  setOptions(options);

  return {
    name: packageName,
    hooks: {
      'astro:config:setup': async ({
        logger,
        command,
        addMiddleware,
        config,
      }: HookParameters<'astro:config:setup'>) => {
        logger.info(`Initializing integration (config stage)...`);

        astroOutDir = (config as { outDir?: string | URL }).outDir;

        initConfig(options);
        logAppliedConfig(logger);

        // Persistimos las opciones en `globalThis` para que el middleware pueda
        // acceder a ellas incluso en entornos donde el módulo sea reimportado.
        if (typeof globalThis !== 'undefined') {
          try {
            globalThis.__ASTRO_I18N_OPTIONS__ = options;
            logger.debug('Config options stored in global object for middleware');
          } catch {
            logger.warn('Failed to store config in global object');
          }
        }

        await maybeGenerateTypes(options, command, logger);

        addMiddleware({
          entrypoint: '@gschz/astro-plugin-i18n/middleware-entrypoint',
          order: 'pre',
        });

        logger.info(`Added middleware`);
      },

      'astro:server:setup': ({ server, logger }: HookParameters<'astro:server:setup'>) => {
        logger.info(`Setting up middleware for dev server...`);
        // Re-sincronizamos en caso de que el módulo haya sido reimportado por HMR.
        setOptions(options);

        // HMR: cuando cambia cualquier JSON en translationsDir, invalidamos la
        // caché de servidor para que la siguiente petición lea los archivos actualizados.
        const config = getConfig();
        const translationsDir = path.resolve(process.cwd(), config.translationsDir ?? './src/i18n');

        const watcherState = getTranslationsWatcherState();
        const watcher = server.watcher as TranslationWatcher;

        if (watcherState.handler && watcherState.watcher) {
          const shouldDetach = watcherState.watcher !== watcher || watcherState.dir !== translationsDir;
          if (shouldDetach) {
            detachWatcherListener(watcherState.watcher, watcherState.handler);
            watcherState.handler = undefined;
            watcherState.watcher = undefined;
            watcherState.dir = undefined;
          }
        }

        if (!watcherState.handler) {
          const handleTranslationChange = (filePath: string) => {
            if (filePath.startsWith(translationsDir) && filePath.endsWith('.json')) {
              clearTranslationsCache();
              debugLog(
                `[integration] translations cache invalidated (${path.relative(process.cwd(), filePath)} changed)`,
              );
              logger.info(`i18n: translations reloaded (${path.relative(process.cwd(), filePath)})`);
            }
          };

          watcherState.dir = translationsDir;
          watcherState.handler = handleTranslationChange;
          watcherState.watcher = watcher;

          ensureWatcherMaxListeners(watcher);
          watcher.add(translationsDir);
          watcher.on('change', handleTranslationChange);
        }

        const lazyLoading = config.lazyLoading;
        if (lazyLoading?.enabled) {
          const publicBase = normalizePublicPath(lazyLoading.publicPath ?? '/i18n');

          server.middlewares.use(async (req, res, next) => {
            if (!req.url) {
              return next();
            }

            const url = new URL(req.url, 'http://localhost');
            if (!url.pathname.startsWith(`${publicBase}/`) || !url.pathname.endsWith('.json')) {
              return next();
            }

            const requestedLang = url.pathname.slice(publicBase.length + 1).replace(/\.json$/, '');
            const supportedLangs = config.supportedLangs ?? [];
            const resolvedLang = matchSupportedLanguage(requestedLang, supportedLangs);

            if (!resolvedLang) {
              res.statusCode = 404;
              res.end('Not found');
              return;
            }

            try {
              const bundle = await bundleLanguageTranslations(resolvedLang);
              const body = JSON.stringify(bundle);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store');
              res.end(body);
            } catch (error) {
              logger.warn(`i18n: failed to serve bundle for "${resolvedLang}": ${error}`);
              res.statusCode = 500;
              res.end('Failed to load translations');
            }
          });
        }
      },

      'astro:build:start': async ({ logger }: HookParameters<'astro:build:start'>) => {
        logger.info(`Building with ${packageName}...`);
      },

      'astro:build:done': async ({ logger }: HookParameters<'astro:build:done'>) => {
        logger.info(`Build process contribution completed.`);
        await runAuditOnBuildIfEnabled(options, logger);
        await generateLazyBundlesIfEnabled(logger);
      },
    },
  };
}

/**
 * Valida que las opciones requeridas estén presentes y sean coherentes.
 *
 * @param options - Opciones a validar.
 * @param logger - Logger de Astro, si está disponible (para logging adicional).
 * @throws Si `defaultLang`, `supportedLangs` o la inclusión de `defaultLang` en
 *   `supportedLangs` no son válidos.
 */
function validateOptions(
  options: Partial<I18nPluginOptions>,
  logger?: HookParameters<'astro:config:setup'>['logger'],
): void {
  const logError = (message: string) => {
    if (logger) {
      logger.error(message);
    }
    throw new Error(message);
  };

  if (!options.defaultLang || typeof options.defaultLang !== 'string') {
    logError("i18n config error: 'defaultLang' is required and must be a string in Astro integration options.");
  }

  if (!options.supportedLangs || !Array.isArray(options.supportedLangs) || options.supportedLangs.length === 0) {
    logError(
      "i18n config error: 'supportedLangs' is required and must be a non-empty array in Astro integration options.",
    );
  }

  // defaultLang debe estar incluido en supportedLangs para que la lógica de
  // resolución de idioma tenga un fallback válido en el array.
  if (!options.supportedLangs?.includes(options.defaultLang as string)) {
    logError(
      `i18n config error: 'defaultLang' ("${
        options.defaultLang
      }") must be included in 'supportedLangs' [${options.supportedLangs?.join(', ')}].`,
    );
  }
}

/**
 * Registra la configuración aplicada en el logger de Astro para facilitar
 * el diagnóstico durante el arranque del servidor o del build.
 *
 * @param logger - Logger de Astro del hook `astro:config:setup`.
 */
function logAppliedConfig(logger: HookParameters<'astro:config:setup'>['logger']): void {
  const currentConfig = getConfig();

  logger.info(
    `i18n config applied: defaultLang=${currentConfig.defaultLang}, supportedLangs=[${currentConfig.supportedLangs?.join(', ')}]`,
  );

  if (!currentConfig.defaultLang) {
    logger.warn('Warning: defaultLang is missing in applied config!');
  }
}

/**
 * Genera los tipos TypeScript de las claves de traducción si la opción
 * `generateTypes` está habilitada y el comando es `dev` o `build`.
 *
 * @param options - Opciones del plugin.
 * @param command - Comando Astro activo (`"dev"`, `"build"`, etc.).
 * @param logger - Logger de Astro.
 */
async function maybeGenerateTypes(
  options: Partial<I18nPluginOptions>,
  command: string,
  logger: HookParameters<'astro:config:setup'>['logger'],
): Promise<void> {
  if (options.generateTypes && (command === 'build' || command === 'dev')) {
    try {
      logger.info('Attempting to generate i18n types...');
      const typesPath = await generateTranslationTypes();

      if (typesPath) {
        logger.info(`Generated i18n translation types at: ${typesPath}`);
      } else {
        logger.info('i18n type generation skipped (no translations found for default language).');
      }
    } catch (error) {
      logger.error(`Failed to generate i18n translation types: ${error}`);
    }
  } else if (options.generateTypes) {
    logger.info("Skipping i18n type generation (enabled but command is not 'build' or 'dev').");
  }
}

function getTranslationsWatcherState(): TranslationWatcherState {
  const runtimeGlobal = globalThis as typeof globalThis & {
    __ASTRO_I18N_TRANSLATIONS_WATCHER__?: TranslationWatcherState;
  };

  runtimeGlobal.__ASTRO_I18N_TRANSLATIONS_WATCHER__ ??= {};

  return runtimeGlobal.__ASTRO_I18N_TRANSLATIONS_WATCHER__;
}

function detachWatcherListener(watcher: TranslationWatcher, handler: (filePath: string) => void): void {
  if (typeof watcher.off === 'function') {
    watcher.off('change', handler);
    return;
  }

  if (typeof watcher.removeListener === 'function') {
    watcher.removeListener('change', handler);
  }
}

function ensureWatcherMaxListeners(watcher: TranslationWatcher): void {
  if (typeof watcher.setMaxListeners !== 'function' || typeof watcher.getMaxListeners !== 'function') {
    return;
  }

  const currentMax = watcher.getMaxListeners();
  const targetMax = Math.max(currentMax, 25);

  if (targetMax !== currentMax) {
    watcher.setMaxListeners(targetMax);
  }
}

function normalizePublicPath(publicPath: string): string {
  const trimmed = publicPath.trim().length > 0 ? publicPath.trim() : '/i18n';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '');
}

function resolveOutDirPath(outDir: string | URL | undefined): string {
  if (outDir instanceof URL) {
    return fileURLToPath(outDir);
  }

  if (typeof outDir === 'string' && outDir.trim().length > 0) {
    return path.resolve(process.cwd(), outDir);
  }

  return path.resolve(process.cwd(), 'dist');
}

function resolveLazyOutputDir(outDir: string | URL | undefined, publicPath?: string): string {
  const normalizedPublic = normalizePublicPath(publicPath ?? '/i18n').replace(/^\//, '');
  return path.join(resolveOutDirPath(outDir), normalizedPublic);
}

function logTranslationCoverageReport(logger: BuildDoneLogger, report: TranslationCoverageResult): void {
  if (report.isComplete) {
    logger.info(`i18n coverage: all ${report.languages.length} languages have ${report.totalKeys} keys ✓`);
    return;
  }

  for (const [lang, missingKeys] of Object.entries(report.missing)) {
    if (missingKeys.length === 0) {
      continue;
    }

    const preview = missingKeys.slice(0, 5).join(', ');
    const extraCount = missingKeys.length - 5;
    const moreSuffix = extraCount > 0 ? ` (+${extraCount} more)` : '';
    logger.warn(
      `i18n coverage: "${lang}" is missing ${missingKeys.length}/${report.totalKeys} keys: ${preview}${moreSuffix}`,
    );
  }
}

/**
 * Si `auditOnBuild` está activo, ejecuta la auditoría de cobertura y registra el informe.
 */
async function runAuditOnBuildIfEnabled(options: Partial<I18nPluginOptions>, logger: BuildDoneLogger): Promise<void> {
  if (!options.auditOnBuild) {
    return;
  }

  try {
    const report = await auditTranslationCoverage(options);
    logTranslationCoverageReport(logger, report);
  } catch (error) {
    logger.warn(`i18n coverage audit failed: ${error}`);
  }
}

/**
 * Tras el build, genera en disco los bundles por idioma si lazy loading está habilitado.
 */
async function generateLazyBundlesIfEnabled(logger: BuildDoneLogger): Promise<void> {
  const config = getConfig();
  if (!config.lazyLoading?.enabled) {
    return;
  }

  try {
    const outputDir = resolveLazyOutputDir(astroOutDir, config.lazyLoading.publicPath);
    await generateBundles(outputDir);
    logger.info(`i18n: bundles generated at ${path.relative(process.cwd(), outputDir)}`);
  } catch (error) {
    logger.warn(`i18n: failed to generate bundles: ${error}`);
  }
}

export default createI18nIntegration;
