export function getErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return fallback;
}

export function isTimeLocal(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s);
}
