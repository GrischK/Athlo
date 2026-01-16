import type {SetGroup} from "@/utils/workoutForm.ts";

export type Sport = "swim" | "run" | "laser_run" | "strength";
export type WorkoutStatus = "planned" | "done" | "canceled";

export type ExerciseDraft = {
  id: string;
  name: string;
  groups: SetGroup[];
};

export type StrengthPlan = {
  id: string;
  plannedFor: string; // ISO datetime
  durationMin?: number;
  notes?: string;
  exercises: StrengthExercise[];
};

export type WorkoutBase = {
  id: string;
  startedAt: string; // ISO datetime
  sport: Sport;
  durationMin?: number;
  rpe?: number; // 1-10
  notes?: string;
};

export type RunDetails = {
  distanceKm: number;
  paceSecPerKm?: number; // ex: 330 pour 5:30/km
};

export type SwimDetails = {
  distanceM: number;
  poolLengthM?: 25 | 50;
};

export type StrengthSet = {
  reps?: number;
  weightKg?: number;
  durationSec?: number;
};

export type StrengthExercise = {
  name: string;
  sets: StrengthSet[];
};

export type StrengthDetails = {
  exercises: StrengthExercise[];
};

export type Workout =
  | (WorkoutBase & { sport: "run"; durationMin: number; details: RunDetails })
  | (WorkoutBase & { sport: "laser_run"; durationMin: number; details: RunDetails })
  | (WorkoutBase & { sport: "swim"; durationMin: number; details: SwimDetails })
  | (WorkoutBase & { sport: "strength"; details: StrengthDetails });