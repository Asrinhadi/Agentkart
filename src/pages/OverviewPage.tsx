import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Database, PlayCircle, ShieldAlert, Users } from 'lucide-react';
import { useAgentkart } from '../app/AgentkartContext.tsx';
import { Badge, SeverityBadge } from '../components/StatusBadge.tsx';
import { formatDateNb } from '../utils/format.ts';
import { sourceStatusLabel } from '../utils/labels.ts';

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
  accent: 'sky' | 'emerald' | 'amber' | 'red';
}) {
  const border = {
    sky: 'border-sky-200',
    emerald: 'border-emerald-200',
    amber: 'border-amber-200',
    red: 'border-red-200',
  }[accent];
  const iconColor = {
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  }[accent];
  return (
    <div className={`rounded-lg border ${border} bg-white p-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function EnvironmentBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">
          {value} ({pct}%)
        </span>
      </div>
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} andel`}
      >
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function OverviewPage() {
  const { declared, observed, reconciled, findings, sources } = useAgentkart();

  const declaredCount = declared.length;
  const observedAgentsCount = reconciled.filter((a) => a.observations.length > 0).length;
  const shadowCount = reconciled.filter((a) => a.matchStatus === 'observation_only').length;
  const criticalFindingAgents = new Set(
    findings.filter((f) => f.severity === 'critical').map((f) => f.agentId),
  ).size;

  const envCounts = { production: 0, test: 0, development: 0, unknown: 0 };
  for (const agent of reconciled) {
    const env =
      agent.declared?.environment ??
      agent.observations.find((o) => o.environment)?.environment ??
      'unknown';
    if (env === 'production' || env === 'test' || env === 'development') {
      envCounts[env] += 1;
    } else {
      envCounts.unknown += 1;
    }
  }
  const totalAgents = reconciled.length;

  const priorityFindings = findings.slice(0, 6);

  const observationsBySource = new Map<string, number>();
  for (const o of observed) {
    observationsBySource.set(o.sourceId, (observationsBySource.get(o.sourceId) ?? 0) + 1);
  }

  const lastObservedAt = observed
    .map((o) => new Date(o.observedAt).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];

  return (
    <div className="space-y-10">
      <section
        aria-labelledby="hero-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
          KI-styring og sikkerhet
        </p>
        <h1
          id="hero-heading"
          className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl md:text-[36px]"
        >
          Finn skyggeagenter før de blir en sikkerhetsrisiko
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
          Agentkart sammenligner virksomhetens godkjente agentregister med tekniske
          observasjoner og viser ukjente agenter, avvik, manglende eierskap og kontrollbehov.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/findings"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Start 90-sekunders demo
          </Link>
          <Link
            to="/agents"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Utforsk agentinventaret
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Syntetiske data · Konseptdemo · Filene behandles lokalt
        </p>
      </section>

      <section aria-labelledby="dashboard-heading" className="space-y-4">
        <div>
          <h2
            id="dashboard-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Hva virksomheten tror den har – mot hva som faktisk er observert
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Nøkkeltall avledet direkte fra register og observasjoner.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Registrerte agenter"
            value={declaredCount}
            hint="Fra godkjent register."
            icon={Users}
            accent="sky"
          />
          <KpiCard
            label="Observerte agenter"
            value={observedAgentsCount}
            hint="Har minst én teknisk observasjon."
            icon={Database}
            accent="emerald"
          />
          <KpiCard
            label="Skyggeagenter"
            value={shadowCount}
            hint="Observert uten treff i registeret."
            icon={AlertTriangle}
            accent="amber"
          />
          <KpiCard
            label="Agenter med kritiske avvik"
            value={criticalFindingAgents}
            hint="Har minst ett kritisk avvik."
            icon={ShieldAlert}
            accent="red"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Prioriterte avvik</h2>
            <Link
              to="/findings"
              className="text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
            >
              Se alle avvik
            </Link>
          </div>
          {priorityFindings.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Ingen avvik funnet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {priorityFindings.map((f) => (
                <li key={f.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={f.severity} />
                      <span className="text-xs text-slate-500">{f.ruleId}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">
                      {f.agentName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{f.summary}</p>
                  </div>
                  <Link
                    to={`/agents/${encodeURIComponent(f.agentId)}`}
                    className="text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline"
                  >
                    Åpne agent
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Miljøfordeling</h2>
            <div className="mt-3 space-y-3">
              <EnvironmentBar
                label="Produksjon"
                value={envCounts.production}
                total={totalAgents}
                color="bg-slate-800"
              />
              <EnvironmentBar
                label="Test"
                value={envCounts.test}
                total={totalAgents}
                color="bg-sky-500"
              />
              <EnvironmentBar
                label="Utvikling"
                value={envCounts.development}
                total={totalAgents}
                color="bg-emerald-500"
              />
              {envCounts.unknown > 0 ? (
                <EnvironmentBar
                  label="Ukjent"
                  value={envCounts.unknown}
                  total={totalAgents}
                  color="bg-slate-400"
                />
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Datakildedekning</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {sources.map((s) => {
                const isRegistry = s.type === 'declared_registry';
                const count = observationsBySource.get(s.sourceId) ?? 0;
                const label = isRegistry
                  ? `${declared.length} registerposter`
                  : `${count} obs.`;
                return (
                  <li key={s.sourceId} className="flex items-center justify-between gap-2">
                    <span className="truncate text-slate-700" title={sourceStatusLabel(s.status)}>
                      {s.name}
                    </span>
                    <Badge
                      tone={
                        s.status === 'ok'
                          ? 'ok'
                          : s.status === 'degraded'
                            ? 'warning'
                            : 'critical'
                      }
                    >
                      {label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Sist observasjon: {lastObservedAt ? formatDateNb(new Date(lastObservedAt)) : 'Ukjent'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <h2 className="text-base font-semibold text-sky-900">Deklarert vs. observert</h2>
        <p className="mt-2 text-sm text-sky-900/90">
          Deklarert informasjon kommer fra virksomhetens agentregister og beskriver hva som er
          godkjent. Observert informasjon kommer fra tekniske datakilder som endepunktskann,
          kodeskann og plattformregistre. Agentkart sammenligner disse to bildene lokalt i
          nettleseren og markerer motstrid, skyggeagenter og risiko.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/agents"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Åpne agentinventar
          </Link>
          <Link
            to="/sources"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Se datakilder
          </Link>
        </div>
      </section>
    </div>
  );
}
