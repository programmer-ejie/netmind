require("dotenv").config({ quiet: true });

const { query, rawPool } = require("../config/db");
const staticData = require("../database/staticData");

const tableOrder = [
  "users",
  "teams",
  "team_members",
  "team_trainers",
  "coach_trainers",
  "seasons",
  "matches",
  "match_scores",
  "team_rankings",
  "drills",
  "training_assignments",
  "training_schedules",
  "training_schedule_qr_tokens",
  "drill_performance_logs",
  "performance_logs",
  "wellness_checkins",
  "attendance_logs",
  "injury_logs",
  "lineups",
  "player_comparisons",
  "notifications",
  "push_subscriptions",
];

function serialize(value) {
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

async function resetSequence(tableName) {
  await query(
    `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 1), true)`
  );
}

async function insertRows(tableName, rows) {
  if (!rows.length) return;

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => "?").join(", ");
  const columnSql = columns.map((column) => `"${column}"`).join(", ");
  const sql = `INSERT INTO "${tableName}" (${columnSql}) VALUES (${placeholders})`;

  for (const row of rows) {
    await query(sql, columns.map((column) => serialize(row[column])));
  }
}

async function main() {
  for (const tableName of [...tableOrder].reverse()) {
    await query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
  }

  for (const tableName of tableOrder) {
    await insertRows(tableName, staticData[tableName] || []);
    await resetSequence(tableName);
  }

  await rawPool.end();
  console.log("Static NetMind demo data seeded into Postgres.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
