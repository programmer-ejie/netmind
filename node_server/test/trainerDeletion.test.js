const assert = require("node:assert/strict");
const test = require("node:test");
const { TRAINER_DELETE_STEPS, deleteTrainerById } = require("../utils/trainerDeletion");

test("trainer delete cleanup includes trainer-owned and trainer-referenced tables", () => {
  const cleanupTables = new Set(TRAINER_DELETE_STEPS.map((step) => step.table));

  assert.deepEqual(
    [
      "drill_performance_logs",
      "training_assignments",
      "attendance_logs",
      "injury_logs",
      "training_schedule_qr_tokens",
      "training_schedules",
      "drills",
      "team_trainers",
      "coach_trainers",
      "notifications",
      "push_subscriptions",
    ].filter((table) => !cleanupTables.has(table)),
    []
  );
});

test("trainer delete runs cleanup before deleting the user", async () => {
  const calls = [];
  const connection = {
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.startsWith("SELECT id FROM users")) {
        return [[{ id: 7 }]];
      }

      if (sql.startsWith("DELETE FROM users")) {
        return [{ affectedRows: 1 }];
      }

      return [{ affectedRows: 0 }];
    },
  };

  const deleted = await deleteTrainerById(connection, 7);
  const touchedTables = calls
    .filter((call) => /^(DELETE FROM|UPDATE) /.test(call.sql))
    .map((call) => call.sql.match(/^(?:DELETE FROM|UPDATE) (\w+)/)[1]);

  assert.equal(deleted, true);
  assert.deepEqual(touchedTables, [
    ...TRAINER_DELETE_STEPS.map((step) => step.table),
    "users",
  ]);
});
