/**
 * Gestión de configuración para @gschz/astro-plugin-i18n.
 *
 * La configuración se mantiene como un singleton de módulo (`config`).
 * El módulo provee funciones para inicializarla, actualizarla y leerla de forma
 * normalizada, garantizando que los campos críticos nunca sean `undefined` en
 * tiempo de lectura.
 */

import type { I18nPluginOptions, Language, TranslationConfig } from '../types';
import { normalizeRoutingOptions } from './routing';

/**
 * Constante inlinada por Vite en build time cuando la integracion
 * `createI18nIntegration` se registra en `astro.config.*`. Contiene
 * las opciones del plugin serializadas como JSON string.
 *
 * Se usa como ultimo fallback en {@link readBakedConfigOptions} para
 * entornos serverless (Vercel, Cloudflare, Netlify) donde el singleton
 * de modulo se inicializa fresco en cada invocacion y `globalThis` del
 * build no esta disponible.
 *
 * El mismo identificador se declara en `middleware-entrypoint.ts`, pero Vite
 * reemplaza todas las ocurrencias (en todos los modulos) con el mismo literal.
 */
declare const __ASTRO_I18N_RUNTIME_OPTIONS__: string | undefined;

/**
 * Valores predeterminados para todos los campos de configuración.
 * Se usan como base tanto al inicializar como al resetear el estado.
 */
const defaultConfig: TranslationConfig = {
  defaultLang: undefined,
  supportedLangs: [],
  fallback: undefined,
  routing: {
    strategy: 'manual',
    prefixDefaultLocale: false,
    redirectToDefaultLocale: false,
  },
  translationsDir: './src/i18n',
  namespaces: {
    defaultNamespace: 'common',
    separator: ':',
  },
  pluralization: {
    enabled: true,
    field: 'count',
  },
  lazyLoading: {
    enabled: false,
    strategy: 'language',
    preloadNamespaces: undefined,
    publicPath: '/i18n',
  },
  autoDetect: true,
  generateTypes: false,
  typesOutputPath: './src/types/i18n-types.d.ts',
  missingKeyStrategy: 'key',
  auditOnBuild: false,
};

/** Estado mutable del singleton. Se empieza con los valores por defecto. */
let config: TranslationConfig = { ...defaultConfig };

/** Indica si el singleton fue inicializado en este proceso. */
let isConfigInitialized = false;

type RuntimeGlobal = typeof globalThis & {
  __ASTRO_I18N_OPTIONS__?: Partial<I18nPluginOptions>;
  __INITIAL_I18N_STATE__?: {
    config?: Partial<I18nPluginOptions>;
  };
};

/**
 * Intenta leer las opciones del plugin desde la constante inlinada por Vite
 * `__ASTRO_I18N_RUNTIME_OPTIONS__` (via `vite.define`). Es el unico mecanismo
 * que garantiza que las opciones del usuario esten disponibles en runtimes
 * serverless (Vercel, Netlify, Cloudflare) porque el valor se escribe como
 * literal string en el bundle compilado, no depende de `globalThis`.
 *
 * Tambien verifica el fallback en `globalThis.__ASTRO_I18N_RUNTIME_OPTIONS__`
 * para tests y consumidores avanzados.
 */
function readBakedConfigOptions(): Partial<I18nPluginOptions> | undefined {
  // 1. Camino "build": Vite inlinea el identificador con un literal string.
  if (
    typeof __ASTRO_I18N_RUNTIME_OPTIONS__ === 'string' &&
    __ASTRO_I18N_RUNTIME_OPTIONS__.length > 0
  ) {
    try {
      return JSON.parse(
        __ASTRO_I18N_RUNTIME_OPTIONS__,
      ) as Partial<I18nPluginOptions>;
    } catch {
      // JSON corrupto, seguimos con el siguiente mecanismo.
    }
  }

  // 2. Camino "test / consumidor avanzado": permite setear el JSON en globalThis
  //    sin depender de la sustitucion de Vite.
  if (typeof globalThis !== 'undefined') {
    try {
      const fromGlobal = (
        globalThis as { __ASTRO_I18N_RUNTIME_OPTIONS__?: unknown }
      ).__ASTRO_I18N_RUNTIME_OPTIONS__;
      if (typeof fromGlobal === 'string' && fromGlobal.length > 0) {
        return JSON.parse(fromGlobal) as Partial<I18nPluginOptions>;
      }
    } catch {
      // Ignoramos entornos donde globalThis es read-only.
    }
  }

  return undefined;
}

/**
 * Hidrata la configuracion desde:
 * 1. `__ASTRO_I18N_RUNTIME_OPTIONS__` (Vite define, sobrevive en serverless)
 * 2. `globalThis.__ASTRO_I18N_OPTIONS__`
 * 3. `globalThis.__INITIAL_I18N_STATE__.config`
 *
 * cuando este modulo se ejecuta en un runtime aislado (ej. isla de React,
 * serverless) y aun no se inicializo via {@link initConfig}.
 */
function hydrateConfigFromGlobal(): void {
  if (isConfigInitialized || typeof globalThis === 'undefined') {
    return;
  }

  try {
    const runtimeGlobal = globalThis as RuntimeGlobal;

    // 1º prioridad: Vite define (sobrevive en serverless)
    const bakedOptions = readBakedConfigOptions();
    if (bakedOptions) {
      config = { ...defaultConfig, ...bakedOptions };
      isConfigInitialized = true;
      return;
    }

    // 2º prioridad: globalThis seteado por la integracion en build time
    // (no sobrevive en serverless, pero funciona en dev y Node server).
    const globalOptions =
      runtimeGlobal.__ASTRO_I18N_OPTIONS__ ??
      runtimeGlobal.__INITIAL_I18N_STATE__?.config;

    if (globalOptions) {
      config = { ...defaultConfig, ...globalOptions };
      isConfigInitialized = true;
    }
  } catch {
    // Ignoramos errores en entornos donde globalThis no es accesible.
  }
}

/**
 * Devuelve la configuración activa con todos los campos normalizados.
 *
 * Los campos opcionales que podrían ser `undefined` se resuelven aquí con sus
 * valores de fallback para que el resto del código no tenga que manejar `undefined`.
 * En particular, `supportedLangs` nunca devuelve un array vacío: si el array
 * interno está vacío se sustituye por `["en"]` para asegurar al menos un idioma.
 *
 * @returns Configuración completa con valores garantizados.
 */
export function getConfig(): TranslationConfig {
  hydrateConfigFromGlobal();
  const currentConfig = config;

  // Si supportedLangs no fue configurado, el fallback mínimo es inglés para
  // evitar comparaciones contra arrays vacíos en setupLanguage y en el middleware.
  const normalizedSupportedLangs =
    currentConfig.supportedLangs && currentConfig.supportedLangs.length > 0
      ? currentConfig.supportedLangs
      : ['en'];

  const normalizedRouting = normalizeRoutingOptions(currentConfig.routing);

  const normalizedNamespaces = {
    enabled: currentConfig.namespaces?.enabled,
    defaultNamespace: currentConfig.namespaces?.defaultNamespace ?? 'common',
    separator: currentConfig.namespaces?.separator ?? ':',
  };

  const normalizedPluralization = {
    enabled: currentConfig.pluralization?.enabled ?? true,
    field: currentConfig.pluralization?.field ?? 'count',
  };

  const normalizedLazyLoading = {
    enabled: currentConfig.lazyLoading?.enabled ?? false,
    strategy: currentConfig.lazyLoading?.strategy ?? 'language',
    preloadNamespaces: currentConfig.lazyLoading?.preloadNamespaces,
    publicPath: currentConfig.lazyLoading?.publicPath ?? '/i18n',
  };

  return {
    ...currentConfig,
    defaultLang: currentConfig.defaultLang ?? 'en',
    supportedLangs: normalizedSupportedLangs,
    routing: normalizedRouting,
    translationsDir: currentConfig.translationsDir ?? './src/i18n',
    namespaces: normalizedNamespaces,
    pluralization: normalizedPluralization,
    lazyLoading: normalizedLazyLoading,
    autoDetect: currentConfig.autoDetect ?? true,
    generateTypes: currentConfig.generateTypes ?? false,
    typesOutputPath:
      currentConfig.typesOutputPath ?? './src/types/i18n-types.d.ts',
    missingKeyStrategy: currentConfig.missingKeyStrategy ?? 'key',
  };
}

/**
 * Aplica una actualización parcial sobre la configuración activa.
 * Útil para sobreescribir campos individualmente sin reemplazar el objeto completo.
 *
 * @param options - Campos a actualizar.
 * @returns Copia de la configuración resultante (sin normalizar).
 */
export function updateConfig(
  options: Partial<I18nPluginOptions> = {},
): TranslationConfig {
  config = {
    ...config,
    ...options,
  };

  isConfigInitialized = true;

  return { ...config };
}

/**
 * Restablece la configuración al estado original de `defaultConfig`.
 * Principalmente útil durante pruebas para garantizar aislamiento entre casos.
 *
 * @returns Copia de la configuración predeterminada.
 */
export function resetConfig(): TranslationConfig {
  config = { ...defaultConfig };
  isConfigInitialized = false;
  return { ...config };
}

/**
 * Inicializa la configuración fusionando los valores por defecto con las opciones
 * proporcionadas. Reemplaza cualquier estado previo, por lo que solo debe llamarse
 * una vez al arrancar la integración (`astro:config:setup`).
 *
 * @param options - Opciones del usuario que sobreescriben los valores por defecto.
 * @returns Copia de la configuración inicializada (sin normalizar).
 */
export function initConfig(
  options: Partial<I18nPluginOptions> = {},
): TranslationConfig {
  config = { ...defaultConfig, ...options };
  isConfigInitialized = true;
  return { ...config };
}

/**
 * Devuelve el array de idiomas soportados ya normalizado.
 * Conveniencia sobre `getConfig().supportedLangs`.
 */
export function getSupportedLanguages(): Language[] {
  return getConfig().supportedLangs || [];
}

/**
 * Devuelve el idioma por defecto configurado.
 *
 * @throws {Error} Si `defaultLang` no ha sido configurado, ya que es un campo
 *   requerido en tiempo de ejecución.
 */
export function getDefaultLanguage(): Language {
  const currentConfig = getConfig();

  if (!currentConfig.defaultLang) {
    throw new Error(
      "i18n plugin error: Default language is not defined. Please configure 'defaultLang' in your Astro integration options.",
    );
  }

  return currentConfig.defaultLang;
}

export { defaultConfig };
