export type RoutineSport = "laser_run" | "swim";

export type RoutineRule = {
  id: string;
  sport: RoutineSport;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 0 dimanche
  timeLocal: string; // "19:30"
  durationMin?: number;
  rpe?: number; // 1-10 optionnel
  notes?: string;
  isEnabled: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type RoutinesMaterializeResult = {
  ok: true;
  weekMonday: string;
  createdCount: number
};

export type RoutineRuleUpsert = Omit<RoutineRule, "createdAt" | "updatedAt">;
