import type {
  Classification,
  DeclaredAgent,
  ObservedAgent,
  RegistrationClass,
  RegistrationCriteria,
} from './types.ts';

const AGENTIC_FRAMEWORKS = new Set(
  ['langgraph', 'openai agents sdk', 'claude code', 'custom'].map((s) => s.toLowerCase()),
);

function hasOwnCredential(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): boolean | null {
  if (declared) {
    return declared.approvedMcpServers.length > 0 || declared.writeCapability;
  }
  if (observed.length === 0) return null;
  return observed.some((o) => o.mcpServers.length > 0 || (o.tools.length > 0 && !!o.writeCapability));
}

function canWrite(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): boolean | null {
  if (declared?.writeCapability) return true;
  if (observed.some((o) => o.writeCapability === true)) return true;
  if (observed.some((o) => o.tools.some((t) => t.permission === 'write' || t.permission === 'execute'))) return true;
  if (declared && !declared.writeCapability && observed.length > 0 && observed.every((o) => o.writeCapability === false)) return false;
  return declared ? false : null;
}

function modelChoosesAction(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): boolean | null {
  const framework = (
    declared?.framework ??
    observed.find((o) => o.framework)?.framework ??
    ''
  ).toLowerCase();
  if (!framework) return null;
  return AGENTIC_FRAMEWORKS.has(framework);
}

function runsWithoutStepApproval(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): boolean | null {
  if (observed.some((o) => o.autoApprove === true)) return true;
  if (declared && declared.humanApprovalRequired === false) return true;
  if (declared && declared.humanApprovalRequired && declared.approvalStatus === 'approved') return false;
  if (observed.some((o) => o.autoApprove === false)) return false;
  return null;
}

function countTrue(criteria: RegistrationCriteria): { yes: number; known: number } {
  let yes = 0;
  let known = 0;
  for (const v of Object.values(criteria)) {
    if (v === true) {
      yes += 1;
      known += 1;
    } else if (v === false) {
      known += 1;
    }
  }
  return { yes, known };
}

const CRITERION_LABEL: Record<keyof RegistrationCriteria, string> = {
  ownIdentity: 'Har egen identitet eller nøkkel',
  canWrite: 'Kan skrive (ikke bare lese)',
  modelChoosesAction: 'Modellen velger handlingen',
  runsWithoutStepApproval: 'Kjører uten godkjenning per steg',
};

function reasoningSentence(klass: RegistrationClass, criteria: RegistrationCriteria): string {
  const met: string[] = [];
  const unmet: string[] = [];
  const unknown: string[] = [];
  (Object.keys(criteria) as Array<keyof RegistrationCriteria>).forEach((k) => {
    const v = criteria[k];
    if (v === true) met.push(CRITERION_LABEL[k]);
    else if (v === false) unmet.push(CRITERION_LABEL[k]);
    else unknown.push(CRITERION_LABEL[k]);
  });
  const parts: string[] = [];
  if (met.length > 0) parts.push(`Ja på: ${met.join(', ')}.`);
  if (unmet.length > 0) parts.push(`Nei på: ${unmet.join(', ')}.`);
  if (unknown.length > 0) parts.push(`Ukjent: ${unknown.join(', ')}.`);
  const prefix =
    klass === 'agent'
      ? 'Full registrering påkrevd:'
      : klass === 'automation'
        ? 'Lettvektsregistrering anbefalt:'
        : klass === 'tool'
          ? 'Følges på lisensnivå, ikke i registeret:'
          : 'Grunnlaget er for tynt til å klassifisere:';
  return `${prefix} ${parts.join(' ')}`.trim();
}

const EXCLUDED_CONSIDERATIONS = [
  'Selve modellkallets kvalitet eller ytelse',
  'Hvor mye kredit / kostnad agenten bruker',
  'Om agenten faktisk løser oppgaven godt',
];

export function classifyAgent(
  declared: DeclaredAgent | null,
  observed: readonly ObservedAgent[],
): Classification {
  const criteria: RegistrationCriteria = {
    ownIdentity: hasOwnCredential(declared, observed),
    canWrite: canWrite(declared, observed),
    modelChoosesAction: modelChoosesAction(declared, observed),
    runsWithoutStepApproval: runsWithoutStepApproval(declared, observed),
  };
  const { yes, known } = countTrue(criteria);

  let klass: RegistrationClass;
  if (known === 0) {
    klass = 'unknown';
  } else if (yes >= 3) {
    klass = 'agent';
  } else if (yes >= 2) {
    klass = 'automation';
  } else {
    klass = 'tool';
  }

  return {
    klass,
    criteria,
    reasoning: reasoningSentence(klass, criteria),
    excluded: EXCLUDED_CONSIDERATIONS,
  };
}
