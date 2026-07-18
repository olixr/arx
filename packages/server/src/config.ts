function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const v = Number.parseInt(raw, 10);
  return Number.isFinite(v) ? v : fallback;
}

export const config = {
  port: envInt('PORT', 8787),
  /** Artificial latency for netcode testing (applied each direction). */
  fakeLagMs: envInt('FAKE_LAG_MS', 0),
  fakeJitterMs: envInt('FAKE_JITTER_MS', 0),
  motd: process.env.MOTD ?? 'Welcome to DevCraft!',
  /** Guest (accountless) joins — on by default for local dev and bots. */
  allowGuest: process.env.ALLOW_GUEST !== '0',
  worldSeed: envInt('WORLD_SEED', 1337),
  /** Dev chat commands (/give) — on for local dev, off in production. */
  devCommands: process.env.DEV_COMMANDS !== '0',
  dataDir: process.env.DATA_DIR ?? new URL('../../../data/', import.meta.url).pathname,
};
