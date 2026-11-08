import pg from "pg";
import { attachDatabasePool } from "@vercel/functions";
const globalDb = globalThis;
export const pool =
  globalDb.financialPool ||
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
  });
attachDatabasePool(pool);
if (process.env.NODE_ENV !== "production") globalDb.financialPool = pool;
