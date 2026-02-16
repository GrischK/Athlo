import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "./_utils.js";
import {requireAuth} from "./_auth.js";
import {UserGoal} from "../src/types/goal.js";

function parseBody(req: VercelRequest): any | null {
  const b: any = (req as any).body;
  if (b == null) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b);
    } catch {
      return null;
    }
  }
  return b;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  if (!authed) return;

  const key = `user:${authed.username}:goal`;

  if (req.method === "GET") {
    const goal = await kv.get<UserGoal>(key);
    return json(res, 200, {goal: goal ?? null});
  }

  if (req.method === "PUT") {
    const body = parseBody(req);
    if (body === null) return json(res, 400, {error: "Invalid JSON"});

    const text = body?.text;
    if (typeof text !== "string") return json(res, 400, {error: "Invalid text"});

    const cleaned = text.trim();
    if (!cleaned) return json(res, 400, {error: "Goal is empty"});

    const goal: UserGoal = {text: cleaned, updatedAt: new Date().toISOString()};
    await kv.set(key, goal);
    return json(res, 200, {ok: true, goal});
  }

  return json(res, 405, {error: "Method not allowed"});
}
