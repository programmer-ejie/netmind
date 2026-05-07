const express = require("express");
const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const router = express.Router();

async function ensureWellnessTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS wellness_checkins (
      id INT PRIMARY KEY AUTO_INCREMENT,
      player_id INT NOT NULL,
      checkin_date DATE NOT NULL,
      fatigue_level TINYINT NOT NULL,
      rpe TINYINT NOT NULL,
      sleep_hours DECIMAL(4,1) NOT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_player_checkin_date (player_id, checkin_date),
      CONSTRAINT fk_wellness_checkins_player FOREIGN KEY (player_id) REFERENCES users(id)
    )
  `);
}

function clampNumber(value, min, max) {
  const number = Number(value);

  if (Number.isNaN(number)) return null;
  return Math.max(min, Math.min(max, number));
}

function toDateKey(value) {
  if (!value) return new Date().toISOString().slice(0, 10);

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toISOString().slice(0, 10);
}

function todayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

router.get("/players/:playerId/wellness-checkins", asyncHandler(async (req, res) => {
  await ensureWellnessTable();

  const params = [req.params.playerId];
  let dateFilter = "";

  if (req.query.month) {
    dateFilter = "AND DATE_FORMAT(checkin_date, '%Y-%m') = ?";
    params.push(req.query.month);
  }

  const rows = await query(
    `SELECT
      id,
      player_id,
      DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkin_date,
      fatigue_level,
      rpe,
      sleep_hours,
      notes,
      created_at,
      updated_at
    FROM wellness_checkins
    WHERE player_id = ?
    ${dateFilter}
    ORDER BY checkin_date DESC`,
    params
  );

  res.json(rows);
}));

router.post("/players/:playerId/wellness-checkins", asyncHandler(async (req, res) => {
  await ensureWellnessTable();

  const fatigueLevel = clampNumber(req.body.fatigue_level, 1, 10);
  const rpe = clampNumber(req.body.rpe, 1, 10);
  const sleepHours = clampNumber(req.body.sleep_hours, 0, 24);

  if (fatigueLevel === null || rpe === null || sleepHours === null) {
    throw new ApiError(400, "fatigue_level, rpe, and sleep_hours are required");
  }

  const checkinDate = toDateKey(req.body.checkin_date);

  if (checkinDate !== todayDateKey()) {
    throw new ApiError(400, "Wellness check-ins can only be created or edited for today");
  }

  await query(
    `INSERT INTO wellness_checkins
      (player_id, checkin_date, fatigue_level, rpe, sleep_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      fatigue_level = VALUES(fatigue_level),
      rpe = VALUES(rpe),
      sleep_hours = VALUES(sleep_hours),
      notes = VALUES(notes),
      updated_at = CURRENT_TIMESTAMP`,
    [
      req.params.playerId,
      checkinDate,
      fatigueLevel,
      rpe,
      sleepHours,
      req.body.notes || null,
    ]
  );

  const rows = await query(
    `SELECT
      id,
      player_id,
      DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkin_date,
      fatigue_level,
      rpe,
      sleep_hours,
      notes,
      created_at,
      updated_at
    FROM wellness_checkins
    WHERE player_id = ? AND checkin_date = ?`,
    [req.params.playerId, checkinDate]
  );

  res.status(201).json(rows[0]);
}));

module.exports = router;
