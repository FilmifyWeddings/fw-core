import { supabase } from '@/lib/supabase';

/**
 * Authenticated fetch wrapper for client components.
 * Attaches the current Supabase JWT Bearer token + cookies, retries once after
 * refreshing the session on HTTP 401, and throws structured errors on failure.
 */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const buildHeaders = async (forceRefresh = false): Promise<Headers> => {
    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    try {
      let token: string | undefined;
      if (forceRefresh) {
        const { data } = await supabase.auth.refreshSession();
        token = data.session?.access_token;
      } else {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token;
        if (!token) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          token = refreshed.session?.access_token;
        }
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch (_) {}
    return headers;
  };

  let res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: await buildHeaders(false),
  });

  if (res.status === 401) {
    res = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: await buildHeaders(true),
    });
  }

  return res;
}

export async function authFetchJson<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(url, init);
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response (${res.status}) from ${url}`);
  }
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || `Request failed with status ${res.status}`);
  }
  return json as T;
}
