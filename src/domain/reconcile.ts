import type {
  DeclaredAgent,
  Evidence,
  ObservedAgent,
  ReconciledAgent,
} from './types.ts';

export function normalizeKey(value: string | undefined | null): string {
  if (!value) return '';
  return value.trim().toLowerCase();
}

export function normalizeRepoUrl(value: string | undefined | null): string {
  if (!value) return '';
  let v = value.trim().toLowerCase();
  v = v.replace(/\.git$/, '');
  v = v.replace(/\/+$/, '');
  return v;
}

export function normalizeEntryPoint(value: string | undefined | null): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/^\.\//, '');
}

interface DeclaredIndex {
  byKey: Map<string, DeclaredAgent>;
  byRepoEntry: Map<string, DeclaredAgent[]>;
  byNameEnv: Map<string, DeclaredAgent[]>;
}

function buildDeclaredIndex(declared: readonly DeclaredAgent[]): DeclaredIndex {
  const byKey = new Map<string, DeclaredAgent>();
  const byRepoEntry = new Map<string, DeclaredAgent[]>();
  const byNameEnv = new Map<string, DeclaredAgent[]>();

  for (const d of declared) {
    byKey.set(normalizeKey(d.agentKey), d);

    const repo = normalizeRepoUrl(d.repositoryUrl);
    const entry = normalizeEntryPoint(d.entryPoint);
    if (repo && entry) {
      const key = `${repo}|${entry}`;
      const arr = byRepoEntry.get(key) ?? [];
      arr.push(d);
      byRepoEntry.set(key, arr);
    }

    const nameEnvKey = `${normalizeKey(d.name)}|${d.environment}`;
    const arr2 = byNameEnv.get(nameEnvKey) ?? [];
    arr2.push(d);
    byNameEnv.set(nameEnvKey, arr2);
  }

  return { byKey, byRepoEntry, byNameEnv };
}

interface MatchResult {
  declared: DeclaredAgent | null;
  ambiguousCandidates: DeclaredAgent[];
  matchReason?: string;
}

function matchObservation(
  obs: ObservedAgent,
  idx: DeclaredIndex,
): MatchResult {
  if (obs.agentKey) {
    const hit = idx.byKey.get(normalizeKey(obs.agentKey));
    if (hit) return { declared: hit, ambiguousCandidates: [], matchReason: 'agentKey' };
  }

  const repo = normalizeRepoUrl(obs.repositoryUrl);
  const entry = normalizeEntryPoint(obs.entryPoint);
  if (repo && entry) {
    const key = `${repo}|${entry}`;
    const arr = idx.byRepoEntry.get(key) ?? [];
    if (arr.length === 1) {
      return { declared: arr[0] ?? null, ambiguousCandidates: [], matchReason: 'repositoryUrl+entryPoint' };
    }
    if (arr.length > 1) {
      return { declared: null, ambiguousCandidates: arr, matchReason: 'ambiguous repositoryUrl+entryPoint' };
    }
  }

  if (obs.environment) {
    const key = `${normalizeKey(obs.name)}|${obs.environment}`;
    const arr = idx.byNameEnv.get(key) ?? [];
    if (arr.length === 1) {
      return { declared: arr[0] ?? null, ambiguousCandidates: [], matchReason: 'name+environment' };
    }
    if (arr.length > 1) {
      return { declared: null, ambiguousCandidates: arr, matchReason: 'ambiguous name+environment' };
    }
  }

  return { declared: null, ambiguousCandidates: [] };
}

const COMPARE_FIELDS: Array<{
  field: string;
  getD: (d: DeclaredAgent) => unknown;
  getO: (o: ObservedAgent) => unknown;
}> = [
  { field: 'name', getD: (d) => d.name, getO: (o) => o.name },
  { field: 'environment', getD: (d) => d.environment, getO: (o) => o.environment },
  { field: 'framework', getD: (d) => d.framework, getO: (o) => o.framework },
  { field: 'repositoryUrl', getD: (d) => d.repositoryUrl, getO: (o) => o.repositoryUrl },
  { field: 'entryPoint', getD: (d) => d.entryPoint, getO: (o) => o.entryPoint },
  { field: 'writeCapability', getD: (d) => d.writeCapability, getO: (o) => o.writeCapability },
];

function valuesEqualLoose(a: unknown, b: unknown): boolean {
  if (a === undefined || a === null) return b === undefined || b === null;
  if (b === undefined || b === null) return false;
  if (typeof a === 'string' && typeof b === 'string') {
    return normalizeKey(a) === normalizeKey(b);
  }
  return a === b;
}

function buildEvidence(
  declared: DeclaredAgent | null,
  observations: readonly ObservedAgent[],
  possibleLinkAgentKeys: string[],
): Evidence[] {
  const evidence: Evidence[] = [];

  if (declared && observations.length === 0) {
    evidence.push({
      kind: 'declaration_only',
      note: 'Agenten er deklarert i registeret, men ingen tekniske observasjoner er registrert.',
    });
  }

  if (!declared && observations.length > 0) {
    evidence.push({
      kind: 'observation_only',
      note: 'Agenten er observert teknisk, men finnes ikke i det godkjente registeret.',
    });
  }

  if (declared) {
    for (const obs of observations) {
      for (const cmp of COMPARE_FIELDS) {
        const dVal = cmp.getD(declared);
        const oVal = cmp.getO(obs);
        if (oVal === undefined || oVal === null || oVal === '') continue;
        const isMatch = valuesEqualLoose(dVal, oVal);
        evidence.push({
          kind: isMatch ? 'match' : 'mismatch',
          field: cmp.field,
          declaredValue: dVal ?? null,
          observedValue: oVal,
          sourceId: obs.sourceId,
          observedAt: obs.observedAt,
          confidence: obs.confidence,
        });
      }

      if (typeof obs.loggingDetected === 'boolean') {
        evidence.push({
          kind: obs.loggingDetected === declared.loggingEnabled ? 'match' : 'mismatch',
          field: 'logging',
          declaredValue: declared.loggingEnabled,
          observedValue: obs.loggingDetected,
          sourceId: obs.sourceId,
          observedAt: obs.observedAt,
          confidence: obs.confidence,
        });
      }

      if (typeof obs.autoApprove === 'boolean') {
        const declaredHumanApproval = declared.humanApprovalRequired;
        const conflict = obs.autoApprove && declaredHumanApproval;
        evidence.push({
          kind: conflict ? 'mismatch' : 'match',
          field: 'humanApproval',
          declaredValue: declaredHumanApproval,
          observedValue: !obs.autoApprove,
          sourceId: obs.sourceId,
          observedAt: obs.observedAt,
          confidence: obs.confidence,
        });
      }

      if (obs.dataCategories.length > 0) {
        const declaredSet = new Set(declared.dataCategories.map((c) => normalizeKey(c)));
        const extra = obs.dataCategories.filter((c) => !declaredSet.has(normalizeKey(c)));
        if (extra.length > 0) {
          evidence.push({
            kind: 'mismatch',
            field: 'dataCategories',
            declaredValue: declared.dataCategories,
            observedValue: obs.dataCategories,
            sourceId: obs.sourceId,
            observedAt: obs.observedAt,
            note: `Ekstra observerte kategorier: ${extra.join(', ')}`,
          });
        } else {
          evidence.push({
            kind: 'match',
            field: 'dataCategories',
            declaredValue: declared.dataCategories,
            observedValue: obs.dataCategories,
            sourceId: obs.sourceId,
            observedAt: obs.observedAt,
          });
        }
      }
    }
  }

  for (const key of possibleLinkAgentKeys) {
    evidence.push({
      kind: 'possible_link',
      field: 'agentKey',
      declaredValue: key,
      note: 'Mulig kobling til deklarert agent. Må bekreftes manuelt.',
    });
  }

  return evidence;
}

export interface ReconcileResult {
  agents: ReconciledAgent[];
}

export function reconcile(
  declared: readonly DeclaredAgent[],
  observed: readonly ObservedAgent[],
): ReconcileResult {
  const declaredCopy = declared.slice();
  const observedCopy = observed.slice();

  const idx = buildDeclaredIndex(declaredCopy);

  const matchedDeclared = new Map<string, ObservedAgent[]>();
  const orphanObservationsByBucket = new Map<string, ObservedAgent[]>();
  const orphanPossibleLinks = new Map<string, Set<string>>();

  for (const obs of observedCopy) {
    const res = matchObservation(obs, idx);
    if (res.declared) {
      const key = res.declared.agentKey;
      const arr = matchedDeclared.get(key) ?? [];
      arr.push(obs);
      matchedDeclared.set(key, arr);
    } else {
      const bucketKey = obs.agentKey
        ? `key:${normalizeKey(obs.agentKey)}`
        : obs.repositoryUrl && obs.entryPoint
        ? `repo:${normalizeRepoUrl(obs.repositoryUrl)}|${normalizeEntryPoint(obs.entryPoint)}`
        : `name:${normalizeKey(obs.name)}|${obs.environment ?? 'unknown'}|${obs.observationId}`;
      const arr = orphanObservationsByBucket.get(bucketKey) ?? [];
      arr.push(obs);
      orphanObservationsByBucket.set(bucketKey, arr);

      if (res.ambiguousCandidates.length > 0) {
        const set = orphanPossibleLinks.get(bucketKey) ?? new Set<string>();
        for (const cand of res.ambiguousCandidates) {
          set.add(cand.agentKey);
        }
        orphanPossibleLinks.set(bucketKey, set);
      }
    }
  }

  const agents: ReconciledAgent[] = [];

  for (const decl of declaredCopy) {
    const obsList = matchedDeclared.get(decl.agentKey) ?? [];
    const evidence = buildEvidence(decl, obsList, []);
    agents.push({
      id: `declared:${decl.agentKey}`,
      displayName: decl.name,
      matchStatus: obsList.length > 0 ? 'matched' : 'declaration_only',
      declared: decl,
      observations: obsList,
      evidence,
    });
  }

  for (const [bucketKey, obsList] of orphanObservationsByBucket) {
    const possible = Array.from(orphanPossibleLinks.get(bucketKey) ?? []);
    const evidence = buildEvidence(null, obsList, possible);
    const first = obsList[0];
    const name = first ? first.name : bucketKey;
    agents.push({
      id: `observed:${bucketKey}`,
      displayName: name,
      matchStatus: possible.length > 0 ? 'ambiguous' : 'observation_only',
      declared: null,
      observations: obsList,
      evidence,
      possibleLinks: possible,
    });
  }

  return { agents };
}
