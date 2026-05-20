const express = require("express");
const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { toLocalDateKey } = require("../utils/dateKeys");
const {
  createNotifications,
  getPlayerStaffRecipients,
} = require("../src/services/notificationService");

const router = express.Router();

function clampNumber(value, min, max) {
  const number = Number(value);

  if (Number.isNaN(number)) return null;
  return Math.max(min, Math.min(max, number));
}

function toDateKey(value) {
  return toLocalDateKey(value || new Date());
}

function todayDateKey() {
  return toLocalDateKey();
}

router.get("/players/:playerId/wellness-checkins", asyncHandler(async (req, res) => {
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

router.get("/wellness-checkins", asyncHandler(async (req, res) => {
  const params = [];
  const filters = [];

  if (req.query.player_id) {
    filters.push("player_id = ?");
    params.push(req.query.player_id);
  }

  if (req.query.month) {
    filters.push("DATE_FORMAT(checkin_date, '%Y-%m') = ?");
    params.push(req.query.month);
  }

  if (req.user.role === "coach") {
    filters.push(
      `player_id IN (
        SELECT tm.player_id FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE t.coach_id = ?
      )`
    );
    params.push(req.user.id);
  } else if (req.user.role === "trainer") {
    filters.push(
      `player_id IN (
        SELECT tm.player_id FROM team_members tm
        JOIN team_trainers tt ON tt.team_id = tm.team_id
        WHERE tt.trainer_id = ?
      )`
    );
    params.push(req.user.id);
  } else {
    filters.push("player_id = ?");
    params.push(req.user.id);
  }

  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 500, 1000));

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
    ${whereSql}
    ORDER BY checkin_date DESC, updated_at DESC
    LIMIT ${limit}`,
    params
  );

  res.json(rows);
}));

router.post("/players/:playerId/wellness-checkins", asyncHandler(async (req, res) => {
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

  const checkin = rows[0];
  await createNotifications({
    actorId: req.user.id,
    recipientIds: [checkin.player_id, ...(await getPlayerStaffRecipients(checkin.player_id))],
    type: "wellness.checkin.updated",
    title: "Wellness check-in submitted",
    body: `${req.user.name} submitted a wellness check-in.`,
    data: {
      wellnessCheckinId: checkin.id,
      playerId: checkin.player_id,
      checkinDate: checkin.checkin_date,
      fatigueLevel: checkin.fatigue_level,
      rpe: checkin.rpe,
    },
  });

  res.status(201).json(rows[0]);
}));

module.exports = router;
