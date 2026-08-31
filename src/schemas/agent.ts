import { z } from 'zod';

const MAX_TEXT_SHORT = 200;
const MAX_TEXT_LONG = 2000;
const MAX_ARR = 50;
const MAX_TOP_LEVEL = 500;

const shortText = z.string().min(1).max(MAX_TEXT_SHORT);
const optionalShortText = z.string().max(MAX_TEXT_SHORT).optional();
const longText = z.string().max(MAX_TEXT_LONG);
const isoDate = z
  .string()
  .max(40)
  .refine(
    (val) => {
      const d = new Date(val);
      return !Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(val);
    },
    { message: 'Ugyldig ISO 8601-dato' },
  );

const optionalIsoDate = isoDate.optional();

const environmentSchema = z.enum(['development', 'test', 'production']);
const lifecycleSchema = z.enum(['idea', 'pilot', 'active', 'retired']);
const approvalSchema = z.enum(['not_required', 'pending', 'approved', 'rejected']);
const permissionSchema = z.enum(['read', 'write', 'execute']);
const sourceTypeSchema = z.enum(['declared_registry', 'code_scan', 'endpoint', 'platform']);

const dataCategoriesSchema = z.array(shortText).max(MAX_ARR);
const approvedMcpSchema = z.array(shortText).max(MAX_ARR);

const toolSchema = z
  .object({
    name: shortText,
    permission: permissionSchema,
    description: optionalShortText,
  })
  .strict();

const mcpSchema = z
  .object({
    name: shortText,
    url: optionalShortText,
    verified: z.boolean(),
    approved: z.boolean().optional(),
    description: optionalShortText,
  })
  .strict();

export const declaredAgentSchema = z
  .object({
    agentKey: shortText,
    name: shortText,
    description: longText,
    businessPurpose: longText,
    environment: environmentSchema,
    lifecycleStatus: lifecycleSchema,
    ownerTeam: z.union([shortText, z.null()]),
    repositoryUrl: optionalShortText,
    entryPoint: optionalShortText,
    framework: shortText,
    dataCategories: dataCategoriesSchema,
    writeCapability: z.boolean(),
    humanApprovalRequired: z.boolean(),
    approvalStatus: approvalSchema,
    loggingEnabled: z.boolean(),
    approvedMcpServers: approvedMcpSchema,
    lastReviewedAt: z.union([isoDate, z.null()]),
  })
  .strict();

export const observedAgentSchema = z
  .object({
    observationId: shortText,
    sourceId: shortText,
    agentKey: optionalShortText,
    name: shortText,
    environment: environmentSchema.optional(),
    repositoryUrl: optionalShortText,
    entryPoint: optionalShortText,
    framework: optionalShortText,
    tools: z.array(toolSchema).max(MAX_ARR),
    mcpServers: z.array(mcpSchema).max(MAX_ARR),
    dataCategories: dataCategoriesSchema,
    writeCapability: z.boolean().optional(),
    autoApprove: z.boolean().optional(),
    loggingDetected: z.boolean().optional(),
    observedAt: isoDate,
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export const observationSourceSchema = z
  .object({
    sourceId: shortText,
    name: shortText,
    type: sourceTypeSchema,
    status: z.enum(['ok', 'degraded', 'unavailable']),
    observationCount: z.number().int().min(0).max(100000),
    lastObservedAt: optionalIsoDate,
    coverage: optionalShortText,
  })
  .strict();

export const declaredRegistryFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: isoDate,
    source: shortText,
    agents: z.array(declaredAgentSchema).max(MAX_TOP_LEVEL),
  })
  .strict();

export const observationsFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: isoDate,
    sources: z.array(observationSourceSchema).max(MAX_ARR),
    observations: z.array(observedAgentSchema).max(MAX_TOP_LEVEL),
  })
  .strict();

export const LIMITS = {
  MAX_TEXT_SHORT,
  MAX_TEXT_LONG,
  MAX_ARR,
  MAX_TOP_LEVEL,
  MAX_FILE_BYTES: 1024 * 1024,
} as const;
