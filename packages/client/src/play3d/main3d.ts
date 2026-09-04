/**
 * PLAY3D — THE LIVING WORLD (S2 entry). The Three.js door onto the
 * REAL game: the production net + world model (ClientGame over /ws),
 * the S1 engine underneath it. Composition only — every law lives in
 * the module it names:
 *
 *   ClientGame  ── chunks ──▶ LiveWorld ──▶ GroundStreamer (ground.ts)
 *               ── entities ▶ EntityStage (bodies.ts) ▶ EntityBillboard
 *               ◀─ input ──── LiveInput (input.ts: keys follow the camera)
 *   Shell (shell.ts) mounts the DOM chrome over the ViewAdapter
 *   (view.ts) exactly as main.ts mounts it over the 2D Renderer.
 *
 * Frame order: pointer → orbit; aim from the cursor pick; game.update
 * (prediction + interp, the same call main.ts makes); world refresh
 * when ClientGame.worldVersion moved; ground streaming around the
 * predicted body under a 6 ms bake budget; the sky follows the body
 * and the server clock; bodies advance + repaint what the frustum
 * sees; the chrome pins itself; the post stack draws.
 *
 * Probe surface (Playwright): window.__play3d and window.dcGame.
 */
import * as THREE from 'three';
import { CHUNK_SIZE, EntityKind } from '@arx/shared';
import { ClientGame } from '../game/clientGame.js';
import { Engine } from './engine.js';
import { LiveWorld } from './liveWorld.js';
import { GroundStreamer } from './ground.js';
import { SpriteAtlas } from './sprites.js';
import { makeBillboardClock } from './billboardMaterial.js';
import { SkyRig } from './lights.js';
import { PostStack } from './post.js';
import { Confession, fmtBytes } from './hud.js';
import { LiveInput, PointerRig } from './input.js';
import { EntityStage } from './bodies.js';
import { Play3DView } from './view.js';
import { Shell } from './shell.js';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const hudHost = document.getElementById('hud3d') as HTMLElement;
const sink = document.getElementById('focus-sink') as HTMLElement;

/** In reach of the hand (main.ts's click law). */
const REACH = 2.2;
/** A click-attack holds the swing this long (one or two ticks). */
const ATTACK_PULSE_MS = 160;

const input = new LiveInput(sink);
const pointer = new PointerRig(canvas);
const clock = makeBillboardClock();
const atlas = new SpriteAtlas();
const io = { dragX: 0, dragY: 0, wheel: 0 };
const frustum = new THREE.Frustum();
const projView = new THREE.Matrix4();

let ground: GroundStreamer;
let sky: SkyRig;
let post: PostStack;
let hud: Confession;
let stage: EntityStage;
let view: Play3DView;
let hudOn = true;
let inkOn = true;
let tiltOn = true;
let day = 1;
/** null = follow the server clock; a number = forced by /3d night|day. */
let dayOverride: number | null = null;
let seenWorldVersion = -1;
let aimMouseX = -1;
let aimMouseY = -1;
let attackPulseUntil = 0;

const shell = new Shell(input, {
  onLocal: (cmd) => {
    if (cmd === 'night') dayOverride = 0.08;
    else if (cmd === 'day') dayOverride = 1;
    else if (cmd === 'clock') dayOverride = null;
    else if (cmd === 'post') post.enabled = !post.enabled;
    else if (cmd === 'ink') post.set({ ink: (inkOn = !inkOn) ? 1 : 0 });
    else if (cmd === 'tilt') post.set({ tilt: (tiltOn = !tiltOn) ? 1 : 0 });
    else if (cmd === 'hud') hudHost.hidden = !(hudOn = !hudOn);
    else shell.system('/3d night | day | clock | post | ink | tilt | hud');
  },
  onPlane: () => {
    // THE CROSSING: ClientGame dropped its store; drop everything that
    // was keyed on it. The ring refills as the new plane streams.
    ground.reset();
    stage.reset();
    sky.setLamps([]);
    seenWorldVersion = -1;
  },
});
const game = new ClientGame(input, shell.events());
const world = new LiveWorld(game);

const engine = new Engine(canvas, {
  sim: () => {
    /* ClientGame runs its own fixed-step tick inside update(). */
  },
  frame: (dt, _alpha, nowMs) => {
    pointer.consume(io);
    engine.orbitInput(io.dragX, io.dragY, io.wheel);
    input.cameraYaw = engine.yaw;
    input.pollGamepad();
    input.attackHeld = nowMs < attackPulseUntil;
    const inGame = game.ownEid !== null;
    // Aim: the ground point under the cursor, re-picked only when the
    // mouse moved (the pick marches the heightfield).
    if (inGame && !shell.screenOpen && (input.mouseX !== aimMouseX || input.mouseY !== aimMouseY)) {
      aimMouseX = input.mouseX;
      aimMouseY = input.mouseY;
      const own = game.predictor.renderPos();
      const c = view.pickWorld(aimMouseX, aimMouseY);
      game.aim = Math.atan2(c.y - own.y, c.x - own.x);
    }
    game.update(nowMs);
    if (game.worldVersion !== seenWorldVersion) {
      seenWorldVersion = game.worldVersion;
      ground.refresh();
    }
    if (inGame) {
      const own = game.predictor.renderPos();
      ground.update(own.x, own.y, 6);
      atlas.flush();
      const gy = ground.heightAt(own.x, own.y);
      engine.target.set(own.x, gy + 0.9, own.y);
      sky.follow(own.x, gy, own.y, nowMs);
      setDay(dayOverride ?? dayFromHours(game.clockHoursNow()));
    }
    clock.uYaw.value = engine.yaw;
    clock.uTime.value = nowMs / 1000;
    clock.uSway.value = 0.05;
    projView.multiplyMatrices(engine.camera.projectionMatrix, engine.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projView);
    stage.update(game, dt, nowMs, engine.yaw, frustum);
    shell.frame(nowMs, () => {
      const pos = game.predictor.pos;
      return game.world.get(Math.floor(pos.x / CHUNK_SIZE), Math.floor(pos.y / CHUNK_SIZE)) !== undefined;
    });
    hud.frame(engine.frameMs, nowMs);
  },
  draw: () => {
    post.render();
    if (hudOn) {
      const own = game.predictor.pos;
      hud.update(performance.now(), engine.renderer.info, {
        world: `${world.label} · ${game.connStatus} · plane ${game.plane.id} · chunks in store ${game.world.size}`,
        'chunks (painted/loaded)': `${ground.stats.painted}/${ground.stats.chunks} · baking ${ground.stats.baking} · bake ${ground.stats.bakeMsLast.toFixed(1)}ms`,
        'cliff faces': ground.stats.faces,
        'standing instances': `${ground.stats.statics} in ${ground.stats.staticDraws} draws · atlas ${atlas.sprites} sprites / ${atlas.pages.length} pages (${atlas.uploads} uploads)`,
        'texture bytes': `ground ${fmtBytes(ground.stats.textureBytes)} · atlas ${fmtBytes(atlas.textureBytes)}`,
        bodies: `${stage.bodies} (${game.entities.size} entities) · repaints ${stage.paints}`,
        camera: `yaw ${engine.pose.yaw.toFixed(2)} pitch ${engine.pose.pitch.toFixed(2)} dist ${engine.pose.dist.toFixed(1)} dpr ${engine.dpr}`,
        player: `${own.x.toFixed(1)}, ${own.y.toFixed(1)} · ${game.ownName}`,
        post: `${post.enabled ? 'on' : 'off'} · ink ${inkOn ? 'on' : 'off'} · tilt ${tiltOn ? 'on' : 'off'} · day ${day.toFixed(2)}${dayOverride !== null ? ' (forced)' : ''}`,
      });
    }
  },
});

/** Sun elevation from the server clock → the sky rig's day factor. */
function dayFromHours(h: number): number {
  const e = Math.cos(((h - 12) / 24) * Math.PI * 2);
  return 0.08 + 0.92 * Math.min(1, Math.max(0, (e + 0.25) / 1.25));
}

function setDay(k: number): void {
  if (Math.abs(k - day) < 0.004) return;
  day = k;
  sky.setDay(k);
  post.set({ night: 1 - k });
}

/** A fightable body standing at a world point (the click-attack). */
function foeAt(wx: number, wy: number): { eid: number; x: number; y: number } | null {
  const t = game.renderTime();
  let best: { eid: number; x: number; y: number } | null = null;
  let bestD = 0.75;
  for (const [eid, remote] of game.entities) {
    const m = remote.meta;
    if (m.kind !== EntityKind.Npc || m.friendly || m.talk || m.stock || m.ownerEid !== undefined) continue;
    const s = remote.buffer.sampleSmoothed(t);
    const x = s?.x ?? m.x;
    const y = s?.y ?? m.y;
    const d = Math.hypot(x - wx, y - wy);
    if (d < bestD) {
      bestD = d;
      best = { eid, x, y };
    }
  }
  return best;
}

/** THE CLICK: use what is in reach, strike a foe, else walk there. */
function onWorldClick(sx: number, sy: number): void {
  if (game.ownEid === null) return;
  const w = view.pickWorld(sx, sy);
  const tx = Math.floor(w.x);
  const ty = Math.floor(w.y);
  const pos = game.predictor.pos;
  const foe = foeAt(w.x, w.y);
  if (foe && Math.hypot(foe.x - pos.x, foe.y - pos.y) <= REACH + 0.6) {
    game.aim = Math.atan2(foe.y - pos.y, foe.x - pos.x);
    attackPulseUntil = performance.now() + ATTACK_PULSE_MS;
    return;
  }
  const target = game.targetAt(tx, ty);
  const near = Math.hypot(tx + 0.5 - pos.x, ty + 0.5 - pos.y) <= REACH;
  if (target && near) {
    const petHit = game.petAtTile(tx, ty) ?? game.companionAtTile(tx, ty);
    if (petHit !== null) game.interactNpc(petHit);
    else if (target.kind === 'npc') game.interactNpc(target.eid);
    else if (target.kind === 'loot') game.pickupWalk(target.eid);
    else if (target.kind === 'station' || target.kind === 'bank' || target.kind === 'shop' || target.kind === 'stable') {
      shell.system('That bench is not mounted on this door yet.');
    } else game.interact(tx, ty);
    return;
  }
  if (target?.kind === 'loot') {
    game.pickupWalk(target.eid);
    return;
  }
  if (foe) {
    if (!game.walkTo(Math.floor(foe.x), Math.floor(foe.y))) shell.system('No path there.');
    return;
  }
  if (!game.walkTo(tx, ty)) shell.system('No path there.');
}

function boot(): void {
  sky = new SkyRig(engine.scene, clock);
  ground = new GroundStreamer(engine.scene, world, atlas, clock);
  ground.onLampsChanged = (lamps) => sky.setLamps(lamps);
  stage = new EntityStage(engine.scene, clock, (wx, wy) => ground.heightAt(wx, wy));
  post = new PostStack(engine.renderer, engine.scene, engine.camera);
  hud = new Confession(hudHost);
  view = new Play3DView(engine, (wx, wy) => ground.heightAt(wx, wy));
  shell.attach(game, view);
  engine.onResize = (w, h, dpr) => post.resize(w, h, dpr);
  engine.onContext = (lost) => {
    hudHost.dataset.context = lost ? 'lost' : 'restored';
  };
  engine.resize();
  pointer.onClick = onWorldClick;
  // The orbit remembers itself like the 2D zoom does.
  try {
    const saved = JSON.parse(localStorage.getItem('arx.orbit3d') ?? 'null') as { yaw: number; pitch: number; dist: number } | null;
    if (saved && Number.isFinite(saved.yaw) && Number.isFinite(saved.pitch) && Number.isFinite(saved.dist)) {
      engine.setOrbit(saved.yaw, saved.pitch, saved.dist);
    }
  } catch {
    /* a bad card is no card */
  }
  window.setInterval(() => {
    localStorage.setItem('arx.orbit3d', JSON.stringify(engine.want));
  }, 4000);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2') hudHost.hidden = !(hudOn = !hudOn);
  });
  engine.start();
  game.connect(localStorage.getItem('arx.token'));
}

/** Playwright's hands on the page. */
const probe = {
  setCamera: (yaw: number, pitch: number, dist: number): void => engine.setOrbit(yaw, pitch, dist),
  day: (k: number | null): void => {
    dayOverride = k;
  },
  post: (on: boolean): void => {
    post.enabled = on;
  },
  ink: (k: number): void => post.set({ ink: k }),
  tilt: (k: number): void => post.set({ tilt: k }),
  click: onWorldClick,
  /** Step the streamer to completion around the body (all ring chunks painted). */
  settle: (): boolean => {
    if (game.ownEid === null) return false;
    const own = game.predictor.pos;
    ground.refresh();
    ground.update(own.x, own.y, 50);
    atlas.flush();
    return ground.stats.chunks > 0 && ground.stats.baking === 0 && ground.stats.painted === ground.stats.chunks;
  },
  stats: (): Record<string, unknown> => ({
    hud: hud.lines,
    ground: { ...ground.stats },
    atlas: { sprites: atlas.sprites, pages: atlas.pages.length, uploads: atlas.uploads, bytes: atlas.textureBytes },
    bodies: { count: stage.bodies, paints: stage.paints, entities: game.entities.size },
    info: {
      calls: engine.renderer.info.render.calls,
      triangles: engine.renderer.info.render.triangles,
      geometries: engine.renderer.info.memory.geometries,
      textures: engine.renderer.info.memory.textures,
      programs: engine.renderer.info.programs?.length ?? 0,
    },
    frameMs: engine.frameMs,
    world: { label: world.label, store: game.world.size, version: game.worldVersion, plane: game.plane.id },
    player: { x: game.predictor.pos.x, y: game.predictor.pos.y, name: game.ownName, status: game.connStatus },
    camera: { ...engine.pose },
  }),
  dispose: (): void => {
    engine.stop();
    stage.dispose();
    ground.dispose();
    atlas.dispose();
    post.dispose();
    sky.dispose();
    hud.dispose();
    pointer.dispose();
    engine.dispose();
  },
};
(window as unknown as { __play3d: typeof probe; dcGame: ClientGame }).__play3d = probe;
(window as unknown as { dcGame: ClientGame }).dcGame = game;

boot();
