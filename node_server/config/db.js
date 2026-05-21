const { Pool } = require("pg");

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || 5432;
  const user = encodeURIComponent(process.env.DB_USER || "postgres");
  const password = encodeURIComponent(process.env.DB_PASSWORD || "");
  const database = process.env.DB_NAME || "postgres";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

function shouldUseSsl() {
  return String(process.env.DB_SSL || "").toLowerCase() === "true";
}

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  max: Number(process.env.DB_CONNECTION_LIMIT || 10),
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
});

function normalizeSql(sql) {
  let index = 0;

  return sql
    .replace(/`([^`]+)`/g, '"$1"')
    .replace(/\bDATETIME\b/gi, "TIMESTAMP")
    .replace(/\bTRUE\b/g, "true")
    .replace(/\bFALSE\b/g, "false")
    .replace(/\bSUM\(([\w.]+)\s*=\s*'([^']+)'\)/gi, "SUM(CASE WHEN $1 = '$2' THEN 1 ELSE 0 END)")
    .replace(
      /\bSUM\(([\w.]+)\s+IN\s+\(([^)]+)\)\)/gi,
      "SUM(CASE WHEN $1 IN ($2) THEN 1 ELSE 0 END)"
    )
    .replace(/\?/g, () => `$${++index}`);
}

function withInsertReturning(sql) {
  if (/^\s*INSERT\s+/i.test(sql) && !/\bRETURNING\b/i.test(sql)) {
    return `${sql} RETURNING id`;
  }

  return sql;
}

function mapCommandResult(result) {
  const firstRow = result.rows?.[0];
  return {
    affectedRows: result.rowCount || 0,
    changedRows: result.rowCount || 0,
    insertId: firstRow?.id,
    rowCount: result.rowCount || 0,
    rows: result.rows || [],
  };
}

async function executeOnClient(client, sql, params = []) {
  const normalizedSql = normalizeSql(withInsertReturning(sql));
  const result = await client.query(normalizedSql, params);

  if (/^\s*SELECT\b|^\s*WITH\b|^\s*SHOW\b/i.test(sql)) {
    return result.rows;
  }

  return mapCommandResult(result);
}

async function query(sql, params = []) {
  return executeOnClient(pool, sql, params);
}

async function execute(sql, params = []) {
  const result = await executeOnClient(pool, sql, params);
  return [result];
}

async function getConnection() {
  const client = await pool.connect();

  return {
    async beginTransaction() {
      await client.query("BEGIN");
    },
    async commit() {
      await client.query("COMMIT");
    },
    async rollback() {
      await client.query("ROLLBACK");
    },
    async execute(sql, params = []) {
      const result = await executeOnClient(client, sql, params);
      return [result];
    },
    release() {
      client.release();
    },
  };
}

pool.execute = execute;
pool.getConnection = getConnection;

module.exports = {
  pool,
  query,
  rawPool: pool,
  normalizeSql,
};
