import { isRecord, nowIso } from "./helper_plan";
import { RoutineRule } from "../../src/types/routine";
import { RoutineRuleInput } from "../routine";

export function isTimeLocal(x: unknown): x is string {
  if (typeof x !== "string") return false;
  return /^\d{2}:\d{2}$/.test(x);
}

export function isWeekday1to7(x: unknown): x is RoutineRule["weekday"] {
  return x === 1 || x === 2 || x === 3 || x === 4 || x === 5 || x === 6 || x === 7;
}

export function validateRoutine(input: RoutineRuleInput, existing?: RoutineRule): { ok: true; routine: RoutineRule; ts: number } | { ok: false; error: string } {
  const idRaw = input.id;

  let id: string;
  if (existing) {
    id = existing.id;
  } else {
    if (typeof idRaw !== "string" || idRaw.length < 8) return {ok: false, error: "Invalid id"};
    id = idRaw;
  }

  const sportRaw = input.sport;
  const sport = sportRaw === "laser_run" || sportRaw === "swim" ? sportRaw : null;
  if (!sport) return {ok: false, error: "Invalid sport"};

  const weekdayRaw = input.weekday;
  if (!isWeekday1to7(weekdayRaw)) return {ok: false, error: "Invalid weekday"};
  const weekday = weekdayRaw;

  const timeLocalRaw = input.timeLocal;
  if (!isTimeLocal(timeLocalRaw)) return {ok: false, error: "Invalid timeLocal"};

  const durationMinRaw = input.durationMin;
  let durationMin: number | undefined;
  if (durationMinRaw !== undefined) {
    const n =
      typeof durationMinRaw === "number"
        ? durationMinRaw
        : (typeof durationMinRaw === "string" && durationMinRaw.trim() !== "" ? Number(durationMinRaw) : NaN);

    if (!Number.isFinite(n) || n <= 0) return {ok: false, error: "Invalid durationMin"};
    durationMin = n;
  }

  const notesRaw = input.notes;
  let notes: string | undefined;
  if (notesRaw !== undefined) {
    if (typeof notesRaw !== "string") return {ok: false, error: "Invalid notes"};
    const t = notesRaw.trim();
    notes = t ? t : undefined;
  }

  const isEnabledRaw = input.isEnabled;
  let isEnabled: boolean;
  if (isEnabledRaw === undefined) {
    isEnabled = existing?.isEnabled ?? true;
  } else if (typeof isEnabledRaw === "boolean") {
    isEnabled = isEnabledRaw;
  } else {
    return {ok: false, error: "Invalid isEnabled"};
  }

  const createdAt = existing?.createdAt ?? nowIso();
  const updatedAt = nowIso();

  const routine: RoutineRule = {
    id,
    sport,
    weekday,
    timeLocal: timeLocalRaw,
    ...(durationMin !== undefined ? {durationMin} : {}),
    ...(notes ? {notes} : {}),
    isEnabled,
    createdAt,
    updatedAt,
  };

  return {ok: true, routine, ts: Date.parse(updatedAt)};
}

export function isRoutineRule(x: unknown): x is RoutineRule {
  if (!isRecord(x)) return false;
  return (
    typeof x.id === "string" &&
    (x.sport === "laser_run" || x.sport === "swim") &&
    isWeekday1to7(x.weekday) &&
    typeof x.timeLocal === "string" &&
    typeof x.isEnabled === "boolean" &&
    typeof x.createdAt === "string" &&
    typeof x.updatedAt === "string"
  );
}

export function isStrengthPlanLike(x: unknown): x is { id: unknown } {
  return isRecord(x) && "id" in x;
}
