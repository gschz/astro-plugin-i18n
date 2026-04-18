# API Reference

Referencia tecnica completa de `@gschz/astro-plugin-i18n`.

## 1. Entry points y limites de entorno

Usa siempre el entry point correcto para evitar errores de bundling en cliente.

| Entry point                                          | Uso                                                               | Comentario                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `@gschz/astro-plugin-i18n`                           | API completa (SSR + cliente compartido + utilidades server/build) | Incluye funciones server-only como carga de archivos de traduccion.    |
| `@gschz/astro-plugin-i18n/client`                    | API segura para browser                                           | Evita que Vite/Rollup intente incluir modulos Node como `fs` y `path`. |
| `@gschz/astro-plugin-i18n/integration`               | Integracion de Astro para `astro.config.*`                        | Export default: `createI18nIntegration`.                               |
| `@gschz/astro-plugin-i18n/components/I18nText.astro` | Componente Astro SSR                                              | Traduccion en servidor sin depender de hidratacion.                    |
| `@gschz/astro-plugin-i18n/middleware-entrypoint`     | Entry point avanzado de middleware                                | Normalmente se registra automatico desde la integracion.               |

## 2. Integracion de Astro

### 2.1 Uso basico

```js
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
      typesOutputPath: './src/types/i18n-types.d.ts',
      missingKeyStrategy: 'key',
    }),
  ],
});
```

### 2.2 Firma

```ts
createI18nIntegration(options?: Partial<I18nPluginOptions>): AstroIntegration
```

### 2.3 Validaciones runtime

La integracion valida al arrancar que:

1. `defaultLang` exista y sea `string`.
2. `supportedLangs` sea array no vacio.
3. `defaultLang` este incluido en `supportedLangs`.

Si alguna condicion falla, lanza `Error`.

### 2.4 Hooks que registra

- `astro:config:setup`
  - inicializa config,
  - persiste opciones en `global.__ASTRO_I18N_OPTIONS__`,
  - genera tipos si aplica,
  - registra middleware `pre` (`@gschz/astro-plugin-i18n/middleware-entrypoint`).
- `astro:server:setup`
  - resincroniza opciones para entorno dev/HMR.
- `astro:build:start` y `astro:build:done`
  - logging de proceso.

## 3. Modelo de opciones (`I18nPluginOptions`)

`I18nPluginOptions` es alias de `TranslationConfig`.

| Opcion               | Tipo                          | Default normalizado             | Requerida en integracion |
| -------------------- | ----------------------------- | ------------------------------- | ------------------------ |
| `defaultLang`        | `Language`                    | `'en'` (via `getConfig`)        | Si                       |
| `supportedLangs`     | `Language[]`                  | `['en']` (via `getConfig`)      | Si                       |
| `translationsDir`    | `string`                      | `'./src/i18n'`                  | No                       |
| `autoDetect`         | `boolean`                     | `true`                          | No                       |
| `generateTypes`      | `boolean`                     | `false`                         | No                       |
| `typesOutputPath`    | `string`                      | `'./src/types/i18n-types.d.ts'` | No                       |
| `missingKeyStrategy` | `'key' \| 'empty' \| 'error'` | `'key'`                         | No                       |

`missingKeyStrategy`:

- `key`: devuelve la clave faltante.
- `empty`: devuelve cadena vacia.
- `error`: loguea error y devuelve `[MISSING: key]`.

## 4. Tipos publicos

Tipos principales exportados:

- `Language`
- `TranslationKey`
- `TranslationValues`
- `TranslationOptions`
- `TranslationConfig`
- `I18nPluginOptions`
- `AstroI18nTypeRegistry`

Contratos base:

```ts
type Language = string;
type TranslationKey = string;

interface TranslationValues {
  [key: string]: string | number | boolean;
}

interface TranslationOptions {
  values?: TranslationValues;
  lang?: Language;
}
```

Nota: `Language` y `TranslationKey` pueden pasar de `string` generico a unions literales cuando se usa `generateTypes`.

## 5. API publica del entry point raiz

Importar desde `@gschz/astro-plugin-i18n`.

### 5.1 Traduccion

```ts
populateClientCache(lang: Language, translations: Record<string, any>): void
t(key: TranslationKey, options?: TranslationOptions): string
translateAsync(key: TranslationKey, options?: TranslationOptions): Promise<string>
useTranslation(): {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: TranslationKey, options?: Omit<TranslationOptions, 'lang'>) => string;
}
```

Notas:

- `t` es sincronica y usa cache cliente.
- `translateAsync` hace import dinamico de `./translations` para no romper bundles cliente.
- `populateClientCache` aplana JSON anidado a claves tipo `lang:path.to.key`.

### 5.2 Gestion de idioma

```ts
getCurrentLanguage(locals?: Record<string, any>): Language
changeLanguage(lang: Language): void
setupLanguage(): void
setupLanguageObserver(callback: (lang: Language) => void): () => void
bootstrapClientI18n(): void
```

Detalles clave:

- `changeLanguage` actualiza `document.documentElement.lang`, persiste en `localStorage` (`language` y `lang`) y emite `languagechange`.
- `setupLanguage` prioriza:
  1. estado SSR (`__INITIAL_I18N_STATE__.lang`),
  2. preferencia de `localStorage` (si esta en soportados),
  3. `navigator.language` (solo con `autoDetect` y sin estado previo),
  4. fallback.
- `bootstrapClientI18n` hidrata cache con `__INITIAL_I18N_ALL_TRANSLATIONS__`, llama `setupLanguage` y emite `i18nready`.

### 5.3 Config runtime

```ts
getConfig(): TranslationConfig
initConfig(options?: Partial<I18nPluginOptions>): TranslationConfig
updateConfig(options?: Partial<I18nPluginOptions>): TranslationConfig
resetConfig(): TranslationConfig
getSupportedLanguages(): Language[]
getDefaultLanguage(): Language
```

Detalles:

- `getConfig` devuelve config normalizada (`defaultLang` y `supportedLangs` nunca vacios).
- `initConfig` y `resetConfig` son especialmente utiles en tests y bootstrap interno.
- `getDefaultLanguage` lanza error si no hay idioma por defecto disponible.

### 5.4 Carga de traducciones (server)

```ts
getTranslationsForLanguage(lang: Language): Promise<Record<string, any>>
loadTranslations(lang: Language): Promise<Record<string, any>>
getTranslation(key: string, lang: Language): Promise<string>
clearTranslationsCache(): void
```

Detalles:

- Lee `${translationsDir}/${lang}.json` con `fs/promises`.
- Cachea por idioma en memoria.
- Si no existe archivo, retorna `{}` y loguea warning.
- Si una clave falta, aplica `missingKeyStrategy`.

### 5.5 Helpers SSR

```ts
reloadTranslations(): void
isLanguageSupported(lang: Language): boolean
getLanguageRedirect(url: URL): URL | null
getI18nClientBootstrapPayload(locals?: Record<string, any>): Promise<I18nClientBootstrapPayload>
```

`I18nClientBootstrapPayload`:

```ts
interface I18nClientBootstrapPayload {
  lang: Language;
  translations: Record<string, any>;
  allTranslations: Record<Language, Record<string, any>>;
  supportedLangs: Language[];
}
```

Notas:

- `reloadTranslations` invalida cache (wrapper de `clearTranslationsCache`).
- `getLanguageRedirect` agrega prefijo de idioma por defecto cuando falta en la ruta.
- `getI18nClientBootstrapPayload` arma payload SSR para inyectar en `window`.

### 5.6 Componentes exportados

```ts
LangToggle;
TranslatedText;
```

### 5.7 Utilidad de build

```ts
generateTranslationTypes(): Promise<string>
```

Retorna ruta de archivo generado o cadena vacia cuando no hay traducciones para el idioma por defecto.

### 5.8 Export de integracion desde raiz

```ts
createI18nIntegration;
```

Tambien disponible como default del entry point `@gschz/astro-plugin-i18n/integration`.

## 6. API del entry point cliente

Importar desde `@gschz/astro-plugin-i18n/client`.

Re-exporta:

- Tipos: `AstroI18nTypeRegistry`, `Language`, `TranslationKey`, `TranslationOptions`, `TranslationValues`
- DOM: `bindDataI18n`, `renderDataI18n`
- Idioma: `bootstrapClientI18n`, `changeLanguage`, `getCurrentLanguage`, `setupLanguage`, `setupLanguageObserver`
- Traduccion: `populateClientCache`, `t`, `useTranslation`

No incluye funciones server-only (`loadTranslations`, `getTranslation`, etc.).

## 7. API declarativa DOM (`data-i18n-*`)

### 7.1 `renderDataI18n`

```ts
renderDataI18n(options?: {
  root?: ParentNode;
  keyAttribute?: string;
  valuesAttribute?: string;
  allowedKeys?: ReadonlyArray<TranslationKey>;
}): void
```

Recorre nodos con atributo de clave y actualiza `textContent` con `t()`.

### 7.2 `bindDataI18n`

```ts
bindDataI18n(options?: {
  root?: ParentNode;
  keyAttribute?: string;
  valuesAttribute?: string;
  allowedKeys?: ReadonlyArray<TranslationKey>;
  waitForReady?: boolean;
  onAfterRender?: (lang: Language) => void;
}): () => void
```

Registra observador de idioma y rerender automatico. Devuelve cleanup.

## 8. Componentes

### 8.1 `I18nText.astro`

Props:

- `key: TranslationKey` (requerida)
- `lang?: Language`
- `values?: TranslationValues`
- `element?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label'`
- `class?: string`
- atributos extra HTML

Comportamiento:

- Traduce en servidor con `translateAsync`.
- Si no pasas `lang`, usa `getCurrentLanguage(Astro.locals)`.
- Inyecta `data-i18n-key` automaticamente.
- Inyecta `data-i18n-values` si recibe `values`.

### 8.2 `TranslatedText` (React)

Props principales:

- `textKey: TranslationKey` (requerida)
- `values?: TranslationValues`
- `as?: React.ElementType` (default: `span`)
- `lang?: Language`
- `fallback?: React.ReactNode`
- `render?: (context) => React.ReactNode`
- atributos HTML (`Omit<React.HTMLAttributes<HTMLElement>, 'children'>`)

Comportamiento:

- Usa hook reactivo cuando `lang` coincide con idioma global.
- Si fuerzas `lang` distinto, usa `t` global para lookup.
- Si `fallback` existe y el resultado coincide con la key, muestra fallback.
- Incluye `React.memo` con comparacion personalizada para reducir rerenders.

### 8.3 `LangToggle` (React)

Props:

- `languages: Array<{ code: Language; label: string }>` (requerida, no vacia)
- `className?: string`
- `currentLang?: Language`

Comportamiento:

- Se sincroniza con `setupLanguageObserver`.
- Llama `changeLanguage` al seleccionar.
- Si `languages` esta vacio, loguea error y retorna `null`.

## 9. Middleware entrypoint

Importable desde `@gschz/astro-plugin-i18n/middleware-entrypoint`.

Exports:

```ts
setOptions(options: Partial<I18nPluginOptions> | null): void
onRequest // default export
```

Efecto principal:

- Inyecta `locals.i18n.config` por request SSR.

Tipado global incluido:

```ts
declare global {
  namespace App {
    interface Locals {
      i18n?: {
        config?: Partial<I18nPluginOptions>;
      };
    }
  }
}
```

## 10. Globals y eventos runtime

Globals esperados en browser:

- `window.__INITIAL_I18N_STATE__`
  - `lang?: string`
  - `translations?: Record<string, any>`
- `window.__INITIAL_I18N_ALL_TRANSLATIONS__`
  - `Record<string, Record<string, any>>`

Eventos emitidos:

- `languagechange`
  - emisor: `document`
  - detalle: `{ language: Language }`
- `i18nready`
  - emisor: `document`
  - detalle: `{ language: Language }`

## 11. Generacion de tipos (`generateTypes`)

Cuando `generateTypes` esta activo, se genera un `.d.ts` con:

1. tipos `Lang` e `I18nKey` basados en traducciones,
2. `I18N_KEYS` como objeto constante,
3. module augmentation para:
   - `@gschz/astro-plugin-i18n`
   - `@gschz/astro-plugin-i18n/client`

Con eso, `Language` y `TranslationKey` quedan tipados como unions literales reales.

## 12. Flujo recomendado SSR + cliente

1. Configura integracion en `astro.config.*`.
2. En layout SSR, usa `getI18nClientBootstrapPayload(Astro.locals)`.
3. Inyecta `__INITIAL_I18N_STATE__` y `__INITIAL_I18N_ALL_TRANSLATIONS__`.
4. Ejecuta `bootstrapClientI18n()` en cliente una vez.
5. Consume traducciones con:
   - `I18nText.astro` (SSR),
   - `TranslatedText` / `useTranslation` (React),
   - `bindDataI18n` (DOM declarativo).

## 13. Troubleshooting

### 13.1 Veo keys en lugar de traducciones

Checklist:

1. El layout inyecta ambos globals (`__INITIAL_I18N_STATE__` y `__INITIAL_I18N_ALL_TRANSLATIONS__`).
2. `bootstrapClientI18n()` se ejecuta en cliente.
3. Existe archivo JSON del idioma esperado.
4. `defaultLang` y `supportedLangs` son coherentes.

### 13.2 Warnings por `fs/path` en frontend

Checklist:

1. En browser, importa desde `@gschz/astro-plugin-i18n/client`.
2. No importes funciones server-only en componentes cliente.
3. Mantener la integracion solo en `astro.config.*`.

### 13.3 Los tipos no se actualizan

Checklist:

1. `generateTypes` esta habilitado.
2. `typesOutputPath` esta dentro de `tsconfig.include`.
3. Reinicia `astro dev` o ejecuta `astro build`.

### 13.4 No quiero mostrar keys faltantes

Opciones:

1. Configurar `missingKeyStrategy: 'empty'`.
2. Usar `fallback` en `TranslatedText` para textos criticos.
