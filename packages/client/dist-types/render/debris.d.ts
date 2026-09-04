/**
 * Prop debris — the smash theatre.
 *
 * When a destructible prop bursts, the server sends ONE fx (impact
 * point + heading + kind) and swaps the tile; everything that flies
 * is simulated here, client-side, for free. Each kind breaks along
 * its own joinery — a barrel gives up staves, hoops, and its lid; a
 * crate sheds planks and corner posts; a chair loses the argument one
 * leg at a time — and every burst rolls its own counts, sizes, spins,
 * and speeds so no two breakages read alike.
 *
 * The chunks are honest little bodies: world-plane velocity plus a
 * vertical z with gravity, a couple of dampened bounces, and
 * axis-separated wall tests against the real collision field — smash
 * a barrel against a wall and its staves thud off the mass instead of
 * ghosting through. They lie where they fall for a few seconds, then
 * fade.
 *
 * Perf discipline is the particle engine's: pooled, swap-removed,
 * free-listed, capped with a rotating overwrite slot. Zero alloc once
 * warm, and a room-clearing rampage can never grow the draw bill.
 */
export declare const DEBRIS_CAP = 220;
export type SmashKind = 'barrel' | 'crate' | 'goods' | 'chair' | 'table' | 'bench' | 'bonepile' | 'crackedwall' | 'palisade' | 'torch' | 'brazier' | 'tent' | 'skulls' | 'totem' | 'banner' | 'cage' | 'stakes' | 'spit' | 'meatrack' | 'pot' | 'potions' | 'nest' | 'sacks' | 'spears' | 'dummy' | 'drum' | 'hide' | 'beacon' | 'elfbanner' | 'elfbench' | 'elftable' | 'elfchair' | 'daybed' | 'bookcase' | 'lectern' | 'harp' | 'loom' | 'fountain' | 'statue' | 'moonwell' | 'anvil' | 'armsrack' | 'planter' | 'mirror' | 'waystone' | 'chimes' | 'runestone' | 'crystals' | 'wardarch' | 'tome' | 'runepillar' | 'mossbarrel' | 'minecart' | 'chainedbones' | 'sarcophagus' | 'brokenpillar' | 'urns' | 'oldstatue' | 'gibbet' | 'stocks' | 'coldcamp' | 'lootchest' | 'candles' | 'fishrack' | 'tidetotem' | 'net' | 'dugout' | 'harpoons' | 'midden' | 'fishtrap' | 'roe' | 'lure' | 'catch' | 'greatribs' | 'shelter' | 'smoker' | 'mendbench' | 'weir' | 'kelpline' | 'saltpan' | 'shellbench' | 'withies' | 'keeppool' | 'shellchimes' | 'townfountain' | 'founder' | 'notices' | 'townbell' | 'handcart' | 'grainsacks' | 'barrelstack' | 'cratestack' | 'hitchpost' | 'woodpile' | 'streetplanter' | 'stonebench' | 'quench' | 'grindstone' | 'ingots' | 'lumber' | 'dyevat' | 'dressform' | 'clothbolts' | 'butcherblock' | 'herbs' | 'shopshelf' | 'wallfountain' | 'watertrough' | 'scribedesk' | 'candlerack' | 'fletcher' | 'fishslab' | 'parcels' | 'displaytable' | 'candlestand' | 'streetlantern' | 'wayshrine' | 'guardian' | 'tapcask' | 'stool' | 'baskets' | 'glazedjars' | 'broompail' | 'ladder' | 'barrow' | 'wayfarer' | 'mooring' | 'skiff' | 'gnawbones' | 'trophies' | 'grogtub' | 'knuckles' | 'ragnest' | 'beaststake' | 'critters' | 'gong' | 'wartable' | 'plundercart' | 'effigy' | 'gnawtrough' | 'herbplanter' | 'greatlog' | 'logdeck' | 'logstack' | 'candlecluster' | 'meltwax' | 'candletable' | 'armorstand' | 'armorstandfull' | 'bannerstand' | 'pillarcandle';
export interface DebrisChunk {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    rot: number;
    spin: number;
    len: number;
    wid: number;
    color: string;
    /** Lit stripe along the long axis — reads as a turned stave/plank. */
    stripe: string | null;
    /** Round chunks (lids, produce) draw as ellipses, not slabs. */
    round: boolean;
    settled: boolean;
    life: number;
    maxLife: number;
}
export declare class Debris {
    private readonly pool;
    private readonly free;
    private capCursor;
    private take;
    /**
     * THE CROSSING: every chunk in flight (or settled) lies at old-plane
     * coordinates — drop the lot. Dead records return to the free list;
     * the warm pool stays warm.
     */
    clear(): void;
    /**
     * Burst a prop at (x,y): chunks fly in a cone around `dir` — WITH
     * the blow, away from whoever swung it. `rand` is injectable so the
     * break-up laws are testable; live smashes ride Math.random and
     * every one rolls different.
     */
    smash(x: number, y: number, dir: number, kind: SmashKind, rand?: () => number): void;
    /**
     * THE SALVAGE LAW's ceremony: a construction coming DOWN, not blown
     * outward. Chunks spawn through the piece's standing height (`mass`
     * scales it: a wall falls from higher than a floor) with little
     * sideways urge — a slump that settles around the footprint. `slabs`
     * breaks as sawn lumber (long bodies, lit stripes); otherwise the
     * rubble is blocky. Tones come from the demolished tile itself, so
     * a walnut wall and a stone arch each fall in their own colors.
     */
    collapse(x: number, y: number, spec: {
        tones: readonly string[];
        stripe: string | null;
        slabs: boolean;
        mass: number;
    }, rand?: () => number): void;
    /**
     * A blow that DIDN'T finish the prop: a few small chips fly off the
     * impact, short-lived — the "it's working" feedback between hits on
     * durable furniture. Same bodies, smaller and briefer than a burst.
     */
    chip(x: number, y: number, dir: number, kind: SmashKind, rand?: () => number): void;
    /**
     * THE TIMBER LAW's crown beat: the instant a felled tree strikes
     * the ground its foliage stops being a canopy and becomes a burst
     * of leaf mats — round tufts in the species' own light bands,
     * popped up and out from the crown's landing point, spinning
     * lively and lying only briefly (litter leaves before lumber).
     * `spread` is the crown half-width in tiles: a broad oak sheds a
     * bigger storm than a wiry pine.
     */
    canopyBurst(x: number, y: number, leaves: readonly [string, string, string], spread: number, rand?: () => number): void;
    /**
     * THE TIMBER LAW's last word: the lying trunk bucks into lumber.
     * Chunks spawn ALONG the lie — butt to crown down the ground
     * direction the caller measured (dx/dy already foreshortened, so
     * the lumber line lands exactly where the trunk art lay) — and the
     * break is heavy: billets and rounds pop UP off the break line,
     * scatter barely, thud, and lie in a log-strewn row. Rounds carry
     * a lit end-grain disc; billets carry the bark's own stripe.
     */
    timber(x: number, y: number, dx: number, dy: number, reach: number, bark: {
        base: string;
        lit: string;
        dark: string;
    }, rand?: () => number): void;
    /**
     * Step every chunk: gravity, bounce, and axis-separated wall tests
     * against the live collision field (the corpse-skid law) — debris
     * never crosses a wall, it thuds and drops.
     */
    update(dt: number, solid: (x: number, y: number) => boolean): void;
    /** Live chunks, for the renderer's world y-sort. */
    chunks(): IterableIterator<DebrisChunk>;
    /** The raw pool for indexed iteration — the generator above minted
     *  an iterator + result object per chunk per frame. */
    chunkPool(): readonly DebrisChunk[];
    drawOne(ctx: CanvasRenderingContext2D, c: DebrisChunk, worldToScreen: (wx: number, wy: number) => {
        x: number;
        y: number;
    }, scale: number, outlined?: boolean): void;
}
//# sourceMappingURL=debris.d.ts.map