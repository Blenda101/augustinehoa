import type { Context, Config } from "@netlify/functions";
import { verifySession, readCookie, SESSION_COOKIE } from "../lib/auth.mts";
import { getContent, projectContent } from "../lib/content.mts";

export default async (req: Request, _context: Context) => {
  const session = verifySession(readCookie(req, SESSION_COOKIE));
  const content = await getContent();
  const out = projectContent(content, !!session);
  return new Response(JSON.stringify({ ...out, isAdmin: session?.role === "admin" }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config: Config = { path: "/api/content" };
