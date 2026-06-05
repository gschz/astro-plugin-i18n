import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    integration: 'src/integration.ts',
    'middleware-entrypoint': 'src/middleware-entrypoint.ts',
    schema: 'src/schema.ts',
    'react/index': 'src/components/react/index.ts',
    'vue/index': 'src/components/vue/index.ts',
    'svelte/index': 'src/components/svelte/index.ts',
    'solid/index': 'src/components/solid/index.ts',
  },
  format: ['esm'],
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: [
      'astro',
      'astro/middleware',
      'astro/zod',
      'react',
      'react/jsx-runtime',
      'vue',
      'svelte',
      'svelte/store',
      'solid-js',
    ],
  },
  treeshake: true,
  outDir: 'dist',
  target: false,
});
