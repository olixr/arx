/**
 * Procedural WebAudio SFX — no audio files, everything synthesized.
 * Kept short and soft; a local family server doesn't need ear-splitters.
 */
export declare class Sfx {
    private ctx;
    private master;
    /** Browsers require a user gesture before audio can start. */
    unlock(): void;
    private tone;
    private noise;
    hit(): void;
    hurt(): void;
    swing(): void;
    chop(): void;
    /** Pick meets rock: a hard stony knock with a metallic tick on top. */
    mineClink(): void;
    /** A mined-out node collapses: low crunch + settling stone clatter. */
    rockCrumble(): void;
    /** Hammer rings the anvil: a bright ping over a body knock. */
    anvilClang(): void;
    /** The furnace draws breath: a soft roaring swell of hot air. */
    furnaceRoar(): void;
    /** The long groan of a felled trunk tipping over. */
    treeFall(): void;
    /** The crown hits the ground: deep thud + leaf wash. */
    treeImpact(): void;
    collect(): void;
    levelUp(): void;
    portal(): void;
    death(): void;
    crit(): void;
    bowTwang(): void;
    /** Nocking + hauling the string back: a low wooden creak. */
    bowDraw(): void;
    /** Full draw reached: a tight little click — "locked in". */
    fullDrawClick(): void;
    /**
     * Loosing the arrow: string snap + a whistle that sharpens with the
     * charge — a full-power shot sounds meaner than a snap shot.
     */
    loose(charge: number): void;
    /** Combo swings pitch up the chain; the finisher lands with a thud. */
    swingCombo(stage: number): void;
    /** Snap shot — a quick dry pip from the hip. */
    snapShot(): void;
    /** The wand's heavy third bolt leaving — a fat slow whomp. */
    heavyBolt(): void;
    /** Chain lightning crackle. */
    chainZap(): void;
    /** Weapon Art / relic cast — a rising committed whoomph. */
    art(): void;
    /** A status reaction detonating — the combo payoff sting. */
    reaction(): void;
    /** Telegraphed blast landing. */
    blast(): void;
    /** The hotbar radial refilling to ready — a soft affirmative tick. */
    abilityReady(): void;
    zap(): void;
    /** Dodge dash: a short breathy whoosh. */
    dash(): void;
    /** A kill: a small dark pop with a satisfying tail. */
    kill(): void;
}
//# sourceMappingURL=sfx.d.ts.map