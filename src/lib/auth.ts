/**
 * Auth service, register / login / current user, backed by the DRF API.
 *
 * Token is stored in localStorage `dote.token`; a cached user profile is kept
 * in `dote.auth` (the key the rest of the app already reads, Profile, Invites
 * auto-register, Notifications, EventOverview). Keeping both in sync means the
 * existing screens keep working while data now comes from the server.
 */
import { apiFetch, clearLocalSession, getToken, TOKEN_KEY } from "./api";

const AUTH_KEY = "dote.auth";

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  gender?: string;
  avatar?: string;
  email_verified: boolean;
  phone_verified?: boolean;
  nin_verified?: boolean;
  created_at: string;
};

/** The cached-session shape the app reads from localStorage `dote.auth`. */
export type Session = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  avatar?: string;
  email_verified?: boolean;
  nin_verified?: boolean;
  joined?: string;
  at?: number;
};

export function isAuthed(): boolean {
  return !!getToken();
}

export function getSession(): Session {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSession(patch: Session) {
  try {
    const cur = getSession();
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ...cur, ...patch }));
  } catch {
    /* storage unavailable */
  }
}

/** Merge an API user into the cached session (preserves frontend-only fields). */
function cacheUser(u: ApiUser): Session {
  const at = u.created_at ? Date.parse(u.created_at) || Date.now() : Date.now();
  const session: Session = {
    id: u.id,
    name: u.name || undefined,
    email: u.email,
    phone: u.phone || undefined,
    email_verified: u.email_verified,
    nin_verified: u.nin_verified,
    at,
  };
  // Only carry non-empty server values so a server with no avatar/gender yet
  // doesn't wipe a choice the user just made locally.
  if (u.gender) session.gender = u.gender;
  if (u.avatar) session.avatar = u.avatar;
  writeSession(session);
  return session;
}

function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

type AuthResponse = { token: string; user: ApiUser };

export async function register(input: { name?: string; email: string; password: string; phone?: string }) {
  const res = await apiFetch<AuthResponse>("/auth/register/", { method: "POST", body: input, auth: false });
  saveToken(res.token);
  cacheUser(res.user);
  return res.user;
}

export async function login(input: { email: string; password: string }) {
  const res = await apiFetch<AuthResponse>("/auth/login/", { method: "POST", body: input, auth: false });
  saveToken(res.token);
  cacheUser(res.user);
  return res.user;
}

export async function fetchMe() {
  const user = await apiFetch<ApiUser>("/auth/me/");
  cacheUser(user);
  return user;
}

export async function updateMe(patch: {
  name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  avatar?: string;
}) {
  const user = await apiFetch<ApiUser>("/auth/me/", { method: "PATCH", body: patch });
  cacheUser(user);
  return user;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await apiFetch<{ detail: string; token?: string }>(
    "/auth/change-password/",
    { method: "POST", body: { current_password: currentPassword, new_password: newPassword } },
  );
  if (res.token) saveToken(res.token); // token rotated server-side
  return res;
}

export async function deleteAccount() {
  try {
    await apiFetch("/auth/me/", { method: "DELETE" });
  } catch {
    /* ignore network/401 — clear locally regardless */
  }
  clearLocalSession();
}

export async function verifyEmail(code: string) {
  const user = await apiFetch<ApiUser>("/auth/verify-email/", { method: "POST", body: { code } });
  cacheUser(user);
  return user;
}

/** Re-send the email verification OTP to the current user. */
export async function resendEmailOtp() {
  return apiFetch<{ detail: string }>("/auth/send-email-otp/", { method: "POST" });
}

export async function forgotPassword(email: string) {
  // Always resolves (server returns 200 regardless, to avoid enumeration).
  return apiFetch<{ detail: string }>("/auth/forgot-password/", {
    method: "POST", body: { email }, auth: false,
  });
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  const res = await apiFetch<AuthResponse>("/auth/reset-password/", {
    method: "POST", body: { email, code, new_password: newPassword }, auth: false,
  });
  saveToken(res.token);
  cacheUser(res.user);
  return res.user; // signed in on success
}

export async function changeEmail(email: string) {
  // Sets the new (unverified) email server-side and sends a fresh OTP.
  const user = await apiFetch<ApiUser>("/auth/change-email/", { method: "POST", body: { email } });
  cacheUser(user);
  return user;
}

export async function logout() {
  try {
    await apiFetch("/auth/logout/", { method: "POST" });
  } catch {
    /* ignore network/401, clear locally regardless */
  }
  clearLocalSession();
}

/** Fallback used when the backend is unreachable, so the mock UI still works. */
export function saveMockSession(input: { name?: string; email?: string }) {
  writeSession({
    name: input.name?.trim() || undefined,
    email: input.email?.trim() || undefined,
    at: Date.now(),
  });
}
