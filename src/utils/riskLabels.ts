import type {
  AutonomyLevel,
  DataSensitivity,
  Evidence,
  RegistrationClass,
  ReachLevel,
  ReversibilityLevel,
  RightsLevel,
  RiskLevel,
} from '../domain/types.ts';

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

export const RIGHTS_LABEL: Record<RightsLevel, string> = {
  read: 'Kun lese',
  write: 'Skrive',
  administer: 'Administrere',
  can_escalate: 'Kan utvide egne rettigheter',
  unknown: 'Ukjent',
};

export const DATA_LABEL: Record<DataSensitivity, string> = {
  open: 'Åpne data',
  internal: 'Interne data',
  personal: 'Personopplysninger',
  special_category: 'Særlige kategorier personopplysninger',
  unknown: 'Ukjent',
};

export const AUTONOMY_LABEL: Record<AutonomyLevel, string> = {
  suggests: 'Foreslår',
  acts_after_approval: 'Handler etter godkjenning',
  acts_within_frame: 'Handler fritt innenfor ramme',
  initiates: 'Initierer egne oppgaver',
  unknown: 'Ukjent',
};

export const REACH_LABEL: Record<ReachLevel, string> = {
  single_user: 'Én bruker',
  team: 'Ett team',
  organization: 'Hele organisasjonen',
  customers_and_external: 'Kunder og eksterne',
  unknown: 'Ukjent',
};

export const REVERSIBILITY_LABEL: Record<ReversibilityLevel, string> = {
  easy: 'Enkelt å angre',
  hard: 'Vanskelig å angre',
  irreversible: 'Kan ikke reverseres',
  unknown: 'Ukjent',
};

export const EVIDENCE_KIND_LABEL: Record<Evidence['kind'], string> = {
  match: 'Samsvar',
  mismatch: 'Motstrid',
  observation_only: 'Kun observert',
  declaration_only: 'Kun deklarert',
  possible_link: 'Mulig kobling',
};

const FIELD_LABEL: Record<string, string> = {
  name: 'Navn',
  environment: 'Miljø',
  framework: 'Rammeverk',
  repositoryUrl: 'Kodearkiv',
  entryPoint: 'Inngangspunkt',
  writeCapability: 'Skrivetilgang',
  loggingEnabled: 'Logging',
  logging: 'Logging',
  humanApproval: 'Menneskelig godkjenning',
  autoApprove: 'Automatisk godkjenning',
  dataCategories: 'Datakategorier',
  ownerTeam: 'Eierteam',
  observedAt: 'Sist observert',
  lastReviewedAt: 'Sist vurdert',
  agentKey: 'Agentnøkkel',
  mcpServers: 'MCP-servere',
  tools: 'Verktøy',
};

export function fieldLabel(v: string | undefined | null): string {
  if (!v) return '';
  return FIELD_LABEL[v] ?? v;
}
