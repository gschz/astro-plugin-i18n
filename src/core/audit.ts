/**
 * Auditoría de cobertura de traducciones para @gschz/astro-plugin-i18n.
 *
 * Compara los JSON de todos los idiomas soportados y reporta las claves
 * presentes en el idioma por defecto que faltan en los demás idiomas.
 *
 * Solo para uso en servidor (Node.js) — usa `fs` y `path` internamente.
 */

import type { I18nPluginOptions, Language } from '../types';
import { loadTranslations } from './translations';
import { getConfig } from './config';
import { resolveSupportedLanguages, resolveDefaultLanguage } from './routing';

export interface TranslationCoverageResult {
  /** Idioma por defecto analizado como base. */
  defaultLang: Language;
  /** Lista de todos los idiomas auditados. */
  languages: Language[];
  /** Total de claves en el idioma por defecto. */
  totalKeys: number;
  /** Mapa de idioma → claves faltantes respecto al idioma por defecto. */
  missing: Record<Language, string[]>;
  /** `true` si todos los idiomas tienen cobertura completa. */
  isComplete: boolean;
}

/**
 * Compara las claves de traducción de todos los idiomas soportados
 * contra el idioma por defecto y devuelve un informe de cobertura.
 *
 * @param options - Opciones del plugin.
 * @returns Informe de cobertura de traducciones.
 */
export async function auditTranslationCoverage(
  options?: Partial<I18nPluginOptions>,
): Promise<TranslationCoverageResult> {
  const config = getConfig();
  const resolvedOptions = { ...config, ...options };

  const supportedLangs = resolveSupportedLanguages(resolvedOptions);
  const defaultLang = resolveDefaultLanguage(resolvedOptions, supportedLangs);

  // Cargamos las traducciones del idioma base para obtener la lista maestra de claves.
  const defaultTranslations = await loadTranslations(defaultLang);
  const defaultKeys = flattenKeys(defaultTranslations);

  const missing: Record<Language, string[]> = {};

  // Comparamos cada idioma soportado (excepto el por defecto) contra la lista maestra.
  for (const lang of supportedLangs) {
    if (lang === defaultLang) {
      missing[lang] = [];
      continue;
    }

    const langTranslations = await loadTranslations(lang);
    const langKeys = new Set(flattenKeys(langTranslations));
    const missingKeys = defaultKeys.filter((key) => !langKeys.has(key));
    missing[lang] = missingKeys;
  }

  const isComplete = Object.values(missing).every((keys) => keys.length === 0);

  return {
    defaultLang,
    languages: supportedLangs,
    totalKeys: defaultKeys.length,
    missing,
    isComplete,
  };
}

/**
 * Aplana un objeto JSON anidado a una lista de claves en notación de puntos.
 * Soporta tanto el modo legacy (un JSON por idioma) como namespaces
 * (detectado cuando todos los valores del primer nivel son objetos).
 */
function flattenKeys(translations: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(translations)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null) {
      keys.push(...flattenKeys(value as Record<string, any>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}
