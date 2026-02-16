import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "./_utils.js";
import {requireAuth} from "./_auth.js";
import type {StrengthExercise, StrengthPlan, WorkoutBase} from "../src/types/workout.js";
import {isRecord, nowIso, parseBody, parseMaybeJson} from "./helpers/plan.helper.js";

type StrengthWorkoutBase = WorkoutBase & {
  sport: "strength";
};

type StrengthWorkout = StrengthWorkoutBase & {
  details: { exercises: StrengthExercise[] };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  if (!authed) return;

  if (req.method !== "POST") return json(res, 405, {error: "Method not allowed"});

  const raw = parseBody(req);
  if (raw === null) return json(res, 400, {error: "Invalid JSON"});
  if (!isRecord(raw)) return json(res, 400, {error: "Invalid JSON"});

  const id = raw.id;
  const action = raw.action;

  if (typeof id !== "string" || id.length < 8) return json(res, 400, {error: "Invalid id"});
  if (action !== "complete" && action !== "cancel" && action !== "delete") {
    return json(res, 400, {error: "Invalid action"});
  }

  const plansKey = `user:${authed.username}:plans`;
  const workoutsKey = `user:${authed.username}:workouts`;

  const values = await kv.zrange<unknown[]>(plansKey, 0, 199, {rev: true});

  for (const rawMember of values) {
    const parsed = parseMaybeJson(rawMember);
    if (!isRecord(parsed)) continue;

    const plan = parsed as StrengthPlan;

    if (typeof plan.id !== "string") continue;
    if (plan.id !== id) continue;

    const planMember = JSON.stringify(plan);

    // delete = suppression réelle
    if (action === "delete") {
      await kv.zrem(plansKey, planMember);
      return json(res, 200, {ok: true});
    }

    // cancel = on garde, on met canceled
    if (action === "cancel") {
      const updated: StrengthPlan = {
        ...plan,
        status: "canceled",
        statusUpdatedAt: nowIso(),
      };

      await kv.zrem(plansKey, planMember);
      await kv.zadd(plansKey, {score: Date.parse(updated.plannedFor), member: JSON.stringify(updated)});

      return json(res, 200, {ok: true, plan: updated});
    }

    // complete = on garde, on met done, et on crée le workout
    if (plan.status === "done") {
      return json(res, 200, {ok: true, plan});
    }

    const workoutId = plan.completedWorkoutId ?? plan.id;

    const workout: StrengthWorkout = {
      id: workoutId,
      startedAt: plan.plannedFor,
      sport: "strength",
      durationMin: plan.durationMin,
      ...(plan.notes ? {notes: plan.notes} : {}),
      details: {exercises: plan.exercises},
    };

    await kv.zadd(workoutsKey, {score: Date.parse(workout.startedAt), member: JSON.stringify(workout)});

    const updated: StrengthPlan = {
      ...plan,
      status: "done",
      statusUpdatedAt: nowIso(),
      completedWorkoutId: workoutId,
    };

    await kv.zrem(plansKey, planMember);
    await kv.zadd(plansKey, {score: Date.parse(updated.plannedFor), member: JSON.stringify(updated)});

    return json(res, 200, {ok: true, workout, plan: updated});
  }

  return json(res, 404, {error: "Plan not found"});
}
