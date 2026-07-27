// Board roster + homeowner directory, stored in Netlify Blobs (store "directory").
//
// Board: names/roles are public; emails/phones are shown only to signed-in viewers.
// Homeowners: the entire list is board-only (PII) — never projected to non-admins.

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

export interface BoardMember { id: string; role: string; name: string; email: string; phone: string; }
export interface Homeowner {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  duesStatus: string; // "paid" | "unpaid" | "partial"
  amountDue: string;
}
export interface SignIn { email: string; role: string; at: string; }

const SIGNIN_LOG_LIMIT = 500;

const DEFAULT_BOARD: BoardMember[] = [
  { id: "pres",  role: "President",       name: "Jacqueline Roumou", email: "Jackie.roumou@gmail.com",      phone: "850-294-3626" },
  { id: "vp",    role: "Vice President",  name: "Beverly Fierro",    email: "Beverly.fierro@bsssalem.com", phone: "850-868-0947" },
  { id: "treas", role: "Treasurer",       name: "Gregory Smith",     email: "greggsmith80@gmail.com",       phone: "850-264-4182" },
  { id: "sec",   role: "Secretary",       name: "Gayla Parks",       email: "gparks1207@gmail.com",         phone: "850-566-4741" },
  { id: "mal",   role: "Member at Large", name: "Sean Hagan",        email: "",                             phone: "732-778-7986" },
];

// Strong consistency: reads reflect the latest write. Without this, Blobs is
// eventually consistent — a read right after a write can return stale/null data,
// which would corrupt read-modify-write updates (and could wipe the directory).
function store() { return getStore({ name: "directory", consistency: "strong" }); }

export function newId(prefix: string): string {
  return prefix + "-" + crypto.randomUUID().slice(0, 8);
}

export async function getBoard(): Promise<BoardMember[]> {
  const s = store();
  let board = (await s.get("board", { type: "json" })) as BoardMember[] | null;
  if (!board || !Array.isArray(board) || !board.length) {
    board = DEFAULT_BOARD;
    await s.setJSON("board", board);
    return board;
  }
  // Migrate any legacy rows that predate ids.
  let changed = false;
  board = board.map((m) => (m.id ? m : (changed = true, { ...m, id: newId("bd") })));
  if (changed) await s.setJSON("board", board);
  return board;
}

export async function saveBoard(board: BoardMember[]) { await store().setJSON("board", board); }

export async function getHomeowners(): Promise<Homeowner[]> {
  // Never write on read — an empty result just means no homeowners yet.
  const list = (await store().get("homeowners", { type: "json" })) as Homeowner[] | null;
  return Array.isArray(list) ? list : [];
}

export async function saveHomeowners(list: Homeowner[]) { await store().setJSON("homeowners", list); }

export async function getSignins(): Promise<SignIn[]> {
  const list = (await store().get("signins", { type: "json" })) as SignIn[] | null;
  return Array.isArray(list) ? list : [];
}

/** Append a sign-in (newest first), capped so the log can't grow unbounded. */
export async function logSignin(email: string, role: string, at: string): Promise<void> {
  const list = await getSignins();
  list.unshift({ email: (email || "").slice(0, 200), role, at });
  await store().setJSON("signins", list.slice(0, SIGNIN_LOG_LIMIT));
}

export async function clearSignins(): Promise<void> {
  await store().setJSON("signins", []);
}

/** Board projection: contact fields only for signed-in viewers. */
export function projectBoard(board: BoardMember[], signedIn: boolean) {
  return board.map((m) => ({
    id: m.id,
    role: m.role,
    name: m.name,
    hasEmail: !!m.email,
    email: signedIn ? (m.email || "") : "",
    phone: signedIn ? (m.phone || "") : "",
  }));
}
