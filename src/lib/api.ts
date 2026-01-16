import type {Workout, WorkoutRecord} from "../types/workout.ts";

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

  workoutsList: async (limit = 30): Promise<WorkoutRecord[]> => {
    const r = await request<{ records: WorkoutRecord[] }>(`/api/workouts?limit=${limit}`, { method: "GET" });
    return r.records;
  },

  workoutsCreate: (workout: Workout) =>
    request<{ ok: true; workout: Workout }>(`/api/workouts`, {
      method: "POST",
      body: JSON.stringify(workout),
    }),
};
