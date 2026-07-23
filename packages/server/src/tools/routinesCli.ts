import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb } from '../db/db.js';
import { importRoutine, loadRoutines } from '../db/routines.js';

/**
 * The managerial envelope for routine content — the DB is the truth,
 * these commands are how JSON moves in and out of it.
 *
 *   npm run routines -w @devcraft/server -- list
 *   npm run routines -w @devcraft/server -- export [outDir]
 *   npm run routines -w @devcraft/server -- import <file.json> [...]
 *
 * Export writes one interchange file per routine (the exact shape the
 * shipped defs use — an exported file can be re-imported anywhere, or
 * promoted into content/src/routines/defs to ship with the game).
 * Import is a TOOL WRITE: the imported content becomes DB truth and
 * no future seed pass will clobber it (see db/routines.ts). Note npm
 * runs this in packages/server — pass ABSOLUTE paths to import.
 */

const [, , command, ...args] = process.argv;
const db = openDb();

switch (command) {
  case 'list': {
    const { routines, errors } = loadRoutines(db);
    for (const r of routines) {
      const windows = (r.slots ?? [])
        .map((s) => `${s.from}-${s.to}:${s.task.kind}`)
        .join(', ');
      console.log(`${r.id}  base:${r.base.kind}${windows ? `  [${windows}]` : ''}`);
    }
    for (const e of errors) console.error(`invalid: ${e}`);
    break;
  }
  case 'export': {
    const outDir = args[0] ?? join(process.cwd(), 'data', 'routines-export');
    mkdirSync(outDir, { recursive: true });
    const { routines, errors } = loadRoutines(db);
    for (const r of routines) {
      writeFileSync(join(outDir, `${r.id}.json`), `${JSON.stringify(r, null, 2)}\n`);
    }
    for (const e of errors) console.error(`skipped invalid row: ${e}`);
    console.log(`exported ${routines.length} routines to ${outDir}`);
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
      const res = importRoutine(db, raw);
      if (res.ok) {
        ok++;
        console.log(`imported ${file}`);
      } else {
        for (const e of res.errors) console.error(`${file}: ${e}`);
      }
    }
    console.log(`${ok}/${args.length} imported`);
    break;
  }
  default:
    console.error('usage: routines <list | export [outDir] | import <files...>>');
    process.exit(1);
}
