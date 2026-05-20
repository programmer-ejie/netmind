const { query } = require("../config/db");

let io = null;

function setSocketServer(server) {
  io = server;
}

function uniqueIds(values) {
  return [...new Set(values.map((value) => Number(value)).filter(Boolean))];
}

function parseData(value) {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function getUsersByIds(userIds) {
  const ids = uniqueIds(userIds);
  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(", ");
  return query(
    `SELECT id, name, email, role FROM users WHERE id IN (${placeholders}) AND is_active = TRUE`,
    ids
  );
}

async function isConnected(userId) {
  if (!io) return false;

  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
}

async function canReceiveNotification(recipient, actor, data = {}) {
  if (!recipient || !actor || Number(recipient.id) === Number(actor.id)) return false;

  const actorId = Number(actor.id);
  const recipientId = Number(recipient.id);
  const playerId = Number(data.playerId || data.player_id || 0);
  const teamId = Number(data.teamId || data.team_id || 0);

  if (recipient.role === "coach") {
    if (actor.role === "trainer") {
      const rows = await query(
        `SELECT 1
        FROM coach_trainers
        WHERE coach_id = ? AND trainer_id = ?
        UNION
        SELECT 1
        FROM team_trainers tt
        JOIN teams t ON t.id = tt.team_id
        WHERE t.coach_id = ? AND tt.trainer_id = ?
        LIMIT 1`,
        [recipientId, actorId, recipientId, actorId]
      );
      return rows.length > 0;
    }

    if (actor.role === "player" || playerId) {
      const rows = await query(
        `SELECT 1
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE t.coach_id = ?
          AND tm.player_id = ?
          AND tm.is_active = TRUE
        LIMIT 1`,
        [recipientId, playerId || actorId]
      );
      return rows.length > 0;
    }
  }

  if (recipient.role === "trainer") {
    if (actor.role === "coach") {
      const rows = await query(
        `SELECT 1
        FROM coach_trainers ct
        WHERE ct.coach_id = ? AND ct.trainer_id = ?
        UNION
        SELECT 1
        FROM team_trainers tt
        JOIN teams t ON t.id = tt.team_id
        WHERE t.coach_id = ? AND tt.trainer_id = ?
        LIMIT 1`,
        [actorId, recipientId, actorId, recipientId]
      );
      return rows.length > 0;
    }

    if (actor.role === "player" || playerId) {
      const rows = await query(
        `SELECT 1
        FROM team_trainers tt
        JOIN team_members tm ON tm.team_id = tt.team_id
        WHERE tt.trainer_id = ?
          AND tm.player_id = ?
          AND tm.is_active = TRUE
        LIMIT 1`,
        [recipientId, playerId || actorId]
      );
      return rows.length > 0;
    }
  }

  if (recipient.role === "player") {
    if (actor.role === "coach") {
      const rows = await query(
        `SELECT 1
        FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.player_id = ?
          AND t.coach_id = ?
          AND tm.is_active = TRUE
        LIMIT 1`,
        [recipientId, actorId]
      );
      return rows.length > 0;
    }

    if (actor.role === "trainer") {
      const rows = await query(
        `SELECT 1
        FROM team_members tm
        JOIN team_trainers tt ON tt.team_id = tm.team_id
        WHERE tm.player_id = ?
          AND tt.trainer_id = ?
          AND tm.is_active = TRUE
        LIMIT 1`,
        [recipientId, actorId]
      );
      return rows.length > 0;
    }
  }

  if (teamId) {
    const rows = await query(
      `SELECT 1
      FROM team_members tm
      LEFT JOIN team_trainers tt ON tt.team_id = tm.team_id
      LEFT JOIN teams t ON t.id = tm.team_id
      WHERE tm.team_id = ?
        AND (tm.player_id = ? OR tt.trainer_id = ? OR t.coach_id = ?)
      LIMIT 1`,
      [teamId, recipientId, recipientId, recipientId]
    );
    return rows.length > 0;
  }

  return false;
}

async function sendExpoPush(subscription, notification) {
  const token = subscription.push_token || subscription.endpoint;
  if (!token || !String(token).startsWith("ExponentPushToken")) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      title: notification.title,
      body: notification.body,
      sound: "default",
      priority: "high",
      channelId: "realtime-notifications",
      data: notification.data || {},
    }),
  });
}

async function sendPushFallback(userId, notification) {
  const subscriptions = await query(
    "SELECT * FROM push_subscriptions WHERE user_id = ? AND is_active = TRUE",
    [userId]
  );

  await Promise.allSettled(subscriptions.map((subscription) => sendExpoPush(subscription, notification)));
}

async function createNotifications({ actorId, recipientIds, type, title, body, data = {} }) {
  const recipients = await getUsersByIds(recipientIds);
  const [actor] = await getUsersByIds([actorId]);
  if (!actor || !recipients.length) return [];

  const delivered = [];

  for (const recipient of recipients) {
    if (!(await canReceiveNotification(recipient, actor, data))) continue;

    const result = await query(
      `INSERT INTO notifications
        (recipient_user_id, actor_user_id, type, title, body, data)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [recipient.id, actor.id, type, title, body, JSON.stringify(data || {})]
    );
    const [notification] = await query("SELECT * FROM notifications WHERE id = ?", [result.insertId]);
    const payload = {
      ...notification,
      data: parseData(notification.data),
    };

    if (io) {
      io.to(`user:${recipient.id}`).emit("notifications:new", payload);
    }

    if (!(await isConnected(recipient.id))) {
      await sendPushFallback(recipient.id, payload);
    }

    delivered.push(payload);
  }

  return delivered;
}

async function getTeamNotificationRecipients(teamId, { includeCoach = false } = {}) {
  const rows = await query(
    `SELECT tm.player_id AS user_id
    FROM team_members tm
    WHERE tm.team_id = ? AND tm.is_active = TRUE
    UNION
    SELECT tt.trainer_id AS user_id
    FROM team_trainers tt
    WHERE tt.team_id = ?
    ${includeCoach ? "UNION SELECT coach_id AS user_id FROM teams WHERE id = ?" : ""}`,
    includeCoach ? [teamId, teamId, teamId] : [teamId, teamId]
  );
  return rows.map((row) => row.user_id);
}

async function getPlayerStaffRecipients(playerId) {
  const rows = await query(
    `SELECT t.coach_id AS user_id
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.player_id = ? AND tm.is_active = TRUE
    UNION
    SELECT tt.trainer_id AS user_id
    FROM team_members tm
    JOIN team_trainers tt ON tt.team_id = tm.team_id
    WHERE tm.player_id = ? AND tm.is_active = TRUE`,
    [playerId, playerId]
  );
  return rows.map((row) => row.user_id);
}

async function getActorNetworkRecipients(actor) {
  if (!actor?.id) return [];

  if (actor.role === "coach") {
    const rows = await query(
      `SELECT tm.player_id AS user_id
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE t.coach_id = ? AND tm.is_active = TRUE
      UNION
      SELECT trainer_id AS user_id
      FROM coach_trainers
      WHERE coach_id = ?
      UNION
      SELECT tt.trainer_id AS user_id
      FROM team_trainers tt
      JOIN teams t ON t.id = tt.team_id
      WHERE t.coach_id = ?`,
      [actor.id, actor.id, actor.id]
    );
    return rows.map((row) => row.user_id);
  }

  if (actor.role === "trainer") {
    const rows = await query(
      `SELECT t.coach_id AS user_id
      FROM team_trainers tt
      JOIN teams t ON t.id = tt.team_id
      WHERE tt.trainer_id = ?
      UNION
      SELECT coach_id AS user_id
      FROM coach_trainers
      WHERE trainer_id = ?
      UNION
      SELECT tm.player_id AS user_id
      FROM team_members tm
      JOIN team_trainers tt ON tt.team_id = tm.team_id
      WHERE tt.trainer_id = ? AND tm.is_active = TRUE`,
      [actor.id, actor.id, actor.id]
    );
    return rows.map((row) => row.user_id);
  }

  if (actor.role === "player") {
    return getPlayerStaffRecipients(actor.id);
  }

  return [];
}

module.exports = {
  canReceiveNotification,
  createNotifications,
  getActorNetworkRecipients,
  getPlayerStaffRecipients,
  getTeamNotificationRecipients,
  setSocketServer,
};
