const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
const TOKEN_KEY = 'moblytix.token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* armazenamento indisponivel (modo privado) — segue apenas em memoria */
  }
}

/** Disparado quando a API responde 401, para que a aplicacao volte ao login. */
export const unauthorizedEvent = new EventTarget();

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;

  const url = new URL(`${API_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (response.status === 401) {
    setToken(null);
    unauthorizedEvent.dispatchEvent(new Event('unauthorized'));
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ??
      `Falha na requisição (HTTP ${response.status})`;
    throw new ApiError(response.status, message, (payload as { error?: { details?: unknown } } | null)?.error?.details);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => apiRequest<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
