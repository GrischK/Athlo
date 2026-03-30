import crypto from "node:crypto";

/**
 * @param {import("@vercel/node").VercelResponse} res
 * @param {number} status
 * @param {unknown} body
 */
export function json(res,
                     status,
                     body) {
  res.status(status)
    .setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

/**
 * @param {import("@vercel/node").VercelRequest} req
 * @param {string} name
 * @returns {string|null}
 */
export function getCookie(req,
                          name) {
  const header = req.headers.cookie;
  if (!header) return null;

  const parts = header.split(";")
    .map((p) => p.trim());
  for (const part of
    parts) {
    const eq = part.indexOf("=");
    if (eq ===
      -1) continue;
    const k = part.slice(0, eq);
    const v = part.slice(eq +
      1);
    if (k ===
      name) return decodeURIComponent(v);
  }
  return null;
}

/**
 * @param {import("@vercel/node").VercelResponse} res
 * @param {string} token
 */
export function setSessionCookie(res,
                                 token) {
  const isProd = process.env.VERCEL ===
    "1";
  const cookie =
    `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 *
    60 *
    24 *
    7}` +
    (isProd ?
      "; Secure" :
      "");
  res.setHeader("Set-Cookie", cookie);
}

/**
 * @param {import("@vercel/node").VercelResponse} res
 */
export function clearSessionCookie(res) {
  const isProd = process.env.VERCEL ===
    "1";
  const cookie = `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` +
    (isProd ?
      "; Secure" :
      "");
  res.setHeader("Set-Cookie", cookie);
}

/**
 * @returns {string}
 */
export function newToken() {
  return crypto.randomBytes(32)
    .toString("base64url");
}
