/**
 * Minimal API client for the Avela DRF backend (client-side).
 *
 * - Base URL from NEXT_PUBLIC_API_URL (default http://localhost:8000/api).
 * - Token auth: sends `Authorization: Token <token>` from localStorage
 *   `dote.token` unless `auth: false`.
 * - Throws `ApiError` on non-2xx; throws a plain network error if the backend
 *   is unreachable (callers can fall back to the local mock in that case).
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

export const TOKEN_KEY = "dote.token";

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown, message?: string) {
    super(message || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/** True when the failure is "couldn't reach the server" (not a 4xx/5xx). */
export function isNetworkError(err: unknown): boolean {
  return !(err instanceof ApiError) && err instanceof Error;
}

/** Fired on window when the local session is cleared (logout or a rejected token). */
export const SIGNED_OUT_EVENT = "dote:signed-out";

export function clearLocalSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("dote.auth");
  } catch {
    /* storage unavailable */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Pull a human-readable message out of a DRF error body. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) {
    const d = err.data as Record<string, unknown> | string | null;
    if (typeof d === "string") return d;
    if (d && typeof d === "object") {
      if (typeof d.detail === "string") return d.detail;
      // first field error (e.g. {"email": ["already exists"]})
      for (const v of Object.values(d)) {
        if (typeof v === "string") return v;
        if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      }
    }
    return err.message;
  }
  if (isNetworkError(err)) return "Can’t reach the server. Check your connection.";
  return fallback;
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean; // default true
  signal?: AbortSignal;
};

export async function apiFetch<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token && opts.auth !== false) headers["Authorization"] = `Token ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    // A token the server no longer accepts (logged out elsewhere, revoked):
    // drop the local session so the app stops acting signed in.
    if (res.status === 401 && token && opts.auth !== false) clearLocalSession();
    throw new ApiError(res.status, data);
  }
  return data as T;
}
