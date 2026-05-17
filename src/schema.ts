/**
 * Schema Zod para la configuración de @gschz/astro-plugin-i18n.
 *
 * Permite usar `astro add @gschz/astro-plugin-i18n` y que el CLI de Astro
 * genere automáticamente la sección de configuración correcta en `astro.config.mjs`.
 *
 * También sirve para validar la config en tiempo de ejecución y producir
 * mensajes de error claros cuando los campos requeridos faltan o son inválidos.
 *
 * @module @gschz/astro-plugin-i18n/schema
 */

import { z } from 'astro/zod';
import type { I18nPluginOptions } from './types';

export const i18nRoutingOptionsSchema = z.object({
  strategy: z.enum(['manual', 'prefix', 'prefix-except-default']).optional().default('manual'),
  prefixDefaultLocale: z.boolean().optional().default(false),
  redirectToDefaultLocale: z.boolean().optional().default(false),
});

export const i18nNamespacesOptionsSchema = z.object({
  enabled: z.boolean().optional(),
  defaultNamespace: z.string().optional().default('common'),
  separator: z.string().optional().default(':'),
});

export const i18nPluralizationOptionsSchema = z.object({
  enabled: z.boolean().optional().default(true),
  field: z.string().optional().default('count'),
});

export const i18nLazyLoadingOptionsSchema = z.object({
  enabled: z.boolean().optional().default(false),
  strategy: z.enum(['language', 'namespace', 'hybrid']).optional().default('language'),
  preloadNamespaces: z.array(z.string()).optional(),
  publicPath: z.string().optional().default('/i18n'),
});

/**
 * Schema completo de opciones del plugin.
 *
 * `defaultLang` y `supportedLangs` son los únicos campos realmente requeridos
 * en tiempo de ejecución; el resto tiene valores por defecto razonables.
 */
export const i18nPluginOptionsSchema = z.object({
  /** Código del idioma por defecto (ej: `"es"`, `"en"`). Requerido. */
  defaultLang: z.string(),
  /** Lista de idiomas soportados (ej: `["es", "en", "pt"]`). Requerido. */
  supportedLangs: z.array(z.string()).min(1),
  /** Mapa de fallback por idioma (ej: `{ fr: "en", pt: "es" }`). */
  fallback: z.record(z.string(), z.string()).optional(),
  /** Configuración de routing multilingüe. */
  routing: i18nRoutingOptionsSchema.optional(),
  /** Directorio con los archivos JSON de traducción. Por defecto `"./src/i18n"`. */
  translationsDir: z.string().optional().default('./src/i18n'),
  /**
   * Si `true`, detecta el idioma del navegador en la primera visita
   * cuando no hay preferencia guardada. Por defecto `true`.
   */
  autoDetect: z.boolean().optional().default(true),
  /**
   * Si `true`, genera tipos TypeScript a partir de los JSON de traducción
   * durante `astro dev` y `astro build`. Por defecto `false`.
   */
  generateTypes: z.boolean().optional().default(false),
  /** Ruta del archivo `.d.ts` generado. Por defecto `"./src/types/i18n-types.d.ts"`. */
  typesOutputPath: z.string().optional().default('./src/types/i18n-types.d.ts'),
  /**
   * Estrategia para claves de traducción no encontradas.
   * - `"key"` (por defecto): devuelve la clave como texto.
   * - `"empty"`: devuelve cadena vacía.
   * - `"error"`: emite error en consola y devuelve `[MISSING: key]`.
   */
  missingKeyStrategy: z.enum(['key', 'empty', 'error']).optional().default('key'),
  /** Configuración de namespaces (múltiples archivos JSON por idioma). */
  namespaces: i18nNamespacesOptionsSchema.optional(),
  /** Configuración de pluralización basada en `Intl.PluralRules`. */
  pluralization: i18nPluralizationOptionsSchema.optional(),
  /** Configuración de lazy loading para bundles de traducción. */
  lazyLoading: i18nLazyLoadingOptionsSchema.optional(),
  /**
   * Si `true`, audita la cobertura de traducciones al finalizar el build
   * y emite warnings por idiomas con claves faltantes.
   * Por defecto `false`.
   */
  auditOnBuild: z.boolean().optional().default(false),
}) as unknown as z.ZodType<I18nPluginOptions>;

/** Tipo inferido del schema — equivalente a `I18nPluginOptions`. */
export type I18nPluginOptionsInput = z.input<typeof i18nPluginOptionsSchema>;
export type I18nPluginOptionsParsed = z.output<typeof i18nPluginOptionsSchema>;
