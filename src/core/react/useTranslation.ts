/**
 * Hook de React para @gschz/astro-plugin-i18n.
 *
 * Separado del core para que `core/translate.ts` no dependa de React.
 * Los usuarios que no usan React nunca importan este módulo y su bundle
 * no arrastra la dependencia.
 */

import { useEffect, useState } from 'react';
import type { Language, TranslationKey, TranslationOptions } from '../../types';
import { changeLanguage, getCurrentLanguage, setupLanguageObserver } from '../language';
import { t } from '../translate';

/**
 * Hook de React que expone las funciones de traducción y reacciona automáticamente
 * a los cambios de idioma.
 *
 * Se suscribe al evento `languagechange` mediante {@link setupLanguageObserver}
 * y actualiza el estado interno cuando el idioma cambia, provocando un re-render
 * de los componentes que lo usen.
 *
 * @returns Objeto con `language`, `changeLanguage` y `t` vinculada al idioma activo.
 */
export function useTranslation(): {
  language: Language;
  changeLanguage: typeof changeLanguage;
  t: (key: TranslationKey, options?: Omit<TranslationOptions, 'lang'>) => string;
} {
  const [language, setLanguage] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = setupLanguageObserver((newLang) => {
      setLanguage(newLang);
    });

    // Limpiamos el listener al desmontar el componente para evitar fugas de memoria.
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    language,
    changeLanguage,
    /** Versión de `t` pre-vinculada al idioma activo del hook. */
    t: (key: TranslationKey, options?: Omit<TranslationOptions, 'lang'>) => t(key, { ...options, lang: language }),
  };
}
