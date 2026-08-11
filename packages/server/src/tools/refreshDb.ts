import { openDb, type Db } from '../db/db.js';
import { config } from '../config.js';

/**
 * THE FRESH START — a production refresh for the world database.
 *
 *   npm run db:refresh -w @arx/server                  report only (always safe)
 *   npm run db:refresh -w @arx/server -- --content     reset authored content
 *   npm run db:refresh -w @arx/server -- --world       clear derived world state
 *   npm run db:refresh -w @arx/server -- --players     wipe accounts + player-built world
 *   npm run db:refresh -w @arx/server -- --all         all three
 *
 * Nothing is deleted without `--yes` — without it every flag just
 * prints what WOULD go. Connection comes from the same env the server
 * uses (DB_HOST / DB_PORT / DB_DATABASE / DB_USERNAME / DB_PASSWORD).
 *
 * RUN THIS WITH THE GAME SERVER STOPPED, then start it again: boot
 * re-seeds every content table from the shipped code (the two-hash
 * law — an empty table is a pure seed), re-surveys the POI ledger,
 * and regenerates terrain from WORLD_SEED. That boot IS the refresh;
 * this tool only clears the ground for it.
 *
 * What the groups mean:
 *
 *   --content  content_docs + npc_actors + dialogues + routines +
 *              quests (children cascade). These re-seed at boot from
 *              the shipped plan, so deleting them guarantees no
 *              tool-edited row is silently outvoting the code (the
 *              two-hash law: an edited row wins FOREVER until it is
 *              removed — this is the remover).
 *              VOICE IS NEVER TOUCHED: voice_clips/voice_banks hold
 *              imported recordings, not code-seeded truth.
 *
 *   --world    world_pois + world_minors + world_growth +
 *              frontier_state + frontier_calm — the living frontier's
 *              ledgers. All derived; the first boot re-rolls a fresh
 *              frontier against the current geography.
 *
 *   --players  accounts (sessions, characters, and everything hanging
 *              off them cascade: inventories, banks, skills, quests,
 *              standings, pets, mounts, livestock, parties, friends)
 *              plus the player-made world: built_tiles, built_details,
 *              crops, signs, farm_bins, farm_troughs.
 *              invite_codes are KEPT (admin-issued).
 */

interface Group {
  name: string;
  flag: string;
  /** Tables deleted directly, in FK-safe order (children cascade). */
  tables: string[];
}

const GROUPS: Group[] = [
  {
    name: 'authored content (re-seeded at next boot)',
    flag: '--content',
    tables: ['content_docs', 'npc_actors', 'dialogues', 'routines', 'quests'],
  },
  {
    name: 'derived world state (re-rolled at next boot)',
    flag: '--world',
    tables: ['world_pois', 'world_minors', 'world_growth', 'frontier_state', 'frontier_calm'],
  },
  {
    name: 'players + player-built world',
    flag: '--players',
    tables: ['accounts', 'built_tiles', 'built_details', 'crops', 'signs', 'farm_bins', 'farm_troughs'],
  },
];

/** Two-hash tables whose divergence means "the DB is outvoting the code". */
const HASHED = ['npc_actors', 'dialogues', 'routines', 'quests'];

async function count(db: Db, table: string): Promise<number> {
  const rows = await db.query<{ n: string | number }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(rows[0]?.n ?? 0);
}

async function editedCount(db: Db, table: string): Promise<number> {
  const rows = await db.query<{ n: string | number }>(
    `SELECT count(*) AS n FROM ${table}
     WHERE authored_hash IS NULL OR content_hash <> authored_hash`,
  );
  return Number(rows[0]?.n ?? 0);
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const all = args.has('--all');
  const yes = args.has('--yes');
  const wanted = GROUPS.filter((g) => all || args.has(g.flag));
  const known = new Set(['--all', '--yes', ...GROUPS.map((g) => g.flag)]);
  for (const a of args) {
    if (!known.has(a)) {
      console.error(`unknown flag ${a} — flags: ${[...known].join(' ')}`);
      process.exit(1);
    }
  }

  const db = await openDb();
  try {
    console.log(`[refresh] database '${config.db.database}' on ${config.db.host}:${config.db.port}`);
    console.log('');

    // ---------------------------------------------------------- report
    for (const g of GROUPS) {
      console.log(`${g.name}  [${g.flag}]`);
      for (const t of g.tables) {
        const n = await count(db, t);
        const edited = HASHED.includes(t) ? await editedCount(db, t) : null;
        console.log(
          `  ${t.padEnd(16)} ${String(n).padStart(7)} rows${
            edited !== null && edited > 0 ? `  (${edited} TOOL-EDITED — outvoting the code)` : ''
          }`,
        );
      }
      console.log('');
    }
    // content_docs divergence, per kind — the split-brain detector.
    const kinds = await db.query<{ kind: string; n: string | number; edited: string | number }>(
      `SELECT kind, count(*) AS n,
              count(*) FILTER (WHERE authored_hash IS NULL OR content_hash <> authored_hash) AS edited
       FROM content_docs GROUP BY kind ORDER BY kind`,
    );
    if (kinds.length > 0) {
      console.log('content_docs by kind (edited = the DB wins over geography.ts et al):');
      for (const k of kinds) {
        const e = Number(k.edited);
        console.log(
          `  ${k.kind.padEnd(12)} ${String(k.n).padStart(4)} docs${e > 0 ? `  (${e} EDITED)` : ''}`,
        );
      }
      console.log('');
    }
    const voiceClips = await count(db, 'voice_clips');
    const voiceBanks = await count(db, 'voice_banks');
    console.log(
      `voice (never touched by this tool): ${voiceClips} clips, ${voiceBanks} bank lines`,
    );
    const invites = await count(db, 'invite_codes');
    console.log(`invite_codes (kept): ${invites}`);
    console.log('');

    // ----------------------------------------------------------- act
    if (wanted.length === 0) {
      console.log('Report only. Pass --content / --world / --players / --all to choose groups,');
      console.log('and add --yes to actually delete. Stop the game server first.');
      return;
    }
    if (!yes) {
      console.log(`WOULD clear: ${wanted.map((g) => g.flag).join(' ')} — add --yes to do it.`);
      return;
    }
    for (const g of wanted) {
      for (const t of g.tables) {
        const n = await count(db, t);
        await db.run(`DELETE FROM ${t}`);
        console.log(`[refresh] cleared ${t} (${n} rows)`);
      }
    }
    console.log('');
    console.log('[refresh] done. Start the game server — boot re-seeds the authored truth');
    console.log('[refresh] (content docs, actors, dialogues, routines, quests, POI sites)');
    console.log('[refresh] and regenerates the world from WORLD_SEED.');
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error('[refresh] failed:', err);
  process.exit(1);
});
