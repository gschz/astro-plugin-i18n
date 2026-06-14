import { useTranslation } from '@gschz/astro-plugin-i18n/react';
import { useState, type JSX } from 'react';

export default function InterpolationDemo(): JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState('Gera');
  const [count, setCount] = useState(3);

  return (
    <section className="glass-card p-6 sm:p-8 mt-6">
      <h3 className="text-xl font-bold tracking-tight text-slate-900">
        {t('demo.sections.interpolation.title')}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">
        {t('demo.sections.interpolation.body')}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Name
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            count
          </span>
          <input
            className="mt-3 w-full accent-slate-600 cursor-pointer"
            type="range"
            min={0}
            max={12}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
          <span className="mt-1 block font-mono text-xs text-slate-600 font-semibold">
            {count}
          </span>
        </label>
      </div>

      <p className="mt-5 rounded-xl border border-slate-200/60 bg-white/60 px-4 py-3 text-base leading-relaxed text-slate-900 font-medium">
        {t('greeting', {
          values: { name, count },
        })}
      </p>
    </section>
  );
}
