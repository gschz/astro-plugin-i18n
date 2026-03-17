/**
 * Middleware de Astro para @gschz/astro-plugin-i18n.
 *
 * Se registra automáticamente con orden `"pre"` por la integración principal.
 * Su responsabilidad es inyectar la configuración del plugin en `locals.i18n`
 * para que páginas y layouts puedan acceder a ella durante el renderizado SSR
 * sin necesidad de importar el módulo de configuración directamente.
 */

import { defineMiddleware } from 'astro/middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import type { I18nPluginOptions } from './types';

/**
 * Opciones validadas que se comparten con el middleware desde la integración.
 * Se inicializa con `null` y se rellena en {@link setOptions}.
 */
let validatedOptions: Partial<I18nPluginOptions> | null = null;

/**
 * Almacena las opciones del plugin para que el middleware pueda acceder a ellas
 * en cada petición. Lo llama la integración en los hooks `astro:config:setup`
 * y `astro:server:setup` para garantizar que las opciones estén disponibles
 * antes de que llegue la primera petición.
 *
 * También las persiste en `global.__ASTRO_I18N_OPTIONS__` como mecanismo
 * de respaldo en entornos donde el módulo puede ser reimportado.
 *
 * @param options - Opciones validadas del plugin, o `null` para limpiar.
 */
export function setOptions(options: Partial<I18nPluginOptions> | null): void {
  validatedOptions = options;

  if (typeof global !== 'undefined') {
    try {
      global.__ASTRO_I18N_OPTIONS__ = options || undefined;
    } catch {
      // Silenciamos errores en entornos donde `global` es read-only.
    }
  }
}

/**
 * Recupera las opciones almacenadas, consultando primero la variable de módulo
 * y luego el fallback en `global.__ASTRO_I18N_OPTIONS__`.
 *
 * @returns Opciones del plugin o `null` si no se han configurado.
 */
function getOptions(): Partial<I18nPluginOptions> | null {
  if (validatedOptions) {
    return validatedOptions;
  }

  if (typeof global !== 'undefined') {
    try {
      const globalOptions = global.__ASTRO_I18N_OPTIONS__;
      if (globalOptions) {
        return globalOptions;
      }
    } catch {
      // Silenciamos errores en entornos donde `global` es read-only.
    }
  }

  console.warn('[i18n] No se encontraron opciones en el middleware. Verifica la configuración de la integración.');
  return null;
}

declare global {
  namespace App {
    interface Locals {
      /** Contexto i18n inyectado por el middleware en cada petición SSR. */
      i18n?: {
        /** Configuración activa del plugin para este request. */
        config?: Partial<I18nPluginOptions>;
      };
    }
  }
}

/**
 * Handler del middleware Astro que inyecta la configuración i18n en `locals`.
 *
 * Al exponer la config en `locals.i18n.config`, los layouts y páginas pueden
 * llamar a `getCurrentLanguage(Astro.locals)` para obtener el idioma correcto
 * en SSR sin depender de cookies, headers ni detección de navegador.
 */
export const onRequest = defineMiddleware((context: APIContext, next: MiddlewareNext) => {
  const options = getOptions();

  if (!options) {
    console.warn('[i18n] No hay opciones disponibles en el middleware. La configuración puede estar incompleta.');
  }

  if (typeof context.locals === 'object' && context.locals !== null) {
    const locals = context.locals as any;

    if (!locals.i18n) {
      locals.i18n = {};
    }

    // Inyectamos la config para que esté disponible durante el renderizado SSR.
    locals.i18n.config = options || {};

    if (!options?.defaultLang) {
      console.warn('[i18n] `defaultLang` no configurado en el middleware. El idioma por defecto puede ser incorrecto.');
    }
  } else {
    console.warn('[i18n] `context.locals` no es un objeto. El middleware no pudo inyectar la config i18n.');
  }

  return next();
});

export default onRequest;
