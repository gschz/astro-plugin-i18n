# astro-plugin-i18n

<p align="center">
  <a href="https://www.npmjs.com/package/@gschz/astro-plugin-i18n"><img src="https://img.shields.io/npm/v/@gschz/astro-plugin-i18n?style=flat-square&logo=npm" alt="NPM Version"></a>
  <a href="https://www.npmjs.com/package/@gschz/astro-plugin-i18n"><img src="https://img.shields.io/npm/dm/@gschz/astro-plugin-i18n?style=flat-square&logo=npm" alt="NPM Downloads"></a>
  <a href="https://deepwiki.com/gschz/astro-plugin-i18n"><img src="https://img.shields.io/badge/DeepWiki-gschz%2Fastro--plugin--i18n-blue.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ErkJggg==" alt="DeepWiki"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License"></a>
  <a href="https://astro.build/"><img src="https://img.shields.io/badge/Astro-6%2B-FF5D01?style=flat-square&logo=astro" alt="Astro 6+"></a>
</p>

<p align="center">
  Idioma: <strong>ES</strong> | <a href="README.en.md">EN</a>
</p>

Plugin de internacionalizacion (i18n) para Astro: SSR-first, actualizacion reactiva en cliente y routing por locale en una sola integracion.

**Version actual:** `1.3.11`

## Caracteristicas

- **SSR-first** — traducciones resueltas en servidor para evitar FOUC y mejorar SEO.
- **Routing por locale** — estrategias de prefijo URL (`prefix`, `prefix-except-default`, `manual`) con redirects automaticos.
- **Resolucion de idioma por request** — segmento URL → cookie `i18n-lang` → `Accept-Language` → `defaultLang`.
- **Traducciones JSON** — un archivo por idioma o **namespaces** (`common.json`, `home.json`, …).
- **Interpolacion** — placeholders `{variable}` en las cadenas.
- **Pluralizacion** — categorias CLDR con `Intl.PluralRules` (`count_zero`, `count_one`, `count_other`, …).
- **Cadena de fallback** — claves faltantes se buscan en otro idioma antes de `missingKeyStrategy`.
- **Lazy loading** — payload SSR reducido; bundles por idioma al llamar `changeLanguage()`.
- **SEO** — `I18nHead.astro` genera `hreflang`, `x-default` y meta Open Graph de locale.
- **React** — `useTranslation`, `TranslatedText`, `LangToggle` (peer dependency opcional).
- **DOM declarativo** — atributos `data-i18n-*` con `bindDataI18n` / `renderDataI18n`.
- **Generacion de tipos** — unions literales de idiomas y keys desde JSON (`generateTypes`).
- **DX** — HMR de traducciones en dev, auditoria opcional en build (`auditOnBuild`), schema para `astro add`.
- **Limites claros** — API segura para browser via `@gschz/astro-plugin-i18n/client`.

## Requisitos

- [Astro](https://docs.astro.build/) `>=6.x`
- [React](https://react.dev/) `>=19.x` (opcional, para componentes y hooks React)

## Instalacion

```bash
bun add @gschz/astro-plugin-i18n@latest
# o: pnpm install @gschz/astro-plugin-i18n@latest
```

Con el CLI de Astro:

```bash
bun x astro add @gschz/astro-plugin-i18n
```

## Inicio rapido

### 1. Configurar la integracion

```js
// astro.config.mjs
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

Consulta [Configuracion destacada](#configuracion-destacada) para routing, namespaces, pluralizacion, fallback y lazy loading. Referencia completa: [docs/API.md](docs/API.md).

### 2. Crear archivos de traduccion

**Legacy (un JSON por idioma):**

```text
src/i18n/
  es.json
  en.json
```

**Namespaces (carpeta por idioma):**

```text
src/i18n/
  es/
    common.json
  en/
    common.json
```

Ejemplo (`es.json` o `es/common.json`):

```json
{
  "home": {
    "title": "Bienvenido"
  }
}
```

### 3. Inyectar bootstrap SSR en el layout

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
        config: i18nBootstrap.config,
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

Con `lazyLoading.enabled`, `allTranslations` viene vacio a proposito; el cliente hace fetch al cambiar de idioma.

### 4. Consumir traducciones

**Astro (SSR):**

```astro
---
import I18nText from '@gschz/astro-plugin-i18n/components/I18nText.astro';
---

<I18nText key="home.title" element="h1" />
```

**React (isla cliente):**

```tsx
import { TranslatedText, useTranslation } from '@gschz/astro-plugin-i18n';

export function Header() {
  const { changeLanguage } = useTranslation();

  return (
    <header>
      <TranslatedText textKey="home.title" as="h1" />
      <button onClick={() => changeLanguage('en')}>EN</button>
    </header>
  );
}
```

> [!NOTE]
> En codigo de browser, importa desde `@gschz/astro-plugin-i18n/client` para no incluir modulos Node.js (`fs`, `path`).

## Configuracion destacada

Ejemplos de configuraciones frecuentes; defaults y casos limite en [docs/API.md](docs/API.md).

**Routing por locale** (`/` para el idioma por defecto, `/en/…` para el resto):

```js
i18n({
  defaultLang: 'es',
  supportedLangs: ['es', 'en'],
  routing: {
    strategy: 'prefix-except-default',
    prefixDefaultLocale: false,
    redirectToDefaultLocale: true,
  },
});
```

**Namespaces:**

```js
i18n({
  namespaces: { enabled: true, defaultNamespace: 'common', separator: ':' },
});
// t('home:title') o t('title') → common:title
```

**Pluralizacion** (keys JSON `count_zero`, `count_one`, `count_other`):

```ts
t('notifications.count', { values: { count: 5 } });
```

**Cadena de fallback:**

```js
i18n({
  defaultLang: 'en',
  supportedLangs: ['en', 'es', 'pt-BR'],
  fallback: { 'pt-BR': 'en' },
});
```

**Lazy loading:**

```js
i18n({
  lazyLoading: {
    enabled: true,
    publicPath: '/i18n',
    preloadNamespaces: ['common'],
  },
});
```

## Demo oficial (aún en progreso)

La app en [`demo/`](demo/) cubre es, en y pt-BR con routing, namespaces, pluralizacion, lazy loading, `I18nHead` e islas React. Ver [demo/README.md](demo/README.md).

```bash
cd demo && bun install && bun dev
```

## Entry points

| Entry point                                          | Uso                                                       |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `@gschz/astro-plugin-i18n`                           | API completa (SSR, utilidades server, componentes React). |
| `@gschz/astro-plugin-i18n/client`                    | Solo API segura para browser.                             |
| `@gschz/astro-plugin-i18n/integration`               | Integracion en `astro.config.*`.                          |
| `@gschz/astro-plugin-i18n/schema`                    | Schema Zod (validar opciones en config).                  |
| `@gschz/astro-plugin-i18n/components/I18nText.astro` | Componente SSR de traduccion.                             |
| `@gschz/astro-plugin-i18n/components/I18nHead.astro` | SEO: `hreflang` / Open Graph.                             |
| `@gschz/astro-plugin-i18n/middleware-entrypoint`     | Avanzado; suele registrarse automatico.                   |

## API y componentes

Firmas, middleware, tipos, troubleshooting y ejemplos por API en **[docs/API.md](docs/API.md)**. Version en ingles: [docs/API.en.md](docs/API.en.md).

Resumen:

| Area        | Exportaciones principales                                                          |
| ----------- | ---------------------------------------------------------------------------------- |
| Traduccion  | `t`, `translateAsync`, `useTranslation`, `populateClientCache`                     |
| Idioma      | `getCurrentLanguage`, `changeLanguage`, `bootstrapClientI18n`, `syncLanguageRoute` |
| SSR         | `getI18nClientBootstrapPayload`, `getLanguageRedirect`, `isLanguageSupported`      |
| SEO         | `getAlternateLinks`, `getLocalizedPath`, `getOgLocaleMap` (+ `I18nHead.astro`)     |
| DOM         | `renderDataI18n`, `bindDataI18n` (entrypoint `client`)                             |
| Componentes | `I18nText.astro`, `I18nHead.astro`, `TranslatedText`, `LangToggle`                 |

## Documentacion

- [docs/API.md](docs/API.md) — referencia de API (ES)
- [docs/API.en.md](docs/API.en.md) — API reference (EN)
- [README.en.md](README.en.md) — readme en ingles
- [DeepWiki overview](https://deepwiki.com/gschz/astro-plugin-i18n/)

## Estado del proyecto

Este paquete continua el mantenimiento de la linea publicada como `@hkxdv/astro-plugin-i18n`, ahora bajo **`@gschz/astro-plugin-i18n`**.

Las publicaciones actuales salen de la cuenta [gschz](https://github.com/gschz). Soporte multi-framework (Vue, Svelte, Solid) esta planificado para una version minor futura.
