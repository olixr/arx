#!/usr/bin/env node
// band-proof.mjs — THE ONE PROOF RIG (contested-lands epic, 2026-09-06).
//
// One script replaces the improvised per-band proof rigs (band6/live,
// band8/fix, band9c/l5, the k34b museum probes): it boots ONE throwaway
// server+vite pair (or rides a running one via ORIGIN), logs the probe
// account in, runs the manifest's setup commands, shoots every scene at
// every hour with the clock JUMPED (/time — never a real-time in-game-day
// wait), reads the server's own word (/routines) for every body stop and
// grades it, composes a contact sheet, runs the stage-parity battery as a
// child on the same ORIGIN, and writes report.md. Exit code is non-zero on
// any seating FAIL, parity FAIL, or missing shot.
//
// Usage:
//   node scripts/probes/band-proof.mjs --manifest m.json --out .proof/band9d [--rig] [--db arx_proof_x]
//        [--scenes a,b] [--hours 12,0] [--no-parity] [--dwell 20] [--zoom 1.3] [--parity-scenes crown-noon]
//   ORIGIN=http://localhost:5231 node scripts/probes/band-proof.mjs --manifest m.json --out .proof/x
//
// Manifest (docs/proof-harness.md carries the schema):
//   { band, zoom?, hours?, scenes:[{ id, x, y, plane?, hour, hours?, dir?, dwell?, notes? }],
//     bodies?:[{ slug, name?, near?:[x,y], anchor?:'spawn', stops:[{ hour, x?, y?, dx?, dy?, tol?, kind?, state?, pose? }] }],
//     setup?:[ '/tp 201 292', '/spawnnpc dolmen_setter dolmen_set' ], parityScenes?:[...] }
//
// Idioms borrowed, with their scars: the VERIFIED TELEPORT (the chat rate
// limiter silently eats commands — send, verify the renderer's own
// position landed, retry); the PLANE CHECK (/museum is a toggle and the
// probe account keeps its plane across logins); the register-or-login
// door (k34b); /routines parsed to rows (band6); the blinded vite
// watcher (rig30) so a concurrent build's saves never reload a shot.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/aeriek/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

// ------------------------------------------------------------ arguments
const argv = process.argv.slice(2);
const flag = (name, dflt = undefined) => {
  const i = argv.indexOf(name);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const has = (name) => argv.includes(name);
const MANIFEST_PATH = flag('--manifest');
const OUT = flag('--out');
if (!MANIFEST_PATH || !OUT || has('--help')) {
  console.log('usage: band-proof.mjs --manifest <json> --out <dir> [--rig] [--db name] [--scenes a,b] [--hours 12,0] [--no-parity] [--dwell sec] [--zoom z] [--parity-scenes a,b]');
  process.exit(MANIFEST_PATH && OUT ? 0 : 2);
}
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const BAND = String(manifest.band ?? path.basename(MANIFEST_PATH, '.json')).replace(/[^\w.-]+/g, '-');
const ZOOM = Number(flag('--zoom', manifest.zoom ?? 1.3));
const ONLY = flag('--scenes') ? String(flag('--scenes')).split(',').map((s) => s.trim()).filter(Boolean) : null;
const HOURS_OVERRIDE = flag('--hours') ? String(flag('--hours')).split(',').map(Number).filter(Number.isFinite) : null;
const DWELL_CAP = 120;
const DWELL = Math.min(DWELL_CAP, Number(flag('--dwell', 0)) || 0);
const NO_PARITY = has('--no-parity');
const RIG = has('--rig');
const DB = String(flag('--db', `arx_proof_${BAND.toLowerCase().replace(/[^a-z0-9_]+/g, '_')}`));
const PARITY_SCENES = flag('--parity-scenes') ? String(flag('--parity-scenes')) : manifest.parityScenes?.join(',') ?? null;
const PACING_MS = 1200;
const SEAT_SETTLE_MS = 3000;
const ACCOUNT = { user: 'perf12_probe', pass: 'probe-owl-9127', charname: 'Perfprobe' }; // stage-parity's account: one login serves both
const FORBIDDEN_PORTS = new Set([5231, 8814, 5242, 5243]);

fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now();
const timings = [];
const notes = [];
const pageErrors = [];
const logLine = (s) => { console.log(s); fs.appendFileSync(path.join(OUT, 'run.log'), `[${((Date.now() - T0) / 1000).toFixed(1)}s] ${s}\n`); };
const lap = (label, t) => { timings.push({ label, ms: Date.now() - t }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hhOf = (h) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return String(hh).padStart(2, '0') + (mm ? String(mm).padStart(2, '0') : ''); };
const clockOf = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h - Math.floor(h)) * 60)).padStart(2, '0')}`;

// ------------------------------------------------------------ the rig
// A throwaway server+vite pair on free ports (never the shared lanes),
// on its own DB, torn down on exit with every boot-seeded file pruned.
const rig = { server: null, vite: null, cfg: null, origin: null, serverPort: null, vitePort: null, prefabsBefore: null, dataBefore: null, tornDown: false };
const listeners = (port) => { try { return execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('\n').filter(Boolean); } catch { return []; } };
const freePort = (lo, hi) => {
  for (let a = 0; a < 200; a++) {
    const p = lo + Math.floor(Math.random() * (hi - lo));
    if (FORBIDDEN_PORTS.has(p)) continue;
    if (listeners(p).length === 0) return p;
  }
  throw new Error(`no free port in ${lo}-${hi}`);
};
const lsDir = (d) => { try { return fs.readdirSync(d).sort(); } catch { return null; } };
const waitFor = async (pred, timeoutMs, everyMs = 1000, what = 'condition') => {
  const t = Date.now();
  for (;;) {
    if (await pred()) return true;
    if (Date.now() - t > timeoutMs) throw new Error(`timeout waiting for ${what}`);
    await sleep(everyMs);
  }
};

async function bootRig() {
  const t = Date.now();
  rig.serverPort = freePort(8850, 8899);
  rig.vitePort = freePort(5300, 5399);
  rig.prefabsBefore = lsDir(path.join(REPO, 'data', 'prefabs')) ?? [];
  rig.dataBefore = lsDir(path.join(REPO, 'data')) ?? [];
  // The throwaway vite config: rig.ts with the ports rewritten, HMR off
  // and the watcher blinded (a concurrent build's saves must never
  // reload a shot mid-stage). Deleted on exit.
  const base = fs.readFileSync(path.join(REPO, 'packages/client/vite.config.rig.ts'), 'utf8');
  const cfgText = base
    .replace(/port:\s*5174,/, `port: ${rig.vitePort},\n    hmr: false,\n    watch: { ignored: ['**/*'] },`)
    .replace(/8791/g, String(rig.serverPort))
    .replace('THE ISOLATED RIG', `THE PROOF RIG (band-proof.mjs, pid ${process.pid}, throwaway)`);
  if (!cfgText.includes(`port: ${rig.vitePort}`)) throw new Error('vite.config.rig.ts shape changed; cannot rewrite the port');
  rig.cfg = path.join(REPO, 'packages/client', `vite.config.proof-${process.pid}.ts`);
  fs.writeFileSync(rig.cfg, cfgText);
  const serverLog = fs.openSync(path.join(OUT, 'rig-server.log'), 'w');
  rig.server = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: path.join(REPO, 'packages/server'),
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(rig.serverPort), DB_DATABASE: DB },
    stdio: ['ignore', serverLog, serverLog],
    detached: false,
  });
  const viteLog = fs.openSync(path.join(OUT, 'rig-vite.log'), 'w');
  rig.vite = spawn('npx', ['vite', '--config', path.basename(rig.cfg)], {
    cwd: path.join(REPO, 'packages/client'),
    env: { ...process.env },
    stdio: ['ignore', viteLog, viteLog],
  });
  logLine(`rig: server :${rig.serverPort} db ${DB}, vite :${rig.vitePort} (${path.basename(rig.cfg)})`);
  await waitFor(() => {
    if (rig.server.exitCode !== null) throw new Error(`server died (exit ${rig.server.exitCode}); see ${path.join(OUT, 'rig-server.log')}`);
    return fs.readFileSync(path.join(OUT, 'rig-server.log'), 'utf8').includes('listening on');
  }, 300_000, 1500, 'server listening');
  // Vite binds `localhost`, which on this macOS is ::1 first — probe both
  // spellings and keep whichever answers (the browser follows the same one).
  await waitFor(async () => {
    if (rig.vite.exitCode !== null) throw new Error(`vite died (exit ${rig.vite.exitCode}); see ${path.join(OUT, 'rig-vite.log')}`);
    for (const host of ['localhost', '127.0.0.1']) {
      try { const r = await fetch(`http://${host}:${rig.vitePort}/`); if (r.ok) { rig.origin = `http://${host}:${rig.vitePort}`; return true; } } catch {}
    }
    return false;
  }, 120_000, 1000, 'vite ready');
  logLine(`rig: vite answers at ${rig.origin}`);
  await sleep(1500);
  const seeded = (lsDir(path.join(REPO, 'data', 'prefabs')) ?? []).filter((f) => !rig.prefabsBefore.includes(f));
  if (seeded.length) notes.push(`boot seeded data/prefabs: ${seeded.join(' ')} (pruned at teardown)`);
  lap('rig boot', t);
}

const killTree = (child, name) => {
  if (!child || child.exitCode !== null) return;
  try { child.kill('SIGTERM'); } catch {}
  setTimeout(() => { try { if (child.exitCode === null) child.kill('SIGKILL'); } catch {} }, 3000).unref();
  logLine(`teardown: ${name} pid ${child.pid} signalled`);
};

async function dropDb() {
  try {
    const pg = (await import(path.join(REPO, 'node_modules/pg/lib/index.js'))).default;
    const c = new pg.Client({ host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 5432), database: 'postgres', user: process.env.DB_USERNAME || undefined, password: process.env.DB_PASSWORD || undefined });
    await c.connect();
    await c.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [DB]);
    await c.query(`DROP DATABASE IF EXISTS "${DB.replace(/"/g, '')}"`);
    const r = await c.query(`SELECT datname FROM pg_database WHERE datname = $1`, [DB]);
    await c.end();
    logLine(`teardown: db ${DB} dropped (rows after: ${r.rowCount})`);
  } catch (e) { logLine(`teardown WARN: db drop failed: ${String(e.message).slice(0, 200)}`); }
}

async function teardownRig() {
  if (!RIG || rig.tornDown) return;
  rig.tornDown = true;
  killTree(rig.server, 'server');
  killTree(rig.vite, 'vite');
  await sleep(3500);
  for (const p of [rig.serverPort, rig.vitePort]) for (const pid of listeners(p)) { try { process.kill(Number(pid), 'SIGKILL'); logLine(`teardown: port ${p} pid ${pid} killed`); } catch {} }
  await dropDb();
  if (rig.cfg && fs.existsSync(rig.cfg)) { fs.unlinkSync(rig.cfg); logLine(`teardown: ${path.basename(rig.cfg)} removed`); }
  // Prune every file the boot seeded under data/prefabs; a data/maps born
  // by the boot goes too. Files that stood before the boot are never touched.
  const after = lsDir(path.join(REPO, 'data', 'prefabs')) ?? [];
  for (const f of after) if (!rig.prefabsBefore.includes(f)) { fs.unlinkSync(path.join(REPO, 'data', 'prefabs', f)); logLine(`teardown: removed seeded prefab ${f}`); }
  if (!rig.dataBefore.includes('maps') && fs.existsSync(path.join(REPO, 'data', 'maps'))) { fs.rmSync(path.join(REPO, 'data', 'maps'), { recursive: true, force: true }); logLine('teardown: removed data/maps'); }
  const dataNow = lsDir(path.join(REPO, 'data')) ?? [];
  for (const f of dataNow) if (!rig.dataBefore.includes(f)) notes.push(`teardown WARN: data/${f} appeared during the run and was left alone`);
  logLine(`teardown: ports ${rig.serverPort}=${listeners(rig.serverPort).length} ${rig.vitePort}=${listeners(rig.vitePort).length}`);
}
let exiting = false;
const bail = async (code, why) => { if (exiting) return; exiting = true; if (why) logLine(why); try { await teardownRig(); } catch {} process.exit(code); };
process.on('SIGINT', () => bail(130, 'SIGINT'));
process.on('SIGTERM', () => bail(143, 'SIGTERM'));
process.on('uncaughtException', (e) => bail(3, `uncaught: ${e.stack ?? e}`));
process.on('unhandledRejection', (e) => bail(3, `unhandled: ${e?.stack ?? e}`));

// ------------------------------------------------------------ the session
async function openSession(origin) {
  const t = Date.now();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 })).newPage();
  page.on('pageerror', (e) => { const m = e.message.slice(0, 300); pageErrors.push(m); logLine(`[pageerror] ${m}`); });
  // The game shell answers at /play (dev as production); a lane without
  // that rewrite serves it at the root.
  await page.goto(origin + '/play');
  const atPlay = await page.waitForSelector('#login-submit', { timeout: 20000 }).then(() => true).catch(() => false);
  if (!atPlay) { await page.goto(origin + '/'); await page.waitForSelector('#login-submit', { timeout: 60000 }); notes.push('game shell served at / (no /play rewrite on this lane)'); }
  await page.fill('#login-user', ACCOUNT.user); await page.fill('#login-pass', ACCOUNT.pass); await page.click('#login-submit');
  const inGame = await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 8000 }).then(() => true).catch(() => false);
  if (!inGame) {
    // The register door (a fresh rig DB has no account yet).
    await page.click('#login-toggle'); await page.waitForTimeout(300);
    await page.fill('#login-user', ACCOUNT.user); await page.fill('#login-pass', ACCOUNT.pass); await page.fill('#login-charname', ACCOUNT.charname);
    await page.click('#login-submit');
    await page.waitForFunction(() => window.dcGame && window.dcGame.connStatus === 'ingame', null, { timeout: 30000 });
    notes.push(`registered ${ACCOUNT.user} on this server`);
  }
  const mirror = await page.waitForSelector('#look-confirm', { timeout: 4000 }).catch(() => null);
  if (mirror) { await mirror.click(); await page.waitForTimeout(1200); }
  await page.waitForFunction(() => document.getElementById('look-panel')?.classList.contains('hidden') ?? true, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2000); await page.mouse.move(5, 5);
  // The chat tap: every system line lands in window.__chat.
  await page.evaluate(() => {
    const g = window.dcGame; window.__chat = [];
    const ev = g.events; const orig = ev.onChat.bind(ev);
    ev.onChat = (l) => { try { window.__chat.push({ ch: l.channel, from: l.from, text: l.text, at: performance.now() }); } catch {} return orig(l); };
  });
  const drain = () => page.evaluate(() => { const c = window.__chat; window.__chat = []; return c; });
  const sys = async () => (await drain()).filter((l) => l.ch === 'system').map((l) => l.text);
  const say = async (text, ms = PACING_MS) => { await page.evaluate((x) => window.dcGame.sendChat(x), text); await page.waitForTimeout(ms); };
  const plane = () => page.evaluate(() => window.dcGame.plane?.id ?? 'world');
  const pos = () => page.evaluate(() => [Math.round(window.dcRenderer.ownPX * 10) / 10, Math.round(window.dcRenderer.ownPY * 10) / 10]);
  const zoom = (z) => page.evaluate((v) => { window.dcRenderer.camera.setZoom(v); }, z);
  // THE PLANE CHECK: /museum toggles; only cross when the scene asks for the other side.
  const ensurePlane = async (want) => {
    const cur = await plane();
    const inMuseum = cur === 'museum';
    if ((want === 'museum') === inMuseum) return;
    for (let a = 0; a < 4; a++) {
      await say('/museum', 3000);
      if (((await plane()) === 'museum') === (want === 'museum')) return;
    }
    throw new Error(`plane never flipped to ${want} (now ${await plane()})`);
  };
  // THE VERIFIED TELEPORT (world tile → its centre).
  const tp = async (tx, ty, tol = 1.6) => {
    for (let a = 0; a < 8; a++) {
      await page.evaluate((t) => window.dcGame.sendChat(t), `/tp ${tx} ${ty}`);
      try { await page.waitForFunction(([x, y, tl]) => Math.abs(window.dcRenderer.ownPX - (x + 0.5)) < tl && Math.abs(window.dcRenderer.ownPY - (y + 0.5)) < tl, [tx, ty, tol], { timeout: 2500 }); return true; } catch {}
    }
    logLine(`WARN teleport never landed: ${tx},${ty}; now at ${JSON.stringify(await pos())}`); return false;
  };
  // THE VERIFIED CLOCK JUMP: /time is broadcast as "Time set: hh:mm" — wait for it, retry if eaten.
  const setHour = async (h) => {
    for (let a = 0; a < 6; a++) {
      await drain();
      await page.evaluate((t) => window.dcGame.sendChat(t), `/time ${h}`);
      const t = Date.now();
      while (Date.now() - t < 2500) {
        await page.waitForTimeout(150);
        const hit = (await page.evaluate(() => window.__chat)).find((l) => l.ch === 'system' && /^Time set:/.test(l.text));
        if (hit) return hit.text.replace('Time set: ', '');
      }
    }
    throw new Error(`/time ${h} never acknowledged`);
  };
  // Readiness: the ground bake queue drained, then the pacing wait.
  // chunkJobQueue is rebuilt EVERY FRAME from the visible chunks plus
  // the pre-bake ring; an entry in it with `pending` is a sliced bake
  // still walking. (Never scan the whole `baked` map: a chunk that
  // fell out of the ring keeps its pending forever and never settles.)
  // A bake that never settles is noted, never fatal.
  const waitBaked = async (timeout = 15000) => {
    const ok = await page.waitForFunction(() => {
      const R = window.dcRenderer; if (!R) return false;
      const q = R.chunkJobQueue ?? [];
      for (const e of q) if (e.pending) return false;
      return true;
    }, null, { timeout }).then(() => true).catch(() => false);
    if (!ok) notes.push(`bake queue never drained within ${timeout}ms at ${JSON.stringify(await pos())}`);
    await page.waitForTimeout(PACING_MS);
    return ok;
  };
  const shot = async (file) => {
    for (let a = 0; a < 3; a++) {
      try { await page.screenshot({ path: file, timeout: 20000, animations: 'disabled' }); return true; }
      catch (e) { logLine(`WARN shot retry ${path.basename(file)}: ${String(e.message).slice(0, 80)}`); await page.waitForTimeout(600); }
    }
    return false;
  };
  // The server's own word: /routines → rows {name, routine, slot, kind, wp, state, x, y} + the clock.
  const routines = async () => {
    await drain();
    await page.evaluate(() => window.dcGame.sendChat('/routines'));
    let text = null;
    for (let a = 0; a < 20 && !text; a++) { await page.waitForTimeout(150); const c = await page.evaluate(() => window.__chat); const hit = c.find((l) => l.ch === 'system' && /^Routines at/.test(l.text)); if (hit) text = hit.text; }
    if (!text) return { clock: null, clockText: null, rows: [] };
    const [head, ...lines] = text.split('\n');
    const clock = head.match(/at (\d+):(\d+)/); const hours = clock ? +clock[1] + (+clock[2]) / 60 : null;
    const rows = lines.map((l) => { const m = l.match(/^(.*?): (\S+) slot (-?\d+) (\S+)(?: wp(\d+))? (\S+)(?: @ (-?[\d.]+),(-?[\d.]+))?$/); if (!m) return { raw: l }; return { name: m[1], routine: m[2], slot: +m[3], kind: m[4], wp: m[5] === undefined ? null : +m[5], state: m[6], x: m[7] === undefined ? null : +m[7], y: m[8] === undefined ? null : +m[8] }; });
    return { clock: hours, clockText: clock ? `${clock[1]}:${clock[2]}` : null, rows };
  };
  // Bodies the client paints near a point: name, pos, pose (14 sit, 16 lie), dir.
  const bodies = (r = 14, cx = null, cy = null) => page.evaluate(([rad, cx, cy]) => {
    const R = window.dcRenderer; const out = []; const ox = cx ?? R.ownPX, oy = cy ?? R.ownPY;
    for (const [eid, e] of window.dcGame.entities) {
      const nm = e.meta?.name; if (!nm || e.meta?.kind === 'player') continue;
      const s = e.buffer?.samples; const last = Array.isArray(s) && s.length ? s[s.length - 1] : null; if (!last) continue;
      if (Math.abs(last.x - ox) > rad || Math.abs(last.y - oy) > rad) continue;
      out.push({ eid, name: nm, actor: e.meta?.actor ?? null, x: +last.x.toFixed(2), y: +last.y.toFixed(2), pose: last.pose, dir: +(last.dir ?? 0).toFixed(2), hp: last.hpPct ?? null });
    }
    return out;
  }, [r, cx, cy]);
  lap('session open', t);
  return { browser, page, say, sys, drain, plane, pos, zoom, ensurePlane, tp, setHour, waitBaked, shot, routines, bodies };
}

// ------------------------------------------------------------ the run
const result = { band: BAND, origin: null, scenes: [], seating: [], parity: null, contact: null, ok: true };
let session = null;
try {
  if (RIG) await bootRig();
  const ORIGIN = RIG ? rig.origin : (process.env.ORIGIN ?? 'http://localhost:5231');
  result.origin = ORIGIN;
  logLine(`origin ${ORIGIN}; band ${BAND}; zoom ${ZOOM}; out ${OUT}`);
  session = await openSession(ORIGIN);
  const S = session;
  // The walker outlives whatever the setup stands beside it.
  for (const sk of ['vitality', 'defence']) await S.say(`/xp ${sk} 10000000`, 400);

  // ---- setup (overworld; a /tp is verified, anything else is said and its reply kept)
  const setupReplies = [];
  if (Array.isArray(manifest.setup) && manifest.setup.length) {
    const t = Date.now();
    await S.ensurePlane('world');
    for (const cmd of manifest.setup) {
      const m = cmd.match(/^\/tp\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/);
      await S.drain();
      if (m) { const ok = await S.tp(Math.floor(+m[1]), Math.floor(+m[2])); setupReplies.push({ cmd, ok }); }
      else { await S.say(cmd, PACING_MS); const reply = (await S.sys()).join(' | '); setupReplies.push({ cmd, reply }); logLine(`setup ${cmd} -> ${reply.slice(0, 160)}`); }
    }
    lap('setup', t);
  }

  // ---- body anchors: a body with `anchor: 'spawn'` (or any dx/dy stop) measures its stops from where the server first reports it
  const actorName = (slug) => { try { return JSON.parse(fs.readFileSync(path.join(REPO, 'packages/content/src/actors/defs', `${slug}.json`), 'utf8')).name ?? slug; } catch { return slug; } };
  const bodiesDef = (manifest.bodies ?? []).map((b) => ({ ...b, name: b.name ?? actorName(b.slug), anchorPos: null }));
  const nearestRow = (rows, name, x, y) => {
    let best = null;
    for (const r of rows) { if (r.name !== name || r.x === null) continue; const d = Math.hypot(r.x - x, r.y - y); if (!best || d < best.d) best = { ...r, d }; }
    return best;
  };
  if (bodiesDef.some((b) => b.anchor === 'spawn' || b.stops.some((s) => s.dx !== undefined || s.dy !== undefined))) {
    await S.ensurePlane('world');
    const here = await S.pos();
    const rr = await S.routines();
    for (const b of bodiesDef) {
      const [nx, ny] = b.near ?? here;
      const row = nearestRow(rr.rows, b.name, nx, ny);
      b.anchorPos = row ? { x: row.x, y: row.y } : null;
      logLine(`anchor ${b.slug} (${b.name}): ${row ? `${row.x},${row.y} (${row.kind} ${row.state}, d ${row.d.toFixed(1)} from near)` : 'NOT IN /routines'}`);
    }
  }

  // ---- scenes × hours
  const scenes = (manifest.scenes ?? []).filter((s) => !ONLY || ONLY.includes(s.id));
  if (ONLY) for (const id of ONLY) if (!scenes.some((s) => s.id === id)) notes.push(`--scenes ${id}: no such scene in the manifest`);
  const hoursFor = (s) => {
    const list = HOURS_OVERRIDE ?? s.hours ?? manifest.hours ?? [12, s.hour, 0];
    const seen = new Set(); const out = [];
    for (const h of list.map((h) => (h === undefined || h === null ? s.hour : h))) { if (h === undefined || h === null || !Number.isFinite(+h)) continue; const k = +h; if (!seen.has(k)) { seen.add(k); out.push(k); } }
    return out;
  };
  for (const sc of scenes) {
    const t = Date.now();
    const rec = { id: sc.id, x: sc.x, y: sc.y, plane: sc.plane ?? 'world', notes: sc.notes ?? null, shots: [] };
    await S.ensurePlane(rec.plane);
    await S.zoom(ZOOM);
    const landed = await S.tp(sc.x, sc.y);
    for (const h of hoursFor(sc)) {
      const clock = await S.setHour(h);
      const baked = await S.waitBaked();
      const dwell = Math.min(DWELL_CAP, Number(sc.dwell ?? DWELL) || 0);
      if (dwell > 0) await S.page.waitForTimeout(dwell * 1000);
      const file = path.join(OUT, `${sc.id}-${hhOf(h)}-z${ZOOM}.png`);
      const ok = await S.shot(file);
      const seen = await S.bodies(18);
      rec.shots.push({ hour: h, clock, file: path.basename(file), ok, landed, baked, dwell, at: await S.pos(), bodies: seen });
      logLine(`shot ${path.basename(file)} ${ok ? 'ok' : 'FAILED'} clock ${clock} at ${JSON.stringify(await S.pos())} bodies ${seen.length}`);
      if (!ok || !landed) result.ok = false;
    }
    result.scenes.push(rec);
    lap(`scene ${sc.id}`, t);
  }

  // ---- seating: every body × stop, the clock jumped, the server's word graded
  for (const b of bodiesDef) {
    const t = Date.now();
    for (const st of b.stops ?? []) {
      const ex = st.x !== undefined && st.y !== undefined
        ? { x: +st.x, y: +st.y }
        : b.anchorPos ? { x: b.anchorPos.x + (+st.dx || 0), y: b.anchorPos.y + (+st.dy || 0) } : null;
      const tol = Number(st.tol ?? b.tol ?? 1.5);
      const row0 = { body: b.slug, name: b.name, hour: st.hour, expected: ex, tol, kind: st.kind ?? null, state: st.state ?? null, pose: st.pose ?? null };
      if (!ex) { result.seating.push({ ...row0, verdict: 'FAIL', why: 'no expected position (anchor not found)' }); result.ok = false; continue; }
      await S.ensurePlane(b.plane ?? 'world');
      await S.zoom(ZOOM);
      await S.tp(Math.floor(ex.x) - 2, Math.floor(ex.y));
      const clock = await S.setHour(st.hour);
      await S.page.waitForTimeout(SEAT_SETTLE_MS);
      const rr = await S.routines();
      const row = nearestRow(rr.rows, b.name, ex.x, ex.y);
      const seen = row ? (await S.bodies(6, row.x, row.y)).filter((o) => o.name === b.name).sort((p, q) => Math.hypot(p.x - row.x, p.y - row.y) - Math.hypot(q.x - row.x, q.y - row.y))[0] ?? null : null;
      const why = [];
      if (!row) why.push('not in /routines');
      else {
        if (row.d > tol) why.push(`off by ${row.d.toFixed(2)} > ${tol}`);
        if (st.kind && row.kind !== st.kind) why.push(`kind ${row.kind} != ${st.kind}`);
        if (st.state && row.state !== st.state) why.push(`state ${row.state} != ${st.state}`);
        if (st.pose !== undefined && st.pose !== null && (!seen || seen.pose !== st.pose)) why.push(`pose ${seen?.pose ?? '?'} != ${st.pose}`);
      }
      const verdict = why.length ? 'FAIL' : 'PASS';
      if (verdict === 'FAIL') result.ok = false;
      const file = path.join(OUT, `seat-${b.slug}-${hhOf(st.hour)}-z${ZOOM}.png`);
      await S.shot(file);
      result.seating.push({ ...row0, clock, serverClock: rr.clockText, server: row ? { x: row.x, y: row.y, d: +row.d.toFixed(2), routine: row.routine, slot: row.slot, kind: row.kind, wp: row.wp, state: row.state } : null, client: seen ? { x: seen.x, y: seen.y, pose: seen.pose, dir: seen.dir } : null, shot: path.basename(file), verdict, why: why.join('; ') || null });
      logLine(`seat ${verdict} ${b.slug} @${clockOf(st.hour)} expected ${ex.x},${ex.y} server ${row ? `${row.x},${row.y} ${row.kind} ${row.state} d${row.d.toFixed(2)}` : 'none'} client ${seen ? `p${seen.pose} dir${seen.dir}` : 'none'}${why.length ? ' — ' + why.join('; ') : ''}`);
    }
    lap(`seating ${b.slug}`, t);
  }
  // Leave the account in the overworld at noon: parity (and the next run) expect it.
  await S.ensurePlane('world');
  await S.setHour(12).catch(() => {});
  await S.browser.close(); session = null;

  // ---- seating tables
  fs.writeFileSync(path.join(OUT, 'seating.json'), JSON.stringify(result.seating, null, 2));
  const seatMd = ['# Seating — ' + BAND, '', `Tolerance per stop (default 1.5 tiles); server = /routines row nearest the expected point; client = the painted body (pose 14 sit, 16 lie).`, '',
    '| body | stop | clock | expected | server pos | Δ | kind / state | client pose / dir | verdict | why |', '|---|---|---|---|---|---|---|---|---|---|',
    ...result.seating.map((r) => `| ${r.body} | ${clockOf(r.hour)} | ${r.serverClock ?? '-'} | ${r.expected ? `${r.expected.x},${r.expected.y} ±${r.tol}` : '-'} | ${r.server ? `${r.server.x},${r.server.y}` : '-'} | ${r.server ? r.server.d : '-'} | ${r.server ? `${r.server.kind} / ${r.server.state}` : '-'} | ${r.client ? `${r.client.pose} / ${r.client.dir}` : '-'} | **${r.verdict}** | ${r.why ?? ''} |`), ''].join('\n');
  fs.writeFileSync(path.join(OUT, 'seating.md'), seatMd);

  // ---- parity (a child on the same ORIGIN; the same account, now logged out)
  if (!NO_PARITY) {
    const t = Date.now();
    const env = { ...process.env, ORIGIN };
    if (PARITY_SCENES) env.SCENES = PARITY_SCENES;
    const parityOut = await new Promise((resolve) => {
      const ch = spawn(process.execPath, [path.join(HERE, 'stage-parity.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
      let text = '';
      ch.stdout.on('data', (d) => { text += d; });
      ch.stderr.on('data', (d) => { text += d; });
      ch.on('close', (code) => resolve({ code, text }));
    });
    fs.writeFileSync(path.join(OUT, 'parity.txt'), parityOut.text);
    result.parity = { code: parityOut.code, pass: parityOut.code === 0, lines: parityOut.text.split('\n').filter((l) => /^(PASS|FAIL|PARITY)/.test(l)) };
    if (!result.parity.pass) result.ok = false;
    logLine(`parity ${result.parity.pass ? 'PASS' : 'FAIL'} (exit ${parityOut.code})`);
    lap('parity', t);
  }

  // ---- contact sheet: every scene × hour, labelled, max 6 columns (Playwright composes; no canvas dep)
  {
    const t = Date.now();
    // Every manifest scene × hour whose file stands on disk — a scoped
    // re-shoot (--scenes/--hours) refreshes its cells and keeps the rest.
    const cells = [];
    const allScenes = manifest.scenes ?? [];
    const savedOverride = HOURS_OVERRIDE;
    for (const sc of allScenes) {
      const hs = (ONLY && !ONLY.includes(sc.id)) || !savedOverride ? (sc.hours ?? manifest.hours ?? [12, sc.hour, 0]) : savedOverride;
      const seen = new Set();
      for (const raw of hs) {
        const h = raw === null || raw === undefined ? sc.hour : +raw;
        if (!Number.isFinite(h) || seen.has(h)) continue; seen.add(h);
        const file = `${sc.id}-${hhOf(h)}-z${ZOOM}.png`;
        if (!fs.existsSync(path.join(OUT, file))) continue;
        const fresh = result.scenes.some((r) => r.id === sc.id && r.shots.some((x) => x.ok && x.file === file));
        cells.push({ label: `${sc.id} · ${clockOf(h)}${fresh ? '' : ' (kept)'}`, sub: `(${sc.x},${sc.y}) ${sc.plane ?? 'world'} z${ZOOM}`, file });
      }
    }
    const nHours = Math.max(1, ...allScenes.map((s) => new Set((s.hours ?? manifest.hours ?? [12, s.hour, 0]).map((h) => (h ?? s.hour))).size));
    const cols = Math.max(1, Math.min(6, nHours <= 6 ? nHours : 6));
    const thumbW = 480;
    const html = `<!doctype html><meta charset="utf-8"><title>contact ${BAND}</title><style>
      body{margin:0;background:#141210;color:#e8dcc4;font:13px/1.3 -apple-system,Helvetica,Arial,sans-serif}
      h1{margin:0;padding:12px 16px 6px;font-size:16px;font-weight:600}
      .grid{display:grid;grid-template-columns:repeat(${cols},${thumbW}px);gap:10px;padding:8px 16px 16px}
      .cell{background:#1e1b17;border:1px solid #3a342c;border-radius:4px;overflow:hidden}
      .cell img{display:block;width:${thumbW}px;height:${Math.round(thumbW * 0.6)}px;object-fit:cover}
      .cap{padding:5px 8px;border-top:1px solid #3a342c}.cap b{display:block}.cap span{color:#a89b84;font-size:11px}
    </style><h1>${BAND} — ${cells.length} shots, ${allScenes.length} scenes · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</h1><div class="grid">${
      cells.map((c) => `<div class="cell"><img src="./${c.file}"><div class="cap"><b>${c.label}</b><span>${c.sub}</span></div></div>`).join('')}</div>`;
    const htmlPath = path.join(OUT, `contact-${BAND}.html`);
    fs.writeFileSync(htmlPath, html);
    if (cells.length) {
      const browser = await chromium.launch({ channel: 'chrome', headless: true });
      const page = await (await browser.newContext({ viewport: { width: cols * (thumbW + 10) + 32, height: 600 }, deviceScaleFactor: 1 })).newPage();
      await page.goto('file://' + path.resolve(htmlPath));
      await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 60000 }).catch(() => {});
      result.contact = path.join(OUT, `contact-${BAND}.png`);
      await page.screenshot({ path: result.contact, fullPage: true });
      await browser.close();
    } else notes.push('no shots succeeded: no contact sheet');
    lap('contact sheet', t);
  }
} catch (e) {
  result.ok = false;
  result.error = String(e.stack ?? e).slice(0, 2000);
  logLine(`ERROR ${result.error}`);
  if (session) { try { await session.browser.close(); } catch {} }
}

// ---- report
const nShots = result.scenes.reduce((n, s) => n + s.shots.length, 0);
const nShotsOk = result.scenes.reduce((n, s) => n + s.shots.filter((x) => x.ok).length, 0);
const seatFails = result.seating.filter((r) => r.verdict === 'FAIL');
const report = [
  `# Proof — ${BAND}`, '',
  `- when: ${new Date().toISOString()}  ·  origin: ${result.origin ?? '-'}  ·  ${RIG ? `rig (server :${rig.serverPort}, vite :${rig.vitePort}, db ${DB})` : 'existing lane'}`,
  `- manifest: ${path.resolve(MANIFEST_PATH)}  ·  out: ${path.resolve(OUT)}`,
  `- verdict: **${result.ok ? 'PASS' : 'FAIL'}**${result.error ? ' (aborted: see error below)' : ''}`, '',
  '## Counts', '',
  `- scenes: ${result.scenes.length}${ONLY ? ` (filtered: ${ONLY.join(',')})` : ''}  ·  shots: ${nShotsOk}/${nShots} ok${HOURS_OVERRIDE ? ` (hours override ${HOURS_OVERRIDE.join(',')})` : ''}`,
  `- seating stops: ${result.seating.length} (${result.seating.filter((r) => r.verdict === 'PASS').length} PASS, ${seatFails.length} FAIL)`,
  `- parity: ${NO_PARITY ? 'skipped (--no-parity)' : result.parity ? `${result.parity.pass ? 'PASS' : 'FAIL'} (exit ${result.parity.code})` : 'not run'}`,
  `- page errors: ${pageErrors.length}`,
  `- contact sheet: ${result.contact ?? '-'}`, '',
  '## Scenes', '',
  ...result.scenes.flatMap((s) => [`- **${s.id}** (${s.x},${s.y}) ${s.plane}${s.notes ? ` — ${s.notes}` : ''}`, ...s.shots.map((x) => `  - ${x.file} ${x.ok ? 'ok' : 'FAILED'} · clock ${x.clock} · landed ${x.landed} · baked ${x.baked}${x.dwell ? ` · dwell ${x.dwell}s` : ''} · bodies in frame ${x.bodies.length}`)]),
  '', '## Seating', '',
  ...(result.seating.length ? result.seating.map((r) => `- ${r.verdict} ${r.body} @${clockOf(r.hour)} expected ${r.expected ? `${r.expected.x},${r.expected.y} ±${r.tol}` : '?'} → server ${r.server ? `${r.server.x},${r.server.y} (${r.server.kind} ${r.server.state}, Δ${r.server.d})` : 'none'}; client ${r.client ? `pose ${r.client.pose} dir ${r.client.dir}` : 'none'}${r.why ? ` — ${r.why}` : ''}`) : ['- none in the manifest']),
  '', '## Failures', '',
  ...(result.ok ? ['- none'] : [
    ...result.scenes.flatMap((s) => s.shots.filter((x) => !x.ok || !x.landed).map((x) => `- shot ${x.file}: ${!x.landed ? 'teleport never landed' : 'screenshot failed'}`)),
    ...seatFails.map((r) => `- seating ${r.body} @${clockOf(r.hour)}: ${r.why}`),
    ...(result.parity && !result.parity.pass ? [`- parity: ${result.parity.lines.filter((l) => l.startsWith('FAIL')).join(' | ') || `exit ${result.parity.code}`}`] : []),
    ...(result.error ? [`- error: ${result.error.split('\n')[0]}`] : []),
  ]),
  '', '## Parity', '',
  ...(result.parity ? result.parity.lines.map((l) => `- ${l}`) : ['- (not run)']),
  '', '## Timings', '',
  ...timings.map((t) => `- ${t.label}: ${(t.ms / 1000).toFixed(1)}s`),
  `- total: ${((Date.now() - T0) / 1000).toFixed(1)}s`,
  '', '## [pageerror]', '',
  ...(pageErrors.length ? pageErrors.map((e) => `- ${e}`) : ['- none']),
  '', '## Notes', '',
  ...(notes.length ? notes.map((n) => `- ${n}`) : ['- none']),
  ...(result.error ? ['', '## Error', '', '```', result.error, '```'] : []),
  '',
].join('\n');
fs.writeFileSync(path.join(OUT, 'report.md'), report);
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(result, null, 2));
logLine(`report: ${path.join(OUT, 'report.md')} — ${result.ok ? 'PASS' : 'FAIL'}`);
await teardownRig();
process.exit(result.ok ? 0 : 1);
