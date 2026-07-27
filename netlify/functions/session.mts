import type { Context, Config } from "@netlify/functions";
import { verifySession, readCookie, SESSION_COOKIE } from "../lib/auth.mts";

export default async (req: Request, _context: Context) => {
  const session = verifySession(readCookie(req, SESSION_COOKIE));
  return Response.json(
    { role: session ? session.role : null },
    { headers: { "cache-control": "no-store" } },
  );
};

export const config: Config = { path: "/api/session" };
