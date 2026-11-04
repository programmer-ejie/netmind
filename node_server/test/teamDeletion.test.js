const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const { TEAM_DELETE_STEPS, deleteTeamById } = require("../utils/teamDeletion");

function database({ missing = false, failTable } = {}) {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT")) return [missing ? [] : [{ id: 42 }]];
      if (sql.startsWith(`DELETE FROM ${failTable} `)) throw new Error("cleanup failed");
      return [{ affectedRows: 1 }];
    },
  };
  return { calls, pool: { getConnection: async () => connection } };
}

test("team cleanup covers schema dependencies in child-before-parent order", () => {
  const schema = fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8");
  const order = [...TEAM_DELETE_STEPS.map(([table]) => table), "teams"];
  for (const match of schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const [, child, definition] = match;
    for (const reference of definition.matchAll(/REFERENCES (\w+)\(id\)/g)) {
      const parentIndex = order.indexOf(reference[1]);
      if (parentIndex < 0) continue;
      assert.ok(order.indexOf(child) >= 0, `${child} must be cleaned up`);
      assert.ok(order.indexOf(child) < parentIndex, `${child} must precede ${reference[1]}`);
    }
  }
});

test("team deletion scopes cleanup to the team and keeps user accounts", async () => {
  const { pool, calls } = database();
  assert.equal((await deleteTeamById(pool, 42)).affectedRows, 1);
  const deletions = calls.filter((call) => call.sql?.startsWith("DELETE"));
  assert.deepEqual(deletions.map((call) => call.sql.match(/^DELETE FROM (\w+)/)[1]), [
    ...TEAM_DELETE_STEPS.map(([table]) => table), "teams",
  ]);
  for (const call of deletions) {
    assert.match(call.sql, /WHERE/);
    assert.equal((call.sql.match(/\?/g) || []).length, call.params.length);
    assert.ok(call.params.every((id) => id === 42));
  }
  assert.deepEqual(calls.slice(-2), ["commit", "release"]);
});

test("missing team rolls back without cleanup", async () => {
  const { pool, calls } = database({ missing: true });
  assert.equal((await deleteTeamById(pool, 42)).affectedRows, 0);
  assert.deepEqual(calls.slice(2), ["rollback", "release"]);
});

test("failed team cleanup rolls back all changes and releases the connection", async () => {
  const { pool, calls } = database({ failTable: "training_schedules" });
  await assert.rejects(deleteTeamById(pool, 42), /cleanup failed/);
  assert.deepEqual(calls.slice(-2), ["rollback", "release"]);
  assert.equal(calls.includes("commit"), false);
  assert.equal(calls.some((call) => call.sql === "DELETE FROM teams WHERE id = ?"), false);
});
