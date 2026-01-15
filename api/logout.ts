import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {clearSessionCookie, getCookie, json} from "./_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return json(res, 405, {error: "Method not allowed"});

  const token = getCookie(req, "session");
  if (token) {
    await kv.del(`session:${token}`);
  }

  clearSessionCookie(res);
  return json(res, 200, {ok: true});
}
