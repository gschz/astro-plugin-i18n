import * as React from 'react';
import { t as globalT, useTranslation } from '../core/translate';
import type { Language, TranslationKey, TranslationValues } from '../types';

/** Props del componente React que renderiza una traducción. */
interface TranslatedTextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Clave de traducción en notación de puntos. */
  textKey: TranslationKey;
  /** Variables para interpolación en la traducción (`{name}`, `{count}`, etc.). */
  values?: TranslationValues;
  /** Elemento HTML/React que envuelve el contenido (por defecto `span`). */
  as?: React.ElementType;
  /** Fuerza idioma para este nodo, sin depender del idioma global actual. */
  lang?: Language;
  /** Fallback opcional cuando la estrategia actual devuelve la key sin traducir. */
  fallback?: React.ReactNode;
  /**
   * Render prop opcional para casos avanzados donde se requiere controlar el
   * render sin envolver el resultado en un elemento extra.
   */
  render?: (context: {
    text: string;
    content: React.ReactNode;
    key: TranslationKey;
    language: Language;
    isFallback: boolean;
  }) => React.ReactNode;
}

/**
 * Componente React que resuelve y renderiza una clave de traducción.
 *
 * Cuando `lang` coincide con el idioma global, usa la versión reactiva del hook.
 * Si se fuerza otro idioma, recurre a la función global `t()` para evitar acoplar
 * el render al estado local del hook.
 */
export const TranslatedText: React.FC<TranslatedTextProps> = ({
  textKey,
  values,
  as = 'span',
  lang,
  fallback,
  render,
  ...rest
}) => {
  const { t: hookT, language: globalLanguage } = useTranslation();
  const targetLanguage = lang || globalLanguage;
  const translationFunction = targetLanguage === globalLanguage ? hookT : globalT;
  const translatedText = translationFunction(textKey, {
    values,
    lang: targetLanguage,
  });
  const shouldUseFallback = fallback !== undefined && translatedText === String(textKey);
  const content = shouldUseFallback ? fallback : translatedText;

  if (render) {
    return (
      <>
        {render({
          text: translatedText,
          content,
          key: textKey,
          language: targetLanguage,
          isFallback: shouldUseFallback,
        })}
      </>
    );
  }

  return React.createElement(as, rest, content);
};

function areTranslationValuesEqual(previousValues?: TranslationValues, nextValues?: TranslationValues): boolean {
  if (!previousValues && !nextValues) {
    return true;
  }

  if (!previousValues || !nextValues) {
    return false;
  }

  const prevKeys = Object.keys(previousValues);
  const nextKeys = Object.keys(nextValues);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (!nextKeys.includes(key)) {
      return false;
    }

    if (previousValues[key] !== nextValues[key]) {
      return false;
    }
  }

  return true;
}

function areShallowEqualProps(previousProps: Record<string, unknown>, nextProps: Record<string, unknown>): boolean {
  const previousKeys = Object.keys(previousProps);
  const nextKeys = Object.keys(nextProps);

  if (previousKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of previousKeys) {
    if (!Object.hasOwn(nextProps, key)) {
      return false;
    }

    if (!Object.is(previousProps[key], nextProps[key])) {
      return false;
    }
  }

  return true;
}

export default React.memo(TranslatedText, (prevProps, nextProps) => {
  if (!areTranslationValuesEqual(prevProps.values, nextProps.values)) {
    return false;
  }

  const { values: _previousValues, ...previousRest } = prevProps;
  const { values: _nextValues, ...nextRest } = nextProps;

  // Comparamos el resto de props de forma superficial para evitar renders
  // obsoletos cuando cambian atributos del elemento (className, as, etc.).
  return areShallowEqualProps(previousRest, nextRest);
});
