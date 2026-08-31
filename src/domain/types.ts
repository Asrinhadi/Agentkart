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

export interface ObservationSource {
  sourceId: string;
  name: string;
  type: SourceType;
  status: 'ok' | 'degraded' | 'unavailable';
  observationCount: number;
  lastObservedAt?: string;
  coverage?: string;
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
  | 'observation_only'
  | 'declaration_only'
  | 'ambiguous';

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

export interface ControlRule {
  id: string;
  title: string;
  description: string;
  defaultSeverity: Severity;
  rationale: string;
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
