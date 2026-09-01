export type AgentEnvironment = 'development' | 'test' | 'production';

export type LifecycleStatus = 'idea' | 'pilot' | 'active' | 'retired';

export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type SourceType = 'declared_registry' | 'code_scan' | 'endpoint' | 'platform';

export type ToolPermission = 'read' | 'write' | 'execute';

export interface ToolAccess {
  name: string;
  permission: ToolPermission;
  description?: string;
}

export interface McpServer {
  name: string;
  url?: string;
  verified: boolean;
  approved?: boolean;
  description?: string;
}

export type SignalType =
  | 'dns_sni'
  | 'proxy_log'
  | 'identity_provider'
  | 'non_interactive_login'
  | 'saas_admin_api'
  | 'edr_process'
  | 'finance_invoice'
  | 'repo_scan'
  | 'declared_registry';

export interface ObservationSource {
  sourceId: string;
  name: string;
  type: SourceType;
  signalType?: SignalType;
  status: 'ok' | 'degraded' | 'unavailable';
  lastObservedAt?: string;
  coverage?: string;
  coveragePercent?: number;
  collectionMethod?: string;
  proves?: string;
  weakness?: string;
}

export interface SignalCatalogEntry {
  type: SignalType;
  label: string;
  proves: string;
  weakness: string;
}

export interface DeclaredAgent {
  agentKey: string;
  name: string;
  description: string;
  businessPurpose: string;
  environment: AgentEnvironment;
  lifecycleStatus: LifecycleStatus;
  ownerTeam: string | null;
  repositoryUrl?: string;
  entryPoint?: string;
  framework: string;
  dataCategories: string[];
  writeCapability: boolean;
  humanApprovalRequired: boolean;
  approvalStatus: ApprovalStatus;
  loggingEnabled: boolean;
  approvedMcpServers: string[];
  lastReviewedAt: string | null;
}

export interface ObservedAgent {
  observationId: string;
  sourceId: string;
  agentKey?: string;
  name: string;
  environment?: AgentEnvironment;
  repositoryUrl?: string;
  entryPoint?: string;
  framework?: string;
  tools: ToolAccess[];
  mcpServers: McpServer[];
  dataCategories: string[];
  writeCapability?: boolean;
  autoApprove?: boolean;
  loggingDetected?: boolean;
  observedAt: string;
  confidence?: number;
}

export type EvidenceKind =
  | 'match'
  | 'mismatch'
  | 'observation_only'
  | 'declaration_only'
  | 'possible_link';

export interface Evidence {
  kind: EvidenceKind;
  field?: string;
  declaredValue?: unknown;
  observedValue?: unknown;
  sourceId?: string;
  observedAt?: string;
  confidence?: number;
  note?: string;
}

export type MatchStatus =
  | 'matched'
  | 'drift'
  | 'observation_only'
  | 'declaration_only'
  | 'ambiguous';

export type RegistrationClass = 'tool' | 'automation' | 'agent' | 'unknown';

export interface RegistrationCriteria {
  ownIdentity: boolean | null;
  canWrite: boolean | null;
  modelChoosesAction: boolean | null;
  runsWithoutStepApproval: boolean | null;
}

export interface Classification {
  klass: RegistrationClass;
  criteria: RegistrationCriteria;
  reasoning: string;
  excluded: string[];
}

export type RightsLevel = 'read' | 'write' | 'administer' | 'can_escalate' | 'unknown';
export type DataSensitivity = 'open' | 'internal' | 'personal' | 'special_category' | 'unknown';
export type AutonomyLevel =
  | 'suggests'
  | 'acts_after_approval'
  | 'acts_within_frame'
  | 'initiates'
  | 'unknown';
export type ReachLevel =
  | 'single_user'
  | 'team'
  | 'organization'
  | 'customers_and_external'
  | 'unknown';
export type ReversibilityLevel = 'easy' | 'hard' | 'irreversible' | 'unknown';

export interface RiskDimensions {
  rights: RightsLevel;
  data: DataSensitivity;
  autonomy: AutonomyLevel;
  reach: ReachLevel;
  reversibility: ReversibilityLevel;
}

export type RiskLevel = 'unknown' | 'low' | 'medium' | 'high' | 'critical';

export interface Mitigation {
  key: string;
  label: string;
  present: boolean;
}

export interface RiskAssessment {
  level: RiskLevel;
  headline: string;
  dimensions: RiskDimensions;
  mitigations: Mitigation[];
  loweredByControls: boolean;
  driverDimension: keyof RiskDimensions | null;
}

export interface CorrelationClaim {
  signalCount: number;
  sourceCount: number;
  text: string;
}

export type OverallAgentStatus =
  | 'ok'
  | 'needs_review'
  | 'critical'
  | 'declared_only'
  | 'observed_only';

export interface ReconciledAgent {
  id: string;
  displayName: string;
  matchStatus: MatchStatus;
  declared: DeclaredAgent | null;
  observations: ObservedAgent[];
  evidence: Evidence[];
  possibleLinks?: string[];
  classification: Classification;
  risk: RiskAssessment;
  correlation: CorrelationClaim;
}

export interface Finding {
  id: string;
  ruleId: string;
  ruleTitle: string;
  agentId: string;
  agentName: string;
  environment: AgentEnvironment | 'unknown';
  severity: Severity;
  summary: string;
  explanation: string;
  recommendedAction: string;
  evidence: Evidence[];
  status: 'open' | 'acknowledged' | 'resolved';
  createdAt: string;
}

export interface ControlReference {
  source: string;
  control: string;
  appliesWhen: string;
  version: string;
}

export interface ControlRule {
  id: string;
  title: string;
  description: string;
  defaultSeverity: Severity;
  rationale: string;
  references: ControlReference[];
}

export interface DeclaredRegistryFile {
  schemaVersion: 1;
  generatedAt: string;
  source: string;
  agents: DeclaredAgent[];
}

export interface ObservationsFile {
  schemaVersion: 1;
  generatedAt: string;
  sources: ObservationSource[];
  observations: ObservedAgent[];
}
