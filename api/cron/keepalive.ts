import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "../../server/_utils.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return json(res, 405, {error: "Method not allowed"});

  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (!expectedSecret) {
    return json(res, 500, {error: "CRON_SECRET is not configured"});
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return json(res, 401, {error: "Unauthorized"});
  }

  const now = new Date().toISOString();

  await kv.set("system:keepalive:lastRunAt", {lastRunAt: now});
  const snapshot = await kv.get<{lastRunAt: string}>("system:keepalive:lastRunAt");

  return json(res, 200, {
    ok: true,
    lastRunAt: snapshot?.lastRunAt ?? now,
  });
}
