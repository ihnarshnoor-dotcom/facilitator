import { sendJson } from "../lib/http.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  sendJson(res, 200, { ok: true });
}
