import type { RegistrationClass, RiskLevel } from '../domain/types.ts';

export const REGISTRATION_LABEL: Record<RegistrationClass, string> = {
  tool: 'Verktøy',
  automation: 'Automasjon',
  agent: 'Agent',
  unknown: 'Ukjent klassifisering',
};

export const REGISTRATION_TONE: Record<RegistrationClass, 'muted' | 'info' | 'warning' | 'danger'> = {
  tool: 'muted',
  automation: 'info',
  agent: 'warning',
  unknown: 'danger',
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  unknown: 'Ukjent',
  low: 'Lav',
  medium: 'Middels',
  high: 'Høy',
  critical: 'Kritisk',
};

export const RISK_LEVEL_TONE: Record<RiskLevel, 'ok' | 'info' | 'warning' | 'danger' | 'critical' | 'muted'> = {
  unknown: 'muted',
  low: 'ok',
  medium: 'warning',
  high: 'danger',
  critical: 'critical',
};
