import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "./_utils.js";
import {requireAuth} from "./_auth.js";
import {StrengthExercise, StrengthPlan, WorkoutBase} from "../src/types/workout";

type StrengthWorkoutBase = WorkoutBase & {
  sport: "strength";
};

type StrengthWorkout = StrengthWorkoutBase & {
  details: { exercises: StrengthExercise[] };
};

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

function parseMaybeJson(v: unknown): any | null {
  if (v == null) return null;
  if (typeof v === "object") return v;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  if (!authed) return;

  if (req.method !== "POST") return json(res, 405, {error: "Method not allowed"});

  const body = parseBody(req);
  if (body === null) return json(res, 400, {error: "Invalid JSON"});

  const id = body.id as string;
  const action = body.action as "complete" | "cancel" | "delete";
  if (typeof id !== "string" || id.length < 8) return json(res, 400, {error: "Invalid id"});
  if (action !== "complete" && action !== "cancel" && action !== "delete") {
    return json(res, 400, {error: "Invalid action"});
  }

  const plansKey = `user:${authed.username}:plans`;
  const workoutsKey = `user:${authed.username}:workouts`;

  const values = await kv.zrange<unknown[]>(plansKey, 0, 199, {rev: true});

  for (const raw of values) {
    const plan = parseMaybeJson(raw) as StrengthPlan | null;
    if (!plan || typeof plan !== "object" || plan.id !== id) continue;

    const planMember = JSON.stringify(plan);

    if (action === "cancel" || action === "delete") {
      await kv.zrem(plansKey, planMember);
      return json(res, 200, {ok: true});
    }

    // complete: remove plan and add workout
    await kv.zrem(plansKey, planMember);

    const workout: StrengthWorkout = {
      id: plan.id,
      startedAt: plan.plannedFor,
      sport: "strength",
      durationMin: plan.durationMin,
      ...(plan.notes ? {notes: plan.notes} : {}),
      details: {exercises: plan.exercises},
    };

    const score = Date.parse(workout.startedAt);
    await kv.zadd(workoutsKey, {score, member: JSON.stringify(workout)});

    return json(res, 200, {ok: true, workout});
  }

  return json(res, 404, {error: "Plan not found"});
}
