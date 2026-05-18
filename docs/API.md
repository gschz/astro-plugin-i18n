# Referencia de API

Referencia técnica de **`@gschz/astro-plugin-i18n` v1.3.11**.

<p align="center">
  Idioma: <strong>ES</strong> | <a href="API.en.md">EN</a>
</p>

Para instalación, resumen de funciones e inicio rápido, consulta [README.md](../README.md).

---

## Tabla de contenidos

1. [Puntos de entrada](#1-puntos-de-entrada)
2. [Integración](#2-integración)
3. [Configuración (`I18nPluginOptions`)](#3-configuración-i18npluginoptions)
4. [Diseños de archivos de traducción](#4-diseños-de-archivos-de-traducción)
5. [Espacios de nombres (namespaces)](#5-espacios-de-nombres-namespaces)
6. [Pluralización](#6-pluralización)
7. [Respaldo de idioma](#7-respaldo-de-idioma)
8. [Carga diferida](#8-carga-diferida)
9. [Enrutamiento](#9-enrutamiento)
10. [Middleware](#10-middleware)
11. [Tipos públicos](#11-tipos-públicos)
12. [API de traducción](#12-api-de-traducción)
13. [API de idioma](#13-api-de-idioma)
14. [Utilidades SSR](#14-utilidades-ssr)
15. [Utilidades SEO](#15-utilidades-seo)
16. [API DOM (`data-i18n-*`)](#16-api-dom-data-i18n)
17. [Componentes](#17-componentes)
18. [Configuración en tiempo de ejecución](#18-configuración-en-tiempo-de-ejecución)
19. [Carga de traducciones solo en servidor](#19-carga-de-traducciones-solo-en-servidor)
20. [Utilidades de compilación](#20-utilidades-de-compilación)
21. [Punto de entrada del cliente](#21-punto-de-entrada-del-cliente)
22. [Globales y eventos](#22-globales-y-eventos)
23. [Generación de tipos](#23-generación-de-tipos)
24. [Flujo recomendado SSR + cliente](#24-flujo-recomendado-ssr--cliente)
25. [Solución de problemas](#25-solución-de-problemas)

---

## 1. Puntos de entrada

| Punto de entrada                                     | Entorno          | Propósito                                                        |
| ---------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `@gschz/astro-plugin-i18n`                           | SSR + compartido | API pública completa, cargadores de servidor, componentes React. |
| `@gschz/astro-plugin-i18n/client`                    | Navegador        | Subconjunto seguro (sin `fs` / `path`).                          |
| `@gschz/astro-plugin-i18n/integration`               | Compilación      | `createI18nIntegration` para `astro.config.*`.                   |
| `@gschz/astro-plugin-i18n/schema`                    | Compilación      | Esquemas Zod (`i18nPluginOptionsSchema`, …).                     |
| `@gschz/astro-plugin-i18n/components/I18nText.astro` | SSR              | Etiqueta de traducción renderizada en servidor.                  |
| `@gschz/astro-plugin-i18n/components/I18nHead.astro` | SSR              | Etiquetas SEO de enlaces/meta.                                   |
| `@gschz/astro-plugin-i18n/middleware-entrypoint`     | SSR              | Middleware `onRequest` (normalmente registrado automáticamente). |

Los componentes `.astro` **no** se reexportan desde el punto de entrada principal; impórtalos por ruta como se muestra arriba.

---

## 2. Integración

### 2.1 Uso básico

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

### 2.2 Firma

```ts
function createI18nIntegration(options?: Partial<I18nPluginOptions>): AstroIntegration;
```

La exportación por defecto de `@gschz/astro-plugin-i18n/integration` es la misma factoría.

### 2.3 Validación en tiempo de ejecución

Al iniciar, la integración exige:

1. `defaultLang` es una cadena no vacía.
2. `supportedLangs` es un array no vacío.
3. `defaultLang` está incluido en `supportedLangs`.

Si falla, lanza `Error` antes de que el servidor de desarrollo acepte peticiones.

### 2.4 Hooks del ciclo de vida

| Hook                 | Comportamiento                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `astro:config:setup` | Normaliza la configuración, guarda opciones en `global.__ASTRO_I18N_OPTIONS__`, registra middleware `pre`, genera tipos opcionalmente. |
| `astro:server:setup` | Resincroniza opciones del middleware; vigila JSON de traducciones para HMR (invalida caché del servidor).                              |
| `astro:build:start`  | Registro de compilación.                                                                                                               |
| `astro:build:done`   | `auditOnBuild` opcional; escribe bundles de carga diferida en `public` cuando `lazyLoading.enabled`.                                   |

### 2.5 `astro add`

```bash
bun x astro add @gschz/astro-plugin-i18n
```

Las opciones pueden validarse con:

```ts
import { i18nPluginOptionsSchema } from '@gschz/astro-plugin-i18n/schema';

const options = i18nPluginOptionsSchema.parse({
  /* … */
});
```

---

## 3. Configuración (`I18nPluginOptions`)

`I18nPluginOptions` es un alias de `TranslationConfig`.

### 3.1 Opciones de nivel superior

| Opción               | Tipo                          | Predeterminado                  | Descripción                                                                                   |
| -------------------- | ----------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| `defaultLang`        | `Language`                    | `'en'` (normalizado)            | Idioma de respaldo. **Obligatorio** en la integración.                                        |
| `supportedLangs`     | `Language[]`                  | `['en']`                        | Locales activos. **Obligatorio** en la integración.                                           |
| `translationsDir`    | `string`                      | `'./src/i18n'`                  | Ruta a archivo(s) JSON o carpetas por idioma.                                                 |
| `autoDetect`         | `boolean`                     | `true`                          | Usar `navigator.language(s)` en la primera visita del cliente si no hay preferencia guardada. |
| `generateTypes`      | `boolean`                     | `false`                         | Emitir `i18n-types.d.ts` en dev/build.                                                        |
| `typesOutputPath`    | `string`                      | `'./src/types/i18n-types.d.ts'` | Ruta de salida para tipos generados.                                                          |
| `missingKeyStrategy` | `'key' \| 'empty' \| 'error'` | `'key'`                         | Comportamiento cuando falta una clave en todos los idiomas de respaldo.                       |
| `fallback`           | `Record<string, Language>`    | `undefined`                     | Respaldo por idioma antes de `missingKeyStrategy`.                                            |
| `routing`            | `I18nRoutingOptions`          | `strategy: 'manual'`            | Prefijo de URL y comportamiento de redirección.                                               |
| `namespaces`         | `I18nNamespacesOptions`       | `enabled: false`                | Traducciones multiarchivo por idioma.                                                         |
| `pluralization`      | `I18nPluralizationOptions`    | `enabled: true`                 | Resolución de claves con `Intl.PluralRules`.                                                  |
| `lazyLoading`        | `I18nLazyLoadingOptions`      | `enabled: false`                | Bundles públicos por idioma + carga SSR reducida.                                             |
| `auditOnBuild`       | `boolean`                     | `false`                         | Advertir claves faltantes respecto a `defaultLang` tras `astro build`.                        |

### 3.2 `missingKeyStrategy`

| Valor   | Resultado                                      |
| ------- | ---------------------------------------------- |
| `key`   | Devuelve la cadena de la clave.                |
| `empty` | Devuelve `''`.                                 |
| `error` | Registra un error y devuelve `[MISSING: key]`. |

### 3.3 `routing` (`I18nRoutingOptions`)

| Campo                     | Tipo                                              | Predeterminado | Descripción                                                                         |
| ------------------------- | ------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `strategy`                | `'manual' \| 'prefix' \| 'prefix-except-default'` | `'manual'`     | Cómo los prefijos de URL se asocian a idiomas.                                      |
| `prefixDefaultLocale`     | `boolean`                                         | `false`        | Si las URLs del idioma predeterminado incluyen prefijo (con estrategia `prefix`).   |
| `redirectToDefaultLocale` | `boolean`                                         | `false`        | Redirigir rutas sin prefijo al locale predeterminado cuando la estrategia lo exige. |

**Estrategias:**

- **`manual`** — Sin redirecciones automáticas; tú controlas la estructura de URL.
- **`prefix`** — Cada locale usa prefijo en la URL (`/en/about`, `/es/about`).
- **`prefix-except-default`** — El idioma predeterminado no lleva prefijo (`/about` → `es`); los demás usan `/en/about`.

Ejemplo:

```js
routing: {
  strategy: 'prefix-except-default',
  prefixDefaultLocale: false,
  redirectToDefaultLocale: true,
}
```

### 3.4 `namespaces` (`I18nNamespacesOptions`)

| Campo              | Tipo      | Predeterminado | Descripción                                                       |
| ------------------ | --------- | -------------- | ----------------------------------------------------------------- |
| `enabled`          | `boolean` | `false`        | Cargar `translationsDir/<lang>/*.json` en lugar de `<lang>.json`. |
| `defaultNamespace` | `string`  | `'common'`     | Namespace usado cuando la clave no tiene separador.               |
| `separator`        | `string`  | `':'`          | Entre namespace y clave en `t('auth:login.title')`.               |

### 3.5 `pluralization` (`I18nPluralizationOptions`)

| Campo     | Tipo      | Predeterminado | Descripción                                                |
| --------- | --------- | -------------- | ---------------------------------------------------------- |
| `enabled` | `boolean` | `true`         | Resolver claves con sufijo plural antes que la clave base. |
| `field`   | `string`  | `'count'`      | Campo numérico en `values` que determina la forma plural.  |

### 3.6 `lazyLoading` (`I18nLazyLoadingOptions`)

| Campo               | Tipo                                    | Predeterminado | Descripción                                            |
| ------------------- | --------------------------------------- | -------------- | ------------------------------------------------------ |
| `enabled`           | `boolean`                               | `false`        | Activar bundles diferidos y carga SSR reducida.        |
| `strategy`          | `'language' \| 'namespace' \| 'hybrid'` | `'language'`   | Solo `'language'` está plenamente soportado en v1.3.x. |
| `preloadNamespaces` | `string[]`                              | `undefined`    | Namespaces siempre incluidos en la carga SSR inicial.  |
| `publicPath`        | `string`                                | `'/i18n'`      | Ruta URL donde el build escribe bundles JSON.          |

### 3.7 `fallback`

```ts
fallback: {
  fr: 'en',
  'pt-BR': 'en',
}
```

Cuando falta una clave en el idioma activo, el plugin busca la misma clave en el idioma de respaldo antes de aplicar `missingKeyStrategy`.

---

## 4. Diseños de archivos de traducción

### 4.1 Legado (archivo único)

```text
src/i18n/
  en.json
  es.json
```

Las claves usan notación de puntos: `home.title`.

### 4.2 Namespaces (carpeta por idioma)

```text
src/i18n/
  en/
    common.json
    home.json
  es/
    common.json
    home.json
```

Actívalo con `namespaces.enabled: true`. Consulta [Espacios de nombres (namespaces)](#5-espacios-de-nombres-namespaces).

---

## 5. Espacios de nombres (namespaces)

Con namespaces activados:

```ts
t('home:title'); // namespace home, key title
t('common:nav.home'); // nested key in common
t('nav.home'); // → common:nav.home (defaultNamespace)
```

La generación de tipos emite claves en forma `namespace:key` cuando se detectan namespaces.

**Detección automática:** si `translationsDir/<lang>/` existe como directorio con archivos `*.json`, el modo namespace puede cargarse incluso antes de configurarlo explícitamente (véase el cargador de servidor). Aun así, se recomienda `namespaces.enabled: true` para normalización de claves y tipos coherentes.

---

## 6. Pluralización

Define formas plurales en JSON con el patrón de sufijo `{baseKey}_{category}`:

```json
{
  "notifications": {
    "count_zero": "No notifications",
    "count_one": "You have {count} notification",
    "count_other": "You have {count} notifications"
  }
}
```

Uso:

```ts
t('notifications.count', { values: { count: 0 } }); // → count_zero
t('notifications.count', { values: { count: 1 } }); // → count_one
t('notifications.count', { values: { count: 5 } }); // → count_other
```

Las categorías siguen [`Intl.PluralRules`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules): `zero`, `one`, `two`, `few`, `many`, `other`.

- `count === 0` prueba primero `*_zero`, luego recurre a las reglas plurales.
- Si no existe clave plural, el resolvedor recurre a la clave base (`notifications.count`).
- Desactívalo con `pluralization: { enabled: false }`.
- Campo contador personalizado: `pluralization: { field: 'n' }` y `values: { n: 3 }`.

---

## 7. Respaldo de idioma

Orden de resolución para una clave faltante:

1. Bundle del idioma activo.
2. Idioma de `fallback[activeLang]` (si está configurado).
3. `missingKeyStrategy`.

Funciona en cachés de servidor (`translateAsync`, `getTranslation`) y cliente (`t`).

---

## 8. Carga diferida

Cuando `lazyLoading.enabled` es `true`:

1. **SSR** — `getI18nClientBootstrapPayload()` devuelve solo el idioma actual (y `preloadNamespaces` opcional); `allTranslations` es `{}`.
2. **Build** — JSON fusionado por idioma se escribe bajo `public<i18n/publicPath>/`.
3. **Cliente** — `changeLanguage(lang)` obtiene `/{publicPath}/{lang}.json` si ese idioma no está en caché, luego actualiza la UI.

Ejemplo:

```js
lazyLoading: {
  enabled: true,
  publicPath: '/i18n',
  preloadNamespaces: ['common'],
}
```

Sobrescribe namespaces para un layout concreto:

```ts
await getI18nClientBootstrapPayload(Astro.locals, {
  preloadNamespaces: ['common', 'home'],
});
```

En desarrollo, la integración sirve archivos bundle mediante middleware de Vite sin un rebuild completo.

---

## 9. Enrutamiento

Funciones públicas (también usadas internamente por el middleware):

| Función                                 | Descripción                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `getLanguageRedirect(url)`              | Devuelve `URL` de redirección o `null` según la configuración de enrutamiento activa. |
| `getLocalizedPath(path, lang, config?)` | Construye una ruta para el idioma destino respetando la estrategia.                   |
| `syncLanguageRoute(lang)`               | Actualiza `window.location` para coincidir con el idioma (cliente).                   |

`changeLanguage()` establece la cookie `i18n-lang` y llama a `syncLanguageRoute()` por defecto para alinear URL y contenido.

---

## 10. Middleware

Registrado automáticamente con orden `"pre"` desde `@gschz/astro-plugin-i18n/middleware-entrypoint`.

### 10.1 Comportamiento por petición

1. **Redirección de enrutamiento** — si `getRoutingRedirect()` devuelve una URL, responde con `302`.
2. **Resolución de idioma** (prioridad):
   1. Primer segmento de URL que coincida con `supportedLangs` (p. ej. `/en/about` → `en`).
   2. Cookie `i18n-lang`.
   3. Cabecera `Accept-Language` (se respetan los valores de calidad).
   4. `defaultLang`.
3. **Inyección en locals** — establece `locals.i18n.lang` y `locals.i18n.config`.

### 10.2 Tipado de `Astro.locals`

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

Usa `getCurrentLanguage(Astro.locals)` en archivos `.astro` en lugar de leer `locals` directamente cuando sea posible.

### 10.3 Avanzado: `setOptions`

```ts
import { setOptions } from '@gschz/astro-plugin-i18n/middleware-entrypoint';
```

Normalmente lo invoca la integración; útil en pruebas o configuraciones de middleware personalizadas.

---

## 11. Tipos públicos

Exportados desde `@gschz/astro-plugin-i18n` y `@gschz/astro-plugin-i18n/client` (subconjunto):

| Tipo                                                | Descripción                                       |
| --------------------------------------------------- | ------------------------------------------------- |
| `Language`                                          | Código de locale (`string` o unión generada).     |
| `TranslationKey`                                    | Ruta de clave (`string` o unión generada).        |
| `TranslationValues`                                 | `{ [key: string]: string \| number \| boolean }`. |
| `TranslationOptions`                                | `{ values?, lang? }`.                             |
| `TranslationConfig` / `I18nPluginOptions`           | Configuración completa del plugin.                |
| `I18nRoutingOptions`, `I18nRoutingStrategy`         | Configuración de enrutamiento.                    |
| `I18nNamespacesOptions`                             | Configuración de namespaces.                      |
| `I18nPluralizationOptions`                          | Configuración de pluralización.                   |
| `I18nLazyLoadingOptions`, `I18nLazyLoadingStrategy` | Configuración de carga diferida.                  |
| `AstroI18nTypeRegistry`                             | Ampliado por `i18n-types.d.ts` generado.          |
| `I18nClientBootstrapPayload`                        | Forma del bootstrap SSR (desde módulo de setup).  |
| `TranslationCoverageResult`                         | Resultado de auditoría en build (servidor).       |
| `DataI18nBinderOptions`, `DataI18nRenderOptions`    | Opciones de utilidades DOM.                       |

Contratos base:

```ts
interface TranslationOptions {
  values?: TranslationValues;
  lang?: Language;
}
```

Con `generateTypes: true`, `Language` y `TranslationKey` pasan a ser uniones literales mediante ampliación de módulo.

---

## 12. API de traducción

Importa desde `@gschz/astro-plugin-i18n` (SSR) o `@gschz/astro-plugin-i18n/client` (navegador).

### `t(key, options?)`

Traducción síncrona usando la caché del cliente. Soporta interpolación, namespaces, pluralización, respaldo y anulación de `lang`.

```ts
t('greeting', { values: { name: 'Alex' } });
t('home:title', { lang: 'es' });
```

### `translateAsync(key, options?)`

Resolvedor asíncrono solo en servidor (lee sistema de archivos / caché del servidor). No lo llames desde bundles del navegador.

```astro
---
const title = await translateAsync('home:title', { lang: getCurrentLanguage(Astro.locals) });
---
```

### `populateClientCache(lang, translations)`

Aplana JSON anidado en la caché del cliente (uso interno de bootstrap y fetch diferido).

### `useTranslation()`

Hook de React (peer opcional `react`):

```ts
const { language, changeLanguage, t } = useTranslation();
```

Devuelve `changeLanguage` como `async` cuando la carga diferida puede obtener bundles.

---

## 13. API de idioma

### `getCurrentLanguage(locals?)`

Resuelve el idioma activo:

- **SSR:** `locals.i18n.lang` → predeterminado de la configuración.
- **Cliente:** `<html lang>` → `localStorage` → estado inicial SSR → detección del navegador (si `autoDetect`) → predeterminado.

### `changeLanguage(lang, options?)`

Actualiza `<html lang>`, `localStorage`, cookie `i18n-lang`, emite `languagechange`, obtiene bundle diferido opcionalmente y sincroniza la ruta (`syncRoute: true` por defecto).

```ts
await changeLanguage('en');
await changeLanguage('en', { syncRoute: false });
```

### `setupLanguage()`

Aplica idioma guardado / detectado al arranque (lo invoca `bootstrapClientI18n`).

### `setupLanguageObserver(callback)`

```ts
const unsubscribe = setupLanguageObserver((lang) => {
  console.log('language changed', lang);
});
```

### `bootstrapClientI18n()`

Hidrata la caché desde `window.__INITIAL_I18N_*`, ejecuta `setupLanguage()`, despacha `i18nready`.

### `syncLanguageRoute(lang)`

Solo cliente; navega a la ruta localizada para `lang` según la estrategia de enrutamiento actual.

---

## 14. Utilidades SSR

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

Indica si `lang` está en `supportedLangs`.

### `getLanguageRedirect(url)`

Envoltorio de la lógica de redirección de enrutamiento para middleware personalizado.

### `reloadTranslations()`

Vacía la caché de traducciones del servidor (dev/pruebas).

---

## 15. Utilidades SEO

| Función                                     | Descripción                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `getAlternateLinks(path, siteUrl, config?)` | `{ lang, href }[]` para enlaces `hreflang`.                             |
| `getXDefaultHref(path, siteUrl, config?)`   | URL para `hreflang="x-default"`.                                        |
| `getLocalizedPath(path, lang, config?)`     | Ruta localizada.                                                        |
| `getOgLocaleMap(supportedLangs?)`           | Mapa de códigos de idioma a locales Open Graph (p. ej. `es` → `es_ES`). |
| `langToOgLocale(lang)`                      | Cadena de locale OG para un idioma.                                     |

Prefiere **`I18nHead.astro`** en layouts para etiquetas estándar (véase [Componentes](#17-componentes)).

---

## 16. API DOM (`data-i18n-*`)

Solo en el punto de entrada del cliente.

### `renderDataI18n(options?)`

Escanea `data-i18n-key` (predeterminado) y asigna `textContent` mediante `t()`.

```html
<span data-i18n-key="nav.home"></span> <span data-i18n-key="greeting" data-i18n-values='{"name":"Ana"}'></span>
```

Opciones: `root`, `keyAttribute`, `valuesAttribute`, `allowedKeys`.

### `bindDataI18n(options?)`

Llama a `renderDataI18n` al montar y en cada `languagechange`. Devuelve función para cancelar suscripción.

```ts
bindDataI18n({ waitForReady: true });
```

---

## 17. Componentes

### 17.1 `I18nText.astro`

```astro
---
import I18nText from '@gschz/astro-plugin-i18n/components/I18nText.astro';
---

<I18nText key="home:title" element="h1" class="title" />
<I18nText key="greeting" values={{ name: 'Ana' }} />
```

| Prop      | Tipo                    | Descripción                                                      |
| --------- | ----------------------- | ---------------------------------------------------------------- |
| `key`     | `TranslationKey`        | Obligatoria.                                                     |
| `lang`    | `Language`              | Anulación; por defecto desde `getCurrentLanguage(Astro.locals)`. |
| `values`  | `TranslationValues`     | Interpolación / campo plural.                                    |
| `element` | nombre de etiqueta HTML | Etiqueta contenedora por defecto.                                |
| `class`   | `string`                | Clase CSS.                                                       |

Añade `data-i18n-key` y `data-i18n-values` opcional para re-render en cliente.

### 17.2 `I18nHead.astro`

```astro
---
import I18nHead from '@gschz/astro-plugin-i18n/components/I18nHead.astro';
---

<I18nHead currentLang={lang} currentPath={Astro.url.pathname} siteUrl="https://example.com" />
```

| Prop              | Tipo                     | Predeterminado              | Descripción                             |
| ----------------- | ------------------------ | --------------------------- | --------------------------------------- |
| `currentLang`     | `Language`               | desde `locals`              | Locale activo.                          |
| `currentPath`     | `string`                 | `Astro.url.pathname`        | Ruta usada para construir alternativas. |
| `siteUrl`         | `string`                 | `Astro.site` / origin       | Origen absoluto del sitio.              |
| `localeMap`       | `Record<string, string>` | auto desde `getOgLocaleMap` | Mapa de locales Open Graph.             |
| `includeXDefault` | `boolean`                | `true`                      | Emitir `hreflang="x-default"`.          |

Salida: `<link rel="alternate" hreflang="…">`, `x-default` opcional, `<meta property="og:locale">`, `og:locale:alternate`.

### 17.3 `TranslatedText` (React)

```tsx
<TranslatedText textKey="home:title" as="h1" values={{ name: 'Ana' }} />
```

| Prop       | Descripción                                                               |
| ---------- | ------------------------------------------------------------------------- |
| `textKey`  | Clave de traducción obligatoria.                                          |
| `values`   | Valores de interpolación / plural.                                        |
| `as`       | Tipo de elemento (predeterminado `span`).                                 |
| `lang`     | Forzar idioma de búsqueda (omite el hook reactivo si difiere del global). |
| `fallback` | Nodo React si el resultado coincide con la clave sin traducir.            |
| `render`   | Prop de renderizado personalizado.                                        |

### 17.4 `LangToggle` (React)

```tsx
<LangToggle
  languages={[
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' },
  ]}
/>
```

| Prop          | Descripción                          |
| ------------- | ------------------------------------ |
| `languages`   | Lista obligatoria no vacía.          |
| `currentLang` | Código actual controlado (opcional). |
| `className`   | Clase del contenedor.                |

Usa `changeLanguage` y mantiene la selección sincronizada con `setupLanguageObserver`.

---

## 18. Configuración en tiempo de ejecución

| Función                   | Descripción                                      |
| ------------------------- | ------------------------------------------------ |
| `getConfig()`             | Configuración activa normalizada.                |
| `initConfig(partial?)`    | Inicializa el singleton (pruebas/bootstrap).     |
| `updateConfig(partial?)`  | Fusiona opciones parciales.                      |
| `resetConfig()`           | Restablece valores predeterminados.              |
| `getSupportedLanguages()` | Array `supportedLangs`.                          |
| `getDefaultLanguage()`    | `defaultLang` (lanza error si no está definido). |

---

## 19. Carga de traducciones solo en servidor

Importa solo desde `@gschz/astro-plugin-i18n` en contextos de servidor.

| Función                            | Descripción                                              |
| ---------------------------------- | -------------------------------------------------------- |
| `loadTranslations(lang)`           | Carga y cachea el bundle completo de `lang`.             |
| `getTranslationsForLanguage(lang)` | Igual que load (patrón alias en el código).              |
| `getTranslation(key, lang)`        | Resuelve una clave en servidor.                          |
| `clearTranslationsCache()`         | Invalida la caché en memoria.                            |
| `auditTranslationCoverage()`       | Compara claves entre idiomas (usado con `auditOnBuild`). |

El diseño legado lee `${translationsDir}/${lang}.json`. El diseño con namespaces lee todos los `*.json` en `${translationsDir}/${lang}/`.

---

## 20. Utilidades de compilación

### `generateTranslationTypes()`

Devuelve la ruta del archivo de salida, o `''` si el idioma predeterminado no tiene traducciones. Se dispara automáticamente con `generateTypes: true`.

### Registro de depuración

Establece `ASTRO_I18N_DEBUG=1` para registrar enrutamiento, middleware y detalles de resolución de idioma.

---

## 21. Punto de entrada del cliente

`@gschz/astro-plugin-i18n/client` exporta:

- Tipos: `Language`, `TranslationKey`, `TranslationOptions`, `TranslationValues`, tipos de opciones de namespace/plural/lazy, `AstroI18nTypeRegistry`
- `t`, `populateClientCache`, `useTranslation`
- `getCurrentLanguage`, `changeLanguage`, `setupLanguage`, `setupLanguageObserver`, `bootstrapClientI18n`, `syncLanguageRoute`
- `getConfig`, `getSupportedLanguages`
- `renderDataI18n`, `bindDataI18n`

**No** exporta: `translateAsync`, `loadTranslations`, `getTranslation`, `getI18nClientBootstrapPayload`, utilidades SEO, `createI18nIntegration`, `auditTranslationCoverage`.

---

## 22. Globales y eventos

### Globales de `window`

```ts
window.__INITIAL_I18N_STATE__ = {
  lang?: string;
  translations?: Record<string, any>;
  config?: Partial<I18nPluginOptions>;
};

window.__INITIAL_I18N_ALL_TRANSLATIONS__?: Record<string, Record<string, any>>;
```

### Eventos (`document`)

| Evento           | `detail`                 |
| ---------------- | ------------------------ |
| `languagechange` | `{ language: Language }` |
| `i18nready`      | `{ language: Language }` |

---

## 23. Generación de tipos

Con `generateTypes: true`, la integración escribe un archivo `.d.ts` que contiene:

1. Uniones literales `Lang` e `I18nKey` desde JSON.
2. Objeto constante `I18N_KEYS`.
3. Ampliación de módulo para `@gschz/astro-plugin-i18n` y `@gschz/astro-plugin-i18n/client`.

Asegúrate de que `typesOutputPath` esté en el array `include` de tu `tsconfig.json`.

---

## 24. Flujo recomendado SSR + cliente

1. Configura `i18n()` en `astro.config.*`.
2. Estructura páginas según tu `routing.strategy` (p. ej. `src/pages/[lang]/…`).
3. En el layout raíz: `getI18nClientBootstrapPayload(Astro.locals)` + script inline + `bootstrapClientI18n()`.
4. Añade `<I18nHead />` para SEO.
5. Traduce contenido con `I18nText.astro`, `translateAsync` o componentes React.
6. Opcional: `bindDataI18n()` para markup estático con `data-i18n-*`.
7. Activa `auditOnBuild` en CI para detectar claves faltantes.

---

## 25. Solución de problemas

### Aparecen claves en lugar de traducciones

1. El layout inyecta `__INITIAL_I18N_STATE__` y ejecuta `bootstrapClientI18n()`.
2. Existe JSON para el idioma resuelto.
3. `defaultLang` / `supportedLangs` coinciden con tus archivos (incluida la capitalización de `pt-BR`).
4. Con namespaces, las claves usan `namespace:key` o dependen de `defaultNamespace`.

### Advertencias de `fs` / `path` en el bundle del cliente

Importa código del navegador desde `@gschz/astro-plugin-i18n/client`, no desde el punto de entrada raíz.

### Desajuste de idioma tras el conmutador

Configura `routing` y no llames a `changeLanguage` con `{ syncRoute: false }` salvo que sea intencional.

### Carga diferida: traducciones vacías tras el cambio

1. `lazyLoading.enabled` es `true`.
2. `astro build` generó archivos bajo `publicPath` (p. ej. `public/i18n/en.json`).
3. En dev, el middleware de desarrollo de la integración está activo (predeterminado con la integración).

### Los tipos no se actualizan

Reinicia `astro dev` o ejecuta `astro build` tras cambiar JSON; confirma que `typesOutputPath` está en `include` del `tsconfig`.

### Ocultar claves faltantes en producción

Usa `missingKeyStrategy: 'empty'` o configura `fallback` para locales incompletos.
