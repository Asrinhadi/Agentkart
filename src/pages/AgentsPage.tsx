import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAgentkart } from '../app/AgentkartContext.tsx';
import { Badge } from '../components/StatusBadge.tsx';
import { STATUS_LABEL, overallStatus } from '../domain/status.ts';
import type { MatchStatus, OverallAgentStatus } from '../domain/types.ts';
import { formatDateShortNb } from '../utils/format.ts';
import { approvalLabel, envLabel } from '../utils/labels.ts';
import {
  REGISTRATION_LABEL,
  REGISTRATION_TONE,
  RISK_LEVEL_LABEL,
  RISK_LEVEL_TONE,
} from '../utils/riskLabels.ts';

function overallStatusTone(status: OverallAgentStatus) {
  switch (status) {
    case 'critical':
      return 'critical' as const;
    case 'needs_review':
      return 'warning' as const;
    case 'observed_only':
      return 'danger' as const;
    case 'declared_only':
      return 'info' as const;
    default:
      return 'ok' as const;
  }
}

type Scope = 'all' | 'registered' | 'observed' | 'shadow';
type RegisterFilter = 'all' | 'matched' | 'drift' | 'declaration_only' | 'observation_only';
type ControlFilter = 'all' | 'critical' | 'needs_review' | 'none';

function scopeFromUrl(v: string | null): Scope {
  return v === 'registered' || v === 'observed' || v === 'shadow' ? v : 'all';
}

function registerFromUrl(v: string | null): RegisterFilter {
  const allowed: RegisterFilter[] = ['matched', 'drift', 'declaration_only', 'observation_only'];
  return allowed.includes(v as RegisterFilter) ? (v as RegisterFilter) : 'all';
}

function controlFromUrl(v: string | null): ControlFilter {
  const allowed: ControlFilter[] = ['critical', 'needs_review', 'none'];
  return allowed.includes(v as ControlFilter) ? (v as ControlFilter) : 'all';
}

function envFromUrl(v: string | null): 'all' | 'production' | 'test' | 'development' {
  return v === 'production' || v === 'test' || v === 'development' ? v : 'all';
}

const SCOPE_LABEL: Record<Scope, string> = {
  all: 'Alle agenter',
  registered: 'Registrerte agenter',
  observed: 'Agenter med observasjoner',
  shadow: 'Skyggeagenter (kun observert)',
};

const REGISTER_LABEL: Record<RegisterFilter, string> = {
  all: 'Alle registerstatuser',
  matched: 'Registrert og observert',
  drift: 'Observert med avvik',
  declaration_only: 'Registrert, ikke observert',
  observation_only: 'Observert, ikke registrert',
};

const CONTROL_LABEL: Record<ControlFilter, string> = {
  all: 'Alle kontrollstatuser',
  critical: 'Kritiske funn',
  needs_review: 'Må vurderes',
  none: 'Ingen aktive kontrollfunn',
};

function matchStatusToRegister(m: MatchStatus): RegisterFilter {
  if (m === 'ambiguous') return 'observation_only';
  return m;
}

export function AgentsPage() {
  const { reconciled, findings, sources } = useAgentkart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const environment = envFromUrl(searchParams.get('environment'));
  const registerFilter = registerFromUrl(searchParams.get('register'));
  const controlFilter = controlFromUrl(searchParams.get('control'));
  const scopeFilter = scopeFromUrl(searchParams.get('scope'));

  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'environment' | 'lastReviewed'>('status');

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

  const frameworks = useMemo(() => {
    const set = new Set<string>();
    for (const a of reconciled) {
      if (a.declared?.framework) set.add(a.declared.framework);
      for (const o of a.observations) if (o.framework) set.add(o.framework);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'nb'));
  }, [reconciled]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reconciled
      .map((agent) => {
        const status = overallStatus(agent, findings);
        const env =
          agent.declared?.environment ??
          agent.observations.find((o) => o.environment)?.environment ??
          'unknown';
        const framework =
          agent.declared?.framework ??
          agent.observations.find((o) => o.framework)?.framework ??
          '–';
        const owner = agent.declared?.ownerTeam ?? '—';
        const sourceIds = Array.from(new Set(agent.observations.map((o) => o.sourceId)));
        const write = agent.declared?.writeCapability
          ? 'Skrive'
          : agent.observations.some((o) => o.writeCapability)
            ? 'Skrive (observert)'
            : 'Kun lese';
        const approval = approvalLabel(agent.declared?.approvalStatus);
        const lastReviewed = agent.declared?.lastReviewedAt ?? null;
        const agentFindings = findings.filter((f) => f.agentId === agent.id);
        const hasCritical = agentFindings.some((f) => f.severity === 'critical');
        const controlStatus: ControlFilter =
          hasCritical
            ? 'critical'
            : agentFindings.length > 0
              ? 'needs_review'
              : 'none';
        return {
          agent,
          status,
          env,
          framework,
          owner,
          sourceIds,
          write,
          approval,
          lastReviewed,
          controlStatus,
          registerStatus: matchStatusToRegister(agent.matchStatus),
        };
      })
      .filter((row) => {
        if (scopeFilter === 'registered' && !row.agent.declared) return false;
        if (scopeFilter === 'observed' && row.agent.observations.length === 0) return false;
        if (scopeFilter === 'shadow' && row.agent.matchStatus !== 'observation_only') return false;
        if (environment !== 'all' && row.env !== environment) return false;
        if (registerFilter !== 'all' && row.registerStatus !== registerFilter) return false;
        if (controlFilter !== 'all' && row.controlStatus !== controlFilter) return false;
        if (sourceFilter !== 'all' && !row.sourceIds.includes(sourceFilter)) return false;
        if (frameworkFilter !== 'all' && row.framework !== frameworkFilter) return false;
        if (q) {
          const hay = [row.agent.displayName, row.framework, row.owner, row.env].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortKey === 'status') {
          const order = ['critical', 'needs_review', 'observed_only', 'declared_only', 'ok'] as const;
          const sa = order.indexOf(a.status as (typeof order)[number]);
          const sb = order.indexOf(b.status as (typeof order)[number]);
          if (sa !== sb) return sa - sb;
          return a.agent.displayName.localeCompare(b.agent.displayName, 'nb');
        }
        if (sortKey === 'environment') return a.env.localeCompare(b.env, 'nb');
        if (sortKey === 'lastReviewed') {
          const ta = a.lastReviewed ? new Date(a.lastReviewed).getTime() : 0;
          const tb = b.lastReviewed ? new Date(b.lastReviewed).getTime() : 0;
          return tb - ta;
        }
        return a.agent.displayName.localeCompare(b.agent.displayName, 'nb');
      });
  }, [reconciled, findings, query, environment, registerFilter, controlFilter, scopeFilter, sourceFilter, frameworkFilter, sortKey]);

  const clearFilters = () => {
    setQuery('');
    setSourceFilter('all');
    setFrameworkFilter('all');
    updateUrl({ environment: null, register: null, control: null, scope: null });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Agentinventar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Alle avstemte agenter fra register og tekniske observasjoner. Klikk på en rad for
          detaljer.
        </p>
        {scopeFilter !== 'all' ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-sky-100 py-1 pl-3 pr-1 text-sm text-sky-900 ring-1 ring-inset ring-sky-200">
            <span className="font-medium">Filter fra oversikten:</span>
            <span>{SCOPE_LABEL[scopeFilter]}</span>
            <button
              type="button"
              onClick={() => {
                updateUrl({ scope: null });
              }}
              aria-label="Fjern filter fra oversikten"
              className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-sky-900 hover:bg-sky-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Fritekstsøk</span>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Søk på navn, rammeverk eller eier"
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
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
              <option value="all">Alle miljøer</option>
              <option value="production">{envLabel('production')}</option>
              <option value="test">{envLabel('test')}</option>
              <option value="development">{envLabel('development')}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Registerstatus</span>
            <select
              value={registerFilter}
              onChange={(e) => {
                updateUrl({ register: e.target.value });
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {(Object.keys(REGISTER_LABEL) as RegisterFilter[]).map((v) => (
                <option key={v} value={v}>
                  {REGISTER_LABEL[v]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Kontrollstatus</span>
            <select
              value={controlFilter}
              onChange={(e) => {
                updateUrl({ control: e.target.value });
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {(Object.keys(CONTROL_LABEL) as ControlFilter[]).map((v) => (
                <option key={v} value={v}>
                  {CONTROL_LABEL[v]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Datakilde</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Alle datakilder</option>
              {sources.map((s) => (
                <option key={s.sourceId} value={s.sourceId}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Rammeverk</span>
            <select
              value={frameworkFilter}
              onChange={(e) => setFrameworkFilter(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Alle rammeverk</option>
              {frameworks.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Sortering:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              aria-label="Sorter tabell"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              <option value="status">Status</option>
              <option value="name">Navn</option>
              <option value="environment">Miljø</option>
              <option value="lastReviewed">Sist vurdert</option>
            </select>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Nullstill filtre
          </button>
        </div>
      </section>

      <section aria-labelledby="agent-table-heading" className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <h2 id="agent-table-heading" className="sr-only">
          Agenttabell
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <caption className="sr-only">Liste over agenter</caption>
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2">Agent</th>
                <th scope="col" className="px-3 py-2">Klasse</th>
                <th scope="col" className="px-3 py-2">Risiko</th>
                <th scope="col" className="px-3 py-2">Miljø</th>
                <th scope="col" className="px-3 py-2">Rammeverk</th>
                <th scope="col" className="px-3 py-2">Eier</th>
                <th scope="col" className="px-3 py-2">Kilder</th>
                <th scope="col" className="px-3 py-2">Tilgang</th>
                <th scope="col" className="px-3 py-2">Sist vurdert</th>
                <th scope="col" className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-sm text-slate-500">
                    Ingen agenter matcher filtrene. Prøv å nullstille filtrene.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.agent.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Åpne detaljside for ${row.agent.displayName}`}
                    onClick={() => navigate(`/agents/${encodeURIComponent(row.agent.id)}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/agents/${encodeURIComponent(row.agent.id)}`);
                      }
                    }}
                    className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    <td className="px-3 py-2 font-medium text-slate-900">{row.agent.displayName}</td>
                    <td className="px-3 py-2">
                      <Badge tone={REGISTRATION_TONE[row.agent.classification.klass]}>
                        {REGISTRATION_LABEL[row.agent.classification.klass]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={RISK_LEVEL_TONE[row.agent.risk.level]}>
                        {RISK_LEVEL_LABEL[row.agent.risk.level]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{envLabel(row.env)}</td>
                    <td className="px-3 py-2 text-slate-700">{row.framework}</td>
                    <td className="px-3 py-2 text-slate-700">{row.owner ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.sourceIds.length === 0 ? '—' : row.sourceIds.length}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.write}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatDateShortNb(row.lastReviewed)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={overallStatusTone(row.status)}>{STATUS_LABEL[row.status]}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
