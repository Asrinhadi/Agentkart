import type {
  AgentEnvironment,
  ApprovalStatus,
  LifecycleStatus,
  SourceType,
  ToolPermission,
} from '../domain/types.ts';

export function envLabel(v: AgentEnvironment | 'unknown' | string | undefined | null): string {
  switch (v) {
    case 'production':
      return 'Produksjon';
    case 'test':
      return 'Test';
    case 'development':
      return 'Utvikling';
    case 'unknown':
    case null:
    case undefined:
    case '':
      return 'Ukjent miljø';
    default:
      return String(v);
  }
}

export function lifecycleLabel(v: LifecycleStatus | string | undefined | null): string {
  switch (v) {
    case 'idea':
      return 'Idé';
    case 'pilot':
      return 'Pilot';
    case 'active':
      return 'Aktiv';
    case 'retired':
      return 'Avviklet';
    default:
      return 'Ukjent';
  }
}

export function approvalLabel(v: ApprovalStatus | string | undefined | null): string {
  switch (v) {
    case 'not_required':
      return 'Ikke påkrevd';
    case 'pending':
      return 'Avventer';
    case 'approved':
      return 'Godkjent';
    case 'rejected':
      return 'Avvist';
    default:
      return 'Ikke registrert';
  }
}

export function sourceTypeLabel(v: SourceType | string | undefined | null): string {
  switch (v) {
    case 'declared_registry':
      return 'Godkjent register';
    case 'code_scan':
      return 'Kodeskann';
    case 'endpoint':
      return 'Endepunkt';
    case 'platform':
      return 'Plattformregister';
    default:
      return 'Ukjent kilde';
  }
}

export function sourceStatusLabel(
  v: 'ok' | 'degraded' | 'unavailable' | string | undefined | null,
): string {
  switch (v) {
    case 'ok':
      return 'Aktiv';
    case 'degraded':
      return 'Redusert dekning';
    case 'unavailable':
      return 'Utilgjengelig';
    default:
      return 'Ukjent';
  }
}

export function toolPermissionLabel(v: ToolPermission | string | undefined | null): string {
  switch (v) {
    case 'read':
      return 'Les';
    case 'write':
      return 'Skriv';
    case 'execute':
      return 'Kjør';
    default:
      return String(v);
  }
}

export function booleanLabel(v: boolean | null | undefined): string {
  if (v === true) return 'Ja';
  if (v === false) return 'Nei';
  return 'Ukjent';
}
