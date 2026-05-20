const assert = require("node:assert/strict");
const test = require("node:test");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { errorHandler, notFound } = require("../middleware/errorHandler");
const { authorize } = require("../middleware/auth");
const { isSelf, requireRoles, requireSelf } = require("../middleware/authorization");

function createRes() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test("asyncHandler forwards rejected errors to next", async () => {
  const expected = new Error("boom");
  let received;
  const middleware = asyncHandler(async () => {
    throw expected;
  });

  middleware({}, {}, (error) => {
    received = error;
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(received, expected);
});

test("ApiError stores an HTTP status code", () => {
  const error = new ApiError(409, "Conflict");

  assert.equal(error.statusCode, 409);
  assert.equal(error.message, "Conflict");
});

test("notFound reports method and original URL", () => {
  const res = createRes();

  notFound({ method: "PATCH", originalUrl: "/missing" }, res);

  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.payload, { message: "Route not found: PATCH /missing" });
});

test("errorHandler uses custom status and hides stack outside development", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  const res = createRes();

  errorHandler(new ApiError(422, "Invalid payload"), {}, res, () => {});

  process.env.NODE_ENV = previous;
  assert.equal(res.statusCode, 422);
  assert.deepEqual(res.payload, { message: "Invalid payload" });
});

test("authorize allows matching roles and forbids everyone else", () => {
  const allowedReq = { user: { role: "coach" } };
  const blockedReq = { user: { role: "player" } };
  const blockedRes = createRes();
  let called = false;

  authorize("coach")(allowedReq, createRes(), () => {
    called = true;
  });
  authorize("coach")(blockedReq, blockedRes, () => {});

  assert.equal(called, true);
  assert.equal(blockedRes.statusCode, 403);
  assert.deepEqual(blockedRes.payload, { message: "You do not have permission for this action" });
});

test("authorization helpers enforce roles and self access", () => {
  const roleRes = createRes();
  const selfRes = createRes();
  let roleNextCalled = false;
  let selfNextCalled = false;

  assert.equal(isSelf({ id: 7 }, "7"), true);
  assert.equal(isSelf({ id: 7 }, "8"), false);

  requireRoles("coach")({ user: { role: "coach" } }, createRes(), () => {
    roleNextCalled = true;
  });
  requireRoles("coach")({ user: { role: "player" } }, roleRes, () => {});
  requireSelf("userId")({ user: { id: 3 }, params: { userId: "3" } }, createRes(), () => {
    selfNextCalled = true;
  });
  requireSelf("userId")({ user: { id: 3 }, params: { userId: "4" } }, selfRes, () => {});

  assert.equal(roleNextCalled, true);
  assert.equal(selfNextCalled, true);
  assert.equal(roleRes.statusCode, 403);
  assert.equal(selfRes.statusCode, 403);
});
