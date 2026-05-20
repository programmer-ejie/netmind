const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

function forbid(res) {
  return res.status(403).json({ message: "You do not have permission for this resource" });
}

function isSelf(user, userId) {
  return String(user.id) === String(userId);
}

async function canAccessTeam(user, teamId) {
  if (!teamId) return false;

  if (user.role === "coach") {
    const rows = await query("SELECT id FROM teams WHERE id = ? AND coach_id = ? LIMIT 1", [teamId, user.id]);
    return rows.length > 0;
  }

  if (user.role === "trainer") {
    const rows = await query(
      "SELECT id FROM team_trainers WHERE team_id = ? AND trainer_id = ? LIMIT 1",
      [teamId, user.id]
    );
    return rows.length > 0;
  }

  if (user.role === "player") {
    const rows = await query(
      "SELECT id FROM team_members WHERE team_id = ? AND player_id = ? AND is_active = TRUE LIMIT 1",
      [teamId, user.id]
    );
    return rows.length > 0;
  }

  return false;
}

async function canManageTeam(user, teamId) {
  if (!teamId || user.role !== "coach") return false;

  const rows = await query("SELECT id FROM teams WHERE id = ? AND coach_id = ? LIMIT 1", [teamId, user.id]);
  return rows.length > 0;
}

async function canAccessMatch(user, matchId) {
  if (!matchId) return false;

  if (user.role === "coach") {
    const rows = await query(
      `SELECT m.id
      FROM matches m
      LEFT JOIN teams home_team ON home_team.id = m.team_id
      LEFT JOIN teams opponent_team ON opponent_team.team_name = m.opponent_name
      WHERE m.id = ? AND (home_team.coach_id = ? OR opponent_team.coach_id = ?)
      LIMIT 1`,
      [matchId, user.id, user.id]
    );
    return rows.length > 0;
  }

  if (user.role === "trainer") {
    const rows = await query(
      `SELECT m.id
      FROM matches m
      LEFT JOIN teams home_team ON home_team.id = m.team_id
      LEFT JOIN teams opponent_team ON opponent_team.team_name = m.opponent_name
      LEFT JOIN team_trainers home_tt ON home_tt.team_id = home_team.id
      LEFT JOIN team_trainers opponent_tt ON opponent_tt.team_id = opponent_team.id
      WHERE m.id = ? AND (home_tt.trainer_id = ? OR opponent_tt.trainer_id = ?)
      LIMIT 1`,
      [matchId, user.id, user.id]
    );
    return rows.length > 0;
  }

  if (user.role === "player") {
    const rows = await query(
      `SELECT m.id
      FROM matches m
      LEFT JOIN teams home_team ON home_team.id = m.team_id
      LEFT JOIN teams opponent_team ON opponent_team.team_name = m.opponent_name
      LEFT JOIN team_members home_tm ON home_tm.team_id = home_team.id
      LEFT JOIN team_members opponent_tm ON opponent_tm.team_id = opponent_team.id
      WHERE m.id = ?
        AND (
          (home_tm.player_id = ? AND home_tm.is_active = TRUE)
          OR (opponent_tm.player_id = ? AND opponent_tm.is_active = TRUE)
        )
      LIMIT 1`,
      [matchId, user.id, user.id]
    );
    return rows.length > 0;
  }

  return false;
}

async function canAccessPlayer(user, playerId) {
  if (!playerId) return false;
  if (isSelf(user, playerId)) return true;

  if (user.role === "coach") {
    const rows = await query(
      `SELECT tm.id
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.player_id = ? AND t.coach_id = ?
      LIMIT 1`,
      [playerId, user.id]
    );
    return rows.length > 0;
  }

  if (user.role === "trainer") {
    const rows = await query(
      `SELECT tm.id
      FROM team_members tm
      JOIN team_trainers tt ON tt.team_id = tm.team_id
      WHERE tm.player_id = ? AND tt.trainer_id = ?
      LIMIT 1`,
      [playerId, user.id]
    );
    return rows.length > 0;
  }

  return false;
}

async function canAccessCoach(user, coachId) {
  if (!coachId) return false;
  if (user.role === "coach") return isSelf(user, coachId);

  if (user.role === "trainer") {
    const rows = await query(
      "SELECT id FROM coach_trainers WHERE coach_id = ? AND trainer_id = ? LIMIT 1",
      [coachId, user.id]
    );
    return rows.length > 0;
  }

  return false;
}

async function getTeamIdForRecord(table, id) {
  const joins = {
    seasons: "SELECT team_id FROM seasons WHERE id = ? LIMIT 1",
    matches: "SELECT team_id FROM matches WHERE id = ? LIMIT 1",
    team_rankings: "SELECT team_id FROM team_rankings WHERE id = ? LIMIT 1",
    training_schedules: "SELECT team_id FROM training_schedules WHERE id = ? LIMIT 1",
    attendance_logs: "SELECT team_id FROM attendance_logs WHERE id = ? LIMIT 1",
    lineups: "SELECT team_id FROM lineups WHERE id = ? LIMIT 1",
    player_comparisons: "SELECT team_id FROM player_comparisons WHERE id = ? LIMIT 1",
    match_scores: "SELECT m.team_id FROM match_scores ms JOIN matches m ON m.id = ms.match_id WHERE ms.id = ? LIMIT 1",
  };

  const sql = joins[table];
  if (!sql) return null;

  const rows = await query(sql, [id]);
  return rows[0]?.team_id || null;
}

async function getPlayerIdForRecord(table, id) {
  const queries = {
    training_assignments: "SELECT player_id FROM training_assignments WHERE id = ? LIMIT 1",
    drill_performance_logs: "SELECT player_id FROM drill_performance_logs WHERE id = ? LIMIT 1",
    wellness_checkins: "SELECT player_id FROM wellness_checkins WHERE id = ? LIMIT 1",
    injury_logs: "SELECT player_id FROM injury_logs WHERE id = ? LIMIT 1",
    performance_logs: "SELECT user_id AS player_id FROM performance_logs WHERE id = ? LIMIT 1",
  };

  const sql = queries[table];
  if (!sql) return null;

  const rows = await query(sql, [id]);
  return rows[0]?.player_id || null;
}

async function canAccessRecord(user, table, id) {
  if (table === "users") {
    if (isSelf(user, id)) return true;

    const rows = await query("SELECT role FROM users WHERE id = ? LIMIT 1", [id]);
    const target = rows[0];
    if (!target) return false;
    if (target.role === "player") return canAccessPlayer(user, id);
    if (target.role === "coach") return canAccessCoach(user, id);
    if (target.role === "trainer") {
      if (user.role === "coach") {
        const links = await query(
          `SELECT trainer_id FROM coach_trainers WHERE coach_id = ? AND trainer_id = ?
          UNION
          SELECT tt.trainer_id
          FROM team_trainers tt
          JOIN teams t ON t.id = tt.team_id
          WHERE t.coach_id = ? AND tt.trainer_id = ?
          LIMIT 1`,
          [user.id, id, user.id, id]
        );
        return links.length > 0;
      }
      return false;
    }
    return false;
  }

  if (table === "teams") {
    return canAccessTeam(user, id);
  }

  if (table === "matches") {
    return canAccessMatch(user, id);
  }

  if (table === "match_scores") {
    const rows = await query("SELECT match_id FROM match_scores WHERE id = ? LIMIT 1", [id]);
    return rows[0]?.match_id ? canAccessMatch(user, rows[0].match_id) : false;
  }

  if (table === "team_members") {
    const rows = await query("SELECT team_id, player_id FROM team_members WHERE id = ? LIMIT 1", [id]);
    const row = rows[0];
    return row ? (await canAccessTeam(user, row.team_id)) || (await canAccessPlayer(user, row.player_id)) : false;
  }

  if (table === "team_trainers") {
    const rows = await query("SELECT team_id, trainer_id FROM team_trainers WHERE id = ? LIMIT 1", [id]);
    const row = rows[0];
    return row ? (await canAccessTeam(user, row.team_id)) || isSelf(user, row.trainer_id) : false;
  }

  if (table === "coach_trainers") {
    const rows = await query("SELECT coach_id, trainer_id FROM coach_trainers WHERE id = ? LIMIT 1", [id]);
    const row = rows[0];
    return row ? (await canAccessCoach(user, row.coach_id)) || isSelf(user, row.trainer_id) : false;
  }

  const teamId = await getTeamIdForRecord(table, id);
  if (teamId) return canAccessTeam(user, teamId);

  const playerId = await getPlayerIdForRecord(table, id);
  if (playerId) return canAccessPlayer(user, playerId);

  if (table === "drills") {
    const rows = await query("SELECT created_by, is_public FROM drills WHERE id = ? LIMIT 1", [id]);
    const row = rows[0];
    if (!row) return false;
    if (user.role === "trainer") return isSelf(user, row.created_by);
    return Boolean(row.is_public) || isSelf(user, row.created_by);
  }

  return false;
}

async function canMutateRecord(user, table, id) {
  if (table === "users") {
    if (isSelf(user, id)) return true;

    if (user.role === "coach") {
      const rows = await query("SELECT role FROM users WHERE id = ? LIMIT 1", [id]);
      const target = rows[0];

      if (!target) return false;
      if (target.role === "player") return canAccessPlayer(user, id);
      if (target.role === "trainer") return canAccessRecord(user, table, id);
    }

    return false;
  }
  if (table === "teams") return canManageTeam(user, id);
  if (table === "drills") {
    const rows = await query("SELECT created_by FROM drills WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? isSelf(user, rows[0].created_by) : false;
  }
  if (table === "matches") {
    const teamId = await getTeamIdForRecord(table, id);
    return teamId ? user.role !== "player" && canManageTeam(user, teamId) : false;
  }
  if (table === "match_scores") {
    const rows = await query("SELECT match_id FROM match_scores WHERE id = ? LIMIT 1", [id]);
    return rows[0]?.match_id ? user.role !== "player" && canAccessMatch(user, rows[0].match_id) : false;
  }
  if (table === "team_members") {
    const rows = await query("SELECT team_id FROM team_members WHERE id = ? LIMIT 1", [id]);
    return rows[0]?.team_id ? canManageTeam(user, rows[0].team_id) : false;
  }
  if (table === "team_trainers") {
    const rows = await query("SELECT team_id FROM team_trainers WHERE id = ? LIMIT 1", [id]);
    return rows[0]?.team_id ? canManageTeam(user, rows[0].team_id) : false;
  }
  if (table === "coach_trainers") {
    const rows = await query("SELECT coach_id FROM coach_trainers WHERE id = ? LIMIT 1", [id]);
    return rows[0]?.coach_id ? isSelf(user, rows[0].coach_id) : false;
  }

  const teamId = await getTeamIdForRecord(table, id);
  if (teamId) return user.role !== "player" && (await canAccessTeam(user, teamId));

  const playerId = await getPlayerIdForRecord(table, id);
  if (playerId) return canAccessPlayer(user, playerId);

  return canAccessRecord(user, table, id);
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return forbid(res);
    }

    return next();
  };
}

function requireSelf(paramName) {
  return (req, res, next) => {
    if (!isSelf(req.user, req.params[paramName])) {
      return forbid(res);
    }

    return next();
  };
}

function requireTeamAccess(paramName = "teamId", options = {}) {
  return asyncHandler(async (req, res, next) => {
    const allowed = options.manage
      ? await canManageTeam(req.user, req.params[paramName])
      : await canAccessTeam(req.user, req.params[paramName]);

    if (!allowed) {
      return forbid(res);
    }

    return next();
  });
}

function authorizeKnownApiAccess() {
  return asyncHandler(async (req, res, next) => {
    const path = req.path;
    const method = req.method;

    if (path === "/routes") return next();
    if (path === "/database/export") {
      return req.user.role === "coach" ? next() : forbid(res);
    }

    let match = path.match(/^\/teams\/([^/]+)\/(dashboard|roster|attendance|rankings|player-comparisons)$/);
    if (match) {
      return (await canAccessTeam(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/teams\/([^/]+)\/player-comparisons\/generate$/);
    if (match) {
      return req.user.role === "coach" && (await canManageTeam(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/teams\/([^/]+)\/(members|trainers|seasons|matches|lineups)$/);
    if (match) {
      const teamId = match[1];
      const isWrite = ["POST", "PATCH", "DELETE"].includes(method);
      const allowed = isWrite ? await canManageTeam(req.user, teamId) : await canAccessTeam(req.user, teamId);
      return allowed ? next() : forbid(res);
    }

    match = path.match(/^\/teams\/([^/]+)\/members\/([^/]+)\/status$/);
    if (match) {
      return (await canManageTeam(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/teams\/([^/]+)\/members\/([^/]+)$/);
    if (match) {
      return (await canManageTeam(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/teams\/([^/]+)\/trainers\/([^/]+)$/);
    if (match) {
      return (await canManageTeam(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/coaches\/([^/]+)\/trainers(?:\/([^/]+))?$/);
    if (match) {
      if (method !== "GET" && !isSelf(req.user, match[1])) return forbid(res);
      return (await canAccessCoach(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/players\/([^/]+)(?:\/(summary|training-assignments|performance-logs|wellness-checkins|attendance|injuries))?$/);
    if (match) {
      if (!match[2] && method === "DELETE") {
        return req.user.role === "coach" && (await canAccessPlayer(req.user, match[1])) ? next() : forbid(res);
      }
      return (await canAccessPlayer(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/users\/([^/]+)\/password(?:-code(?:\/verify)?|-with-code)?$/);
    if (match) {
      return isSelf(req.user, match[1]) ? next() : forbid(res);
    }

    match = path.match(/^\/users\/([^/]+)\/profile-picture$/);
    if (match) {
      return isSelf(req.user, match[1]) || (await canAccessPlayer(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/teams\/([^/]+)\/logo$/);
    if (match) {
      return req.user.role !== "player" && (await canAccessTeam(req.user, match[1])) ? next() : forbid(res);
    }

    match = path.match(/^\/seasons\/([^/]+)\/activate$/);
    if (match) {
      const teamId = await getTeamIdForRecord("seasons", match[1]);
      return teamId && (await canManageTeam(req.user, teamId)) ? next() : forbid(res);
    }

    match = path.match(/^\/matches\/([^/]+)\/(score|finalize-ranking|performance-logs)$/);
    if (match) {
      const allowed = match[2] === "performance-logs"
        ? await canAccessMatch(req.user, match[1])
        : req.user.role !== "player" && (await canAccessMatch(req.user, match[1]));
      return allowed ? next() : forbid(res);
    }

    match = path.match(/^\/drills\/([^/]+)\/assign$/);
    if (match) {
      return req.user.role !== "player" && (await canAccessPlayer(req.user, req.body.player_id)) ? next() : forbid(res);
    }

    match = path.match(/^\/training-assignments\/([^/]+)\/(status|logs)$/);
    if (match) {
      const rows = await query(
        "SELECT player_id, assigned_by FROM training_assignments WHERE id = ? LIMIT 1",
        [match[1]]
      );
      const assignment = rows[0];
      if (!assignment) return forbid(res);
      if (req.user.role === "trainer" && !isSelf(req.user, assignment.assigned_by)) return forbid(res);
      if (req.user.role !== "coach") {
        const ownerDrills = await query(
          "SELECT id FROM drills WHERE id = (SELECT drill_id FROM training_assignments WHERE id = ? LIMIT 1) AND created_by = ? LIMIT 1",
          [match[1], assignment.assigned_by]
        );
        if (!ownerDrills.length) return forbid(res);
      }
      return (await canAccessPlayer(req.user, assignment.player_id)) ? next() : forbid(res);
    }

    match = path.match(/^\/attendance-logs\/bulk$/);
    if (match) {
      if (req.user.role === "player" || !Array.isArray(req.body.logs)) return forbid(res);
      for (const log of req.body.logs) {
        if (!(await canAccessTeam(req.user, log.team_id)) || !(await canAccessPlayer(req.user, log.player_id))) {
          return forbid(res);
        }
      }
      return next();
    }

    match = path.match(/^\/training-schedules\/([^/]+)\/(qr-token|attendance-check)$/);
    if (match) {
      const teamId = await getTeamIdForRecord("training_schedules", match[1]);
      const allowed = match[2] === "qr-token"
        ? teamId && req.user.role !== "player" && (await canAccessTeam(req.user, teamId))
        : teamId && (await canAccessTeam(req.user, teamId));
      return allowed ? next() : forbid(res);
    }

    match = path.match(/^\/injury-logs\/([^/]+)\/recover$/);
    if (match) {
      const playerId = await getPlayerIdForRecord("injury_logs", match[1]);
      return playerId && req.user.role !== "player" && (await canAccessPlayer(req.user, playerId)) ? next() : forbid(res);
    }

    match = path.match(/^\/seasons\/([^/]+)\/rankings\/recalculate$/);
    if (match) {
      return req.body.team_id && req.user.role !== "player" && (await canAccessTeam(req.user, req.body.team_id))
        ? next()
        : forbid(res);
    }

    return next();
  });
}

function requirePlayerAccess(paramName = "playerId") {
  return asyncHandler(async (req, res, next) => {
    if (!(await canAccessPlayer(req.user, req.params[paramName]))) {
      return forbid(res);
    }

    return next();
  });
}

function requireCoachAccess(paramName = "coachId") {
  return asyncHandler(async (req, res, next) => {
    if (!(await canAccessCoach(req.user, req.params[paramName]))) {
      return forbid(res);
    }

    return next();
  });
}

module.exports = {
  canAccessMatch,
  canAccessCoach,
  canAccessPlayer,
  canAccessRecord,
  canAccessTeam,
  canManageTeam,
  canMutateRecord,
  forbid,
  isSelf,
  requireCoachAccess,
  authorizeKnownApiAccess,
  requirePlayerAccess,
  requireRoles,
  requireSelf,
  requireTeamAccess,
};
