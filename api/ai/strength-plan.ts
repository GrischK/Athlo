import type {VercelRequest, VercelResponse} from "@vercel/node";
import {kv} from "@vercel/kv";
import {json} from "../_utils.js";
import {requireAuth} from "../_auth.js";

type Sport = "swim" | "run" | "laser_run" | "strength";

type WorkoutBase = {
  id: string;
  startedAt: string;
  sport: Sport;
  durationMin?: number;
  rpe?: number;
  notes?: string;
};

type StrengthSet = { reps?: number; weightKg?: number; durationSec?: number };
type StrengthExercise = { name: string; sets: StrengthSet[] };
type StrengthDetails = { exercises: StrengthExercise[] };

type Workout =
  | (WorkoutBase & { sport: "run"; details: { distanceKm: number; paceSecPerKm?: number } })
  | (WorkoutBase & { sport: "laser_run"; details: { distanceKm: number; paceSecPerKm?: number } })
  | (WorkoutBase & { sport: "swim"; details: { distanceM: number; poolLengthM?: 25 | 50 } })
  | (WorkoutBase & { sport: "strength"; details: StrengthDetails });

type UserGoal = { text: string; updatedAt: string };

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

function daysAgoIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function uniqLower(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const k = n.trim().toLowerCase();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n.trim());
  }
  return out;
}

function guessFocus(goalText: string): { focus: string[]; avoid: string[] } {
  const t = goalText.toLowerCase();

  const focus: string[] = [];
  const avoid: string[] = [];

  // focus
  if (t.includes("pec") || t.includes("poitrine")) focus.push("push");
  if (t.includes("dos") || t.includes("tirage") || t.includes("pull")) focus.push("pull");
  if (t.includes("jambe") || t.includes("squat") || t.includes("lower")) focus.push("legs");
  if (t.includes("abdo") || t.includes("core") || t.includes("gainage")) focus.push("core");
  if (t.includes("bras") || t.includes("biceps") || t.includes("triceps")) focus.push("arms");

  // avoid
  if (t.includes("pas de pompes") || t.includes("sans pompes")) avoid.push("pompes");
  if (t.includes("pas de squat") || t.includes("sans squat")) avoid.push("squat");

  return {focus: focus.length ? focus : ["push", "core"], avoid};
}

function pickExercisesFromHistory(workouts: Workout[]) {
  const strength = workouts.filter((w) => w.sport === "strength") as Array<WorkoutBase & {
    sport: "strength";
    details: StrengthDetails
  }>;
  const names = strength.flatMap((w) => w.details.exercises.map((e) => e.name));
  return uniqLower(names);
}

function buildMockPlan(goal: UserGoal | null, recentWorkouts: Workout[]) {
  const goalText = goal?.text ?? "Objectif: progresser en strength avec une séance équilibrée.";
  const {focus, avoid} = guessFocus(goalText);

  const historyNames = pickExercisesFromHistory(recentWorkouts).map((s) => s.toLowerCase());
  const recentlyDidPush = historyNames.some((n) => n.includes("pompe") || n.includes("développ") || n.includes("push"));
  const recentlyDidCore = historyNames.some((n) => n.includes("gainage") || n.includes("plank") || n.includes("dead bug") || n.includes("abdo"));

  // banque simple
  const bank = {
    push: ["Pompes", "Développé haltères", "Dips"],
    pull: ["Rowing haltères", "Tirage élastique", "Tractions assistées"],
    legs: ["Squat", "Fentes", "Hip thrust"],
    core: ["Dead bug", "Gainage", "Hollow hold"],
    arms: ["Curl biceps", "Extension triceps", "Curl marteau"],
  };

  const chosen: string[] = [];

  for (const f of focus) {
    const candidates = bank[f as keyof typeof bank] ?? [];
    for (const c of candidates) {
      if (avoid.some((a) => c.toLowerCase().includes(a))) continue;
      chosen.push(c);
      break;
    }
  }

  // compléter si pas assez
  const fallback = ["Pompes", "Dead bug", "Rowing haltères", "Fentes"];
  for (const f of fallback) {
    if (chosen.length >= 4) break;
    if (avoid.some((a) => f.toLowerCase().includes(a))) continue;
    if (!chosen.includes(f)) chosen.push(f);
  }

  // petite variation si déjà fait récemment
  const final = chosen.slice(0, 4).map((name) => {
    const lower = name.toLowerCase();

    if (lower.includes("pompe") && recentlyDidPush) {
      return {name: "Développé haltères", variant: "push" as const};
    }
    if ((lower.includes("dead bug") || lower.includes("gainage")) && recentlyDidCore) {
      return {name: "Gainage", variant: "core" as const};
    }
    if (lower.includes("pompe")) return {name, variant: "push" as const};
    if (lower.includes("développ") || lower.includes("dips")) return {name, variant: "push" as const};
    if (lower.includes("rowing") || lower.includes("tirage") || lower.includes("traction")) return {
      name,
      variant: "pull" as const
    };
    if (lower.includes("squat") || lower.includes("fente") || lower.includes("hip")) return {
      name,
      variant: "legs" as const
    };
    if (lower.includes("curl") || lower.includes("triceps")) return {name, variant: "arms" as const};
    return {name, variant: "core" as const};
  });

  const exercises = final.map((ex) => {
    // groupes par défaut selon type
    if (ex.variant === "core") {
      return {
        name: ex.name,
        groups: [
          {count: 3, durationSec: 45},
        ],
      };
    }
    return {
      name: ex.name,
      groups: [
        {count: 4, reps: 10},
      ],
    };
  });

  const message =
    goal
      ? `Proposition basée sur ton objectif et tes derniers entraînements. Ajuste librement avant de planifier.`
      : `Aucun objectif enregistré. Je te propose une séance strength simple et équilibrée.`;

  return {
    message,
    plan: {
      durationMin: 45,
      notes: goal ? `Objectif: ${goal.text}` : undefined,
      exercises,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authed = await requireAuth(req, res);
  if (!authed) return;

  if (req.method !== "POST") return json(res, 405, {error: "Method not allowed"});

  const body = parseBody(req);
  if (body === null) return json(res, 400, {error: "Invalid JSON"});

  const days = typeof body?.days === "number" ? Math.max(1, Math.min(30, Math.floor(body.days))) : 7;

  const goalKey = `user:${authed.username}:goal`;
  const workoutsKey = `user:${authed.username}:workouts`;

  const goal = await kv.get<UserGoal>(goalKey);

  // On prend un lot récent et on filtre sur date
  const values = await kv.zrange<string[]>(workoutsKey, 0, 80, {rev: true});
  const cutoff = Date.parse(daysAgoIso(days));

  const workouts: Workout[] = values
    .map((v) => {
      try {
        return typeof v === "string" ? (JSON.parse(v) as Workout) : (v as any);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((w) => Date.parse((w as any).startedAt) >= cutoff) as Workout[];

  const suggestion = buildMockPlan(goal, workouts);
  return json(res, 200, suggestion);
}
