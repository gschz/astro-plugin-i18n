import {
  changeLanguage as changeLanguageGlobal,
  getConfig,
  getCurrentLanguage,
  setupLanguageObserver,
  t as tGlobal,
  type Language,
} from '@gschz/astro-plugin-i18n/client';
import {
  TranslatedText as T,
  useTranslation,
} from '@gschz/astro-plugin-i18n/react';
import { useEffect, useState, type JSX } from 'react';

export default function InteractiveDemo(): JSX.Element {
  const { language, t } = useTranslation();
  const [observedLanguage, setObservedLanguage] =
    useState<Language>(getCurrentLanguage());
  const [changeEvents, setChangeEvents] = useState(0);

  const config = getConfig();
  const supportedLangs: Language[] = config.supportedLangs ?? [];

  useEffect(() => {
    const unsubscribe = setupLanguageObserver((nextLanguage) => {
      setObservedLanguage(nextLanguage);
      setChangeEvents((count) => count + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <section className="glass-card p-6 sm:p-8 mt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <T
          textKey="demo.react.title"
          render={({ content }) => (
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {content}
            </h2>
          )}
        />
      </header>

      <T
        textKey="demo.react.description"
        render={({ content }) => (
          <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
            {content}
          </p>
        )}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200/60 bg-white/60 p-6">
          <h3 className="text-lg font-bold text-slate-900">
            {t('demo.react.hookTitle')}
          </h3>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            {t('demo.react.currentLanguage', {
              values: { lang: language },
            })}
          </p>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {t('demo.react.observedLanguage', {
              values: { lang: observedLanguage },
            })}
          </p>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {t('demo.react.eventCount', {
              values: { count: changeEvents },
            })}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200/60 bg-white/60 p-6">
          <h3 className="text-lg font-bold text-slate-900">
            {t('demo.react.globalTitle')}
          </h3>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            {tGlobal('demo.react.forcedPreview', {
              values: { lang: language.toUpperCase() },
            })}
          </p>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            {t('environment')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {supportedLangs.map((lang) => (
              <button
                key={`global-${lang}`}
                type="button"
                className="inline-flex items-center rounded-lg border border-slate-200/60 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-900 hover:text-white hover:border-slate-900 cursor-pointer sm:text-sm"
                onClick={() => changeLanguageGlobal(lang)}
              >
                {lang.toUpperCase()} (global)
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
