export function formatDateNb(value: string | Date | null | undefined): string {
  if (!value) return 'Ukjent';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return 'Ukjent';
  return d.toLocaleString('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShortNb(value: string | Date | null | undefined): string {
  if (!value) return 'Ukjent';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return 'Ukjent';
  return d.toLocaleDateString('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function daysSince(value: string | Date | null | undefined, now: Date = new Date()): number | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const ms = now.getTime() - d.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

const DEMO_HOST_SUFFIXES = ['.demo', '.example', '.test', '.invalid', '.localhost'];
const DEMO_EXACT_HOSTS = new Set(['git.demo', 'example.com', 'example.org', 'example.net', 'localhost']);

export function isDemoUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase();
    if (DEMO_EXACT_HOSTS.has(host)) return true;
    return DEMO_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
  } catch {
    return false;
  }
}

export function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (isDemoUrl(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}
