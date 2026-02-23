// File: server/src/db.ts

import sql from "mssql";

const connStr = process.env.AZURE_SQL_CONNECTION_STRING?.trim();

/**
 * Use `undefined` instead of `null` so the return type is always Promise<ConnectionPool>
 * and TypeScript never sees a possible `null` return.
 */
let poolPromise: Promise<sql.ConnectionPool> | undefined;

/** True if the server was configured with a SQL connection string */
export function hasSql(): boolean {
  return Boolean(connStr);
}

/**
 * Lazily creates (and reuses) a single global connection pool.
 * Throws a clear error if the env var is missing.
 */
export function getPool(): Promise<sql.ConnectionPool> {
  if (!connStr) {
    throw new Error("AZURE_SQL_CONNECTION_STRING is not set.");
  }

  if (!poolPromise) {
    poolPromise = sql.connect(connStr);
  }

  return poolPromise;
}

export default sql;