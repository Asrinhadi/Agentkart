import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { OverviewPage } from './OverviewPage.tsx';
import { renderWithProviders } from '../test/renderApp.tsx';
import { DEMO_DECLARED, DEMO_NOW, DEMO_OBSERVED } from '../data/demoData.ts';
import { reconcile } from '../domain/reconcile.ts';
import { evaluateRules } from '../domain/rules.ts';

function readKpi(label: string): string {
  const heading = screen.getByText(label);
  const card = heading.closest('div')?.parentElement;
  if (!card) throw new Error(`Fant ikke kort for ${label}`);
  const value = card.querySelector('div.text-3xl');
  return value?.textContent ?? '';
}

describe('OverviewPage', () => {
  it('renders KPI numbers derived from demo data', () => {
    renderWithProviders(<OverviewPage />);
    const reconciled = reconcile(DEMO_DECLARED, DEMO_OBSERVED).agents;
    const observedAgents = reconciled.filter((a) => a.observations.length > 0).length;
    const shadow = reconciled.filter((a) => a.matchStatus === 'observation_only').length;
    const findings = evaluateRules(reconciled, DEMO_NOW);
    const critical = new Set(findings.filter((f) => f.severity === 'critical').map((f) => f.agentId)).size;

    expect(readKpi('Registrerte agenter')).toBe(String(DEMO_DECLARED.length));
    expect(readKpi('Observerte agenter')).toBe(String(observedAgents));
    expect(readKpi('Skyggeagenter')).toBe(String(shadow));
    expect(readKpi('Agenter med kritiske avvik')).toBe(String(critical));
  });
});
