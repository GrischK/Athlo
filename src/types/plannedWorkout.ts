import type { PlanStatus } from "@/types/workout.ts";

export type PlanSource = "routine" | "manual" | "ai";

export type PlannedWorkout = {
  id: string;
  plannedFor: string; // ISO datetime
  sport: "laser_run" | "swim" | "run" | "strength";

  durationMin?: number;
  rpe?: number;
  notes?: string;

  status: PlanStatus;
  statusUpdatedAt: string;

  source: PlanSource; // ici surtout "routine"
  routineId?: string; // lien vers la règle
  completedWorkoutId?: string; // lien vers Workout quand done
};
