# Demo — `@gschz/astro-plugin-i18n`

Interactive demo app (es, en, pt-BR) exercising the plugin on a real Astro 6 multi-framework (React, Vue, Svelte, Solid) site deployed on Vercel.

## Run locally

```bash
bun install
bun run dev           # http://localhost:4321
bun run build
bun run preview
bun run dev:debug     # ASTRO_I18N_DEBUG=1
```

Requires **Bun** (or `npm` / `pnpm` with equivalent scripts).

## Features demonstrated

| Feature                                                  | Location                                                  |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Locale routing (`prefix-except-default`)                 | `astro.config.mjs`, `src/pages/`, middleware redirects    |
| Per-request language (URL, cookie, `Accept-Language`)    | Middleware + `BaseLayout.astro`                           |
| Namespaces (`common`, `home`, `features`)                | `src/i18n/<lang>/*.json`, keys like `home:title`          |
| SSR translations                                         | `I18nText.astro`, `translateAsync` in `BaseLayout.astro`  |
| Pluralization                                            | `PluralDemo.tsx`, `common.json` → `notifications.count_*` |
| Interpolation                                            | `InterpolationDemo.tsx`, keys `greeting`                  |
| React `useTranslation` / `LangToggle` / `TranslatedText` | `InteractiveDemo.tsx`, `Header.astro`                     |
| Vue `useI18n` / Svelte store / Solid `useI18n`           | `ui/vue/`, `ui/svelte/`, `ui/solid/`                      |
| SEO (`hreflang`, Open Graph)                             | `I18nHead.astro` in `BaseLayout.astro`                    |
| Lazy loading + `preloadNamespaces` (serverless-fixed)    | `i18n.config.ts`, Vite virtual module (`pkg/#4`)          |
| Language fallback (`pt-BR` → `en`)                       | `fallback` config                                         |
| Client translations via virtual module                   | Vite plugin (`virtual:i18n`), no fetch or massive inline  |
| Declarative DOM `data-i18n-*`                            | `HeroSection.astro`, `bindDataI18n` in layout             |
| Build-time key audit                                     | `auditOnBuild: true`                                      |
| Generated types                                          | `src/types/i18n-types.d.ts`                               |

## Project structure

```text
demo/
├── public/
│   ├── favicon.ico
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Footer.astro
│   │   │   └── Header.astro
│   │   └── ui/
│   │       ├── HeroSection.astro
│   │       ├── HomeFeatureCard.astro
│   │       ├── react/
│   │       │   ├── Counter.tsx
│   │       │   ├── InteractiveDemo.tsx
│   │       │   ├── InterpolationDemo.tsx
│   │       │   └── PluralDemo.tsx
│   │       ├── solid/
│   │       │   └── Counter.tsx
│   │       ├── svelte/
│   │       │   └── Counter.svelte
│   │       └── vue/
│   │           └── Counter.vue
│   ├── i18n/
│   │   ├── en/
│   │   ├── es/
│   │   └── pt-BR/
│   │       ├── common.json
│   │       ├── features.json
│   │       ├── frameworks.json
│   │       └── home.json
│   ├── icons/
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   └── [...lang]/
│   │       ├── demo.astro
│   │       ├── features.astro
│   │       ├── frameworks.astro
│   │       └── index.astro
│   ├── styles/
│   │   └── global.css
│   ├── types/
│   │   └── i18n-types.d.ts    # (auto-generated)
│   ├── utils/
│   │   └── i18n.client.ts
│   ├── views/
│   │   ├── DemoView.astro
│   │   ├── FeaturesView.astro
│   │   ├── FrameworksView.astro
│   │   └── HomeView.astro
│   └── env.d.ts
├── astro.config.mjs
├── i18n.config.ts
├── package.json
├── svelte.config.ts
└── tsconfig.json
```

## Configuration reference

The demo validates options through the published Zod schema:

```js
import { i18nPluginOptionsSchema } from '@gschz/astro-plugin-i18n/schema';
```

See `astro.config.mjs` for the full v1.4.10-rc.1 setup (SSR with `@astrojs/vercel`, Tailwind 4, multi-framework islands).

## Production demo

The demo is deployed on Vercel and covers all languages (es, en, pt-BR) with routing, lazy loading (fixed in PR [#4](https://github.com/gschz/astro-plugin-i18n/pull/4) for serverless), translations via Vite virtual module, and all available hooks/frameworks.

## Environment variables

| Variable           | Purpose                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `PUBLIC_SITE_URL`  | Canonical/social URL and `siteUrl` for `I18nHead` (uses request origin in dev) |
| `ASTRO_I18N_DEBUG` | Verbose plugin logs with `bun run dev:debug`                                   |

## Key files to start with

1. `astro.config.mjs` — integration options.
2. `src/layouts/BaseLayout.astro` — SSR bootstrap, `I18nHead`, client scripts.
3. `src/components/ui/react/InteractiveDemo.tsx` — client-side language switching.
4. `src/i18n/es/common.json` — namespaces, pluralization, interpolation.
