const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { pool, query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { sendPasswordResetCodeEmail } = require("../utils/emailService");

const router = express.Router();
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const passwordCodes = new Map();
const exportTables = [
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
  "wellness_checkins",
  "attendance_logs",
  "injury_logs",
  "lineups",
  "player_comparisons",
];

function formatPasswordCode(code) {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

function createPasswordCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

function getPasswordCodeRecord(userId) {
  const record = passwordCodes.get(String(userId));
  if (!record) return null;

  if (record.expiresAt <= Date.now()) {
    passwordCodes.delete(String(userId));
    return null;
  }

  return record;
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";

  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function buildInsertSql(table, rows) {
  if (!rows.length) return `-- No data for ${table}\n`;

  const columns = Object.keys(rows[0]);
  const values = rows.map((row) => `(${columns.map((column) => sqlValue(row[column])).join(", ")})`);

  return [
    `LOCK TABLES \`${table}\` WRITE;`,
    `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES`,
    `${values.join(",\n")};`,
    "UNLOCK TABLES;",
    "",
  ].join("\n");
}

async function getById(table, id) {
  const rows = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  return rows[0];
}

async function ensureRecord(table, id, label) {
  const record = await getById(table, id);

  if (!record) {
    throw new ApiError(404, `${label} not found`);
  }

  return record;
}

async function columnExists(table, column) {
  const rows = await query(
    `SELECT COUNT(*) AS count
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?`,
    [table, column]
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function ensurePerformanceLogColumns() {
  if (!(await columnExists("performance_logs", "confidence_level"))) {
    await query("ALTER TABLE performance_logs ADD COLUMN confidence_level TINYINT NULL");
  }

  if (!(await columnExists("performance_logs", "focus_level"))) {
    await query("ALTER TABLE performance_logs ADD COLUMN focus_level TINYINT NULL");
  }

  if (!(await columnExists("performance_logs", "notes"))) {
    await query("ALTER TABLE performance_logs ADD COLUMN notes TEXT NULL");
  }

  await query("ALTER TABLE performance_logs MODIFY energy_level TINYINT NULL");
  await query(
    `ALTER TABLE performance_logs
    MODIFY action_type ENUM('spike', 'serve', 'receive', 'dig', 'set', 'block', 'jump', 'run', 'reflection') NOT NULL`
  );
}

router.get("/routes", (req, res) => {
  res.json({
    auth: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/me",
    ],
    users: [
      "GET /api/users",
      "GET /api/users/:id",
      "PATCH /api/users/:id",
      "PATCH /api/users/:userId/password",
      "DELETE /api/users/:id",
      "GET /api/players",
      "GET /api/coaches",
      "GET /api/trainers",
    ],
    teams: [
      "GET /api/teams",
      "POST /api/teams",
      "GET /api/teams/:id",
      "PATCH /api/teams/:id",
      "DELETE /api/teams/:id",
      "GET /api/teams/:teamId/dashboard",
      "GET /api/teams/:teamId/roster",
      "GET /api/teams/:teamId/members",
      "POST /api/teams/:teamId/members",
      "PATCH /api/teams/:teamId/members/:playerId/status",
      "DELETE /api/teams/:teamId/members/:playerId",
      "GET /api/teams/:teamId/trainers",
      "POST /api/teams/:teamId/trainers",
      "DELETE /api/teams/:teamId/trainers/:trainerId",
    ],
    coachTrainers: [
      "GET /api/coaches/:coachId/trainers",
      "POST /api/coaches/:coachId/trainers",
      "DELETE /api/coaches/:coachId/trainers/:trainerId",
    ],
    seasons: [
      "GET /api/seasons",
      "POST /api/seasons",
      "GET /api/teams/:teamId/seasons",
      "POST /api/teams/:teamId/seasons",
      "PATCH /api/seasons/:seasonId/activate",
    ],
    matches: [
      "GET /api/matches",
      "POST /api/matches",
      "GET /api/teams/:teamId/matches",
      "POST /api/teams/:teamId/matches",
      "PATCH /api/matches/:matchId/score",
      "POST /api/matches/:matchId/finalize-ranking",
    ],
    drillsAndTraining: [
      "GET /api/drills",
      "POST /api/drills",
      "POST /api/drills/:drillId/assign",
      "GET /api/players/:playerId/training-assignments",
      "PATCH /api/training-assignments/:assignmentId/status",
      "POST /api/training-assignments/:assignmentId/logs",
    ],
    performance: [
      "GET /api/performance-logs",
      "POST /api/performance-logs",
      "GET /api/players/:playerId/performance-logs",
      "POST /api/players/:playerId/performance-logs",
      "GET /api/players/:playerId/wellness-checkins",
      "POST /api/players/:playerId/wellness-checkins",
      "GET /api/matches/:matchId/performance-logs",
      "GET /api/players/:playerId/summary",
    ],
    attendance: [
      "GET /api/attendance-logs",
      "POST /api/attendance-logs",
      "POST /api/attendance-logs/bulk",
      "POST /api/training-schedules/:scheduleId/qr-token",
      "GET /api/training-schedules/:scheduleId/attendance-check",
      "GET /api/attendance-qr/:token",
      "POST /api/attendance-qr/:token/check-in",
      "GET /api/teams/:teamId/attendance",
      "GET /api/players/:playerId/attendance",
    ],
    injuries: [
      "GET /api/injury-logs",
      "POST /api/injury-logs",
      "GET /api/players/:playerId/injuries",
      "POST /api/players/:playerId/injuries",
      "PATCH /api/injury-logs/:injuryId/recover",
    ],
    lineups: [
      "GET /api/lineups",
      "POST /api/lineups",
      "GET /api/teams/:teamId/lineups",
      "POST /api/teams/:teamId/lineups",
    ],
    comparisonsAndRankings: [
      "GET /api/team-rankings",
      "GET /api/teams/:teamId/rankings",
      "POST /api/seasons/:seasonId/rankings/recalculate",
      "GET /api/player-comparisons",
      "GET /api/teams/:teamId/player-comparisons",
      "POST /api/teams/:teamId/player-comparisons/generate",
    ],
    genericCrud: [
      "GET /api/<resource>",
      "GET /api/<resource>/:id",
      "POST /api/<resource>",
      "PATCH /api/<resource>/:id",
      "DELETE /api/<resource>/:id",
    ],
  });
});

router.get("/database/export", asyncHandler(async (req, res) => {
  const dbName = process.env.DB_NAME || "netmind";
  const parts = [
    `-- NetMind database export`,
    `-- Generated at ${new Date().toISOString()}`,
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`,
    `USE \`${dbName}\`;`,
    "SET FOREIGN_KEY_CHECKS=0;",
    "",
  ];

  for (const table of exportTables) {
    const createRows = await query(`SHOW CREATE TABLE \`${table}\``);
    const rows = await query(`SELECT * FROM \`${table}\``);
    const createSql = createRows[0]["Create Table"];

    parts.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    parts.push(`${createSql};`);
    parts.push(buildInsertSql(table, rows));
  }

  parts.push("SET FOREIGN_KEY_CHECKS=1;");

  const fileDate = new Date().toISOString().replace(/[:.]/g, "-");
  res.setHeader("Content-Type", "application/sql; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="netmind-${fileDate}.sql"`);
  res.send(parts.join("\n"));
}));

router.get("/players", asyncHandler(async (req, res) => {
  const rows = await query(
    "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE role = 'player' ORDER BY name"
  );
  res.json(rows);
}));

router.get("/coaches", asyncHandler(async (req, res) => {
  const rows = await query(
    "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE role = 'coach' ORDER BY name"
  );
  res.json(rows);
}));

router.get("/trainers", asyncHandler(async (req, res) => {
  const rows = await query(
    "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE role = 'trainer' ORDER BY name"
  );
  res.json(rows);
}));

router.patch("/users/:userId/password", asyncHandler(async (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (String(newPassword).length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  const rows = await query("SELECT id, password_hash FROM users WHERE id = ?", [req.params.userId]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, req.params.userId]);

  res.json({ message: "Password updated" });
}));

router.post("/users/:userId/password-code", asyncHandler(async (req, res) => {
  const rows = await query("SELECT id, name, email FROM users WHERE id = ?", [req.params.userId]);
  const user = rows[0];

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const rawCode = createPasswordCode();
  const code = formatPasswordCode(rawCode);
  const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");

  passwordCodes.set(String(user.id), {
    codeHash,
    attempts: 0,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  await sendPasswordResetCodeEmail({
    to: user.email,
    name: user.name,
    code,
  });

  res.json({
    message: "Confirmation code sent",
    email: user.email,
    expires_in_minutes: 10,
  });
}));

router.post("/users/:userId/password-code/verify", asyncHandler(async (req, res) => {
  const code = String(req.body.code || "").replace(/\D/g, "");

  if (code.length !== 6) {
    throw new ApiError(400, "Enter the 6-digit confirmation code");
  }

  const record = getPasswordCodeRecord(req.params.userId);
  if (!record) {
    throw new ApiError(400, "Confirmation code expired. Request a new code.");
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  record.attempts += 1;

  if (record.attempts > 5) {
    passwordCodes.delete(String(req.params.userId));
    throw new ApiError(429, "Too many attempts. Request a new code.");
  }

  if (codeHash !== record.codeHash) {
    throw new ApiError(400, "Confirmation code is incorrect");
  }

  record.verified = true;
  res.json({ message: "Confirmation code verified" });
}));

router.patch("/users/:userId/password-with-code", asyncHandler(async (req, res) => {
  const code = String(req.body.code || "").replace(/\D/g, "");
  const newPassword = String(req.body.new_password || "");

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  const record = getPasswordCodeRecord(req.params.userId);
  if (!record?.verified) {
    throw new ApiError(400, "Verify the confirmation code before changing password");
  }

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  if (codeHash !== record.codeHash) {
    throw new ApiError(400, "Confirmation code is incorrect");
  }

  const users = await query("SELECT id FROM users WHERE id = ?", [req.params.userId]);
  if (!users.length) {
    throw new ApiError(404, "User not found");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, req.params.userId]);
  passwordCodes.delete(String(req.params.userId));

  res.json({ message: "Password updated" });
}));

router.get("/teams/:teamId/members", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT tm.*, u.name, u.email, u.position, u.jersey_number
    FROM team_members tm
    JOIN users u ON u.id = tm.player_id
    WHERE tm.team_id = ?
    ORDER BY u.jersey_number IS NULL, u.jersey_number, u.name`,
    [req.params.teamId]
  );
  res.json(rows);
}));

router.post("/teams/:teamId/members", asyncHandler(async (req, res) => {
  await ensureRecord("teams", req.params.teamId, "Team");
  await ensureRecord("users", req.body.player_id, "Player");

  await query(
    `INSERT INTO team_members (team_id, player_id, joined_at, is_active)
    VALUES (?, ?, COALESCE(?, CURRENT_DATE), TRUE)
    ON DUPLICATE KEY UPDATE joined_at = VALUES(joined_at), is_active = TRUE`,
    [req.params.teamId, req.body.player_id, req.body.joined_at || null]
  );

  const rows = await query("SELECT * FROM team_members WHERE team_id = ? AND player_id = ?", [
    req.params.teamId,
    req.body.player_id,
  ]);
  res.status(201).json(rows[0]);
}));

router.patch("/teams/:teamId/members/:playerId/status", asyncHandler(async (req, res) => {
  const isActive = req.body.is_active ?? true;
  const result = await query("UPDATE team_members SET is_active = ? WHERE team_id = ? AND player_id = ?", [
    isActive,
    req.params.teamId,
    req.params.playerId,
  ]);

  if (!result.affectedRows) {
    throw new ApiError(404, "Team member not found");
  }

  const rows = await query("SELECT * FROM team_members WHERE team_id = ? AND player_id = ?", [
    req.params.teamId,
    req.params.playerId,
  ]);
  res.json(rows[0]);
}));

router.delete("/teams/:teamId/members/:playerId", asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM team_members WHERE team_id = ? AND player_id = ?", [
    req.params.teamId,
    req.params.playerId,
  ]);

  if (!result.affectedRows) {
    throw new ApiError(404, "Team member not found");
  }

  res.status(204).send();
}));

router.delete("/players/:playerId", asyncHandler(async (req, res) => {
  const rows = await query("SELECT id FROM users WHERE id = ? AND role = 'player'", [req.params.playerId]);
  const player = rows[0];

  if (!player) {
    throw new ApiError(404, "Player not found");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(
      `DELETE FROM drill_performance_logs
      WHERE player_id = ?
        OR training_assignment_id IN (
          SELECT id FROM training_assignments WHERE player_id = ?
        )`,
      [player.id, player.id]
    );
    await connection.execute("DELETE FROM training_assignments WHERE player_id = ?", [player.id]);
    await connection.execute("DELETE FROM performance_logs WHERE user_id = ?", [player.id]);
    await connection.execute("DELETE FROM attendance_logs WHERE player_id = ?", [player.id]);
    await connection.execute("DELETE FROM injury_logs WHERE player_id = ?", [player.id]);
    await connection.execute("DELETE FROM team_members WHERE player_id = ?", [player.id]);

    const [result] = await connection.execute("DELETE FROM users WHERE id = ? AND role = 'player'", [player.id]);

    if (!result.affectedRows) {
      throw new ApiError(404, "Player not found");
    }

    await connection.commit();
    res.status(204).send();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.get("/teams/:teamId/trainers", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT tt.*, u.name, u.email
    FROM team_trainers tt
    JOIN users u ON u.id = tt.trainer_id
    WHERE tt.team_id = ?
    ORDER BY u.name`,
    [req.params.teamId]
  );
  res.json(rows);
}));

router.post("/teams/:teamId/trainers", asyncHandler(async (req, res) => {
  await ensureRecord("teams", req.params.teamId, "Team");
  await ensureRecord("users", req.body.trainer_id, "Trainer");

  await query(
    `INSERT INTO team_trainers (team_id, trainer_id, assigned_by)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by), assigned_at = CURRENT_TIMESTAMP`,
    [req.params.teamId, req.body.trainer_id, req.body.assigned_by]
  );

  const rows = await query("SELECT * FROM team_trainers WHERE team_id = ? AND trainer_id = ?", [
    req.params.teamId,
    req.body.trainer_id,
  ]);
  res.status(201).json(rows[0]);
}));

router.delete("/teams/:teamId/trainers/:trainerId", asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM team_trainers WHERE team_id = ? AND trainer_id = ?", [
    req.params.teamId,
    req.params.trainerId,
  ]);

  if (!result.affectedRows) {
    throw new ApiError(404, "Team trainer not found");
  }

  res.status(204).send();
}));

router.get("/coaches/:coachId/trainers", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT ct.*, u.name, u.email
    FROM coach_trainers ct
    JOIN users u ON u.id = ct.trainer_id
    WHERE ct.coach_id = ?
    ORDER BY u.name`,
    [req.params.coachId]
  );
  res.json(rows);
}));

router.post("/coaches/:coachId/trainers", asyncHandler(async (req, res) => {
  await ensureRecord("users", req.params.coachId, "Coach");
  await ensureRecord("users", req.body.trainer_id, "Trainer");

  await query(
    `INSERT INTO coach_trainers (coach_id, trainer_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
    [req.params.coachId, req.body.trainer_id]
  );

  const rows = await query("SELECT * FROM coach_trainers WHERE coach_id = ? AND trainer_id = ?", [
    req.params.coachId,
    req.body.trainer_id,
  ]);
  res.status(201).json(rows[0]);
}));

router.delete("/coaches/:coachId/trainers/:trainerId", asyncHandler(async (req, res) => {
  const result = await query("DELETE FROM coach_trainers WHERE coach_id = ? AND trainer_id = ?", [
    req.params.coachId,
    req.params.trainerId,
  ]);

  if (!result.affectedRows) {
    throw new ApiError(404, "Coach trainer link not found");
  }

  res.status(204).send();
}));

router.get("/teams/:teamId/seasons", asyncHandler(async (req, res) => {
  const rows = await query("SELECT * FROM seasons WHERE team_id = ? ORDER BY start_date DESC", [req.params.teamId]);
  res.json(rows);
}));

router.post("/teams/:teamId/seasons", asyncHandler(async (req, res) => {
  await ensureRecord("teams", req.params.teamId, "Team");

  const result = await query(
    `INSERT INTO seasons (team_id, season_name, season_type, start_date, end_date, is_active)
    VALUES (?, ?, COALESCE(?, 'regular'), ?, ?, COALESCE(?, FALSE))`,
    [
      req.params.teamId,
      req.body.season_name,
      req.body.season_type || null,
      req.body.start_date,
      req.body.end_date,
      req.body.is_active ?? null,
    ]
  );

  const season = await getById("seasons", result.insertId);
  res.status(201).json(season);
}));

router.patch("/seasons/:seasonId/activate", asyncHandler(async (req, res) => {
  const season = await ensureRecord("seasons", req.params.seasonId, "Season");

  await query("UPDATE seasons SET is_active = FALSE WHERE team_id = ?", [season.team_id]);
  await query("UPDATE seasons SET is_active = TRUE WHERE id = ?", [req.params.seasonId]);

  res.json(await getById("seasons", req.params.seasonId));
}));

router.get("/teams/:teamId/matches", asyncHandler(async (req, res) => {
  const rows = await query("SELECT * FROM matches WHERE team_id = ? ORDER BY match_date DESC", [req.params.teamId]);
  res.json(rows);
}));

router.post("/teams/:teamId/matches", asyncHandler(async (req, res) => {
  await ensureRecord("teams", req.params.teamId, "Team");

  const result = await query(
    `INSERT INTO matches
      (team_id, opponent_name, match_date, is_home, result, team_score, opponent_score, season_id, match_type, notes)
    VALUES (?, ?, ?, COALESCE(?, TRUE), ?, ?, ?, ?, COALESCE(?, 'friendly'), ?)`,
    [
      req.params.teamId,
      req.body.opponent_name,
      req.body.match_date,
      req.body.is_home ?? null,
      req.body.result || null,
      req.body.team_score || null,
      req.body.opponent_score || null,
      req.body.season_id || null,
      req.body.match_type || null,
      req.body.notes || null,
    ]
  );

  res.status(201).json(await getById("matches", result.insertId));
}));

router.patch("/matches/:matchId/score", asyncHandler(async (req, res) => {
  const teamScore = Number(req.body.team_score);
  const opponentScore = Number(req.body.opponent_score);
  const result = req.body.result || (teamScore > opponentScore ? "win" : teamScore < opponentScore ? "loss" : "draw");

  const update = await query(
    "UPDATE matches SET team_score = ?, opponent_score = ?, result = ? WHERE id = ?",
    [teamScore, opponentScore, result, req.params.matchId]
  );

  if (!update.affectedRows) {
    throw new ApiError(404, "Match not found");
  }

  res.json(await getById("matches", req.params.matchId));
}));

router.post("/drills/:drillId/assign", asyncHandler(async (req, res) => {
  const drill = await ensureRecord("drills", req.params.drillId, "Drill");

  const result = await query(
    `INSERT INTO training_assignments
      (player_id, assigned_by, drill_id, focus_area, drill_description, target_reps, target_success_rate, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.body.player_id,
      req.body.assigned_by,
      req.params.drillId,
      req.body.focus_area || drill.category,
      req.body.drill_description || drill.description,
      req.body.target_reps || null,
      req.body.target_success_rate || null,
      req.body.due_date || null,
    ]
  );

  res.status(201).json(await getById("training_assignments", result.insertId));
}));

router.get("/players/:playerId/training-assignments", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT ta.*, d.drill_name, d.category, d.difficulty
    FROM training_assignments ta
    LEFT JOIN drills d ON d.id = ta.drill_id
    WHERE ta.player_id = ?
    ORDER BY ta.created_at DESC`,
    [req.params.playerId]
  );
  res.json(rows);
}));

router.patch("/training-assignments/:assignmentId/status", asyncHandler(async (req, res) => {
  const completedAt = req.body.status === "completed" ? req.body.completed_at || new Date() : req.body.completed_at || null;
  const result = await query("UPDATE training_assignments SET status = ?, completed_at = ? WHERE id = ?", [
    req.body.status,
    completedAt,
    req.params.assignmentId,
  ]);

  if (!result.affectedRows) {
    throw new ApiError(404, "Training assignment not found");
  }

  res.json(await getById("training_assignments", req.params.assignmentId));
}));

router.post("/training-assignments/:assignmentId/logs", asyncHandler(async (req, res) => {
  const assignment = await ensureRecord("training_assignments", req.params.assignmentId, "Training assignment");

  const result = await query(
    `INSERT INTO drill_performance_logs
      (training_assignment_id, player_id, drill_id, session_date, reps_completed, reps_target, success_count, failure_count, metric_value, notes)
    VALUES (?, ?, ?, COALESCE(?, CURRENT_DATE), ?, ?, ?, ?, ?, ?)`,
    [
      req.params.assignmentId,
      assignment.player_id,
      req.body.drill_id || assignment.drill_id,
      req.body.session_date || null,
      req.body.reps_completed || null,
      req.body.reps_target || assignment.target_reps || null,
      req.body.success_count || null,
      req.body.failure_count || null,
      req.body.metric_value || null,
      req.body.notes || null,
    ]
  );

  res.status(201).json(await getById("drill_performance_logs", result.insertId));
}));

router.get("/players/:playerId/performance-logs", asyncHandler(async (req, res) => {
  await ensurePerformanceLogColumns();

  const rows = await query("SELECT * FROM performance_logs WHERE user_id = ? ORDER BY created_at DESC", [req.params.playerId]);
  res.json(rows);
}));

router.post("/players/:playerId/performance-logs", asyncHandler(async (req, res) => {
  await ensurePerformanceLogColumns();

  const isReflection = req.body.session_type === "match" && req.body.action_type === "reflection" && req.body.match_id;
  if (isReflection) {
    const existingRows = await query(
      `SELECT id FROM performance_logs
      WHERE user_id = ?
        AND session_type = 'match'
        AND action_type = 'reflection'
        AND match_id = ?
      ORDER BY created_at DESC
      LIMIT 1`,
      [req.params.playerId, req.body.match_id]
    );

    if (existingRows.length) {
      await query(
        `UPDATE performance_logs
        SET result = ?,
          value = ?,
          minutes_played = COALESCE(?, 0),
          fatigue_level = ?,
          rpe = ?,
          sleep_quality = ?,
          energy_level = ?,
          confidence_level = ?,
          focus_level = ?,
          injury_status = COALESCE(?, 'none'),
          notes = ?
        WHERE id = ?`,
        [
          req.body.result || null,
          req.body.value || null,
          req.body.minutes_played ?? null,
          req.body.fatigue_level ?? null,
          req.body.rpe ?? null,
          req.body.sleep_quality || null,
          req.body.energy_level || null,
          req.body.confidence_level || null,
          req.body.focus_level || null,
          req.body.injury_status || null,
          req.body.notes || null,
          existingRows[0].id,
        ]
      );

      return res.json(await getById("performance_logs", existingRows[0].id));
    }
  }

  const result = await query(
    `INSERT INTO performance_logs
      (user_id, session_type, match_id, match_number, season_id, action_type, result, value, minutes_played, fatigue_level, rpe, sleep_quality, energy_level, confidence_level, focus_level, injury_status, notes)
    VALUES (?, ?, ?, COALESCE(?, 1), ?, ?, ?, ?, COALESCE(?, 0), ?, ?, ?, ?, ?, ?, COALESCE(?, 'none'), ?)`,
    [
      req.params.playerId,
      req.body.session_type,
      req.body.match_id || null,
      req.body.match_number || null,
      req.body.season_id || null,
      req.body.action_type,
      req.body.result || null,
      req.body.value || null,
      req.body.minutes_played ?? null,
      req.body.fatigue_level ?? null,
      req.body.rpe ?? null,
      req.body.sleep_quality || null,
      req.body.energy_level || null,
      req.body.confidence_level || null,
      req.body.focus_level || null,
      req.body.injury_status || null,
      req.body.notes || null,
    ]
  );

  res.status(201).json(await getById("performance_logs", result.insertId));
}));

router.get("/matches/:matchId/performance-logs", asyncHandler(async (req, res) => {
  const values = [req.params.matchId];
  const matchNumberSql = req.query.match_number ? "AND pl.match_number = ?" : "";
  if (req.query.match_number) {
    values.push(req.query.match_number);
  }

  const rows = await query(
    `SELECT pl.*, u.name, u.position, u.jersey_number
    FROM performance_logs pl
    JOIN users u ON u.id = pl.user_id
    WHERE pl.match_id = ?
    ${matchNumberSql}
    ORDER BY pl.created_at DESC`,
    values
  );
  res.json(rows);
}));

router.post("/attendance-logs/bulk", asyncHandler(async (req, res) => {
  if (!Array.isArray(req.body.logs) || !req.body.logs.length) {
    throw new ApiError(400, "logs must be a non-empty array");
  }

  const values = req.body.logs.map((log) => [
    log.player_id,
    log.team_id,
    log.session_type,
    log.match_id || null,
    log.session_date,
    log.status,
    log.late_minutes || 0,
    log.reason || null,
    log.marked_by,
  ]);

  const placeholders = values.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  const flatValues = values.flat();
  const result = await query(
    `INSERT INTO attendance_logs
      (player_id, team_id, session_type, match_id, session_date, status, late_minutes, reason, marked_by)
    VALUES ${placeholders}`,
    flatValues
  );

  res.status(201).json({ inserted: result.affectedRows });
}));

router.post("/training-schedules/:scheduleId/qr-token", asyncHandler(async (req, res) => {
  const schedule = await ensureRecord("training_schedules", req.params.scheduleId, "Training schedule");
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 1000);

  await query(
    `INSERT INTO training_schedule_qr_tokens
      (training_schedule_id, token, expires_at, created_by)
    VALUES (?, ?, ?, ?)`,
    [
      schedule.id,
      token,
      expiresAt.toISOString().slice(0, 19).replace("T", " "),
      req.body.created_by || null,
    ]
  );

  res.status(201).json({
    token,
    training_schedule_id: schedule.id,
    team_id: schedule.team_id,
    session_type: schedule.session_type,
    session_date: schedule.session_date,
    expires_at: expiresAt.toISOString(),
    check_in_url: `netmind://attendance-check-in?token=${token}`,
  });
}));

router.get("/training-schedules/:scheduleId/attendance-check", asyncHandler(async (req, res) => {
  const schedule = await ensureRecord("training_schedules", req.params.scheduleId, "Training schedule");
  const team = await ensureRecord("teams", schedule.team_id, "Team");
  const players = await query(
    `SELECT tm.player_id, tm.is_active, u.name, u.email, u.position, u.jersey_number
    FROM team_members tm
    JOIN users u ON u.id = tm.player_id
    WHERE tm.team_id = ? AND tm.is_active = TRUE
    ORDER BY u.jersey_number IS NULL, u.jersey_number, u.name`,
    [schedule.team_id]
  );
  const logs = await query(
    `SELECT al.*, u.name, u.position, u.jersey_number
    FROM attendance_logs al
    JOIN users u ON u.id = al.player_id
    WHERE al.team_id = ? AND al.session_type = ? AND al.session_date = ?
    ORDER BY u.name`,
    [schedule.team_id, schedule.session_type, schedule.session_date]
  );
  const logsByPlayerId = new Map(logs.map((log) => [String(log.player_id), log]));
  const roster = players.map((player) => ({
    ...player,
    checked_in: logsByPlayerId.has(String(player.player_id)),
    attendance_log: logsByPlayerId.get(String(player.player_id)) || null,
  }));

  res.json({
    schedule,
    team,
    players: roster,
    logs,
    summary: {
      total: roster.length,
      checked_in: roster.filter((player) => player.checked_in).length,
      not_checked_in: roster.filter((player) => !player.checked_in).length,
    },
  });
}));

router.get("/attendance-qr/:token", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT qr.*, ts.team_id, ts.session_type, ts.session_date
    FROM training_schedule_qr_tokens qr
    JOIN training_schedules ts ON ts.id = qr.training_schedule_id
    WHERE qr.token = ?
    LIMIT 1`,
    [req.params.token]
  );
  const record = rows[0];

  if (!record) {
    throw new ApiError(404, "QR token not found");
  }

  const expired = new Date(record.expires_at).getTime() <= Date.now();

  res.json({
    training_schedule_id: record.training_schedule_id,
    team_id: record.team_id,
    session_type: record.session_type,
    session_date: record.session_date,
    expires_at: record.expires_at,
    expired,
  });
}));

router.post("/attendance-qr/:token/check-in", asyncHandler(async (req, res) => {
  if (!req.body.player_id) {
    throw new ApiError(400, "player_id is required");
  }

  const rows = await query(
    `SELECT qr.*, ts.team_id, ts.session_type, ts.session_date
    FROM training_schedule_qr_tokens qr
    JOIN training_schedules ts ON ts.id = qr.training_schedule_id
    WHERE qr.token = ?
    LIMIT 1`,
    [req.params.token]
  );
  const record = rows[0];

  if (!record) {
    throw new ApiError(404, "QR token not found");
  }

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    throw new ApiError(410, "QR token has expired");
  }

  const existing = await query(
    `SELECT id FROM attendance_logs
    WHERE player_id = ? AND team_id = ? AND session_type = ? AND session_date = ?
    LIMIT 1`,
    [req.body.player_id, record.team_id, record.session_type, record.session_date]
  );

  if (existing.length) {
    res.json(await getById("attendance_logs", existing[0].id));
    return;
  }

  const result = await query(
    `INSERT INTO attendance_logs
      (player_id, team_id, session_type, match_id, session_date, status, late_minutes, reason, marked_by)
    VALUES (?, ?, ?, NULL, ?, 'present', 0, ?, ?)`,
    [
      req.body.player_id,
      record.team_id,
      record.session_type,
      record.session_date,
      "QR check-in",
      req.body.marked_by || req.body.player_id,
    ]
  );

  res.status(201).json(await getById("attendance_logs", result.insertId));
}));

router.get("/teams/:teamId/attendance", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT al.*, u.name, u.position, u.jersey_number
    FROM attendance_logs al
    JOIN users u ON u.id = al.player_id
    WHERE al.team_id = ?
    ORDER BY al.session_date DESC, u.name`,
    [req.params.teamId]
  );
  res.json(rows);
}));

router.get("/players/:playerId/attendance", asyncHandler(async (req, res) => {
  const rows = await query("SELECT * FROM attendance_logs WHERE player_id = ? ORDER BY session_date DESC", [
    req.params.playerId,
  ]);
  res.json(rows);
}));

router.get("/players/:playerId/injuries", asyncHandler(async (req, res) => {
  const rows = await query("SELECT * FROM injury_logs WHERE player_id = ? ORDER BY occurred_at DESC", [
    req.params.playerId,
  ]);
  res.json(rows);
}));

router.post("/players/:playerId/injuries", asyncHandler(async (req, res) => {
  const result = await query(
    `INSERT INTO injury_logs
      (player_id, injury_type, body_part, severity, occurred_at, recovered_at, days_missed, reported_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.params.playerId,
      req.body.injury_type,
      req.body.body_part,
      req.body.severity,
      req.body.occurred_at,
      req.body.recovered_at || null,
      req.body.days_missed || null,
      req.body.reported_by,
      req.body.notes || null,
    ]
  );

  res.status(201).json(await getById("injury_logs", result.insertId));
}));

router.patch("/injury-logs/:injuryId/recover", asyncHandler(async (req, res) => {
  const injury = await ensureRecord("injury_logs", req.params.injuryId, "Injury log");
  const recoveredAt = req.body.recovered_at || new Date().toISOString().slice(0, 10);

  await query(
    `UPDATE injury_logs
    SET recovered_at = ?, days_missed = COALESCE(?, DATEDIFF(?, occurred_at))
    WHERE id = ?`,
    [recoveredAt, req.body.days_missed || null, recoveredAt, injury.id]
  );

  res.json(await getById("injury_logs", req.params.injuryId));
}));

router.get("/teams/:teamId/lineups", asyncHandler(async (req, res) => {
  const rows = await query("SELECT * FROM lineups WHERE team_id = ? ORDER BY match_date DESC", [req.params.teamId]);
  res.json(rows);
}));

router.post("/teams/:teamId/lineups", asyncHandler(async (req, res) => {
  const result = await query(
    `INSERT INTO lineups (coach_id, team_id, match_id, match_date, lineup_config, rotation_order, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      req.body.coach_id,
      req.params.teamId,
      req.body.match_id || null,
      req.body.match_date,
      JSON.stringify(req.body.lineup_config),
      req.body.rotation_order ? JSON.stringify(req.body.rotation_order) : null,
      req.body.notes || null,
    ]
  );

  res.status(201).json(await getById("lineups", result.insertId));
}));

router.get("/teams/:teamId/rankings", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT tr.*, s.season_name
    FROM team_rankings tr
    JOIN seasons s ON s.id = tr.season_id
    WHERE tr.team_id = ?
    ORDER BY s.start_date DESC, tr.ranking_position ASC`,
    [req.params.teamId]
  );
  res.json(rows);
}));

router.post("/seasons/:seasonId/rankings/recalculate", asyncHandler(async (req, res) => {
  const teamId = req.body.team_id;

  if (!teamId) {
    throw new ApiError(400, "team_id is required");
  }

  const [summary] = await query(
    `SELECT
      SUM(result = 'win') AS wins,
      SUM(result = 'loss') AS losses,
      ROUND((SUM(result = 'win') / NULLIF(COUNT(*), 0)) * 100, 2) AS win_percentage,
      COALESCE(SUM(team_score), 0) AS points_for,
      COALESCE(SUM(opponent_score), 0) AS points_against,
      COALESCE(SUM(team_score), 0) - COALESCE(SUM(opponent_score), 0) AS point_difference
    FROM matches
    WHERE team_id = ? AND season_id = ? AND result IS NOT NULL`,
    [teamId, req.params.seasonId]
  );

  await query(
    `INSERT INTO team_rankings
      (team_id, season_id, ranking_position, wins, losses, win_percentage, points_for, points_against, point_difference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      ranking_position = VALUES(ranking_position),
      wins = VALUES(wins),
      losses = VALUES(losses),
      win_percentage = VALUES(win_percentage),
      points_for = VALUES(points_for),
      points_against = VALUES(points_against),
      point_difference = VALUES(point_difference),
      calculated_at = CURRENT_TIMESTAMP`,
    [
      teamId,
      req.params.seasonId,
      req.body.ranking_position || 1,
      summary.wins || 0,
      summary.losses || 0,
      summary.win_percentage || 0,
      summary.points_for || 0,
      summary.points_against || 0,
      summary.point_difference || 0,
    ]
  );

  const rows = await query("SELECT * FROM team_rankings WHERE team_id = ? AND season_id = ?", [
    teamId,
    req.params.seasonId,
  ]);
  res.json(rows[0]);
}));

router.get("/teams/:teamId/player-comparisons", asyncHandler(async (req, res) => {
  const rows = await query("SELECT * FROM player_comparisons WHERE team_id = ? ORDER BY generated_at DESC", [
    req.params.teamId,
  ]);
  res.json(rows);
}));

router.post("/teams/:teamId/player-comparisons/generate", asyncHandler(async (req, res) => {
  if (!req.body.coach_id || !req.body.season_id) {
    throw new ApiError(400, "coach_id and season_id are required");
  }

  const metricName = req.body.metric_name || req.body.action_type || "overall";
  const seasonSql = req.body.season_id ? "AND pl.season_id = ?" : "";
  const values = [];

  if (req.body.action_type) {
    values.push(req.body.action_type);
  }

  if (req.body.season_id) {
    values.push(req.body.season_id);
  }

  values.push(req.params.teamId);

  const rankings = await query(
    `SELECT
      u.id AS player_id,
      u.name,
      u.position,
      u.jersey_number,
      COUNT(pl.id) AS total_logs,
      AVG(pl.value) AS average_value,
      SUM(pl.result IN ('kill', 'ace', 'perfect', 'assist', 'stuff')) AS positive_results,
      SUM(pl.result = 'error') AS errors
    FROM team_members tm
    JOIN users u ON u.id = tm.player_id
    LEFT JOIN performance_logs pl ON pl.user_id = u.id
      ${req.body.action_type ? "AND pl.action_type = ?" : ""}
      ${seasonSql}
    WHERE tm.team_id = ?
    GROUP BY u.id, u.name, u.position, u.jersey_number
    ORDER BY positive_results DESC, average_value DESC, errors ASC`,
    values
  );

  const result = await query(
    `INSERT INTO player_comparisons (coach_id, team_id, season_id, metric_name, rankings)
    VALUES (?, ?, ?, ?, ?)`,
    [
      req.body.coach_id,
      req.params.teamId,
      req.body.season_id,
      metricName,
      JSON.stringify(rankings),
    ]
  );

  res.status(201).json(await getById("player_comparisons", result.insertId));
}));

module.exports = router;
