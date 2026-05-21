const TRAINER_DELETE_STEPS = [
  {
    table: "drill_performance_logs",
    sql: `DELETE FROM drill_performance_logs
      WHERE training_assignment_id IN (
        SELECT id FROM training_assignments WHERE assigned_by = ?
      )`,
    params: (trainerId) => [trainerId],
  },
  {
    table: "training_assignments",
    sql: "DELETE FROM training_assignments WHERE assigned_by = ?",
    params: (trainerId) => [trainerId],
  },
  {
    table: "attendance_logs",
    sql: "DELETE FROM attendance_logs WHERE marked_by = ?",
    params: (trainerId) => [trainerId],
  },
  {
    table: "injury_logs",
    sql: "DELETE FROM injury_logs WHERE reported_by = ?",
    params: (trainerId) => [trainerId],
  },
  {
    table: "training_schedule_qr_tokens",
    sql: "UPDATE training_schedule_qr_tokens SET created_by = NULL WHERE created_by = ?",
    params: (trainerId) => [trainerId],
  },
  {
    table: "training_schedules",
    sql: "UPDATE training_schedules SET created_by = NULL WHERE created_by = ?",
    params: (trainerId) => [trainerId],
  },
  {
    table: "drills",
    sql: "UPDATE drills SET created_by = NULL WHERE created_by = ?",
    params: (trainerId) => [trainerId],
  },
  {
    table: "team_trainers",
    sql: "DELETE FROM team_trainers WHERE trainer_id = ? OR assigned_by = ?",
    params: (trainerId) => [trainerId, trainerId],
  },
  {
    table: "coach_trainers",
    sql: "DELETE FROM coach_trainers WHERE trainer_id = ?",
    params: (trainerId) => [trainerId],
  },
  {
    table: "notifications",
    sql: "DELETE FROM notifications WHERE recipient_user_id = ? OR actor_user_id = ?",
    params: (trainerId) => [trainerId, trainerId],
  },
  {
    table: "push_subscriptions",
    sql: "DELETE FROM push_subscriptions WHERE user_id = ?",
    params: (trainerId) => [trainerId],
  },
];

async function deleteTrainerData(connection, trainerId) {
  for (const step of TRAINER_DELETE_STEPS) {
    await connection.execute(step.sql, step.params(trainerId));
  }
}

async function deleteTrainerById(connection, trainerId) {
  const [trainers] = await connection.execute(
    "SELECT id FROM users WHERE id = ? AND role = 'trainer' FOR UPDATE",
    [trainerId]
  );
  const trainer = trainers[0];

  if (!trainer) return false;

  await deleteTrainerData(connection, trainer.id);

  const [result] = await connection.execute(
    "DELETE FROM users WHERE id = ? AND role = 'trainer'",
    [trainer.id]
  );

  return Boolean(result.affectedRows);
}

module.exports = {
  TRAINER_DELETE_STEPS,
  deleteTrainerById,
  deleteTrainerData,
};
