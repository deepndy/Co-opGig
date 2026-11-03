export interface ApiErrorInit {
  code: string;
  message: string;
  status?: number | null;
  details?: unknown;
}

/** Typed error used for every failure surfaced by the API layer. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly details?: unknown;

  constructor({ code, message, status = null, details }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === 'UNAUTHORIZED';
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function getErrorMessage(value: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (value instanceof Error && value.message.trim()) return value.message;
  return fallback;
}
