import type { Context, Config } from "@netlify/functions";
import { verifySession, readCookie, SESSION_COOKIE } from "../lib/auth.mts";
import {
  getContent, saveDocuments, savePastMeetings, saveMeeting, projectContent, newId as newContentId,
  type DocItem, type PastMeeting,
} from "../lib/content.mts";
import {
  getBoard, saveBoard, projectBoard, getHomeowners, saveHomeowners, getSignins, clearSignins, newId,
  type BoardMember, type Homeowner,
} from "../lib/directory.mts";

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
  const action = body.action;

  switch (action) {
    // ---- Meeting ----
    case "set-meeting": {
      const m = body.meeting || {};
      content.meeting = {
        date: str(m.date, 200) || "Date to be announced",
        location: str(m.location, 400),
        link: str(m.link, 1000),
        agenda: str(m.agenda, 1000),
      };
      await saveMeeting(content.meeting);
      break;
    }

    // ---- Documents ----
    case "add-document": {
      const d = body.doc || {};
      const item: DocItem = {
        id: newContentId("doc"),
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

    // ---- Past meetings (each has an Agenda and Minutes link) ----
    case "add-pastmeeting": {
      const m = body.item || {};
      const item: PastMeeting = {
        id: newContentId("mtg"),
        title: str(m.title, 200) || "Meeting",
        agenda: str(m.agenda, 1000),
        minutes: str(m.minutes, 1000),
      };
      content.meetings.push(item);
      await savePastMeetings(content.meetings);
      break;
    }
    case "update-pastmeeting": {
      content.meetings = content.meetings.map((m) =>
        m.id === body.id
          ? {
              ...m,
              title: body.patch?.title !== undefined ? str(body.patch.title, 200) || m.title : m.title,
              agenda: body.patch?.agenda !== undefined ? str(body.patch.agenda, 1000) : m.agenda,
              minutes: body.patch?.minutes !== undefined ? str(body.patch.minutes, 1000) : m.minutes,
            }
          : m,
      );
      await savePastMeetings(content.meetings);
      break;
    }
    case "delete-pastmeeting": {
      content.meetings = content.meetings.filter((m) => m.id !== body.id);
      await savePastMeetings(content.meetings);
      break;
    }

    // ---- Board roster ----
    case "add-board": {
      const b = body.member || {};
      const board = await getBoard();
      const item: BoardMember = {
        id: newId("bd"),
        role: str(b.role, 80) || "Member",
        name: str(b.name, 120) || "Board member",
        email: str(b.email, 200),
        phone: str(b.phone, 40),
      };
      board.push(item);
      await saveBoard(board);
      break;
    }
    case "update-board": {
      const board = (await getBoard()).map((m) =>
        m.id === body.id
          ? {
              ...m,
              role: body.patch?.role !== undefined ? str(body.patch.role, 80) || m.role : m.role,
              name: body.patch?.name !== undefined ? str(body.patch.name, 120) || m.name : m.name,
              email: body.patch?.email !== undefined ? str(body.patch.email, 200) : m.email,
              phone: body.patch?.phone !== undefined ? str(body.patch.phone, 40) : m.phone,
            }
          : m,
      );
      await saveBoard(board);
      break;
    }
    case "delete-board": {
      await saveBoard((await getBoard()).filter((m) => m.id !== body.id));
      break;
    }

    // ---- Homeowner directory (board-only) ----
    case "add-homeowner": {
      const h = body.homeowner || {};
      const list = await getHomeowners();
      const item: Homeowner = {
        id: newId("ho"),
        name: str(h.name, 160) || "Homeowner",
        address: str(h.address, 200),
        email: str(h.email, 200),
        phone: str(h.phone, 40),
        duesStatus: str(h.duesStatus, 20) || "unpaid",
        amountDue: str(h.amountDue, 40),
      };
      list.push(item);
      await saveHomeowners(list);
      break;
    }
    case "update-homeowner": {
      const list = (await getHomeowners()).map((h) =>
        h.id === body.id
          ? {
              ...h,
              name: body.patch?.name !== undefined ? str(body.patch.name, 160) || h.name : h.name,
              address: body.patch?.address !== undefined ? str(body.patch.address, 200) : h.address,
              email: body.patch?.email !== undefined ? str(body.patch.email, 200) : h.email,
              phone: body.patch?.phone !== undefined ? str(body.patch.phone, 40) : h.phone,
              duesStatus: body.patch?.duesStatus !== undefined ? str(body.patch.duesStatus, 20) || h.duesStatus : h.duesStatus,
              amountDue: body.patch?.amountDue !== undefined ? str(body.patch.amountDue, 40) : h.amountDue,
            }
          : h,
      );
      await saveHomeowners(list);
      break;
    }
    case "delete-homeowner": {
      await saveHomeowners((await getHomeowners()).filter((h) => h.id !== body.id));
      break;
    }

    // ---- Sign-in log ----
    case "clear-signins": {
      await clearSignins();
      break;
    }

    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const payload = {
    ...projectContent(content, true),
    board: projectBoard(await getBoard(), true),
    homeowners: await getHomeowners(),
    signins: await getSignins(),
    isAdmin: true,
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config: Config = { path: "/api/admin/content" };
