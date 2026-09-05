/**
 * PLAY3D — THE LIVING WORLD (S2 entry; S3 review fixes). The Three.js
 * door onto the REAL game: the production net + world model
 * (ClientGame over /ws), the S1 engine underneath it. Composition only
 * — every law lives in the module it names:
 *
 *   ClientGame  ── chunks ──▶ LiveWorld ──▶ GroundStreamer (ground.ts)
 *               ── entities ▶ EntityStage (bodies.ts) ▶ EntityBillboard
 *               ◀─ input ──── LiveInput (input.ts: keys follow the camera)
 *   Shell (shell.ts) mounts the DOM chrome over the ViewAdapter
 *   (view.ts) exactly as main.ts mounts it over the 2D Renderer.
 *   Backend (backend/createBackend.ts) is the one GPU-API decision.
 *
 * Frame order (engine.ts): `frame` = pointer → orbit; game.update
 * (prediction + interp, the same call main.ts makes); world refresh
 * when ClientGame.worldVersion moved; ground streaming around the
 * predicted body under a 6 ms bake budget; the sky follows the body
 * and the server clock; the orbit target. Then the camera is placed.
 * Then `late` = everything that reads the camera: the cursor pick +
 * aim, the frustum, bodies advance + repaint what the frustum sees,
 * the chrome pins itself. Then the post stack draws.
 *
 * THE AIM: the ground point under the cursor is picked only when the
 * mouse moved (the pick marches the heightfield), but `game.aim` is
 * recomputed EVERY frame from the body's render position toward that
 * cached point — a still cursor over a walking body still aims true
 * (main.ts recomputes it every frame too). A click-strike holds its
 * foe aim for the pulse.
 *
 * Probe surface (Playwright): window.__play3d and window.dcGame.
 */
import * as THREE from 'three';
import { CHUNK_SIZE, EntityKind } from '@arx/shared';
import { ClientGame } from '../game/clientGame.js';
import { Engine } from './engine.js';
import { createBackend } from './backend/createBackend.js';
import type { PostStage } from './stageBackend.js';
import { LiveWorld } from './liveWorld.js';
import { GroundStreamer } from './ground.js';
import { SpriteAtlas } from './sprites.js';
import { makeBillboardClock } from './billboard.js';
import { SkyRig } from './lights.js';
import { Confession, fmtBytes, fmtStructStats } from './hud.js';
import { FaceAtlas } from './structures/faceAtlas.js';
import { StructMaterials } from './structures/structMaterials.js';
import { ChunkStructures } from './structures/structures.js';
import { DoorLeafLayer } from './structures/doors.js';
import { tickDeckLiftMemo } from './structures/deckFaces.js';
import { unpackCx, unpackCy } from './chunkRing.js';
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
const io = { dragX: 0, dragY: 0, wheel: 0 };
const frustum = new THREE.Frustum();
const projView = new THREE.Matrix4();

let ground: GroundStreamer;
let sky: SkyRig;
let post: PostStage;
let hud: Confession;
let stage: EntityStage;
let view: Play3DView;
let atlas: SpriteAtlas;
let faces: FaceAtlas;
let structMats: StructMaterials;
let structures: ChunkStructures;
let doorLayer: DoorLeafLayer;
let hudOn = true;
let inkOn = true;
let tiltOn = true;
let day = 1;
/** null = follow the server clock; a number = forced by /3d night|day. */
let dayOverride: number | null = null;
let seenWorldVersion = -1;
let aimMouseX = -1;
let aimMouseY = -1;
/** The cached ground point under the cursor (world tiles). */
let aimWx = 0;
let aimWy = 0;
let aimValid = false;
let attackPulseUntil = 0;
let orbitSaveTimer = 0;

/** The door layer's keep predicate, bound ONCE (a per-frame closure was an allocation). */
const keepBuiltChunk = (key: number): boolean => structures.has(unpackCx(key), unpackCy(key));

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

/** Is the ground under the body stood up yet (the crossing veil's question)? */
const groundIn = (): boolean => {
  const pos = game.predictor.pos;
  return game.world.get(Math.floor(pos.x / CHUNK_SIZE), Math.floor(pos.y / CHUNK_SIZE)) !== undefined;
};

const engine = new Engine(canvas, createBackend(canvas), {
  frame: (_dt, nowMs) => {
    pointer.consume(io);
    engine.orbitInput(io.dragX, io.dragY, io.wheel);
    input.cameraYaw = engine.yaw;
    input.pollGamepad();
    input.attackHeld = nowMs < attackPulseUntil;
    game.update(nowMs);
    if (game.worldVersion !== seenWorldVersion) {
      seenWorldVersion = game.worldVersion;
      ground.refresh();
    }
    if (game.ownEid !== null) {
      const own = game.predictor.renderPos();
      ground.update(own.x, own.y, 6, game.plane);
      atlas.flush();
      faces.flush();
      // W2 walls: the hinged leaves swing on their own clock, pruned to the built chunks.
      doorLayer.update(nowMs, keepBuiltChunk);
      tickDeckLiftMemo(nowMs);
      const gy = ground.heightAt(own.x, own.y);
      engine.target.set(own.x, gy + 0.9, own.y);
      sky.follow(own.x, gy, own.y, engine.pose.dist, nowMs);
      setDay(dayOverride ?? dayFromHours(game.clockHoursNow()));
    }
    clock.uYaw.value = engine.yaw;
    clock.uTime.value = nowMs / 1000;
    clock.uSway.value = 0.05;
  },
  late: (dt, nowMs) => {
    if (game.ownEid !== null && !shell.screenOpen && !shell.cinemaOpen) {
      // The pick only when the mouse moved; the aim every frame.
      if (input.mouseX !== aimMouseX || input.mouseY !== aimMouseY) {
        aimMouseX = input.mouseX;
        aimMouseY = input.mouseY;
        const c = view.pickWorld(aimMouseX, aimMouseY);
        aimWx = c.x;
        aimWy = c.y;
        aimValid = true;
      }
      if (aimValid && nowMs >= attackPulseUntil) {
        const own = game.predictor.renderPos();
        game.aim = Math.atan2(aimWy - own.y, aimWx - own.x);
      }
    }
    projView.multiplyMatrices(engine.camera.projectionMatrix, engine.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projView);
    stage.update(game, dt, nowMs, engine.yaw, frustum);
    shell.frame(nowMs, groundIn);
    hud.frame(engine.frameMs, nowMs);
  },
  draw: () => {
    post.render();
    if (!hudOn) return;
    const now = performance.now();
    if (!hud.due(now)) return;
    const own = game.predictor.pos;
    hud.update(now, engine.renderer.info, {
      world: `${world.label} · ${game.connStatus} · plane ${game.plane.id} · chunks in store ${game.world.size}`,
      'chunks (painted/loaded)': `${ground.stats.painted}/${ground.stats.chunks} · baking ${ground.stats.baking} · bake ${ground.stats.bakeMsLast.toFixed(1)}ms`,
      'cliff faces': ground.stats.faces,
      'standing instances': `${ground.stats.statics} in ${ground.stats.staticDraws} draws · atlas ${atlas.sprites} sprites / ${atlas.pages.length} pages (${atlas.uploads} page uploads, ${atlas.blits} blits)`,
      'texture bytes': `ground ${fmtBytes(ground.stats.textureBytes)} (cpu canvases ${fmtBytes(ground.stats.canvasBytes)}) · atlas ${fmtBytes(atlas.textureBytes)}`,
      structures: fmtStructStats(structures.stats),
      bodies: `${stage.bodies} (${game.entities.size} entities) · repaints ${stage.paints}`,
      camera: `yaw ${engine.pose.yaw.toFixed(2)} pitch ${engine.pose.pitch.toFixed(2)} dist ${engine.pose.dist.toFixed(1)} dpr ${engine.dpr}`,
      player: `${own.x.toFixed(1)}, ${own.y.toFixed(1)} · ${game.ownName}`,
      post: `${post.enabled ? 'on' : 'off'} · ink ${inkOn ? 'on' : 'off'} · tilt ${tiltOn ? 'on' : 'off'} · day ${day.toFixed(2)}${dayOverride !== null ? ' (forced)' : ''}`,
    });
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

/** Targets whose Classic door is a screen this door has not mounted. */
const BENCH_KINDS: ReadonlySet<string> = new Set(['station', 'bank', 'shop', 'stable', 'plot', 'trough', 'bin', 'work', 'sign']);

/** THE CLICK: use what is in reach, strike a foe, else walk there. */
function onWorldClick(sx: number, sy: number): void {
  if (game.ownEid === null || shell.cinemaOpen) return;
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
    else if (target.kind === 'npc') game.interactNpc(target.eid); // talk opens the cinema (shell.ts)
    else if (target.kind === 'loot') game.pickupWalk(target.eid);
    else if (BENCH_KINDS.has(target.kind)) shell.system('That bench is not mounted on this door yet.');
    else if (target.kind === 'crop') {
      // THE TENDING HAND (main.ts activateTarget): aim the verb the
      // prompt would show; water and harvest ride the plain interact.
      const verb = game.cropVerb(tx, ty);
      if (verb === 'Fertilize') game.fertilize(tx, ty);
      else if (verb === 'Mulch') game.mulch(tx, ty);
      else if (verb === 'Prune') game.prune(tx, ty);
      else game.interact(tx, ty);
    } else game.interact(tx, ty); // node/portal/apiary/chest/door/candle/seat/bed: the server decides
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

const onHudKey = (e: KeyboardEvent): void => {
  if (e.code === 'F2') hudHost.hidden = !(hudOn = !hudOn);
};

function boot(): void {
  const backend = engine.backend;
  atlas = new SpriteAtlas(backend);
  sky = new SkyRig(engine.scene, clock);
  ground = new GroundStreamer(engine.scene, world, atlas, clock, backend.billboards);
  ground.onLampsChanged = (lamps) => sky.setLamps(lamps);
  // W2: structures ride the chunk lifecycle; they need the heightfield's answer.
  faces = new FaceAtlas(backend);
  structMats = new StructMaterials(faces);
  structures = new ChunkStructures(engine.scene, world, faces, structMats, ground.heightAtFn);
  ground.structures = structures;
  doorLayer = new DoorLeafLayer(engine.scene, faces);
  stage = new EntityStage(engine.scene, clock, backend.billboards, ground.heightAtFn);
  post = backend.createPost(engine.scene, engine.camera);
  hud = new Confession(hudHost);
  view = new Play3DView(engine, ground.heightAtFn);
  shell.attach(game, view);
  engine.onResize = (w, h, dpr) => post.resize(w, h, dpr);
  engine.onContext = (lost) => {
    hudHost.dataset.context = lost ? 'lost' : 'restored';
    // THE CANVAS PAID ONCE: chunk bitmaps were released after upload,
    // so a restored context re-bakes the ring instead of re-uploading.
    if (!lost) ground.reset();
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
  orbitSaveTimer = window.setInterval(() => {
    localStorage.setItem('arx.orbit3d', JSON.stringify(engine.want));
  }, 4000);
  window.addEventListener('keydown', onHudKey);
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
  /** World point → screen px (the canvas's CSS box) + NDC depth; THE TONE PROBE aims by this. */
  project: (x: number, y: number, z: number): { sx: number; sy: number; z: number } => {
    const v = new THREE.Vector3(x, y, z).project(engine.camera);
    return { sx: ((v.x + 1) / 2) * canvas.clientWidth, sy: ((1 - v.y) / 2) * canvas.clientHeight, z: v.z };
  },
  /** The ground (with deck lift) under a world point. */
  heightAt: (x: number, y: number): number => ground.heightAt(x, y),
  /** Step the streamer to completion around the body (all ring chunks painted). */
  settle: (): boolean => {
    if (game.ownEid === null) return false;
    const own = game.predictor.pos;
    ground.refresh();
    ground.update(own.x, own.y, 50, game.plane);
    atlas.flush();
    faces.flush();
    return ground.stats.chunks > 0 && ground.stats.baking === 0 && ground.stats.painted === ground.stats.chunks && structures.stats.dirty === 0;
  },
  stats: (): Record<string, unknown> => ({
    hud: hud.lines,
    ground: { ...ground.stats },
    atlas: { sprites: atlas.sprites, pages: atlas.pages.length, uploads: atlas.uploads, blits: atlas.blits, bytes: atlas.textureBytes },
    structures: { ...structures.stats, lanes: { ...structures.stats.lanes }, faceUploads: faces.uploads, faceBlits: faces.blits, doorLeaves: doorLayer.leaves, audit: structures.audit() },
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
    cinema: shell.cinemaOpen,
  }),
  dispose: (): void => {
    engine.stop();
    window.clearInterval(orbitSaveTimer);
    window.removeEventListener('keydown', onHudKey);
    stage.dispose();
    ground.dispose();
    doorLayer.dispose();
    structures.dispose();
    structMats.dispose();
    faces.dispose();
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
