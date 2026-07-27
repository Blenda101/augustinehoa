// Editable site content (next meeting, governing documents, past minutes),
// stored in Netlify Blobs so board members can update it without a code change.
//
// Homeowner-only fields (document links, the meeting join link) are only ever
// projected to signed-in viewers — see projectContent().

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

export interface DocItem { id: string; title: string; note: string; url: string; meta: string; }
export interface MinItem { id: string; title: string; url: string; meta: string; }
export interface Meeting { date: string; location: string; link: string; }
export interface Content { documents: DocItem[]; minutes: MinItem[]; meeting: Meeting; }

const DEFAULT_DOCUMENTS: DocItem[] = [
  { id: "ccrs",   title: "Declaration of Covenants, Conditions & Restrictions", note: "The recorded CC&Rs governing the property.", url: "", meta: "PDF" },
  { id: "bylaws", title: "Bylaws",                    note: "How the association and its board operate.",              url: "", meta: "PDF" },
  { id: "rules",  title: "Rules & Regulations",       note: "Parking, pets, trash, noise, and shared-area use.",       url: "", meta: "PDF" },
  { id: "arch",   title: "Architectural Guidelines",  note: "Read before any exterior change — approval is required.", url: "", meta: "PDF" },
  { id: "budget", title: "Annual Budget",             note: "Where your assessments go.",                              url: "", meta: "PDF" },
];

const DEFAULT_MINUTES: MinItem[] = [
  { id: "annual", title: "Annual Meeting — minutes", url: "", meta: "PDF" },
  { id: "board",  title: "Board Meeting — minutes",  url: "", meta: "PDF" },
];

const DEFAULT_MEETING: Meeting = {
  date: "Date to be announced",
  location: "Location and agenda will be posted here and emailed to homeowners.",
  link: "",
};

// Strong consistency so reads reflect the latest admin write (see directory.mts).
function store() { return getStore({ name: "content", consistency: "strong" }); }

export function newId(prefix: string): string {
  return prefix + "-" + crypto.randomUUID().slice(0, 8);
}

export async function getContent(): Promise<Content> {
  const s = store();
  let documents = (await s.get("documents", { type: "json" })) as DocItem[] | null;
  let minutes = (await s.get("minutes", { type: "json" })) as MinItem[] | null;
  let meeting = (await s.get("meeting", { type: "json" })) as Meeting | null;
  if (!documents) { documents = DEFAULT_DOCUMENTS; await s.setJSON("documents", documents); }
  if (!minutes) { minutes = DEFAULT_MINUTES; await s.setJSON("minutes", minutes); }
  if (!meeting) { meeting = DEFAULT_MEETING; await s.setJSON("meeting", meeting); }
  return { documents, minutes, meeting };
}

export async function saveDocuments(d: DocItem[]) { await store().setJSON("documents", d); }
export async function saveMinutes(m: MinItem[]) { await store().setJSON("minutes", m); }
export async function saveMeeting(m: Meeting) { await store().setJSON("meeting", m); }

/** Shape content for a viewer. Links/urls are included only when signed in. */
export function projectContent(c: Content, signedIn: boolean) {
  return {
    meeting: {
      date: c.meeting.date,
      location: c.meeting.location,
      hasLink: !!c.meeting.link,
      link: signedIn ? (c.meeting.link || "") : "",
    },
    documents: c.documents.map((d) => ({
      id: d.id, title: d.title, note: d.note, meta: d.meta,
      hasUrl: !!d.url, url: signedIn ? (d.url || "") : "",
    })),
    minutes: c.minutes.map((m) => ({
      id: m.id, title: m.title, meta: m.meta,
      hasUrl: !!m.url, url: signedIn ? (m.url || "") : "",
    })),
  };
}
