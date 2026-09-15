import { Pool } from "pg";

declare global {
  var __subtrackPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set");
  }
  return new Pool({ connectionString });
}

const pool = globalThis.__subtrackPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__subtrackPool = pool;
}

let schemaReady: Promise<void> | undefined;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        monthly_cost DOUBLE PRECISION NOT NULL,
        billing_cycle TEXT NOT NULL,
        next_renewal_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        reminder_sent_for_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `).then(() => undefined);
  }
  return schemaReady;
}

export default pool;
