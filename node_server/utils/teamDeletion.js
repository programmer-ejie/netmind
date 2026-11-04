const teamSeasons = "SELECT id FROM seasons WHERE team_id = ?";
const teamMatches = `SELECT id FROM matches WHERE team_id = ? OR season_id IN (${teamSeasons})`;
const TEAM_DELETE_STEPS = [
  ["training_schedule_qr_tokens", "training_schedule_id IN (SELECT id FROM training_schedules WHERE team_id = ?)", 1],
  ["performance_logs", `match_id IN (${teamMatches}) OR season_id IN (${teamSeasons})`, 3],
  ["attendance_logs", `team_id = ? OR match_id IN (${teamMatches})`, 3],
  ["lineups", `team_id = ? OR match_id IN (${teamMatches})`, 3],
  ["match_scores", `match_id IN (${teamMatches})`, 2],
  ["team_rankings", `team_id = ? OR season_id IN (${teamSeasons})`, 2],
  ["player_comparisons", `team_id = ? OR season_id IN (${teamSeasons})`, 2],
  ["matches", `team_id = ? OR season_id IN (${teamSeasons})`, 2],
  ["training_schedules", "team_id = ?", 1],
  ["seasons", "team_id = ?", 1],
  ["team_members", "team_id = ?", 1],
  ["team_trainers", "team_id = ?", 1],
];

async function deleteTeamById(pool, teamId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [teams] = await connection.execute("SELECT id FROM teams WHERE id = ? FOR UPDATE", [teamId]);
    if (!teams.length) {
      await connection.rollback();
      return { affectedRows: 0 };
    }

    // Lock parents before removing their children to prevent concurrent inserts.
    await connection.execute("SELECT id FROM seasons WHERE team_id = ? FOR UPDATE", [teamId]);
    await connection.execute(`SELECT id FROM matches WHERE team_id = ? OR season_id IN (${teamSeasons}) FOR UPDATE`, [teamId, teamId]);
    await connection.execute("SELECT id FROM training_schedules WHERE team_id = ? FOR UPDATE", [teamId]);
    for (const [table, condition, count] of TEAM_DELETE_STEPS) {
      await connection.execute(`DELETE FROM ${table} WHERE ${condition}`, Array(count).fill(teamId));
    }
    const [result] = await connection.execute("DELETE FROM teams WHERE id = ?", [teamId]);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { TEAM_DELETE_STEPS, deleteTeamById };
