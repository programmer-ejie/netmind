const fs = require("fs");
const path = require("path");
require("dotenv").config({ quiet: true });

const { rawPool } = require("../config/db");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in .env");
  }

  const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  await rawPool.query(schema);
  await rawPool.end();

  console.log("Postgres schema migration completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
