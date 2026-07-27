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

const DEFAULT_BOARD: BoardMember[] = [
  { id: "pres",  role: "President",       name: "Jacqueline Roumou", email: "Jackie.roumou@gmail.com",      phone: "850-294-3626" },
  { id: "vp",    role: "Vice President",  name: "Beverly Fierro",    email: "Beverly.fierro@bsssalem.com", phone: "850-868-0947" },
  { id: "treas", role: "Treasurer",       name: "Gregory Smith",     email: "greggsmith80@gmail.com",       phone: "850-264-4182" },
  { id: "sec",   role: "Secretary",       name: "Gayla Parks",       email: "gparks1207@gmail.com",         phone: "850-566-4741" },
  { id: "mal",   role: "Member at Large", name: "Sean Hagan",        email: "",                             phone: "732-778-7986" },
];

function store() { return getStore("directory"); }

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
  const s = store();
  let list = (await s.get("homeowners", { type: "json" })) as Homeowner[] | null;
  if (!list || !Array.isArray(list)) { list = []; await s.setJSON("homeowners", list); }
  return list;
}

export async function saveHomeowners(list: Homeowner[]) { await store().setJSON("homeowners", list); }

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
