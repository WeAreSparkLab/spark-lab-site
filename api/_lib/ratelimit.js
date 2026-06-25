// =============================================================================
// Shared usage protection for the AI agent functions (Upstash Redis)
// =============================================================================
//
// One Redis instance serves everything; keys are namespaced per agent and (for
// the content tool) per client + month. The limiter objects are created at
// MODULE LOAD (top level), so they're reused while a serverless instance stays
// warm — callers should likewise create their limiter once at the top of their
// function module, not inside the handler.
//
// Env vars (injected by Vercel's Upstash integration — one click, free tier):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// FAIL SAFE: if Redis isn't configured or a call throws, we log and fall back to
// a small in-memory allowance (per warm instance) so a client's live site keeps
// working rather than hard-breaking. Limiting just becomes best-effort until
// Redis is reachable again.
// =============================================================================

const { Redis } = require("@upstash/redis");
const { Ratelimit } = require("@upstash/ratelimit");

const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
const redis = hasRedis ? Redis.fromEnv() : null;

// --- In-memory fallback (per warm instance) ----------------------------------
const memHits = new Map();
function memAllow(key, max, windowMs) {
  const now = Date.now();
  const recent = (memHits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  memHits.set(key, recent);
  if (memHits.size > 5000) {
    for (const [k, v] of memHits) {
      if (v.every((t) => now - t >= windowMs)) memHits.delete(k);
    }
  }
  return recent.length <= max;
}

// --- Real client IP ----------------------------------------------------------
// Use Vercel's trusted x-real-ip, NOT the spoofable x-forwarded-for.
function realIp(req) {
  const xr = req.headers["x-real-ip"];
  if (typeof xr === "string" && xr.trim()) return xr.trim();
  // No x-real-ip (e.g. local dev) — fall back to the socket. Deliberately do
  // not trust x-forwarded-for for limiting.
  return req.socket?.remoteAddress || "unknown";
}

// --- Per-IP limiter (call once at module top level) --------------------------
// makeIpLimiter({ prefix, perMinute, perDay }) → { check(ip) => {ok, ...} }
function makeIpLimiter({ prefix, perMinute = 8, perDay = 40 }) {
  const minute = redis
    ? new Ratelimit({ redis, prefix: `${prefix}:min`, limiter: Ratelimit.slidingWindow(perMinute, "60 s"), analytics: false })
    : null;
  const day = redis
    ? new Ratelimit({ redis, prefix: `${prefix}:day`, limiter: Ratelimit.slidingWindow(perDay, "1 d"), analytics: false })
    : null;

  async function check(ip) {
    if (!redis) {
      const ok =
        memAllow(`${prefix}:min:${ip}`, perMinute, 60 * 1000) &&
        memAllow(`${prefix}:day:${ip}`, perDay, 24 * 60 * 60 * 1000);
      return { ok, store: "memory" };
    }
    try {
      const m = await minute.limit(`ip:${ip}`);
      if (!m.success) return { ok: false, store: "redis", scope: "minute" };
      const d = await day.limit(`ip:${ip}`);
      if (!d.success) return { ok: false, store: "redis", scope: "day" };
      return { ok: true, store: "redis" };
    } catch (err) {
      console.error("[ratelimit] Redis error — failing open via in-memory:", err?.message || err);
      const ok =
        memAllow(`${prefix}:min:${ip}`, perMinute, 60 * 1000) &&
        memAllow(`${prefix}:day:${ip}`, perDay, 24 * 60 * 60 * 1000);
      return { ok, store: "memory-fallback" };
    }
  }

  return { check };
}

// --- Monthly per-client allowance (content generator) ------------------------
function monthKey(prefix, client) {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM (UTC)
  return `${prefix}:${client}:${month}`;
}

// Read current usage without consuming an allowance.
async function monthlyUsage({ prefix, client, limit }) {
  const key = monthKey(prefix, client);
  if (!redis) {
    return { ok: true, used: null, limit, store: "memory" }; // can't count reliably — allow
  }
  try {
    const used = Number((await redis.get(key)) || 0);
    return { ok: used < limit, used, limit, store: "redis", key };
  } catch (err) {
    console.error("[ratelimit] monthly read error — failing open:", err?.message || err);
    return { ok: true, used: null, limit, store: "memory-fallback" };
  }
}

// Consume one allowance AFTER a successful generation (sets a safety TTL).
async function monthlyConsume({ prefix, client }) {
  if (!redis) return;
  const key = monthKey(prefix, client);
  try {
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, 40 * 24 * 60 * 60); // ~40 days safety net
  } catch (err) {
    console.error("[ratelimit] monthly incr error:", err?.message || err);
  }
}

module.exports = { makeIpLimiter, realIp, monthlyUsage, monthlyConsume, hasRedis };
