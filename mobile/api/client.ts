import { supabase } from '@/lib/supabase';
import { ApiError } from '@/api/types/errors';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

const buildUrl = (path: string) => {
  if (!apiBaseUrl) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_URL. Set it in mobile/.env (e.g., your existing backend base URL).'
    );
  }
  return `${apiBaseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
};

const getAuthHeader = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers } = options;
  const url = buildUrl(path);
  const authHeader = await getAuthHeader();

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson && payload?.message ? payload.message : response.statusText;
    throw new ApiError(message || 'Request failed', response.status, payload);
  }

  return payload as T;
}
