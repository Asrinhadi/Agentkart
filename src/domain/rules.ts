import type {
  ControlRule,
  Evidence,
  Finding,
  ObservedAgent,
  ReconciledAgent,
  Severity,
} from './types.ts';

export const CONTROL_RULES: ControlRule[] = [
  {
    id: 'AK-R1',
    title: 'Observert, men ikke registrert',
    description:
      'En agent er observert teknisk uten treff i det godkjente agentregisteret.',
    defaultSeverity: 'high',
    rationale:
      'Skyggeagenter uten registrering unndras styring og risikovurdering. I produksjon er dette kritisk.',
  },
  {
    id: 'AK-R2',
    title: 'Ikke observert nylig',
    description:
      'En agent som er markert som aktiv i registeret er ikke observert de siste 90 dagene.',
    defaultSeverity: 'medium',
    rationale:
      'Register og virkelighet bør stemme overens. Agenter som ikke lenger kjøres bør avvikles formelt.',
  },
  {
    id: 'AK-R3',
    title: 'Mangler eier',
    description: 'Aktiv agent uten definert eierteam.',
    defaultSeverity: 'high',
    rationale:
      'Uten eierskap er det uklart hvem som svarer for endringer, hendelser og risiko.',
  },
  {
    id: 'AK-R4',
    title: 'Ukontrollert skrivetilgang',
    description:
      'Produksjonsagent med skrive- eller kjøretilgang, men uten godkjent menneskelig kontroll.',
    defaultSeverity: 'critical',
    rationale:
      'Agenter som kan endre data eller kjøre kode uten menneskelig godkjenning kan forårsake alvorlig skade.',
  },
  {
    id: 'AK-R5',
    title: 'Ukontrollert MCP-server',
    description:
      'Observert bruk av tredjeparts-MCP-server som ikke er verifisert eller godkjent.',
    defaultSeverity: 'high',
    rationale:
      'Ukjente MCP-servere kan gi datalekkasje, uautorisert kodekjøring eller kompromittert leverandørkjede.',
  },
  {
    id: 'AK-R6',
    title: 'Utdatert vurdering',
    description:
      'Aktiv produksjonsagent med lastReviewedAt eldre enn 180 dager eller uten dato.',
    defaultSeverity: 'medium',
    rationale:
      'Regelmessig gjennomgang er nødvendig for å oppdage endringer i risikobilde og bruk.',
  },
  {
    id: 'AK-R7',
    title: 'Motstridende metadata',
    description:
      'Sentrale verdier avviker mellom registeret og tekniske observasjoner.',
    defaultSeverity: 'medium',
    rationale:
      'Motstrid indikerer at enten registeret er utdatert eller implementasjonen har drevet fra godkjent design.',
  },
  {
    id: 'AK-R8',
    title: 'Manglende logging',
    description:
      'Aktiv produksjonsagent uten aktivert eller observert logging.',
    defaultSeverity: 'high',
    rationale:
      'Uten logging kan agenten ikke revideres, feilsøkes eller etterforskes ved sikkerhetshendelser.',
  },
];

const CONFLICT_FIELDS = ['environment', 'framework', 'writeCapability'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function ruleById(id: string): ControlRule {
  const r = CONTROL_RULES.find((x) => x.id === id);
  if (!r) throw new Error(`Ukjent kontrollregel: ${id}`);
  return r;
}

function makeFinding(params: {
  ruleId: string;
  severity: Severity;
  agent: ReconciledAgent;
  summary: string;
  explanation: string;
  recommendedAction: string;
  evidence: Evidence[];
  now: Date;
}): Finding {
  const rule = ruleById(params.ruleId);
  const env =
    params.agent.declared?.environment ??
    params.agent.observations.find((o) => o.environment)?.environment ??
    'unknown';
  return {
    id: `${params.agent.id}:${params.ruleId}`,
    ruleId: params.ruleId,
    ruleTitle: rule.title,
    agentId: params.agent.id,
    agentName: params.agent.displayName,
    environment: env,
    severity: params.severity,
    summary: params.summary,
    explanation: params.explanation,
    recommendedAction: params.recommendedAction,
    evidence: params.evidence,
    status: 'open',
    createdAt: params.now.toISOString(),
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

function detectEnvironment(agent: ReconciledAgent): string | undefined {
  return (
    agent.declared?.environment ??
    agent.observations.find((o) => o.environment)?.environment
  );
}

function latestObservationDate(agent: ReconciledAgent): Date | null {
  let latest: Date | null = null;
  for (const o of agent.observations) {
    const d = new Date(o.observedAt);
    if (Number.isNaN(d.getTime())) continue;
    if (!latest || d.getTime() > latest.getTime()) {
      latest = d;
    }
  }
  return latest;
}

function hasWriteOrExecute(obs: ObservedAgent): boolean {
  if (obs.writeCapability === true) return true;
  return obs.tools.some((t) => t.permission === 'write' || t.permission === 'execute');
}

export function ruleShadowAgent(agent: ReconciledAgent, now: Date): Finding | null {
  if (agent.declared !== null || agent.matchStatus === 'ambiguous') return null;
  if (agent.observations.length === 0) return null;

  const env = detectEnvironment(agent);
  const severity: Severity = env === 'production' ? 'critical' : 'high';

  return makeFinding({
    ruleId: 'AK-R1',
    severity,
    agent,
    summary: 'Observert agent uten treff i godkjent register.',
    explanation:
      env === 'production'
        ? 'Denne agenten er observert teknisk i produksjon, men finnes ikke i godkjent register. Dette regnes som en kritisk skyggeagent.'
        : 'Denne agenten er observert teknisk, men finnes ikke i godkjent register.',
    recommendedAction:
      'Bekreft eierskap og formål. Registrer, isoler eller avvikle agenten.',
    evidence: agent.evidence.filter((e) => e.kind === 'observation_only' || e.kind === 'possible_link'),
    now,
  });
}

export function ruleNotObservedRecently(agent: ReconciledAgent, now: Date): Finding | null {
  if (!agent.declared) return null;
  if (agent.declared.lifecycleStatus !== 'active') return null;
  const latest = latestObservationDate(agent);
  if (!latest) {
    return makeFinding({
      ruleId: 'AK-R2',
      severity: 'medium',
      agent,
      summary: 'Aktiv registeragent uten tekniske observasjoner de siste 90 dagene.',
      explanation:
        'Agenten er markert aktiv i registeret, men ingen datakilde har rapportert observasjoner i det hele tatt.',
      recommendedAction:
        'Bekreft om agenten fortsatt er i bruk, og oppdater livssyklusstatus.',
      evidence: [],
      now,
    });
  }
  const diff = daysBetween(now, latest);
  if (diff > 90) {
    return makeFinding({
      ruleId: 'AK-R2',
      severity: 'medium',
      agent,
      summary: `Sist observert for ${diff} dager siden.`,
      explanation:
        'Aktiv agent er ikke observert av tekniske datakilder de siste 90 dagene.',
      recommendedAction:
        'Bekreft om agenten fortsatt er i bruk, og oppdater livssyklusstatus.',
      evidence: [
        {
          kind: 'observation_only',
          field: 'observedAt',
          observedValue: latest.toISOString(),
          note: `${diff} dager siden siste observasjon.`,
        },
      ],
      now,
    });
  }
  return null;
}

export function ruleMissingOwner(agent: ReconciledAgent, now: Date): Finding | null {
  if (!agent.declared) return null;
  if (agent.declared.lifecycleStatus !== 'active') return null;
  const owner = agent.declared.ownerTeam;
  if (owner && owner.trim().length > 0) return null;
  return makeFinding({
    ruleId: 'AK-R3',
    severity: 'high',
    agent,
    summary: 'Aktiv agent mangler definert eierteam.',
    explanation:
      'Uten et registrert eierteam er det uklart hvem som er ansvarlig for drift, sikkerhet og endringer.',
    recommendedAction: 'Tildel et ansvarlig eierteam før videre bruk.',
    evidence: [
      {
        kind: 'declaration_only',
        field: 'ownerTeam',
        declaredValue: owner,
        note: 'Eierfeltet er tomt eller null.',
      },
    ],
    now,
  });
}

export function ruleUncontrolledWrite(agent: ReconciledAgent, now: Date): Finding | null {
  const env = detectEnvironment(agent);
  if (env !== 'production') return null;

  const declared = agent.declared;
  const observedWrite = agent.observations.some(hasWriteOrExecute);
  const declaredWrite = declared?.writeCapability === true;
  const autoApprove = agent.observations.some((o) => o.autoApprove === true);

  if (!observedWrite && !declaredWrite && !autoApprove) return null;

  const humanApproved =
    declared?.humanApprovalRequired === true &&
    declared.approvalStatus === 'approved' &&
    !autoApprove;

  if (humanApproved) return null;

  const explanationParts: string[] = [];
  if (declaredWrite || observedWrite) {
    explanationParts.push('Produksjonsagenten har skrive- eller kjøretilgang.');
  }
  if (autoApprove) {
    explanationParts.push('Observasjon viser autoApprove=true uten menneskelig kontrollpunkt.');
  }
  if (!declared) {
    explanationParts.push('Ingen deklarasjon i registeret dokumenterer godkjenning.');
  } else if (declared.approvalStatus !== 'approved') {
    explanationParts.push(
      `Godkjenningsstatus i registeret er «${declared.approvalStatus}».`,
    );
  }

  return makeFinding({
    ruleId: 'AK-R4',
    severity: 'critical',
    agent,
    summary: 'Ukontrollert skrivetilgang i produksjon.',
    explanation: explanationParts.join(' '),
    recommendedAction:
      'Begrens tilgangen, innfør eksplisitt godkjenning og dokumenter kontrollpunktet.',
    evidence: agent.observations.flatMap<Evidence>((o) => {
      const items: Evidence[] = [];
      if (o.autoApprove === true) {
        items.push({
          kind: 'mismatch',
          field: 'autoApprove',
          declaredValue: false,
          observedValue: true,
          sourceId: o.sourceId,
          observedAt: o.observedAt,
        });
      }
      const writeTool = o.tools.find(
        (t) => t.permission === 'write' || t.permission === 'execute',
      );
      if (writeTool) {
        items.push({
          kind: 'observation_only',
          field: 'tools',
          observedValue: writeTool,
          sourceId: o.sourceId,
          observedAt: o.observedAt,
        });
      }
      return items;
    }),
    now,
  });
}

export function ruleUncontrolledMcp(agent: ReconciledAgent, now: Date): Finding | null {
  const approved = new Set(
    (agent.declared?.approvedMcpServers ?? []).map((s) => s.trim().toLowerCase()),
  );
  const problematic: Array<{ obs: ObservedAgent; mcp: { name: string; verified: boolean } }> = [];
  for (const obs of agent.observations) {
    for (const mcp of obs.mcpServers) {
      const key = mcp.name.trim().toLowerCase();
      const isApproved = approved.has(key) || mcp.approved === true;
      if (!mcp.verified && !isApproved) {
        problematic.push({ obs, mcp });
      }
    }
  }
  if (problematic.length === 0) return null;

  return makeFinding({
    ruleId: 'AK-R5',
    severity: 'high',
    agent,
    summary: `Observert ${problematic.length} uverifisert MCP-server(e).`,
    explanation:
      'Én eller flere MCP-servere som agenten bruker er ikke verifiserte eller godkjente i registeret.',
    recommendedAction:
      'Stans eller isoler integrasjonen inntil leverandør, tilganger og databehandling er vurdert.',
    evidence: problematic.map<Evidence>(({ obs, mcp }) => ({
      kind: 'observation_only',
      field: 'mcpServers',
      observedValue: mcp.name,
      sourceId: obs.sourceId,
      observedAt: obs.observedAt,
      note: `MCP-server «${mcp.name}» er ikke verifisert eller godkjent.`,
    })),
    now,
  });
}

export function ruleOutdatedReview(agent: ReconciledAgent, now: Date): Finding | null {
  const declared = agent.declared;
  if (!declared) return null;
  if (declared.lifecycleStatus !== 'active') return null;
  if (declared.environment !== 'production') return null;

  const reviewed = declared.lastReviewedAt ? new Date(declared.lastReviewedAt) : null;
  const missing = !reviewed || Number.isNaN(reviewed.getTime());
  if (missing) {
    return makeFinding({
      ruleId: 'AK-R6',
      severity: 'medium',
      agent,
      summary: 'Produksjonsagenten mangler datert vurdering.',
      explanation:
        'Ingen dato for siste vurdering er registrert for denne aktive produksjonsagenten.',
      recommendedAction:
        'Gjennomfør og dokumenter en ny teknisk og styringsmessig vurdering.',
      evidence: [
        {
          kind: 'declaration_only',
          field: 'lastReviewedAt',
          declaredValue: null,
        },
      ],
      now,
    });
  }
  const diff = daysBetween(now, reviewed);
  if (diff > 180) {
    return makeFinding({
      ruleId: 'AK-R6',
      severity: 'medium',
      agent,
      summary: `Vurdering er ${diff} dager gammel.`,
      explanation:
        'Vurderingen av denne aktive produksjonsagenten er eldre enn 180 dager.',
      recommendedAction:
        'Gjennomfør og dokumenter en ny teknisk og styringsmessig vurdering.',
      evidence: [
        {
          kind: 'declaration_only',
          field: 'lastReviewedAt',
          declaredValue: declared.lastReviewedAt,
          note: `${diff} dager siden sist vurdering.`,
        },
      ],
      now,
    });
  }
  return null;
}

export function ruleConflictingMetadata(agent: ReconciledAgent, now: Date): Finding | null {
  if (!agent.declared) return null;
  if (agent.observations.length === 0) return null;

  const conflicts = agent.evidence.filter(
    (e) => e.kind === 'mismatch' && e.field && CONFLICT_FIELDS.includes(e.field as (typeof CONFLICT_FIELDS)[number]),
  );
  if (conflicts.length === 0) return null;

  const fields = Array.from(new Set(conflicts.map((c) => c.field ?? '')));
  return makeFinding({
    ruleId: 'AK-R7',
    severity: 'medium',
    agent,
    summary: `Motstrid på: ${fields.join(', ')}.`,
    explanation:
      'Sentrale verdier er observert annerledes enn de er deklarert. Dette må undersøkes.',
    recommendedAction:
      'Undersøk hvilken kilde som er korrekt, og oppdater register eller implementasjon.',
    evidence: conflicts,
    now,
  });
}

export function ruleMissingLogging(agent: ReconciledAgent, now: Date): Finding | null {
  const declared = agent.declared;
  if (!declared) return null;
  if (declared.lifecycleStatus !== 'active') return null;
  if (declared.environment !== 'production') return null;

  const declaredLogging = declared.loggingEnabled;
  const observedLogging = agent.observations.some((o) => o.loggingDetected === true);
  const observedFalse = agent.observations.some((o) => o.loggingDetected === false);
  const hasObservations = agent.observations.length > 0;

  if (declaredLogging && observedLogging) return null;

  let summary: string;
  let explanation: string;
  if (!declaredLogging) {
    summary = 'Logging er ikke aktivert i registeret.';
    explanation =
      'Registeret oppgir at logging ikke er aktivert for denne produksjonsagenten.';
  } else if (observedFalse) {
    summary = 'Logging observert som ikke aktiv.';
    explanation =
      'Registeret oppgir logging som aktivert, men datakilden har observert at logging ikke er på.';
  } else {
    summary = 'Logging ikke bekreftet.';
    explanation = hasObservations
      ? 'Registeret oppgir logging som aktivert, men ingen datakilde har bekreftet at logging faktisk skjer. Fraværet kan skyldes manglende signal fra observasjonskildene, ikke nødvendigvis at logging mangler.'
      : 'Registeret oppgir logging som aktivert, men det finnes ingen tekniske observasjoner som kan bekrefte dette. Manglende observasjoner er ikke det samme som manglende logging.';
  }

  return makeFinding({
    ruleId: 'AK-R8',
    severity: 'high',
    agent,
    summary,
    explanation,
    recommendedAction:
      'Aktiver sporbar logging og definer hvilke hendelser som skal kunne revideres.',
    evidence: [
      {
        kind: declaredLogging ? 'mismatch' : 'declaration_only',
        field: 'loggingEnabled',
        declaredValue: declaredLogging,
        observedValue: observedLogging,
      },
    ],
    now,
  });
}

export type RuleFn = (agent: ReconciledAgent, now: Date) => Finding | null;

export const ALL_RULES: RuleFn[] = [
  ruleShadowAgent,
  ruleNotObservedRecently,
  ruleMissingOwner,
  ruleUncontrolledWrite,
  ruleUncontrolledMcp,
  ruleOutdatedReview,
  ruleConflictingMetadata,
  ruleMissingLogging,
];

export function evaluateRules(agents: readonly ReconciledAgent[], now: Date): Finding[] {
  const findings: Finding[] = [];
  for (const agent of agents) {
    for (const rule of ALL_RULES) {
      const f = rule(agent, now);
      if (f) findings.push(f);
    }
  }
  return findings;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function sortFindingsBySeverity(findings: readonly Finding[]): Finding[] {
  return findings.slice().sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity];
    const sb = SEVERITY_ORDER[b.severity];
    if (sa !== sb) return sa - sb;
    return a.agentName.localeCompare(b.agentName, 'nb');
  });
}
