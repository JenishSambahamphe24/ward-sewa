import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './api-client.ts';

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers }));

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('ApiClient', () => {
  it('prefixes /api, sends JSON and the session token', async () => {
    const fetchMock = reply(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);
    ApiClient.setToken('t0ken');
    await ApiClient.post('/applications', { body: { a: 1 }, idempotencyKey: 'key-12345678' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/applications');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer t0ken',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'key-12345678',
    });
    expect(init.body).toBe('{"a":1}');
  });

  it('turns the error body into a typed ApiError with Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      reply(
        429,
        { error: { code: 'RATE_LIMITED', message: 'slow down' } },
        { 'Retry-After': '41' },
      ),
    );
    const error = await ApiClient.get('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 41 });
  });

  it('clears a dead session and tells the app on 401', async () => {
    const onUnauthorized = vi.fn();
    ApiClient.onUnauthorized(onUnauthorized);
    ApiClient.setToken('expired');
    vi.stubGlobal('fetch', reply(401, { error: { code: 'UNAUTHENTICATED', message: 'no' } }));
    await ApiClient.get('/auth/me').catch(() => undefined);
    expect(ApiClient.token()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('reports a network failure as an ApiError the UI can handle', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(ApiClient.get('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('sends FormData without a JSON Content-Type so the browser sets the boundary', async () => {
    const fetchMock = reply(201, { id: 1 });
    vi.stubGlobal('fetch', fetchMock);
    const form = new FormData();
    form.append('documentCode', 'citizenship');
    await ApiClient.upload('/applications/1/documents', form);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
    expect(init.headers).not.toHaveProperty('Content-Type');
  });

  it('returns the body as a Blob for file downloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('%PDF-1.7', { status: 200, headers: { 'Content-Type': 'application/pdf' } }),
        ),
    );
    const blob = await ApiClient.blob('/applications/1/letter/pdf');
    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toBe('%PDF-1.7');
  });
});
