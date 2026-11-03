import { env } from '../config/env';
import type { CoopGigApi } from '../types/api';
import { httpApi } from './httpApi';
import { mockApi } from './mock/mockApi';

/**
 * Every screen uses this single API surface. Switching to the real core
 * backend is an environment change (VITE_USE_MOCK_API=false), never a code
 * change scattered across components.
 */
export const api: CoopGigApi = env.useMockApi ? mockApi : httpApi;

export const isDemoMode = env.useMockApi;

export { ApiError, getErrorMessage, isApiError } from './errors';
