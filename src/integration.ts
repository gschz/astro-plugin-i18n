/**
 * Integración principal de @gschz/astro-plugin-i18n con Astro.
 *
 * Exporta {@link createI18nIntegration} como función de fábrica que devuelve
 * un objeto `AstroIntegration` listo para incluir en `astro.config.mjs`.
 * La integración registra el middleware automáticamente y opcionalmente genera
 * tipos TypeScript a partir de los archivos JSON de traducción.
 */

import type { AstroIntegration, HookParameters } from 'astro';
import { getConfig, initConfig } from './core/config';
import type { I18nPluginOptions } from './types';
import { generateTranslationTypes } from './utils/type-generator';
import { setOptions } from './middleware-entrypoint';

const packageName = '@gschz/astro-plugin-i18n';

/**
 * Crea la integración Astro para el plugin i18n.
 *
 * Registra los hooks necesarios del ciclo de vida de Astro:
 * - `astro:config:setup`: inicializa la config, guarda opciones en `global`,
 *   registra el middleware y opcionalmente genera tipos.
 * - `astro:server:setup`: re-sincroniza las opciones con el middleware del
 *   servidor de desarrollo (en dev, los módulos pueden recargarse).
 * - `astro:build:start` / `astro:build:done`: logs de progreso del build.
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
      'astro:config:setup': async ({ logger, command, addMiddleware }: HookParameters<'astro:config:setup'>) => {
        logger.info(`Initializing integration (config stage)...`);

        initConfig(options);
        logAppliedConfig(logger);

        // Persistimos las opciones en `global` para que el middleware pueda
        // acceder a ellas incluso en entornos donde el módulo sea reimportado.
        if (typeof global !== 'undefined') {
          try {
            global.__ASTRO_I18N_OPTIONS__ = options;
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

      'astro:server:setup': ({ logger }: HookParameters<'astro:server:setup'>) => {
        logger.info(`Setting up middleware for dev server...`);
        // Re-sincronizamos en caso de que el módulo haya sido reimportado por HMR.
        setOptions(options);
      },

      'astro:build:start': async ({ logger }: HookParameters<'astro:build:start'>) => {
        logger.info(`Building with ${packageName}...`);
      },

      'astro:build:done': async ({ logger }: HookParameters<'astro:build:done'>) => {
        logger.info(`Build process contribution completed.`);
      },
    },
  };
}

/**
 * Valida que las opciones requeridas estén presentes y sean coherentes.
 * Lanza un `Error` con un mensaje descriptivo si alguna restricción no se cumple.
 *
 * @param options - Opciones a validar.
 * @param logger - Logger de Astro, si está disponible (para logging adicional).
 * @throws {Error} Si `defaultLang`, `supportedLangs` o la inclusión de
 *   `defaultLang` en `supportedLangs` no son válidos.
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

export default createI18nIntegration;
