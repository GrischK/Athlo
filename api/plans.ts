import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";
import { json } from "./_utils.js";
import { requireAuth } from "./_auth.js";
import { PlanStatus, StrengthExercise, StrengthPlan, StrengthSet } from "../src/types/workout";
import {
  asNumber,
  isIsoDateTime,
  isPlanStatus,
  isRecord,
  nowIso,
  parseBody,
  parseMaybeJson,
  StrengthExerciseInput,
  StrengthPlanInput,
  StrengthSetInput
} from "./helpers/helper_plan";

function validatePlan(
  body: StrengthPlanInput,
  existing?: StrengthPlan
): { ok: true; plan: StrengthPlan; ts: number } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON" };

  const { id, plannedFor, durationMin: durationMinRaw, notes, exercises: exercisesRaw } = body;

  if (typeof id !== "string" || id.length < 8) return { ok: false, error: "Invalid id" };
  if (!isIsoDateTime(plannedFor)) return { ok: false, error: "Invalid plannedFor" };

  const durationMin =
    durationMinRaw === undefined ? undefined : asNumber(durationMinRaw);
  if (durationMin !== undefined && (durationMin === null || durationMin <= 0)) {
    return { ok: false, error: "Invalid durationMin" };
  }

  let notesText: string | undefined;

  if (notes === undefined) {
    notesText = undefined;
  }
  else if (typeof notes === "string") {
    notesText = notes.trim();
  }
  else {
    return { ok: false, error: "Invalid notes" };
  }

  if (!Array.isArray(exercisesRaw) || exercisesRaw.length === 0) {
    return { ok: false, error: "Invalid exercises" };
  }

  const exercises: StrengthExercise[] = [];

  for (const exRaw of exercisesRaw) {
    if (!isRecord(exRaw)) return { ok: false, error: "Invalid exercise" };

    const ex = exRaw as StrengthExerciseInput;

    if (typeof ex.name !== "string" || ex.name.trim() === "") {
      return { ok: false, error: "Invalid exercise.name" };
    }
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
      return { ok: false, error: "Invalid exercise.sets" };
    }

    const sets: StrengthSet[] = [];

    for (const setRaw of ex.sets) {
      if (!isRecord(setRaw)) return { ok: false, error: "Invalid set" };
      const s = setRaw as StrengthSetInput;

      const reps = s.reps === undefined ? undefined : asNumber(s.reps);
      const weightKg = s.weightKg === undefined ? undefined : asNumber(s.weightKg);
      const durationSec = s.durationSec === undefined ? undefined : asNumber(s.durationSec);

      if (reps !== undefined && (reps === null || reps < 1)) return { ok: false, error: "Invalid set.reps" };
      if (weightKg !== undefined && (weightKg === null || weightKg < 0)) return {
        ok: false,
        error: "Invalid set.weightKg"
      };
      if (durationSec !== undefined && (durationSec === null || durationSec < 1)) return {
        ok: false,
        error: "Invalid set.durationSec"
      };
      if (reps === undefined && durationSec === undefined) return { ok: false, error: "Set needs reps or durationSec" };

      sets.push({
        ...(reps !== undefined ? { reps } : {}),
        ...(weightKg !== undefined ? { weightKg } : {}),
        ...(durationSec !== undefined ? { durationSec } : {}),
      });
    }

    exercises.push({ name: ex.name.trim(), sets });
  }


  const bodyStatus = body.status;
  if (bodyStatus !== undefined && !isPlanStatus(bodyStatus)) {
    return { ok: false, error: "Invalid status" };
  }

  let status: PlanStatus;
  if (bodyStatus === undefined) {
    status = existing?.status ?? "planned";
  }
  else {
    status = bodyStatus as PlanStatus;
  }

  const statusUpdatedAtRaw = body.statusUpdatedAt;
  let statusUpdatedAt: string;
  if (statusUpdatedAtRaw === undefined) {
    statusUpdatedAt = existing?.statusUpdatedAt ?? nowIso();
  }
  else if (isIsoDateTime(statusUpdatedAtRaw)) {
    statusUpdatedAt = statusUpdatedAtRaw;
  }
  else {
    return { ok: false, error: "Invalid statusUpdatedAt" };
  }

  const completedWorkoutIdRaw = body.completedWorkoutId;

  let completedWorkoutId: string | undefined;

  if (completedWorkoutIdRaw === undefined) {
    completedWorkoutId = existing?.completedWorkoutId;
  }
  else if (typeof completedWorkoutIdRaw === "string") {
    completedWorkoutId = completedWorkoutIdRaw;
  }
  else {
    return { ok: false, error: "Invalid completedWorkoutId" };
  }

  const plan: StrengthPlan = {
    id,
    plannedFor,
    ...(durationMin !== undefined ? { durationMin } : {}),
    ...(notesText ? { notes: notesText } : {}),
    exercises,
    status,
    statusUpdatedAt,
    ...(completedWorkoutId ? { completedWorkoutId: completedWorkoutId } : {}),
  };

  return { ok: true, plan, ts: Date.parse(plannedFor) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  if (!authed) return;

  const key = `user:${authed.username}:plans`;

  if (req.method === "GET") {
    const limitRaw = (req.query.limit ?? "30") as string;
    const limit = Math.min(200, Math.max(1, Number(limitRaw) || 30));

    const values = await kv.zrange<unknown[]>(key, 0, limit - 1, { rev: true });

    const plans = values
      .map(parseMaybeJson)
      .filter(isRecord)
      .filter((x): x is StrengthPlan =>
        typeof x.id === "string" &&
        isIsoDateTime(x.plannedFor) &&
        isPlanStatus(x.status) &&
        isIsoDateTime(x.statusUpdatedAt)
      );

    return json(res, 200, { plans });
  }

  if (req.method === "POST") {
    const raw = parseBody(req);
    if (raw === null) return json(res, 400, { error: "Invalid JSON" });
    if (!isRecord(raw)) return json(res, 400, { error: "Invalid JSON" });

    const body = raw as StrengthPlanInput;

    const bodyForCreate: StrengthPlanInput = {
      ...body,
      status: "planned",
      statusUpdatedAt: nowIso(),
      completedWorkoutId: undefined,
    };

    const v = validatePlan(bodyForCreate);
    if (v.ok === false) return json(res, 400, { error: v.error });

    await kv.zadd(key, { score: v.ts, member: JSON.stringify(v.plan) });
    return json(res, 201, { ok: true, plan: v.plan });
  }

  if (req.method === "PUT") {
    const raw = parseBody(req);
    if (raw === null) return json(res, 400, { error: "Invalid JSON" });
    if (!isRecord(raw)) return json(res, 400, { error: "Invalid JSON" });

    const body = raw as StrengthPlanInput;

    if (typeof body.id !== "string" || body.id.length < 8) {
      return json(res, 400, {error: "Invalid id"});
    }

    // find old member by id (scan last 200)

    const values = await kv.zrange<unknown[]>(key, 0, 199, { rev: true });

    for (const raw of values) {
      const parsed = parseMaybeJson(raw);
      if (!isRecord(parsed)) continue;

      const existing = parsed as StrengthPlan;

      if (!existing || typeof existing !== "object") continue;
      if (existing.id !== body.id) continue;

      if (existing.status === "done") {
        return json(res, 409, { error: "Plan already done" });
      }

      const v = validatePlan(body, existing);
      if (v.ok === false) return json(res, 400, { error: v.error });

      await kv.zrem(key, JSON.stringify(existing));
      await kv.zadd(key, { score: v.ts, member: JSON.stringify(v.plan) });

      return json(res, 200, { ok: true, plan: v.plan });
    }

    return json(res, 404, { error: "Plan not found" });
  }

  return json(res, 405, { error: "Method not allowed" });
}
