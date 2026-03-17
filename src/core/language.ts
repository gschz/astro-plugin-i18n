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
import { getConfig } from './config';
import { populateClientCache } from './translate';

/**
 * Extensión del objeto `window` con los globals que el servidor Astro inyecta
 * mediante un `<script>` inline en el layout.
 *
 * - `__INITIAL_I18N_STATE__`: idioma SSR + traducciones del idioma inicial.
 * - `__INITIAL_I18N_ALL_TRANSLATIONS__`: mapa completo de todos los idiomas
 *   para que el cliente pueda cambiar de idioma sin peticiones adicionales.
 */
type RuntimeWindow = Window & {
  __INITIAL_I18N_STATE__?: {
    lang?: string;
    translations?: Record<string, any>;
  };
  __INITIAL_I18N_ALL_TRANSLATIONS__?: Record<string, Record<string, any>>;
};

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
  // En SSR el idioma lo determina la configuración inyectada por el middleware.
  const localsConfig = locals?.i18n?.config as Partial<I18nPluginOptions> | undefined;

  if (localsConfig?.defaultLang) {
    return localsConfig.defaultLang;
  }

  const globalConfig = getConfig();

  if (typeof document !== 'undefined') {
    // Prioridad 1: atributo lang del elemento raíz (puesto por changeLanguage).
    const docLang = document.documentElement.getAttribute('lang');
    if (docLang) {
      return docLang as Language;
    }

    // Prioridad 2: preferencia guardada por el usuario en una sesión anterior.
    if (typeof localStorage !== 'undefined') {
      const storedLang = localStorage.getItem('language') || localStorage.getItem('lang');
      if (storedLang) {
        return storedLang as Language;
      }
    }

    // Prioridad 3: detección automática por navigator.language (solo si autoDetect).
    if (localsConfig?.autoDetect ?? globalConfig.autoDetect) {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang) {
        return browserLang as Language;
      }
    }
  }

  const defaultLang = localsConfig?.defaultLang || globalConfig.defaultLang || 'es';

  if (!globalConfig.defaultLang && !localsConfig?.defaultLang) {
    console.debug('[i18n] Usando idioma por defecto:', defaultLang);
  }

  return defaultLang;
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
 */
export function changeLanguage(lang: Language): void {
  // No-op en SSR; este módulo opera únicamente en el navegador.
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('lang', lang);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('language', lang);
    localStorage.setItem('lang', lang);
  }

  document.dispatchEvent(new CustomEvent('languagechange', { detail: { language: lang } }));
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
export function setupLanguage(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const runtimeWindow = window as RuntimeWindow;
  const config = getConfig();

  // Si el servidor inyectó todas las traducciones, usamos sus claves como
  // lista de idiomas soportados en caso de que la config del cliente no la tenga.
  const initialState = runtimeWindow.__INITIAL_I18N_STATE__;
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

  let language = fallbackDefaultLang as Language;
  let hasStoredLang = false;

  // Paso 1: si el servidor ya eligió un idioma (y opcionalmente preparó las
  // traducciones), lo tomamos como punto de partida para la hidratación.
  if (initialState?.lang) {
    language = initialState.lang as Language;

    if (initialState.translations) {
      // Hidratamos la caché del cliente con las traducciones server-side para
      // que t() funcione de inmediato sin peticiones adicionales.
      populateClientCache(language, initialState.translations);
    }
  }

  // Paso 2: si el usuario ya eligió un idioma en una visita anterior y lo guardó
  // en localStorage, respetamos su preferencia (solo si es un idioma válido).
  if (typeof localStorage !== 'undefined') {
    const storedLang = localStorage.getItem('language') || localStorage.getItem('lang');

    if (storedLang && supportedLangs.includes(storedLang)) {
      language = storedLang as Language;
      hasStoredLang = true;
    }
  }

  // Paso 3: autoDetect aplica únicamente cuando no hay ni estado SSR ni preferencia
  // guardada, es decir, en una primera visita real sin ningún contexto previo.
  if (!hasStoredLang && !initialState?.lang && config.autoDetect) {
    const browserLang = navigator.language.split('-')[0];

    if (supportedLangs.includes(browserLang)) {
      language = browserLang as Language;
    }
  }

  changeLanguage(language);
}

/**
 * Inicializa el sistema i18n completo en el cliente.
 *
 * Debe llamarse una sola vez al cargar la página (ej. en un `<script>` del layout).
 * Realiza tres pasos en orden:
 * 1. Hidrata la caché del cliente con **todos** los idiomas disponibles desde
 *    `window.__INITIAL_I18N_ALL_TRANSLATIONS__`, permitiendo cambios de idioma
 *    instantáneos sin peticiones de red.
 * 2. Llama a {@link setupLanguage} para determinar y aplicar el idioma correcto.
 * 3. Dispara el evento `i18nready` en `document` para notificar a los componentes
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
  if (typeof window === 'undefined') {
    return;
  }

  const runtimeWindow = window as RuntimeWindow;

  // Hidratamos toda la caché antes de llamar a setupLanguage, ya que
  // este último puede necesitar las traducciones para el render inicial.
  if (runtimeWindow.__INITIAL_I18N_ALL_TRANSLATIONS__) {
    for (const [lang, translations] of Object.entries(runtimeWindow.__INITIAL_I18N_ALL_TRANSLATIONS__)) {
      populateClientCache(lang, translations || {});
    }
  }

  setupLanguage();

  // Notificamos que el sistema está listo. Los listeners con `{ once: true }`
  // en los componentes pueden activar el render en este punto.
  document.dispatchEvent(
    new CustomEvent('i18nready', {
      detail: { language: getCurrentLanguage() },
    }),
  );
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
    if (customEvent.detail && customEvent.detail.language) {
      callback(customEvent.detail.language);
    }
  };

  document.addEventListener('languagechange', handleChange);

  return () => {
    document.removeEventListener('languagechange', handleChange);
  };
}
