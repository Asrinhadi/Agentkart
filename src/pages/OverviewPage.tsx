import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Database, ExternalLink, GitCompare, Info, Radar, Rocket, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
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
  to,
  linkLabel,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
  accent: 'sky' | 'emerald' | 'amber' | 'red';
  to: string;
  linkLabel: string;
}) {
  const border = {
    sky: 'border-sky-200 hover:border-sky-400',
    emerald: 'border-emerald-200 hover:border-emerald-400',
    amber: 'border-amber-200 hover:border-amber-400',
    red: 'border-red-200 hover:border-red-400',
  }[accent];
  const iconColor = {
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  }[accent];
  return (
    <Link
      to={to}
      aria-label={linkLabel}
      className={`group block rounded-lg border ${border} bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
      </div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{hint}</p>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Åpne
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>
    </Link>
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

  const matchStateCounts = {
    matched: reconciled.filter((a) => a.matchStatus === 'matched').length,
    drift: reconciled.filter((a) => a.matchStatus === 'drift').length,
    declaration_only: reconciled.filter((a) => a.matchStatus === 'declaration_only').length,
    observation_only: reconciled.filter(
      (a) => a.matchStatus === 'observation_only' || a.matchStatus === 'ambiguous',
    ).length,
  };

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
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Se prioriterte avvik
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
            to="/agents?scope=registered"
            linkLabel="Åpne registrerte agenter i agentinventaret"
          />
          <KpiCard
            label="Observerte agenter"
            value={observedAgentsCount}
            hint="Har minst én teknisk observasjon."
            icon={Database}
            accent="emerald"
            to="/agents?scope=observed"
            linkLabel="Åpne observerte agenter i agentinventaret"
          />
          <KpiCard
            label="Skyggeagenter"
            value={shadowCount}
            hint="Observert uten treff i registeret."
            icon={AlertTriangle}
            accent="amber"
            to="/agents?status=observed_only"
            linkLabel="Åpne skyggeagenter i agentinventaret"
          />
          <KpiCard
            label="Agenter med kritiske avvik"
            value={criticalFindingAgents}
            hint="Har minst ett kritisk avvik."
            icon={ShieldAlert}
            accent="red"
            to="/findings?severity=critical"
            linkLabel="Åpne kritiske avvik"
          />
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Fire tilstander mellom register og observasjon
          </div>
          <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            {[
              {
                key: 'matched',
                label: 'Deklarert og observert',
                count: matchStateCounts.matched,
                tone: 'bg-emerald-50 border-emerald-200 text-emerald-900',
              },
              {
                key: 'drift',
                label: 'Observert med avvik',
                count: matchStateCounts.drift,
                tone: 'bg-amber-50 border-amber-200 text-amber-900',
              },
              {
                key: 'declaration_only',
                label: 'Deklarert, ikke observert',
                count: matchStateCounts.declaration_only,
                tone: 'bg-sky-50 border-sky-200 text-sky-900',
              },
              {
                key: 'observation_only',
                label: 'Observert, ikke deklarert',
                count: matchStateCounts.observation_only,
                tone: 'bg-red-50 border-red-200 text-red-900',
              },
            ].map((s) => (
              <li key={s.key} className={`flex items-center justify-between rounded-md border px-3 py-2 ${s.tone}`}>
                <span>{s.label}</span>
                <span className="text-lg font-semibold">{s.count}</span>
              </li>
            ))}
          </ul>
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

      <section aria-labelledby="flow-heading">
        <div className="mb-4">
          <h2 id="flow-heading" className="text-xl font-semibold text-slate-900">
            Slik fungerer det
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Fire steg – fra to uavhengige kilder til konkrete tiltak.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '1',
              icon: ClipboardCheck,
              tone: 'sky',
              title: 'Godkjent register',
              text: 'Slik virksomheten mener det ser ut – hva som er godkjent og hvem som eier det.',
            },
            {
              step: '2',
              icon: Radar,
              tone: 'emerald',
              title: 'Tekniske observasjoner',
              text: 'Slik datakildene faktisk ser det – hvilke agenter som kjører, med hvilke tilganger.',
            },
            {
              step: '3',
              icon: GitCompare,
              tone: 'amber',
              title: 'Avstemming',
              text: 'De to bildene matches deterministisk. Tvetydige treff slås aldri sammen automatisk.',
            },
            {
              step: '4',
              icon: ShieldCheck,
              tone: 'red',
              title: 'Funn og tiltak',
              text: 'Åtte kontrollregler produserer risikofunn med evidens og anbefalt handling.',
            },
          ].map((s, i, arr) => {
            const Icon = s.icon;
            const iconClass = {
              sky: 'bg-sky-100 text-sky-700',
              emerald: 'bg-emerald-100 text-emerald-700',
              amber: 'bg-amber-100 text-amber-800',
              red: 'bg-red-100 text-red-700',
            }[s.tone];
            return (
              <li
                key={s.step}
                className="relative flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${iconClass}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Steg {s.step}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
                {i < arr.length - 1 ? (
                  <ArrowRight
                    className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-300 lg:block"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
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

      <section
        aria-labelledby="about-concept-heading"
        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
          <Info className="h-5 w-5 shrink-0 text-slate-500 sm:mt-0.5" aria-hidden="true" />
          <div>
            <h2
              id="about-concept-heading"
              className="text-base font-semibold text-slate-900"
            >
              Om konseptdemoen
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              Agentkart er en statisk konseptdemo. Alle data behandles lokalt i nettleseren
              og sendes aldri til en server. Innebygde eksempler er syntetiske, og
              rapportene bygger på importerte JSON-filer – ikke en aktiv nettverksskanning.
              Kontrollreglene og referansene til rammeverk som EU AI Act er
              styringshjelpemidler for demonstrasjon, ikke en juridisk vurdering.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="about-heading"
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 id="about-heading" className="text-xl font-semibold text-slate-900">
            Om demoen
          </h2>

          <p className="mt-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Problemet:</span>{' '}
            Virksomheter tar i bruk stadig flere autonome KI-agenter, men registeret og
            virkeligheten er sjelden i takt. Skyggeagenter, ukontrollert skrivetilgang og
            manglende logging oppdages ofte først når noe har gått galt.
          </p>

          <p className="mt-3 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Min rolle:</span>{' '}
            Jeg har utviklet konseptet, definert problemstillingen og kravene, og bygget
            og kvalitetssikret demoen med AI-assistert utvikling. Jeg har selv vurdert
            domenemodellen, kontrollreglene, sikkerhetsbegrensningene og videreutviklingen
            av løsningen.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Implementert i demoen
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>· Avstemming mellom register og observasjoner</li>
                <li>· Åtte kontrollregler (AK-R1 til AK-R8)</li>
                <li>· Evidens per funn med provenance</li>
                <li>· Sikker lokal JSON-import (Zod)</li>
                <li>· Responsivt og tilgjengelig grensesnitt</li>
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-800">
                <Rocket className="h-4 w-4" aria-hidden="true" />
                Planlagt neste versjon
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                <li>· PostgreSQL og backend-API</li>
                <li>· Autentisering og roller</li>
                <li>· Funnhistorikk og godkjenningsflyt</li>
                <li>· Automatiske datakoblinger</li>
              </ul>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Utviklet av
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">Asrin Hadi</p>
          <p className="mt-1 text-sm text-slate-600">
            Bachelorstudent i informasjonssystemer
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['React', 'TypeScript', 'Tailwind', 'Zod'].map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
          <a
            href="https://github.com/Asrinhadi/Agentkart"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Kildekode på GitHub
          </a>
        </aside>
      </section>
    </div>
  );
}
