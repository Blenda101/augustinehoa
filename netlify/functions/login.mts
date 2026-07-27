import type { Context, Config } from "@netlify/functions";
import { roleForCode, signSession, newExp, setCookieHeader } from "../lib/auth.mts";
import { logSignin } from "../lib/directory.mts";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let code = "";
  let email = "";
  try {
    const body = await req.json();
    code = (body?.code ?? "").toString();
    email = (body?.email ?? "").toString();
  } catch {
    // ignore malformed body — treated as an empty code below
  }

  const role = roleForCode(code);
  if (!role) {
    return Response.json(
      { error: "That code isn’t recognized. Check with a board member." },
      { status: 401 },
    );
  }

  // Record the sign-in for the board's activity log (don't fail login if this errors).
  try { await logSignin(email, role, new Date().toISOString()); } catch {}

  const token = signSession({ role, exp: newExp() });
  return new Response(JSON.stringify({ role }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "set-cookie": setCookieHeader(token),
    },
  });
};

export const config: Config = { path: "/api/login" };
