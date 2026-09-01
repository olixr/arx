/**
 * THE PROVING HALL'S WING — the arts and callings codex: rail, stages, benches, plates, seats and their describers.
 * Moved verbatim off Panels (foundations F5.3); the functions hold the
 * panel through its public surface.
 */
import { ActionId } from '../input/bindings.js';
import { SheetVerb } from './kit/contextSheet.js';
import { CallingCondition, CallingDef, CallingEffect, CallingGrant, PerkId } from '@arx/content';
import { SkillId, TechniqueDef } from '@arx/shared';
import type { Panels } from './panels.js';
/** Combat schools owning a technique ladder, hidden law honored. */
export declare function artsSchoolIds(host: Panels): SkillId[];
/**
 * THE HONED-ART LAW, mirrored: the rank the BASE level has earned.
 * THE LOAN LAW holds an unmastered secret at Rank I — the borrowed
 * motion is correct but not yet yours.
 */
export declare function techRank(host: Panels, style: SkillId, tech: TechniqueDef): number;
/** A technique's rung state against the player's skill level. */
export declare function techState(host: Panels, style: SkillId, tech: {
    ability: string;
    unlockLevel: number;
}): 'equipped' | 'unlocked' | 'locked' | 'veiled';
/** Record that an unlocked art has been laid eyes on. */
export declare function markTechSeen(host: Panels, ability: string | null): void;
/** The dock button's glint: any unlocked art or Calling not yet inspected. */
export declare function updateArtsPip(host: Panels): void;
/**
 * THE SCHOOL RAIL — one crest per school, the Callings last, LT/RT
 * stepping the stops. It replaced the wing tabs AND the jump strip:
 * one school stands on the stage at a time, so the eight-ladder
 * scroll is gone and nothing lives below the fold.
 */
export declare function renderArtsRail(host: Panels, schools: SkillId[]): void;
/** Step or click to a rail stop: a school (or a skill's ladder) onto the stage. */
export declare function pickRailStop(host: Panels, stop: SkillId): void;
/** THE OPEN HALL's door: swap the wing, keeping the skill on the stage when both wings own it. */
export declare function setArtsWing(host: Panels, wing: 'arts' | 'callings'): void;
/** The codex, whole: altar, rail, the standing stop, the bench. */
export declare function renderArts(host: Panels): void;
/** Skills whose Callings may show — the hidden-skill law honored. */
export declare function callingSkillIds(host: Panels): SkillId[];
export declare function callingState(host: Panels, def: CallingDef): 'answered' | 'unlocked' | 'locked';
export declare function focusUsed(host: Panels): number;
/** Unlocked-but-never-inspected Callings (the NEW-pip ledger). */
export declare function unseenCallings(host: Panels): number;
export declare function markCallingSeen(host: Panels, id: string | null): void;
/**
 * THE ANSWERED LIFE — the callings wing's foot band, the build in
 * one look: the Focus instrument, the roster of every answered
 * Calling worn as its gem, and THE SUM of what the whole answered
 * set gives, told in engraved chips.
 */
export declare function renderAnsweredLife(host: Panels): void;
/**
 * THE SUM's gauges: the always-on aggregates summed honestly, the
 * verbs counted, and EVERY gauge carrying the names of the
 * Callings that feed it — so the tooltip answers "where is this
 * from?" without a spreadsheet. Conditional edges are never folded
 * into flat sums (a vs-state clause is a clause, not armor).
 */
export declare function answeredSums(host: Panels, defs: CallingDef[]): Array<{
    kind: string;
    num: string;
    word: string;
    tip: string;
    from: string[];
}>;
/** A gem in the foot band pressed: walk the hall to its own seat. */
export declare function jumpToCalling(host: Panels, id: string): void;
/**
 * THE OPEN HALL (callings-v2 Phase 5): the passives wing rebuilt for
 * a ten-seat world. ONE skill's ladder stands on the stage at a time
 * (the rail picks it — never 250 chips in one scroll, pad nav stays
 * key-true); the ladder is a path ribbon of seat plates in the arts
 * stage's own vocabulary; the Focus meter rides the loadout strip;
 * the bench reads the package.
 */
export declare function renderCallingsWing(host: Panels): void;
/** The wing toggle that sits in every stage head: Arts ◇ Callings. */
export declare function wingToggle(host: Panels): HTMLElement;
/**
 * THE ROAD (the callings wing rebuilt): one skill's sixteen seats
 * as a serpentine tree — two runs of eight, the second walking
 * back, joined by a forged turn — so the whole ladder stands on the
 * stage at once, every seat a large plaque the hand can press. The
 * pad's down press lands on the true ladder neighbor by geometry.
 */
export declare function callingStage(host: Panels, skill: SkillId): HTMLElement;
/** The wheel walks the ladder in seat order, whatever the road's bends. */
export declare function stepCallingLadder(host: Panels, dir: -1 | 1): void;
/**
 * One seat as a PLAQUE: the painted well holding the calling's gem,
 * the seat level cut into a corner shield, THE RANK PIPS beneath,
 * and the name on the plate. States are drawn, never labeled:
 * answered floods the gem's own color, an open seat sits lit and
 * waiting, a locked seat is a dark socket with its level engraved.
 */
export declare function seatPlaque(host: Panels, def: CallingDef): HTMLElement;
/**
 * Light the bench for one calling without rebuilding the stage:
 * focus and hover ride this, so reading is free and the ring never
 * loses the plate it stands on.
 */
export declare function inspectCalling(host: Panels, id: string): void;
/**
 * THE PACKAGE, spoken: one plain line per entry. Gear entries ride
 * the enchant vocabulary's own reader (one truth for cards and
 * benches); procs speak trigger and action; a when clause speaks
 * its condition and its grant; the trade dials and perks speak in
 * their own units.
 */
export declare function describeCallingEffect(host: Panels, fx: CallingEffect): string;
export declare function describeCondition(host: Panels, c: CallingCondition): string;
export declare function describeGrant(host: Panels, g: CallingGrant): string;
/** The grant's dials alone, no chip name — the working plate's head. */
export declare function grantParts(host: Panels, g: CallingGrant): string[];
/** The one-site dials in plain words — the map PERK_DIALS documents, spoken. */
export declare function describePerk(host: Panels, perk: PerkId, m: number): string;
/**
 * THE BENCH of the callings wing, rebuilt as its own furniture: the
 * gem in a painted well, the state worn as a forged SEAL (never a
 * labeled box), the package as illuminated VERSES each led by its
 * kind's glyph, THE RANK SPINE instrument for the four depths, and
 * the verbs on brass. Everything drawn, nothing web.
 */
export declare function renderCallingBench(host: Panels): void;
/**
 * THE WORKING, split for its plate: the MECHANIC as the bold head
 * (what actually happens, numbers first) and the condition as the
 * line beneath it (when it happens). The star is the effect.
 */
export declare function callingWorking(host: Panels, fx: CallingEffect): {
    kind: string;
    head: string;
    sub: string;
};
/** The glyph family a package entry belongs to, for the verse lead. */
export declare function callingKindOf(host: Panels, fx: CallingEffect): string;
/**
 * The action a technique seat answers to (seat 0 casts ability1,
 * seat 1 ability3). EVERY GLYPH KNOWS ITS DEVICE: the seat is only
 * ever NAMED by a seatChip built from this action — never by a bare
 * letter baked into a sentence. `seatKey` died here in the Grand
 * Refit, Phase 3.
 */
export declare function seatAction(host: Panels, seat: 0 | 1): ActionId;
/** The raw pad button a seat rides — THE SEAT ANSWERS ITS OWN BUTTON. */
export declare function seatPadButton(host: Panels, seat: 0 | 1): number | undefined;
/**
 * The seat sheet: the verbs a technique plate offers, seat chips
 * set into them. Seating an art is one press at the plate — the
 * two-column trip to the bench buttons is over.
 */
export declare function seatVerbs(host: Panels, ability: string, st: 'unlocked' | 'equipped'): SheetVerb[];
/**
 * THE LOADOUT ALTAR — four painted seats, always visible: the two
 * art seats side by side, then the trinkets, THE PAIRED HAND's
 * order matching the hotbar exactly. Each seat is a kit socket
 * wearing its live chip; a filled art seat presses through to its
 * plate on the stage.
 */
export declare function renderArtsLoadout(host: Panels): void;
/**
 * THE PATH — one school's arts as a single center-staged ribbon.
 * Everything unlocked stands linked on a forged spine; the FIRST
 * locked rung shows its name and level; every deeper rung condenses
 * into ONE veil cap ("✦ N more wait past Lv X") — the mist at the
 * ladder's end, not a row of question marks. Secrets ride the same
 * ribbon past a forged seam (THE QUIET SHELF still holds: only
 * secrets this hand has met). The track slides so the chosen art
 * stands center stage; `overflow: clip` on the ribbon keeps
 * scrollIntoView from ever fighting the slide.
 */
export declare function artsStage(host: Panels, style: SkillId): HTMLElement;
/** Step the ribbon's choice to the neighboring plate. */
export declare function stepRibbon(host: Panels, dir: -1 | 1): void;
/**
 * The ladder's mist: one plate standing for every rung past the
 * next — it admits how much waits without spelling any of it.
 */
export declare function veilCap(host: Panels, style: SkillId, count: number, minLevel: number): HTMLElement;
/**
 * Slide the ribbon so the chosen plate stands center stage. The
 * track rides the `translate` channel (compositor-only), clamped so
 * the ribbon never shows void past either end.
 */
export declare function recenterRibbon(host: Panels): void;
/**
 * THE LOAN LAW's dormancy, mirrored for the codex: a seated secret
 * whose teaching weapon left the hands sleeps until it returns.
 */
export declare function secretDormant(host: Panels, tech: TechniqueDef): boolean;
/** One plate on a rail — rung, page, and secret speak the same shape. */
export declare function techPlate(host: Panels, style: SkillId, tech: TechniqueDef, linked: boolean): HTMLElement;
/**
 * Light the bench for one art without rebuilding the stage: focus
 * and hover ride this, so reading is free and the ring never loses
 * the plate it stands on.
 */
export declare function inspectArt(host: Panels, ability: string): void;
/**
 * THE SEAT FLIGHT — the chosen plate's face flies from the ribbon
 * into its seat, so seating an art is a thing you SEE land. Pure
 * grace note: gated by the Interface-motion setting, and the server
 * echo (setTechniques) repaints the truth under it either way.
 */
export declare function seatFlight(host: Panels, ability: string, seat: 0 | 1): void;
/**
 * THE SCHOOL ENVELOPE — the maxima the reading's gauges measure
 * against, so every bar is a COMPARISON, not a lone number: a
 * damage bar filled halfway means half the hardest hit this school
 * knows. Veiled rungs stay out of the envelope (no spoilers in the
 * scale).
 */
export declare function schoolEnvelope(host: Panels, style: SkillId): {
    damage: number;
    cooldown: number;
    range: number;
    radius: number;
};
/**
 * One gauge of the reading: a forged channel with the fill measured
 * against the school envelope, faceted by ticks when the unit is
 * countable (tiles), the numeral standing at the end. The stat
 * cards died here — a measure is an instrument, not a plaque.
 */
export declare function measureRow(host: Panels, opts: {
    label: string;
    value: string;
    frac: number;
    tone: string;
    ticks?: number;
    tip?: string;
}): HTMLElement;
/** One small forged seal in the marks row — a fact, worn not listed. */
export declare function markSeal(host: Panels, text: string, tone: string, tip?: string): HTMLElement;
/** THE READING: the chosen art laid out as instruments, not cards. */
export declare function renderArtsBench(host: Panels, all?: Array<{
    style: SkillId;
    t: TechniqueDef;
}>): void;
//# sourceMappingURL=panelsArts.d.ts.map