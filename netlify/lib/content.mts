// Editable site content (next meeting, governing documents, past meetings),
// stored in Netlify Blobs so board members can update it without a code change.
//
// A meeting has an Agenda and (once held) Minutes — both are board-prepared
// document links. The next meeting also has a join link. Homeowner-only links
// are only projected to signed-in viewers — see projectContent().

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

export interface DocItem { id: string; title: string; note: string; url: string; meta: string; }
export interface PastMeeting { id: string; title: string; agenda: string; minutes: string; }
export interface Meeting { date: string; location: string; link: string; agenda: string; }
export interface Content { documents: DocItem[]; meetings: PastMeeting[]; meeting: Meeting; }

const DEFAULT_DOCUMENTS: DocItem[] = [
  { id: "ccrs",   title: "Declaration of Covenants, Conditions & Restrictions", note: "The recorded CC&Rs governing the property.", url: "", meta: "PDF" },
  { id: "bylaws", title: "Bylaws",                    note: "How the association and its board operate.",              url: "", meta: "PDF" },
  { id: "rules",  title: "Rules & Regulations",       note: "Parking, pets, trash, noise, and shared-area use.",       url: "", meta: "PDF" },
  { id: "arch",   title: "Architectural Guidelines",  note: "Read before any exterior change — approval is required.", url: "", meta: "PDF" },
  { id: "budget", title: "Annual Budget",             note: "Where your assessments go.",                              url: "", meta: "PDF" },
];

const DEFAULT_PAST_MEETINGS: PastMeeting[] = [
  { id: "annual", title: "Annual Meeting", agenda: "", minutes: "" },
  { id: "board",  title: "Board Meeting",  agenda: "", minutes: "" },
];

const DEFAULT_MEETING: Meeting = {
  date: "Date to be announced",
  location: "Location and agenda will be posted here and emailed to homeowners.",
  link: "",
  agenda: "",
};

// Strong consistency so reads reflect the latest admin write (see directory.mts).
function store() { return getStore({ name: "content", consistency: "strong" }); }

export function newId(prefix: string): string {
  return prefix + "-" + crypto.randomUUID().slice(0, 8);
}

export async function getContent(): Promise<Content> {
  const s = store();
  let documents = (await s.get("documents", { type: "json" })) as DocItem[] | null;
  let meetings = (await s.get("pastmeetings", { type: "json" })) as PastMeeting[] | null;
  let meeting = (await s.get("meeting", { type: "json" })) as Meeting | null;
  if (!documents) { documents = DEFAULT_DOCUMENTS; await s.setJSON("documents", documents); }
  if (!meetings) { meetings = DEFAULT_PAST_MEETINGS; await s.setJSON("pastmeetings", meetings); }
  if (!meeting) { meeting = DEFAULT_MEETING; await s.setJSON("meeting", meeting); }
  // Ensure the agenda field exists on older meeting records.
  if (meeting.agenda === undefined) meeting.agenda = "";
  return { documents, meetings, meeting };
}

export async function saveDocuments(d: DocItem[]) { await store().setJSON("documents", d); }
export async function savePastMeetings(m: PastMeeting[]) { await store().setJSON("pastmeetings", m); }
export async function saveMeeting(m: Meeting) { await store().setJSON("meeting", m); }

/** Shape content for a viewer. Links are included only when signed in. */
export function projectContent(c: Content, signedIn: boolean) {
  return {
    meeting: {
      date: c.meeting.date,
      location: c.meeting.location,
      hasLink: !!c.meeting.link,
      link: signedIn ? (c.meeting.link || "") : "",
      hasAgenda: !!c.meeting.agenda,
      agenda: signedIn ? (c.meeting.agenda || "") : "",
    },
    documents: c.documents.map((d) => ({
      id: d.id, title: d.title, note: d.note, meta: d.meta,
      hasUrl: !!d.url, url: signedIn ? (d.url || "") : "",
    })),
    meetings: c.meetings.map((m) => ({
      id: m.id, title: m.title,
      hasAgenda: !!m.agenda, agenda: signedIn ? (m.agenda || "") : "",
      hasMinutes: !!m.minutes, minutes: signedIn ? (m.minutes || "") : "",
    })),
  };
}
