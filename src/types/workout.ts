export type Sport = "swim" | "run" | "laser_run" | "strength";

export type WorkoutBase = {
  id: string;
  startedAt: string; // ISO datetime
  sport: Sport;
  durationMin: number;
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
  | (WorkoutBase & { sport: "run"; details: RunDetails })
  | (WorkoutBase & { sport: "laser_run"; details: RunDetails })
  | (WorkoutBase & { sport: "swim"; details: SwimDetails })
  | (WorkoutBase & { sport: "strength"; details: StrengthDetails });
