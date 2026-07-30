import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../db/db.js';
import { importQuest, loadQuests } from '../db/quests.js';

/**
 * The managerial envelope for quest content — the DB is the truth,
 * these commands are how JSON moves in and out of it.
 *
 *   npm run quests -w @arx/server -- list
 *   npm run quests -w @arx/server -- export [outDir]
 *   npm run quests -w @arx/server -- import <file.json> [...]
 *
 * Export writes one interchange file per quest (the exact shape the
 * shipped defs use — an exported file can be re-imported anywhere, or
 * promoted into content/src/quests/defs to ship with the game).
 * Import is a TOOL WRITE: the imported content becomes DB truth and
 * no future seed pass will clobber it (see db/quests.ts).
 */

const [, , command, ...args] = process.argv;
const db = await openDb();

switch (command) {
  case 'list': {
    const { quests, errors } = await loadQuests(db);
    for (const q of quests) {
      const shape = q.repeat ? `repeat ${q.repeat.cooldownHours}h` : 'one-time';
      console.log(`${q.id}  "${q.name}"  (${q.stages.length} stages, ${shape})  giver: ${q.giver}`);
    }
    for (const e of errors) console.error(`invalid: ${e}`);
    break;
  }
  case 'export': {
    const outDir = args[0] ?? join(process.cwd(), 'data', 'quests-export');
    mkdirSync(outDir, { recursive: true });
    const { quests, errors } = await loadQuests(db);
    for (const q of quests) {
      writeFileSync(join(outDir, `${q.id}.json`), `${JSON.stringify(q, null, 2)}\n`);
    }
    for (const e of errors) console.error(`skipped invalid row: ${e}`);
    console.log(`exported ${quests.length} quests to ${outDir}`);
    break;
  }
  case 'import': {
    if (args.length === 0) {
      console.error('import needs at least one .json file');
      process.exit(1);
    }
    let ok = 0;
    for (const file of args) {
      const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
      const res = await importQuest(db, raw);
      if (res.ok) {
        ok++;
        console.log(`imported ${file}`);
      } else {
        for (const e of res.errors) console.error(`${file}: ${e}`);
      }
    }
    console.log(`imported ${ok}/${args.length}`);
    if (ok < args.length) process.exit(1);
    break;
  }
  default:
    console.error('usage: quests <list | export [outDir] | import <file.json ...>>');
    process.exit(1);
}

await db.close();
