import { describe, expect, it } from 'vitest';
import {
  parseAndValidateObservations,
  parseAndValidateRegistry,
} from './import.ts';
import {
  DEMO_OBSERVATIONS_FILE,
  DEMO_REGISTRY_FILE,
} from '../data/demoData.ts';

describe('parseAndValidateRegistry', () => {
  it('accepts valid registry', () => {
    const res = parseAndValidateRegistry(JSON.stringify(DEMO_REGISTRY_FILE));
    expect(res.ok).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const res = parseAndValidateRegistry('{');
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error.message).toMatch(/JSON/);
  });

  it('rejects wrong schemaVersion', () => {
    const bad = { ...DEMO_REGISTRY_FILE, schemaVersion: 2 };
    const res = parseAndValidateRegistry(JSON.stringify(bad));
    expect(res.ok).toBe(false);
  });

  it('rejects missing required fields', () => {
    const missing = {
      schemaVersion: 1,
      generatedAt: '2026-09-01T00:00:00Z',
      source: 'x',
      agents: [{ agentKey: 'k' }],
    };
    const res = parseAndValidateRegistry(JSON.stringify(missing));
    expect(res.ok).toBe(false);
  });

  it('rejects unknown top-level fields', () => {
    const bad = { ...DEMO_REGISTRY_FILE, extra: 'x' };
    const res = parseAndValidateRegistry(JSON.stringify(bad));
    expect(res.ok).toBe(false);
  });

  it('rejects too-long text fields', () => {
    const bigName = 'x'.repeat(300);
    const bad = {
      ...DEMO_REGISTRY_FILE,
      agents: [{ ...DEMO_REGISTRY_FILE.agents[0], name: bigName }],
    };
    const res = parseAndValidateRegistry(JSON.stringify(bad));
    expect(res.ok).toBe(false);
  });

  it('rejects too many agents', () => {
    const big = {
      ...DEMO_REGISTRY_FILE,
      agents: Array.from({ length: 501 }, (_, i) => ({
        ...DEMO_REGISTRY_FILE.agents[0],
        agentKey: `k${i}`,
      })),
    };
    const res = parseAndValidateRegistry(JSON.stringify(big));
    expect(res.ok).toBe(false);
  });

  it('rejects invalid date format', () => {
    const bad = { ...DEMO_REGISTRY_FILE, generatedAt: 'not a date' };
    const res = parseAndValidateRegistry(JSON.stringify(bad));
    expect(res.ok).toBe(false);
  });
});

describe('parseAndValidateObservations', () => {
  it('accepts valid observations', () => {
    const res = parseAndValidateObservations(JSON.stringify(DEMO_OBSERVATIONS_FILE));
    expect(res.ok).toBe(true);
  });

  it('rejects wrong schemaVersion', () => {
    const bad = { ...DEMO_OBSERVATIONS_FILE, schemaVersion: 99 };
    const res = parseAndValidateObservations(JSON.stringify(bad));
    expect(res.ok).toBe(false);
  });

  it('rejects invalid observation object', () => {
    const bad = {
      ...DEMO_OBSERVATIONS_FILE,
      observations: [{ observationId: 'x' }],
    };
    const res = parseAndValidateObservations(JSON.stringify(bad));
    expect(res.ok).toBe(false);
  });
});
