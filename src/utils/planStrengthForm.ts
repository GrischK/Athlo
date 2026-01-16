import {nowLocalInputValue, type SetGroup} from "@/utils/workoutForm.ts";
import type {StrengthPlan, StrengthSet} from "@/types/workout.ts";

export function compressSetsToGroups(sets: Array<{
  reps?: number;
  weightKg?: number;
  durationSec?: number
}>): SetGroup[] {
  const map = new Map<string, { count: number; reps: number | ""; weightKg: number | ""; durationSec: number | "" }>();

  const keyOf = (s: any) =>
    `r:${s?.reps ?? ""}|w:${s?.weightKg ?? ""}|d:${s?.durationSec ?? ""}`;

  for (const s of sets ?? []) {
    const k = keyOf(s);
    const prev = map.get(k);
    const reps = s?.reps ?? "";
    const weightKg = s?.weightKg ?? "";
    const durationSec = s?.durationSec ?? "";

    if (prev) {
      prev.count += 1;
    } else {
      map.set(k, {count: 1, reps, weightKg, durationSec});
    }
  }

  const groups: SetGroup[] = Array.from(map.values()).map((g) => ({
    count: g.count,
    reps: g.reps,
    weightKg: g.weightKg,
    durationSec: g.durationSec,
  }));

  return groups.length ? groups : [{count: "", reps: "", weightKg: "", durationSec: ""}];
}

export function isoToLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nowLocalInputValue();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function sortPlans(plans: StrengthPlan[]): StrengthPlan[] {
  const now = Date.now();

  return [...plans].sort((a, b) => {
    const ta = Date.parse(a.plannedFor);
    const tb = Date.parse(b.plannedFor);

    // dates invalides à la fin
    if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
    if (!Number.isFinite(ta)) return 1;
    if (!Number.isFinite(tb)) return -1;

    const aFuture = ta >= now;
    const bFuture = tb >= now;

    // futurs d'abord
    if (aFuture !== bFuture) return aFuture ? -1 : 1;

    // deux futurs: le plus proche d'abord
    if (aFuture) return ta - tb;

    // deux passés: le plus récent d'abord
    return tb - ta;
  });
}

export function formatSetSummary(sets: StrengthSet[]): string[] {
  const groups = compressSetsToGroups(sets);

  return groups.map((g) => {
    const count = g.count === "" ? 0 : Number(g.count);
    const reps = g.reps === "" ? null : Number(g.reps);
    const kg = g.weightKg === "" ? null : Number(g.weightKg);
    const sec = g.durationSec === "" ? null : Number(g.durationSec);

    const parts: string[] = [];

    if (count > 0 && reps && reps > 0) {
      parts.push(`${count}×${reps} reps`);
    } else if (count > 0 && sec && sec > 0) {
      parts.push(`${count}×${sec}s`);
    } else {
      if (reps && reps > 0) parts.push(`${reps} reps`);
      else if (sec && sec > 0) parts.push(`${sec}s`);
    }

    if (kg !== null && kg > 0) parts.push(`${kg} kg`);

    return parts.join(" / ");
  });
}

