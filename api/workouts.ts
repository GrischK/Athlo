import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "../server/_utils.js";
import {requireAuth} from "../server/_auth.js";

type Sport = "swim" | "run" | "laser_run" | "strength";

export type WorkoutBase = {
  id: string;
  startedAt: string;
  sport: Sport;
  durationMin?: number;
  rpe?: number;
  notes?: string;
};

type RunDetails = { distanceKm: number; paceSecPerKm?: number };
type SwimDetails = { distanceM: number; poolLengthM?: 25 | 50 };
type StrengthSet = { reps?: number; weightKg?: number; durationSec?: number };
type StrengthExercise = { name: string; sets: StrengthSet[] };
type StrengthDetails = { exercises: StrengthExercise[] };

type Workouts =
  | (WorkoutBase & { sport: "run"; details: RunDetails })
  | (WorkoutBase & { sport: "laser_run"; details: RunDetails })
  | (WorkoutBase & { sport: "swim"; details: SwimDetails })
  | (WorkoutBase & { sport: "strength"; details: StrengthDetails });

type ValidateOk = { ok: true; workout: Workouts; ts: number };
type ValidateErr = { ok: false; error: string };
type ValidateResult = ValidateOk | ValidateErr;

function isIsoDateTime(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

function asNumber(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))) return Number(n);
  return null;
}

function validateWorkout(body: any): ValidateResult {
  if (!body || typeof body !== "object") return {ok: false, error: "Invalid JSON"};

  const id = body.id;
  const startedAt = body.startedAt;
  const sport = body.sport as Sport;
  const durationMin = body.durationMin === undefined ? undefined : asNumber(body.durationMin);
  const rpe = body.rpe === undefined ? undefined : asNumber(body.rpe);
  const notes = body.notes;

  if (typeof id !== "string" || id.length < 8) return {ok: false, error: "Invalid id"};
  if (!isIsoDateTime(startedAt)) return {ok: false, error: "Invalid startedAt"};
  if (!["swim", "run", "laser_run", "strength"].includes(sport)) return {ok: false, error: "Invalid sport"};
  if (sport === "swim") {
    if (durationMin === undefined || durationMin === null || durationMin <= 0) return {ok: false, error: "Invalid durationMin"};
  } else if (sport === "strength" && body.durationMin !== undefined && (durationMin === null || durationMin <= 0)) {
    return {ok: false, error: "Invalid durationMin"};
  } else if ((sport === "run" || sport === "laser_run") && durationMin !== undefined && (durationMin === null || durationMin <= 0)) {
    return {ok: false, error: "Invalid durationMin"};
  }
  if (rpe !== undefined && (rpe === null || rpe < 1 || rpe > 10)) return {ok: false, error: "Invalid rpe"};
  if (notes !== undefined && typeof notes !== "string") return {ok: false, error: "Invalid notes"};

  const ts = Date.parse(startedAt);
  const base: WorkoutBase = {
    id,
    startedAt,
    sport,
    ...(durationMin !== undefined && durationMin !== null ? {durationMin} : {}),
    ...(rpe !== undefined ? {rpe} : {}),
    ...(notes ? {notes} : {}),
  };

  const details = body.details;

  if (sport === "run" || sport === "laser_run") {
    const distanceKm = asNumber(details?.distanceKm);
    const paceSecPerKm = details?.paceSecPerKm === undefined ? undefined : asNumber(details?.paceSecPerKm);

    if (distanceKm === null || distanceKm <= 0) return {ok: false, error: "Invalid details.distanceKm"};
    if (paceSecPerKm !== undefined && (paceSecPerKm === null || paceSecPerKm <= 0)) {
      return {ok: false, error: "Invalid details.paceSecPerKm"};
    }

    const finalDurationMin =
      durationMin !== undefined && durationMin !== null
        ? durationMin
        : paceSecPerKm !== undefined && paceSecPerKm !== null
          ? Number(((paceSecPerKm * distanceKm) / 60).toFixed(2))
          : undefined;

    const finalPaceSecPerKm =
      paceSecPerKm !== undefined && paceSecPerKm !== null
        ? paceSecPerKm
        : durationMin !== undefined && durationMin !== null
          ? Math.round((durationMin * 60) / distanceKm)
          : undefined;

    if (finalDurationMin === undefined || finalDurationMin <= 0) {
      return {ok: false, error: "Run needs durationMin or details.paceSecPerKm"};
    }

    if (finalPaceSecPerKm === undefined || finalPaceSecPerKm <= 0) {
      return {ok: false, error: "Run needs durationMin or details.paceSecPerKm"};
    }

    const workout: Workouts = {
      ...(base as any),
      sport,
      durationMin: finalDurationMin,
      details: {distanceKm, paceSecPerKm: finalPaceSecPerKm},
    };
    return {ok: true, workout, ts};
  }

  if (sport === "swim") {
    const distanceM = asNumber(details?.distanceM);
    const poolLengthM = details?.poolLengthM;

    if (distanceM === null || distanceM <= 0) return {ok: false, error: "Invalid details.distanceM"};
    if (poolLengthM !== undefined && poolLengthM !== 25 && poolLengthM !== 50) {
      return {ok: false, error: "Invalid details.poolLengthM"};
    }

    const workout: Workouts = {
      ...(base as any),
      sport: "swim",
      details: {distanceM, ...(poolLengthM ? {poolLengthM} : {})},
    };
    return {ok: true, workout, ts};
  }

  // strength
  if (sport === "strength") {
    const exercises = details?.exercises;
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return {ok: false, error: "Invalid details.exercises"};
    }

    for (const ex of exercises) {
      if (!ex || typeof ex !== "object") return {ok: false, error: "Invalid exercise"};
      if (typeof ex.name !== "string" || ex.name.trim() === "") return {ok: false, error: "Invalid exercise.name"};
      if (!Array.isArray(ex.sets) || ex.sets.length === 0) return {ok: false, error: "Invalid exercise.sets"};

      for (const s of ex.sets) {
        if (!s || typeof s !== "object") return {ok: false, error: "Invalid set"};
        const reps = s.reps === undefined ? undefined : asNumber(s.reps);
        const weightKg = s.weightKg === undefined ? undefined : asNumber(s.weightKg);
        const durationSec = s.durationSec === undefined ? undefined : asNumber(s.durationSec);

        if (reps !== undefined && (reps === null || reps < 1)) return {ok: false, error: "Invalid set.reps"};
        if (weightKg !== undefined && (weightKg === null || weightKg < 0)) return {
          ok: false,
          error: "Invalid set.weightKg"
        };
        if (durationSec !== undefined && (durationSec === null || durationSec < 1)) return {
          ok: false,
          error: "Invalid set.durationSec"
        };

        if (reps === undefined && durationSec === undefined) {
          return {ok: false, error: "Set needs reps or durationSec"};
        }
      }
    }

    const workout: Workouts = {
      ...(base as any),
      sport: "strength",
      details: {exercises},
    };
    return {ok: true, workout, ts};
  }

  return {ok: false, error: "Invalid workout"};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  console.log("authed:", authed);
  if (!authed) return;

  const key = `user:${authed.username}:workouts`;
  console.log("key : ", key)

  if (req.method === "GET") {
    const limitRaw = (req.query.limit ?? "30") as string;
    const limit = Math.min(200, Math.max(1, Number(limitRaw) || 30));

    const values = await kv.zrange<unknown[]>(key, 0, limit - 1, { rev: true });

    const workouts = values
      .map((v) => {
        if (v == null) return null;

        // si KV a déjà désérialisé
        if (typeof v === "object") return v;

        // sinon on parse la string JSON
        if (typeof v === "string") {
          try {
            return JSON.parse(v);
          } catch {
            return null;
          }
        }

        return null;
      })
      .filter(Boolean);

    return json(res, 200, { workouts });
  }


  if (req.method === "POST") {
    let body: any;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
    } catch {
      return json(res, 400, {error: "Invalid JSON"});
    }

    const v = validateWorkout(body);

    if (v.ok === false) {
      return json(res, 400, {error: v.error});
    }

    await kv.zadd(key, {score: v.ts, member: JSON.stringify(v.workout)});

    return json(res, 201, {ok: true, workout: v.workout});
  }

  if (req.method === "PUT") {
    let body: any;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
    } catch {
      return json(res, 400, {error: "Invalid JSON"});
    }

    if (typeof body?.id !== "string" || body.id.length < 8) {
      return json(res, 400, {error: "Invalid id"});
    }

    const values = await kv.zrange<unknown[]>(key, 0, 199, { rev: true });

    for (const raw of values) {
      const existing =
        typeof raw === "string"
          ? (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return null;
            }
          })()
          : raw;

      if (!existing || typeof existing !== "object") continue;
      if ((existing as {id?: string}).id !== body.id) continue;

      const v = validateWorkout(body);
      if (v.ok === false) {
        return json(res, 400, {error: v.error});
      }

      await kv.zrem(key, JSON.stringify(existing));
      await kv.zadd(key, {score: v.ts, member: JSON.stringify(v.workout)});

      return json(res, 200, {ok: true, workout: v.workout});
    }

    return json(res, 404, {error: "Workout not found"});
  }

  return json(res, 405, {error: "Method not allowed"});
}
