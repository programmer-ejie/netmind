const assert = require("node:assert/strict");
const test = require("node:test");
const { createRateLimiter } = require("../middleware/rateLimit");

function createMockRes() {
  const headers = new Map();

  return {
    setHeader(name, value) {
      headers.set(name, value);
    },
    getHeader(name) {
      return headers.get(name);
    },
  };
}

function runLimiter(limiter, req) {
  const res = createMockRes();
  let error;

  limiter(req, res, (nextError) => {
    error = nextError;
  });

  return { error, res };
}

test("rate limiter blocks requests after the configured max", () => {
  const limiter = createRateLimiter({
    name: "test-login",
    windowMs: 60_000,
    max: 2,
    keyGenerator: (req) => req.body.email,
  });
  const req = { body: { email: "player@example.com" }, headers: {}, ip: "127.0.0.1" };

  assert.equal(runLimiter(limiter, req).error, undefined);
  assert.equal(runLimiter(limiter, req).error, undefined);

  const blocked = runLimiter(limiter, req);
  assert.equal(blocked.error.statusCode, 429);
  assert.equal(blocked.res.getHeader("Retry-After"), "60");
});

test("rate limiter reset clears a key after successful flow", () => {
  const limiter = createRateLimiter({
    name: "test-password-code",
    windowMs: 60_000,
    max: 1,
    keyGenerator: (req) => req.params.userId,
  });
  const req = { params: { userId: "7" }, headers: {}, ip: "127.0.0.1" };

  assert.equal(runLimiter(limiter, req).error, undefined);
  assert.equal(runLimiter(limiter, req).error.statusCode, 429);

  limiter.reset(req);
  assert.equal(runLimiter(limiter, req).error, undefined);
});
