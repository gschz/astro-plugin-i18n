# astro-plugin-i18n

<p align="center">
  <a href="https://www.npmjs.com/package/@gschz/astro-plugin-i18n"><img src="https://img.shields.io/npm/v/@gschz/astro-plugin-i18n?style=flat-square&logo=npm" alt="NPM Version"></a>
  <a href="https://www.npmjs.com/package/@gschz/astro-plugin-i18n"><img src="https://img.shields.io/npm/dm/@gschz/astro-plugin-i18n?style=flat-square&logo=npm" alt="NPM Downloads"></a>
  <a href="https://deepwiki.com/gschz/astro-plugin-i18n"><img src="https://img.shields.io/badge/DeepWiki-gschz%2Fastro--plugin--i18n-blue.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ErkJggg==" alt="DeepWiki"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License"></a>
  <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-6%2B-FF5D01?style=flat-square&logo=astro" alt="Astro 6+"></a>
  <a href="https://bun.sh/"><img src="https://img.shields.io/badge/Bun-1.3%2B-f0dba5?style=flat-square&logo=bun" alt="Bun 1.3+"></a>
</p>

<p align="center">
  Language: <a href="README.md">ES</a> | <strong>EN</strong>
</p>

Internationalization (i18n) plugin for Astro, focused on simplicity, SSR-first architecture, and reactive client updates.

## Features

- SSR-first rendering to avoid FOUC and improve SEO.
- Clear environment boundaries: browser-safe API via the dedicated `client` entrypoint.
- Server and client caching to reduce I/O and translation lookup overhead.
- Native Astro integration (`integration` + `pre` middleware).
- React support (`useTranslation`, `TranslatedText`, `LangToggle`).
- Declarative DOM rendering via `data-i18n-*` attributes.
- Optional literal type generation for languages and keys from JSON (`generateTypes`).

## Requirements

- Astro `>=6.0.0`
- React `>=19.0.0` (optional)
- Bun `>=1.3.0` recommended for development and publishing

## Installation

```bash
bun add @gschz/astro-plugin-i18n@latest
```

## Quick start

### 1. Configure integration

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import i18n from '@gschz/astro-plugin-i18n/integration';

export default defineConfig({
  integrations: [
    i18n({
      defaultLang: 'en',
      supportedLangs: ['en', 'es'],
      translationsDir: './src/i18n',
      autoDetect: true,
      generateTypes: true,
      missingKeyStrategy: 'key',
    }),
  ],
});
```

### 2. Add translation files

```text
src/
  i18n/
    en.json
    es.json
```

Example:

```json
{
  "home": {
    "title": "Welcome"
  }
}
```

### 3. Inject SSR bootstrap in your layout

```astro
---
import { getI18nClientBootstrapPayload } from '@gschz/astro-plugin-i18n';

const i18nBootstrap = await getI18nClientBootstrapPayload(Astro.locals);
---

<html lang={i18nBootstrap.lang}>
  <head>
    <script is:inline define:vars={{ i18nBootstrap }}>
      window.__INITIAL_I18N_STATE__ = {
        lang: i18nBootstrap.lang,
        translations: i18nBootstrap.translations,
      };
      window.__INITIAL_I18N_ALL_TRANSLATIONS__ = i18nBootstrap.allTranslations;
    </script>
  </head>
  <body>
    <slot />
    <script>
      import { bootstrapClientI18n } from '@gschz/astro-plugin-i18n/client';
      bootstrapClientI18n();
    </script>
  </body>
</html>
```

### 4. Consume translations

Astro SSR:

```astro
---
import I18nText from '@gschz/astro-plugin-i18n/components/I18nText.astro';
---

<I18nText key="home.title" element="h1" />
```

React:

```tsx
import { TranslatedText, useTranslation } from '@gschz/astro-plugin-i18n';

export function Header() {
  const { changeLanguage } = useTranslation();

  return (
    <header>
      <TranslatedText textKey="home.title" as="h1" />
      <button onClick={() => changeLanguage('es')}>ES</button>
    </header>
  );
}
```

> [!NOTE]
> For code that runs in the browser, import from `@gschz/astro-plugin-i18n/client`.
> This avoids bundling Node.js modules into client bundles.

## Architecture summary

- Server/build: loads translation files, manages config, optionally generates types.
- Middleware: injects i18n config into `Astro.locals` per SSR request.
- Client runtime: hydrates cache from SSR payload, syncs language state, and rerenders UI.

## Entry points

| Entry point                                          | Recommended use                                           |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `@gschz/astro-plugin-i18n`                           | Full API (SSR + shared client + server/build utilities).  |
| `@gschz/astro-plugin-i18n/client`                    | Browser-safe API (no server-only modules).                |
| `@gschz/astro-plugin-i18n/integration`               | Astro integration for `astro.config.*`.                   |
| `@gschz/astro-plugin-i18n/components/I18nText.astro` | Astro SSR component.                                      |
| `@gschz/astro-plugin-i18n/middleware-entrypoint`     | Advanced middleware entrypoint (usually auto-registered). |

## Configuration options

| Option               | Type                          | Default                       | Required in integration |
| -------------------- | ----------------------------- | ----------------------------- | ----------------------- |
| `defaultLang`        | `string`                      | `en` (runtime-normalized)     | Yes                     |
| `supportedLangs`     | `string[]`                    | `['en']` (runtime-normalized) | Yes                     |
| `translationsDir`    | `string`                      | `./src/i18n`                  | No                      |
| `autoDetect`         | `boolean`                     | `true`                        | No                      |
| `generateTypes`      | `boolean`                     | `false`                       | No                      |
| `typesOutputPath`    | `string`                      | `./src/types/i18n-types.d.ts` | No                      |
| `missingKeyStrategy` | `'key' \| 'empty' \| 'error'` | `'key'`                       | No                      |

`missingKeyStrategy` values:

- `key`: returns the key.
- `empty`: returns an empty string.
- `error`: logs an error and returns `[MISSING: key]`.

## Main API surface

Commonly used functions:

- Translation: `t`, `translateAsync`, `useTranslation`, `populateClientCache`.
- Language: `getCurrentLanguage`, `changeLanguage`, `setupLanguage`, `bootstrapClientI18n`.
- Declarative DOM: `renderDataI18n`, `bindDataI18n` (via `client` entrypoint).
- SSR helpers: `getI18nClientBootstrapPayload`, `isLanguageSupported`, `getLanguageRedirect`.
- Runtime config: `getConfig`, `initConfig`, `updateConfig`, `resetConfig`.

## Components

- `I18nText.astro`: SSR translation for Astro templates.
- `TranslatedText`: reactive translation component for React.
- `LangToggle`: visual language switcher for React.

## Documentation

Project docs:

- [docs/API.md](docs/API.md)

DeepWiki:

- [Overview](https://deepwiki.com/gschz/astro-plugin-i18n/1-overview)
- [Getting Started](https://deepwiki.com/gschz/astro-plugin-i18n/1.1-getting-started)
- [Project Structure and Build Pipeline](https://deepwiki.com/gschz/astro-plugin-i18n/1.2-project-structure-and-build-pipeline)

## Project status

This package continues maintenance of the previously published line under `@hkxdv/astro-plugin-i18n`, now under `@gschz/astro-plugin-i18n`.

Current and future releases are published from account `gschz`.
