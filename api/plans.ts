import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "./_utils.js";
import {requireAuth} from "./_auth.js";
import {StrengthPlan} from "../src/types/workout";

function isIsoDateTime(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

function asNumber(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))) return Number(n);
  return null;
}

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

function validatePlan(body: any): { ok: true; plan: StrengthPlan; ts: number } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return {ok: false, error: "Invalid JSON"};

  const id = body.id;
  const plannedFor = body.plannedFor;
  const durationMin = body.durationMin === undefined ? undefined : asNumber(body.durationMin);
  const notes = body.notes;
  const exercises = body.exercises;

  if (typeof id !== "string" || id.length < 8) return {ok: false, error: "Invalid id"};
  if (!isIsoDateTime(plannedFor)) return {ok: false, error: "Invalid plannedFor"};
  if (durationMin !== undefined && (durationMin === null || durationMin <= 0)) {
    return {ok: false, error: "Invalid durationMin"};
  }
  if (notes !== undefined && typeof notes !== "string") return {ok: false, error: "Invalid notes"};

  if (!Array.isArray(exercises) || exercises.length === 0) {
    return {ok: false, error: "Invalid exercises"};
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

      if (reps === undefined && durationSec === undefined) return {ok: false, error: "Set needs reps or durationSec"};
    }
  }

  const plan: StrengthPlan = {
    id,
    plannedFor,
    ...(durationMin !== undefined ? { durationMin } : {}),
    ...(notes ? {notes: notes.trim()} : {}),
    exercises: exercises.map((ex: any) => ({
      name: String(ex.name).trim(),
      sets: ex.sets,
    })),
  };

  return {ok: true, plan, ts: Date.parse(plannedFor)};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  if (!authed) return;

  const key = `user:${authed.username}:plans`;

  if (req.method === "GET") {
    const limitRaw = (req.query.limit ?? "30") as string;
    const limit = Math.min(200, Math.max(1, Number(limitRaw) || 30));

    const values = await kv.zrange<unknown[]>(key, 0, limit - 1, {rev: true});

    const plans = values
      .map(parseMaybeJson)
      .filter((x): x is StrengthPlan => !!x && typeof x === "object" && typeof (x as any).id === "string");

    return json(res, 200, {plans});
  }

  if (req.method === "POST") {
    const body = parseBody(req);
    if (body === null) return json(res, 400, {error: "Invalid JSON"});

    const v = validatePlan(body);
    if (v.ok === false) return json(res, 400, {error: v.error});

    await kv.zadd(key, {score: v.ts, member: JSON.stringify(v.plan)});
    return json(res, 201, {ok: true, plan: v.plan});
  }

  if (req.method === "PUT") {
    const body = parseBody(req);
    if (body === null) return json(res, 400, {error: "Invalid JSON"});

    const v = validatePlan(body);
    if (v.ok === false) return json(res, 400, {error: v.error});

    // find old member by id (scan last 200)
    const values = await kv.zrange<unknown[]>(key, 0, 199, {rev: true});
    for (const raw of values) {
      const existing = parseMaybeJson(raw) as StrengthPlan | null;
      if (!existing || typeof existing !== "object") continue;
      if (existing.id !== v.plan.id) continue;

      await kv.zrem(key, JSON.stringify(existing));
      await kv.zadd(key, {score: v.ts, member: JSON.stringify(v.plan)});

      return json(res, 200, {ok: true, plan: v.plan});
    }

    return json(res, 404, {error: "Plan not found"});
  }

  return json(res, 405, {error: "Method not allowed"});
}

