import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {getCookie, json} from "./_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return json(res, 405, {error: "Method not allowed"});

  const token = getCookie(req, "session");
  if (!token) return json(res, 200, {authenticated: false});

  const session = await kv.get<{ username: string }>(`session:${token}`);
  if (!session?.username) return json(res, 200, {authenticated: false});

  return json(res, 200, {authenticated: true, username: session.username});
}
