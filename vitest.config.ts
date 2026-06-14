import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '~/': new URL('./src/', import.meta.url).pathname,
      'virtual:@gschz/astro-plugin-i18n/internal': new URL(
        './tests/__mocks__/virtual-i18n-internal.ts',
        import.meta.url,
      ).pathname,
    },
  },
});
