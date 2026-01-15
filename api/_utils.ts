import crypto from "node:crypto";
import type {VercelRequest, VercelResponse} from "@vercel/node";

export function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function getCookie(req: VercelRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq);
    const v = part.slice(eq + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const isProd = process.env.VERCEL === "1";
  const cookie =
    `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}` +
    (isProd ? "; Secure" : "");
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res: VercelResponse) {
  const isProd = process.env.VERCEL === "1";
  const cookie =
    `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` +
    (isProd ? "; Secure" : "");
  res.setHeader("Set-Cookie", cookie);
}

export function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
