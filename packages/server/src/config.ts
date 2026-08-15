import { WORLD_SEED } from '@arx/content';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const v = Number.parseInt(raw, 10);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Env flag with an environment-aware default: explicit '0'/'1' wins;
 * unset means ON in dev and OFF when NODE_ENV=production, so a prod
 * box that forgets a knob fails closed, not open.
 */
function envFlag(name: string): boolean {
  const raw = process.env[name];
  if (raw !== undefined) return raw !== '0';
  return process.env.NODE_ENV !== 'production';
}

export const config = {
  port: envInt('PORT', 8790),
  /**
   * Postgres connection, one knob per part — credentials never ride
   * inside a URL. The defaults reach a local server as the OS user
   * (peer/trust auth, no password) and the 'arx' database is
   * auto-created on first boot.
   */
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: envInt('DB_PORT', 5432),
    database: process.env.DB_DATABASE ?? 'arx',
    user: process.env.DB_USERNAME || undefined,
    password: process.env.DB_PASSWORD || undefined,
  },
  /**
   * Bind address. Dev binds all interfaces so LAN friends can join;
   * production should set HOST=127.0.0.1 and let nginx terminate TLS
   * and proxy /ws.
   */
  host: process.env.HOST ?? '0.0.0.0',
  /** Artificial latency for netcode testing (applied each direction). */
  fakeLagMs: envInt('FAKE_LAG_MS', 0),
  fakeJitterMs: envInt('FAKE_JITTER_MS', 0),
  motd: process.env.MOTD ?? 'Welcome to Arx!',
  /** Guest (accountless) joins — on in dev for bots; off in production. */
  allowGuest: envFlag('ALLOW_GUEST'),
  /**
   * Invite gate on account creation. Deliberately the INVERSE default
   * of envFlag: this knob RESTRICTS rather than permits, so failing
   * closed means ON when NODE_ENV=production and OFF in dev. Explicit
   * REQUIRE_INVITE=0/1 always wins.
   */
  requireInvite:
    process.env.REQUIRE_INVITE !== undefined
      ? process.env.REQUIRE_INVITE !== '0'
      : process.env.NODE_ENV === 'production',
  /**
   * Invite code seeded into the invite_codes ledger at boot (unlimited
   * uses). The one live code ships in .env; more codes can be added
   * straight in the table.
   */
  inviteCode: (process.env.INVITE_CODE ?? '').trim(),
  /** Hard cap on simultaneous sockets — the box's overload fuse. */
  maxConnections: envInt('MAX_CONNECTIONS', 300),
  // THE SHIPPED SEED lives in content (worldgen.ts) — the geography is
  // composed against it. The env override exists for rigs and labs,
  // never for prod (a prod seed change is a world regen project).
  worldSeed: envInt('WORLD_SEED', WORLD_SEED),
  /**
   * Zone whose spawn point receives BRAND-NEW characters (the
   * awakening). Death respawn resolves separately (nearest settled
   * spawn) and lost-position rescue uses the world spawn (the first
   * zone declaring one). Falls back to the world spawn if the zone is
   * missing or declares no spawn.
   */
  startZoneId: process.env.START_ZONE ?? 'dawnmead',
  /**
   * Dev chat commands (/give) AND the /dev studio HTTP API (map
   * editor, Content Studio saves). On in dev; off in production
   * unless DEV_COMMANDS=1 is set explicitly.
   */
  devCommands: envFlag('DEV_COMMANDS'),
  dataDir: process.env.DATA_DIR ?? new URL('../../../data/', import.meta.url).pathname,
};
