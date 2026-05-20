const PLAYER_DELETE_STEPS = [
  {
    table: "drill_performance_logs",
    sql: `DELETE FROM drill_performance_logs
      WHERE player_id = ?
        OR training_assignment_id IN (
          SELECT id FROM training_assignments WHERE player_id = ?
        )`,
    params: (playerId) => [playerId, playerId],
  },
  {
    table: "training_assignments",
    sql: "DELETE FROM training_assignments WHERE player_id = ?",
    params: (playerId) => [playerId],
  },
  {
    table: "performance_logs",
    sql: "DELETE FROM performance_logs WHERE user_id = ?",
    params: (playerId) => [playerId],
  },
  {
    table: "wellness_checkins",
    sql: "DELETE FROM wellness_checkins WHERE player_id = ?",
    params: (playerId) => [playerId],
  },
  {
    table: "attendance_logs",
    sql: "DELETE FROM attendance_logs WHERE player_id = ?",
    params: (playerId) => [playerId],
  },
  {
    table: "injury_logs",
    sql: "DELETE FROM injury_logs WHERE player_id = ?",
    params: (playerId) => [playerId],
  },
  {
    table: "team_members",
    sql: "DELETE FROM team_members WHERE player_id = ?",
    params: (playerId) => [playerId],
  },
];

async function deletePlayerData(connection, playerId) {
  for (const step of PLAYER_DELETE_STEPS) {
    await connection.execute(step.sql, step.params(playerId));
  }
}

async function deletePlayerById(connection, playerId) {
  const [players] = await connection.execute(
    "SELECT id FROM users WHERE id = ? AND role = 'player' FOR UPDATE",
    [playerId]
  );
  const player = players[0];

  if (!player) return false;

  await deletePlayerData(connection, player.id);

  const [result] = await connection.execute(
    "DELETE FROM users WHERE id = ? AND role = 'player'",
    [player.id]
  );

  return Boolean(result.affectedRows);
}

module.exports = {
  PLAYER_DELETE_STEPS,
  deletePlayerById,
  deletePlayerData,
};
