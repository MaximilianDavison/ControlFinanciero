import pg from "pg";
import { readFile } from "node:fs/promises";
const db = new pg.Client({
  connectionString:
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});
try {
  await db.connect();
  await db.query(
    await readFile(
      new URL("../migrations/001_neon.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log("Tablas financieras preparadas.");
} finally {
  await db.end();
}
