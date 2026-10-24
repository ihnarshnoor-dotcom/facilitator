// Structured logging for every request and every third-party call (Groq, Web3Forms, Upstash).
//
// - Each line carries the request id, site and action of the request it belongs to,
//   so one website call can be followed across all its third-party calls.
// - Secrets are redacted by key name and by value pattern, as a safety net.
//   Callers should still never pass keys in.
// - LOG_PAYLOADS=false drops prompt / AI reply / email bodies (they contain customer data).
// - Off by default: the request handler prints one line per request on its own.
//   Set LOG_LEVEL=debug|info|warn|error to turn these detailed logs back on.
// - Pretty-printed locally, one JSON line per entry on Vercel (searchable in the dashboard).
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? Infinity;
const PRETTY = !process.env.VERCEL;
const MAX_STRING = 4000;

export const logPayloads = () => process.env.LOG_PAYLOADS !== "false";

const context = new AsyncLocalStorage();

export function withRequestContext(fields, fn) {
  return context.run({ reqId: randomUUID().slice(0, 8), ...fields }, fn);
}
export const requestId = () => context.getStore()?.reqId;

const SECRET_KEY_NAME = /(^|_)(key|secret|password|authorization|api_?key)$|^token$/i;
const SECRET_VALUE = /\bgsk_[A-Za-z0-9]{8,}|\bBearer\s+\S+/g;

function redact(value, depth = 0) {
  if (typeof value === "string") {
    const clean = value.replace(SECRET_VALUE, "[redacted]");
    return clean.length > MAX_STRING ? `${clean.slice(0, MAX_STRING)}… (${clean.length} chars)` : clean;
  }
  if (value === null || typeof value !== "object" || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, SECRET_KEY_NAME.test(k) ? "[redacted]" : redact(v, depth + 1)])
  );
}

// Local terminal: a readable header line, then one field per line; multi-line text printed as-is.
function pretty({ time, level, service, event, reqId, site, action, ...fields }) {
  const where = site ? ` ${site}/${action}` : "";
  const lines = [`${time.slice(11, 23)} ${level.toUpperCase().padEnd(5)} ${service} ${event}${reqId ? `  [${reqId}${where}]` : ""}`];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.includes("\n")) {
      lines.push(`  ${k}:`, ...v.split("\n").map((l) => `    ${l}`));
    } else {
      lines.push(`  ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    }
  }
  return lines.join("\n");
}

export function log(level, service, event, data = {}) {
  if ((LEVELS[level] ?? LEVELS.info) < threshold) return;
  const entry = redact({ time: new Date().toISOString(), level, service, event, ...context.getStore(), ...data });
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  out(PRETTY ? pretty(entry) : JSON.stringify(entry));
}

// Only the useful, non-secret parts of an error from fetch / an SDK.
export function errorInfo(err) {
  return {
    error: err?.message,
    name: err?.name,
    status: err?.status,
    code: err?.code ?? err?.error?.error?.code,
  };
}
