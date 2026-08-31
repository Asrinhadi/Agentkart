import { z } from 'zod';
import {
  LIMITS,
  declaredRegistryFileSchema,
  observationsFileSchema,
} from '../schemas/agent.ts';
import type { DeclaredRegistryFile, ObservationsFile } from '../domain/types.ts';

export interface ImportError {
  message: string;
  details?: string[];
}

export type ImportResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ImportError };

function translateZodIssue(issue: z.ZodIssue): string {
  const pathPart = issue.path.length > 0 ? issue.path.join('.') : '(rot)';
  switch (issue.code) {
    case 'unrecognized_keys':
      return `Ukjent felt i ${pathPart}: ${issue.keys.join(', ')}`;
    case 'invalid_type':
      return `Feil type i ${pathPart}: forventet ${String(issue.expected)}`;
    case 'too_big':
      return `${pathPart} er for stort (maks ${String(issue.maximum)}).`;
    case 'too_small':
      return `${pathPart} er for lite (minst ${String(issue.minimum)}).`;
    case 'invalid_value':
      return `Ugyldig verdi i ${pathPart}.`;
    case 'custom':
      return `${pathPart}: ${issue.message}`;
    default:
      return `${pathPart}: ${issue.message}`;
  }
}

function summarize(issues: readonly z.ZodIssue[]): string[] {
  return issues.slice(0, 12).map(translateZodIssue);
}

function checkSize(bytes: number): ImportError | null {
  if (bytes > LIMITS.MAX_FILE_BYTES) {
    return {
      message: `Filen er for stor. Maks ${Math.round(LIMITS.MAX_FILE_BYTES / 1024)} kB tillatt.`,
    };
  }
  return null;
}

function checkMimeAndExtension(file: File): ImportError | null {
  const nameOk = file.name.toLowerCase().endsWith('.json');
  if (!nameOk) {
    return { message: 'Filen må ha filendelsen .json.' };
  }
  if (file.type && file.type !== 'application/json' && file.type !== 'text/json' && file.type !== '') {
    return { message: `Filens MIME-type «${file.type}» støttes ikke. Bruk application/json.` };
  }
  return null;
}

function parseJson(text: string): ImportResult<unknown> {
  try {
    const raw: unknown = JSON.parse(text);
    return { ok: true, data: raw };
  } catch (err) {
    return {
      ok: false,
      error: {
        message: 'Filen er ikke gyldig JSON.',
        details: err instanceof Error ? [err.message] : undefined,
      },
    };
  }
}

async function readFile(file: File): Promise<ImportResult<string>> {
  const sizeErr = checkSize(file.size);
  if (sizeErr) return { ok: false, error: sizeErr };
  const mimeErr = checkMimeAndExtension(file);
  if (mimeErr) return { ok: false, error: mimeErr };
  try {
    const text = await file.text();
    if (text.length > LIMITS.MAX_FILE_BYTES) {
      return { ok: false, error: { message: 'Innholdet er for stort.' } };
    }
    return { ok: true, data: text };
  } catch {
    return { ok: false, error: { message: 'Kunne ikke lese filen lokalt.' } };
  }
}

export async function importDeclaredRegistryFromFile(
  file: File,
): Promise<ImportResult<DeclaredRegistryFile>> {
  const read = await readFile(file);
  if (!read.ok) return read;
  return parseAndValidateRegistry(read.data);
}

export function parseAndValidateRegistry(
  text: string,
): ImportResult<DeclaredRegistryFile> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const result = declaredRegistryFileSchema.safeParse(parsed.data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        message: 'Registerfilen samsvarer ikke med forventet format.',
        details: summarize(result.error.issues),
      },
    };
  }
  return { ok: true, data: result.data as DeclaredRegistryFile };
}

export async function importObservationsFromFile(
  file: File,
): Promise<ImportResult<ObservationsFile>> {
  const read = await readFile(file);
  if (!read.ok) return read;
  return parseAndValidateObservations(read.data);
}

export function parseAndValidateObservations(
  text: string,
): ImportResult<ObservationsFile> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  const result = observationsFileSchema.safeParse(parsed.data);
  if (!result.success) {
    return {
      ok: false,
      error: {
        message: 'Observasjonsfilen samsvarer ikke med forventet format.',
        details: summarize(result.error.issues),
      },
    };
  }
  return { ok: true, data: result.data as ObservationsFile };
}
