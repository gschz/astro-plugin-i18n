// @ts-check
import react from '@astrojs/react';
import solid from '@astrojs/solid-js';
import svelte from '@astrojs/svelte';
import vercel from '@astrojs/vercel';
import vue from '@astrojs/vue';
import i18n from '@gschz/astro-plugin-i18n/integration';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import process from 'node:process';
import { astroPluginI18nOptions } from './i18n.config.ts';

const site = process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: site,
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    react({
      include: ['**/react/**'],
    }),
    vue(),
    svelte({
      extensions: ['.svelte'],
    }),
    solid({
      include: ['**/solid/**'],
    }),
    i18n(astroPluginI18nOptions),
  ],
});
