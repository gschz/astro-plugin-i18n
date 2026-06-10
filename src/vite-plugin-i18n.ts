import type { Plugin } from 'vite';
import { getConfig } from './core/config';

const VIRTUAL_MODULE_ID = 'virtual:@gschz/astro-plugin-i18n/internal';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

export function i18nVirtualModulePlugin(): Plugin {
  return {
    name: 'astro-plugin-i18n:virtual-module',
    enforce: 'pre',

    resolveId(id: string) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
    },

    async load(id: string) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return;

      const { bundleAllTranslations } = await import('./core/translations');
      const allTranslations = await bundleAllTranslations();
      const config = getConfig();

      return {
        code: generateModuleCode(allTranslations, config),
        map: null,
      };
    },
  };
}

function generateModuleCode(
  allTranslations: Record<string, Record<string, any>>,
  config: ReturnType<typeof getConfig>,
): string {
  return `
export const allTranslations = ${JSON.stringify(allTranslations)};
export const config = ${JSON.stringify(config)};
export const defaultLang = ${JSON.stringify(config.defaultLang ?? 'en')};
export const supportedLangs = ${JSON.stringify(config.supportedLangs ?? ['en'])};
`.trim();
}
