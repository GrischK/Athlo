import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "./_utils.js";
import {requireAuth} from "./_auth.js";
import type { StrengthPlan} from "../src/types/workout";
import { nowIso, parseMaybeJson} from "./helpers/helper_plan.js";
import {addDaysYMD, parisStartOfWeekMonday, parisWallTimeToIso, ymdToIsoDate} from "./helpers/helper_time_paris.js";
import { isRoutineRule, isStrengthPlanLike } from "./helpers/helper_routine";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  if (!authed) return;

  if (req.method !== "POST") return json(res, 405, {error: "Method not allowed"});

  const routinesKey = `user:${authed.username}:routines`;
  const plansKey = `user:${authed.username}:plans`;

  const routineValues = await kv.zrange<unknown[]>(routinesKey, 0, 199, {rev: true});
  const routines = routineValues
    .map(parseMaybeJson)
    .filter(isRoutineRule)
    .filter((r) => r.isEnabled);

  const monday = parisStartOfWeekMonday();
  const weekMonday = ymdToIsoDate(monday);

  // Existing plan ids (scan 500 dernières entrées)
  const existingValues = await kv.zrange<unknown[]>(plansKey, 0, 499, {rev: true});
  const existingIds = new Set<string>();
  for (const rawMember of existingValues) {
    const parsed = parseMaybeJson(rawMember);
    if (!isStrengthPlanLike(parsed)) continue;
    const id = (parsed as Record<string, unknown>).id;
    if (typeof id === "string") existingIds.add(id);
  }

  let createdCount = 0;

  for (const r of routines) {
    const day = addDaysYMD(monday, r.weekday - 1);
    const dateStr = ymdToIsoDate(day);
    const id = `${r.id}:${dateStr}`;

    if (existingIds.has(id)) continue;

    const plannedFor = parisWallTimeToIso(day, r.timeLocal);

    const plan: StrengthPlan = {
      id,
      plannedFor,
      durationMin: typeof r.durationMin === "number" ? r.durationMin : undefined,
      notes: typeof r.notes === "string" && r.notes.trim() ? r.notes.trim() : undefined,
      exercises: [],

      status: "planned",
      statusUpdatedAt: nowIso(),
      source: "routine",
      routineId: r.id,
    };

    await kv.zadd(plansKey, {score: Date.parse(plannedFor), member: JSON.stringify(plan)});
    existingIds.add(id);
    createdCount += 1;
  }

  return json(res, 200, {ok: true, weekMonday, createdCount});
}
