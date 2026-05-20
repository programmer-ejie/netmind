const { query } = require("../config/db");
const ApiError = require("./apiError");
const {
  canAccessMatch,
  canAccessPlayer,
  canAccessRecord,
  canAccessTeam,
  canMutateRecord,
  isSelf,
} = require("../middleware/authorization");

const MAX_LIMIT = 100;
const WRITE_ACTION_LABELS = {
  create: "Create",
  update: "Update",
  delete: "Delete",
};

function toSelect(config) {
  const fields = config.publicFields || ["*"];
  return fields.map((field) => (field === "*" ? "*" : `\`${field}\``)).join(", ");
}

function normalizeBody(config, body, partial = false) {
  const jsonFields = new Set(config.jsonFields || []);
  const payload = {};

  for (const field of config.fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = jsonFields.has(field) && typeof body[field] !== "string" ? JSON.stringify(body[field]) : body[field];
    }
  }

  if (!partial && !Object.keys(payload).length) {
    throw new ApiError(400, "Request body does not include any allowed fields");
  }

  return payload;
}

function getActionPolicy(config, action) {
  const policy = config.writePolicy?.[action];

  if (policy !== undefined) return policy;
  if (action === "create" && config.disableCreate) return false;
  if (action === "update" && config.disableUpdate) return false;
  if (action === "delete" && config.disableDelete) return false;

  return null;
}

function ensureWriteActionAllowed(config, user, action, payload = null) {
  const policy = getActionPolicy(config, action);
  const label = WRITE_ACTION_LABELS[action] || "Write";

  if (!policy) {
    throw new ApiError(405, `${label} is disabled for this resource. Use the dedicated endpoint instead.`);
  }

  if (policy.roles && !policy.roles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission for this resource");
  }

  if (payload && policy.allowedFields) {
    const allowedFields = new Set(policy.allowedFields[user.role] || policy.allowedFields.default || []);
    const unsafeFields = Object.keys(payload).filter((field) => !allowedFields.has(field));

    if (unsafeFields.length) {
      throw new ApiError(403, `Generic ${action} cannot modify: ${unsafeFields.join(", ")}`);
    }
  }
}

function buildWhere(config, queryParams) {
  const clauses = [];
  const values = [];

  for (const field of config.filterFields || []) {
    if (queryParams[field] !== undefined && queryParams[field] !== "") {
      clauses.push(`\`${field}\` = ?`);
      values.push(queryParams[field]);
    }
  }

  if (queryParams.search && config.searchFields?.length) {
    clauses.push(`(${config.searchFields.map((field) => `\`${field}\` LIKE ?`).join(" OR ")})`);
    values.push(...config.searchFields.map(() => `%${queryParams.search}%`));
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

function ownershipScopeFor(config, user) {
  if (!user) return { sql: "1 = 0", values: [] };

  const userId = user.id;

  if (user.role === "coach") {
    const scopes = {
      users: {
        sql: `(\`id\` = ? OR \`id\` IN (
          SELECT tm.player_id FROM team_members tm
          JOIN teams t ON t.id = tm.team_id
          WHERE t.coach_id = ?
        ) OR \`id\` IN (
          SELECT trainer_id FROM coach_trainers WHERE coach_id = ?
        ))`,
        values: [userId, userId, userId],
      },
      teams: { sql: "`coach_id` = ?", values: [userId] },
      team_members: {
        sql: "`team_id` IN (SELECT id FROM teams WHERE coach_id = ?)",
        values: [userId],
      },
      team_trainers: {
        sql: "`team_id` IN (SELECT id FROM teams WHERE coach_id = ?)",
        values: [userId],
      },
      coach_trainers: { sql: "`coach_id` = ?", values: [userId] },
      drills: { sql: "(`is_public` = TRUE OR `created_by` = ?)", values: [userId] },
      training_assignments: {
        sql: "`player_id` IN (SELECT tm.player_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.coach_id = ?)",
        values: [userId],
      },
      drill_performance_logs: {
        sql: "`player_id` IN (SELECT tm.player_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.coach_id = ?)",
        values: [userId],
      },
      performance_logs: {
        sql: "`user_id` IN (SELECT tm.player_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.coach_id = ?)",
        values: [userId],
      },
      wellness_checkins: {
        sql: "`player_id` IN (SELECT tm.player_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.coach_id = ?)",
        values: [userId],
      },
      injury_logs: {
        sql: "`player_id` IN (SELECT tm.player_id FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.coach_id = ?)",
        values: [userId],
      },
    };

    if (scopes[config.table]) return scopes[config.table];
    if (config.table === "matches") {
      return {
        sql: `(\`team_id\` IN (SELECT id FROM teams WHERE coach_id = ?)
          OR \`opponent_name\` IN (SELECT team_name FROM teams WHERE coach_id = ?))`,
        values: [userId, userId],
      };
    }
    if (["seasons", "team_rankings", "training_schedules", "attendance_logs", "lineups", "player_comparisons"].includes(config.table)) {
      return { sql: "`team_id` IN (SELECT id FROM teams WHERE coach_id = ?)", values: [userId] };
    }
    if (config.table === "match_scores") {
      return {
        sql: `\`match_id\` IN (
          SELECT m.id
          FROM matches m
          LEFT JOIN teams home_team ON home_team.id = m.team_id
          LEFT JOIN teams opponent_team ON opponent_team.team_name = m.opponent_name
          WHERE home_team.coach_id = ? OR opponent_team.coach_id = ?
        )`,
        values: [userId, userId],
      };
    }
  }

  if (user.role === "trainer") {
    const assignedTeams = "SELECT team_id FROM team_trainers WHERE trainer_id = ?";
    const assignedPlayers = `SELECT tm.player_id FROM team_members tm WHERE tm.team_id IN (${assignedTeams})`;
    const scopes = {
      users: { sql: `(\`id\` = ? OR \`id\` IN (${assignedPlayers}))`, values: [userId, userId] },
      teams: { sql: `\`id\` IN (${assignedTeams})`, values: [userId] },
      team_members: { sql: `\`team_id\` IN (${assignedTeams})`, values: [userId] },
      team_trainers: { sql: "(`trainer_id` = ? OR `team_id` IN (SELECT team_id FROM team_trainers WHERE trainer_id = ?))", values: [userId, userId] },
      coach_trainers: { sql: "`trainer_id` = ?", values: [userId] },
      drills: { sql: "`created_by` = ?", values: [userId] },
      training_assignments: {
        sql: `\`assigned_by\` = ? AND \`player_id\` IN (${assignedPlayers})
          AND EXISTS (
            SELECT 1 FROM drills d
            WHERE d.id = training_assignments.drill_id
              AND d.created_by = training_assignments.assigned_by
          )`,
        values: [userId, userId],
      },
      drill_performance_logs: { sql: `\`player_id\` IN (${assignedPlayers})`, values: [userId] },
      performance_logs: { sql: `\`user_id\` IN (${assignedPlayers})`, values: [userId] },
      wellness_checkins: { sql: `\`player_id\` IN (${assignedPlayers})`, values: [userId] },
      injury_logs: { sql: `\`player_id\` IN (${assignedPlayers})`, values: [userId] },
    };

    if (scopes[config.table]) return scopes[config.table];
    if (config.table === "matches") {
      return {
        sql: `(\`team_id\` IN (${assignedTeams})
          OR \`opponent_name\` IN (SELECT team_name FROM teams WHERE id IN (${assignedTeams})))`,
        values: [userId, userId],
      };
    }
    if (["seasons", "team_rankings", "training_schedules", "attendance_logs", "lineups", "player_comparisons"].includes(config.table)) {
      return { sql: `\`team_id\` IN (${assignedTeams})`, values: [userId] };
    }
    if (config.table === "match_scores") {
      return {
        sql: `\`match_id\` IN (
          SELECT m.id
          FROM matches m
          LEFT JOIN teams opponent_team ON opponent_team.team_name = m.opponent_name
          WHERE m.team_id IN (${assignedTeams})
            OR opponent_team.id IN (${assignedTeams})
        )`,
        values: [userId, userId],
      };
    }
  }

  if (user.role === "player") {
    const playerTeams = "SELECT team_id FROM team_members WHERE player_id = ? AND is_active = TRUE";
    const scopes = {
      users: { sql: "`id` = ?", values: [userId] },
      teams: { sql: `\`id\` IN (${playerTeams})`, values: [userId] },
      team_members: { sql: "`player_id` = ?", values: [userId] },
      team_trainers: { sql: `\`team_id\` IN (${playerTeams})`, values: [userId] },
      drills: { sql: "`is_public` = TRUE", values: [] },
      training_assignments: { sql: "`player_id` = ?", values: [userId] },
      drill_performance_logs: { sql: "`player_id` = ?", values: [userId] },
      performance_logs: { sql: "`user_id` = ?", values: [userId] },
      wellness_checkins: { sql: "`player_id` = ?", values: [userId] },
      attendance_logs: { sql: "`player_id` = ?", values: [userId] },
      injury_logs: { sql: "`player_id` = ?", values: [userId] },
    };

    if (scopes[config.table]) return scopes[config.table];
    if (config.table === "matches") {
      return {
        sql: `(\`team_id\` IN (${playerTeams})
          OR \`opponent_name\` IN (SELECT team_name FROM teams WHERE id IN (${playerTeams})))`,
        values: [userId, userId],
      };
    }
    if (["seasons", "team_rankings", "training_schedules", "lineups", "player_comparisons"].includes(config.table)) {
      return { sql: `\`team_id\` IN (${playerTeams})`, values: [userId] };
    }
    if (config.table === "match_scores") {
      return {
        sql: `\`match_id\` IN (
          SELECT m.id
          FROM matches m
          LEFT JOIN teams opponent_team ON opponent_team.team_name = m.opponent_name
          WHERE m.team_id IN (${playerTeams})
            OR opponent_team.id IN (${playerTeams})
        )`,
        values: [userId, userId],
      };
    }
  }

  return { sql: "1 = 0", values: [] };
}

function mergeOwnershipWhere(whereSql, values, scope) {
  const baseSql = whereSql ? whereSql.replace(/^WHERE\s+/i, "") : "";
  return {
    whereSql: baseSql ? `WHERE ${baseSql} AND (${scope.sql})` : `WHERE ${scope.sql}`,
    values: [...values, ...scope.values],
  };
}

async function ensureCreateAllowed(config, user, payload) {
  if (config.table === "teams") {
    if (user.role !== "coach" || (payload.coach_id && !isSelf(user, payload.coach_id))) {
      throw new ApiError(403, "You do not have permission for this resource");
    }
    payload.coach_id = user.id;
  }

  if (config.table === "team_members" || config.table === "team_trainers") {
    if (!(await canAccessTeam(user, payload.team_id)) || user.role !== "coach") {
      throw new ApiError(403, "You do not have permission for this team");
    }
  }

  if (config.table === "coach_trainers") {
    if (user.role !== "coach" || !isSelf(user, payload.coach_id)) {
      throw new ApiError(403, "You do not have permission for this coach");
    }
  }

  const staffTeamTables = new Set([
    "seasons",
    "matches",
    "team_rankings",
    "training_schedules",
    "attendance_logs",
  ]);
  if (staffTeamTables.has(config.table) && payload.team_id && user.role === "player") {
    throw new ApiError(403, "You do not have permission for this team");
  }

  if ((config.table === "lineups" || config.table === "player_comparisons") && user.role !== "coach") {
    throw new ApiError(403, "You do not have permission for this resource");
  }

  if (payload.team_id && !(await canAccessTeam(user, payload.team_id))) {
    throw new ApiError(403, "You do not have permission for this team");
  }

  if (payload.match_id && !(await canAccessMatch(user, payload.match_id))) {
    throw new ApiError(403, "You do not have permission for this match");
  }

  if (payload.player_id && !(await canAccessPlayer(user, payload.player_id))) {
    throw new ApiError(403, "You do not have permission for this player");
  }

  if (payload.user_id && !(await canAccessPlayer(user, payload.user_id))) {
    throw new ApiError(403, "You do not have permission for this player");
  }

  for (const ownerField of ["created_by", "assigned_by", "marked_by", "reported_by", "coach_id"]) {
    if (payload[ownerField] && !isSelf(user, payload[ownerField])) {
      throw new ApiError(403, "You cannot create records on behalf of another user");
    }
  }
}

async function ensureUserUpdatePayloadAllowed(config, user, id, payload) {
  if (config.table !== "users" || isSelf(user, id) || user.role !== "coach") return;

  const rows = await query("SELECT role FROM users WHERE id = ? LIMIT 1", [id]);
  const target = rows[0];

  if (target?.role !== "trainer") return;

  const allowedFields = new Set(["name"]);
  const unsafeFields = Object.keys(payload).filter((field) => !allowedFields.has(field));

  if (unsafeFields.length) {
    throw new ApiError(403, `Coach can only update trainer name. Cannot modify: ${unsafeFields.join(", ")}`);
  }
}

function parsePaging(reqQuery) {
  const page = Math.max(Number(reqQuery.page) || 1, 1);
  const limit = Math.min(Math.max(Number(reqQuery.limit) || 25, 1), MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function createCrudController(config) {
  return {
    async list(req, res) {
      const { whereSql, values } = buildWhere(config, req.query);
      const scoped = mergeOwnershipWhere(whereSql, values, ownershipScopeFor(config, req.user));
      const { page, limit, offset } = parsePaging(req.query);
      const sortBy = [...(config.fields || []), "id", "created_at"].includes(req.query.sortBy) ? req.query.sortBy : "id";
      const sortDir = String(req.query.sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

      const rows = await query(
        `SELECT ${toSelect(config)} FROM \`${config.table}\` ${scoped.whereSql} ORDER BY \`${sortBy}\` ${sortDir} LIMIT ${limit} OFFSET ${offset}`,
        scoped.values
      );
      const totalRows = await query(`SELECT COUNT(*) AS total FROM \`${config.table}\` ${scoped.whereSql}`, scoped.values);

      res.json({
        data: rows,
        meta: {
          page,
          limit,
          total: totalRows[0].total,
        },
      });
    },

    async getById(req, res) {
      const rows = await query(`SELECT ${toSelect(config)} FROM \`${config.table}\` WHERE id = ?`, [req.params.id]);

      if (!rows.length) {
        throw new ApiError(404, "Record not found");
      }

      if (!(await canAccessRecord(req.user, config.table, req.params.id))) {
        throw new ApiError(403, "You do not have permission for this resource");
      }

      res.json(rows[0]);
    },

    async create(req, res) {
      ensureWriteActionAllowed(config, req.user, "create");
      const payload = normalizeBody(config, req.body);
      ensureWriteActionAllowed(config, req.user, "create", payload);
      await ensureCreateAllowed(config, req.user, payload);
      const fields = Object.keys(payload);
      const placeholders = fields.map(() => "?").join(", ");
      const values = Object.values(payload);

      const result = await query(
        `INSERT INTO \`${config.table}\` (${fields.map((field) => `\`${field}\``).join(", ")}) VALUES (${placeholders})`,
        values
      );
      const rows = await query(`SELECT ${toSelect(config)} FROM \`${config.table}\` WHERE id = ?`, [result.insertId]);

      res.status(201).json(rows[0]);
    },

    async update(req, res) {
      ensureWriteActionAllowed(config, req.user, "update");
      const payload = normalizeBody(config, req.body, true);
      const fields = Object.keys(payload);

      if (!fields.length) {
        throw new ApiError(400, "Request body does not include any allowed fields");
      }

      ensureWriteActionAllowed(config, req.user, "update", payload);

      if (!(await canMutateRecord(req.user, config.table, req.params.id))) {
        throw new ApiError(403, "You do not have permission for this resource");
      }

      await ensureUserUpdatePayloadAllowed(config, req.user, req.params.id, payload);
      await ensureCreateAllowed(config, req.user, payload);

      const result = await query(
        `UPDATE \`${config.table}\` SET ${fields.map((field) => `\`${field}\` = ?`).join(", ")} WHERE id = ?`,
        [...Object.values(payload), req.params.id]
      );

      if (!result.affectedRows) {
        throw new ApiError(404, "Record not found");
      }

      const rows = await query(`SELECT ${toSelect(config)} FROM \`${config.table}\` WHERE id = ?`, [req.params.id]);
      res.json(rows[0]);
    },

    async remove(req, res) {
      ensureWriteActionAllowed(config, req.user, "delete");

      if (!(await canMutateRecord(req.user, config.table, req.params.id))) {
        throw new ApiError(403, "You do not have permission for this resource");
      }

      const result = await query(`DELETE FROM \`${config.table}\` WHERE id = ?`, [req.params.id]);

      if (!result.affectedRows) {
        throw new ApiError(404, "Record not found");
      }

      res.status(204).send();
    },
  };
}

module.exports = createCrudController;
