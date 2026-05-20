const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?`,
    [table, column]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function tableExists(connection, table) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?`,
    [table]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function indexExists(connection, table, indexName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?`,
    [table, indexName]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function addColumnIfMissing(connection, table, column, definition) {
  if (await columnExists(connection, table, column)) return;

  await connection.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  console.log(`Added ${table}.${column}`);
}

async function migratePerformanceLogs(connection) {
  if (!(await tableExists(connection, "performance_logs"))) {
    console.log("Skipped performance_logs migration; table does not exist.");
    return;
  }

  await addColumnIfMissing(connection, "performance_logs", "confidence_level", "confidence_level TINYINT NULL");
  await addColumnIfMissing(connection, "performance_logs", "focus_level", "focus_level TINYINT NULL");
  await addColumnIfMissing(connection, "performance_logs", "notes", "notes TEXT NULL");

  if (await columnExists(connection, "performance_logs", "energy_level")) {
    await connection.execute("ALTER TABLE performance_logs MODIFY energy_level TINYINT NULL");
    console.log("Updated performance_logs.energy_level to allow NULL");
  }

  if (await columnExists(connection, "performance_logs", "action_type")) {
    await connection.execute(
      `ALTER TABLE performance_logs
      MODIFY action_type ENUM('spike', 'serve', 'receive', 'dig', 'set', 'block', 'jump', 'run', 'reflection') NOT NULL`
    );
    console.log("Updated performance_logs.action_type enum");
  }
}

async function migrateWellnessCheckins(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS wellness_checkins (
      id INT PRIMARY KEY AUTO_INCREMENT,
      player_id INT NOT NULL,
      checkin_date DATE NOT NULL,
      fatigue_level TINYINT NOT NULL CHECK (fatigue_level BETWEEN 1 AND 10),
      rpe TINYINT NOT NULL CHECK (rpe BETWEEN 1 AND 10),
      sleep_hours DECIMAL(4,1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 24),
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_player_checkin_date (player_id, checkin_date),
      CONSTRAINT fk_wellness_checkins_player FOREIGN KEY (player_id) REFERENCES users(id)
    )
  `);
  console.log("Ensured wellness_checkins table exists");
}

async function migrateTeamTrainers(connection) {
  if (!(await tableExists(connection, "team_trainers"))) {
    console.log("Skipped team_trainers migration; table does not exist.");
    return;
  }

  if (await indexExists(connection, "team_trainers", "unique_team_trainer_team")) return;

  const [duplicateRows] = await connection.execute(
    `SELECT team_id
    FROM team_trainers
    GROUP BY team_id
    HAVING COUNT(*) > 1
    LIMIT 1`
  );

  if (duplicateRows.length) {
    console.log("Skipped unique_team_trainer_team index; remove duplicate team trainer assignments first.");
    return;
  }

  await connection.execute("ALTER TABLE team_trainers ADD UNIQUE KEY unique_team_trainer_team (team_id)");
  console.log("Added team_trainers.unique_team_trainer_team");
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

  try {
    await migratePerformanceLogs(connection);
    await migrateWellnessCheckins(connection);
    await migrateTeamTrainers(connection);
    console.log(`Schema migration completed: ${dbName}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
