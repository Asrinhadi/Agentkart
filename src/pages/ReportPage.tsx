import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAgentkart } from '../app/AgentkartContext.tsx';
import { CONTROL_RULES } from '../domain/rules.ts';
import { formatDateNb } from '../utils/format.ts';
import { envLabel } from '../utils/labels.ts';
import type { Severity } from '../domain/types.ts';

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Kritisk',
  high: 'Høy',
  medium: 'Middels',
  low: 'Lav',
};

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low'];

function handlePrint(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

export function ReportPage() {
  const { declared, reconciled, findings, sources, now } = useAgentkart();

  const observedAgents = reconciled.filter((a) => a.observations.length > 0).length;
  const shadowAgents = reconciled.filter((a) => a.matchStatus === 'observation_only').length;
  const criticalAgents = new Set(
    findings.filter((f) => f.severity === 'critical').map((f) => f.agentId),
  ).size;

  const findingsBySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const f of findings) findingsBySeverity[f.severity] += 1;

  const ruleCounts = new Map<string, number>();
  for (const f of findings) ruleCounts.set(f.ruleId, (ruleCounts.get(f.ruleId) ?? 0) + 1);
  const triggeredRules = Array.from(ruleCounts.entries())
    .map(([id, count]) => ({ rule: CONTROL_RULES.find((r) => r.id === id), count }))
    .filter((x): x is { rule: (typeof CONTROL_RULES)[number]; count: number } => Boolean(x.rule))
    .sort((a, b) => b.count - a.count);

  const groupedFindings: Record<Severity, typeof findings> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const f of findings) groupedFindings[f.severity].push(f);

  const sourceLookup = new Map(sources.map((s) => [s.sourceId, s.name]));

  const generatedAt = now.toISOString();

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          to="/findings"
          className="inline-flex items-center gap-1 text-sm text-sky-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tilbake til avvik
        </Link>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Skriv ut / Lagre som PDF
        </button>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
        <div
          role="note"
          className="mb-6 rounded-md border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 print:bg-white"
        >
          SYNTETISKE DEMODATA — denne rapporten er basert på fiktive agenter i en
          konseptdemo, ikke en aktiv nettverksskanning.
        </div>

        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Agentkart · Styringsrapport
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 print:text-3xl">
            Styringsrapport for autonome agenter
          </h1>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="inline font-medium text-slate-500">Generert: </dt>
              <dd className="inline">{formatDateNb(generatedAt)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-slate-500">Referansedato: </dt>
              <dd className="inline">{formatDateNb(generatedAt)}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-slate-500">Avgrensning: </dt>
              <dd className="inline">
                Alle avstemte agenter i den lokale demoen ({reconciled.length} agenter)
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-slate-500">Datakilder: </dt>
              <dd className="inline">{sources.length} kilder</dd>
            </div>
          </dl>
        </header>

        <section className="mt-6" aria-labelledby="report-summary">
          <h2 id="report-summary" className="text-lg font-semibold text-slate-900">
            1. Sammendrag
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Registrerte agenter', value: declared.length },
              { label: 'Observerte agenter', value: observedAgents },
              { label: 'Skyggeagenter', value: shadowAgents },
              { label: 'Kritiske avvik', value: criticalAgents },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-md border border-slate-200 p-3 text-center"
              >
                <div className="text-2xl font-bold text-slate-900">{k.value}</div>
                <div className="mt-1 text-xs text-slate-600">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <caption className="sr-only">Fordeling av avvik per alvorlighetsgrad</caption>
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-3 py-2">Alvorlighetsgrad</th>
                  <th scope="col" className="px-3 py-2">Antall avvik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SEVERITY_ORDER.map((s) => (
                  <tr key={s}>
                    <td className="px-3 py-2 text-slate-900">{SEVERITY_LABEL[s]}</td>
                    <td className="px-3 py-2 text-slate-700">{findingsBySeverity[s]}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-900">Totalt</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{findings.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 break-inside-avoid" aria-labelledby="report-rules">
          <h2 id="report-rules" className="text-lg font-semibold text-slate-900">
            2. Kontrollregler som slo ut
          </h2>
          {triggeredRules.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Ingen regler slo ut i denne avgrensningen.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2">Regel</th>
                    <th scope="col" className="px-3 py-2">Tittel</th>
                    <th scope="col" className="px-3 py-2">Antall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {triggeredRules.map(({ rule, count }) => (
                    <tr key={rule.id}>
                      <td className="px-3 py-2 font-mono text-slate-900">{rule.id}</td>
                      <td className="px-3 py-2 text-slate-700">{rule.title}</td>
                      <td className="px-3 py-2 text-slate-700">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8" aria-labelledby="report-critical">
          <h2 id="report-critical" className="text-lg font-semibold text-slate-900">
            3. Kritiske funn
          </h2>
          {groupedFindings.critical.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Ingen kritiske funn.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {groupedFindings.critical.map((f) => (
                <li key={f.id} className="break-inside-avoid rounded-md border border-red-200 bg-red-50 p-3 print:bg-white">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-red-900">
                      {f.agentName}
                    </span>
                    <span className="font-mono text-xs text-slate-600">
                      {f.ruleId} · {f.ruleTitle} · {envLabel(f.environment)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-900">{f.summary}</p>
                  <p className="mt-1 text-sm text-slate-700">{f.explanation}</p>
                  <p className="mt-2 text-sm text-slate-900">
                    <span className="font-medium">Anbefalt tiltak:</span>{' '}
                    {f.recommendedAction}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8" aria-labelledby="report-all">
          <h2 id="report-all" className="text-lg font-semibold text-slate-900">
            4. Alle funn med kilde og anbefalt tiltak
          </h2>
          {findings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">Ingen funn.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2">Alvor</th>
                    <th scope="col" className="px-3 py-2">Regel</th>
                    <th scope="col" className="px-3 py-2">Agent</th>
                    <th scope="col" className="px-3 py-2">Miljø</th>
                    <th scope="col" className="px-3 py-2">Kilde(r)</th>
                    <th scope="col" className="px-3 py-2">Anbefalt tiltak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {findings.map((f) => {
                    const sourceIds = Array.from(new Set(f.evidence.map((e) => e.sourceId).filter(Boolean)));
                    const sourceNames = sourceIds
                      .map((id) => sourceLookup.get(id as string) ?? id)
                      .join(', ');
                    return (
                      <tr key={f.id} className="align-top">
                        <td className="px-3 py-2 text-slate-900">{SEVERITY_LABEL[f.severity]}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">{f.ruleId}</td>
                        <td className="px-3 py-2 text-slate-900">{f.agentName}</td>
                        <td className="px-3 py-2 text-slate-700">{envLabel(f.environment)}</td>
                        <td className="px-3 py-2 text-slate-700">{sourceNames || '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{f.recommendedAction}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>
            Utviklet av Asrin Hadi · Konseptdemo – ikke en juridisk vurdering. Referansene
            til EU AI Act, NIST AI RMF, ISO/IEC 27001/42001 og OWASP LLM Top 10 er
            klassifiseringshjelpemidler for demonstrasjonsformål.
          </p>
          <p className="mt-1">
            Rapport generert: {formatDateNb(generatedAt)} · Ingen data er sendt ut av
            nettleseren.
          </p>
        </footer>
      </article>
    </div>
  );
}
