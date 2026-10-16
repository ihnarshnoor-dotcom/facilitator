// Small HTTP helpers shared by every function.

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

// Vercel parses JSON bodies lazily and throws on malformed JSON.
export function readJsonBody(req) {
  let body;
  try {
    body = req.body;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  if (body == null || body === "") return {};
  if (typeof body === "string" || Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString());
    } catch {
      throw new HttpError(400, "Invalid JSON body");
    }
  }
  return body;
}

export function clientIp(req) {
  const real = req.headers["x-real-ip"];
  if (real) return String(real).trim();
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}
