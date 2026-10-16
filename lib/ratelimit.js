// Per-IP rate limiting keyed by site + action.
// Uses Upstash (shared across instances) when its env vars are set,
// otherwise an in-memory fixed window (per instance, best effort).

import { errorInfo, log } from "./log.js";

const DEFAULT_LIMIT = "30/min";
const UNIT_MS = { s: 1e3, sec: 1e3, m: 6e4, min: 6e4, h: 36e5, hr: 36e5, hour: 36e5, d: 864e5, day: 864e5 };

export function parseLimit(spec = DEFAULT_LIMIT) {
  const m = /^\s*(\d+)\s*\/\s*(\d*)\s*([a-z]+)\s*$/i.exec(spec);
  const unit = m && UNIT_MS[m[3].toLowerCase()];
  if (!m || !unit) throw new Error(`Bad rate limit spec: ${spec}`);
  return { max: Number(m[1]), windowMs: (Number(m[2]) || 1) * unit };
}

let upstashPromise = null;
function getUpstash() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  upstashPromise ??= Promise.all([import("@upstash/ratelimit"), import("@upstash/redis")]).then(
    ([{ Ratelimit }, { Redis }]) => ({ Ratelimit, redis: Redis.fromEnv() })
  );
  return upstashPromise;
}

const upstashLimiters = new Map();
async function upstashLimit(bucket, id, { max, windowMs }) {
  const { Ratelimit, redis } = await getUpstash();
  const cacheKey = `${bucket}|${max}|${windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
      prefix: `facilitator:${bucket}`,
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  const started = Date.now();
  const r = await limiter.limit(id);
  log("debug", "upstash", "response", { ms: Date.now() - started, bucket, success: r.success, remaining: r.remaining });
  return { success: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
}

const windows = new Map();
function memoryLimit(bucket, id, { max, windowMs }) {
  const now = Date.now();
  if (windows.size > 10_000) {
    for (const [k, w] of windows) if (w.reset <= now) windows.delete(k);
  }
  const key = `${bucket}|${id}`;
  let w = windows.get(key);
  if (!w || w.reset <= now) {
    w = { count: 0, reset: now + windowMs };
    windows.set(key, w);
  }
  w.count += 1;
  return { success: w.count <= max, limit: max, remaining: Math.max(0, max - w.count), reset: w.reset };
}

// bucket: "site:action", id: client IP, spec: e.g. "5/min"
export async function rateLimit({ bucket, id, spec }) {
  const limit = parseLimit(spec);
  if (getUpstash()) {
    try {
      return await upstashLimit(bucket, id, limit);
    } catch (err) {
      log("error", "upstash", "error", { bucket, fallback: "in-memory", ...errorInfo(err) });
    }
  }
  return memoryLimit(bucket, id, limit);
}
