import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAgentkart } from '../app/AgentkartContext.tsx';
import { Badge } from '../components/StatusBadge.tsx';
import { STATUS_LABEL, overallStatus } from '../domain/status.ts';
import type { OverallAgentStatus, Severity } from '../domain/types.ts';
import { formatDateShortNb } from '../utils/format.ts';

const STATUS_ORDER: OverallAgentStatus[] = [
  'critical',
  'needs_review',
  'observed_only',
  'declared_only',
  'ok',
];

const SEVERITY_OPTIONS: Array<{ value: Severity | 'all'; label: string }> = [
  { value: 'all', label: 'Alle alvorlighetsgrader' },
  { value: 'critical', label: 'Kritisk' },
  { value: 'high', label: 'Høy' },
  { value: 'medium', label: 'Middels' },
  { value: 'low', label: 'Lav' },
];

function statusTone(status: OverallAgentStatus) {
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

export function AgentsPage() {
  const { reconciled, findings, sources } = useAgentkart();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [environment, setEnvironment] = useState<'all' | 'production' | 'test' | 'development'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | OverallAgentStatus>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'environment' | 'lastReviewed'>('status');

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
        const approval = agent.declared?.approvalStatus ?? 'ikke registrert';
        const lastReviewed = agent.declared?.lastReviewedAt ?? null;
        const agentFindings = findings.filter((f) => f.agentId === agent.id);
        const worst: Severity | undefined = agentFindings[0]?.severity;
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
          worst,
        };
      })
      .filter((row) => {
        if (environment !== 'all' && row.env !== environment) return false;
        if (statusFilter !== 'all' && row.status !== statusFilter) return false;
        if (severityFilter !== 'all' && row.worst !== severityFilter) return false;
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
          const sa = STATUS_ORDER.indexOf(a.status);
          const sb = STATUS_ORDER.indexOf(b.status);
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
  }, [reconciled, findings, query, environment, statusFilter, severityFilter, sourceFilter, frameworkFilter, sortKey]);

  const clearFilters = () => {
    setQuery('');
    setEnvironment('all');
    setStatusFilter('all');
    setSeverityFilter('all');
    setSourceFilter('all');
    setFrameworkFilter('all');
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Agentinventar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Alle avstemte agenter fra register og tekniske observasjoner. Klikk på en rad for
          detaljer.
        </p>
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
              onChange={(e) => setEnvironment(e.target.value as typeof environment)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Alle miljøer</option>
              <option value="production">Produksjon</option>
              <option value="test">Test</option>
              <option value="development">Utvikling</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Alle statuser</option>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Alvorlighetsgrad</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
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
                <th scope="col" className="px-3 py-2">Miljø</th>
                <th scope="col" className="px-3 py-2">Rammeverk</th>
                <th scope="col" className="px-3 py-2">Eier</th>
                <th scope="col" className="px-3 py-2">Observasjonskilder</th>
                <th scope="col" className="px-3 py-2">Tilgang</th>
                <th scope="col" className="px-3 py-2">Godkjenning</th>
                <th scope="col" className="px-3 py-2">Sist vurdert</th>
                <th scope="col" className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm text-slate-500">
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
                    <td className="px-3 py-2 text-slate-700">{row.env}</td>
                    <td className="px-3 py-2 text-slate-700">{row.framework}</td>
                    <td className="px-3 py-2 text-slate-700">{row.owner ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {row.sourceIds.length === 0 ? '—' : row.sourceIds.length}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.write}</td>
                    <td className="px-3 py-2 text-slate-700">{row.approval}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatDateShortNb(row.lastReviewed)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={statusTone(row.status)}>{STATUS_LABEL[row.status]}</Badge>
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
