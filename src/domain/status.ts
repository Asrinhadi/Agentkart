import type {
  Finding,
  OverallAgentStatus,
  ReconciledAgent,
  Severity,
} from './types.ts';

export function overallStatus(
  agent: ReconciledAgent,
  findings: readonly Finding[],
): OverallAgentStatus {
  const forAgent = findings.filter((f) => f.agentId === agent.id);
  const worst = worstSeverity(forAgent.map((f) => f.severity));

  if (worst === 'critical') return 'critical';
  if (worst === 'high' || worst === 'medium' || worst === 'low') return 'needs_review';

  if (agent.matchStatus === 'observation_only' || agent.matchStatus === 'ambiguous') {
    return 'observed_only';
  }
  if (agent.matchStatus === 'declaration_only') {
    return 'declared_only';
  }
  return 'ok';
}

export function worstSeverity(list: readonly Severity[]): Severity | null {
  const rank: Record<Severity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  let best = 0;
  let winner: Severity | null = null;
  for (const s of list) {
    if (rank[s] > best) {
      best = rank[s];
      winner = s;
    }
  }
  return winner;
}

export const STATUS_LABEL: Record<OverallAgentStatus, string> = {
  ok: 'I orden',
  needs_review: 'Må vurderes',
  critical: 'Kritisk',
  declared_only: 'Bare registrert',
  observed_only: 'Ikke registrert',
};
