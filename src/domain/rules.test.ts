import { describe, expect, it } from 'vitest';
import {
  evaluateRules,
  ruleConflictingMetadata,
  ruleMissingLogging,
  ruleMissingOwner,
  ruleNotObservedRecently,
  ruleOutdatedReview,
  ruleShadowAgent,
  ruleUncontrolledMcp,
  ruleUncontrolledWrite,
} from './rules.ts';
import { reconcile } from './reconcile.ts';
import type { DeclaredAgent, ObservedAgent } from './types.ts';

const NOW = new Date('2026-09-01T09:00:00Z');

function declared(overrides: Partial<DeclaredAgent> = {}): DeclaredAgent {
  return {
    agentKey: 'k',
    name: 'Agent',
    description: 'x',
    businessPurpose: 'y',
    environment: 'production',
    lifecycleStatus: 'active',
    ownerTeam: 'Team',
    repositoryUrl: 'https://git.example/x',
    entryPoint: 'src/main.ts',
    framework: 'LangGraph',
    dataCategories: [],
    writeCapability: false,
    humanApprovalRequired: false,
    approvalStatus: 'approved',
    loggingEnabled: true,
    approvedMcpServers: [],
    lastReviewedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

function observed(overrides: Partial<ObservedAgent> = {}): ObservedAgent {
  return {
    observationId: 'o',
    sourceId: 'src-endpoint',
    name: 'Agent',
    environment: 'production',
    tools: [],
    mcpServers: [],
    dataCategories: [],
    observedAt: '2026-08-30T00:00:00Z',
    loggingDetected: true,
    ...overrides,
  };
}

describe('AK-R1 shadow agent', () => {
  it('critical in production', () => {
    const r = reconcile([], [observed({ name: 'Shadow', environment: 'production' })]);
    const f = ruleShadowAgent(r.agents[0]!, NOW);
    expect(f?.severity).toBe('critical');
  });

  it('high outside production', () => {
    const r = reconcile([], [observed({ name: 'Shadow', environment: 'test' })]);
    const f = ruleShadowAgent(r.agents[0]!, NOW);
    expect(f?.severity).toBe('high');
  });

  it('null when declared present', () => {
    const r = reconcile([declared()], [observed({ agentKey: 'k' })]);
    expect(ruleShadowAgent(r.agents[0]!, NOW)).toBeNull();
  });
});

describe('AK-R2 not observed recently', () => {
  it('fires for active declared agent without recent observation', () => {
    const r = reconcile([declared({ agentKey: 'k' })], []);
    const f = ruleNotObservedRecently(r.agents[0]!, NOW);
    expect(f?.severity).toBe('medium');
  });

  it('fires when last observation is older than 90 days', () => {
    const r = reconcile(
      [declared({ agentKey: 'k' })],
      [observed({ agentKey: 'k', observedAt: '2026-05-01T00:00:00Z' })],
    );
    const f = ruleNotObservedRecently(r.agents[0]!, NOW);
    expect(f?.severity).toBe('medium');
  });

  it('does not fire when observed recently', () => {
    const r = reconcile(
      [declared({ agentKey: 'k' })],
      [observed({ agentKey: 'k', observedAt: '2026-08-30T00:00:00Z' })],
    );
    expect(ruleNotObservedRecently(r.agents[0]!, NOW)).toBeNull();
  });
});

describe('AK-R3 missing owner', () => {
  it('fires when ownerTeam is null', () => {
    const r = reconcile([declared({ ownerTeam: null })], []);
    const f = ruleMissingOwner(r.agents[0]!, NOW);
    expect(f?.severity).toBe('high');
  });
  it('does not fire when owner set', () => {
    const r = reconcile([declared({ ownerTeam: 'Team' })], []);
    expect(ruleMissingOwner(r.agents[0]!, NOW)).toBeNull();
  });
});

describe('AK-R4 uncontrolled write in production', () => {
  it('critical when autoApprove observed as true', () => {
    const r = reconcile(
      [declared({ writeCapability: true, humanApprovalRequired: false })],
      [observed({ agentKey: 'k', autoApprove: true, writeCapability: true })],
    );
    const f = ruleUncontrolledWrite(r.agents[0]!, NOW);
    expect(f?.severity).toBe('critical');
  });

  it('critical when write/execute tool observed and no human approval', () => {
    const r = reconcile(
      [declared({ writeCapability: false, humanApprovalRequired: false, approvalStatus: 'not_required' })],
      [
        observed({
          agentKey: 'k',
          tools: [{ name: 't', permission: 'execute' }],
        }),
      ],
    );
    const f = ruleUncontrolledWrite(r.agents[0]!, NOW);
    expect(f?.severity).toBe('critical');
  });

  it('no finding when human approval required and approved', () => {
    const r = reconcile(
      [
        declared({
          writeCapability: true,
          humanApprovalRequired: true,
          approvalStatus: 'approved',
        }),
      ],
      [
        observed({
          agentKey: 'k',
          writeCapability: true,
          autoApprove: false,
          tools: [{ name: 't', permission: 'write' }],
        }),
      ],
    );
    expect(ruleUncontrolledWrite(r.agents[0]!, NOW)).toBeNull();
  });

  it('does not fire for development env', () => {
    const r = reconcile(
      [declared({ environment: 'development' })],
      [
        observed({
          agentKey: 'k',
          environment: 'development',
          autoApprove: true,
          tools: [{ name: 't', permission: 'execute' }],
        }),
      ],
    );
    expect(ruleUncontrolledWrite(r.agents[0]!, NOW)).toBeNull();
  });
});

describe('AK-R5 uncontrolled MCP', () => {
  it('fires when observed MCP is unverified and not approved', () => {
    const r = reconcile(
      [declared({ approvedMcpServers: ['approved-mcp'] })],
      [
        observed({
          agentKey: 'k',
          mcpServers: [{ name: 'sketchy-mcp', verified: false }],
        }),
      ],
    );
    const f = ruleUncontrolledMcp(r.agents[0]!, NOW);
    expect(f?.severity).toBe('high');
  });

  it('does not fire when MCP is verified', () => {
    const r = reconcile(
      [declared()],
      [
        observed({
          agentKey: 'k',
          mcpServers: [{ name: 'verified-mcp', verified: true }],
        }),
      ],
    );
    expect(ruleUncontrolledMcp(r.agents[0]!, NOW)).toBeNull();
  });
});

describe('AK-R6 outdated review', () => {
  it('fires when review older than 180 days', () => {
    const r = reconcile(
      [declared({ lastReviewedAt: '2026-01-01T00:00:00Z' })],
      [observed({ agentKey: 'k' })],
    );
    const f = ruleOutdatedReview(r.agents[0]!, NOW);
    expect(f?.severity).toBe('medium');
  });

  it('fires when lastReviewedAt is null', () => {
    const r = reconcile([declared({ lastReviewedAt: null })], []);
    const f = ruleOutdatedReview(r.agents[0]!, NOW);
    expect(f?.severity).toBe('medium');
  });

  it('does not fire when review is recent', () => {
    const r = reconcile([declared({ lastReviewedAt: '2026-08-01T00:00:00Z' })], []);
    expect(ruleOutdatedReview(r.agents[0]!, NOW)).toBeNull();
  });
});

describe('AK-R7 conflicting metadata', () => {
  it('fires when environment differs', () => {
    const r = reconcile(
      [declared({ environment: 'production' })],
      [observed({ agentKey: 'k', environment: 'test' })],
    );
    const f = ruleConflictingMetadata(r.agents[0]!, NOW);
    expect(f?.severity).toBe('medium');
  });

  it('does not fire when metadata matches', () => {
    const r = reconcile(
      [declared({ framework: 'LangGraph' })],
      [observed({ agentKey: 'k', framework: 'LangGraph' })],
    );
    expect(ruleConflictingMetadata(r.agents[0]!, NOW)).toBeNull();
  });
});

describe('AK-R8 missing logging', () => {
  it('fires when loggingEnabled is false', () => {
    const r = reconcile([declared({ loggingEnabled: false })], []);
    const f = ruleMissingLogging(r.agents[0]!, NOW);
    expect(f?.severity).toBe('high');
  });

  it('fires when no observation confirms logging', () => {
    const r = reconcile([declared({ loggingEnabled: true })], []);
    const f = ruleMissingLogging(r.agents[0]!, NOW);
    expect(f?.severity).toBe('high');
  });

  it('does not fire when both declared and observed', () => {
    const r = reconcile(
      [declared({ loggingEnabled: true })],
      [observed({ agentKey: 'k', loggingDetected: true })],
    );
    expect(ruleMissingLogging(r.agents[0]!, NOW)).toBeNull();
  });
});

describe('evaluateRules integration', () => {
  it('marks shadow production agent as critical', () => {
    const r = reconcile(
      [],
      [observed({ name: 'RogueX', environment: 'production' })],
    );
    const findings = evaluateRules(r.agents, NOW);
    const shadow = findings.find((f) => f.ruleId === 'AK-R1');
    expect(shadow?.severity).toBe('critical');
  });

  it('does not incorrectly mark development-only agent as critical', () => {
    const r = reconcile(
      [declared({ environment: 'development', lifecycleStatus: 'pilot', loggingEnabled: false })],
      [
        observed({
          agentKey: 'k',
          environment: 'development',
          autoApprove: true,
          tools: [{ name: 't', permission: 'execute' }],
        }),
      ],
    );
    const findings = evaluateRules(r.agents, NOW);
    const critical = findings.filter((f) => f.severity === 'critical');
    expect(critical).toHaveLength(0);
  });
});
