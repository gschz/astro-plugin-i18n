import { useTranslation } from '@gschz/astro-plugin-i18n/react';
import { useState, type JSX } from 'react';

export default function PluralDemo(): JSX.Element {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);

  const presets = [0, 1, 3] as const;

  return (
    <section className="glass-card p-6 sm:p-8 mt-6">
      <h3 className="text-xl font-bold tracking-tight text-slate-900">
        {t('demo.sections.plural.title')}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
        {t('demo.sections.plural.body')}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((value) => (
          <button
            key={value}
            type="button"
            className={`demo-switch ${count === value ? 'active' : ''}`}
            onClick={() => setCount(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          count
        </span>
        <input
          className="mt-3 w-full max-w-xs accent-slate-600 cursor-pointer"
          type="range"
          min={0}
          max={10}
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
        />
      </label>

      <p className="mt-5 rounded-xl border border-slate-200/60 bg-white/60 px-4 py-3 text-lg font-semibold text-slate-900">
        {t('notifications.count', {
          values: { count },
        })}
      </p>
    </section>
  );
}
