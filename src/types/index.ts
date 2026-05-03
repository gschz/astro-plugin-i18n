/**
 * Definición de tipos públicos para @gschz/astro-plugin-i18n.
 *
 * Este módulo concentra todos los contratos de tipo que el plugin expone
 * hacia el consumidor. Los tipos internos viven junto a sus módulos.
 *
 * Punto clave: el archivo generado por `generateTypes` puede aumentar estos
 * tipos públicamente mediante `module augmentation`, para que `TranslationKey`
 * y `Language` dejen de ser `string` genérico en el proyecto consumidor.
 */

/**
 * Registro de tipos augmentable por el archivo generado (`i18n-types.d.ts`).
 *
 * - Si no hay augmentation, `Language` y `TranslationKey` caen a `string`.
 * - Si el consumidor ejecuta `generateTypes`, este registro se completa con
 *   uniones literales reales y la API pública queda tipada automáticamente.
 */
export interface AstroI18nTypeRegistry {}

type RegistryLanguage = AstroI18nTypeRegistry extends { Language: infer L } ? L : string;

type RegistryTranslationKey = AstroI18nTypeRegistry extends {
  TranslationKey: infer K;
}
  ? K
  : string;

/**
 * Identificador de idioma (ej. `"en"`, `"es"`, `"pt-BR"`).
 *
 * Por defecto es `string`, pero puede convertirse en una unión de literales
 * cuando `generateTypes` genera augmentation del registro.
 */
export type Language = RegistryLanguage extends string ? RegistryLanguage : string;

/**
 * Clave de traducción, normalmente en notación de puntos (ej. `"home.title"`).
 *
 * Por defecto es `string`, pero puede convertirse en una unión de literales
 * derivada de los JSON cuando `generateTypes` está activo.
 */
export type TranslationKey = RegistryTranslationKey extends string ? RegistryTranslationKey : string;

/**
 * Valores de interpolación para reemplazar placeholders `{variable}` dentro
 * de una cadena de traducción.
 */
export interface TranslationValues {
  [key: string]: string | number | boolean;
}

/**
 * Opciones opcionales que se pueden pasar a las funciones de traducción.
 *
 * @example
 * t("greeting", { values: { name: "Ana" }, lang: "es" })
 */
export interface TranslationOptions {
  /** Variables de interpolación (reemplazan `{key}` en la cadena). */
  values?: TranslationValues;
  /** Fuerza un idioma específico en vez del idioma activo. */
  lang?: Language;
}

/** Estrategias de enrutado multilingüe soportadas por el plugin. */
export type I18nRoutingStrategy = 'manual' | 'prefix' | 'prefix-except-default';

/**
 * Configuración opcional del routing i18n.
 *
 * - `manual`: no aplica redirects automáticos.
 * - `prefix`: exige prefijo de idioma para todas las rutas (`/es/...`, `/en/...`).
 * - `prefix-except-default`: el idioma por defecto no lleva prefijo.
 */
export interface I18nRoutingOptions {
  strategy?: I18nRoutingStrategy;
  prefixDefaultLocale?: boolean;
  redirectToDefaultLocale?: boolean;
}

/**
 * Configuración completa del plugin.
 * Todos los campos son opcionales para mayor ergonomía, pero `defaultLang`
 * y `supportedLangs` son requeridos en tiempo de ejecución al usar la integración.
 */
export interface TranslationConfig {
  /** Idioma que se usa cuando no hay preferencia del usuario ni detección automática. */
  defaultLang?: Language;
  /** Lista de idiomas que la aplicación soporta activamente. */
  supportedLangs?: Language[];
  /** Cadena de fallback por idioma, ej: { fr: 'en', pt: 'es' }. */
  fallback?: Record<string, Language>;
  /** Configuración de routing multilingüe. Por defecto usa estrategia `manual`. */
  routing?: I18nRoutingOptions;
  /** Ruta al directorio que contiene los archivos JSON de traducción. Por defecto `"./src/i18n"`. */
  translationsDir?: string;
  /**
   * Si es `true`, detecta el idioma del navegador (`navigator.language`) en la
   * primera visita cuando no hay ninguna preferencia guardada en `localStorage`.
   * Por defecto `true`.
   */
  autoDetect?: boolean;
  /**
   * Si es `true`, genera tipos TypeScript a partir de los JSON de traducción
   * durante `astro dev` y `astro build`.
   * Por defecto `false`.
   */
  generateTypes?: boolean;
  /**
   * Ruta del archivo `.d.ts` generado con los tipos de traducción.
   * Por defecto `"./src/types/i18n-types.d.ts"`.
   */
  typesOutputPath?: string;
  /**
   * Estrategia cuando una clave no existe en el idioma activo:
   * - `"key"` (por defecto): devuelve la propia clave como texto.
   * - `"empty"`: devuelve cadena vacía.
   * - `"error"`: imprime error en consola y devuelve `[MISSING: key]`.
   */
  missingKeyStrategy?: 'key' | 'empty' | 'error';
}

/** Alias de {@link TranslationConfig} expuesto como nombre de opción pública. */
export type I18nPluginOptions = TranslationConfig;

declare global {
  /**
   * Opciones del plugin almacenadas en el objeto `global` de Node.js para
   * compartir configuración entre la integración y el middleware sin necesidad
   * de un mecanismo de IPC.
   * Solo se escribe en contextos de servidor (Astro SSR/dev).
   */
  var __ASTRO_I18N_OPTIONS__: Partial<I18nPluginOptions> | undefined;
}
