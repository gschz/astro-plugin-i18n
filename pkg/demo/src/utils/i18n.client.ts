import {
  changeLanguage,
  getCurrentLanguage,
  setupLanguageObserver,
  t,
} from '@gschz/astro-plugin-i18n/client';

interface DemoControlsOptions {
  statusSelector?: string;
  buttonEsSelector?: string;
  buttonEnSelector?: string;
  buttonPtBrSelector?: string;
}

/**
 * Botones vanilla para cambiar idioma en la página demo (cookie + syncRoute).
 * El rerender `data-i18n-*` lo gestiona `bindDataI18n` del layout.
 */
export function initDemoI18nControls(
  options: DemoControlsOptions = {},
): () => void {
  const {
    statusSelector = '#client-status',
    buttonEsSelector = '#lang-es',
    buttonEnSelector = '#lang-en',
    buttonPtBrSelector = '#lang-pt-br',
  } = options;

  const [status, buttonEs, buttonEn, buttonPtBr] = [
    document.querySelector<HTMLElement>(statusSelector),
    document.querySelector<HTMLButtonElement>(buttonEsSelector),
    document.querySelector<HTMLButtonElement>(buttonEnSelector),
    document.querySelector<HTMLButtonElement>(buttonPtBrSelector),
  ];

  const updateActiveButtons = () => {
    const lang = getCurrentLanguage();
    buttonEs?.classList.toggle('active', lang === 'es');
    buttonEn?.classList.toggle('active', lang === 'en');
    buttonPtBr?.classList.toggle('active', lang === 'pt-BR');
  };

  const renderStatus = () => {
    if (!status) {
      return;
    }

    status.textContent = `${getCurrentLanguage()}: ${t('controls.clientStatus')}`;
    updateActiveButtons();
  };

  const unsubscribeObserver = setupLanguageObserver(() => {
    renderStatus();
  });

  const handleEs = () => {
    void changeLanguage('es');
    renderStatus();
  };

  const handleEn = () => {
    void changeLanguage('en');
    renderStatus();
  };

  const handlePtBr = () => {
    void changeLanguage('pt-BR');
    renderStatus();
  };

  buttonEs?.addEventListener('click', handleEs);
  buttonEn?.addEventListener('click', handleEn);
  buttonPtBr?.addEventListener('click', handlePtBr);

  renderStatus();

  return () => {
    unsubscribeObserver();
    buttonEs?.removeEventListener('click', handleEs);
    buttonEn?.removeEventListener('click', handleEn);
    buttonPtBr?.removeEventListener('click', handlePtBr);
  };
}
