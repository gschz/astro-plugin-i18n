/** @jsxImportSource solid-js */
import { useI18n } from '@gschz/astro-plugin-i18n/solid';
import { createSignal } from 'solid-js';

export default function Counter() {
  const { t, changeLanguage } = useI18n();
  const [count, setCount] = createSignal(0);

  return (
    <div class="rounded-2xl border border-slate-200/60 bg-white/70 p-6 flex flex-col gap-4 shadow-sm">
      <div class="flex items-center justify-between border-b border-slate-200/60 pb-3">
        <span class="text-xs uppercase tracking-wider text-slate-500 font-bold">
          Solid Island
        </span>
        <span class="rounded-full bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          client:load
        </span>
      </div>

      <div class="flex items-center justify-between py-2">
        <span class="text-lg font-semibold text-slate-900">
          {t('frameworks:counter.items', { values: { count: count() } })}
        </span>
        <div class="flex gap-2">
          <button
            onClick={() => setCount((c) => c - 1)}
            class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200/60 hover:bg-slate-100/60 text-slate-600 transition-colors font-bold text-lg cursor-pointer"
          >
            -
          </button>
          <button
            onClick={() => setCount((c) => c + 1)}
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-sm transition-colors cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      <div class="mt-2 border-t border-slate-200/60 pt-3">
        <span class="text-xs text-slate-400 block mb-2 font-semibold uppercase tracking-wider">
          {t('frameworks:changeLanguage.solid')}
        </span>
        <div class="flex flex-wrap gap-2">
          <button
            onClick={() => changeLanguage('es')}
            class="rounded-lg border border-slate-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white/80 hover:border-slate-300 transition-colors text-slate-600 cursor-pointer"
          >
            Español
          </button>
          <button
            onClick={() => changeLanguage('en')}
            class="rounded-lg border border-slate-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white/80 hover:border-slate-300 transition-colors text-slate-600 cursor-pointer"
          >
            English
          </button>
          <button
            onClick={() => changeLanguage('pt-BR')}
            class="rounded-lg border border-slate-200/60 bg-white/60 px-3 py-1.5 text-xs font-medium hover:bg-white/80 hover:border-slate-300 transition-colors text-slate-600 cursor-pointer"
          >
            Português
          </button>
        </div>
      </div>
    </div>
  );
}
