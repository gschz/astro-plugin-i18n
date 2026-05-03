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
 * Valores predeterminados para todos los campos de configuración.
 * Se usan como base tanto al inicializar como al resetear el estado.
 */
const defaultConfig: TranslationConfig = {
  defaultLang: undefined,
  supportedLangs: [],
  routing: {
    strategy: 'manual',
    prefixDefaultLocale: false,
    redirectToDefaultLocale: false,
  },
  translationsDir: './src/i18n',
  autoDetect: true,
  generateTypes: false,
  typesOutputPath: './src/types/i18n-types.d.ts',
  missingKeyStrategy: 'key',
};

/** Estado mutable del singleton. Se empieza con los valores por defecto. */
let config: TranslationConfig = { ...defaultConfig };

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
  const currentConfig = config;

  // Si supportedLangs no fue configurado, el fallback mínimo es inglés para
  // evitar comparaciones contra arrays vacíos en setupLanguage y en el middleware.
  const normalizedSupportedLangs =
    currentConfig.supportedLangs && currentConfig.supportedLangs.length > 0 ? currentConfig.supportedLangs : ['en'];

  const normalizedRouting = normalizeRoutingOptions(currentConfig.routing);

  return {
    ...currentConfig,
    defaultLang: currentConfig.defaultLang ?? 'en',
    supportedLangs: normalizedSupportedLangs,
    routing: normalizedRouting,
    translationsDir: currentConfig.translationsDir ?? './src/i18n',
    autoDetect: currentConfig.autoDetect ?? true,
    generateTypes: currentConfig.generateTypes ?? false,
    typesOutputPath: currentConfig.typesOutputPath ?? './src/types/i18n-types.d.ts',
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
export function updateConfig(options: Partial<I18nPluginOptions> = {}): TranslationConfig {
  config = {
    ...config,
    ...options,
  };

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
export function initConfig(options: Partial<I18nPluginOptions> = {}): TranslationConfig {
  config = { ...defaultConfig, ...options };
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
