import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

const BASE = "/api";
const tok = () => sessionStorage.getItem("santech_token") ?? "";

async function post(path: string, body?: unknown, authRequired = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authRequired) headers.Authorization = `Bearer ${tok()}`;
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export const WEBAUTHN_EMAIL_KEY = "webauthn_email";

/** Register the current device's fingerprint/biometric. Must be logged in. */
export async function registerFingerprint(email: string): Promise<void> {
  const options = await post("/auth/webauthn/register/begin", undefined, true);
  const response = await startRegistration({ optionsJSON: options });
  await post("/auth/webauthn/register/finish", response, true);
  localStorage.setItem(WEBAUTHN_EMAIL_KEY, email);
}

/** Remove fingerprint registration for current device. Must be logged in. */
export async function removeFingerprint(): Promise<void> {
  await post("/auth/webauthn/remove", undefined, true);
  localStorage.removeItem(WEBAUTHN_EMAIL_KEY);
}

/** Check if this browser has a registered fingerprint. */
export function hasFingerprintRegistered(): string | null {
  return localStorage.getItem(WEBAUTHN_EMAIL_KEY);
}

/** Sign in with fingerprint. Returns { token, user }. */
export async function loginWithFingerprint(email: string): Promise<{ token: string; user: any }> {
  const options = await post("/auth/webauthn/login/begin", { email });
  const response = await startAuthentication({ optionsJSON: options });
  return post("/auth/webauthn/login/finish", { email, response });
}
