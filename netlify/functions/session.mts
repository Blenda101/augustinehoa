import type { Context, Config } from "@netlify/functions";
import { verifySession, readCookie, SESSION_COOKIE, getBoard } from "../lib/auth.mts";

export default async (req: Request, _context: Context) => {
  const session = verifySession(readCookie(req, SESSION_COOKIE));
  if (!session) {
    return Response.json({ role: null }, { headers: { "cache-control": "no-store" } });
  }

  const board = await getBoard();
  return new Response(JSON.stringify({ role: session.role, board }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config: Config = { path: "/api/session" };
