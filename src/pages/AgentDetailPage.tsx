import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CircleAlert, MinusCircle } from 'lucide-react';
import { useAgentkart } from '../app/AgentkartContext.tsx';
import { Badge, SeverityBadge } from '../components/StatusBadge.tsx';
import { STATUS_LABEL, overallStatus } from '../domain/status.ts';
import { formatDateNb, isDemoUrl, isSafeHttpsUrl } from '../utils/format.ts';
import {
  approvalLabel,
  booleanLabel,
  envLabel,
  lifecycleLabel,
  toolPermissionLabel,
} from '../utils/labels.ts';
import type { Evidence, ReconciledAgent } from '../domain/types.ts';

function renderValue(v: unknown, boolAsYesNo = true): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return boolAsYesNo ? (v ? 'Ja' : 'Nei') : String(v);
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.join(', ');
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function SafeUrl({ value }: { value: string | undefined }) {
  if (!value) return <span className="text-slate-500">—</span>;
  if (isDemoUrl(value)) {
    return (
      <span className="text-slate-600" title={value}>
        Fiktiv repositoryadresse i demodata
      </span>
    );
  }
  if (isSafeHttpsUrl(value)) {
    return (
      <a
        href={value}
        rel="noopener noreferrer"
        target="_blank"
        className="text-sky-700 hover:underline"
      >
        {value}
      </a>
    );
  }
  return <span className="text-slate-700">{value}</span>;
}

type CompareStatus = 'match' | 'mismatch' | 'declared_only' | 'observed_only' | 'unknown';

interface ComparisonRowProps {
  label: string;
  declared: unknown;
  observations: Array<{ value: unknown; sourceId: string; observedAt: string; confidence?: number }>;
  renderDeclared?: (v: unknown) => string;
  renderObserved?: (v: unknown) => string;
}

function ComparisonRow({
  label,
  declared,
  observations,
  renderDeclared,
  renderObserved,
}: ComparisonRowProps) {
  const declaredText = renderDeclared ? renderDeclared(declared) : renderValue(declared);
  const rObs = renderObserved ?? renderValue;
  const uniqueObserved = Array.from(new Set(observations.map((o) => rObs(o.value))));
  let status: CompareStatus;
  if (observations.length === 0) {
    status = declared === undefined || declared === null || declared === '' ? 'unknown' : 'declared_only';
  } else if (declared === undefined || declared === null || declared === '') {
    status = 'observed_only';
  } else {
    status = uniqueObserved.length === 1 && uniqueObserved[0] === declaredText ? 'match' : 'mismatch';
  }

  const tone =
    status === 'match'
      ? 'ok'
      : status === 'mismatch'
        ? 'critical'
        : status === 'observed_only'
          ? 'warning'
          : status === 'declared_only'
            ? 'info'
            : 'muted';
  const statusLabel: Record<CompareStatus, string> = {
    match: 'Samsvar',
    mismatch: 'Motstrid',
    declared_only: 'Bare deklarert',
    observed_only: 'Bare observert',
    unknown: 'Ikke registrert',
  };

  return (
    <div className="grid grid-cols-1 gap-2 border-t border-slate-100 py-3 md:grid-cols-3">
      <div>
        <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
        <div className="mt-1">
          <Badge tone={tone}>{statusLabel[status]}</Badge>
        </div>
      </div>
      <div>
        <div className="text-xs text-slate-500">Deklarert</div>
        <div className="mt-1 text-sm text-slate-900">{declaredText}</div>
      </div>
      <div>
        <div className="text-xs text-slate-500">Observert</div>
        {observations.length === 0 ? (
          <div className="mt-1 text-sm text-slate-500">—</div>
        ) : (
          <ul className="mt-1 space-y-1 text-sm text-slate-900">
            {observations.map((o, i) => (
              <li key={`${o.sourceId}-${i}`}>
                {rObs(o.value)}{' '}
                <span className="text-xs text-slate-500">
                  ({o.sourceId}, {formatDateNb(o.observedAt)}
                  {typeof o.confidence === 'number'
                    ? `, treffsikkerhet ${Math.round(o.confidence * 100)} %`
                    : ''})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function evidenceIcon(kind: Evidence['kind']) {
  switch (kind) {
    case 'match':
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
    case 'mismatch':
      return <CircleAlert className="h-4 w-4 text-red-600" aria-hidden="true" />;
    default:
      return <MinusCircle className="h-4 w-4 text-slate-500" aria-hidden="true" />;
  }
}

function DetailContent({ agent }: { agent: ReconciledAgent }) {
  const { findings } = useAgentkart();
  const status = overallStatus(agent, findings);
  const declared = agent.declared;
  const observations = agent.observations;
  const first = observations[0];
  const relevantFindings = findings.filter((f) => f.agentId === agent.id);

  const observedFor = <K extends keyof (typeof observations)[number]>(field: K) =>
    observations
      .filter((o) => o[field] !== undefined && o[field] !== null && o[field] !== '')
      .map((o) => ({
        value: o[field],
        sourceId: o.sourceId,
        observedAt: o.observedAt,
        confidence: o.confidence,
      }));

  const tone =
    status === 'critical'
      ? 'critical'
      : status === 'needs_review'
        ? 'warning'
        : status === 'observed_only'
          ? 'danger'
          : status === 'declared_only'
            ? 'info'
            : 'ok';

  const autoApproveObs = observations.filter((o) => typeof o.autoApprove === 'boolean');
  const autoApproveObserved: boolean | null =
    autoApproveObs.length === 0
      ? null
      : autoApproveObs.some((o) => o.autoApprove === true);
  const humanApprovalRequired = declared?.humanApprovalRequired ?? null;
  const approvedControlPoint =
    declared !== null &&
    declared.humanApprovalRequired &&
    declared.approvalStatus === 'approved';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/agents"
            className="inline-flex items-center gap-1 text-sm text-sky-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Til agentinventar
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{agent.displayName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {declared?.description ??
              first?.name ??
              'Ingen beskrivelse funnet fra register eller observasjon.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>
          <Badge tone="muted">
            {agent.matchStatus === 'matched'
              ? 'Register + observasjon'
              : agent.matchStatus === 'declaration_only'
                ? 'Kun registrert'
                : agent.matchStatus === 'observation_only'
                  ? 'Kun observert'
                  : 'Må bekreftes'}
          </Badge>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Nøkkelfakta</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Formål</dt>
              <dd className="text-right text-slate-900">
                {declared?.businessPurpose ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Miljø</dt>
              <dd className="text-slate-900">
                {envLabel(declared?.environment ?? first?.environment)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Rammeverk</dt>
              <dd className="text-slate-900">
                {declared?.framework ?? first?.framework ?? 'Ukjent'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Livssyklus</dt>
              <dd className="text-slate-900">{lifecycleLabel(declared?.lifecycleStatus)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Eierteam</dt>
              <dd className="text-slate-900">{declared?.ownerTeam ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Sist observert</dt>
              <dd className="text-slate-900">
                {first ? formatDateNb(first.observedAt) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Sist vurdert</dt>
              <dd className="text-slate-900">
                {declared?.lastReviewedAt ? formatDateNb(declared.lastReviewedAt) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Kodearkiv</dt>
              <dd className="text-right text-slate-900">
                <SafeUrl value={declared?.repositoryUrl ?? first?.repositoryUrl} />
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Datakategorier, verktøy og MCP
          </h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Deklarerte datakategorier</div>
              <div className="mt-1 text-slate-900">
                {declared?.dataCategories.length ? declared.dataCategories.join(', ') : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Observerte datakategorier</div>
              <div className="mt-1 text-slate-900">
                {Array.from(new Set(observations.flatMap((o) => o.dataCategories))).join(', ') ||
                  '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Observerte verktøy</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-900">
                {observations.flatMap((o) =>
                  o.tools.map((t, i) => (
                    <li key={`${o.observationId}-tool-${i}`}>
                      <span className="font-medium">{t.name}</span>{' '}
                      <span className="text-slate-500">({toolPermissionLabel(t.permission)})</span>
                    </li>
                  )),
                )}
                {observations.every((o) => o.tools.length === 0) ? (
                  <li className="list-none text-slate-500">Ingen observert.</li>
                ) : null}
              </ul>
            </div>
            <div>
              <div className="text-xs text-slate-500">MCP-servere</div>
              <ul className="mt-1 space-y-1 text-slate-900">
                {observations.flatMap((o) =>
                  o.mcpServers.map((m, i) => (
                    <li
                      key={`${o.observationId}-mcp-${i}`}
                      className="flex items-center gap-2"
                    >
                      <span className="font-medium">{m.name}</span>
                      {m.verified ? (
                        <Badge tone="ok">Verifisert</Badge>
                      ) : (
                        <Badge tone="critical">Uverifisert</Badge>
                      )}
                    </li>
                  )),
                )}
                {observations.every((o) => o.mcpServers.length === 0) ? (
                  <li className="text-slate-500">Ingen observert.</li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Godkjenning og kontroll</h2>
        <p className="mt-1 text-sm text-slate-500">
          Menneskelig kontroll kan ikke direkte observeres teknisk. Vi viser derfor tre separate
          fakta – ikke ett samlet «ja/nei».
        </p>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-3">
            <dt className="text-xs uppercase text-slate-500">Automatisk godkjenning (observert)</dt>
            <dd className="mt-1 text-slate-900">
              {autoApproveObserved === null
                ? 'Ukjent'
                : booleanLabel(autoApproveObserved)}
            </dd>
            <p className="mt-1 text-xs text-slate-500">
              Basert på observert <code>autoApprove</code>.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <dt className="text-xs uppercase text-slate-500">Menneskelig kontroll</dt>
            <dd className="mt-1 text-slate-900">Ukjent</dd>
            <p className="mt-1 text-xs text-slate-500">
              Faktisk menneskelig gjennomgang observeres ikke teknisk av demoen.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <dt className="text-xs uppercase text-slate-500">
              Godkjent kontrollpunkt i registeret
            </dt>
            <dd className="mt-1 text-slate-900">{booleanLabel(approvedControlPoint)}</dd>
            <p className="mt-1 text-xs text-slate-500">
              Registeret krever menneskelig godkjenning: {booleanLabel(humanApprovalRequired)} ·
              Status: {approvalLabel(declared?.approvalStatus)}
            </p>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Deklarert vs. observert</h2>
        <p className="mt-1 text-sm text-slate-500">
          Side-ved-side-sammenligning per felt. Motstrid vises tydelig – potensielle koblinger
          slås ikke sammen automatisk.
        </p>
        <div className="mt-2 divide-y divide-slate-100">
          <ComparisonRow
            label="Navn"
            declared={declared?.name}
            observations={observedFor('name')}
          />
          <ComparisonRow
            label="Miljø"
            declared={declared?.environment}
            observations={observedFor('environment')}
            renderDeclared={(v) => envLabel(v as string | undefined)}
            renderObserved={(v) => envLabel(v as string | undefined)}
          />
          <ComparisonRow
            label="Rammeverk"
            declared={declared?.framework}
            observations={observedFor('framework')}
          />
          <ComparisonRow
            label="Eier"
            declared={declared?.ownerTeam}
            observations={[]}
          />
          <ComparisonRow
            label="Skrivetilgang"
            declared={declared?.writeCapability}
            observations={observedFor('writeCapability')}
          />
          <ComparisonRow
            label="Logging"
            declared={declared?.loggingEnabled}
            observations={observations
              .filter((o) => typeof o.loggingDetected === 'boolean')
              .map((o) => ({
                value: o.loggingDetected,
                sourceId: o.sourceId,
                observedAt: o.observedAt,
                confidence: o.confidence,
              }))}
          />
          <ComparisonRow
            label="Datakategorier"
            declared={declared?.dataCategories}
            observations={observations
              .filter((o) => o.dataCategories.length > 0)
              .map((o) => ({
                value: o.dataCategories,
                sourceId: o.sourceId,
                observedAt: o.observedAt,
                confidence: o.confidence,
              }))}
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Avvik og anbefalte tiltak</h2>
        {relevantFindings.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Ingen avvik registrert for denne agenten.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {relevantFindings.map((f) => (
              <li key={f.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={f.severity} />
                  <span className="text-xs text-slate-500">
                    {f.ruleId} · {f.ruleTitle}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">{f.summary}</p>
                <p className="mt-1 text-sm text-slate-700">{f.explanation}</p>
                <p className="mt-2 text-sm text-slate-900">
                  <span className="font-medium">Anbefalt tiltak:</span> {f.recommendedAction}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Evidens</h2>
        {agent.evidence.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Ingen ekstra evidens registrert.</p>
        ) : (
          <ol className="mt-3 space-y-2 text-sm">
            {agent.evidence.map((e, i) => (
              <li key={`${e.field ?? 'field'}-${i}`} className="flex gap-2">
                {evidenceIcon(e.kind)}
                <div>
                  <span className="font-medium text-slate-900">{e.field ?? e.kind}</span>{' '}
                  <span className="text-slate-500">
                    ({e.kind}
                    {e.sourceId ? `, ${e.sourceId}` : ''}
                    {e.observedAt ? `, ${formatDateNb(e.observedAt)}` : ''})
                  </span>
                  {e.note ? <div className="text-slate-700">{e.note}</div> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const { reconciled } = useAgentkart();
  const decoded = agentId ? decodeURIComponent(agentId) : '';
  const agent = reconciled.find((a) => a.id === decoded);

  if (!agent) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Fant ikke agenten</h1>
        <p className="mt-1 text-sm text-slate-600">
          Agenten kan ha blitt fjernet ved en tilbakestilling eller import.
        </p>
        <Link
          to="/agents"
          className="mt-4 inline-flex items-center gap-1 text-sm text-sky-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tilbake til agentinventar
        </Link>
      </div>
    );
  }

  return <DetailContent agent={agent} />;
}
