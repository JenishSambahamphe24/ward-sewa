export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly retryAfterSeconds: number | null;

  constructor(status: number, body: ApiErrorBody['error'], retryAfterSeconds: number | null) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface RequestOptions {
  body?: unknown;
  formData?: FormData;
  idempotencyKey?: string;
  signal?: AbortSignal;
  responseType?: 'json' | 'blob';
}

const BASE_URL = '/api';
const TOKEN_KEY = 'ward-sewa-session';

let onUnauthorized: () => void = () => {};

export class ApiClient {
  static token(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  static setToken(token: string | null): void {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  // The app registers what to do when a session dies (clear caches, go to login).
  static onUnauthorized(handler: () => void): void {
    onUnauthorized = handler;
  }

  static get<T>(path: string, options?: RequestOptions): Promise<T> {
    return ApiClient.request<T>('GET', path, options);
  }

  static post<T>(path: string, options?: RequestOptions): Promise<T> {
    return ApiClient.request<T>('POST', path, options);
  }

  static patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return ApiClient.request<T>('PATCH', path, options);
  }

  static upload<T>(path: string, formData: FormData): Promise<T> {
    return ApiClient.request<T>('POST', path, { formData });
  }

  static blob(path: string): Promise<Blob> {
    return ApiClient.request<Blob>('GET', path, { responseType: 'blob' });
  }

  static async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const token = ApiClient.token();
    const headers: Record<string, string> = { Accept: 'application/json' };
    // FormData sets its own multipart boundary, so only JSON bodies get a Content-Type here.
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body:
          options.formData ??
          (options.body === undefined ? undefined : JSON.stringify(options.body)),
        signal: options.signal,
      });
    } catch {
      throw new ApiError(0, { code: 'NETWORK', message: 'Network unavailable' }, null);
    }

    if (response.status === 204) return undefined as T;
    if (response.ok && options.responseType === 'blob') return (await response.blob()) as T;
    const data: unknown = await response.json().catch(() => null);
    if (response.ok) return data as T;

    if (response.status === 401 && token) {
      ApiClient.setToken(null);
      onUnauthorized();
    }
    const retryAfter = Number(response.headers.get('Retry-After'));
    const error = (data as ApiErrorBody | null)?.error ?? {
      code: 'UNKNOWN',
      message: response.statusText,
    };
    throw new ApiError(
      response.status,
      error,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }
}
