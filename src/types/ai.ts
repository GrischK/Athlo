export type AiStrengthPlanSuggestion = {
  message: string;
  plan: {
    durationMin?: number;
    notes?: string;
    exercises: Array<{
      name: string;
      groups: Array<{
        count: number;
        reps?: number;
        weightKg?: number;
        durationSec?: number;
      }>;
    }>;
  };
};
