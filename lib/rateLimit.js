// Basic rate limiting for /api/roast — a sliding-window counter keyed by
// the signed-in user (if any) or the caller's IP, to curb API abuse.
//
// This is the "middleware counter tied to user session or IP" option.
// For multi-instance/production use, swap this for @upstash/ratelimit backed
// by Redis (the in-memory Map below is per-serverless-instance).

const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 8; // per key per window

const store = new Map(); // key -> number[] (hit timestamps)

export function rateLimit(key, { windowMs = WINDOW_MS, max = MAX_HITS } = {}) {
  const now = Date.now();
  const recent = (store.get(key) || []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return { ok: false, remaining: 0, retryAfter };
  }

  recent.push(now);
  store.set(key, recent);
  return { ok: true, remaining: max - recent.length, retryAfter: 0 };
}

export function clientKey(req, session) {
  if (session?.user?.id) return `user:${session.user.id}`;
  if (session?.user?.email) return `user:${session.user.email}`;
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "anonymous";
  return `ip:${ip}`;
}
