const assert = require("node:assert/strict");
const test = require("node:test");
const tables = require("../utils/tableConfig");
const { MATCH_CHILD_TABLES, deleteMatchById } = require("../utils/matchDeletion");

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
      if (sql === `DELETE FROM ${failTable} WHERE match_id = ?`) throw new Error("cleanup failed");
      return [{ affectedRows: 1 }];
    },
  };
  return { calls, pool: { getConnection: async () => connection } };
}

test("match cleanup covers every configured table referencing a match", () => {
  const children = Object.values(tables).filter((table) => table.fields?.includes("match_id"));
  assert.deepEqual(children.map((table) => table.table).sort(), [...MATCH_CHILD_TABLES].sort());
});

test("match deletion locks the match, removes only its children, and commits before releasing", async () => {
  const { pool, calls } = database();
  assert.equal((await deleteMatchById(pool, 42)).affectedRows, 1);
  assert.deepEqual(calls, [
    "begin",
    { sql: "SELECT id FROM matches WHERE id = ? FOR UPDATE", params: [42] },
    ...MATCH_CHILD_TABLES.map((table) => ({ sql: `DELETE FROM ${table} WHERE match_id = ?`, params: [42] })),
    { sql: "DELETE FROM matches WHERE id = ?", params: [42] },
    "commit", "release",
  ]);
});

test("a missing match does not delete any connected records", async () => {
  const { pool, calls } = database({ missing: true });
  assert.equal((await deleteMatchById(pool, 42)).affectedRows, 0);
  assert.deepEqual(calls.slice(2), ["rollback", "release"]);
});

test("failed cleanup rolls back without deleting the match or committing", async () => {
  const { pool, calls } = database({ failTable: "attendance_logs" });
  await assert.rejects(deleteMatchById(pool, 42), /cleanup failed/);
  assert.deepEqual(calls.slice(-2), ["rollback", "release"]);
  assert.equal(calls.includes("commit"), false);
  assert.equal(calls.some((call) => call.sql === "DELETE FROM matches WHERE id = ?"), false);
});
