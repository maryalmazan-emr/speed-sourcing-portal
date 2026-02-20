import sql from "mssql";

const connStr = process.env.AZURE_SQL_CONNECTION_STRING?.trim();

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function hasSql(): boolean {
  return Boolean(connStr);
}

export function getPool(): Promise<sql.ConnectionPool> {
  if (!connStr) {
    throw new Error("AZURE_SQL_CONNECTION_STRING is not set.");
  }
  if (!poolPromise) {
    poolPromise = sql.connect(connStr);
  }
  return poolPromise;
}