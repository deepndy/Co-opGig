import { isKnownCategory } from '../../config/serviceCategories';
import type {
  AssistantChatInput,
  CoopGigApi,
  CreateJobInput,
  LoginInput,
  RegisterInput,
  WorkerQuery,
} from '../../types/api';
import type { AuthUser, Job, JobStatus, UserRole, Worker } from '../../types/domain';
import { demoSessionStore } from '../authToken';
import { ApiError } from '../errors';
import { mockAssistantChat, mockClassify } from './mockAssistant';
import {
  MOCK_CUSTOMER_ID,
  MOCK_WORKER_ID,
  mockCategories,
  mockWorkers,
  seedJobs,
} from './mockData';

const JOBS_KEY = 'coopgig.mockJobs.v1';
const TEST_MODE = import.meta.env.MODE === 'test';

function simulateLatency(ms = 220): Promise<void> {
  if (TEST_MODE) return Promise.resolve();
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function readJobs(): Job[] {
  try {
    const raw = window.localStorage.getItem(JOBS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as Job[];
    }
  } catch {
    // Fall through to a fresh seed.
  }
  const jobs = seedJobs();
  writeJobs(jobs);
  return jobs;
}

function writeJobs(jobs: Job[]): void {
  try {
    window.localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  } catch {
    // Demo data can stay in memory if storage is unavailable.
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentUser(): AuthUser | null {
  return demoSessionStore.get();
}

function requireUser(): AuthUser {
  const user = currentUser();
  if (!user) {
    throw new ApiError({ code: 'UNAUTHORIZED', message: 'Start a demo session to do that.', status: 401 });
  }
  return user;
}

function getDemoPersona(email: string, role?: UserRole): AuthUser {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'demo.customer@coopgig.test') {
    return {
      id: MOCK_CUSTOMER_ID,
      name: 'Meera Joshi (demo)',
      email: normalized,
      role: 'CUSTOMER',
    };
  }
  if (normalized === 'demo.worker@coopgig.test') {
    return {
      id: 'demo-worker-user-2',
      name: 'Rahul Patil (demo)',
      email: normalized,
      role: 'WORKER',
      workerId: MOCK_WORKER_ID,
    };
  }
  const guessedRole: UserRole = role ?? (normalized.includes('worker') ? 'WORKER' : 'CUSTOMER');
  const local = normalized.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Demo user';
  const name = local.replace(/\b\w/g, (character) => character.toUpperCase());
  return {
    id: `demo-user-${guessedRole.toLowerCase()}-${randomId()}`,
    name: `${name} (demo)`,
    email: normalized,
    role: guessedRole,
    workerId: null,
  };
}

function validateJobInput(input: CreateJobInput): void {
  if (!input.description || input.description.trim().length < 10) {
    throw new ApiError({
      code: 'VALIDATION_ERROR',
      message: 'Please describe the job in at least 10 characters.',
      status: 400,
    });
  }
  if (!isKnownCategory(input.category)) {
    throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Choose a valid service category.', status: 400 });
  }
  if (!input.locationText || input.locationText.trim().length < 2) {
    throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Please add your locality.', status: 400 });
  }
  if (input.latitude != null && (input.latitude < -90 || input.latitude > 90)) {
    throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Latitude must be between -90 and 90.', status: 400 });
  }
  if (input.longitude != null && (input.longitude < -180 || input.longitude > 180)) {
    throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Longitude must be between -180 and 180.', status: 400 });
  }
}

function findJob(jobs: Job[], jobId: string): Job {
  const job = jobs.find((item) => item.id === jobId);
  if (!job) throw new ApiError({ code: 'NOT_FOUND', message: 'That service request could not be found.', status: 404 });
  return job;
}

function replaceJob(jobs: Job[], updated: Job): Job[] {
  return jobs.map((job) => (job.id === updated.id ? updated : job));
}

function asWorkerStatusValue(value: string): string {
  return value.toUpperCase();
}

/**
 * Browser-only demo implementation of the shared API. All records live in
 * localStorage and are marked `isDemo`. No request leaves the browser.
 */
export const mockApi: CoopGigApi = {
  isMock: true,

  async getCategories() {
    await simulateLatency(80);
    return mockCategories();
  },

  async getWorkers(query?: WorkerQuery) {
    await simulateLatency();
    let workers: Worker[] = mockWorkers().map((worker) => ({ ...worker }));
    if (query?.category) {
      workers = workers.filter((worker) => worker.serviceCategories.includes(query.category as string));
    }
    if (query?.available) {
      workers = workers.filter((worker) => asWorkerStatusValue(worker.availabilityStatus) === 'AVAILABLE');
    }
    return workers.sort((a, b) => {
      const availabilityRank = (status: string) => (asWorkerStatusValue(status) === 'AVAILABLE' ? 0 : 1);
      return availabilityRank(a.availabilityStatus) - availabilityRank(b.availabilityStatus);
    });
  },

  async getWorker(workerId: string) {
    await simulateLatency();
    const worker = mockWorkers().find((item) => item.id === workerId);
    if (!worker) throw new ApiError({ code: 'NOT_FOUND', message: 'Demo worker not found.', status: 404 });
    return { ...worker };
  },

  async createJob(input: CreateJobInput) {
    await simulateLatency(300);
    validateJobInput(input);
    const user = currentUser();
    const now = new Date().toISOString();
    const jobs = readJobs();
    const job: Job = {
      id: randomId(),
      reference: `CG-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
      // In the demo adapter, a guest booking is placed in the demo customer's
      // workspace so it can be tracked after starting the demo persona.
      customerId: user?.role === 'CUSTOMER' ? user.id : MOCK_CUSTOMER_ID,
      description: input.description.trim(),
      category: input.category,
      categoryConfidence: input.categoryConfidence ?? null,
      locationText: input.locationText.trim(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      urgency: input.urgency,
      status: 'OPEN',
      assignedWorkerId: null,
      assignedWorkerName: null,
      createdAt: now,
      updatedAt: now,
      isDemo: true,
    };
    writeJobs([job, ...jobs]);
    return { ...job };
  },

  async getMyJobs() {
    await simulateLatency();
    const user = currentUser();
    if (!user) return [];
    const jobs = readJobs();
    let mine: Job[];
    if (user.role === 'WORKER') {
      mine = user.workerId ? jobs.filter((job) => job.assignedWorkerId === user.workerId) : [];
    } else if (user.role === 'ADMIN') {
      mine = jobs;
    } else {
      mine = jobs.filter((job) => job.customerId === user.id);
    }
    return mine
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((job) => ({ ...job }));
  },

  async getJob(jobId: string) {
    await simulateLatency(100);
    return { ...findJob(readJobs(), jobId) };
  },

  async acceptJob(jobId: string) {
    await simulateLatency(250);
    const user = requireUser();
    if (user.role !== 'WORKER' || !user.workerId) {
      throw new ApiError({
        code: 'FORBIDDEN',
        message: 'Only a linked worker profile can accept jobs.',
        status: 403,
      });
    }
    const jobs = readJobs();
    const job = findJob(jobs, jobId);
    if (job.status !== 'OPEN') {
      throw new ApiError({ code: 'CONFLICT', message: 'This request is no longer open.', status: 409 });
    }
    const updated: Job = {
      ...job,
      status: 'ACCEPTED',
      assignedWorkerId: user.workerId,
      assignedWorkerName: user.name,
      updatedAt: new Date().toISOString(),
    };
    writeJobs(replaceJob(jobs, updated));
    return { ...updated };
  },

  async updateJobStatus(jobId: string, status: JobStatus) {
    await simulateLatency(250);
    const user = requireUser();
    const jobs = readJobs();
    const job = findJob(jobs, jobId);

    const isAssignedWorker = user.role === 'WORKER' && user.workerId === job.assignedWorkerId;
    let next: JobStatus;
    if (status === 'IN_PROGRESS') {
      if (!isAssignedWorker || job.status !== 'ACCEPTED') {
        throw new ApiError({ code: 'FORBIDDEN', message: 'Only the assigned worker can start this job.', status: 403 });
      }
      next = 'IN_PROGRESS';
    } else if (status === 'COMPLETED') {
      if (!isAssignedWorker || job.status !== 'IN_PROGRESS') {
        throw new ApiError({ code: 'FORBIDDEN', message: 'Only the assigned worker can complete this job.', status: 403 });
      }
      next = 'COMPLETED';
    } else if (status === 'CANCELLED') {
      if (job.status !== 'OPEN' || user.id !== job.customerId) {
        throw new ApiError({
          code: 'FORBIDDEN',
          message: 'Only the customer can cancel an open request.',
          status: 403,
        });
      }
      next = 'CANCELLED';
    } else {
      throw new ApiError({
        code: 'VALIDATION_ERROR',
        message: 'That status is not supported by the demo flow.',
        status: 400,
      });
    }

    const updated: Job = { ...job, status: next, updatedAt: new Date().toISOString() };
    writeJobs(replaceJob(jobs, updated));
    return { ...updated };
  },

  async confirmCompletion(jobId: string) {
    await simulateLatency(250);
    const user = requireUser();
    const jobs = readJobs();
    const job = findJob(jobs, jobId);
    if (user.role !== 'CUSTOMER' || user.id !== job.customerId) {
      throw new ApiError({ code: 'FORBIDDEN', message: 'Only the customer can confirm completion.', status: 403 });
    }
    if (job.status !== 'COMPLETED') {
      throw new ApiError({
        code: 'CONFLICT',
        message: 'The worker must mark the job complete before you can confirm it.',
        status: 409,
      });
    }
    const updated: Job = { ...job, status: 'CUSTOMER_CONFIRMED', updatedAt: new Date().toISOString() };
    writeJobs(replaceJob(jobs, updated));
    return { ...updated };
  },

  async listOpenJobs() {
    await simulateLatency();
    return readJobs()
      .filter((job) => job.status === 'OPEN')
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((job) => ({ ...job }));
  },

  async login(input: LoginInput) {
    await simulateLatency(300);
    const email = input.email.trim();
    if (!email.includes('@')) {
      throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Enter a valid email address.', status: 400 });
    }
    if (input.password.length < 6) {
      throw new ApiError({
        code: 'VALIDATION_ERROR',
        message: 'Demo passwords must be at least 6 characters.',
        status: 400,
      });
    }
    const user = getDemoPersona(email);
    demoSessionStore.set(user);
    return { user, token: null, isDemo: true };
  },

  async register(input: RegisterInput) {
    await simulateLatency(300);
    if (input.name.trim().length < 2) {
      throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Enter your name.', status: 400 });
    }
    if (!input.email.includes('@')) {
      throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Enter a valid email address.', status: 400 });
    }
    if (input.password.length < 10) {
      throw new ApiError({
        code: 'VALIDATION_ERROR',
        message: 'Use at least 10 characters for the demo password.',
        status: 400,
      });
    }
    const role: UserRole = input.role === 'WORKER' ? 'WORKER' : 'CUSTOMER';
    const user: AuthUser = {
      id: `demo-user-${role.toLowerCase()}-${randomId()}`,
      name: `${input.name.trim()} (demo)`,
      email: input.email.trim().toLowerCase(),
      role,
      workerId: null,
    };
    demoSessionStore.set(user);
    return { user, token: null, isDemo: true };
  },

  async me() {
    return currentUser();
  },

  async logout() {
    demoSessionStore.clear();
  },

  async assistantChat(input: AssistantChatInput) {
    await simulateLatency(500);
    return mockAssistantChat(input);
  },

  async classify(description: string) {
    await simulateLatency(350);
    if (!description.trim()) {
      throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Enter a description first.', status: 400 });
    }
    return mockClassify(description);
  },
};
