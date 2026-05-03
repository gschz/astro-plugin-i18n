import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    integration: 'src/integration.ts',
    'middleware-entrypoint': 'src/middleware-entrypoint.ts',
    'components/LangToggle': 'src/components/LangToggle.tsx',
    'components/TranslatedText': 'src/components/TranslatedText.tsx',
  },
  // Solo publicamos ESM porque Astro y Vite resuelven este paquete en modo ESM.
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: false,
  splitting: false,
  // React y Astro deben resolverse desde el proyecto consumidor.
  external: ['astro', 'astro/middleware', 'react', 'react/jsx-runtime'],
  treeshake: false, // Disabled for debugging middleware logging
  outDir: 'dist',
});
