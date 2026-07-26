import type { Context, Config } from "@netlify/functions";
import { clearCookieHeader } from "../lib/auth.mts";

export default async (_req: Request, _context: Context) => {
  return new Response(JSON.stringify({ role: null }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "set-cookie": clearCookieHeader(),
    },
  });
};

export const config: Config = { path: "/api/logout" };
