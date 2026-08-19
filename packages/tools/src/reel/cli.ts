#!/usr/bin/env tsx
/**
 * THE REEL ROOM — the lane's front door.
 *
 *   npm run reel -w @arx/tools -- all              capture the whole slate
 *   npm run reel -w @arx/tools -- the-cut crown    two shots by name
 *   npm run reel -w @arx/tools -- all --make       rebuild the cast first
 *   npm run reel -w @arx/tools -- the-cut --raw    tape only, no encode
 *   npm run reel -w @arx/tools -- --encode-only    re-encode existing tape
 *
 * Environment: ARX_REEL_URL (default http://localhost:5230) must serve
 * the game shell, and its server must run with DEV_COMMANDS=1.
 *
 * The lane is grouped by cast: one login per body, every shot that body
 * performs taken in one sitting. Logging in is the slow part; framing
 * is the part worth spending the day on.
 */
import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { capture, type TakeReport } from './capture.js';
import { contactSheet, encode } from './encode.js';
import { Lane, readSlate, type SlateShot } from './lane.js';
import { PROFILES, makeCommands } from './profiles.js';

const ROOT = resolve(import.meta.dirname, '../../../..');
const OUT = join(ROOT, 'packages/client/public/reels');
const RAW = join(ROOT, '.reels-raw');

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const names = argv.filter((a) => !a.startsWith('--'));
const has = (f: string) => flags.has(f);


interface ManifestEntry {
  id: string;
  title: string;
  caption: string;
  pillar: string;
  seconds: number;
  loop: boolean;
  hero: boolean;
  poster: string;
  sources: { webm: string; webm720: string; mp4: string };
  bytes: Record<string, number>;
  take?: { frames: number; medianDt: number; hitches: number };
}

function loadManifest(): Record<string, ManifestEntry> {
  try {
    const raw = JSON.parse(readFileSync(join(OUT, 'reels.json'), 'utf8')) as {
      reels: ManifestEntry[];
    };
    return Object.fromEntries(raw.reels.map((r) => [r.id, r]));
  } catch {
    return {};
  }
}

function writeManifest(order: SlateShot[], entries: Record<string, ManifestEntry>): void {
  const reels = order.map((s) => entries[s.id]).filter(Boolean) as ManifestEntry[];
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, 'reels.json'),
    JSON.stringify({ generated: new Date().toISOString(), reels }, null, 2) + '\n',
  );
  // THE DELIVERY FOLDER IS THE MANIFEST, and nothing else. A retired
  // shot, a renamed one, or a 1080 lane that a reel no longer needs
  // leaves megabytes behind that the page will never ask for and git
  // will carry forever.
  const keep = new Set(['reels.json']);
  for (const r of reels) {
    keep.add(r.poster.replace('/reels/', ''));
    for (const src of Object.values(r.sources)) keep.add(src.replace('/reels/', ''));
  }
  for (const file of readdirSync(OUT)) {
    if (keep.has(file)) continue;
    unlinkSync(join(OUT, file));
    console.log(`    pruned ${file}`);
  }
}

async function encodeShot(
  shot: SlateShot,
  report: TakeReport | null,
  entries: Record<string, ManifestEntry>,
): Promise<void> {
  const raw = join(RAW, `${shot.id}.raw.webm`);
  const fps = shot.fps ?? 30;
  const posterAt = shot.poster ?? report?.marks.poster ?? shot.seconds * 0.4;
  process.stdout.write('    encoding…');
  const out = await encode(raw, join(OUT, shot.id), {
    fps,
    // Flat-colour pixel art is kind to a codec: what would smear a
    // photograph at crf 34 leaves this artwork untouched, and the
    // difference on the wire is a page that opens in a second instead
    // of five. Hero plates sit behind a scrim and can afford one more.
    crf: shot.hero ? 38 : 34,
    // Hero plates and bands paint at viewport width; everything else
    // lives in a 700 px well and ships the 720 ladder alone.
    full: shot.hero,
    posterAt,
  });
  const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
  console.log(
    ` ${out.seconds.toFixed(1)}s · webm ${mb(out.bytes.webm)} · 720 ${mb(out.bytes.webm720)} · mp4 ${mb(out.bytes.mp4)}`,
  );
  entries[shot.id] = {
    id: shot.id,
    title: shot.title,
    caption: shot.caption,
    pillar: shot.pillar,
    seconds: Math.round(out.seconds * 100) / 100,
    loop: shot.loop ?? false,
    hero: shot.hero ?? false,
    poster: `/reels/${shot.id}.jpg`,
    // THE ENCODER NAMES THE FILES, not this line: a well-sized reel
    // has one webm and both entries point at it, and a manifest that
    // guessed the names would keep a 1080 lane alive that nothing
    // encoded and nothing plays.
    sources: {
      webm: `/reels/${basename(out.webm)}`,
      webm720: `/reels/${basename(out.webm720)}`,
      mp4: `/reels/${basename(out.mp4)}`,
    },
    bytes: out.bytes,
    take: report
      ? { frames: report.frames, medianDt: report.medianDt, hitches: report.hitches }
      : entries[shot.id]?.take,
  };
}

async function main(): Promise<void> {
  const entries = loadManifest();
  mkdirSync(RAW, { recursive: true });
  mkdirSync(OUT, { recursive: true });

  // The slate lives in the client (packages/client/src/reel/shots.ts).
  // Rather than reach across package roots, the lane asks the page for
  // it — one roster, read from the thing that performs it.
  const everything = await readSlate();
  const slate: SlateShot[] =
    names.length === 0 || names.includes('all')
      ? everything
      : names.map((n) => {
          const s = everything.find((x) => x.id === n);
          if (!s) {
            throw new Error(`no shot named "${n}" — have: ${everything.map((x) => x.id).join(', ')}`);
          }
          return s;
        });

  if (has('--encode-only')) {
    for (const shot of slate) {
      console.log(`\n▶ ${shot.id} — ${shot.title}`);
      await encodeShot(shot, null, entries);
      writeManifest(everything, entries);
    }
    return;
  }

  const byCast = new Map<string, SlateShot[]>();
  for (const s of slate) byCast.set(s.cast, [...(byCast.get(s.cast) ?? []), s]);

  const troubled: string[] = [];
  for (const [castId, shots] of byCast) {
    const profile = PROFILES[castId];
    if (!profile) throw new Error(`no profile "${castId}"`);
    console.log(`\n══ cast: ${profile.name} (${castId}) — ${shots.length} shot(s)`);
    const lane = new Lane({
      account: { user: `reel_${castId}`, pass: 'reel-room-1', name: profile.name },
      headless: has('--headless'),
    });
    await lane.open();
    try {
      await lane.enter();
      if (has('--make')) {
        const cmds = makeCommands(profile);
        console.log(`  make-ready: ${cmds.length} commands (~${Math.ceil(cmds.length * 1.2)}s)`);
        for (const c of cmds) await lane.cmd(c);
      }
      for (const shot of shots) {
        console.log(`\n▶ ${shot.id} — ${shot.title}`);
        // A dungeon shot leaves the body underground; every shot after
        // it would stage into a cave. One check, every take.
        await lane.surface();
        const report = await capture(lane, shot, RAW);
        const verdict = report.clean ? 'clean' : 'TROUBLED';
        console.log(
          `    take: ${report.frames} frames · median ${report.medianDt}ms · ` +
            `${report.hitches} hitch(es) · worst ${report.worstDt}ms · ${verdict}`,
        );
        if (report.died) console.log('    ⚠ the performer went down mid-take');
        if (report.overspend.length) {
          console.log(`    ⚠ commands over the chat bucket: ${report.overspend.join(' | ')}`);
        }
        if (!report.clean) troubled.push(shot.id);
        // Every take leaves a plate of its own frames beside the tape.
        const sheet = join(RAW, `${shot.id}.sheet.jpg`);
        await contactSheet(report.raw, sheet, shot.seconds);
        console.log(`    sheet: ${sheet}`);
        if (!has('--raw')) {
          await encodeShot(shot, report, entries);
          writeManifest(everything, entries);
        }
      }
    } finally {
      await lane.close();
    }
  }
  writeManifest(everything, entries);
  if (troubled.length) {
    console.log(`\n⚠ troubled takes (re-shoot before shipping): ${troubled.join(', ')}`);
  }
  console.log(`\nmanifest → ${join(OUT, 'reels.json')}`);
}

await main();
