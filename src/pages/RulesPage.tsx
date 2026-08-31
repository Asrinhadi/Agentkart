import { useMemo } from 'react';
import { useAgentkart } from '../app/AgentkartContext.tsx';
import { SeverityBadge } from '../components/StatusBadge.tsx';
import { CONTROL_RULES } from '../domain/rules.ts';

export function RulesPage() {
  const { findings } = useAgentkart();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of findings) map.set(f.ruleId, (map.get(f.ruleId) ?? 0) + 1);
    return map;
  }, [findings]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Kontrollregler</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Kontrollreglene er interne styringsregler for demoen. De må ikke presenteres som
          juridiske konklusjoner eller som en fullstendig vurdering av EU AI Act, GDPR eller
          annen lovgivning.
        </p>
      </header>

      <section className="space-y-3">
        {CONTROL_RULES.map((r) => (
          <article
            key={r.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {r.id}
                </span>
                <h2 className="text-base font-semibold text-slate-900">{r.title}</h2>
                <SeverityBadge severity={r.defaultSeverity} />
              </div>
              <span className="text-xs text-slate-500">
                Aktive avvik: {counts.get(r.id) ?? 0}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-800">{r.description}</p>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Hvorfor:</span> {r.rationale}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
