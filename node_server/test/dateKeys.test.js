const assert = require("node:assert/strict");
const test = require("node:test");
const { toLocalDateKey } = require("../utils/dateKeys");

test("date keys preserve ISO date strings without timezone shifts", () => {
  assert.equal(toLocalDateKey("2026-05-19T23:30:00.000Z"), "2026-05-19");
});

test("date keys format Date values in the requested timezone", () => {
  const value = new Date("2026-05-19T16:30:00.000Z");

  assert.equal(toLocalDateKey(value, "Asia/Manila"), "2026-05-20");
  assert.equal(toLocalDateKey(value, "UTC"), "2026-05-19");
});

test("date keys return stable fallback values for empty and invalid input", () => {
  assert.equal(toLocalDateKey(null), "");
  assert.equal(toLocalDateKey(""), "");
  assert.equal(toLocalDateKey("not-a-date"), "not-a-date");
});
