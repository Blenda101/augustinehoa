// Shared helpers for the HOA auth functions.
//
// Auth model: a small number of *shared* access codes (one per role), checked
// server-side. On success we set a signed, HttpOnly session cookie so the browser
// never holds the codes or the directory data. The board's real contact details
// live here (server-side only) and in Netlify Blobs — never in the client bundle.

import crypto from "node:crypto";

export type Role = "resident" | "admin";

export const SESSION_COOKIE = "hoa_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  // Falls back to a fixed dev value so local runs work; production sets SESSION_SECRET.
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

// ---- Session token: base64url(payload).hmac ----

export function signSession(payload: { role: Role; exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined): { role: Role; exp: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload || typeof payload.exp !== "number" || Date.now() / 1000 > payload.exp) return null;
    if (payload.role !== "resident" && payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

export function newExp(): number {
  return Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
}

export function setCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return part.slice(idx + 1).trim();
  }
  return undefined;
}

// ---- Code checking ----

/** Returns the role for a submitted code, or null if it matches nothing. */
export function roleForCode(input: string): Role | null {
  const code = (input || "").trim().toLowerCase();
  if (!code) return null;
  const residentCode = (process.env.RESIDENT_CODE || "resident").trim().toLowerCase();
  const boardCode = (process.env.BOARD_CODE || "board").trim().toLowerCase();
  // Board code checked first so it wins if the two are ever set the same.
  if (code === boardCode) return "admin";
  if (code === residentCode) return "resident";
  return null;
}
