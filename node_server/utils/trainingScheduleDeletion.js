async function deleteTrainingScheduleById(pool, scheduleId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [schedules] = await connection.execute(
      "SELECT id FROM training_schedules WHERE id = ? FOR UPDATE",
      [scheduleId]
    );
    if (!schedules.length) {
      await connection.rollback();
      return { affectedRows: 0 };
    }

    await connection.execute("DELETE FROM training_schedule_qr_tokens WHERE training_schedule_id = ?", [scheduleId]);
    const [result] = await connection.execute("DELETE FROM training_schedules WHERE id = ?", [scheduleId]);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { deleteTrainingScheduleById };
