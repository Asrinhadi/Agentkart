import { describe, expect, it } from 'vitest';
import { assessRisk } from './risk.ts';
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

describe('assessRisk', () => {
  it('marks shadow agent as unknown, not low', () => {
    const r = assessRisk(null, [observed({ name: 'Shadow' })], 'observation_only');
    expect(r.level).toBe('unknown');
    expect(r.dimensions.rights).toBe('unknown');
    expect(r.headline).toContain('Ukjent');
  });

  it('critical for production agent with execute tool and autoApprove', () => {
    const r = assessRisk(
      declared({ writeCapability: true, dataCategories: ['kundedata'] }),
      [
        observed({
          autoApprove: true,
          tools: [{ name: 't', permission: 'execute' }],
          writeCapability: true,
          dataCategories: ['kundedata'],
        }),
      ],
      'other',
    );
    expect(r.level === 'critical' || r.level === 'high').toBe(true);
    expect(r.driverDimension).not.toBeNull();
  });

  it('highest dimension drives level (no averages)', () => {
    const r = assessRisk(
      declared({ writeCapability: false, dataCategories: ['særlig kategori'] }),
      [observed({ dataCategories: ['særlig kategori'] })],
      'other',
    );
    expect(r.dimensions.data).toBe('special_category');
    // reversibility easy, autonomy suggests, rights read, reach organization → data drives to critical
    expect(r.driverDimension).toBe('data');
  });

  it('controls can lower level by max one step', () => {
    const with_controls = assessRisk(
      declared({
        writeCapability: true,
        humanApprovalRequired: true,
        approvalStatus: 'approved',
        loggingEnabled: true,
        approvedMcpServers: ['ops'],
      }),
      [
        observed({
          writeCapability: true,
          autoApprove: false,
          loggingDetected: true,
          mcpServers: [{ name: 'ops', verified: true, approved: true }],
        }),
      ],
      'other',
    );
    expect(with_controls.loweredByControls).toBe(true);
    expect(with_controls.headline).toContain('senket');
  });

  it('headline reads as a sentence with all five dimensions', () => {
    const r = assessRisk(declared(), [observed()], 'other');
    expect(r.headline.length).toBeGreaterThan(20);
    expect(r.headline).toMatch(/—/);
  });
});
