import type { Severity } from '../domain/types.ts';

export type BadgeTone =
  | 'ok'
  | 'info'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'muted';

const TONE_CLASSES: Record<BadgeTone, string> = {
  ok: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  info: 'bg-sky-100 text-sky-800 ring-sky-200',
  warning: 'bg-amber-100 text-amber-900 ring-amber-200',
  danger: 'bg-orange-100 text-orange-900 ring-orange-200',
  critical: 'bg-red-100 text-red-800 ring-red-200',
  muted: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Kritisk',
  high: 'Høy',
  medium: 'Middels',
  low: 'Lav',
};

const SEVERITY_TONE: Record<Severity, BadgeTone> = {
  critical: 'critical',
  high: 'danger',
  medium: 'warning',
  low: 'info',
};

interface BadgeProps {
  tone: BadgeTone;
  children: React.ReactNode;
  title?: string;
}

export function Badge({ tone, children, title }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
      title={title}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge tone={SEVERITY_TONE[severity]}>{SEVERITY_LABEL[severity]}</Badge>
  );
}
