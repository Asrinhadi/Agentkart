import { describe, expect, it } from 'vitest';
import { reconcile } from './reconcile.ts';
import type { DeclaredAgent, ObservedAgent } from './types.ts';

const baseDeclared: DeclaredAgent = {
  agentKey: 'alpha',
  name: 'Alpha',
  description: 'x',
  businessPurpose: 'y',
  environment: 'production',
  lifecycleStatus: 'active',
  ownerTeam: 'Team A',
  repositoryUrl: 'https://git.example/repo',
  entryPoint: 'src/index.ts',
  framework: 'LangGraph',
  dataCategories: [],
  writeCapability: false,
  humanApprovalRequired: false,
  approvalStatus: 'approved',
  loggingEnabled: true,
  approvedMcpServers: [],
  lastReviewedAt: '2026-08-01T00:00:00Z',
};

const baseObserved: ObservedAgent = {
  observationId: 'o1',
  sourceId: 'src-endpoint',
  name: 'Alpha',
  environment: 'production',
  tools: [],
  mcpServers: [],
  dataCategories: [],
  observedAt: '2026-08-30T00:00:00Z',
};

describe('reconcile', () => {
  it('matches on exact agentKey', () => {
    const result = reconcile(
      [baseDeclared],
      [{ ...baseObserved, agentKey: 'alpha' }],
    );
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]!.matchStatus).toBe('matched');
  });

  it('matches on repositoryUrl + entryPoint when key missing', () => {
    const result = reconcile(
      [baseDeclared],
      [
        {
          ...baseObserved,
          agentKey: undefined,
          repositoryUrl: 'HTTPS://git.example/repo/',
          entryPoint: 'src/index.ts',
        },
      ],
    );
    expect(result.agents[0]!.matchStatus).toBe('matched');
  });

  it('matches on name+environment when unambiguous', () => {
    const result = reconcile(
      [baseDeclared],
      [{ ...baseObserved, name: 'Alpha', environment: 'production' }],
    );
    expect(result.agents[0]!.matchStatus).toBe('matched');
  });

  it('does not merge ambiguous name+environment', () => {
    const twin: DeclaredAgent = { ...baseDeclared, agentKey: 'alpha2' };
    const result = reconcile(
      [baseDeclared, twin],
      [{ ...baseObserved, agentKey: undefined, repositoryUrl: undefined, entryPoint: undefined }],
    );
    const orphan = result.agents.find((a) => a.matchStatus === 'ambiguous');
    expect(orphan).toBeTruthy();
    expect(orphan?.possibleLinks?.length).toBeGreaterThan(0);
  });

  it('creates observation_only bucket for shadow agent', () => {
    const result = reconcile(
      [],
      [{ ...baseObserved, agentKey: 'shadow-x', name: 'Shadow' }],
    );
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]!.matchStatus).toBe('observation_only');
    expect(result.agents[0]!.declared).toBeNull();
  });

  it('keeps declared-only agents', () => {
    const result = reconcile([baseDeclared], []);
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0]!.matchStatus).toBe('declaration_only');
  });

  it('aggregates multiple observations with provenance', () => {
    const result = reconcile(
      [baseDeclared],
      [
        { ...baseObserved, observationId: 'o1', sourceId: 'src-endpoint', agentKey: 'alpha' },
        { ...baseObserved, observationId: 'o2', sourceId: 'src-code-scan', agentKey: 'alpha' },
      ],
    );
    expect(result.agents[0]!.observations).toHaveLength(2);
    const sources = new Set(result.agents[0]!.evidence.map((e) => e.sourceId).filter(Boolean));
    expect(sources.has('src-endpoint')).toBe(true);
    expect(sources.has('src-code-scan')).toBe(true);
  });

  it('does not mutate source arrays', () => {
    const declared = [baseDeclared];
    const observed = [baseObserved];
    const declaredCopy = declared.slice();
    const observedCopy = observed.slice();
    reconcile(declared, observed);
    expect(declared).toEqual(declaredCopy);
    expect(observed).toEqual(observedCopy);
  });
});
