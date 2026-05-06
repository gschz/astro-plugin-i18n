/**
 * Carga y caché de archivos de traducción en el servidor.
 *
 * Este módulo usa APIs de Node.js (`fs`, `path`) y **no debe importarse
 * directamente desde código de cliente**. Las funciones que necesitan
 * traducciones en el navegador deben usar el entrypoint `@gschz/astro-plugin-i18n/client`
 * junto con {@link populateClientCache} desde `./translate`.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { Language } from '../types';
import { getConfig } from './config';

/**
 * Caché en memoria para traducciones ya cargadas desde disco.
 * La clave es el código de idioma; el valor es el objeto JSON parseado.
 * En modo namespaces, el valor es un bundle `{ [namespace]: translations }`.
 * Se invalida explícitamente con {@link clearTranslationsCache}.
 */
const translationsCache: Record<Language, Record<string, any>> = {};

/**
 * Devuelve todas las traducciones para el idioma indicado.
 * Las lecturas posteriores al primer acceso se sirven desde la caché en memoria.
 *
 * Este es el nombre semántico preferido para llamadas desde layouts/páginas Astro
 * (ej. `getTranslationsForLanguage("es")`); internamente delega en {@link loadTranslations}.
 *
 * @param lang - Código de idioma (ej. `"en"`, `"es"`).
 * @returns Objeto JSON con todas las cadenas del idioma, o `{}` si no se encuentra el archivo.
 */
export async function getTranslationsForLanguage(lang: Language): Promise<Record<string, any>> {
  return loadTranslations(lang);
}

/**
 * Carga las traducciones del idioma indicado, usando la caché si ya fueron leídas.
 *
 * - En modo legacy, lee el archivo `<lang>.json` dentro de `translationsDir`.
 * - En modo namespaces, primero busca `translationsDir/<lang>/*.json` y, si no existe,
 *   cae de vuelta al archivo `<lang>.json` para mantener compatibilidad.
 *
 * @param lang - Código de idioma (ej. `"en"`, `"es"`).
 * @returns Objeto JSON con las cadenas del idioma, o `{}` ante cualquier error.
 */
export async function loadTranslations(lang: Language): Promise<Record<string, any>> {
  // Cache hit: evitamos releer el disco en cada petición SSR.
  if (translationsCache[lang]) {
    return translationsCache[lang];
  }

  try {
    const config = getConfig();
    const translationsDir = path.resolve(process.cwd(), config.translationsDir as string);
    const useNamespaces = config.namespaces?.enabled === true;

    let translations: Record<string, any> | null = null;

    if (useNamespaces) {
      translations = await loadNamespacedTranslations(translationsDir, lang);
    }

    translations ??= await loadLegacyTranslationFile(translationsDir, lang);

    const resolvedTranslations = translations ?? {};

    // Guardamos en caché antes de retornar para que llamadas subsiguientes
    // en la misma instancia de servidor no accedan al disco de nuevo.
    translationsCache[lang] = resolvedTranslations;

    return resolvedTranslations;
  } catch (error) {
    console.error(`[i18n] Error al cargar traducciones para "${lang}":`, error);
    return {};
  }
}

/**
 * Obtiene una única cadena de traducción resolviendo una clave en notación de puntos,
 * o con namespace (`common:home.title`) cuando esa funcionalidad está activa.
 *
 * @param key - Clave de traducción en notación de puntos (ej. `"home.title"`).
 * @param lang - Idioma en que se busca la cadena.
 * @returns La cadena traducida, o el resultado de la estrategia de clave faltante.
 */
export async function getTranslation(key: string, lang: Language): Promise<string> {
  const config = getConfig();
  const normalizedKey = normalizeTranslationKey(key, config);
  const translations = await loadTranslations(lang);
  const result = resolveTranslationValue(translations, normalizedKey, config);

  if (typeof result === 'string') {
    return result;
  }

  // La clave existe pero apunta a un objeto, no a una cadena hoja.
  return handleMissingTranslation(normalizedKey, lang, new Set([lang]), key);
}

/**
 * Obtiene una traducción sin aplicar estrategia de clave faltante.
 *
 * Se usa principalmente para intentar variantes (ej. plural) y, si no se encuentra
 * una cadena, delegar en otra clave sin contaminar el resultado con fallbacks.
 *
 * @param key - Clave de traducción a resolver.
 * @param lang - Idioma en que se busca la cadena.
 * @returns La cadena traducida, o `null` si no existe.
 */
export async function getTranslationValue(key: string, lang: Language): Promise<string | null> {
  const config = getConfig();
  const normalizedKey = normalizeTranslationKey(key, config);
  const translations = await loadTranslations(lang);
  const result = resolveTranslationValue(translations, normalizedKey, config);

  return typeof result === 'string' ? result : null;
}

/**
 * Maneja el caso de una clave de traducción no encontrada según la estrategia configurada.
 *
 * @param key - Clave ya normalizada que no se encontró.
 * @param lang - Idioma en que se buscó.
 * @param displayKey - Clave original para mostrar en UI/errores.
 * @returns Valor de sustitución según `missingKeyStrategy`.
 */
async function handleMissingTranslation(
  key: string,
  lang: Language,
  visited: Set<Language>,
  displayKey: string = key,
): Promise<string> {
  const config = getConfig();

  const fallbackLang = config.fallback?.[lang];

  if (fallbackLang && !visited.has(fallbackLang)) {
    const fallbackTranslations = await loadTranslations(fallbackLang);
    const fallbackResult = resolveTranslationValue(fallbackTranslations, key, config);

    if (typeof fallbackResult === 'string') {
      return fallbackResult;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(fallbackLang);
    return handleMissingTranslation(key, fallbackLang, nextVisited, displayKey);
  }

  switch (config.missingKeyStrategy) {
    case 'empty':
      return '';
    case 'error':
      console.error(`[i18n] Clave de traducción faltante: "${displayKey}" en idioma "${lang}"`);
      return `[MISSING: ${displayKey}]`;
    case 'key':
    default:
      // Estrategia más segura para UI: mostrar la clave en vez de romper el render.
      return displayKey;
  }
}

/**
 * Invalida la caché de traducciones en memoria.
 * Útil en desarrollo cuando los archivos JSON se modifican en caliente,
 * o en pruebas que necesitan estado limpio entre casos.
 */
export function clearTranslationsCache(): void {
  Object.keys(translationsCache).forEach((key) => {
    delete translationsCache[key];
  });
}

/**
 * Normaliza una clave aplicando el namespace por defecto cuando corresponde.
 *
 * @param key - Clave de traduccion original.
 * @param config - Configuracion i18n normalizada.
 * @returns Clave lista para resolucion.
 */
function normalizeTranslationKey(key: string, config: ReturnType<typeof getConfig>): string {
  const namespaceConfig = config.namespaces;

  if (!namespaceConfig?.enabled) {
    return key;
  }

  const separator = namespaceConfig.separator ?? ':';

  if (key.includes(separator)) {
    return key;
  }

  const defaultNamespace = namespaceConfig.defaultNamespace ?? 'common';
  return `${defaultNamespace}${separator}${key}`;
}

/**
 * Resuelve una clave (posiblemente namespaced) dentro del bundle cargado.
 *
 * @param translations - Bundle de traducciones del idioma.
 * @param key - Clave ya normalizada.
 * @param config - Configuracion i18n normalizada.
 * @returns Valor resuelto o `undefined`.
 */
function resolveTranslationValue(
  translations: Record<string, any>,
  key: string,
  config: ReturnType<typeof getConfig>,
): unknown {
  const namespaceConfig = config.namespaces;

  if (!namespaceConfig?.enabled) {
    return resolveNestedKey(translations, key);
  }

  const separator = namespaceConfig.separator ?? ':';
  const defaultNamespace = namespaceConfig.defaultNamespace ?? 'common';
  const { namespace, key: namespacedKey } = splitNamespacedKey(key, separator, defaultNamespace);

  if (isNamespacedBundle(translations)) {
    const namespaceTranslations = translations[namespace];

    if (!namespaceTranslations || typeof namespaceTranslations !== 'object') {
      return undefined;
    }

    return resolveNestedKey(namespaceTranslations as Record<string, any>, namespacedKey);
  }

  // Bundle legacy: ignora el namespace y usa la clave plana.
  return resolveNestedKey(translations, namespacedKey);
}

/**
 * Separa una clave en namespace y subclave.
 *
 * @param key - Clave completa.
 * @param separator - Separador entre namespace y clave.
 * @param defaultNamespace - Namespace por defecto.
 * @returns Namespace y clave sin prefijo.
 */
function splitNamespacedKey(key: string, separator: string, defaultNamespace: string) {
  if (key.includes(separator)) {
    const [namespace, ...rest] = key.split(separator);
    return { namespace, key: rest.join(separator) };
  }

  return { namespace: defaultNamespace, key };
}

/**
 * Detecta si el bundle tiene namespaces en el primer nivel.
 *
 * @param translations - Bundle de traducciones.
 * @returns `true` si el bundle parece namespaced.
 */
function isNamespacedBundle(translations: Record<string, any>): boolean {
  const values = Object.values(translations || {});
  return values.length > 0 && values.every((value) => typeof value === 'object' && value !== null);
}

/**
 * Carga traducciones por namespace desde `translationsDir/<lang>`.
 *
 * @param translationsDir - Directorio base de traducciones.
 * @param lang - Idioma a cargar.
 * @returns Bundle por namespace, `null` si no existe el directorio.
 */
async function loadNamespacedTranslations(
  translationsDir: string,
  lang: Language,
): Promise<Record<string, any> | null> {
  const langDir = path.join(translationsDir, lang);

  let entries: Array<import('node:fs').Dirent>;

  try {
    entries = await fsPromises.readdir(langDir, { withFileTypes: true });
  } catch (error: unknown) {
    const errorCode = getErrorCode(error);

    if (errorCode === 'ENOENT' || errorCode === 'ENOTDIR') {
      return null;
    }

    console.error(`[i18n] Error al leer el directorio de namespaces para "${lang}":`, error);
    return {};
  }

  const namespaceFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

  if (namespaceFiles.length === 0) {
    console.warn(`[i18n] No se encontraron namespaces JSON para el idioma "${lang}" en: ${langDir}`);
    return null;
  }

  const namespaceBundle: Record<string, any> = {};

  for (const entry of namespaceFiles) {
    const namespace = path.basename(entry.name, '.json');
    const filePath = path.join(langDir, entry.name);
    const namespaceTranslations = await readJsonFile(filePath, lang, `namespace "${namespace}"`, false);

    if (namespaceTranslations) {
      namespaceBundle[namespace] = namespaceTranslations;
    }
  }

  return namespaceBundle;
}

/**
 * Carga el archivo legacy `<lang>.json`.
 *
 * @param translationsDir - Directorio base de traducciones.
 * @param lang - Idioma a cargar.
 * @returns Objeto de traducciones legacy.
 */
async function loadLegacyTranslationFile(translationsDir: string, lang: Language): Promise<Record<string, any>> {
  const filePath = path.join(translationsDir, `${lang}.json`);
  const translations = await readJsonFile(filePath, lang, 'archivo de traducciones', true);

  return translations ?? {};
}

/**
 * Lee y parsea un archivo JSON con manejo de errores controlado.
 *
 * @param filePath - Ruta absoluta del archivo.
 * @param lang - Idioma asociado.
 * @param label - Etiqueta para logs.
 * @param warnOnMissing - Si `true`, loguea warning cuando no existe.
 * @returns JSON parseado o `null` si no existe.
 */
async function readJsonFile(
  filePath: string,
  lang: Language,
  label: string,
  warnOnMissing: boolean,
): Promise<Record<string, any> | null> {
  try {
    const fileContent = await fsPromises.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as Record<string, any>;
  } catch (error: unknown) {
    const errorCode = getErrorCode(error);

    if (errorCode === 'ENOENT') {
      if (warnOnMissing) {
        console.warn(`[i18n] No se encontró ${label} para el idioma "${lang}" en: ${filePath}`);
      }

      return null;
    }

    console.error(`[i18n] Error al cargar ${label} para "${lang}":`, error);
    return null;
  }
}

/**
 * Extrae el codigo de error de un error Node.js.
 *
 * @param error - Error capturado.
 * @returns Codigo de error o `undefined`.
 */
function getErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: string }).code;
  }

  return undefined;
}

/**
 * Resuelve una clave en notacion de puntos sobre un objeto anidado.
 *
 * @param source - Objeto de traducciones.
 * @param key - Clave en notacion de puntos.
 * @returns Valor resuelto o `undefined`.
 */
function resolveNestedKey(source: Record<string, any>, key: string): unknown {
  const keys = key.split('.');

  let result: any = source;
  for (const part of keys) {
    if (!result || typeof result !== 'object') {
      return undefined;
    }

    result = result[part];
  }

  return result;
}
