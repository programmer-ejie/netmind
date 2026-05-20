const assert = require("node:assert/strict");
const test = require("node:test");
const tableConfig = require("../utils/tableConfig");
const { PLAYER_DELETE_STEPS, deletePlayerById } = require("../utils/playerDeletion");

test("player delete cleanup includes every configured player-owned table", () => {
  const cleanupTables = new Set(PLAYER_DELETE_STEPS.map((step) => step.table));
  const expectedTables = Object.values(tableConfig)
    .filter((config) => config.fields?.includes("player_id") || config.fields?.includes("user_id"))
    .map((config) => config.table)
    .filter((table) => table !== "users");

  assert.deepEqual(
    expectedTables.filter((table) => !cleanupTables.has(table)).sort(),
    []
  );
});

test("player delete runs child-table cleanup before deleting the user", async () => {
  const calls = [];
  const connection = {
    async execute(sql, params) {
      calls.push({ sql, params });

      if (sql.startsWith("SELECT id FROM users")) {
        return [[{ id: 42 }]];
      }

      if (sql.startsWith("DELETE FROM users")) {
        return [{ affectedRows: 1 }];
      }

      return [{ affectedRows: 0 }];
    },
  };

  const deleted = await deletePlayerById(connection, 42);
  const deleteTables = calls
    .filter((call) => call.sql.startsWith("DELETE FROM "))
    .map((call) => call.sql.match(/^DELETE FROM (\w+)/)[1]);

  assert.equal(deleted, true);
  assert.deepEqual(deleteTables, [
    ...PLAYER_DELETE_STEPS.map((step) => step.table),
    "users",
  ]);
});
