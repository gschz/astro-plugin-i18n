import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
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
