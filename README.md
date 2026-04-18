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
  Idioma: <strong>ES</strong> | <a href="README.en.md">EN</a>
</p>

Plugin de internacionalizacion (i18n) para Astro, orientado a simplicidad, arquitectura SSR-first y actualizacion reactiva en cliente.

## Caracteristicas

- SSR-first: evita FOUC y mejora SEO resolviendo traducciones desde servidor.
- API separada por entorno: import seguro para browser via entrypoint dedicado `client`.
- Cache en servidor y cliente para reducir I/O y costo de traduccion.
- Integracion nativa con Astro (`integration` + middleware `pre`).
- Soporte para React (`useTranslation`, `TranslatedText`, `LangToggle`).
- Render declarativo en DOM con atributos `data-i18n-*`.
- Generacion opcional de tipos literales de idioma y keys desde JSON (`generateTypes`).

## Requisitos

- Astro `>=6.0.0`
- React `>=19.0.0` (opcional)
- Bun `>=1.3.0` recomendado para desarrollo/publicacion

## Instalacion

```bash
bun add @gschz/astro-plugin-i18n@latest
```

## Inicio rapido

### 1. Configurar integracion

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
      autoDetect: true,
      generateTypes: true,
      missingKeyStrategy: 'key',
    }),
  ],
});
```

### 2. Crear archivos de traduccion

```text
src/
  i18n/
    es.json
    en.json
```

Ejemplo rapido:

```json
{
  "home": {
    "title": "Bienvenido"
  }
}
```

### 3. Inyectar bootstrap SSR en tu layout

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

### 4. Consumir traducciones

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
      <button onClick={() => changeLanguage('en')}>EN</button>
    </header>
  );
}
```

> [!NOTE]
> Para codigo que corre en browser, importa desde `@gschz/astro-plugin-i18n/client`.
> Esto evita que el bundler arrastre modulos Node.js por error.

## Arquitectura resumida

- Server/build: carga traducciones desde disco, gestiona config y genera tipos.
- Middleware: inyecta config i18n en `Astro.locals` por request SSR.
- Cliente: hidrata cache desde payload SSR, sincroniza idioma y rerenderiza UI.

## Entry points

| Entry point                                          | Uso recomendado                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `@gschz/astro-plugin-i18n`                           | API completa (SSR + cliente compartido + utilidades server/build).         |
| `@gschz/astro-plugin-i18n/client`                    | API segura para browser (sin modulos server-only).                         |
| `@gschz/astro-plugin-i18n/integration`               | Integracion para `astro.config.*`.                                         |
| `@gschz/astro-plugin-i18n/components/I18nText.astro` | Componente Astro SSR.                                                      |
| `@gschz/astro-plugin-i18n/middleware-entrypoint`     | Entry point avanzado para middleware (normalmente se registra automatico). |

## Opciones de configuracion

| Opcion               | Tipo                          | Default                            | Requerida en integracion |
| -------------------- | ----------------------------- | ---------------------------------- | ------------------------ |
| `defaultLang`        | `string`                      | `en` (normalizado por runtime)     | Si                       |
| `supportedLangs`     | `string[]`                    | `['en']` (normalizado por runtime) | Si                       |
| `translationsDir`    | `string`                      | `./src/i18n`                       | No                       |
| `autoDetect`         | `boolean`                     | `true`                             | No                       |
| `generateTypes`      | `boolean`                     | `false`                            | No                       |
| `typesOutputPath`    | `string`                      | `./src/types/i18n-types.d.ts`      | No                       |
| `missingKeyStrategy` | `'key' \| 'empty' \| 'error'` | `'key'`                            | No                       |

`missingKeyStrategy`:

- `key`: devuelve la key.
- `empty`: devuelve cadena vacia.
- `error`: registra error y devuelve `[MISSING: key]`.

## API principal

Funciones de uso frecuente:

- Traduccion: `t`, `translateAsync`, `useTranslation`, `populateClientCache`.
- Idioma: `getCurrentLanguage`, `changeLanguage`, `setupLanguage`, `bootstrapClientI18n`.
- DOM declarativo: `renderDataI18n`, `bindDataI18n` (via entrypoint `client`).
- SSR helpers: `getI18nClientBootstrapPayload`, `isLanguageSupported`, `getLanguageRedirect`.
- Config runtime: `getConfig`, `initConfig`, `updateConfig`, `resetConfig`.

## Componentes

- `I18nText.astro`: traduccion SSR en templates Astro.
- `TranslatedText`: traduccion reactiva para React.
- `LangToggle`: selector visual de idioma para React.

## Documentacion

Referencia del proyecto:

- [docs/API.md](docs/API.md)

DeepWiki:

- [Overview](https://deepwiki.com/gschz/astro-plugin-i18n/1-overview)
- [Getting Started](https://deepwiki.com/gschz/astro-plugin-i18n/1.1-getting-started)
- [Project Structure and Build Pipeline](https://deepwiki.com/gschz/astro-plugin-i18n/1.2-project-structure-and-build-pipeline)

## Estado del proyecto

Este paquete continua el mantenimiento de una linea publicada previamente como `@hkxdv/astro-plugin-i18n`, ahora bajo `@gschz/astro-plugin-i18n`.

Publicaciones actuales y futuras: cuenta `gschz`.
