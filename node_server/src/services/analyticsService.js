const { query } = require("../../config/db");
const ApiError = require("../../utils/apiError");

async function getTeamRoster(teamId) {
  return query(
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
    [teamId]
  );
}

async function getTeamDashboard(teamId) {
  const [team] = await query("SELECT * FROM teams WHERE id = ?", [teamId]);
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
    [teamId]
  );
  const attendance = await query(
    `SELECT status, COUNT(*) AS total
    FROM attendance_logs
    WHERE team_id = ?
    GROUP BY status`,
    [teamId]
  );
  const rankings = await query(
    `SELECT tr.*, s.season_name
    FROM team_rankings tr
    JOIN seasons s ON s.id = tr.season_id
    WHERE tr.team_id = ?
    ORDER BY tr.calculated_at DESC
    LIMIT 5`,
    [teamId]
  );

  return {
    team,
    record,
    attendance,
    rankings,
  };
}

async function getPlayerSummary(playerId, seasonId) {
  const params = [playerId];
  const seasonSql = seasonId ? "AND season_id = ?" : "";

  if (seasonId) {
    params.push(seasonId);
  }

  const [player] = await query(
    "SELECT id, name, email, role, position, jersey_number, age, birthdate, location, profile_picture_url, profile_picture_file_id, is_active, created_at FROM users WHERE id = ?",
    [playerId]
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
      AVG(rpe) AS avg_rpe,
      AVG(energy_level) AS avg_energy_level,
      AVG(confidence_level) AS avg_confidence_level,
      AVG(focus_level) AS avg_focus_level,
      MAX(created_at) AS last_logged_at
    FROM performance_logs
    WHERE user_id = ? ${seasonSql}`,
    params
  );
  const [checkins] = await query(
    `SELECT
      AVG(fatigue_level) AS avg_fatigue,
      AVG(sleep_hours) AS avg_sleep_hours,
      MAX(checkin_date) AS last_checkin_date
    FROM wellness_checkins
    WHERE player_id = ?`,
    [playerId]
  );
  const [training] = await query(
    `SELECT
      COUNT(*) AS total_assignments,
      SUM(status = 'completed') AS completed,
      SUM(status = 'overdue') AS overdue
    FROM training_assignments
    WHERE player_id = ?
      AND assigned_by IN (
        SELECT tt.trainer_id
        FROM team_trainers tt
        JOIN team_members tm ON tm.team_id = tt.team_id
        WHERE tm.player_id = ? AND tm.is_active = TRUE
      )
      AND EXISTS (
        SELECT 1 FROM drills owner_drill
        WHERE owner_drill.id = training_assignments.drill_id
          AND owner_drill.created_by = training_assignments.assigned_by
      )`,
    [playerId, playerId]
  );
  const [drills] = await query(
    `SELECT
      AVG(
        CASE
          WHEN COALESCE(success_count, 0) + COALESCE(failure_count, 0) > 0
          THEN (success_count / (success_count + failure_count)) * 100
          ELSE NULL
        END
      ) AS avg_success_rate,
      SUM(reps_completed) AS total_reps
    FROM drill_performance_logs
    WHERE player_id = ?`,
    [playerId]
  );
  const injuries = await query(
    `SELECT *
    FROM injury_logs
    WHERE player_id = ? AND recovered_at IS NULL
    ORDER BY occurred_at DESC`,
    [playerId]
  );

  return {
    player,
    actions,
    wellness: {
      ...wellness,
      avg_fatigue: checkins.avg_fatigue,
      avg_sleep_hours: checkins.avg_sleep_hours,
      last_checkin_date: checkins.last_checkin_date,
    },
    training,
    drills,
    active_injuries: injuries,
  };
}

async function finalizeMatchRanking(matchId, rankingPosition = 1) {
  const [match] = await query("SELECT * FROM matches WHERE id = ?", [matchId]);

  if (!match || !match.season_id || !match.result) {
    throw new ApiError(400, "Match must exist and include season_id plus result");
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
      rankingPosition,
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

  return ranking;
}

module.exports = {
  finalizeMatchRanking,
  getPlayerSummary,
  getTeamDashboard,
  getTeamRoster,
};
