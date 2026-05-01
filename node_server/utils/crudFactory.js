const { query } = require("../config/db");
const ApiError = require("./apiError");

const MAX_LIMIT = 100;

function toSelect(config) {
  const fields = config.publicFields || ["*"];
  return fields.map((field) => `\`${field}\``).join(", ");
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
      const { page, limit, offset } = parsePaging(req.query);
      const sortBy = [...(config.fields || []), "id", "created_at"].includes(req.query.sortBy) ? req.query.sortBy : "id";
      const sortDir = String(req.query.sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

      const rows = await query(
        `SELECT ${toSelect(config)} FROM \`${config.table}\` ${whereSql} ORDER BY \`${sortBy}\` ${sortDir} LIMIT ? OFFSET ?`,
        [...values, limit, offset]
      );
      const totalRows = await query(`SELECT COUNT(*) AS total FROM \`${config.table}\` ${whereSql}`, values);

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

      res.json(rows[0]);
    },

    async create(req, res) {
      if (config.disableCreate) {
        throw new ApiError(405, "Create is disabled for this resource. Use the dedicated endpoint instead.");
      }

      const payload = normalizeBody(config, req.body);
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
      const payload = normalizeBody(config, req.body, true);
      const fields = Object.keys(payload);

      if (!fields.length) {
        throw new ApiError(400, "Request body does not include any allowed fields");
      }

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
      const result = await query(`DELETE FROM \`${config.table}\` WHERE id = ?`, [req.params.id]);

      if (!result.affectedRows) {
        throw new ApiError(404, "Record not found");
      }

      res.status(204).send();
    },
  };
}

module.exports = createCrudController;
