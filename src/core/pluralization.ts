/**
 * Helpers de pluralizacion para resolver claves con Intl.PluralRules.
 */

import type { Language } from '../types';

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Determina la categoria plural segun las reglas CLDR del lenguaje.
 *
 * @param count - Valor numerico a evaluar.
 * @param lang - Codigo de idioma (ej. "es", "en").
 * @returns Categoria plural calculada por Intl.PluralRules.
 */
export function getPluralCategory(count: number, lang: Language): PluralCategory {
  try {
    const rules = new Intl.PluralRules(lang);
    return rules.select(count) as PluralCategory;
  } catch {
    return 'other';
  }
}

/**
 * Devuelve la clave plural para un contador.
 *
 * Si `count` es 0, prioriza la categoria `zero` para permitir mensajes
 * explicitos cuando existan en los JSON. En otros casos usa Intl.PluralRules.
 *
 * @param baseKey - Clave base sin sufijo plural (ej. "items.count").
 * @param count - Valor numerico a evaluar.
 * @param lang - Codigo de idioma.
 * @returns Clave plural con sufijo (ej. "items.count_one").
 */
export function resolvePluralKey(baseKey: string, count: number, lang: Language): string {
  if (count === 0) {
    return `${baseKey}_zero`;
  }

  const category = getPluralCategory(count, lang);
  return `${baseKey}_${category}`;
}
