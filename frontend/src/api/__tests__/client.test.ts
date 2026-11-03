import { describe, expect, it, vi } from 'vitest';
import { authTokenStore } from '../authToken';
import { apiRequest } from '../client';
import { ApiError } from '../errors';

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as Response;
}

describe('apiRequest', () => {
  it('unwraps the shared success envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(200, { data: { status: 'ok' }, requestId: 'r1' })));

    const result = await apiRequest<{ status: string }>('/api/v1/health');
    expect(result).toEqual({ status: 'ok' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/health',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('turns a standard error envelope into a typed ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse(400, {
          error: { code: 'VALIDATION_ERROR', message: 'A category is required.', details: { field: 'category' } },
        }),
      ),
    );

    await expect(apiRequest('/api/v1/jobs', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'VALIDATION_ERROR',
      message: 'A category is required.',
      status: 400,
    });
  });

  it('clears a stored token on 401', async () => {
    authTokenStore.set('demo-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Session expired.' } }),
      ),
    );

    await expect(apiRequest('/api/v1/jobs/mine')).rejects.toBeInstanceOf(ApiError);
    expect(authTokenStore.get()).toBeNull();
  });

  it('reports a network failure clearly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/api/v1/services/categories')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});
