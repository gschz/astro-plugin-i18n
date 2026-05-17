/**
 * Helpers compartidos entre traduccion sincrona y asincrona.
 */

import type { Language, TranslationValues } from '../types';
import type { getConfig } from './config';
import { resolvePluralKey } from './pluralization';

type NormalizedConfig = ReturnType<typeof getConfig>;

/**
 * Resuelve la clave plural basada en `values` y configuracion de pluralizacion.
 */
export function resolvePluralKeyFromValues(
  baseKey: string,
  lang: Language,
  values: TranslationValues | undefined,
  config: NormalizedConfig,
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
 */
export function applyVariables(text: string, values: Record<string, string | number | boolean>): string {
  return Object.entries(values).reduce((result, [key, value]) => {
    const escapedKey = escapeRegExp(key);
    return result.replaceAll(new RegExp(`{${escapedKey}}`, 'g'), String(value));
  }, text);
}

function escapeRegExp(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
