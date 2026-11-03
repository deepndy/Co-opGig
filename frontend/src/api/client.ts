import { env } from '../config/env';
import { authTokenStore } from './authToken';
import { ApiError } from './errors';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Set false for login/register so a stale token is not attached. */
  auth?: boolean;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaultMessageForStatus(status: number): string {
  if (status === 400) return 'Some of the details are not valid. Please check the form.';
  if (status === 401) return 'You need to sign in to continue.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'The requested item could not be found.';
  if (status === 409) return 'This request conflicts with the current state. Refresh and try again.';
  if (status === 422) return 'Some of the details are not valid. Please review them.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The Co-opGig server had a problem. Please try again shortly.';
  return 'The request could not be completed.';
}

function errorCodeForStatus(status: number): string {
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'HTTP_ERROR';
}

/** Dispatch a browser event so the auth context can react to an expired token. */
function notifyUnauthorized(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('coopgig:unauthorized'));
  }
}

function parseErrorPayload(payload: unknown, status: number): ApiError {
  if (isRecord(payload) && isRecord(payload.error)) {
    const body = payload.error;
    return new ApiError({
      code: typeof body.code === 'string' && body.code ? body.code : errorCodeForStatus(status),
      message: typeof body.message === 'string' && body.message ? body.message : defaultMessageForStatus(status),
      details: body.details,
      status,
    });
  }
  return new ApiError({
    code: errorCodeForStatus(status),
    message: defaultMessageForStatus(status),
    status,
  });
}

/**
 * One fetch wrapper for every core-backend call.
 * - Prefixes the configured API origin.
 * - Attaches the optional bearer token and sends cookies.
 * - Unwraps the shared `{ data }` success envelope.
 * - Normalizes `{ error: { code, message, details } }` into ApiError.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!path.startsWith('/')) {
    throw new ApiError({ code: 'CLIENT_ERROR', message: `API path must be absolute: ${path}` });
  }

  const url = env.apiBaseUrl ? `${env.apiBaseUrl}${path}` : path;
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = options.auth === false ? null : authTokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, env.requestTimeoutMs);

  const abortFromCaller = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', abortFromCaller, { once: true });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiError({
        code: 'TIMEOUT',
        message: 'The Co-opGig API took too long to respond. Please try again.',
      });
    }
    if (options.signal?.aborted) {
      throw new ApiError({ code: 'REQUEST_ABORTED', message: 'The request was cancelled.' });
    }
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Could not reach the Co-opGig API. Check your connection or the configured API URL.',
      details: error instanceof Error ? error.message : undefined,
    });
  } finally {
    window.clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }

  const text = await response.text().catch(() => '');
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const apiError = parseErrorPayload(payload, response.status);
    if (response.status === 401 && options.auth !== false) {
      authTokenStore.clear();
      notifyUnauthorized();
    }
    throw apiError;
  }

  if (response.status === 204) return undefined as T;
  if (isRecord(payload) && 'data' in payload) return payload.data as T;
  return payload as T;
}
