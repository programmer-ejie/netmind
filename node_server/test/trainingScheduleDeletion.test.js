const assert = require("node:assert/strict");
const test = require("node:test");
const { deleteTrainingScheduleById } = require("../utils/trainingScheduleDeletion");

function database({ missing = false, fail = false } = {}) {
  const calls = [];
  const connection = {
    beginTransaction: async () => calls.push("begin"),
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith("SELECT")) return [missing ? [] : [{ id: 42 }]];
      if (fail && sql.startsWith("DELETE FROM training_schedules ")) throw new Error("delete failed");
      return [{ affectedRows: 1 }];
    },
  };
  return { calls, pool: { getConnection: async () => connection } };
}

test("deletes the schedule's QR tokens before the schedule in one transaction", async () => {
  const { pool, calls } = database();
  assert.equal((await deleteTrainingScheduleById(pool, 42)).affectedRows, 1);
  assert.deepEqual(calls.slice(1, 4), [
    { sql: "SELECT id FROM training_schedules WHERE id = ? FOR UPDATE", params: [42] },
    { sql: "DELETE FROM training_schedule_qr_tokens WHERE training_schedule_id = ?", params: [42] },
    { sql: "DELETE FROM training_schedules WHERE id = ?", params: [42] },
  ]);
  assert.deepEqual(calls.slice(-2), ["commit", "release"]);
});

test("missing schedule does not delete tokens", async () => {
  const { pool, calls } = database({ missing: true });
  assert.equal((await deleteTrainingScheduleById(pool, 42)).affectedRows, 0);
  assert.deepEqual(calls.slice(-2), ["rollback", "release"]);
  assert.equal(calls.some((call) => call.sql?.startsWith("DELETE")), false);
});

test("failure rolls back token cleanup", async () => {
  const { pool, calls } = database({ fail: true });
  await assert.rejects(deleteTrainingScheduleById(pool, 42), /delete failed/);
  assert.deepEqual(calls.slice(-2), ["rollback", "release"]);
  assert.equal(calls.includes("commit"), false);
});
