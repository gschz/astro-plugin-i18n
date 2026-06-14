import { useEffect, useRef, useState } from 'react';
import type { Language } from '~/types/index';
import { useTranslation } from './useTranslation';

/** Props del selector de idioma para React. */
interface LangToggleProps {
  /** Clase CSS adicional para el contenedor raíz del dropdown. */
  className?: string;
  /** Lista de idiomas seleccionables con código y etiqueta visible. */
  languages: readonly {
    /** Código de idioma (ej: en, es, pt-BR). */
    code: Language;
    /** Etiqueta mostrada al usuario para el idioma. */
    label: string;
  }[];
  /** Idioma inicial opcional; si no se indica, usa el idioma global activo. */
  currentLang?: Language;
  /** Texto descriptivo (sr-only) para lectores de pantalla. */
  ariaLabel?: string;
  /** Icono personalizado opcional a través de children. Si no se provee, se usará el icono por defecto. */
  children?: React.ReactNode;
}

/**
 * Dropdown de idiomas para aplicaciones React.
 *
 * Sincroniza su estado con el idioma global del plugin y permite cambiarlo
 * disparando `changeLanguage` y `syncLanguageRoute`, de forma que el idioma
 * activo, la URL localizada y los observers registrados queden alineados.
 */
export const LangToggle: React.FC<LangToggleProps> = ({
  className = '',
  languages,
  currentLang,
  ariaLabel = 'Change language',
  children,
}) => {
  const { language, changeLanguage } = useTranslation();
  const selectedLang = currentLang || language;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (newLang: Language) => {
    void changeLanguage(newLang);
    setIsOpen(false);
  };

  const toggleDropdown = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsOpen((currentValue) => !currentValue);
  };

  if (!languages || languages.length === 0) {
    console.error(
      "LangToggle component requires a non-empty 'languages' prop.",
    );
    return null;
  }

  return (
    <div
      className={`lang-dropdown ${className}`}
      ref={dropdownRef}
      style={{ position: 'relative' }}
    >
      <button
        type="button"
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="dropdown-button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem',
          backgroundColor: 'transparent',
          border: '1px solid rgb(226, 232, 240)',
          borderRadius: '0.375rem',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          color: 'inherit',
          width: '2.5rem',
          height: '2.5rem',
        }}
      >
        {children || <LanguagesIcon />}
        <span
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: '0',
          }}
        >
          {ariaLabel}
        </span>
      </button>

      {isOpen && (
        <div
          className="dropdown-menu"
          style={{
            position: 'absolute',
            right: '0',
            marginTop: '0.25rem',
            minWidth: '8rem',
            zIndex: 50,
            background: 'white',
            borderRadius: '0.375rem',
            boxShadow:
              '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid rgb(229, 231, 235)',
            padding: '0.5rem',
          }}
        >
          {languages.map((lang) => (
            <button
              type="button"
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                borderRadius: '0.25rem',
                backgroundColor:
                  selectedLang === lang.code
                    ? 'rgb(243, 244, 246)'
                    : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                border: 'none',
                color: 'inherit',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const LanguagesIcon = () => (
  <svg
    width="1.2rem"
    height="1.2rem"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export default LangToggle;
