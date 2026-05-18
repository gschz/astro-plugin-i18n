# API Reference

Technical reference for **`@gschz/astro-plugin-i18n` v1.3.11**.

<p align="center">
  Language: <a href="API.md">ES</a> | <strong>EN</strong>
</p>

For installation, feature overview, and quick start, see [README.en.md](../README.en.md).

---

## Table of contents

1. [Entry points](#1-entry-points)
2. [Integration](#2-integration)
3. [Configuration (`I18nPluginOptions`)](#3-configuration-i18npluginoptions)
4. [Translation file layouts](#4-translation-file-layouts)
5. [Namespaces](#5-namespaces)
6. [Pluralization](#6-pluralization)
7. [Language fallback](#7-language-fallback)
8. [Lazy loading](#8-lazy-loading)
9. [Routing](#9-routing)
10. [Middleware](#10-middleware)
11. [Public types](#11-public-types)
12. [Translation API](#12-translation-api)
13. [Language API](#13-language-api)
14. [SSR helpers](#14-ssr-helpers)
15. [SEO helpers](#15-seo-helpers)
16. [DOM API (`data-i18n-*`)](#16-dom-api-data-i18n)
17. [Components](#17-components)
18. [Config runtime](#18-config-runtime)
19. [Server-only translation loading](#19-server-only-translation-loading)
20. [Build utilities](#20-build-utilities)
21. [Client entrypoint](#21-client-entrypoint)
22. [Globals and events](#22-globals-and-events)
23. [Type generation](#23-type-generation)
24. [Recommended SSR + client flow](#24-recommended-ssr--client-flow)
25. [Troubleshooting](#25-troubleshooting)

---

## 1. Entry points

| Entry point                                          | Environment  | Purpose                                            |
| ---------------------------------------------------- | ------------ | -------------------------------------------------- |
| `@gschz/astro-plugin-i18n`                           | SSR + shared | Full public API, server loaders, React components. |
| `@gschz/astro-plugin-i18n/client`                    | Browser      | Safe subset (no `fs` / `path`).                    |
| `@gschz/astro-plugin-i18n/integration`               | Build        | `createI18nIntegration` for `astro.config.*`.      |
| `@gschz/astro-plugin-i18n/schema`                    | Build        | Zod schemas (`i18nPluginOptionsSchema`, …).        |
| `@gschz/astro-plugin-i18n/components/I18nText.astro` | SSR          | Server-rendered translation tag.                   |
| `@gschz/astro-plugin-i18n/components/I18nHead.astro` | SSR          | SEO link/meta tags.                                |
| `@gschz/astro-plugin-i18n/middleware-entrypoint`     | SSR          | `onRequest` middleware (usually auto-registered).  |

`.astro` components are **not** re-exported from the main entry; import them by path as shown above.

---

## 2. Integration

### 2.1 Basic usage

```js
import { defineConfig } from 'astro/config';
import i18n from '@gschz/astro-plugin-i18n/integration';

export default defineConfig({
  integrations: [
    i18n({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      translationsDir: './src/i18n',
    }),
  ],
});
```

### 2.2 Signature

```ts
function createI18nIntegration(options?: Partial<I18nPluginOptions>): AstroIntegration;
```

Default export from `@gschz/astro-plugin-i18n/integration` is the same factory.

### 2.3 Runtime validation

On startup the integration requires:

1. `defaultLang` is a non-empty string.
2. `supportedLangs` is a non-empty array.
3. `defaultLang` is included in `supportedLangs`.

Failure throws `Error` before the dev server accepts requests.

### 2.4 Lifecycle hooks

| Hook                 | Behavior                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `astro:config:setup` | Normalizes config, stores options in `global.__ASTRO_I18N_OPTIONS__`, registers `pre` middleware, optionally generates types. |
| `astro:server:setup` | Re-syncs middleware options; watches translation JSON for HMR (invalidates server cache).                                     |
| `astro:build:start`  | Build logging.                                                                                                                |
| `astro:build:done`   | Optional `auditOnBuild`; writes lazy-load bundles to `public` when `lazyLoading.enabled`.                                     |

### 2.5 `astro add`

```bash
bun x astro add @gschz/astro-plugin-i18n
```

Options can be validated with:

```ts
import { i18nPluginOptionsSchema } from '@gschz/astro-plugin-i18n/schema';

const options = i18nPluginOptionsSchema.parse({
  /* … */
});
```

---

## 3. Configuration (`I18nPluginOptions`)

`I18nPluginOptions` is an alias of `TranslationConfig`.

### 3.1 Top-level options

| Option               | Type                          | Default                         | Description                                                                  |
| -------------------- | ----------------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| `defaultLang`        | `Language`                    | `'en'` (normalized)             | Fallback language. **Required** in integration.                              |
| `supportedLangs`     | `Language[]`                  | `['en']`                        | Active locales. **Required** in integration.                                 |
| `translationsDir`    | `string`                      | `'./src/i18n'`                  | Path to JSON file(s) or locale folders.                                      |
| `autoDetect`         | `boolean`                     | `true`                          | Use `navigator.language(s)` on first client visit when no stored preference. |
| `generateTypes`      | `boolean`                     | `false`                         | Emit `i18n-types.d.ts` on dev/build.                                         |
| `typesOutputPath`    | `string`                      | `'./src/types/i18n-types.d.ts'` | Output path for generated types.                                             |
| `missingKeyStrategy` | `'key' \| 'empty' \| 'error'` | `'key'`                         | Behavior when a key is missing in all fallback languages.                    |
| `fallback`           | `Record<string, Language>`    | `undefined`                     | Per-language fallback before `missingKeyStrategy`.                           |
| `routing`            | `I18nRoutingOptions`          | `strategy: 'manual'`            | URL prefix and redirect behavior.                                            |
| `namespaces`         | `I18nNamespacesOptions`       | `enabled: false`                | Multi-file translations per language.                                        |
| `pluralization`      | `I18nPluralizationOptions`    | `enabled: true`                 | `Intl.PluralRules` key resolution.                                           |
| `lazyLoading`        | `I18nLazyLoadingOptions`      | `enabled: false`                | Per-language public bundles + smaller SSR payload.                           |
| `auditOnBuild`       | `boolean`                     | `false`                         | Warn on missing keys vs `defaultLang` after `astro build`.                   |

### 3.2 `missingKeyStrategy`

| Value   | Result                                      |
| ------- | ------------------------------------------- |
| `key`   | Returns the key string.                     |
| `empty` | Returns `''`.                               |
| `error` | Logs an error and returns `[MISSING: key]`. |

### 3.3 `routing` (`I18nRoutingOptions`)

| Field                     | Type                                              | Default    | Description                                                                   |
| ------------------------- | ------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| `strategy`                | `'manual' \| 'prefix' \| 'prefix-except-default'` | `'manual'` | How URL prefixes map to languages.                                            |
| `prefixDefaultLocale`     | `boolean`                                         | `false`    | Whether default language URLs include a prefix (used with `prefix` strategy). |
| `redirectToDefaultLocale` | `boolean`                                         | `false`    | Redirect bare paths to the default locale when required by strategy.          |

**Strategies:**

- **`manual`** — No automatic redirects; you own URL structure.
- **`prefix`** — Every locale uses a URL prefix (`/en/about`, `/es/about`).
- **`prefix-except-default`** — Default language has no prefix (`/about` → `es`); others use `/en/about`.

Example:

```js
routing: {
  strategy: 'prefix-except-default',
  prefixDefaultLocale: false,
  redirectToDefaultLocale: true,
}
```

### 3.4 `namespaces` (`I18nNamespacesOptions`)

| Field              | Type      | Default    | Description                                                    |
| ------------------ | --------- | ---------- | -------------------------------------------------------------- |
| `enabled`          | `boolean` | `false`    | Load `translationsDir/<lang>/*.json` instead of `<lang>.json`. |
| `defaultNamespace` | `string`  | `'common'` | Namespace used when the key has no separator.                  |
| `separator`        | `string`  | `':'`      | Between namespace and key in `t('auth:login.title')`.          |

### 3.5 `pluralization` (`I18nPluralizationOptions`)

| Field     | Type      | Default   | Description                                             |
| --------- | --------- | --------- | ------------------------------------------------------- |
| `enabled` | `boolean` | `true`    | Resolve plural suffixed keys before the base key.       |
| `field`   | `string`  | `'count'` | Numeric field in `values` that drives plural selection. |

### 3.6 `lazyLoading` (`I18nLazyLoadingOptions`)

| Field               | Type                                    | Default      | Description                                        |
| ------------------- | --------------------------------------- | ------------ | -------------------------------------------------- |
| `enabled`           | `boolean`                               | `false`      | Enable lazy bundles and reduced SSR payload.       |
| `strategy`          | `'language' \| 'namespace' \| 'hybrid'` | `'language'` | Only `'language'` is fully supported in v1.3.x.    |
| `preloadNamespaces` | `string[]`                              | `undefined`  | Namespaces always included in initial SSR payload. |
| `publicPath`        | `string`                                | `'/i18n'`    | URL path where build outputs JSON bundles.         |

### 3.7 `fallback`

```ts
fallback: {
  fr: 'en',
  'pt-BR': 'en',
}
```

When a key is missing in the active language, the plugin looks up the same key in the fallback language before applying `missingKeyStrategy`.

---

## 4. Translation file layouts

### 4.1 Legacy (single file)

```text
src/i18n/
  en.json
  es.json
```

Keys use dot notation: `home.title`.

### 4.2 Namespaces (folder per language)

```text
src/i18n/
  en/
    common.json
    home.json
  es/
    common.json
    home.json
```

Enable with `namespaces.enabled: true`. See [Namespaces](#5-namespaces).

---

## 5. Namespaces

With namespaces enabled:

```ts
t('home:title'); // namespace home, key title
t('common:nav.home'); // nested key in common
t('nav.home'); // → common:nav.home (defaultNamespace)
```

Type generation emits keys in `namespace:key` form when namespaces are detected.

**Auto-detection:** if `translationsDir/<lang>/` exists as a directory with `*.json` files, namespace mode can load even before explicit config (see server loader). Setting `namespaces.enabled: true` is still recommended for consistent key normalization and types.

---

## 6. Pluralization

Define plural forms in JSON using the suffix pattern `{baseKey}_{category}`:

```json
{
  "notifications": {
    "count_zero": "No notifications",
    "count_one": "You have {count} notification",
    "count_other": "You have {count} notifications"
  }
}
```

Usage:

```ts
t('notifications.count', { values: { count: 0 } }); // → count_zero
t('notifications.count', { values: { count: 1 } }); // → count_one
t('notifications.count', { values: { count: 5 } }); // → count_other
```

Categories follow [`Intl.PluralRules`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules): `zero`, `one`, `two`, `few`, `many`, `other`.

- `count === 0` tries `*_zero` first, then falls back to plural rules.
- If no plural key exists, the resolver falls back to the base key (`notifications.count`).
- Disable with `pluralization: { enabled: false }`.
- Custom counter field: `pluralization: { field: 'n' }` and `values: { n: 3 }`.

---

## 7. Language fallback

Resolution order for a missing key:

1. Active language bundle.
2. Language from `fallback[activeLang]` (if configured).
3. `missingKeyStrategy`.

Works in both server (`translateAsync`, `getTranslation`) and client (`t`) caches.

---

## 8. Lazy loading

When `lazyLoading.enabled` is `true`:

1. **SSR** — `getI18nClientBootstrapPayload()` returns only the current language (and optional `preloadNamespaces`); `allTranslations` is `{}`.
2. **Build** — Merged JSON per language is written under `public<i18n/publicPath>/`.
3. **Client** — `changeLanguage(lang)` fetches `/{publicPath}/{lang}.json` if that language is not cached, then updates the UI.

Example:

```js
lazyLoading: {
  enabled: true,
  publicPath: '/i18n',
  preloadNamespaces: ['common'],
}
```

Override namespaces for a single layout:

```ts
await getI18nClientBootstrapPayload(Astro.locals, {
  preloadNamespaces: ['common', 'home'],
});
```

In development, the integration serves bundle files via a Vite middleware without a full rebuild.

---

## 9. Routing

Public helpers (also used internally by middleware):

| Function                                | Description                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| `getLanguageRedirect(url)`              | Returns redirect `URL` or `null` for the active routing config. |
| `getLocalizedPath(path, lang, config?)` | Builds a path for a target language respecting strategy.        |
| `syncLanguageRoute(lang)`               | Updates `window.location` to match language (client).           |

`changeLanguage()` sets cookie `i18n-lang` and calls `syncLanguageRoute()` by default so URL and content stay aligned.

---

## 10. Middleware

Registered automatically with order `"pre"` from `@gschz/astro-plugin-i18n/middleware-entrypoint`.

### 10.1 Per-request behavior

1. **Routing redirect** — if `getRoutingRedirect()` returns a URL, responds with `302`.
2. **Language resolution** (priority):
   1. First URL segment matching `supportedLangs` (e.g. `/en/about` → `en`).
   2. Cookie `i18n-lang`.
   3. `Accept-Language` header (quality values respected).
   4. `defaultLang`.
3. **Locals injection** — sets `locals.i18n.lang` and `locals.i18n.config`.

### 10.2 Typing `Astro.locals`

```ts
declare global {
  namespace App {
    interface Locals {
      i18n?: {
        lang?: Language;
        config?: Partial<I18nPluginOptions>;
      };
    }
  }
}
```

Use `getCurrentLanguage(Astro.locals)` in `.astro` files instead of reading `locals` directly when possible.

### 10.3 Advanced: `setOptions`

```ts
import { setOptions } from '@gschz/astro-plugin-i18n/middleware-entrypoint';
```

Normally called by the integration; useful in tests or custom middleware setups.

---

## 11. Public types

Exported from `@gschz/astro-plugin-i18n` and `@gschz/astro-plugin-i18n/client` (subset):

| Type                                                | Description                                       |
| --------------------------------------------------- | ------------------------------------------------- |
| `Language`                                          | Locale code (`string` or generated union).        |
| `TranslationKey`                                    | Key path (`string` or generated union).           |
| `TranslationValues`                                 | `{ [key: string]: string \| number \| boolean }`. |
| `TranslationOptions`                                | `{ values?, lang? }`.                             |
| `TranslationConfig` / `I18nPluginOptions`           | Full plugin config.                               |
| `I18nRoutingOptions`, `I18nRoutingStrategy`         | Routing config.                                   |
| `I18nNamespacesOptions`                             | Namespace config.                                 |
| `I18nPluralizationOptions`                          | Pluralization config.                             |
| `I18nLazyLoadingOptions`, `I18nLazyLoadingStrategy` | Lazy loading config.                              |
| `AstroI18nTypeRegistry`                             | Augmented by generated `i18n-types.d.ts`.         |
| `I18nClientBootstrapPayload`                        | SSR bootstrap shape (from setup module).          |
| `TranslationCoverageResult`                         | Build audit result (server).                      |
| `DataI18nBinderOptions`, `DataI18nRenderOptions`    | DOM helper options.                               |

Base contracts:

```ts
interface TranslationOptions {
  values?: TranslationValues;
  lang?: Language;
}
```

With `generateTypes: true`, `Language` and `TranslationKey` become literal unions via module augmentation.

---

## 12. Translation API

Import from `@gschz/astro-plugin-i18n` (SSR) or `@gschz/astro-plugin-i18n/client` (browser).

### `t(key, options?)`

Synchronous translation using the client cache. Supports interpolation, namespaces, pluralization, fallback, and `lang` override.

```ts
t('greeting', { values: { name: 'Alex' } });
t('home:title', { lang: 'es' });
```

### `translateAsync(key, options?)`

Server-only async resolver (reads filesystem / server cache). Do not call from browser bundles.

```astro
---
const title = await translateAsync('home:title', { lang: getCurrentLanguage(Astro.locals) });
---
```

### `populateClientCache(lang, translations)`

Flattens nested JSON into the client cache (used internally by bootstrap and lazy fetch).

### `useTranslation()`

React hook (optional peer `react`):

```ts
const { language, changeLanguage, t } = useTranslation();
```

Returns `changeLanguage` as `async` when lazy loading may fetch bundles.

---

## 13. Language API

### `getCurrentLanguage(locals?)`

Resolves active language:

- **SSR:** `locals.i18n.lang` → config default.
- **Client:** `<html lang>` → `localStorage` → SSR initial state → browser detection (if `autoDetect`) → default.

### `changeLanguage(lang, options?)`

Updates `<html lang>`, `localStorage`, cookie `i18n-lang`, emits `languagechange`, optionally fetches lazy bundle, and syncs route (`syncRoute: true` by default).

```ts
await changeLanguage('en');
await changeLanguage('en', { syncRoute: false });
```

### `setupLanguage()`

Applies stored / detected language on startup (called by `bootstrapClientI18n`).

### `setupLanguageObserver(callback)`

```ts
const unsubscribe = setupLanguageObserver((lang) => {
  console.log('language changed', lang);
});
```

### `bootstrapClientI18n()`

Hydrates cache from `window.__INITIAL_I18N_*`, runs `setupLanguage()`, dispatches `i18nready`.

### `syncLanguageRoute(lang)`

Client-only; navigates to the localized path for `lang` using current routing strategy.

---

## 14. SSR helpers

### `getI18nClientBootstrapPayload(locals?, options?)`

```ts
interface I18nClientBootstrapPayload {
  lang: Language;
  translations: Record<string, any>;
  allTranslations: Record<Language, Record<string, any>>;
  supportedLangs: Language[];
  config: TranslationConfig;
}
```

### `isLanguageSupported(lang)`

Returns whether `lang` is in `supportedLangs`.

### `getLanguageRedirect(url)`

Wrapper around routing redirect logic for custom middleware.

### `reloadTranslations()`

Clears server translation cache (dev/tests).

---

## 15. SEO helpers

| Function                                    | Description                                                     |
| ------------------------------------------- | --------------------------------------------------------------- |
| `getAlternateLinks(path, siteUrl, config?)` | `{ lang, href }[]` for `hreflang` links.                        |
| `getXDefaultHref(path, siteUrl, config?)`   | URL for `hreflang="x-default"`.                                 |
| `getLocalizedPath(path, lang, config?)`     | Localized pathname.                                             |
| `getOgLocaleMap(supportedLangs?)`           | Map language codes to Open Graph locales (e.g. `es` → `es_ES`). |
| `langToOgLocale(lang)`                      | Single-language OG locale string.                               |

Prefer **`I18nHead.astro`** in layouts for standard tags (see [Components](#17-components)).

---

## 16. DOM API (`data-i18n-*`)

Client entrypoint only.

### `renderDataI18n(options?)`

Scans `data-i18n-key` (default) and sets `textContent` via `t()`.

```html
<span data-i18n-key="nav.home"></span> <span data-i18n-key="greeting" data-i18n-values='{"name":"Ana"}'></span>
```

Options: `root`, `keyAttribute`, `valuesAttribute`, `allowedKeys`.

### `bindDataI18n(options?)`

Calls `renderDataI18n` on mount and on every `languagechange`. Returns unsubscribe function.

```ts
bindDataI18n({ waitForReady: true });
```

---

## 17. Components

### 17.1 `I18nText.astro`

```astro
---
import I18nText from '@gschz/astro-plugin-i18n/components/I18nText.astro';
---

<I18nText key="home:title" element="h1" class="title" />
<I18nText key="greeting" values={{ name: 'Ana' }} />
```

| Prop      | Type                | Description                                                |
| --------- | ------------------- | ---------------------------------------------------------- |
| `key`     | `TranslationKey`    | Required.                                                  |
| `lang`    | `Language`          | Override; default from `getCurrentLanguage(Astro.locals)`. |
| `values`  | `TranslationValues` | Interpolation / plural field.                              |
| `element` | HTML tag name       | Default wrapper tag.                                       |
| `class`   | `string`            | CSS class.                                                 |

Adds `data-i18n-key` and optional `data-i18n-values` for client re-render.

### 17.2 `I18nHead.astro`

```astro
---
import I18nHead from '@gschz/astro-plugin-i18n/components/I18nHead.astro';
---

<I18nHead currentLang={lang} currentPath={Astro.url.pathname} siteUrl="https://example.com" />
```

| Prop              | Type                     | Default                    | Description                    |
| ----------------- | ------------------------ | -------------------------- | ------------------------------ |
| `currentLang`     | `Language`               | from `locals`              | Active locale.                 |
| `currentPath`     | `string`                 | `Astro.url.pathname`       | Path used to build alternates. |
| `siteUrl`         | `string`                 | `Astro.site` / origin      | Absolute site origin.          |
| `localeMap`       | `Record<string, string>` | auto from `getOgLocaleMap` | Open Graph locale map.         |
| `includeXDefault` | `boolean`                | `true`                     | Emit `hreflang="x-default"`.   |

Outputs: `<link rel="alternate" hreflang="…">`, optional `x-default`, `<meta property="og:locale">`, `og:locale:alternate`.

### 17.3 `TranslatedText` (React)

```tsx
<TranslatedText textKey="home:title" as="h1" values={{ name: 'Ana' }} />
```

| Prop       | Description                                                             |
| ---------- | ----------------------------------------------------------------------- |
| `textKey`  | Required translation key.                                               |
| `values`   | Interpolation / plural values.                                          |
| `as`       | Element type (default `span`).                                          |
| `lang`     | Force lookup language (skips reactive hook when different from global). |
| `fallback` | React node if result equals raw key.                                    |
| `render`   | Custom render prop.                                                     |

### 17.4 `LangToggle` (React)

```tsx
<LangToggle
  languages={[
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' },
  ]}
/>
```

| Prop          | Description                         |
| ------------- | ----------------------------------- |
| `languages`   | Required non-empty list.            |
| `currentLang` | Controlled current code (optional). |
| `className`   | Wrapper class.                      |

Uses `changeLanguage` and keeps selection in sync via `setupLanguageObserver`.

---

## 18. Config runtime

| Function                  | Description                             |
| ------------------------- | --------------------------------------- |
| `getConfig()`             | Normalized active config.               |
| `initConfig(partial?)`    | Initialize singleton (tests/bootstrap). |
| `updateConfig(partial?)`  | Merge partial options.                  |
| `resetConfig()`           | Reset to defaults.                      |
| `getSupportedLanguages()` | `supportedLangs` array.                 |
| `getDefaultLanguage()`    | `defaultLang` (throws if unset).        |

---

## 19. Server-only translation loading

Import only from `@gschz/astro-plugin-i18n` in server contexts.

| Function                           | Description                                               |
| ---------------------------------- | --------------------------------------------------------- |
| `loadTranslations(lang)`           | Load and cache full bundle for `lang`.                    |
| `getTranslationsForLanguage(lang)` | Same as load (alias pattern in codebase).                 |
| `getTranslation(key, lang)`        | Resolve one key on server.                                |
| `clearTranslationsCache()`         | Invalidate memory cache.                                  |
| `auditTranslationCoverage()`       | Compare keys across languages (used when `auditOnBuild`). |

Legacy layout reads `${translationsDir}/${lang}.json`. Namespace layout reads all `*.json` in `${translationsDir}/${lang}/`.

---

## 20. Build utilities

### `generateTranslationTypes()`

Returns output file path, or `''` if default language has no translations. Triggered automatically when `generateTypes: true`.

### Debug logging

Set `ASTRO_I18N_DEBUG=1` to log routing, middleware, and language resolution details.

---

## 21. Client entrypoint

`@gschz/astro-plugin-i18n/client` exports:

- Types: `Language`, `TranslationKey`, `TranslationOptions`, `TranslationValues`, namespace/plural/lazy option types, `AstroI18nTypeRegistry`
- `t`, `populateClientCache`, `useTranslation`
- `getCurrentLanguage`, `changeLanguage`, `setupLanguage`, `setupLanguageObserver`, `bootstrapClientI18n`, `syncLanguageRoute`
- `getConfig`, `getSupportedLanguages`
- `renderDataI18n`, `bindDataI18n`

Does **not** export: `translateAsync`, `loadTranslations`, `getTranslation`, `getI18nClientBootstrapPayload`, SEO helpers, `createI18nIntegration`, `auditTranslationCoverage`.

---

## 22. Globals and events

### Window globals

```ts
window.__INITIAL_I18N_STATE__ = {
  lang?: string;
  translations?: Record<string, any>;
  config?: Partial<I18nPluginOptions>;
};

window.__INITIAL_I18N_ALL_TRANSLATIONS__?: Record<string, Record<string, any>>;
```

### Events (`document`)

| Event            | `detail`                 |
| ---------------- | ------------------------ |
| `languagechange` | `{ language: Language }` |
| `i18nready`      | `{ language: Language }` |

---

## 23. Type generation

When `generateTypes: true`, the integration writes a `.d.ts` file containing:

1. `Lang` and `I18nKey` literal unions from JSON.
2. `I18N_KEYS` constant object.
3. Module augmentation for `@gschz/astro-plugin-i18n` and `@gschz/astro-plugin-i18n/client`.

Ensure `typesOutputPath` is included in your `tsconfig.json` `include` array.

---

## 24. Recommended SSR + client flow

1. Configure `i18n()` in `astro.config.*`.
2. Structure pages for your `routing.strategy` (e.g. `src/pages/[lang]/…`).
3. In root layout: `getI18nClientBootstrapPayload(Astro.locals)` + inline script + `bootstrapClientI18n()`.
4. Add `<I18nHead />` for SEO.
5. Translate content with `I18nText.astro`, `translateAsync`, or React components.
6. Optional: `bindDataI18n()` for static markup with `data-i18n-*`.
7. Enable `auditOnBuild` in CI to catch missing keys.

---

## 25. Troubleshooting

### Keys appear instead of translations

1. Layout injects `__INITIAL_I18N_STATE__` and runs `bootstrapClientI18n()`.
2. JSON exists for the resolved language.
3. `defaultLang` / `supportedLangs` match your files (including `pt-BR` casing).
4. With namespaces, keys use `namespace:key` or rely on `defaultNamespace`.

### `fs` / `path` warnings in the client bundle

Import browser code from `@gschz/astro-plugin-i18n/client`, not the root entry.

### Language mismatch after toggle

Ensure `routing` is configured and `changeLanguage` is not called with `{ syncRoute: false }` unless intentional.

### Lazy loading: empty translations after switch

1. `lazyLoading.enabled` is `true`.
2. `astro build` produced files under `publicPath` (e.g. `public/i18n/en.json`).
3. In dev, the integration dev middleware is active (default with integration).

### Types not updating

Restart `astro dev` or run `astro build` after changing JSON; confirm `typesOutputPath` is in `tsconfig` `include`.

### Hide missing keys in production

Use `missingKeyStrategy: 'empty'` or configure `fallback` for incomplete locales.
