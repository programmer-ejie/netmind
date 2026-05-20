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

async function getCheckConstraints(connection, table) {
  const [rows] = await connection.execute(
    `SELECT tc.CONSTRAINT_NAME AS constraint_name, cc.CHECK_CLAUSE AS check_clause
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
      AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    WHERE tc.TABLE_SCHEMA = DATABASE()
      AND tc.TABLE_NAME = ?
      AND tc.CONSTRAINT_TYPE = 'CHECK'`,
    [table]
  );

  return rows;
}

async function addColumnIfMissing(connection, table, column, definition) {
  if (await columnExists(connection, table, column)) return;

  await connection.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  console.log(`Added ${table}.${column}`);
}

async function resetPerformanceCheck(connection, column, constraintName, checkSql) {
  const constraints = await getCheckConstraints(connection, "performance_logs");
  const matchingConstraints = constraints.filter((constraint) => (
    String(constraint.constraint_name).toLowerCase() === constraintName.toLowerCase()
    || String(constraint.check_clause).toLowerCase().includes(column.toLowerCase())
  ));

  for (const constraint of matchingConstraints) {
    await connection.execute(`ALTER TABLE performance_logs DROP CHECK \`${constraint.constraint_name}\``);
    console.log(`Dropped performance_logs check ${constraint.constraint_name}`);
  }

  await connection.execute(
    `ALTER TABLE performance_logs ADD CONSTRAINT \`${constraintName}\` CHECK (${checkSql})`
  );
  console.log(`Ensured performance_logs.${constraintName}`);
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

  await resetPerformanceCheck(
    connection,
    "rpe",
    "chk_performance_logs_rpe_1_10",
    "rpe IS NULL OR rpe BETWEEN 1 AND 10"
  );
  await resetPerformanceCheck(
    connection,
    "energy_level",
    "chk_performance_logs_energy_1_10",
    "energy_level IS NULL OR energy_level BETWEEN 1 AND 10"
  );
  await resetPerformanceCheck(
    connection,
    "confidence_level",
    "chk_performance_logs_confidence_1_10",
    "confidence_level IS NULL OR confidence_level BETWEEN 1 AND 10"
  );
  await resetPerformanceCheck(
    connection,
    "focus_level",
    "chk_performance_logs_focus_1_10",
    "focus_level IS NULL OR focus_level BETWEEN 1 AND 10"
  );

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

async function migrateNotifications(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      recipient_user_id INT NOT NULL,
      actor_user_id INT NULL,
      type VARCHAR(80) NOT NULL,
      title VARCHAR(160) NOT NULL,
      body TEXT NULL,
      data JSON NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id),
      CONSTRAINT fk_notifications_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
      INDEX idx_notifications_recipient_created (recipient_user_id, created_at),
      INDEX idx_notifications_recipient_read (recipient_user_id, is_read)
    )
  `);
  console.log("Ensured notifications table exists");

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      platform VARCHAR(40) NULL,
      push_token VARCHAR(255) NULL,
      endpoint VARCHAR(512) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE KEY unique_push_endpoint (endpoint),
      INDEX idx_push_subscriptions_user (user_id, is_active)
    )
  `);
  console.log("Ensured push_subscriptions table exists");
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
    await migrateNotifications(connection);
    console.log(`Schema migration completed: ${dbName}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
