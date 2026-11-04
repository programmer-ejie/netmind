const MATCH_CHILD_TABLES = ["performance_logs", "attendance_logs", "lineups", "match_scores"];

async function deleteMatchById(pool, matchId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [matches] = await connection.execute(
      "SELECT id FROM matches WHERE id = ? FOR UPDATE",
      [matchId]
    );
    if (!matches.length) {
      await connection.rollback();
      return { affectedRows: 0 };
    }

    for (const table of MATCH_CHILD_TABLES) {
      await connection.execute(`DELETE FROM ${table} WHERE match_id = ?`, [matchId]);
    }
    const [result] = await connection.execute("DELETE FROM matches WHERE id = ?", [matchId]);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { MATCH_CHILD_TABLES, deleteMatchById };
