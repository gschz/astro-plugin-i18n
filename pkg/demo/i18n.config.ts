import { i18nPluginOptionsSchema } from '@gschz/astro-plugin-i18n/schema';

export const astroPluginI18nOptions = i18nPluginOptionsSchema.parse({
  defaultLang: 'es',
  supportedLangs: ['es', 'en', 'pt-BR'],
  routing: {
    strategy: 'prefix-except-default',
    prefixDefaultLocale: false,
    redirectToDefaultLocale: true,
  },
  fallback: {
    'pt-BR': 'en',
  },
  translationsDir: './src/i18n',
  namespaces: {
    enabled: true,
    defaultNamespace: 'common',
    separator: ':',
  },
  generateTypes: true,
  typesOutputPath: './src/types/i18n-types.d.ts',
  lazyLoading: {
    enabled: true,
    publicPath: '/i18n',
    preloadNamespaces: ['common'],
  },
  auditOnBuild: true,
});

export type AstroPluginI18nOptions = typeof astroPluginI18nOptions;
