// The only site-facing function: /api/{site}/{action}.
// Looks up the site, runs shared guards, then dispatches to the site's action.
import { applyCors } from "../../lib/cors.js";
import { HttpError, clientIp, readJsonBody, sendJson } from "../../lib/http.js";
import { errorInfo, log, logPayloads, requestId, withRequestContext } from "../../lib/log.js";
import { rateLimit } from "../../lib/ratelimit.js";
import { getSite } from "../../lib/sites.js";

export default function handler(req, res) {
  const site = String(req.query?.site ?? "");
  const action = String(req.query?.action ?? "");
  return withRequestContext({ site, action }, () => route(req, res, site, action));
}

async function route(req, res, siteKey, actionName) {
  const started = Date.now();
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Request-Id", requestId());

  log("info", "http", "incoming", {
    method: req.method,
    path: `/api/${siteKey}/${actionName}`,
    origin: req.headers.origin,
    ip: clientIp(req),
    user_agent: req.headers["user-agent"],
    ...payloadField("body", requestBodyForLog(req)),
  });

  const finish = (status, body, extra = {}) => {
    log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "http", "outgoing", {
      method: req.method,
      status,
      ms: Date.now() - started,
      origin: req.headers.origin,
      ...extra,
      ...payloadField("body", body),
    });
    if (body === undefined) {
      res.statusCode = status;
      return res.end();
    }
    return sendJson(res, status, body);
  };

  try {
    const site = getSite(siteKey);
    if (!site || !site.actions.includes(actionName)) throw new HttpError(404, "Not found");

    const actions = (await site.load()).default;
    const action = Object.hasOwn(actions, actionName) ? actions[actionName] : null;
    if (!action) throw new HttpError(404, "Not found");

    if (!applyCors(req, res, site, action.method)) throw new HttpError(403, "Origin not allowed");

    if (req.method === "OPTIONS") return finish(204);
    if (req.method !== action.method) {
      res.setHeader("Allow", `${action.method}, OPTIONS`);
      throw new HttpError(405, "Method not allowed");
    }

    const rl = await rateLimit({
      bucket: `${siteKey}:${actionName}`,
      id: clientIp(req),
      spec: site.limits?.[actionName],
    });
    res.setHeader("X-RateLimit-Limit", String(rl.limit));
    res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
    if (!rl.success) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))));
      throw new HttpError(429, "Too many requests, please try again shortly");
    }

    const body = req.method === "GET" ? {} : readJsonBody(req);
    const result = await action.handler({ body, query: req.query, site, siteKey });

    for (const [name, value] of Object.entries(result.headers ?? {})) res.setHeader(name, value);
    return finish(result.status ?? 200, result.body);
  } catch (err) {
    if (err instanceof HttpError) {
      return finish(err.status, { error: err.message, ...err.extra }, { error: err.message, ...err.extra });
    }
    return finish(500, { error: "Internal error" }, { unhandled: errorInfo(err) });
  }
}

// Bodies carry customer data, so they're logged in full only when LOG_PAYLOADS allows,
// otherwise just their size. Serialized so log.js truncates large ones (e.g. the rate card).
function payloadField(name, value) {
  if (value === undefined) return {};
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return logPayloads() ? { [name]: json } : { [`${name}_chars`]: json.length };
}

function requestBodyForLog(req) {
  if (req.method === "GET" || req.method === "OPTIONS") return undefined;
  try {
    return readJsonBody(req);
  } catch {
    return "(invalid JSON)";
  }
}
