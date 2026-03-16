/**
 * Funciones de traducción síncronas y asíncronas para @gschz/astro-plugin-i18n.
 *
 * Este módulo es seguro para el navegador. Sus funciones operan sobre una caché
 * plana en memoria (`clientTranslationsCache`) que se hidrata en el cliente
 * con {@link populateClientCache} antes de que los componentes rendericen.
 */

import { useEffect, useState } from 'react';
import type { Language, TranslationKey, TranslationOptions } from '../types';
import { getConfig } from './config';
import { changeLanguage, getCurrentLanguage, setupLanguageObserver } from './language';

type RuntimeGlobal = typeof globalThis & {
  __ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__?: Record<string, string>;
};

/**
 * Caché plana para traducciones en el navegador.
 * Las claves tienen el formato `"<lang>:<dotted.key>"` para aislar idiomas
 * y permitir lookups O(1) sin traversal de objetos anidados.
 *
 * @example
 * `{ "es:home.title": "Inicio", "en:home.title": "Home" }`
 */
const runtimeGlobal = globalThis as RuntimeGlobal;
const clientTranslationsCache: Record<string, string> =
  runtimeGlobal.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__ ??
  (runtimeGlobal.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__ = {});

/**
 * Rellena la caché del cliente con las traducciones de un idioma concreto.
 *
 * Aplana el objeto JSON de traducciones anidado en un mapa plano de claves
 * en notación de puntos, usando el prefijo `"<lang>:"` para cada entrada.
 * Debe llamarse antes de invocar {@link t} para que las traducciones estén disponibles.
 *
 * @param lang - Código del idioma al que pertenecen las traducciones.
 * @param translations - Objeto JSON con traducciones (puede estar anidado).
 *
 * @example
 * ```ts
 * populateClientCache("es", { home: { title: "Inicio" } });
 * // → clientTranslationsCache["es:home.title"] = "Inicio"
 * ```
 */
export function populateClientCache(lang: Language, translations: Record<string, any>) {
  /**
   * Recurre sobre el objeto anidado y produce un mapa plano de claves en
   * notación de puntos. El prefijo acumula la ruta de niveles anteriores.
   */
  const flattenTranslations = (obj: Record<string, any>, prefix = ''): Record<string, string> => {
    return Object.keys(obj).reduce(
      (acc, key) => {
        const currentPrefix = prefix.length ? `${prefix}.` : '';

        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Nodo intermedio: seguimos bajando recursivamente.
          Object.assign(acc, flattenTranslations(obj[key], `${currentPrefix}${key}`));
        } else {
          // Nodo hoja: guardamos la cadena con la clave completa.
          acc[`${currentPrefix}${key}`] = String(obj[key]);
        }

        return acc;
      },
      {} as Record<string, string>,
    );
  };

  const flatTranslations = flattenTranslations(translations);

  // Escribimos en la caché global usando el formato "lang:key".
  for (const key in flatTranslations) {
    clientTranslationsCache[`${lang}:${key}`] = flatTranslations[key];
  }
}

/**
 * Traduce una clave de forma asíncrona cargando el archivo JSON si es necesario.
 *
 * Solo debe usarse en contextos donde `async/await` es posible (páginas SSR,
 * scripts de servidor). En el navegador, prefiere la función síncrona {@link t}
 * junto con {@link bootstrapClientI18n} para una experiencia sin parpadeo.
 *
 * @param key - Clave de traducción en notación de puntos.
 * @param options - Opciones de interpolación e idioma.
 * @returns Cadena traducida con variables reemplazadas.
 */
export async function translateAsync(key: TranslationKey, options?: TranslationOptions): Promise<string> {
  const lang = options?.lang || getCurrentLanguage();

  // Importación dinámica para evitar que Vite incluya módulos de Node.js
  // (fs, path) en el bundle del cliente cuando se usa el entrypoint /client.
  const { getTranslation } = await import('./translations');
  let translation = await getTranslation(key, lang);

  if (options?.values) {
    translation = applyVariables(translation, options.values);
  }

  return translation;
}

/**
 * Traduce una clave de forma **síncrona** desde la caché del cliente.
 *
 * Esta es la función principal para componentes en el navegador. Requiere que
 * la caché esté hidratada previamente con {@link populateClientCache} (lo que
 * hace `bootstrapClientI18n` automáticamente).
 *
 * Si la clave no está en la caché, aplica la estrategia `missingKeyStrategy`:
 * - `"key"` (por defecto): devuelve la clave como texto.
 * - `"empty"`: devuelve cadena vacía.
 * - `"error"`: imprime en consola y devuelve `[MISSING: key]`.
 *
 * @param key - Clave de traducción en notación de puntos.
 * @param options - Opciones de interpolación e idioma.
 * @returns Cadena traducida o valor de sustitución.
 */
export function t(key: TranslationKey, options?: TranslationOptions): string {
  const lang = options?.lang || getCurrentLanguage();
  const cacheKey = `${lang}:${key}`;
  const config = getConfig();

  if (clientTranslationsCache[cacheKey] !== undefined) {
    const translation = clientTranslationsCache[cacheKey];
    return options?.values ? applyVariables(translation, options.values) : translation;
  }

  switch (config.missingKeyStrategy) {
    case 'empty':
      return '';
    case 'error':
      console.error(`[i18n] Clave de traducción faltante (cliente): "${key}" en idioma "${lang}"`);
      return `[MISSING: ${key}]`;
    case 'key':
    default: {
      // Devolvemos la clave para que sea visible en UI sin romper el render.
      const keyString = String(key);
      return options?.values ? applyVariables(keyString, options.values) : keyString;
    }
  }
}

/**
 * Reemplaza los placeholders `{variable}` en una cadena con los valores del mapa dado.
 *
 * @param text - Cadena con placeholders en formato `{clave}`.
 * @param values - Mapa de clave→valor para la sustitución.
 * @returns Cadena con todos los placeholders reemplazados.
 */
function applyVariables(text: string, values: Record<string, string | number | boolean>): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  }, text);
}

/**
 * Hook de React que expone las funciones de traducción y reacciona automáticamente
 * a los cambios de idioma.
 *
 * Se suscribe al evento `languagechange` mediante {@link setupLanguageObserver}
 * y actualiza el estado interno cuando el idioma cambia, provocando un re-render
 * de los componentes que lo usen.
 *
 * @returns Objeto con `language`, `changeLanguage` y `t` vinculada al idioma activo.
 *
 * @example
 * ```tsx
 * function Header() {
 *   const { t, language, changeLanguage } = useTranslation();
 *   return <h1>{t("home.title")}</h1>;
 * }
 * ```
 */
export function useTranslation() {
  const [language, setLanguage] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = setupLanguageObserver((newLang) => {
      setLanguage(newLang);
    });

    // Limpiamos el listener al desmontar el componente para evitar fugas de memoria.
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    language,
    changeLanguage,
    /** Versión de `t` pre-vinculada al idioma activo del hook. */
    t: (key: TranslationKey, options?: Omit<TranslationOptions, 'lang'>) => t(key, { ...options, lang: language }),
  };
}
