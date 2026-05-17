/**
 * Gestión del idioma activo en @gschz/astro-plugin-i18n.
 *
 * Este módulo es seguro para ejecutarse en el navegador. Centraliza:
 * - La lectura del idioma activo (`getCurrentLanguage`).
 * - El cambio de idioma con persistencia en `localStorage` y atributo `lang` en `<html>`.
 * - El bootstrap del sistema i18n en el cliente (`bootstrapClientI18n`).
 * - Los observadores de cambios de idioma (`setupLanguageObserver`).
 */

import type { I18nPluginOptions, Language } from '../types';
import { getConfig, updateConfig } from './config';
import { getPathLanguage, matchSupportedLanguage } from './routing';
import { getLocalizedPath } from './seo';
import { populateClientCache } from './translate';
import { debugLog } from '../utils/debug';

/**
 * Extensión del objeto `window` con los globals que el servidor Astro inyecta
 * mediante un `<script>` inline en el layout.
 *
 * - `__INITIAL_I18N_STATE__`: idioma SSR + traducciones del idioma inicial.
 * - `__INITIAL_I18N_ALL_TRANSLATIONS__`: mapa completo de todos los idiomas
 *   para que el cliente pueda cambiar de idioma sin peticiones adicionales.
 */
type RuntimeWindow = typeof globalThis & {
  __INITIAL_I18N_STATE__?: {
    lang?: string;
    translations?: Record<string, any>;
    config?: Partial<I18nPluginOptions>;
  };
  __INITIAL_I18N_ALL_TRANSLATIONS__?: Record<string, Record<string, any>>;
  /** Idiomas cuyo bundle JSON lazy ya se fusionó por completo en cliente (modo SSR parcial). */
  __ASTRO_I18N_LAZY_FULL_LANGS__?: Set<string>;
};

interface ChangeLanguageOptions {
  syncRoute?: boolean;
}

/**
 * Obtiene el idioma del navegador si autoDetect está habilitado.
 *
 * @param localsConfig - Configuración local de Astro.
 * @param globalConfig - Configuración global del plugin.
 * @returns Código del idioma del navegador o undefined.
 */
function getBrowserLanguage(
  localsConfig: Partial<I18nPluginOptions> | undefined,
  globalConfig: I18nPluginOptions,
  supportedLangs: Language[],
): Language | undefined {
  if (!(localsConfig?.autoDetect ?? globalConfig.autoDetect)) {
    return undefined;
  }

  const preferredLanguages =
    Array.isArray(navigator.languages) && navigator.languages.length > 0 ? navigator.languages : [navigator.language];

  for (const candidate of preferredLanguages) {
    const match = matchSupportedLanguage(candidate, supportedLangs);

    if (match) {
      return match;
    }
  }

  return undefined;
}

/**
 * Obtiene el idioma desde el navegador en orden de prioridad.
 *
 * @param globalConfig - Configuración global del plugin.
 * @param localsConfig - Configuración local de Astro.
 * @returns Código del idioma o undefined si no se encuentra en el navegador.
 */
function getClientLanguage(
  globalConfig: I18nPluginOptions,
  localsConfig: Partial<I18nPluginOptions> | undefined,
): Language | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  // Prioridad 1: atributo lang del elemento raíz (puesto por changeLanguage).
  const docLang = document.documentElement.getAttribute('lang');
  if (docLang) {
    return docLang;
  }

  // Prioridad 2: preferencia guardada por el usuario en una sesión anterior.
  if (typeof localStorage !== 'undefined') {
    const storedLang = localStorage.getItem('language') || localStorage.getItem('lang');
    if (storedLang) {
      return storedLang;
    }
  }

  // Prioridad 3: detección automática por navigator.language (solo si autoDetect).
  const supportedLangs = localsConfig?.supportedLangs?.length
    ? localsConfig.supportedLangs
    : (globalConfig.supportedLangs ?? []);
  return getBrowserLanguage(localsConfig, globalConfig, supportedLangs);
}

/**
 * Devuelve el idioma actualmente activo.
 *
 * En contexto de servidor usa `locals.i18n.config.defaultLang` o bien la
 * configuración global. En el navegador consulta primero el atributo `lang`
 * del `<html>`, luego `localStorage`, y finalmente el idioma por defecto.
 *
 * @param locals - Objeto `locals` de Astro, disponible en páginas/layouts SSR.
 * @returns Código del idioma activo.
 */
export function getCurrentLanguage(locals?: Record<string, any>): Language {
  // En SSR el middleware puede resolver el idioma por request y publicarlo en locals.
  const localsLang = locals?.i18n?.lang as Language | undefined;

  if (localsLang) {
    return localsLang;
  }

  // Fallback SSR: usar configuración inyectada por middleware.
  const localsConfig = locals?.i18n?.config as Partial<I18nPluginOptions> | undefined;

  if (localsConfig?.defaultLang) {
    return localsConfig.defaultLang;
  }

  const globalConfig = getConfig();

  const clientLang = getClientLanguage(globalConfig, localsConfig);
  if (clientLang) {
    return clientLang;
  }

  const defaultLang = localsConfig?.defaultLang || globalConfig.defaultLang || 'es';

  if (!globalConfig.defaultLang && !localsConfig?.defaultLang) {
    console.debug('[i18n] Usando idioma por defecto:', defaultLang);
  }

  return defaultLang;
}

/**
 * Sincroniza la URL del navegador cuando cambia el idioma activo.
 *
 * Esta función es browser-safe y se utiliza internamente en `changeLanguage()`
 * cuando `syncRoute` es verdadero (default). También puede usarse directamente
 * si se requiere control manual sobre cuándo sincronizar la ruta.
 *
 * Si la estrategia de routing es 'manual', no hace nada.
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

  const nextPathname = getLocalizedPath(globalThis.window.location.pathname, lang, config);
  const nextUrl = new URL(globalThis.window.location.href);
  nextUrl.pathname = nextPathname;

  if (nextUrl.toString() === globalThis.window.location.href) {
    return;
  }

  globalThis.window.history.pushState({ i18n: { lang } }, '', nextUrl.toString());
}

/**
 * Cambia el idioma activo de la aplicación.
 *
 * Actualiza el atributo `lang` del `<html>`, persiste la preferencia en
 * `localStorage` con dos claves (`"language"` y `"lang"` para compatibilidad)
 * y dispara el evento `languagechange` en `document` para que los observadores
 * puedan reaccionar y re-renderizar los componentes afectados.
 *
 * @param lang - Código del idioma al que se cambia.
 * @param options - Opciones para cambiar el idioma.
 */
export async function changeLanguage(lang: Language, options: ChangeLanguageOptions = {}): Promise<void> {
  // No-op en SSR; este módulo opera únicamente en el navegador.
  if (typeof document === 'undefined') {
    return;
  }

  const config = getConfig();

  if (config.lazyLoading?.enabled) {
    if (config.lazyLoading.strategy && config.lazyLoading.strategy !== 'language') {
      debugLog(
        `[changeLanguage] lazyLoading.strategy="${config.lazyLoading.strategy}" no soportada, usando "language".`,
      );
    }

    if (needsLazyLanguageFetch(lang, config)) {
      const loaded = await fetchLanguageBundle(lang, config);
      if (!loaded) {
        return;
      }
    }
  }

  applyLanguageChange(lang, options);
}

function applyLanguageChange(lang: Language, options: ChangeLanguageOptions): void {
  document.documentElement.setAttribute('lang', lang);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('language', lang);
    localStorage.setItem('lang', lang);
  }

  // Escribir cookie para que el middleware SSR pueda leer la preferencia del usuario
  // en la siguiente petición, antes de que el JS se ejecute en el cliente.
  document.cookie = `i18n-lang=${encodeURIComponent(lang)}; path=/; SameSite=Lax; max-age=31536000`;

  if (options.syncRoute ?? true) {
    syncLanguageRoute(lang);
  }

  document.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } }));
}

function getClientCache(): Record<string, string> {
  const runtimeGlobal = globalThis as RuntimeWindow & {
    __ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__?: Record<string, string>;
  };

  return runtimeGlobal.__ASTRO_I18N_CLIENT_TRANSLATIONS_CACHE__ ?? {};
}

function isLanguageInCache(lang: Language): boolean {
  const cache = getClientCache();
  return Object.keys(cache).some((key) => key.startsWith(`${lang}:`));
}

function usesLazyPartialSSR(config: ReturnType<typeof getConfig>): boolean {
  if (!config.lazyLoading?.enabled) {
    return false;
  }

  const preload = config.lazyLoading.preloadNamespaces;
  return config.namespaces?.enabled === true && Array.isArray(preload) && preload.length > 0;
}

function getLazyFullyLoadedLangs(): Set<string> {
  const runtimeWindow = globalThis as RuntimeWindow;

  runtimeWindow.__ASTRO_I18N_LAZY_FULL_LANGS__ ??= new Set();

  return runtimeWindow.__ASTRO_I18N_LAZY_FULL_LANGS__;
}

function markLazyLangFullyLoaded(lang: Language): void {
  getLazyFullyLoadedLangs().add(lang);
}

/**
 * Determina si hay que pedir el bundle JSON del idioma por red.
 *
 * Con SSR parcial (`preloadNamespaces`), el servidor solo hidrata algunos namespaces;
 * la caché ya tiene prefijo `lang:` pero el bundle sigue incompleto hasta el fetch.
 */
function needsLazyLanguageFetch(lang: Language, config: ReturnType<typeof getConfig>): boolean {
  if (!config.lazyLoading?.enabled) {
    return false;
  }

  if (usesLazyPartialSSR(config)) {
    return !getLazyFullyLoadedLangs().has(lang);
  }

  return !isLanguageInCache(lang);
}

function normalizePublicPath(publicPath: string): string {
  const trimmed = publicPath.trim().length > 0 ? publicPath.trim() : '/i18n';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '');
}

async function fetchLanguageBundle(lang: Language, config: ReturnType<typeof getConfig>): Promise<boolean> {
  const publicPath = normalizePublicPath(config.lazyLoading?.publicPath ?? '/i18n');
  const bundleUrl = `${publicPath}/${encodeURIComponent(lang)}.json`;

  try {
    const response = await fetch(bundleUrl);
    if (!response.ok) {
      console.error(`[i18n] Failed to load translations for "${lang}": ${response.statusText}`);
      return false;
    }

    const bundledTranslations = (await response.json()) as Record<string, any>;
    populateClientCache(lang, bundledTranslations);
    markLazyLangFullyLoaded(lang);
    return true;
  } catch (error) {
    console.error(`[i18n] Failed to load translations for "${lang}":`, error);
    return false;
  }
}

/**
 * Resuelve el idioma desde el estado SSR e hidrata la caché si es necesario.
 *
 * @param initialState - Estado inicial inyectado por el servidor.
 * @returns Idioma resuelto desde el estado SSR o undefined.
 */
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

/**
 * Resuelve el idioma guardado en localStorage si es válido.
 *
 * @param supportedLangs - Lista de idiomas soportados.
 * @returns Idioma resuelto desde localStorage o undefined.
 */
function resolveStoredLanguage(supportedLangs: Language[]): Language | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  const storedLang = localStorage.getItem('language') || localStorage.getItem('lang');
  if (storedLang && supportedLangs.includes(storedLang)) {
    return storedLang;
  }

  return undefined;
}

/**
 * Resuelve el idioma detectado del navegador si autoDetect está habilitado.
 *
 * @param config - Configuración global del plugin.
 * @param supportedLangs - Lista de idiomas soportados.
 * @param hasInitial - Si ya hay un idioma inicial resuelto.
 * @param hasStored - Si ya hay un idioma guardado resuelto.
 * @returns Idioma resuelto desde el navegador o undefined.
 */
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
 * Determina y aplica el idioma correcto al arrancar la página en el cliente.
 *
 * La prioridad de resolución es la siguiente (de mayor a menor):
 * 1. Estado SSR inyectado por el servidor (`__INITIAL_I18N_STATE__.lang`).
 * 2. Preferencia guardada por el usuario en `localStorage` (si es un idioma soportado).
 * 3. Idioma del navegador (`navigator.language`) solo si `autoDetect` está activo
 *    **y** no existe ninguno de los anteriores (primera visita sin preferencia).
 * 4. Fallback al `defaultLang` configurado.
 *
 * Este orden garantiza que:
 * - La primera visita siempre respete el `defaultLang` o la detección de navegador.
 * - Las visitas sucesivas respeten la preferencia explícita del usuario.
 * - El idioma del servidor nunca sea sobrescrito silenciosamente al hidratar.
 */
export async function setupLanguage(): Promise<void> {
  if (typeof globalThis === 'undefined' || globalThis.document === undefined) {
    return;
  }

  const runtimeWindow = globalThis as RuntimeWindow;
  const initialState = runtimeWindow.__INITIAL_I18N_STATE__;
  updateConfig(initialState?.config || {});

  const config = getConfig();

  // Si el servidor inyectó todas las traducciones, usamos sus claves como
  // lista de idiomas soportados en caso de que la config del cliente no la tenga.
  const initialSupportedLangs = runtimeWindow.__INITIAL_I18N_ALL_TRANSLATIONS__
    ? Object.keys(runtimeWindow.__INITIAL_I18N_ALL_TRANSLATIONS__)
    : [];

  const configuredSupportedLangs =
    config.supportedLangs && config.supportedLangs.length > 0 ? config.supportedLangs : [];

  const supportedLangs =
    configuredSupportedLangs.length > 0
      ? Array.from(new Set([...configuredSupportedLangs, ...initialSupportedLangs]))
      : initialSupportedLangs;

  // El fallback final es el idioma SSR → primer idioma soportado → config → "en".
  const fallbackDefaultLang = initialState?.lang || supportedLangs[0] || config.defaultLang || 'en';

  // Resolvemos el idioma según la prioridad establecida.
  const initialLang = resolveInitialLanguage(initialState);
  const storedLang = resolveStoredLanguage(supportedLangs);
  const browserLang = resolveBrowserLanguage(config, supportedLangs, !!initialLang, !!storedLang);

  const language = initialLang || storedLang || browserLang || fallbackDefaultLang;

  await changeLanguage(language, { syncRoute: false });
}

/**
 * Inicializa el sistema i18n completo en el cliente.
 *
 * Debe llamarse una sola vez al cargar la página (ej. en un `<script>` del layout).
 * Realiza tres pasos en orden:
 * 1. Hidrata la caché del cliente con **todos** los idiomas disponibles desde
 *    `window.__INITIAL_I18N_ALL_TRANSLATIONS__`, permitiendo cambios de idioma
 *    instantáneos sin peticiones de red.
 * 2. Hidrata la configuración desde `window.__INITIAL_I18N_STATE__.config`.
 * 3. Llama a {@link setupLanguage} para determinar y aplicar el idioma correcto.
 * 4. Dispara el evento `i18nready` en `document` para notificar a los componentes
 *    que pueden comenzar a renderizar texto traducido.
 *
 * @example
 * ```html
 * <script>
 *   import { bootstrapClientI18n } from "@gschz/astro-plugin-i18n/client";
 *   bootstrapClientI18n();
 * </script>
 * ```
 */
export function bootstrapClientI18n(): void {
  if (typeof globalThis === 'undefined' || globalThis.document === undefined) {
    return;
  }

  const runtimeWindow = globalThis as RuntimeWindow;
  const initialState = runtimeWindow.__INITIAL_I18N_STATE__;
  updateConfig(initialState?.config || {});

  void (async () => {
    // Hidratamos toda la caché antes de llamar a setupLanguage, ya que
    // este último puede necesitar las traducciones para el render inicial.
    if (runtimeWindow.__INITIAL_I18N_ALL_TRANSLATIONS__) {
      for (const [lang, translations] of Object.entries(runtimeWindow.__INITIAL_I18N_ALL_TRANSLATIONS__)) {
        populateClientCache(lang, translations || {});
      }
    }

    await setupLanguage();

    globalThis.window.addEventListener('popstate', () => {
      const config = getConfig();
      const supportedLangs =
        config.supportedLangs && config.supportedLangs.length > 0
          ? config.supportedLangs
          : [config.defaultLang || 'en'];
      const pathLang = getPathLanguage(globalThis.window.location.pathname, supportedLangs);

      if (pathLang) {
        void changeLanguage(pathLang, { syncRoute: false });
      }
    });

    // Notificamos que el sistema está listo. Los listeners con `{ once: true }`
    // en los componentes pueden activar el render en este punto.
    document.dispatchEvent(
      new CustomEvent('i18nready', {
        detail: { language: getCurrentLanguage() },
      }),
    );
  })();
}

/**
 * Registra un observador que se llama cada vez que el idioma cambia.
 *
 * Internamente escucha el evento `languagechange` disparado por {@link changeLanguage}.
 * Es la base del hook `useTranslation` en React y puede usarse directamente
 * para integrar el sistema con cualquier framework o lógica personalizada.
 *
 * @param callback - Función que recibe el nuevo código de idioma.
 * @returns Función de limpieza que elimina el listener al invocarse.
 */
export function setupLanguageObserver(callback: (lang: Language) => void): () => void {
  if (typeof document === 'undefined') {
    // En SSR devolvemos una función de limpieza vacía para que el código
    // que llama a este método no necesite comprobar el entorno.
    return () => {};
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
