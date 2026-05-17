/**
 * Bundle builder para lazy loading de traducciones.
 *
 * Combina los namespaces de un idioma en un unico JSON y lo escribe en disco.
 * Solo para uso en servidor (build/dev), ya que usa fs.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import type { Language } from '../types';
import { getSupportedLanguages } from './config';
import { loadTranslations } from './translations';

/**
 * Devuelve el bundle completo de un idioma.
 *
 * - En modo legacy retorna el JSON de `{lang}.json`.
 * - En modo namespaces retorna `{ namespace: translations }`.
 */
export async function bundleLanguageTranslations(lang: Language): Promise<Record<string, any>> {
  return loadTranslations(lang);
}

/**
 * Genera bundles JSON para todos los idiomas soportados.
 *
 * @param outputDir - Ruta absoluta al directorio destino (ej: dist/i18n).
 */
export async function generateBundles(outputDir: string): Promise<void> {
  const supportedLangs = getSupportedLanguages();

  await fsPromises.mkdir(outputDir, { recursive: true });

  for (const lang of supportedLangs) {
    const bundle = await bundleLanguageTranslations(lang);
    const outputPath = path.join(outputDir, `${lang}.json`);
    await fsPromises.writeFile(outputPath, JSON.stringify(bundle), 'utf-8');
  }
}
