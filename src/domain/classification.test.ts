import { describe, expect, it } from 'vitest';
import { classifyAgent } from './classification.ts';
import type { DeclaredAgent, ObservedAgent } from './types.ts';

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
    writeCapability: true,
    humanApprovalRequired: false,
    approvalStatus: 'approved',
    loggingEnabled: true,
    approvedMcpServers: ['ops-mcp'],
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
    tools: [{ name: 't', permission: 'write' }],
    mcpServers: [],
    dataCategories: [],
    observedAt: '2026-08-30T00:00:00Z',
    writeCapability: true,
    autoApprove: true,
    ...overrides,
  };
}

describe('classifyAgent', () => {
  it('classifies as agent when all four criteria are yes', () => {
    const c = classifyAgent(declared(), [observed()]);
    expect(c.klass).toBe('agent');
  });

  it('classifies as tool for a read-only Copilot Studio agent', () => {
    const c = classifyAgent(
      declared({
        framework: 'Copilot Studio',
        writeCapability: false,
        humanApprovalRequired: true,
        approvalStatus: 'approved',
        approvedMcpServers: [],
      }),
      [observed({ tools: [{ name: 't', permission: 'read' }], writeCapability: false, autoApprove: false })],
    );
    expect(c.klass).toBe('tool');
  });

  it('classifies as automation when 2 of 4 are yes', () => {
    const c = classifyAgent(
      declared({
        framework: 'Copilot Studio',
        humanApprovalRequired: true,
        approvalStatus: 'approved',
      }),
      [observed({ autoApprove: false, tools: [{ name: 't', permission: 'write' }] })],
    );
    expect(c.klass).toBe('automation');
  });

  it('classifies as unknown when nothing is known', () => {
    const c = classifyAgent(null, []);
    expect(c.klass).toBe('unknown');
  });

  it('reasoning names met and unmet criteria', () => {
    const c = classifyAgent(declared(), [observed()]);
    expect(c.reasoning).toContain('Ja på:');
  });
});
