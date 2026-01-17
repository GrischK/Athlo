import type {StrengthPlan, Workout} from "../types/workout.ts";
import type {UserGoal} from "@/types/goal.ts";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let msg = "Request failed";
    try {
      const data = await res.json();
      if (typeof data?.error === "string") msg = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ ok: true; username: string }>("/api/login", {
      method: "POST",
      body: JSON.stringify({username, password}),
    }),

  logout: () =>
    request<{ ok: true }>("/api/logout", {
      method: "POST",
    }),

  me: () =>
    request<{ authenticated: boolean; username?: string }>("/api/me", {
      method: "GET",
    }),

  workoutsList: async (limit = 30): Promise<Workout[]> => {
    const r = await request<{ workouts: Workout[] }>(`/api/workouts?limit=${limit}`, {method: "GET"});
    return r.workouts;
  },

  workoutsCreate: (workout: Workout) =>
    request<{ ok: true; workout: Workout }>(`/api/workouts`, {
      method: "POST",
      body: JSON.stringify(workout),
    }),

  plansList: async (limit = 30): Promise<StrengthPlan[]> => {
    const r = await request<{ plans: StrengthPlan[] }>(`/api/plans?limit=${limit}`, {method: "GET"});
    return r.plans;
  },

  plansCreate: async (plan: StrengthPlan): Promise<StrengthPlan> => {
    const r = await request<{ plan: StrengthPlan }>(`/api/plans`, {
      method: "POST",
      body: JSON.stringify(plan),
    });
    return r.plan;
  },

  plansAction: async (id: string, action: "complete" | "cancel" | "delete"): Promise<{ workout?: Workout }> => {
    return await request<{ ok: true; workout?: Workout }>(`/api/plans_action`, {
      method: "POST",
      body: JSON.stringify({id, action}),
    });
  },

  plansUpdate: async (plan: StrengthPlan): Promise<StrengthPlan> => {
    const r = await request<{ plan: StrengthPlan }>(`/api/plans`, {
      method: "PUT",
      body: JSON.stringify(plan),
    });
    return r.plan;
  },

  goalGet: async (): Promise<UserGoal | null> => {
    const r = await request<{ goal: UserGoal | null }>(`/api/goal`, {method: "GET"});
    return r.goal;
  },

  goalUpdate: async (text: string): Promise<UserGoal> => {
    const r = await request<{ goal: UserGoal }>(`/api/goal`, {
      method: "PUT",
      body: JSON.stringify({text}),
    });
    return r.goal;
  },
};
