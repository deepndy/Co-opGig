const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const rawMockFlag = String(import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase();
const rawTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 12_000);

/**
 * The demo adapter is the default so a clean install runs without a backend.
 * Set VITE_USE_MOCK_API=false to exercise the shared API contract.
 */
export const env = {
  apiBaseUrl: rawBaseUrl.replace(/\/+$/, ''),
  useMockApi: rawMockFlag !== 'false',
  requestTimeoutMs: Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 12_000,
} as const;

export const API_V1 = '/api/v1';
