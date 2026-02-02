import { VercelRequest } from "@vercel/node";
import {PlanSource, PlanStatus} from "../../src/types/workout";

export type StrengthSetInput = {
  reps?: unknown;
  weightKg?: unknown;
  durationSec?: unknown;
};

export type StrengthExerciseInput = {
  name?: unknown;
  sets?: unknown;
};

export type StrengthPlanInput = {
  id?: unknown;
  plannedFor?: unknown;
  durationMin?: unknown;
  notes?: unknown;
  exercises?: unknown;
  status?: unknown;
  source?: unknown;
  statusUpdatedAt?: unknown;
  completedWorkoutId?: unknown;
};

export function isIsoDateTime(s: unknown): s is string {
  return typeof s === "string" && !Number.isNaN(Date.parse(s));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function asNumber(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))) return Number(n);
  return null;
}

export function parseBody(req: VercelRequest): unknown | null {
  const b: unknown = (req as unknown as { body?: unknown }).body;
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

export function parseMaybeJson(v: unknown): unknown  | null {
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

export function isPlanStatus(x: unknown): x is PlanStatus {
  return x === "planned" || x === "done" || x === "canceled" || x === "missed";
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isPlanSource(x: unknown): x is PlanSource {
  return x === "manual" || x === "ai" || x === "routine";
}