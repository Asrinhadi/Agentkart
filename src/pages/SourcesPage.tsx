import { useRef, useState, type ChangeEvent } from 'react';
import { Download, FileJson, RefreshCw, Upload } from 'lucide-react';
import { useAgentkart } from '../app/AgentkartContext.tsx';
import { Badge } from '../components/StatusBadge.tsx';
import {
  type ImportError,
  importDeclaredRegistryFromFile,
  importObservationsFromFile,
} from '../services/import.ts';
import { formatDateNb } from '../utils/format.ts';
import { sourceStatusLabel, sourceTypeLabel } from '../utils/labels.ts';
import { SIGNAL_CATALOG } from '../data/signalCatalog.ts';

type ImportKind = 'registry' | 'observations';

interface ImportStatus {
  kind: 'ok' | 'error';
  message: string;
  details?: string[];
}

function toStatus(err: ImportError): ImportStatus {
  return { kind: 'error', message: err.message, details: err.details };
}

export function SourcesPage() {
  const {
    sources,
    observed,
    declared,
    declaredGeneratedAt,
    observedGeneratedAt,
    setDeclared,
    setObserved,
    loadDemo,
  } = useAgentkart();

  const registryInputRef = useRef<HTMLInputElement | null>(null);
  const obsInputRef = useRef<HTMLInputElement | null>(null);
  const [registryStatus, setRegistryStatus] = useState<ImportStatus | null>(null);
  const [obsStatus, setObsStatus] = useState<ImportStatus | null>(null);

  const observationsBySource = new Map<string, number>();
  for (const o of observed) {
    observationsBySource.set(o.sourceId, (observationsBySource.get(o.sourceId) ?? 0) + 1);
  }

  async function handleFile(kind: ImportKind, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (kind === 'registry') {
      const res = await importDeclaredRegistryFromFile(file);
      if (res.ok) {
        setDeclared(res.data);
        setRegistryStatus({
          kind: 'ok',
          message: `Importerte ${res.data.agents.length} registrerte agenter fra «${file.name}».`,
        });
      } else {
        setRegistryStatus(toStatus(res.error));
      }
    } else {
      const res = await importObservationsFromFile(file);
      if (res.ok) {
        setObserved(res.data);
        setObsStatus({
          kind: 'ok',
          message: `Importerte ${res.data.observations.length} observasjoner fra «${file.name}».`,
        });
      } else {
        setObsStatus(toStatus(res.error));
      }
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Datakilder</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kildene som demoen sammenstiller.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Registrerte datakilder</h2>
        <p className="mt-1 text-sm text-slate-600">
          Dekning viser hvor stor del av miljøet kilden ser. En høy dekning gjør et lite antall
          funn troverdig; en lav dekning betyr at fravær ikke er bevis på fravær.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2">Navn</th>
                <th scope="col" className="px-3 py-2">Type</th>
                <th scope="col" className="px-3 py-2">Innsamling</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2">Dekning</th>
                <th scope="col" className="px-3 py-2">Observasjoner</th>
                <th scope="col" className="px-3 py-2">Sist observert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.map((s) => {
                const isRegistry = s.type === 'declared_registry';
                const observationsForSource = observationsBySource.get(s.sourceId) ?? 0;
                const pct = s.coveragePercent;
                const coverageTone =
                  pct === undefined
                    ? 'muted'
                    : pct >= 80
                      ? 'ok'
                      : pct >= 60
                        ? 'warning'
                        : 'critical';
                return (
                  <tr key={s.sourceId} className="align-top">
                    <td className="px-3 py-2 font-medium text-slate-900">{s.name}</td>
                    <td className="px-3 py-2 text-slate-700">{sourceTypeLabel(s.type)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {s.collectionMethod ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        tone={
                          s.status === 'ok'
                            ? 'ok'
                            : s.status === 'degraded'
                              ? 'warning'
                              : 'critical'
                        }
                      >
                        {sourceStatusLabel(s.status)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {isRegistry ? (
                        <span className="text-xs text-slate-500">
                          Ikke en teknisk observasjonskilde
                        </span>
                      ) : (
                        <div className="min-w-[9rem]">
                          <div className="flex items-center gap-2">
                            {pct !== undefined ? (
                              <Badge tone={coverageTone}>{pct} %</Badge>
                            ) : (
                              <Badge tone="muted">Ukjent</Badge>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {s.coverage ?? '—'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {isRegistry
                        ? `${declared.length} registerposter`
                        : observationsForSource}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {formatDateNb(s.lastObservedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="signal-catalog-heading"
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 id="signal-catalog-heading" className="text-lg font-semibold text-slate-900">
          Signalkatalog
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Hva slags signaler kan brukes til å oppdage KI-agenter, hva beviser hvert av dem, og
          hvor svake er de? Katalogen er statisk og forklarer «hvorfor stoler vi på dette?»
          bak hver observasjon.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2">Signal</th>
                <th scope="col" className="px-3 py-2">Indikerer</th>
                <th scope="col" className="px-3 py-2">Svakhet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SIGNAL_CATALOG.map((s) => (
                <tr key={s.type} className="align-top">
                  <td className="px-3 py-2 font-medium text-slate-900">{s.label}</td>
                  <td className="px-3 py-2 text-slate-700">{s.proves}</td>
                  <td className="px-3 py-2 text-slate-700">{s.weakness}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-base font-semibold text-sky-900">Filbehandling</h2>
            <p className="mt-1 text-sm text-sky-900/90">
              Filer leses lokalt (maks 1 MB, 500 poster). Ikke last opp reelle
              personopplysninger.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDemo}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Last inn demodata
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Importer godkjent register</h3>
          <p className="mt-1 text-sm text-slate-600">
            Det aktive datasettet inneholder {declared.length} registrerte agenter (generert{' '}
            {formatDateNb(declaredGeneratedAt)}).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Velg registerfil (.json)</span>
              <input
                ref={registryInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  void handleFile('registry', e);
                }}
              />
            </label>
            <a
              href="/examples/declared-agents.json"
              download
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Last ned eksempel
            </a>
          </div>
          {registryStatus ? (
            <div
              role={registryStatus.kind === 'error' ? 'alert' : 'status'}
              className={`mt-3 rounded-md border p-3 text-sm ${
                registryStatus.kind === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <p className="font-medium">{registryStatus.message}</p>
              {registryStatus.details && registryStatus.details.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {registryStatus.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Importer tekniske observasjoner</h3>
          <p className="mt-1 text-sm text-slate-600">
            Det aktive datasettet inneholder {observed.length} observasjoner (generert{' '}
            {formatDateNb(observedGeneratedAt)}).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
              <FileJson className="h-4 w-4" aria-hidden="true" />
              <span>Velg observasjonsfil (.json)</span>
              <input
                ref={obsInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  void handleFile('observations', e);
                }}
              />
            </label>
            <a
              href="/examples/observed-agents.json"
              download
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Last ned eksempel
            </a>
          </div>
          {obsStatus ? (
            <div
              role={obsStatus.kind === 'error' ? 'alert' : 'status'}
              className={`mt-3 rounded-md border p-3 text-sm ${
                obsStatus.kind === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              <p className="font-medium">{obsStatus.message}</p>
              {obsStatus.details && obsStatus.details.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {obsStatus.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
