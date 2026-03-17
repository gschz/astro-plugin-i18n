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
 * Resuelve la ruta al directorio `translationsDir` configurado y lee el archivo
 * `<lang>.json` correspondiente.
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
    const filePath = path.join(translationsDir, `${lang}.json`);

    let fileContent: string;

    try {
      fileContent = await fsPromises.readFile(filePath, 'utf-8');
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'ENOENT'
      ) {
        console.warn(`[i18n] No se encontró archivo de traducciones para el idioma "${lang}" en: ${filePath}`);
        return {};
      }

      throw error;
    }

    const translations = JSON.parse(fileContent) as Record<string, any>;

    // Guardamos en caché antes de retornar para que llamadas subsiguientes
    // en la misma instancia de servidor no accedan al disco de nuevo.
    translationsCache[lang] = translations;

    return translations;
  } catch (error) {
    console.error(`[i18n] Error al cargar traducciones para "${lang}":`, error);
    return {};
  }
}

/**
 * Obtiene una única cadena de traducción resolviendo una clave en notación de puntos.
 *
 * @param key - Clave de traducción en notación de puntos (ej. `"home.title"`).
 * @param lang - Idioma en que se busca la cadena.
 * @returns La cadena traducida, o el resultado de la estrategia de clave faltante.
 */
export async function getTranslation(key: string, lang: Language): Promise<string> {
  const translations = await loadTranslations(lang);
  const keys = key.split('.');

  // Traversal iterativo del objeto anidado usando cada segmento de la clave.
  let result: any = translations;
  for (const part of keys) {
    if (!result || typeof result !== 'object') {
      return handleMissingTranslation(key, lang);
    }
    result = result[part];
  }

  if (typeof result === 'string') {
    return result;
  }

  // La clave existe pero apunta a un objeto, no a una cadena hoja.
  return handleMissingTranslation(key, lang);
}

/**
 * Maneja el caso de una clave de traducción no encontrada según la estrategia configurada.
 *
 * @param key - Clave que no se encontró.
 * @param lang - Idioma en que se buscó.
 * @returns Valor de sustitución según `missingKeyStrategy`.
 */
async function handleMissingTranslation(key: string, lang: Language): Promise<string> {
  const config = getConfig();

  switch (config.missingKeyStrategy) {
    case 'empty':
      return '';
    case 'error':
      console.error(`[i18n] Clave de traducción faltante: "${key}" en idioma "${lang}"`);
      return `[MISSING: ${key}]`;
    case 'key':
    default:
      // Estrategia más segura para UI: mostrar la clave en vez de romper el render.
      return key;
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
