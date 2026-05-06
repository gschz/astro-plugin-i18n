/**
 * Funciones de traducción síncronas y asíncronas para @gschz/astro-plugin-i18n.
 *
 * Este módulo es seguro para el navegador. Sus funciones operan sobre una caché
 * plana en memoria (`clientTranslationsCache`) que se hidrata en el cliente
 * con {@link populateClientCache} antes de que los componentes rendericen.
 */

import { useEffect, useState } from 'react';
import type { Language, TranslationKey, TranslationOptions, TranslationValues } from '../types';
import { getConfig } from './config';
import { changeLanguage, getCurrentLanguage, setupLanguageObserver } from './language';
import { resolvePluralKey } from './pluralization';

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

  const config = getConfig();
  const namespaceConfig = config.namespaces;
  const separator = namespaceConfig?.separator ?? ':';
  const useNamespaces = namespaceConfig?.enabled === true;

  if (useNamespaces) {
    const entries = Object.entries(translations || {});
    const looksNamespaced =
      entries.length > 0 && entries.every(([, value]) => typeof value === 'object' && value !== null);

    if (looksNamespaced) {
      for (const [namespace, namespaceTranslations] of entries) {
        const flatTranslations = flattenTranslations(namespaceTranslations as Record<string, any>);

        for (const key in flatTranslations) {
          clientTranslationsCache[`${lang}:${namespace}${separator}${key}`] = flatTranslations[key];
        }
      }

      return;
    }
  }

  const flatTranslations = flattenTranslations(translations || {});

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
  const config = getConfig();
  const rawKey = String(key);
  const pluralKey = resolvePluralKeyFromValues(rawKey, lang, options?.values, config);

  // Importación dinámica para evitar que Vite incluya módulos de Node.js
  // (fs, path) en el bundle del cliente cuando se usa el entrypoint /client.
  const { getTranslation, getTranslationValue } = await import('./translations');
  let translation = pluralKey ? await getTranslationValue(pluralKey, lang) : null;

  translation ??= await getTranslation(rawKey, lang);

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
  const config = getConfig();
  const lang = options?.lang || getCurrentLanguage();
  const rawKey = String(key);
  const normalizedKey = normalizeTranslationKey(rawKey, config);
  const pluralKey = resolvePluralKeyFromValues(normalizedKey, lang, options?.values, config);

  const resolved = resolveTranslation(normalizedKey, pluralKey, lang, config);

  if (resolved !== null) {
    return applyIfValues(resolved, options?.values);
  }

  return applyMissingKeyStrategy(rawKey, key, lang, options?.values, config.missingKeyStrategy);
}

/**
 * Busca la traduccion en la cache y en idiomas de fallback, en orden de prioridad:
 * plural cache → base cache → fallback plural → fallback base.
 *
 * @returns La cadena traducida, o `null` si no se encontró ninguna.
 */
function resolveTranslation(
  normalizedKey: string,
  pluralKey: string | null,
  lang: Language,
  config: ReturnType<typeof getConfig>,
): string | null {
  if (pluralKey) {
    const fromPluralCache = clientTranslationsCache[`${lang}:${pluralKey}`];
    if (fromPluralCache !== undefined) return fromPluralCache;
  }

  const fromBaseCache = clientTranslationsCache[`${lang}:${normalizedKey}`];
  if (fromBaseCache !== undefined) return fromBaseCache;

  const visited = new Set([lang]);

  if (pluralKey) {
    const fromPluralFallback = resolveFallbackTranslation(pluralKey, lang, config.fallback, visited);
    if (fromPluralFallback !== null) return fromPluralFallback;
  }

  return resolveFallbackTranslation(normalizedKey, lang, config.fallback, visited);
}

/**
 * Aplica `applyVariables` solo si `values` está definido.
 */
function applyIfValues(text: string, values: TranslationValues | undefined): string {
  return values ? applyVariables(text, values) : text;
}

/**
 * Aplica la estrategia configurada para claves no encontradas.
 */
function applyMissingKeyStrategy(
  rawKey: string,
  originalKey: TranslationKey,
  lang: Language,
  values: TranslationValues | undefined,
  strategy: ReturnType<typeof getConfig>['missingKeyStrategy'],
): string {
  if (strategy === 'empty') return '';

  if (strategy === 'error') {
    console.error(`[i18n] Clave de traducción faltante (cliente): "${originalKey}" en idioma "${lang}"`);
    return `[MISSING: ${originalKey}]`;
  }

  // strategy === 'key' (default): visible en UI sin romper el render.
  return applyIfValues(rawKey, values);
}

/**
 * Normaliza una clave aplicando el namespace por defecto cuando corresponde.
 *
 * @param rawKey - Clave original.
 * @param config - Configuracion i18n normalizada.
 * @returns Clave lista para busqueda en cache.
 */
function normalizeTranslationKey(rawKey: string, config: ReturnType<typeof getConfig>): string {
  const namespaceConfig = config.namespaces;

  if (!namespaceConfig?.enabled) {
    return rawKey;
  }

  const separator = namespaceConfig.separator ?? ':';

  if (rawKey.includes(separator)) {
    return rawKey;
  }

  const defaultNamespace = namespaceConfig.defaultNamespace ?? 'common';
  return `${defaultNamespace}${separator}${rawKey}`;
}

/**
 * Resuelve la clave plural basada en `values` y configuracion de pluralizacion.
 *
 * @param baseKey - Clave normalizada.
 * @param lang - Idioma activo.
 * @param values - Valores de interpolacion.
 * @param config - Configuracion i18n normalizada.
 * @returns Clave plural o `null` si no aplica.
 */
function resolvePluralKeyFromValues(
  baseKey: string,
  lang: Language,
  values: TranslationValues | undefined,
  config: ReturnType<typeof getConfig>,
): string | null {
  if (!values) {
    return null;
  }

  const pluralConfig = config.pluralization;

  if (pluralConfig?.enabled === false) {
    return null;
  }

  const field = pluralConfig?.field ?? 'count';
  const rawCount = values[field];

  if (rawCount === undefined || rawCount === null) {
    return null;
  }

  const count = typeof rawCount === 'number' ? rawCount : Number(rawCount);

  if (!Number.isFinite(count)) {
    return null;
  }

  return resolvePluralKey(baseKey, count, lang);
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
    const escapedKey = escapeRegExp(key);
    return result.replaceAll(new RegExp(`{${escapedKey}}`, 'g'), String(value));
  }, text);
}

function escapeRegExp(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
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
export function useTranslation(): {
  language: Language;
  changeLanguage: typeof changeLanguage;
  /** Versión de `t` pre-vinculada al idioma activo del hook. */
  t: (key: TranslationKey, options?: Omit<TranslationOptions, 'lang'>) => string;
} {
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

function resolveFallbackTranslation(
  key: string,
  lang: Language,
  fallbackMap: Record<string, Language> | undefined,
  visited: Set<Language>,
): string | null {
  if (!fallbackMap) {
    return null;
  }

  const fallbackLang = fallbackMap[lang];

  if (!fallbackLang || visited.has(fallbackLang)) {
    return null;
  }

  const fallbackCacheKey = `${fallbackLang}:${key}`;

  if (clientTranslationsCache[fallbackCacheKey] !== undefined) {
    return clientTranslationsCache[fallbackCacheKey];
  }

  const nextVisited = new Set(visited);
  nextVisited.add(fallbackLang);
  return resolveFallbackTranslation(key, fallbackLang, fallbackMap, nextVisited);
}
