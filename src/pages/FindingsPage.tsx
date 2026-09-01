import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { useAgentkart } from '../app/AgentkartContext.tsx';
import { SeverityBadge } from '../components/StatusBadge.tsx';
import { CONTROL_RULES } from '../domain/rules.ts';
import type { Severity } from '../domain/types.ts';
import { envLabel } from '../utils/labels.ts';

const SEVERITIES: Array<{ value: Severity | 'all'; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'critical', label: 'Kritisk' },
  { value: 'high', label: 'Høy' },
  { value: 'medium', label: 'Middels' },
  { value: 'low', label: 'Lav' },
];

function severityFromUrl(v: string | null): Severity | 'all' {
  const allowed: Severity[] = ['critical', 'high', 'medium', 'low'];
  return allowed.includes(v as Severity) ? (v as Severity) : 'all';
}

export function FindingsPage() {
  const { findings } = useAgentkart();
  const [searchParams, setSearchParams] = useSearchParams();

  const severity = severityFromUrl(searchParams.get('severity'));
  const environment = searchParams.get('environment') ?? 'all';
  const rule = searchParams.get('rule') ?? 'all';
  const agent = searchParams.get('agent') ?? 'all';

  function updateUrl(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '' || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next, { replace: true });
  }

  const agents = useMemo(() => {
    const set = new Set<string>();
    for (const f of findings) set.add(f.agentName);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nb'));
  }, [findings]);

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (severity !== 'all' && f.severity !== severity) return false;
      if (environment !== 'all' && f.environment !== environment) return false;
      if (rule !== 'all' && f.ruleId !== rule) return false;
      if (agent !== 'all' && f.agentName !== agent) return false;
      return true;
    });
  }, [findings, severity, environment, rule, agent]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Avvik</h1>
          <p className="mt-1 text-sm text-slate-600">
            Alle avvik som er avledet fra kontrollreglene mot avstemte agenter, sortert etter
            alvorlighetsgrad.
          </p>
        </div>
        <Link
          to="/report"
          className="inline-flex items-center gap-2 self-start rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          Eksporter styringsrapport
        </Link>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Alvorlighetsgrad</span>
            <select
              value={severity}
              onChange={(e) => {
                updateUrl({ severity: e.target.value });
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Miljø</span>
            <select
              value={environment}
              onChange={(e) => {
                updateUrl({ environment: e.target.value });
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Alle</option>
              <option value="production">{envLabel('production')}</option>
              <option value="test">{envLabel('test')}</option>
              <option value="development">{envLabel('development')}</option>
              <option value="unknown">{envLabel('unknown')}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Kontrollregel</span>
            <select
              value={rule}
              onChange={(e) => {
                updateUrl({ rule: e.target.value });
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Alle</option>
              {CONTROL_RULES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} – {r.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Agent</span>
            <select
              value={agent}
              onChange={(e) => {
                updateUrl({ agent: e.target.value });
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Alle</option>
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section aria-labelledby="findings-heading" className="space-y-3">
        <h2 id="findings-heading" className="sr-only">
          Avvikliste
        </h2>
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Ingen avvik matcher valgene.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <span className="text-xs font-medium text-slate-500">
                      {f.ruleId} · {f.ruleTitle}
                    </span>
                    <span className="text-xs text-slate-500">
                      Miljø: {envLabel(f.environment)}
                    </span>
                  </div>
                  <Link
                    to={`/agents/${encodeURIComponent(f.agentId)}`}
                    className="text-sm font-medium text-sky-700 hover:underline"
                  >
                    Åpne agent
                  </Link>
                </div>
                <p className="mt-2 text-base font-medium text-slate-900">{f.agentName}</p>
                <p className="mt-1 text-sm text-slate-800">{f.summary}</p>
                <p className="mt-1 text-sm text-slate-700">{f.explanation}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium text-slate-900">Anbefalt tiltak:</span>{' '}
                  <span className="text-slate-800">{f.recommendedAction}</span>
                </p>
                {f.evidence.length > 0 ? (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-sky-700 hover:underline">
                      Vis evidens ({f.evidence.length})
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-700">
                      {f.evidence.map((e, i) => (
                        <li key={`${f.id}-ev-${i}`}>
                          <span className="font-medium">{e.field ?? e.kind}</span>
                          {e.sourceId ? ` (${e.sourceId})` : ''}
                          {e.note ? ` – ${e.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
