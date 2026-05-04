const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const staticData = require("../database/staticData");

const tableOrder = [
  "users",
  "teams",
  "team_members",
  "team_trainers",
  "coach_trainers",
  "seasons",
  "matches",
  "team_rankings",
  "drills",
  "training_assignments",
  "training_schedules",
  "training_schedule_qr_tokens",
  "drill_performance_logs",
  "performance_logs",
  "attendance_logs",
  "injury_logs",
  "lineups",
  "player_comparisons",
];

function serialize(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  return value;
}

async function insertRows(connection, tableName, rows) {
  if (!rows.length) {
    return;
  }

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => "?").join(", ");
  const columnSql = columns.map((column) => `\`${column}\``).join(", ");
  const sql = `INSERT INTO \`${tableName}\` (${columnSql}) VALUES (${placeholders})`;

  for (const row of rows) {
    await connection.execute(sql, columns.map((column) => serialize(row[column])));
  }
}

async function main() {
  const dbName = process.env.DB_NAME;

  if (!dbName) {
    throw new Error("DB_NAME is required in .env");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: dbName,
  });

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");

  for (const tableName of [...tableOrder].reverse()) {
    await connection.query(`DELETE FROM \`${tableName}\``);
    await connection.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = 1`);
  }

  await connection.query("SET FOREIGN_KEY_CHECKS = 1");

  for (const tableName of tableOrder) {
    await insertRows(connection, tableName, staticData[tableName] || []);
  }

  await connection.end();

  console.log(`Static NetMind demo data seeded into ${dbName}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
