/**
 * THE REEL ROOM — the shot language.
 *
 * A reel is a piece of the real game, performed. Nothing here fakes a
 * frame: the shot names a place, a body, a foe and a camera, and the
 * director drives the LIVE client through it — the same predictor, the
 * same renderer, the same server on the far end of the socket. What
 * comes out the other side is footage of the game, because it is the
 * game.
 *
 * A shot has two halves. `stage` is the pre-roll — teleports, gear,
 * clock, the mob line-up — and is never recorded; it may take a minute
 * (dev chat runs on a 1/s bucket) and nobody sees it. `beats` is the
 * performance, timed in milliseconds from the first recorded frame.
 *
 * Everything is DATA. The tools driver reads this same file to know
 * what to capture, how long, and what to write into the manifest — one
 * roster, one truth, no second list to drift.
 */
/** Which of the game's own chrome survives into the frame. */
export type HudMode = 
/** Nothing but the world — the pure plate. */
'clean'
/** The world plus the ceremonies: boss banners, heralds, floating
 *  damage, speech. The trailer look — drama without dashboard. */
 | 'drama'
/** Everything, exactly as a player sees it. Proof-of-play shots. */
 | 'play';
/** A pre-roll step. Never recorded; runs before the camera rolls. */
export type StageStep = 
/** A dev chat command (`/tp`, `/give`, `/time`…). Paced by the bucket. */
{
    k: 'cmd';
    text: string;
}
/** Equip the named item out of the pack (giving it first if needed). */
 | {
    k: 'equip';
    item: string;
    stow?: boolean;
}
/** Seat a technique in the R slot. */
 | {
    k: 'tech';
    ability: string;
    slot?: 0 | 2;
}
/** Stand still and let the world settle (chunks, herds, grass). */
 | {
    k: 'wait';
    ms: number;
}
/** Walk to a world point before the camera rolls. */
 | {
    k: 'walk';
    x: number;
    y: number;
    timeout?: number;
};
/** The camera's job this instant. */
export type CamMove = 
/** Ride the player, held `lead` tiles toward their aim. */
{
    k: 'follow';
    zoom?: number;
    lead?: number;
    ms?: number;
}
/** Ride a foe — the crowned entrance shot. */
 | {
    k: 'followFoe';
    zoom?: number;
    pick?: 'nearest' | 'biggest';
    ms?: number;
}
/** Hold a fixed world point. */
 | {
    k: 'hold';
    x: number;
    y: number;
    zoom?: number;
    ms?: number;
}
/** Glide from wherever the camera is to a world point over `ms`. */
 | {
    k: 'to';
    x: number;
    y: number;
    zoom?: number;
    ms?: number;
    ease?: EaseName;
}
/** Creep at a constant tiles/second — the slow trailer drift. */
 | {
    k: 'drift';
    dx: number;
    dy: number;
    zoom?: number;
    ms?: number;
}
/** Change only the zoom over `ms` (the push-in / pull-back). */
 | {
    k: 'zoom';
    to: number;
    ms: number;
    ease?: EaseName;
};
export type EaseName = 'linear' | 'inOut' | 'out' | 'in';
/** One instruction on the performance timeline. */
export type Act = 
/** Analog walk vector in world axes; {0,0} stops. Magnitude ≤ 1 sets
 *  the pace, so a body can stroll into frame instead of sprinting. */
{
    k: 'move';
    x: number;
    y: number;
}
/** Walk toward a world point; the director closes the loop each frame
 *  and stops inside `within` tiles. */
 | {
    k: 'goto';
    x: number;
    y: number;
    speed?: number;
    within?: number;
}
/** Look at a world point / a foe / an absolute angle. */
 | {
    k: 'face';
    x: number;
    y: number;
} | {
    k: 'faceFoe';
    pick?: 'nearest' | 'biggest';
} | {
    k: 'aim';
    rad: number;
}
/** Release the director's grip on the eyes (aim follows the walk). */
 | {
    k: 'aimFree';
}
/** Hold a button for `ms`: the swing, the Art, the relic, the sigil. */
 | {
    k: 'press';
    btn: Button;
    ms: number;
}
/** A dev command mid-performance — the wave that charges in on cue. */
 | {
    k: 'cmd';
    text: string;
}
/** Camera. */
 | {
    k: 'cam';
    move: CamMove;
}
/** Hand-held energy: 0 kills it, 1 is a combat shoulder-cam. */
 | {
    k: 'handheld';
    amount: number;
}
/** The renderer's own exclamation points. */
 | {
    k: 'shake';
    amount: number;
} | {
    k: 'pulse';
    amount?: number;
}
/** Name this instant — `poster` is the frame the page shows first. */
 | {
    k: 'mark';
    name: string;
};
export type Button = 'attack' | 'art' | 'relic' | 'tech' | 'sigil';
export interface Beat {
    /** Milliseconds from the first recorded frame. */
    at: number;
    do: Act;
}
export interface Shot {
    /** File-safe id — becomes `<id>.webm`. */
    id: string;
    /** The card's headline on the front page. */
    title: string;
    /** The line under it. Written, not generated. */
    caption: string;
    /** Which pillar of the page this reel argues for. */
    pillar: Pillar;
    /** Which of the cast performs it (packages/tools/src/reel/profiles). */
    cast: 'blade' | 'adept' | 'steader';
    /** Recorded length in seconds. */
    seconds: number;
    /** Capture frame rate. 60 unless the shot is a slow landscape. */
    fps?: number;
    hud: HudMode;
    /** Seconds mark whose frame becomes the poster. Defaults to 40%. */
    poster?: number;
    /** The page may loop this seamlessly (start and end frames agree). */
    loop?: boolean;
    /** Reels the hero montage draws from, in cut order. */
    hero?: boolean;
    stage: StageStep[];
    beats: Beat[];
}
export type Pillar = 'hero' | 'combat' | 'arcana' | 'crown' | 'dark' | 'homestead' | 'wild' | 'town' | 'road' | 'craft' | 'fellowship';
//# sourceMappingURL=types.d.ts.map