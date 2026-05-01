const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

async function main() {
  const dbName = process.env.DB_NAME;

  if (!dbName) {
    throw new Error("DB_NAME is required in .env");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.query(`USE \`${dbName}\``);

  const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  await connection.query(schema);
  await connection.end();

  console.log(`Database initialized: ${dbName}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
