import type { Context, Config } from "@netlify/functions";
import { verifySession, readCookie, SESSION_COOKIE } from "../lib/auth.mts";
import { getContent, projectContent } from "../lib/content.mts";
import { getBoard, projectBoard, getHomeowners, getSignins } from "../lib/directory.mts";

export default async (req: Request, _context: Context) => {
  const session = verifySession(readCookie(req, SESSION_COOKIE));
  const signedIn = !!session;
  const isAdmin = session?.role === "admin";

  const content = await getContent();
  const board = projectBoard(await getBoard(), signedIn);

  const payload: Record<string, unknown> = {
    ...projectContent(content, signedIn),
    board,
    isAdmin,
  };
  // Homeowner directory and sign-in log are board-only.
  if (isAdmin) {
    payload.homeowners = await getHomeowners();
    payload.signins = await getSignins();
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config: Config = { path: "/api/content" };
