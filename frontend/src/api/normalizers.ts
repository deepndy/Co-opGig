import { fallbackCategory, formatCategoryLabel, isKnownCategory } from '../config/serviceCategories';
import type {
  AssistantExtractedFields,
  AssistantNextAction,
  AssistantReply,
  AuthSession,
  ClassificationAlternative,
  ClassificationResult,
} from '../types/api';
import type {
  AuthUser,
  Job,
  JobStatus,
  ServiceCategory,
  Urgency,
  UserRole,
  VerificationStatus,
  Worker,
} from '../types/domain';
import { JOB_STATUSES } from '../types/domain';
import { ApiError } from './errors';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
}

/** Accept both bare payloads and the shared `{ data: ... }` envelope. */
export function unwrapEnvelope(payload: unknown): unknown {
  if (isRecord(payload) && 'data' in payload) return payload.data;
  return payload;
}

function extractList(payload: unknown, keys: string[]): unknown[] {
  const value = unwrapEnvelope(payload);
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    for (const key of keys) {
      if (Array.isArray(value[key])) return value[key] as unknown[];
    }
  }
  return [];
}

export function normalizeCategoryList(payload: unknown): ServiceCategory[] {
  const items = extractList(payload, ['categories', 'services', 'items']);
  const seen = new Set<string>();
  const result: ServiceCategory[] = [];

  for (const item of items) {
    if (!isRecord(item)) continue;
    const slug = asString(item.slug) ?? asString(item.id) ?? asString(item.value);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const builtin = fallbackCategory(slug);
    result.push({
      slug,
      name: asString(item.name) ?? asString(item.label) ?? builtin?.name ?? formatCategoryLabel(slug),
      description:
        asString(item.description) ?? asString(item.summary) ?? builtin?.description ?? 'Local cooperative service.',
      tasks: asStringArray(item.tasks ?? item.commonTasks).length
        ? asStringArray(item.tasks ?? item.commonTasks)
        : builtin?.tasks ?? [],
    });
  }
  return result;
}

const VERIFICATION_VALUES: VerificationStatus[] = ['PENDING', 'VERIFIED', 'REJECTED'];

function normalizeVerification(value: unknown): VerificationStatus | string {
  const text = asString(value)?.toUpperCase();
  return text && (VERIFICATION_VALUES as string[]).includes(text) ? text : 'UNKNOWN';
}

function toWorker(item: unknown): Worker | null {
  if (!isRecord(item)) return null;
  const id = asString(item.id) ?? asString(item.workerId);
  const displayName = asString(item.displayName) ?? asString(item.name);
  if (!id || !displayName) return null;

  const rawCategories = asStringArray(item.serviceCategories ?? item.categories);
  return {
    id,
    displayName,
    serviceCategories: rawCategories,
    serviceAreaText: asString(item.serviceAreaText) ?? asString(item.serviceArea) ?? asString(item.locationText) ?? '',
    latitude: asNumber(item.latitude ?? item.lat),
    longitude: asNumber(item.longitude ?? item.lng),
    availabilityStatus: asString(item.availabilityStatus) ?? asString(item.availability) ?? 'UNKNOWN',
    verificationStatus: normalizeVerification(item.verificationStatus),
    ratingAverage: asNumber(item.ratingAverage ?? item.rating),
    ratingCount: asNumber(item.ratingCount ?? item.reviewCount),
    completedJobsCount: asNumber(item.completedJobsCount ?? item.completedJobs),
    bio: asString(item.bio) ?? asString(item.about),
  };
}

export function normalizeWorkerList(payload: unknown): Worker[] {
  const value = unwrapEnvelope(payload);
  let items: unknown[] = [];
  if (Array.isArray(value)) items = value;
  else if (isRecord(value) && isRecord(value.worker)) items = [value.worker];
  else items = extractList(value, ['workers', 'items', 'results']);
  return items.map(toWorker).filter((worker): worker is Worker => worker !== null);
}

export function normalizeWorker(payload: unknown): Worker {
  const value = unwrapEnvelope(payload);
  const source = isRecord(value) && value.worker ? value.worker : value;
  const worker = toWorker(source);
  if (!worker) {
    throw new ApiError({ code: 'INVALID_RESPONSE', message: 'The worker record was not in the expected format.' });
  }
  return worker;
}

function normalizeJobStatus(value: unknown): JobStatus | null {
  const status = asString(value)?.toUpperCase();
  return status && (JOB_STATUSES as string[]).includes(status) ? (status as JobStatus) : null;
}

function normalizeUrgency(value: unknown): Urgency | null {
  const urgency = asString(value)?.toLowerCase();
  if (urgency === 'low' || urgency === 'normal') return 'normal';
  if (urgency === 'high') return 'urgent';
  if (urgency === 'urgent') return 'emergency';
  return null;
}

function toJob(item: unknown): Job | null {
  if (!isRecord(item)) return null;
  const id = asString(item.id) ?? asString(item.jobId);
  const status = normalizeJobStatus(item.status);
  if (!id || !status) return null;

  const createdAt = asString(item.createdAt) ?? asString(item.created_at) ?? '';
  const updatedAt = asString(item.updatedAt) ?? asString(item.updated_at) ?? createdAt;
  const category = asString(item.category) ?? asString(item.categorySlug) ?? '';

  const worker = isRecord(item.assignedWorker) ? item.assignedWorker : null;

  return {
    id,
    reference: asString(item.reference) ?? asString(item.jobReference),
    customerId: asString(item.customerId) ?? '',
    description: asString(item.description) ?? 'Service request',
    category,
    categoryConfidence: asNumber(item.categoryConfidence),
    locationText: asString(item.locationText) ?? asString(item.location) ?? '',
    latitude: asNumber(item.latitude ?? item.lat),
    longitude: asNumber(item.longitude ?? item.lng),
    urgency: normalizeUrgency(item.urgency),
    status,
    assignedWorkerId: asString(item.assignedWorkerId) ?? (worker ? asString(worker.id) : null),
    preferredWorkerId: asString(item.preferredWorkerId),
    assignedWorkerName: asString(item.assignedWorkerName) ?? (worker ? asString(worker.displayName) : null),
    createdAt,
    updatedAt,
  };
}

export function normalizeJob(payload: unknown): Job {
  const value = unwrapEnvelope(payload);
  const source = isRecord(value) && value.job ? value.job : value;
  const job = toJob(source);
  if (!job) {
    throw new ApiError({ code: 'INVALID_RESPONSE', message: 'The service request was not in the expected format.' });
  }
  return job;
}

export function normalizeJobList(payload: unknown): Job[] {
  const value = unwrapEnvelope(payload);
  const items = isRecord(value)
    ? Array.isArray(value.jobs)
      ? value.jobs
      : Array.isArray(value.items)
        ? value.items
        : Array.isArray(value.requests)
          ? value.requests
          : []
    : Array.isArray(value)
      ? value
      : [];
  return items.map(toJob).filter((job): job is Job => job !== null);
}

function normalizeRole(value: unknown): UserRole {
  const role = asString(value)?.toUpperCase();
  return role === 'WORKER' || role === 'ADMIN' ? role : 'CUSTOMER';
}

function normalizeAuthUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) return null;
  const worker = isRecord(value.worker) ? value.worker : null;
  const email = asString(value.email);
  const id = asString(value.id) ?? asString(value.userId) ?? email;
  if (!id) return null;
  const name = asString(value.name) ?? asString(value.displayName) ?? asString(value.fullName) ?? email ?? 'Co-opGig user';
  return {
    id,
    name,
    email: email ?? '',
    role: normalizeRole(value.role ?? value.userRole),
    workerId: asString(value.workerId) ?? (worker ? asString(worker.id) : null),
  };
}

function extractToken(value: UnknownRecord): string | null {
  return (
    asString(value.token) ??
    asString(value.accessToken) ??
    asString(value.jwt) ??
    (isRecord(value.session) ? asString(value.session.token) ?? asString(value.session.accessToken) : null)
  );
}

export function normalizeAuthSession(payload: unknown): AuthSession {
  const value = unwrapEnvelope(payload);
  if (!isRecord(value)) {
    throw new ApiError({ code: 'INVALID_RESPONSE', message: 'The sign-in response was not in the expected format.' });
  }
  const session = isRecord(value.session) ? value.session : null;
  const userCandidate = value.user ?? session?.user ?? (value.id || value.email ? value : null);
  const user = normalizeAuthUser(userCandidate);
  if (!user) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'Signed in, but the response did not include a user profile.',
    });
  }
  return {
    user,
    token: extractToken(value) ?? (session ? extractToken(session) : null),
    isDemo: false,
  };
}

export function normalizeMe(payload: unknown): AuthUser | null {
  const value = unwrapEnvelope(payload);
  if (!isRecord(value)) return null;
  return normalizeAuthUser(value.user ?? value);
}

const NEXT_ACTIONS: AssistantNextAction[] = [
  'ASK_QUESTION',
  'SUGGEST_CATEGORY',
  'READY_FOR_REVIEW',
  'HANDOFF_TO_BOOKING',
];

function normalizeExtractedFields(value: unknown): AssistantExtractedFields | undefined {
  if (!isRecord(value)) return undefined;
  const category = asString(value.category);
  const urgency = asString(value.urgency)?.toLowerCase();
  return {
    description: asString(value.description),
    category: category && isKnownCategory(category) ? category : null,
    locationText: asString(value.locationText),
    urgency: urgency === 'normal' || urgency === 'urgent' || urgency === 'emergency' ? urgency : null,
  };
}

export function normalizeAssistantReply(payload: unknown): AssistantReply {
  const value = unwrapEnvelope(payload);
  if (!isRecord(value)) {
    throw new ApiError({ code: 'INVALID_RESPONSE', message: 'The assistant response was not in the expected format.' });
  }
  const reply = asString(value.reply);
  if (!reply) {
    throw new ApiError({ code: 'INVALID_RESPONSE', message: 'The assistant did not return a reply.' });
  }
  const suggested = asString(value.suggestedCategory);
  const requestedAction = asString(value.nextAction);
  const nextAction = (NEXT_ACTIONS as string[]).includes(requestedAction ?? '')
    ? (requestedAction as AssistantNextAction)
    : suggested
      ? 'SUGGEST_CATEGORY'
      : 'ASK_QUESTION';

  return {
    sessionId: asString(value.sessionId),
    reply,
    suggestedCategory: suggested && isKnownCategory(suggested) ? suggested : null,
    confidence: asNumber(value.confidence),
    needsClarification: asBoolean(value.needsClarification),
    nextAction,
    extractedFields: normalizeExtractedFields(value.extractedFields),
  };
}

export function normalizeClassification(payload: unknown): ClassificationResult {
  const value = unwrapEnvelope(payload);
  if (!isRecord(value)) {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      message: 'The category suggestion response was not in the expected format.',
    });
  }
  const category = asString(value.category);
  const alternatives: ClassificationAlternative[] = [];
  if (Array.isArray(value.alternatives)) {
    for (const item of value.alternatives.slice(0, 3)) {
      if (!isRecord(item)) continue;
      const alt = asString(item.category);
      if (!alt || !isKnownCategory(alt)) continue;
      alternatives.push({ category: alt, confidence: asNumber(item.confidence) });
    }
  }
  return {
    category: category && isKnownCategory(category) ? category : null,
    confidence: asNumber(value.confidence),
    alternatives,
    needsClarification: asBoolean(value.needsClarification),
    clarifyingQuestion: asString(value.clarifyingQuestion),
    reason: asString(value.reason) ?? 'No explanation was supplied.',
  };
}

