import { randomBytes } from 'node:crypto';
import { after } from 'node:test';
import pg from 'pg';
import { openDb, type Db } from './db.js';

/**
 * Test databases on the local Postgres. Each test FILE (one process
 * under the node test runner) gets one scratch database, created on
 * first ask and dropped when the process winds down; every `freshDb()`
 * call truncates all tables, so each test starts on clean ground —
 * the moral successor of `openDb(':memory:')`.
 *
 * Point TEST_DATABASE_URL at a maintenance DB if the default local
 * connection isn't right (it must be allowed to CREATE DATABASE).
 */
const ADMIN_URL = process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/postgres';

let shared: Db | null = null;
let scratchName = '';

async function adminQuery<T extends object>(sql: string): Promise<T[]> {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  try {
    const res = await admin.query(sql);
    return res.rows as T[];
  } finally {
    await admin.end();
  }
}

/** Best-effort sweep of scratch DBs a crashed earlier run left behind. */
async function sweepOrphans(): Promise<void> {
  try {
    const rows = await adminQuery<{ datname: string }>(
      `SELECT datname FROM pg_database
       WHERE datname LIKE 'arx_test_%'
         AND NOT EXISTS (SELECT 1 FROM pg_stat_activity a WHERE a.datname = pg_database.datname)`,
    );
    for (const row of rows) {
      await adminQuery(`DROP DATABASE IF EXISTS "${row.datname}"`).catch(() => undefined);
    }
  } catch {
    // sweep is a nicety, never a failure
  }
}

async function dropScratch(): Promise<void> {
  if (!shared) return;
  const db = shared;
  shared = null;
  await db.close().catch(() => undefined);
  await adminQuery(`DROP DATABASE IF EXISTS "${scratchName}"`).catch(() => undefined);
}

// Root-level hook: runs once every test in this process has finished.
// The scratch connection is a live handle — without closing it here the
// event loop never drains, `beforeExit` never fires, and the child
// process hangs the test runner forever.
after(async () => {
  await dropScratch();
});

/** A migrated, EMPTY database — truncates everything between tests. */
export async function freshDb(): Promise<Db> {
  if (!shared) {
    await sweepOrphans();
    scratchName = `arx_test_${randomBytes(6).toString('hex')}`;
    await adminQuery(`CREATE DATABASE "${scratchName}"`);
    const url = new URL(ADMIN_URL);
    url.pathname = `/${scratchName}`;
    shared = await openDb(url.toString());
    process.once('beforeExit', () => {
      void dropScratch();
    });
  }
  const tables = await shared.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'",
  );
  if (tables.length > 0) {
    await shared.run(
      `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
  }
  return shared;
}
