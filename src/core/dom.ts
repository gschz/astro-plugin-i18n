/**
 * Helpers de cliente para render declarativo usando atributos `data-i18n-*`.
 */

import type { Language, TranslationKey, TranslationValues } from '../types';
import { getCurrentLanguage, setupLanguageObserver } from './language';
import { t } from './translate';

export interface DataI18nRenderOptions {
  /** Nodo raíz donde buscar atributos `data-i18n-key` (por defecto `document`). */
  root?: ParentNode;
  /** Nombre del atributo con la clave (por defecto `data-i18n-key`). */
  keyAttribute?: string;
  /** Nombre del atributo con variables JSON (por defecto `data-i18n-values`). */
  valuesAttribute?: string;
  /** Lista opcional de claves permitidas para validación runtime. */
  allowedKeys?: ReadonlyArray<TranslationKey>;
}

export interface DataI18nBinderOptions extends DataI18nRenderOptions {
  /**
   * Si es true, no renderiza hasta recibir `i18nready`.
   * Útil cuando quieres evitar texto temporal antes del bootstrap.
   */
  waitForReady?: boolean;
  /** Callback opcional luego de cada render, con idioma actual. */
  onAfterRender?: (lang: Language) => void;
}

function parseValues(raw: string | null): TranslationValues | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as TranslationValues;
  } catch {
    return undefined;
  }
}

/**
 * Renderiza una pasada de traducciones en elementos con `data-i18n-key`.
 */
export function renderDataI18n(options: DataI18nRenderOptions = {}): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = options.root ?? document;
  const keyAttribute = options.keyAttribute ?? 'data-i18n-key';
  const valuesAttribute = options.valuesAttribute ?? 'data-i18n-values';

  const allowedSet = options.allowedKeys ? new Set(options.allowedKeys) : null;

  root.querySelectorAll(`[${keyAttribute}]`).forEach((element) => {
    const key = element.getAttribute(keyAttribute);

    if (!key) {
      return;
    }

    if (allowedSet && !allowedSet.has(key)) {
      return;
    }

    const values = parseValues(element.getAttribute(valuesAttribute));
    const translatedText = t(key, values ? { values } : undefined);

    element.textContent = translatedText;
  });
}

/**
 * Registra listeners para rerenderizar automáticamente al cambiar idioma.
 * Devuelve una función de cleanup para remover listeners.
 */
export function bindDataI18n(options: DataI18nBinderOptions = {}): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const render = () => {
    renderDataI18n(options);
    options.onAfterRender?.(getCurrentLanguage());
  };

  const unsubscribeLanguage = setupLanguageObserver(() => {
    render();
  });

  let removeReadyListener: (() => void) | null = null;

  if (options.waitForReady) {
    const onReady = () => {
      render();
    };

    document.addEventListener('i18nready', onReady, { once: true });
    removeReadyListener = () => {
      document.removeEventListener('i18nready', onReady);
    };
  } else {
    render();
  }

  return () => {
    unsubscribeLanguage();
    removeReadyListener?.();
  };
}
