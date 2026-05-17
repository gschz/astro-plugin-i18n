import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    integration: 'src/integration.ts',
    'middleware-entrypoint': 'src/middleware-entrypoint.ts',
    schema: 'src/schema.ts',
    'core/react/useTranslation': 'src/core/react/useTranslation.ts',
    'components/LangToggle': 'src/components/LangToggle.tsx',
    'components/TranslatedText': 'src/components/TranslatedText.tsx',
  },
  format: ['esm'],
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: ['astro', 'astro/middleware', 'astro/zod', 'react', 'react/jsx-runtime'],
  },
  treeshake: true,
  outDir: 'dist',
  target: false,
});
