import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../db/db.js';
import { importDialogue, loadDialogues } from '../db/dialogues.js';

/**
 * The managerial envelope for dialogue content — the DB is the truth,
 * these commands are how JSON moves in and out of it.
 *
 *   npm run dialogues -w @arx/server -- list
 *   npm run dialogues -w @arx/server -- export [outDir]
 *   npm run dialogues -w @arx/server -- import <file.json> [...]
 *
 * Export writes one interchange file per tree (the exact shape the
 * shipped defs use — an exported file can be re-imported anywhere, or
 * promoted into content/src/dialogues/defs to ship with the game).
 * Import is a TOOL WRITE: the imported content becomes DB truth and
 * no future seed pass will clobber it (see db/dialogues.ts).
 */

const [, , command, ...args] = process.argv;
const db = openDb();

switch (command) {
  case 'list': {
    const { dialogues, errors } = loadDialogues(db);
    for (const d of dialogues) {
      const where = (d.bindings ?? []).map((b) => `${b.kind}:${b.target}`).join(', ') || 'UNBOUND';
      console.log(`${d.id}  (${d.nodes.length} nodes)  → ${where}`);
    }
    for (const e of errors) console.error(`invalid: ${e}`);
    break;
  }
  case 'export': {
    const outDir = args[0] ?? join(process.cwd(), 'data', 'dialogues-export');
    mkdirSync(outDir, { recursive: true });
    const { dialogues, errors } = loadDialogues(db);
    for (const d of dialogues) {
      writeFileSync(join(outDir, `${d.id}.json`), `${JSON.stringify(d, null, 2)}\n`);
    }
    for (const e of errors) console.error(`skipped invalid row: ${e}`);
    console.log(`exported ${dialogues.length} dialogues to ${outDir}`);
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
      const res = importDialogue(db, raw);
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
    console.error('usage: dialogues <list | export [outDir] | import <file.json ...>>');
    process.exit(1);
}
