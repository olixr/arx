import type { NpcDef } from '@arx/content';
import { LegRig } from '../render/legs.js';
import {
  beastSpec,
  drawBat,
  drawBeast,
  drawHumanoid,
  drawSlime,
  drawSnake,
  koboldLook,
  gnollLook,
  skeletonLook,
} from '../render/rig.js';

/**
 * TRUE IN-GAME RENDERS. Every creature and actor the studio shows is
 * painted by the game's own body painters — drawBeast, the legless
 * menagerie, and the humanoid rig — standing, facing the camera, and
 * finished with the world's outline shader: the same 8-tap dilate
 * ring and hard drop shadow the icon system and entity pass use. The
 * art is always judged WITH the ring; the studio obeys.
 */

const SS = 3;
const OUTLINE = '#241a2e';
const SHADOW = 'rgba(20, 12, 8, 0.45)';
const TAPS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71],
];
/** Deterministic clock: cosmetic wobbles freeze at a flattering beat. */
const PINNED_MS = 5234;
/** The game camera's vertical foreshortening. */
const Y_SCALE = 0.6;

/**
 * Paint through the world's outline shader: art at 3× supersample on
 * a transparent stage, 8-tap ring in the world ink, shadow cast from
 * the ringed silhouette, one high-quality downscale.
 */
function ringComposite(
  size: number,
  paint: (ctx: CanvasRenderingContext2D, px: number) => void,
): HTMLCanvasElement {
  const px = size * SS;
  const art = document.createElement('canvas');
  art.width = px;
  art.height = px;
  paint(art.getContext('2d')!, px);

  const r = Math.max(1.25 * SS, px * 0.02);
  const ri = Math.max(1, Math.round(r));
  const rd = Math.max(1, Math.round(r * 0.71));
  const ring = document.createElement('canvas');
  ring.width = px;
  ring.height = px;
  const rctx = ring.getContext('2d')!;
  for (const [tx, ty] of TAPS) {
    const diag = tx !== 0 && ty !== 0;
    rctx.drawImage(art, Math.sign(tx) * (diag ? rd : ri), Math.sign(ty) * (diag ? rd : ri));
  }
  rctx.globalCompositeOperation = 'source-in';
  rctx.fillStyle = OUTLINE;
  rctx.fillRect(0, 0, px, px);

  const sil = document.createElement('canvas');
  sil.width = px;
  sil.height = px;
  const sctx = sil.getContext('2d')!;
  sctx.drawImage(ring, 0, 0);
  sctx.drawImage(art, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = SHADOW;
  sctx.fillRect(0, 0, px, px);

  const big = document.createElement('canvas');
  big.width = px;
  big.height = px;
  const bctx = big.getContext('2d')!;
  bctx.drawImage(sil, px * 0.03, px * 0.03);
  bctx.drawImage(ring, 0, 0);
  bctx.drawImage(art, 0, 0);

  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(big, 0, 0, size, size);
  return out;
}

// ------------------------------------------------- humanoid monsters

/**
 * The humanoid-mob wardrobe/stature tables — mirrored from the
 * renderer's npcItem (renderer.ts, the loot-story law: every worn
 * piece really drops). Kept tiny and in sync by hand; the renderer
 * remains the source of truth.
 */
const MOB_EQUIP: Record<string, Partial<Record<string, string>>> = {
  goblin: { weapon: 'bronze_sword' },
  gnoll: { weapon: 'rustbite' },
  gnoll_champion: { weapon: 'iron_greatblade' },
  skeleton: { weapon: 'iron_sword' },
  skeleton_archer: { weapon: 'marrowpoint', offhand: 'hunters_quiver' },
  skeleton_guard: { weapon: 'iron_sword', offhand: 'oak_kiteshield', head: 'iron_helm' },
  skeleton_champion: { weapon: 'iron_sword', cape: 'cape_champion' },
  kobold: { weapon: 'bronze_pickaxe' },
  kobold_digmaster: { weapon: 'iron_pickaxe' },
  brigand: { weapon: 'iron_sword', body: 'leather_body', head: 'leather_hood' },
  brigand_archer: {
    weapon: 'shortbow',
    offhand: 'hunters_quiver',
    body: 'leather_body',
    legs: 'leather_chaps',
  },
  brigand_reaver: {
    weapon: 'iron_sword',
    offhand: 'iron_dagger',
    head: 'leather_hood',
    body: 'leather_body',
    legs: 'leather_chaps',
  },
};
const MOB_SIZE: Record<string, number> = {
  gnoll: 1.18,
  gnoll_champion: 1.42,
  skeleton: 0.95,
  skeleton_archer: 0.92,
  skeleton_guard: 1.05,
  skeleton_champion: 1.25,
  kobold: 0.75,
  kobold_digmaster: 1.0,
  troll: 1.4,
  brigand: 1.0,
  brigand_archer: 0.97,
  brigand_reaver: 1.1,
};

/** Road tans for the human outlaws (the renderer's BRIGAND_SKIN twin). */
const MOB_SKIN: Record<string, string> = {
  brigand: '#d9a878',
  brigand_archer: '#c69268',
  brigand_reaver: '#b9825e',
};

function isHumanoidMob(defId: string): boolean {
  return (
    defId.startsWith('goblin') ||
    defId.startsWith('skeleton') ||
    defId.startsWith('kobold') ||
    defId.startsWith('brigand') ||
    defId.startsWith('gnoll') ||
    defId === 'troll'
  );
}

function paintHumanoidMob(ctx: CanvasRenderingContext2D, px: number, def: NpcDef): void {
  const sizeK = MOB_SIZE[def.id] ?? 0.85;
  const S = (px * 0.42) / Math.max(0.85, sizeK);
  const cx = px / 2;
  const yFeet = px * 0.86;
  const hip = 0.1 * S;
  const skel = def.id.startsWith('skeleton') ? skeletonLook(def.id) : undefined;
  const kob = def.id.startsWith('kobold') ? koboldLook(def.id) : undefined;
  // The portrait sits for the DESIGN: seed 0 pins the dust-coat
  // cluster so the bestiary card never flickers between colorways.
  const gno = def.id.startsWith('gnoll') ? gnollLook(def.id, 0) : undefined;
  drawHumanoid(ctx, {
    x: cx,
    y: yFeet,
    scale: S,
    dir: Math.PI / 2,
    pose: 0,
    poseT: 1,
    drawT: 0,
    restT: 1,
    nowMs: PINNED_MS,
    feet: [
      { x: cx - hip, y: yFeet, lift: 0 },
      { x: cx + hip, y: yFeet, lift: 0 },
    ],
    bob: 0,
    rise: 0.414,
    wScale: 1.05,
    poleX: 0,
    poleY: 0,
    poleStrength: 0,
    runF: 0,
    align: 1,
    kneeMemory: [0, 0],
    bodyColor: def.color,
    hurt: false,
    isOwn: false,
    equip: MOB_EQUIP[def.id] ?? {},
    skinColor:
      def.id === 'troll'
        ? '#6a7d5c'
        : def.id.startsWith('goblin')
          ? '#7aa74a'
          : (kob?.hide ?? gno?.fur ?? MOB_SKIN[def.id]),
    size: sizeK,
    skeletal: skel,
    kobold: kob,
    gnoll: gno,
    gatherPhase: 0,
    craftKind: null,
  } as unknown as Parameters<typeof drawHumanoid>[1]);
}

// --------------------------------------------------------- the beasts

function paintBeast(ctx: CanvasRenderingContext2D, px: number, def: NpcDef): void {
  const radius = def.radius;
  const spec = beastSpec(def.id, radius, def.speed);
  // Three-quarter stand: face toward the camera with the flank shown —
  // a long body dead-on south collapses into a narrow front view.
  const dir = Math.PI * 0.31;

  // Fit the species envelope (the npcItem bounds law) into the stage;
  // at 3/4 the east-west span foreshortens, so weight height first.
  const headroom =
    def.id === 'stag' ? 0.7 : def.id === 'hind' ? 0.15 : def.id === 'ram' ? 0.25 : def.id === 'dire_wolf' ? 0.3 : def.id === 'worg' ? 0.25 : def.id === 'great_owl' ? 0.4 : def.id === 'elder_great_owl' ? 0.65 : 0;
  const halfWTiles = spec.bodyLen * 2.0 + 0.35 + radius;
  const topTiles = spec.bodyRise + radius * 2.2 + headroom;
  const bottomTiles = spec.rig.legLen + 0.7;
  const scale = Math.min(
    (px * 0.94) / (halfWTiles * 2 * 0.72),
    (px * 0.86) / (topTiles + bottomTiles),
  );
  const cx = px / 2;
  const groundY = px / 2 + ((topTiles - bottomTiles) * scale) / 2;

  // Settle a standing pose: the rig walks in world space; holding it
  // at the origin for a few frames plants every foot at rest.
  const rig = new LegRig(spec.rig);
  let pose = rig.update(0, 0, dir, 0.05);
  for (let i = 0; i < 24; i++) pose = rig.update(0, 0, dir, 0.05);
  const feet = pose.feet.map((f) => ({
    x: cx + f.x * scale,
    y: groundY + f.y * scale * Y_SCALE,
    lift: f.lift,
  }));

  drawBeast(ctx, {
    x: cx,
    y: groundY,
    scale,
    dir: pose.dir,
    radius,
    color: def.color,
    defId: def.id,
    spec,
    pose,
    feet,
    yScale: Y_SCALE,
    walkPhase: 0,
    hurt: false,
    kneeMemory: [],
    attackT: 0,
    seed: 7,
    nowMs: PINNED_MS,
  } as unknown as Parameters<typeof drawBeast>[1]);
}

// ------------------------------------------------- the legless bodies

function paintLegless(ctx: CanvasRenderingContext2D, px: number, def: NpcDef): void {
  const radius = def.radius;
  const bat = def.id === 'cave_bat';
  const snake = def.id === 'adder';
  // Extents from the leglessItem bounds law.
  const halfWTiles = snake ? 1.55 : bat ? 0.95 : radius * 2.2 + 0.25;
  const topTiles = bat ? 1.7 : snake ? 0.55 : radius * 2.4 + 0.15;
  const bottomTiles = snake ? 1.1 : 0.4;
  const scale = Math.min(
    (px * 0.84) / (halfWTiles * 2),
    (px * 0.8) / (topTiles + bottomTiles),
  );
  const cx = px / 2;
  const groundY = px / 2 + ((topTiles - bottomTiles) * scale) / 2;
  const common = {
    x: cx,
    y: groundY,
    s: scale,
    dir: Math.PI / 2,
    radius,
    color: def.color,
    hurt: false,
    walkPhase: 0,
    nowMs: PINNED_MS,
    seed: 7,
    moveK: 0,
    attackT: 0,
    ys: Y_SCALE,
  };
  type Bag = Parameters<typeof drawSlime>[1];
  if (bat) drawBat(ctx, common as unknown as Bag);
  else if (snake) drawSnake(ctx, common as unknown as Bag);
  else drawSlime(ctx, common as unknown as Bag);
}

// ----------------------------------------------------------- the API

const creatureCache = new Map<string, HTMLCanvasElement>();

/**
 * A canvas is a DOM node with one parent — handing the cached element
 * to two mounts would silently move it. Callers get a pixel copy.
 */
function displayCopy(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
}

/**
 * A creature exactly as the game draws it: its own body painter,
 * standing, facing the camera, wearing the world's outline ring.
 */
export function creatureRender(def: NpcDef, size = 176): HTMLCanvasElement {
  const key = `${size}:${def.id}:${def.color}:${def.radius}:${def.speed}`;
  const hit = creatureCache.get(key);
  if (hit) return displayCopy(hit);
  if (creatureCache.size > 200) creatureCache.clear();
  const canvas = ringComposite(size, (ctx, px) => {
    try {
      if (isHumanoidMob(def.id)) paintHumanoidMob(ctx, px, def);
      else if (['slime', 'slime_small', 'cave_bat', 'adder'].includes(def.id)) {
        paintLegless(ctx, px, def);
      } else paintBeast(ctx, px, def);
    } catch {
      // A bad def must never break the studio — leave the stage empty.
    }
  });
  creatureCache.set(key, canvas);
  return displayCopy(canvas);
}

export { ringComposite };
