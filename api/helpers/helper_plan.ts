import { VercelRequest } from "@vercel/node";
import { PlanStatus } from "../../src/types/workout";

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

export function parseBody(req: VercelRequest): any | null {
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

export function parseMaybeJson(v: unknown): any | null {
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
