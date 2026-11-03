import { BRAND } from '../config/brand';
import { API_V1 } from '../config/env';
import type {
  AssistantChatInput,
  AuthSession,
  CoopGigApi,
  CreateJobInput,
  LoginInput,
  RegisterInput,
  WorkerQuery,
} from '../types/api';
import type { JobStatus } from '../types/domain';
import { authTokenStore } from './authToken';
import { apiRequest } from './client';
import { ApiError, isApiError } from './errors';
import {
  normalizeAssistantReply,
  normalizeAuthSession,
  normalizeCategoryList,
  normalizeClassification,
  normalizeJob,
  normalizeJobList,
  normalizeMe,
  normalizeWorker,
  normalizeWorkerList,
} from './normalizers';

function v1(path: string): string {
  return `${API_V1}${path}`;
}

function workerQueryString(query?: WorkerQuery): string {
  if (!query) return '';
  const params = new URLSearchParams();
  if (query.category) params.set('category', query.category);
  if (typeof query.latitude === 'number') params.set('lat', String(query.latitude));
  if (typeof query.longitude === 'number') params.set('lng', String(query.longitude));
  if (typeof query.available === 'boolean') params.set('available', String(query.available));
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** Concrete adapter for Shreya's core backend, following the v1 contract. */
export const httpApi: CoopGigApi = {
  isMock: false,

  async getCategories() {
    return normalizeCategoryList(await apiRequest(v1('/services/categories'), { auth: false }));
  },

  async getWorkers(query) {
    return normalizeWorkerList(await apiRequest(v1(`/workers${workerQueryString(query)}`)));
  },

  async getWorker(workerId) {
    return normalizeWorker(await apiRequest(v1(`/workers/${encodeURIComponent(workerId)}`)));
  },

  async createJob(input: CreateJobInput) {
    const body = {
      description: input.description,
      category: input.category,
      categoryConfidence: input.categoryConfidence ?? null,
      locationText: input.locationText,
      urgency: input.urgency,
      ...(input.preferredWorkerId ? { preferredWorkerId: input.preferredWorkerId } : {}),
      ...(typeof input.latitude === 'number' ? { latitude: input.latitude } : {}),
      ...(typeof input.longitude === 'number' ? { longitude: input.longitude } : {}),
    };
    return normalizeJob(await apiRequest(v1('/jobs'), { method: 'POST', body }));
  },

  async getMyJobs() {
    return normalizeJobList(await apiRequest(v1('/jobs/mine')));
  },

  async getJob(jobId) {
    return normalizeJob(await apiRequest(v1(`/jobs/${encodeURIComponent(jobId)}`)));
  },

  async acceptJob(jobId) {
    return normalizeJob(
      await apiRequest(v1(`/jobs/${encodeURIComponent(jobId)}/accept`), { method: 'POST' }),
    );
  },

  async updateJobStatus(jobId, status: JobStatus) {
    return normalizeJob(
      await apiRequest(v1(`/jobs/${encodeURIComponent(jobId)}/status`), {
        method: 'PATCH',
        body: { status },
      }),
    );
  },

  async confirmCompletion(jobId) {
    return normalizeJob(
      await apiRequest(v1(`/jobs/${encodeURIComponent(jobId)}/confirm-completion`), { method: 'POST' }),
    );
  },

  /**
   * Proposed read-only extension for the worker job feed. It is intentionally
   * isolated here; if the backend has not implemented it yet, the worker page
   * renders a clear "feed unavailable" state instead of inventing requests.
   */
  async listOpenJobs() {
    try {
      return normalizeJobList(await apiRequest(v1('/jobs?status=OPEN')));
    } catch (error) {
      if (isApiError(error) && (error.status === 404 || error.status === 405 || error.code === 'NOT_FOUND')) {
        throw new ApiError({
          code: 'OPEN_JOBS_UNAVAILABLE',
          message:
            'The worker job feed is not available from this backend yet. It needs a read endpoint for open jobs.',
          status: error.status,
          details: error.details,
        });
      }
      throw error;
    }
  },

  async login(input: LoginInput) {
    const session: AuthSession = normalizeAuthSession(
      await apiRequest(v1('/auth/login'), { method: 'POST', body: input, auth: false }),
    );
    if (session.token) authTokenStore.set(session.token);
    return session;
  },

  async register(input: RegisterInput) {
    const session: AuthSession = normalizeAuthSession(
      await apiRequest(v1('/auth/register'), { method: 'POST', body: input, auth: false }),
    );
    if (session.token) authTokenStore.set(session.token);
    return session;
  },

  async me() {
    try {
      return normalizeMe(await apiRequest(v1('/auth/me')));
    } catch (error) {
      if (isApiError(error) && error.isUnauthorized) return null;
      throw error;
    }
  },

  async logout() {
    try {
      await apiRequest(v1('/auth/logout'), { method: 'POST' });
    } finally {
      authTokenStore.clear();
    }
  },

  async assistantChat(input: AssistantChatInput) {
    return normalizeAssistantReply(
      await apiRequest(v1('/assistant/chat'), {
        method: 'POST',
        body: {
          sessionId: input.sessionId,
          message: input.message,
          jobContext: input.jobContext ?? {},
          locale: input.locale ?? BRAND.locale,
        },
      }),
    );
  },

  async classify(description: string) {
    return normalizeClassification(
      await apiRequest(v1('/assistant/classify'), {
        method: 'POST',
        body: { description, imageUrl: null, locale: BRAND.locale },
      }),
    );
  },
};

