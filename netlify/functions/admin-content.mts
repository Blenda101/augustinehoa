import type { Context, Config } from "@netlify/functions";
import { verifySession, readCookie, SESSION_COOKIE } from "../lib/auth.mts";
import {
  getContent, saveDocuments, saveMinutes, saveMeeting, projectContent, newId,
  type DocItem, type MinItem,
} from "../lib/content.mts";

const str = (v: unknown, max: number) => (v ?? "").toString().slice(0, max);

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const session = verifySession(readCookie(req, SESSION_COOKIE));
  if (!session || session.role !== "admin") {
    return Response.json({ error: "Board members only." }, { status: 403 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  const content = await getContent();

  switch (body.action) {
    case "set-meeting": {
      const m = body.meeting || {};
      content.meeting = {
        date: str(m.date, 200) || "Date to be announced",
        location: str(m.location, 400),
        link: str(m.link, 1000),
      };
      await saveMeeting(content.meeting);
      break;
    }

    case "add-document": {
      const d = body.doc || {};
      const item: DocItem = {
        id: newId("doc"),
        title: str(d.title, 200) || "Untitled document",
        note: str(d.note, 400),
        url: str(d.url, 1000),
        meta: str(d.meta, 20) || "PDF",
      };
      content.documents.push(item);
      await saveDocuments(content.documents);
      break;
    }
    case "update-document": {
      content.documents = content.documents.map((d) =>
        d.id === body.id
          ? {
              ...d,
              title: body.patch?.title !== undefined ? str(body.patch.title, 200) || d.title : d.title,
              note: body.patch?.note !== undefined ? str(body.patch.note, 400) : d.note,
              url: body.patch?.url !== undefined ? str(body.patch.url, 1000) : d.url,
            }
          : d,
      );
      await saveDocuments(content.documents);
      break;
    }
    case "delete-document": {
      content.documents = content.documents.filter((d) => d.id !== body.id);
      await saveDocuments(content.documents);
      break;
    }

    case "add-minutes": {
      const m = body.item || {};
      const item: MinItem = {
        id: newId("min"),
        title: str(m.title, 200) || "Meeting minutes",
        url: str(m.url, 1000),
        meta: str(m.meta, 20) || "PDF",
      };
      content.minutes.push(item);
      await saveMinutes(content.minutes);
      break;
    }
    case "update-minutes": {
      content.minutes = content.minutes.map((m) =>
        m.id === body.id
          ? {
              ...m,
              title: body.patch?.title !== undefined ? str(body.patch.title, 200) || m.title : m.title,
              url: body.patch?.url !== undefined ? str(body.patch.url, 1000) : m.url,
            }
          : m,
      );
      await saveMinutes(content.minutes);
      break;
    }
    case "delete-minutes": {
      content.minutes = content.minutes.filter((m) => m.id !== body.id);
      await saveMinutes(content.minutes);
      break;
    }

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const out = projectContent(content, true);
  return new Response(JSON.stringify({ ...out, isAdmin: true }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config: Config = { path: "/api/admin/content" };
