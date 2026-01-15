import {kv} from "@vercel/kv";
import {getCookie, json} from "./_utils.js";

/**
 * @param {import("@vercel/node").VercelRequest} req
 * @param {import("@vercel/node").VercelResponse} res
 * @returns {Promise<{username: string} | null>}
 */
export async function requireAuth(req,
                                  res) {
  const token = getCookie(req, "session");
  if (!token) {
    json(res, 401, {error: "Unauthorized"});
    return null;
  }

  const session = await kv.get(`session:${token}`);
  if (!session?.username) {
    json(res, 401, {error: "Unauthorized"});
    return null;
  }

  return {username: session.username};
}
