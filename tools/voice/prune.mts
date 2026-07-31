/**
 * THE SWEEP — drop voice blobs the live ledger no longer references.
 *
 *   npx tsx tools/voice/prune.mts          say what it would delete (default)
 *   npx tsx tools/voice/prune.mts --apply  actually delete
 *     --api <url>   game server dev API (default http://localhost:8790)
 *
 * Clips are content-addressed: data/voice/<sha1>.<ext>. Re-speaking a line in
 * a new voice writes a NEW hash and repoints the ledger row, which leaves the
 * old binary on disk with nothing pointing at it. Import never collects those,
 * so they accumulate every time the cast is recut.
 *
 * Only unreferenced files are removed — a blob still named by any clip row is
 * never touched, so this cannot silence a line that is actually in use. Run it
 * AFTER import.mts, never before: pruning first would delete blobs that the
 * ledger still points at.
 */
import { readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const VOICE_DIR = join(REPO, 'data', 'voice');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const i = args.indexOf('--api');
const api = i >= 0 ? args[i + 1] : 'http://localhost:8790';

interface Clip { def: { id: string; fileHash: string; ext: string } }
let clips: Clip[];
try {
  const res = await fetch(`${api}/dev/content/voice`);
  clips = ((await res.json()) as { clips?: Clip[] }).clips ?? [];
} catch {
  console.error(`no game server dev API at ${api} — start the server first.`);
  console.error('Refusing to prune without the ledger: every blob would look unreferenced.');
  process.exit(1);
}

if (clips.length === 0) {
  console.error('ledger reports zero clips — refusing to prune (that would wipe data/voice).');
  process.exit(1);
}

const referenced = new Set(clips.map((c) => `${c.def.fileHash}.${c.def.ext}`));
const files = readdirSync(VOICE_DIR).filter((f) => /\.(ogg|wav|opus|mp3|m4a|webm)$/.test(f));
const orphans = files.filter((f) => !referenced.has(f));
const bytes = orphans.reduce((n, f) => n + statSync(join(VOICE_DIR, f)).size, 0);

console.log(`ledger clips:  ${clips.length}`);
console.log(`blobs on disk: ${files.length}`);
console.log(`referenced:    ${files.length - orphans.length}`);
console.log(`orphaned:      ${orphans.length}  (${(bytes / 1024 / 1024).toFixed(1)} MB)`);

if (orphans.length === 0) {
  console.log('\nnothing to sweep.');
  process.exit(0);
}
if (!apply) {
  console.log('\nwould delete (first 10):');
  orphans.slice(0, 10).forEach((f) => console.log(`  ${f}`));
  console.log('\ndry run — pass --apply to delete.');
  process.exit(0);
}
for (const f of orphans) rmSync(join(VOICE_DIR, f));
console.log(`\ndeleted ${orphans.length} orphaned blobs (${(bytes / 1024 / 1024).toFixed(1)} MB).`);
