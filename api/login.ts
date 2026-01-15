import type {VercelRequest, VercelResponse} from "@vercel/node";
import bcrypt from "bcryptjs";
import {kv} from "@vercel/kv";
import {json, newToken, setSessionCookie} from "./_utils.js";

type Body = { username?: string; password?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return json(res, 405, {error: "Method not allowed"});

  const {APP_USERNAME, APP_PASSWORD_HASH} = process.env;
  console.log("APP_USERNAME:", APP_USERNAME);
  console.log("HASH_PREFIX:", APP_PASSWORD_HASH?.slice(0, 7), "LEN:", APP_PASSWORD_HASH?.length);
  console.log("VERCEL_ENV:", process.env.VERCEL_ENV);
  console.log("VERCEL_URL:", process.env.VERCEL_URL);
  console.log("PROJECT_ID:", process.env.VERCEL_PROJECT_ID);
  console.log("ORG_ID:", process.env.VERCEL_ORG_ID);
  console.log("RUNTIME:", process.env.NOW_REGION, process.env.VERCEL_REGION);

  if (!APP_USERNAME || !APP_PASSWORD_HASH) {
    return json(res, 500, {error: "Server not configured"});
  }

  let body: Body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
  } catch {
    return json(res, 400, {error: "Invalid JSON"});
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return json(res, 400, {error: "Missing credentials"});
  }

  if (username !== APP_USERNAME) {
    return json(res, 401, {error: "Invalid credentials"});
  }

  const ok = await bcrypt.compare(password, APP_PASSWORD_HASH);
  if (!ok) return json(res, 401, {error: "Invalid credentials"});

  const token = newToken();
  const key = `session:${token}`;

  await kv.set(key, {username}, {ex: 60 * 60 * 24 * 7});

  setSessionCookie(res, token);
  return json(res, 200, {ok: true, username});
}
