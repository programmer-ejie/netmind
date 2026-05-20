const ApiError = require("../utils/apiError");

function getClientIp(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();

  return forwardedFor || req.ip || req.socket?.remoteAddress || "unknown";
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeRateKeyPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function createRateLimiter({
  name,
  windowMs,
  max,
  keyGenerator = getClientIp,
  message = "Too many requests. Try again later.",
}) {
  const hits = new Map();

  const limiter = (req, res, next) => {
    const now = Date.now();
    const key = `${name}:${keyGenerator(req) || getClientIp(req)}`;
    const current = hits.get(key);
    const record = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs };

    record.count += 1;
    hits.set(key, record);

    const remaining = Math.max(0, max - record.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(record.resetAt / 1000)));

    if (record.count > max) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return next(new ApiError(429, message));
    }

    return next();
  };

  limiter.reset = (req) => {
    hits.delete(`${name}:${keyGenerator(req) || getClientIp(req)}`);
  };
  limiter.clear = () => hits.clear();
  limiter.size = () => hits.size;

  return limiter;
}

module.exports = {
  createRateLimiter,
  envNumber,
  getClientIp,
  normalizeRateKeyPart,
};
