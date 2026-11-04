const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const { rawPool } = require("../config/db");

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

const booleanColumns = {
  users: ["is_active"],
  team_members: ["is_active"],
  seasons: ["is_active"],
  matches: ["is_home"],
  drills: ["is_public"],
  notifications: ["is_read"],
  push_subscriptions: ["is_active"],
};

const jsonColumns = {
  lineups: ["lineup_config", "rotation_order"],
  player_comparisons: ["rankings"],
  notifications: ["data"],
};

const skippedColumns = {
  drill_performance_logs: ["success_rate"],
};

function sourceConfig() {
  return {
    host: process.env.MYSQL_SOURCE_HOST || process.env.DB_HOST || "localhost",
    port: Number(process.env.MYSQL_SOURCE_PORT || process.env.DB_PORT || 3306),
    user: process.env.MYSQL_SOURCE_USER || process.env.DB_USER || "root",
    password: process.env.MYSQL_SOURCE_PASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.MYSQL_SOURCE_DATABASE || process.env.DB_NAME,
    dateStrings: true,
  };
}

function normalizeValue(table, column, value) {
  if (value === undefined) return null;
  if (value === null) return null;

  if (booleanColumns[table]?.includes(column)) {
    return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
  }

  if (jsonColumns[table]?.includes(column)) {
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  return value;
}

async function mysqlTableExists(connection, table) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS total
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ?`,
    [table]
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function truncatePostgres() {
  for (const table of [...tableOrder].reverse()) {
    await rawPool.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
}

async function insertRows(table, rows) {
  if (!rows.length) return;

  const skipped = new Set(skippedColumns[table] || []);
  const columns = Object.keys(rows[0]).filter((column) => !skipped.has(column));
  const columnSql = columns.map((column) => `"${column}"`).join(", ");
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
  const sql = `INSERT INTO "${table}" (${columnSql}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = columns.map((column) => normalizeValue(table, column, row[column]));
    await rawPool.query(sql, values);
  }
}

async function resetSequence(table) {
  await rawPool.query(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true)`,
    [table]
  );
}

async function main() {
  const config = sourceConfig();
  if (!config.database) {
    throw new Error("Set MYSQL_SOURCE_DATABASE or DB_NAME for the local MySQL source database.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the Postgres target database.");
  }

  const mysqlConnection = await mysql.createConnection(config);

  try {
    await truncatePostgres();

    for (const table of tableOrder) {
      if (!(await mysqlTableExists(mysqlConnection, table))) {
        console.log(`Skipped missing MySQL table: ${table}`);
        continue;
      }

      const [rows] = await mysqlConnection.query(`SELECT * FROM \`${table}\``);
      await insertRows(table, rows);
      await resetSequence(table);
      console.log(`Transferred ${rows.length} row(s): ${table}`);
    }

    console.log("MySQL to Postgres transfer completed.");
  } finally {
    await mysqlConnection.end();
    await rawPool.end();
  }
}

main().catch((error) => {
  console.error("MySQL to Postgres transfer failed.");
  console.error(error.message);
  process.exit(1);
});
