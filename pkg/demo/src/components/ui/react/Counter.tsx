import { useTranslation } from '@gschz/astro-plugin-i18n/react';
import { useState, type JSX } from 'react';

export default function Counter(): JSX.Element {
  const { t, changeLanguage } = useTranslation();
  const [count, setCount] = useState(0);

  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">
          React Island
        </span>
        <span className="rounded-full bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          client:load
        </span>
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-lg font-semibold text-slate-900">
          {t('frameworks:counter.items', { values: { count } })}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setCount((c) => c - 1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/60 hover:bg-slate-100/60 text-slate-600 transition-colors font-bold text-lg cursor-pointer"
          >
            -
          </button>
          <button
            onClick={() => setCount((c) => c + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-sm transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-2 border-t border-slate-200/60 pt-3">
        <span className="text-xs text-slate-400 block mb-2 font-semibold uppercase tracking-wider">
          {t('frameworks:changeLanguage.react')}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => changeLanguage('es')}
            className="rounded-lg border border-slate-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white/80 hover:border-slate-300 transition-colors text-slate-600 cursor-pointer"
          >
            Español
          </button>
          <button
            onClick={() => changeLanguage('en')}
            className="rounded-lg border border-slate-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white/80 hover:border-slate-300 transition-colors text-slate-600 cursor-pointer"
          >
            English
          </button>
          <button
            onClick={() => changeLanguage('pt-BR')}
            className="rounded-lg border border-slate-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white/80 hover:border-slate-300 transition-colors text-slate-600 cursor-pointer"
          >
            Português
          </button>
        </div>
      </div>
    </div>
  );
}
