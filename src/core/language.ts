/**
 * Gestión del idioma activo en @gschz/astro-plugin-i18n.
 *
 * Este módulo es seguro para ejecutarse en el navegador. Centraliza:
 * - La lectura del idioma activo (`getCurrentLanguage`).
 * - El cambio de idioma con persistencia en `localStorage`, cookie y evento.
 * - El bootstrap del sistema i18n en el cliente (`bootstrapClientI18n`).
 * - Los observadores de cambios de idioma (`setupLanguageObserver`).
 *
 * Con virtual module, las traducciones de todos los idiomas se importan
 * estáticamente en `client.ts` y se depositan en la caché del cliente
 * al cargar el módulo, eliminando la necesidad de `fetch()` o de leer
 * `__INITIAL_I18N_ALL_TRANSLATIONS__` desde el HTML.
 */

import type { I18nPluginOptions, Language } from '../types';
import { getConfig, updateConfig } from './config';
import { getPathLanguage, matchSupportedLanguage } from './routing';
import { getLocalizedPath } from './seo';
import { populateClientCache } from './translate';

type RuntimeWindow = typeof globalThis & {
  __INITIAL_I18N_STATE__?: {
    lang?: string;
    translations?: Record<string, any>;
    config?: Partial<I18nPluginOptions>;
  };
};

interface ChangeLanguageOptions {
  syncRoute?: boolean;
}

function getBrowserLanguage(
  localsConfig: Partial<I18nPluginOptions> | undefined,
  globalConfig: I18nPluginOptions,
  supportedLangs: Language[],
): Language | undefined {
  if (!(localsConfig?.autoDetect ?? globalConfig.autoDetect)) {
    return undefined;
  }

  const preferredLanguages =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const candidate of preferredLanguages) {
    const match = matchSupportedLanguage(candidate, supportedLangs);

    if (match) {
      return match;
    }
  }

  return undefined;
}

function getClientLanguage(
  globalConfig: I18nPluginOptions,
  localsConfig: Partial<I18nPluginOptions> | undefined,
): Language | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const docLang = document.documentElement.getAttribute('lang');
  if (docLang) {
    return docLang;
  }

  if (typeof localStorage !== 'undefined') {
    const storedLang =
      localStorage.getItem('language') || localStorage.getItem('lang');
    if (storedLang) {
      return storedLang;
    }
  }

  const supportedLangs = localsConfig?.supportedLangs?.length
    ? localsConfig.supportedLangs
    : (globalConfig.supportedLangs ?? []);
  return getBrowserLanguage(localsConfig, globalConfig, supportedLangs);
}

/**
 * Devuelve el idioma actualmente activo.
 *
 * Prioridad de resolución (de mayor a menor):
 * 1. `locals.i18n.lang` (inyectado por el middleware SSR en cada request).
 * 2. `locals.i18n.config.defaultLang`.
 * 3. Cliente: atributo `lang` del `<html>` → `localStorage` (`"language"`/`"lang"`)
 *    → `navigator.language` / `navigator.languages` (solo si `autoDetect`).
 * 4. `defaultLang` de la config global.
 *
 * @param locals - Objeto `locals` de Astro, disponible en páginas/layouts SSR.
 * @returns Código del idioma activo.
 */
export function getCurrentLanguage(locals?: Record<string, any>): Language {
  const localsLang = locals?.i18n?.lang as Language | undefined;

  if (localsLang) {
    return localsLang;
  }

  const localsConfig = locals?.i18n?.config as
    | Partial<I18nPluginOptions>
    | undefined;

  if (localsConfig?.defaultLang) {
    return localsConfig.defaultLang;
  }

  const globalConfig = getConfig();

  const clientLang = getClientLanguage(globalConfig, localsConfig);
  if (clientLang) {
    return clientLang;
  }

  const defaultLang =
    localsConfig?.defaultLang || globalConfig.defaultLang || 'es';

  return defaultLang;
}

/**
 * Sincroniza la URL del navegador cuando cambia el idioma activo.
 *
 * Usa `history.pushState` para actualizar la ruta sin recargar la página.
 * No-op si la estrategia de routing es `'manual'` o si la URL resultante
 * es idéntica a la actual.
 * Browser-safe (no-op en SSR).
 *
 * @param lang - Idioma al cual sincronizar la ruta.
 */
export function syncLanguageRoute(lang: Language): void {
  if (globalThis.window === undefined) {
    return;
  }

  const config = getConfig();
  const routing = config.routing ?? {
    strategy: 'manual',
    prefixDefaultLocale: false,
    redirectToDefaultLocale: false,
  };

  if (routing.strategy === 'manual') {
    return;
  }

  const nextPathname = getLocalizedPath(
    globalThis.window.location.pathname,
    lang,
    config,
  );
  const nextUrl = new URL(globalThis.window.location.href);
  nextUrl.pathname = nextPathname;

  if (nextUrl.toString() === globalThis.window.location.href) {
    return;
  }

  globalThis.window.history.pushState(
    { i18n: { lang } },
    '',
    nextUrl.toString(),
  );
}

/**
 * Cambia el idioma activo de la aplicación.
 *
 * Actualiza el atributo `lang` del `<html>`, persiste la preferencia en
 * `localStorage` (claves `"language"` y `"lang"` para retrocompatibilidad)
 * y en cookie `i18n-lang` para que el middleware SSR la lea en la siguiente
 * request, y dispara el evento `languagechange` en `document`.
 *
 * Con virtual module, todas las traducciones ya están precargadas en la
 * caché del cliente desde la carga del módulo (`client.ts`), por lo que
 * el cambio es instantáneo sin peticiones de red.
 *
 * @param lang - Código del idioma al que se cambia.
 * @param options - Opciones: `syncRoute` (por defecto `true`).
 */
export async function changeLanguage(
  lang: Language,
  options: ChangeLanguageOptions = {},
): Promise<void> {
  if (typeof document === 'undefined') {
    return;
  }

  applyLanguageChange(lang, options);
}

function applyLanguageChange(
  lang: Language,
  options: ChangeLanguageOptions,
): void {
  document.documentElement.setAttribute('lang', lang);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('language', lang);
    localStorage.setItem('lang', lang);
  }

  document.cookie = `i18n-lang=${encodeURIComponent(lang)}; path=/; SameSite=Lax; max-age=31536000`;

  if (options.syncRoute ?? true) {
    syncLanguageRoute(lang);
  }

  document.dispatchEvent(
    new CustomEvent('languagechange', { detail: { language: lang } }),
  );
}

function resolveInitialLanguage(
  initialState: RuntimeWindow['__INITIAL_I18N_STATE__'] | undefined,
): Language | undefined {
  if (!initialState?.lang) {
    return undefined;
  }

  if (initialState.translations) {
    populateClientCache(initialState.lang, initialState.translations);
  }

  return initialState.lang;
}

function resolveStoredLanguage(
  supportedLangs: Language[],
): Language | undefined {
  const storedLang =
    localStorage.getItem('language') || localStorage.getItem('lang');
  if (storedLang && supportedLangs.includes(storedLang)) {
    return storedLang;
  }

  return undefined;
}

function resolveBrowserLanguage(
  config: I18nPluginOptions,
  supportedLangs: Language[],
  hasInitial: boolean,
  hasStored: boolean,
): Language | undefined {
  if (hasInitial || hasStored || !config.autoDetect) {
    return undefined;
  }

  const browserLang = navigator.language.split('-')[0];
  if (supportedLangs.includes(browserLang)) {
    return browserLang;
  }

  return undefined;
}

/**
 * Determina y aplica el idioma correcto al cargar la página en el cliente.
 *
 * Prioridad de resolución (de mayor a menor):
 * 1. Estado SSR (`__INITIAL_I18N_STATE__.lang`) — hidrata la caché del
 *    cliente con las traducciones SSR.
 * 2. Preferencia guardada en `localStorage` (`"language"` / `"lang"`).
 * 3. Idioma del navegador (`navigator.language`) solo si `autoDetect` está
 *    activo **y** no existe estado SSR ni preferencia guardada.
 * 4. `defaultLang` de la config como fallback.
 *
 * Este orden garantiza que el idioma del servidor nunca sea sobrescrito
 * silenciosamente al hidratar, y que una primera visita sin preferencia
 * use la detección del navegador o el default configurado.
 */
export async function setupLanguage(): Promise<void> {
  if (typeof globalThis === 'undefined' || globalThis.document === undefined) {
    return;
  }

  const runtimeWindow = globalThis as RuntimeWindow;
  const initialState = runtimeWindow.__INITIAL_I18N_STATE__;
  updateConfig(initialState?.config || {});

  const config = getConfig();

  const configuredSupportedLangs =
    config.supportedLangs && config.supportedLangs.length > 0
      ? config.supportedLangs
      : [];

  const supportedLangs = configuredSupportedLangs;

  const fallbackDefaultLang =
    initialState?.lang || supportedLangs[0] || config.defaultLang || 'en';

  const initialLang = resolveInitialLanguage(initialState);
  const storedLang = resolveStoredLanguage(supportedLangs);
  const browserLang = resolveBrowserLanguage(
    config,
    supportedLangs,
    !!initialLang,
    !!storedLang,
  );

  const language =
    initialLang || storedLang || browserLang || fallbackDefaultLang;

  await changeLanguage(language, { syncRoute: false });
}

/**
 * Inicializa el sistema i18n completo en el cliente.
 *
 * Debe llamarse una sola vez al cargar la página (ej. en un `<script>`
 * del layout). Realiza los siguientes pasos:
 * 1. Hidrata la config desde `__INITIAL_I18N_STATE__.config`.
 * 2. Llama a {@link setupLanguage} para determinar y aplicar el idioma.
 * 3. Registra un listener de `popstate` para sincronizar el idioma al
 *    navegar con los botones atrás/adelante del navegador.
 * 4. Dispara el evento `i18nready` en `document` para notificar a los
 *    componentes que el sistema está listo.
 *
 * Las traducciones ya están disponibles en la caché del cliente via
 * virtual module (import estático en `client.ts`), por lo que no necesita
 * leer `__INITIAL_I18N_ALL_TRANSLATIONS__`.
 */
export function bootstrapClientI18n(): void {
  if (typeof globalThis === 'undefined' || globalThis.document === undefined) {
    return;
  }

  const runtimeWindow = globalThis as RuntimeWindow;
  const initialState = runtimeWindow.__INITIAL_I18N_STATE__;
  updateConfig(initialState?.config || {});

  void (async () => {
    await setupLanguage();

    globalThis.window.addEventListener('popstate', () => {
      const config = getConfig();
      const supportedLangs =
        config.supportedLangs && config.supportedLangs.length > 0
          ? config.supportedLangs
          : [config.defaultLang || 'en'];
      const pathLang = getPathLanguage(
        globalThis.window.location.pathname,
        supportedLangs,
      );

      if (pathLang) {
        void changeLanguage(pathLang, { syncRoute: false });
      }
    });

    document.dispatchEvent(
      new CustomEvent('i18nready', {
        detail: { language: getCurrentLanguage() },
      }),
    );
  })();
}

/**
 * Registra un callback que se ejecuta cada vez que el idioma cambia.
 *
 * Internamente escucha el evento `languagechange` disparado por
 * {@link changeLanguage}. Es la base del hook `useTranslation` en React
 * y puede usarse directamente para integrar el sistema con cualquier
 * framework o lógica personalizada.
 *
 * @param callback - Función que recibe el nuevo código de idioma.
 * @returns Función de limpieza que elimina el listener al invocarse.
 *          En SSR devuelve una función vacía (no-op).
 */
export function setupLanguageObserver(
  callback: (lang: Language) => void,
): () => void {
  if (typeof document === 'undefined') {
    return () => {
      /* empty */
    };
  }

  const handleChange = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.language) {
      callback(customEvent.detail.language);
    }
  };

  document.addEventListener('languagechange', handleChange);

  return () => {
    document.removeEventListener('languagechange', handleChange);
  };
}
