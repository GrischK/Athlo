import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "./_utils.js";
import {requireAuth} from "./_auth.js";
import {isRecord, parseBody, parseMaybeJson} from "./helpers/helper_plan.js";
import { RoutineRule } from "../src/types/routine.js";
import { isRoutineRule, validateRoutine } from "./helpers/helper_routine.js";

export type RoutineRuleInput = {
  id?: unknown;
  sport?: unknown;
  weekday?: unknown;
  timeLocal?: unknown;
  durationMin?: unknown;
  notes?: unknown;
  isEnabled?: unknown;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  if (!authed) return;

  const key = `user:${authed.username}:routines`;

  if (req.method === "GET") {
    const values = await kv.zrange<unknown[]>(key, 0, 199, {rev: true});
    const routines = values
      .map(parseMaybeJson)
      .filter(isRoutineRule);

    return json(res, 200, {routines});
  }

  if (req.method === "POST") {
    const raw = parseBody(req);
    if (raw === null) return json(res, 400, {error: "Invalid JSON"});
    if (!isRecord(raw)) return json(res, 400, {error: "Invalid JSON"});

    const v = validateRoutine(raw as RoutineRuleInput);

    if (v.ok === false) {
      return json(res, 400, { error: v.error });
    }
    await kv.zadd(key, {score: v.ts, member: JSON.stringify(v.routine)});
    return json(res, 201, {ok: true, routine: v.routine});
  }

  if (req.method === "PUT") {
    const raw = parseBody(req);
    if (raw === null) return json(res, 400, {error: "Invalid JSON"});
    if (!isRecord(raw)) return json(res, 400, {error: "Invalid JSON"});

    const input = raw as RoutineRuleInput;
    if (typeof input.id !== "string" || input.id.length < 8) return json(res, 400, {error: "Invalid id"});

    const values = await kv.zrange<unknown[]>(key, 0, 199, {rev: true});
    for (const rawMember of values) {
      const parsed = parseMaybeJson(rawMember);
      if (!isRecord(parsed)) continue;
      const existing = parsed as RoutineRule;
      if (existing.id !== input.id) continue;

      const v = validateRoutine(input, existing);
      if (v.ok === false) {
        return json(res, 400, { error: v.error });
      }
      await kv.zrem(key, JSON.stringify(existing));
      await kv.zadd(key, {score: v.ts, member: JSON.stringify(v.routine)});

      return json(res, 200, {ok: true, routine: v.routine});
    }

    return json(res, 404, {error: "Routine not found"});
  }

  return json(res, 405, {error: "Method not allowed"});
}
