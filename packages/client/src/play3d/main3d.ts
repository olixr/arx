/**
 * PLAY3D — THE SECOND DOOR (S1 entry). Composes the engine, the
 * standalone world, the ground streamer, the standing world, the sky
 * rig, the post stack, the confession HUD and a handful of walking
 * dummies on the real humanoid rig. No server in S1; S2 swaps
 * StandaloneWorld for a LiveWorld over ClientGame and the dummies for
 * entities — everything below the world seam is untouched by that.
 *
 * Controls: drag = orbit, wheel = dolly, WASD = walk the player dummy,
 * N = day/night, P = post on/off, I = ink ring, T = tilt-shift, H = HUD.
 *
 * Probe surface (Playwright): window.__play3d — see `probe` below.
 */
import * as THREE from 'three';
import { randomLook } from '@arx/shared';
import { Engine } from './engine.js';
import { StandaloneWorld } from './world.js';
import { GroundStreamer } from './ground.js';
import { EntityBillboard, SpriteAtlas } from './sprites.js';
import { makeBillboardClock } from './billboardMaterial.js';
import { SkyRig } from './lights.js';
import { PostStack } from './post.js';
import { Confession, fmtBytes } from './hud.js';
import { Input3D } from './input.js';
import { Walker } from './dummies.js';
import { moveOnGround } from './orbit.js';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const hudHost = document.getElementById('hud') as HTMLElement;

const world = new StandaloneWorld();
const clock = makeBillboardClock();
const atlas = new SpriteAtlas();
const input = new Input3D(canvas);
const io = { dragX: 0, dragY: 0, wheel: 0 };
const axes = { strafe: 0, advance: 0 };
const move = { x: 0, z: 0 };
const frustum = new THREE.Frustum();
const projView = new THREE.Matrix4();
const seededRand = (seed: number) => (): number => {
  seed = (Math.imul(seed, 1274126177) + 0x5bf03635) >>> 0;
  return seed / 4294967296;
};

let ground: GroundStreamer;
let sky: SkyRig;
let post: PostStack;
let hud: Confession;
let walkers: Walker[] = [];
let player: Walker;
let hudOn = true;
let inkOn = true;
let tiltOn = true;
let day = 1;

const engine = new Engine(canvas, {
  sim: (dt, nowMs) => {
    input.axes(axes);
    moveOnGround(engine.yaw, axes.strafe, axes.advance, move);
    for (const w of walkers) {
      if (w === player) w.step(dt, world, nowMs, move.x, move.z);
      else w.step(dt, world, nowMs, 0, 0, wanderRand);
    }
  },
  frame: (dt, alpha, nowMs) => {
    input.consume(io);
    engine.orbitInput(io.dragX, io.dragY, io.wheel);
    // Stream the ground around the player, bake under a 6 ms budget.
    const px = player.lerpX(alpha);
    const py = player.lerpY(alpha);
    ground.update(px, py, 6);
    atlas.flush();
    const gy = ground.heightAt(px, py);
    engine.target.set(px, gy + 0.9, py);
    sky.follow(px, gy, py, nowMs);
    clock.uYaw.value = engine.yaw;
    clock.uTime.value = nowMs / 1000;
    clock.uSway.value = 0.05;
    // Bodies: advance every rig, repaint only the visible ones that moved.
    projView.multiplyMatrices(engine.camera.projectionMatrix, engine.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projView);
    for (const w of walkers) {
      const wx = w.lerpX(alpha);
      const wy = w.lerpY(alpha);
      const sphere = w.sprite.mesh.geometry.boundingSphere!;
      const visible = frustum.intersectsSphere(sphere);
      w.sprite.update(wx, wy, ground.heightAt(wx, wy), w.dir, dt, nowMs, engine.yaw, visible);
    }
    hud.frame(engine.frameMs, nowMs);
  },
  draw: () => {
    post.render();
    if (hudOn) {
      const info = engine.renderer.info;
      let paints = 0;
      for (const w of walkers) paints += w.sprite.paints;
      hud.update(performance.now(), info, {
        world: world.label,
        'chunks (painted/loaded)': `${ground.stats.painted}/${ground.stats.chunks} · baking ${ground.stats.baking} · bake ${ground.stats.bakeMsLast.toFixed(1)}ms`,
        'cliff faces': ground.stats.faces,
        'standing instances': `${ground.stats.statics} in ${ground.stats.staticDraws} draws · atlas ${atlas.sprites} sprites / ${atlas.pages.length} pages (${atlas.uploads} uploads)`,
        'texture bytes': `ground ${fmtBytes(ground.stats.textureBytes)} · atlas ${fmtBytes(atlas.textureBytes)}`,
        'body repaints': paints,
        camera: `yaw ${engine.pose.yaw.toFixed(2)} pitch ${engine.pose.pitch.toFixed(2)} dist ${engine.pose.dist.toFixed(1)} dpr ${engine.dpr}`,
        player: `${player.x.toFixed(1)}, ${player.y.toFixed(1)}`,
        post: `${post.enabled ? 'on' : 'off'} · ink ${inkOn ? 'on' : 'off'} · tilt ${tiltOn ? 'on' : 'off'} · day ${day.toFixed(2)}`,
      });
    }
  },
});

const wanderRand = seededRand(99);

function boot(): void {
  sky = new SkyRig(engine.scene, clock);
  ground = new GroundStreamer(engine.scene, world, atlas, clock);
  ground.onLampsChanged = (lamps) => sky.setLamps(lamps);
  post = new PostStack(engine.renderer, engine.scene, engine.camera);
  hud = new Confession(hudHost);
  engine.onResize = (w, h, dpr) => post.resize(w, h, dpr);
  engine.onContext = (lost) => {
    hudHost.dataset.context = lost ? 'lost' : 'restored';
  };
  engine.resize();

  // The player: a caped waker. Four villagers wander the green.
  const spawn = world.spawn;
  const tints = ['#a03030', '#3a6ea5', '#3f7d3a', '#8a6534', '#6e4a8a'];
  const capes: Array<string | undefined> = ['wolf_pelt_cloak', undefined, undefined, undefined, undefined];
  for (let i = 0; i < 5; i++) {
    const sprite = new EntityBillboard(
      { bodyColor: tints[i]!, look: randomLook(seededRand(41 + i)), capeId: capes[i] },
      clock,
      41 + i,
    );
    engine.scene.add(sprite.mesh);
    const x = spawn.x + (i === 0 ? 0 : 2 + (i % 2) * 2.5);
    const y = spawn.y + (i === 0 ? 0 : -1.5 + Math.floor(i / 2) * 2.2);
    const w = new Walker(sprite, x, y, i === 0 ? 5.2 : 1.6, i === 0 ? null : { x, y, r: 5 });
    walkers.push(w);
  }
  player = walkers[0]!;
  engine.target.set(player.x, 0.9, player.y);

  input.onKey = (code) => {
    if (code === 'KeyN') setDay(day > 0.5 ? 0.08 : 1);
    if (code === 'KeyP') post.enabled = !post.enabled;
    if (code === 'KeyI') {
      inkOn = !inkOn;
      post.set({ ink: inkOn ? 1 : 0 });
    }
    if (code === 'KeyT') {
      tiltOn = !tiltOn;
      post.set({ tilt: tiltOn ? 1 : 0 });
    }
    if (code === 'KeyH') {
      hudOn = !hudOn;
      hudHost.hidden = !hudOn;
    }
  };
  engine.start();
}

function setDay(k: number): void {
  day = k;
  sky.setDay(k);
  post.set({ night: 1 - k });
}

/** Playwright's hands on the page. */
const probe = {
  setCamera: (yaw: number, pitch: number, dist: number): void => engine.setOrbit(yaw, pitch, dist),
  tp: (x: number, y: number): void => {
    player.x = player.prevX = player.tx = x;
    player.y = player.prevY = player.ty = y;
  },
  day: setDay,
  post: (on: boolean): void => {
    post.enabled = on;
  },
  ink: (k: number): void => post.set({ ink: k }),
  tilt: (k: number): void => post.set({ tilt: k }),
  /** Step the streamer to completion (all ring chunks painted). */
  settle: (): boolean => {
    ground.update(player.x, player.y, 50);
    atlas.flush();
    return ground.stats.baking === 0 && ground.stats.painted === ground.stats.chunks;
  },
  stats: (): Record<string, unknown> => ({
    hud: hud.lines,
    ground: { ...ground.stats },
    atlas: { sprites: atlas.sprites, pages: atlas.pages.length, uploads: atlas.uploads, bytes: atlas.textureBytes },
    info: {
      calls: engine.renderer.info.render.calls,
      triangles: engine.renderer.info.render.triangles,
      geometries: engine.renderer.info.memory.geometries,
      textures: engine.renderer.info.memory.textures,
      programs: engine.renderer.info.programs?.length ?? 0,
    },
    frameMs: engine.frameMs,
    world: { generated: world.generated, label: world.label },
    player: { x: player.x, y: player.y },
    camera: { ...engine.pose },
  }),
  walkers: () => walkers.map((w) => ({ x: w.x, y: w.y, dir: w.dir, paints: w.sprite.paints })),
  dispose: (): void => {
    engine.stop();
    for (const w of walkers) {
      engine.scene.remove(w.sprite.mesh);
      w.sprite.dispose();
    }
    walkers = [];
    ground.dispose();
    atlas.dispose();
    post.dispose();
    sky.dispose();
    hud.dispose();
    input.dispose();
    engine.dispose();
  },
};
(window as unknown as { __play3d: typeof probe }).__play3d = probe;

boot();
