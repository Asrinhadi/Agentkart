import type {
  AutonomyLevel,
  DataSensitivity,
  DeclaredAgent,
  Mitigation,
  ObservedAgent,
  ReachLevel,
  ReversibilityLevel,
  RightsLevel,
  RiskAssessment,
  RiskDimensions,
  RiskLevel,
} from './types.ts';

const RIGHTS_ORDER: RightsLevel[] = ['read', 'write', 'administer', 'can_escalate'];
const DATA_ORDER: DataSensitivity[] = ['open', 'internal', 'personal', 'special_category'];
const AUTONOMY_ORDER: AutonomyLevel[] = [
  'suggests',
  'acts_after_approval',
  'acts_within_frame',
  'initiates',
];
const REACH_ORDER: ReachLevel[] = ['single_user', 'team', 'organization', 'customers_and_external'];
const REVERSIBILITY_ORDER: ReversibilityLevel[] = ['easy', 'hard', 'irreversible'];

const LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

function rankRights(v: RightsLevel): number {
  const map: Record<RightsLevel, number> = {
    read: 0,
    write: 1,
    administer: 2,
    can_escalate: 3,
    unknown: -1,
  };
  return map[v];
}
function rankData(v: DataSensitivity): number {
  const map: Record<DataSensitivity, number> = {
    open: 0,
    internal: 1,
    personal: 2,
    special_category: 3,
    unknown: -1,
  };
  return map[v];
}
function rankAutonomy(v: AutonomyLevel): number {
  const map: Record<AutonomyLevel, number> = {
    suggests: 0,
    acts_after_approval: 1,
    acts_within_frame: 2,
    initiates: 3,
    unknown: -1,
  };
  return map[v];
}
function rankReach(v: ReachLevel): number {
  const map: Record<ReachLevel, number> = {
    single_user: 0,
    team: 1,
    organization: 2,
    customers_and_external: 3,
    unknown: -1,
  };
  return map[v];
}
function rankRev(v: ReversibilityLevel): number {
  const map: Record<ReversibilityLevel, number> = {
    easy: 0,
    hard: 2,
    irreversible: 3,
    unknown: -1,
  };
  return map[v];
}

function deriveRights(declared: DeclaredAgent | null, observed: readonly ObservedAgent[]): RightsLevel {
  const write =
    declared?.writeCapability ||
    observed.some(
      (o) => o.writeCapability === true || o.tools.some((t) => t.permission === 'write' || t.permission === 'execute'),
    );
  const execute = observed.some((o) => o.tools.some((t) => t.permission === 'execute'));
  const autoApprove = observed.some((o) => o.autoApprove === true);
  if (execute && autoApprove) return 'can_escalate';
  if (write && autoApprove) return 'administer';
  if (write) return 'write';
  if (declared || observed.length > 0) return 'read';
  return 'unknown';
}

const PERSONAL_KEYWORDS = ['person', 'kandidat', 'rekruttering', 'kunde', 'ansatt'];
const SPECIAL_KEYWORDS = ['helse', 'særlig', 'sensitiv'];

function deriveDataSensitivity(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): DataSensitivity {
  const cats: string[] = [];
  if (declared) cats.push(...declared.dataCategories);
  for (const o of observed) cats.push(...o.dataCategories);
  const norm = cats.map((c) => c.toLowerCase());
  if (norm.some((c) => SPECIAL_KEYWORDS.some((k) => c.includes(k)))) return 'special_category';
  if (norm.some((c) => PERSONAL_KEYWORDS.some((k) => c.includes(k)))) return 'personal';
  if (norm.some((c) => c.includes('intern') || c.includes('faktura') || c.includes('salg') || c.includes('supp') || c.includes('drift') || c.includes('kildekode'))) return 'internal';
  if (norm.some((c) => c.includes('åpne') || c.includes('offentlig'))) return 'open';
  if (declared || observed.length > 0) return 'internal';
  return 'unknown';
}

function deriveAutonomy(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): AutonomyLevel {
  if (observed.some((o) => o.autoApprove === true)) return 'initiates';
  if (declared?.humanApprovalRequired === true && declared.approvalStatus === 'approved') return 'acts_after_approval';
  if (declared?.writeCapability && !declared.humanApprovalRequired) return 'acts_within_frame';
  if (declared || observed.length > 0) return 'suggests';
  return 'unknown';
}

function deriveReach(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): ReachLevel {
  const env = declared?.environment ?? observed.find((o) => o.environment)?.environment;
  if (env === 'production') {
    const cats = new Set(
      [...(declared?.dataCategories ?? []), ...observed.flatMap((o) => o.dataCategories)].map((c) =>
        c.toLowerCase(),
      ),
    );
    if (Array.from(cats).some((c) => c.includes('kunde') || c.includes('salg'))) {
      return 'customers_and_external';
    }
    return 'organization';
  }
  if (env === 'test') return 'team';
  if (env === 'development') return 'single_user';
  return 'unknown';
}

function deriveReversibility(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): ReversibilityLevel {
  const write =
    declared?.writeCapability ||
    observed.some(
      (o) => o.writeCapability === true || o.tools.some((t) => t.permission === 'write' || t.permission === 'execute'),
    );
  const execute = observed.some((o) => o.tools.some((t) => t.permission === 'execute'));
  const risky = new Set(
    [...(declared?.dataCategories ?? []), ...observed.flatMap((o) => o.dataCategories)].map((c) =>
      c.toLowerCase(),
    ),
  );
  const irreversible = Array.from(risky).some(
    (c) => c.includes('faktura') || c.includes('utbetal') || c.includes('drift'),
  );
  if (execute || irreversible) return 'irreversible';
  if (write) return 'hard';
  if (declared || observed.length > 0) return 'easy';
  return 'unknown';
}

function highestDimensionLevel(dims: RiskDimensions): { level: RiskLevel; driver: keyof RiskDimensions | null } {
  const map: Array<{ key: keyof RiskDimensions; rank: number }> = [
    { key: 'rights', rank: rankRights(dims.rights) },
    { key: 'data', rank: rankData(dims.data) },
    { key: 'autonomy', rank: rankAutonomy(dims.autonomy) },
    { key: 'reach', rank: rankReach(dims.reach) },
    { key: 'reversibility', rank: rankRev(dims.reversibility) },
  ];
  const anyUnknown = map.some((m) => m.rank === -1);
  const known = map.filter((m) => m.rank >= 0);
  if (known.length === 0) return { level: 'unknown', driver: null };
  const highest = known.reduce((a, b) => (b.rank > a.rank ? b : a));
  const level = LEVELS[Math.min(highest.rank, LEVELS.length - 1)] ?? 'low';
  return {
    level: anyUnknown && level === 'low' ? 'unknown' : level,
    driver: highest.key,
  };
}

function lowerLevel(level: RiskLevel): RiskLevel {
  const idx = LEVELS.indexOf(level);
  if (idx <= 0) return level;
  return LEVELS[idx - 1] ?? level;
}

function buildMitigations(declared: DeclaredAgent | null, observed: readonly ObservedAgent[]): Mitigation[] {
  const list: Mitigation[] = [];
  const humanApproved =
    declared !== null &&
    declared.humanApprovalRequired &&
    declared.approvalStatus === 'approved' &&
    !observed.some((o) => o.autoApprove === true);
  list.push({ key: 'human_approval', label: 'Menneskelig godkjenning på skrivende steg', present: humanApproved });

  const logging =
    (declared?.loggingEnabled ?? false) && observed.some((o) => o.loggingDetected === true);
  list.push({ key: 'logging', label: 'Full logging bekreftet', present: logging });

  const ownerDefined = Boolean(declared?.ownerTeam && declared.ownerTeam.trim().length > 0);
  list.push({ key: 'owner', label: 'Definert eier', present: ownerDefined });

  const mcpApproved =
    (declared?.approvedMcpServers ?? []).length > 0 &&
    observed.every((o) => o.mcpServers.every((m) => m.verified || m.approved === true));
  list.push({ key: 'verified_mcp', label: 'Alle MCP-integrasjoner verifisert', present: mcpApproved });

  return list;
}

const RIGHTS_LABEL: Record<RightsLevel, string> = {
  read: 'leserettigheter',
  write: 'skriverettigheter',
  administer: 'administrasjonsrettigheter',
  can_escalate: 'kan utvide egne rettigheter',
  unknown: 'ukjente rettigheter',
};
const DATA_LABEL: Record<DataSensitivity, string> = {
  open: 'åpne data',
  internal: 'interne data',
  personal: 'personopplysninger',
  special_category: 'særlige kategorier personopplysninger',
  unknown: 'ukjent datatilgang',
};
const AUTONOMY_LABEL: Record<AutonomyLevel, string> = {
  suggests: 'foreslår handlinger',
  acts_after_approval: 'handler etter godkjenning',
  acts_within_frame: 'handler fritt innenfor ramme',
  initiates: 'initierer egne oppgaver',
  unknown: 'ukjent autonomi',
};
const REACH_LABEL: Record<ReachLevel, string> = {
  single_user: 'påvirker én bruker',
  team: 'påvirker ett team',
  organization: 'påvirker hele organisasjonen',
  customers_and_external: 'påvirker kunder og eksterne',
  unknown: 'ukjent rekkevidde',
};
const REV_LABEL: Record<ReversibilityLevel, string> = {
  easy: 'handlingene er enkle å angre',
  hard: 'handlingene er vanskelige å angre',
  irreversible: 'handlingene kan ikke reverseres',
  unknown: 'ukjent reversibilitet',
};
const LEVEL_LABEL: Record<RiskLevel, string> = {
  unknown: 'Ukjent',
  low: 'Lav',
  medium: 'Middels',
  high: 'Høy',
  critical: 'Kritisk',
};

function buildHeadline(level: RiskLevel, dims: RiskDimensions, mitigations: Mitigation[], lowered: boolean): string {
  const parts: string[] = [];
  parts.push(`${DATA_LABEL[dims.data]} med ${RIGHTS_LABEL[dims.rights]}`);
  parts.push(`${AUTONOMY_LABEL[dims.autonomy]}, ${REACH_LABEL[dims.reach]}`);
  parts.push(REV_LABEL[dims.reversibility]);
  const present = mitigations.filter((m) => m.present).map((m) => m.label.toLowerCase());
  const damper = present.length > 0
    ? ` Demper: ${present.join(', ')}${lowered ? ' (senket ett hakk)' : ''}.`
    : ' Ingen dokumenterte dempende kontroller.';
  return `${LEVEL_LABEL[level]} — ${parts.join('. ')}.${damper}`;
}

export function assessRisk(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
  matchStatus: 'observation_only' | 'ambiguous' | 'other',
): RiskAssessment {
  if (matchStatus === 'observation_only' || matchStatus === 'ambiguous') {
    const dims: RiskDimensions = {
      rights: 'unknown',
      data: 'unknown',
      autonomy: 'unknown',
      reach: 'unknown',
      reversibility: 'unknown',
    };
    return {
      level: 'unknown',
      headline:
        'Ukjent — dette er en observert agent uten treff i registeret. Rettigheter, datatilgang og reversibilitet er ikke kjent. Skyggeagenter behandles som ukjent, ikke som lav risiko.',
      dimensions: dims,
      mitigations: buildMitigations(declared, observed),
      loweredByControls: false,
      driverDimension: null,
    };
  }

  const dims: RiskDimensions = {
    rights: deriveRights(declared, observed),
    data: deriveDataSensitivity(declared, observed),
    autonomy: deriveAutonomy(declared, observed),
    reach: deriveReach(declared, observed),
    reversibility: deriveReversibility(declared, observed),
  };
  const { level: base, driver } = highestDimensionLevel(dims);

  const mitigations = buildMitigations(declared, observed);
  const presentCount = mitigations.filter((m) => m.present).length;
  const canLower = presentCount >= 2 && base !== 'unknown' && base !== 'low';
  const level = canLower ? lowerLevel(base) : base;

  return {
    level,
    headline: buildHeadline(level, dims, mitigations, canLower),
    dimensions: dims,
    mitigations,
    loweredByControls: canLower,
    driverDimension: driver,
  };
}

export const RISK_LEVEL_LABEL = LEVEL_LABEL;
export const RIGHTS_LEVEL_LABEL = RIGHTS_LABEL;
export const DATA_SENSITIVITY_LABEL = DATA_LABEL;
export const AUTONOMY_LEVEL_LABEL = AUTONOMY_LABEL;
export const REACH_LEVEL_LABEL = REACH_LABEL;
export const REVERSIBILITY_LEVEL_LABEL = REV_LABEL;

export const DIMENSION_ORDER = {
  rights: RIGHTS_ORDER,
  data: DATA_ORDER,
  autonomy: AUTONOMY_ORDER,
  reach: REACH_ORDER,
  reversibility: REVERSIBILITY_ORDER,
};
