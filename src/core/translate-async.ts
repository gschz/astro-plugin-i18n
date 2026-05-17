/**
 * Traduccion asincrona para uso exclusivo en servidor.
 */

import type { TranslationKey, TranslationOptions } from '../types';
import { getConfig } from './config';
import { getCurrentLanguage } from './language';
import { applyVariables, resolvePluralKeyFromValues } from './translate-helpers';

/**
 * Traduce una clave de forma asincrona cargando el archivo JSON si es necesario.
 *
 * Solo debe usarse en contextos donde `async/await` es posible (paginas SSR,
 * scripts de servidor).
 */
export async function translateAsync(key: TranslationKey, options?: TranslationOptions): Promise<string> {
  const lang = options?.lang || getCurrentLanguage();
  const config = getConfig();
  const rawKey = String(key);
  const pluralKey = resolvePluralKeyFromValues(rawKey, lang, options?.values, config);

  // Importacion dinamica para evitar que Vite incluya modulos de Node.js
  // (fs, path) en bundles de cliente cuando se usa el entrypoint /client.
  const { getTranslation, getTranslationValue } = await import('./translations');
  let translation = pluralKey ? await getTranslationValue(pluralKey, lang) : null;

  translation ??= await getTranslation(rawKey, lang);

  if (options?.values) {
    translation = applyVariables(translation, options.values);
  }

  return translation;
}
