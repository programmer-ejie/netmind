const express = require("express");
const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/teams/:teamId/roster",
  asyncHandler(async (req, res) => {
    const rows = await query(
      `SELECT
        tm.id AS membership_id,
        tm.joined_at,
        tm.is_active AS membership_active,
        u.id,
        u.name,
        u.email,
        u.position,
        u.jersey_number,
        u.is_active
      FROM team_members tm
      JOIN users u ON u.id = tm.player_id
      WHERE tm.team_id = ?
      ORDER BY u.jersey_number IS NULL, u.jersey_number, u.name`,
      [req.params.teamId]
    );

    res.json(rows);
  })
);

router.get(
  "/teams/:teamId/dashboard",
  asyncHandler(async (req, res) => {
    const [team] = await query("SELECT * FROM teams WHERE id = ?", [req.params.teamId]);
    const [record] = await query(
      `SELECT
        COUNT(*) AS matches_played,
        SUM(result = 'win') AS wins,
        SUM(result = 'loss') AS losses,
        SUM(result = 'draw') AS draws,
        COALESCE(SUM(team_score), 0) AS points_for,
        COALESCE(SUM(opponent_score), 0) AS points_against
      FROM matches
      WHERE team_id = ?`,
      [req.params.teamId]
    );
    const attendance = await query(
      `SELECT status, COUNT(*) AS total
      FROM attendance_logs
      WHERE team_id = ?
      GROUP BY status`,
      [req.params.teamId]
    );
    const rankings = await query(
      `SELECT tr.*, s.season_name
      FROM team_rankings tr
      JOIN seasons s ON s.id = tr.season_id
      WHERE tr.team_id = ?
      ORDER BY tr.calculated_at DESC
      LIMIT 5`,
      [req.params.teamId]
    );

    res.json({
      team,
      record,
      attendance,
      rankings,
    });
  })
);

router.get(
  "/players/:playerId/summary",
  asyncHandler(async (req, res) => {
    const params = [req.params.playerId];
    const seasonSql = req.query.season_id ? "AND season_id = ?" : "";

    if (req.query.season_id) {
      params.push(req.query.season_id);
    }

    const [player] = await query(
      "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE id = ?",
      [req.params.playerId]
    );
    const actions = await query(
      `SELECT action_type, result, COUNT(*) AS total, AVG(value) AS average_value
      FROM performance_logs
      WHERE user_id = ? ${seasonSql}
      GROUP BY action_type, result
      ORDER BY action_type, total DESC`,
      params
    );
    const [wellness] = await query(
      `SELECT
        AVG(fatigue_level) AS avg_fatigue,
        AVG(rpe) AS avg_rpe,
        AVG(sleep_quality) AS avg_sleep_quality,
        AVG(energy_level) AS avg_energy_level,
        MAX(created_at) AS last_logged_at
      FROM performance_logs
      WHERE user_id = ? ${seasonSql}`,
      params
    );
    const [training] = await query(
      `SELECT
        COUNT(*) AS total_assignments,
        SUM(status = 'completed') AS completed,
        SUM(status = 'overdue') AS overdue
      FROM training_assignments
      WHERE player_id = ?`,
      [req.params.playerId]
    );
    const [drills] = await query(
      `SELECT AVG(success_rate) AS avg_success_rate, SUM(reps_completed) AS total_reps
      FROM drill_performance_logs
      WHERE player_id = ?`,
      [req.params.playerId]
    );
    const injuries = await query(
      `SELECT *
      FROM injury_logs
      WHERE player_id = ? AND recovered_at IS NULL
      ORDER BY occurred_at DESC`,
      [req.params.playerId]
    );

    res.json({
      player,
      actions,
      wellness,
      training,
      drills,
      active_injuries: injuries,
    });
  })
);

router.post(
  "/matches/:matchId/finalize-ranking",
  asyncHandler(async (req, res) => {
    const [match] = await query("SELECT * FROM matches WHERE id = ?", [req.params.matchId]);

    if (!match || !match.season_id || !match.result) {
      return res.status(400).json({ message: "Match must exist and include season_id plus result" });
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
      [match.team_id, match.season_id]
    );

    await query(
      `INSERT INTO team_rankings
        (team_id, season_id, ranking_position, wins, losses, win_percentage, points_for, points_against, point_difference)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        wins = VALUES(wins),
        losses = VALUES(losses),
        win_percentage = VALUES(win_percentage),
        points_for = VALUES(points_for),
        points_against = VALUES(points_against),
        point_difference = VALUES(point_difference),
        calculated_at = CURRENT_TIMESTAMP`,
      [
        match.team_id,
        match.season_id,
        req.body.ranking_position || 1,
        summary.wins || 0,
        summary.losses || 0,
        summary.win_percentage || 0,
        summary.points_for || 0,
        summary.points_against || 0,
        summary.point_difference || 0,
      ]
    );

    const [ranking] = await query("SELECT * FROM team_rankings WHERE team_id = ? AND season_id = ?", [
      match.team_id,
      match.season_id,
    ]);

    res.json(ranking);
  })
);

module.exports = router;
