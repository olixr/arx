/**
 * THE SECRET LEDGER — every weapon Art's seat in the technique pool.
 *
 * A secret art is the third technique citizenship, beside the ladder
 * rungs and the unwritten pages: the Art a weapon carries, held here
 * as a learnable technique rather than welded to the Q slot. The seat
 * belongs to the ART, not the tool — every weapon whose `weapon.art`
 * names an ability teaches the same seat, so mastering `lunge` from a
 * gladius masters it for all twenty blades that speak it.
 *
 * THE LOAN LAW (phase 2): while a teaching weapon is in either hand,
 * its art may be slotted and cast unmastered. THE LESSON LAW (phase
 * 3): fighting with the teacher converts to permanent mastery — the
 * same `art:<ability>` flag the unwritten pages earn.
 *
 * THE ANCHOR RULER: `anchorLevel` is authored from the cheapest
 * teaching weapon's tier, read through each style's own damage bands
 * (the metal ladder is the level axis: bronze≈1, iron≈8-10, steel≈18,
 * mithril≈28, adamant≈38, obsidian≈48, starsteel≈52-54; wood and
 * staff lines and the legendary rosters sit on the same ruler). The
 * anchor seeds HONED-ART rank derivation exactly as a page's anchor
 * does, scales the mastery cost (phase 3), and must stay <= 54 so
 * every secret can reach Rank IV before 99. secretArts.test.ts pins
 * anchors monotonic against the cheapest teacher's damage — retier a
 * weapon line and its arts' anchors must move with it.
 *
 * THE RANK DEBT: secret seats ship without `ranks` (Rank I only) and
 * the debt is counted in secretArts.test.ts — RANKS FOR THE SHELF
 * pays it school by school. A seat that gains ranks obeys every honed
 * ladder law the rung arts obey.
 *
 * This ledger is deliberately NOT part of `TECHNIQUES` — the ladder
 * queries (`techniquesFor`, the codex rails, the OPEN LADDER test)
 * stay rung-and-page shaped; secret seats join the live pool at the
 * phase-2 wire, through their own lookups below.
 */
import type { CombatStyleId, TechniqueDef, TechniqueStyleId } from '@arx/shared';
import { techniqueDef } from './abilities.js';
import { SECRET_RANKS } from './secretRanks.js';

/**
 * The authored seats. RANKS FOR THE SHELF pays each seat's honed
 * steps from secretRanks.ts — merged below, so the ledger here stays
 * the readable roster and the rank book keeps its own shelf.
 */
const SEATS: readonly TechniqueDef[] = [

  // ------------ onehand: the blade roster — swords, daggers, and the Ten Crowns
  // taught by bronze_sword, rustbite … 10 teachers
  { ability: 'crescent_sweep', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by gladius, fangtooth … 20 teachers
  { ability: 'lunge', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by kris, iron_kris … 8 teachers
  { ability: 'serpents_kiss', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by bronze_dagger, ratter … 17 teachers
  { ability: 'shadowstep', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by rooksbeak
  { ability: 'beak_first', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by bonepick
  { ability: 'bone_needle', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by saltfang
  { ability: 'drag_under', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by nightbloom
  { ability: 'garden_close', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by redhand, duelists_grace
  { ability: 'quicksilver', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by scaler, tidereaver
  { ability: 'riptide', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by gobsplitter, steel_sword … 6 teachers
  { ability: 'shockwave', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by brightword
  { ability: 'spoken_light', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by sting
  { ability: 'stinger', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by falchion, iron_falchion … 8 teachers
  { ability: 'sundering_chop', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by bogsting, briarfang
  { ability: 'thorn_lash', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by coldsnap
  { ability: 'cold_snap', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by leech
  { ability: 'crimson_tithe', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by vipersong
  { ability: 'green_verse', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by palefire
  { ability: 'pale_flame', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by marrowlight
  { ability: 'pale_lantern', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by fenreaper
  { ability: 'reapers_arc', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by nightthorn
  { ability: 'shadow_fang', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by skysplinter
  { ability: 'sky_splits', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by cindermaw
  { ability: 'slagfall', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by sparkfang
  { ability: 'spark_lash', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by stormcall
  { ability: 'storm_brand', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by frostbrand
  { ability: 'winters_edge', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by threshold (THE DRAWN BREATH: the blade school's channel)
  { ability: 'kept_ground', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by emberbrand
  { ability: 'cinder_arc', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 28 } },
  // taught by kingsbane
  { ability: 'kings_bane', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 28 } },
  // taught by sovereign
  { ability: 'kings_decree', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 28 } },
  // taught by last_word
  { ability: 'last_word', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 28 } },
  // taught by bloodletter
  { ability: 'red_harvest', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 28 } },
  // taught by winterspire
  { ability: 'still_air', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 28 } },
  // taught by crownfire
  { ability: 'sun_court', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 28 } },
  // taught by starfall
  { ability: 'starfall_strike', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 38 } },
  // taught by dawnbreaker
  { ability: 'sunburst', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 38 } },
  // taught by oathkeeper
  { ability: 'vow_unbroken', style: 'onehand', unlockLevel: 0, secret: { anchorLevel: 38 } },

  // ------------ twohand: the great school — greatblades, greataxes, mauls, the Armory names
  // taught by bronze_greatblade, iron_greatblade … 5 teachers
  { ability: 'colossus_arc', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by bronze_greataxe, gobmangler … 5 teachers
  { ability: 'hewers_wheel', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by reavers_toll
  { ability: 'reavers_due', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 8 } },
  // taught by gravewrought
  { ability: 'mournfield', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 16 } },
  // taught by ashrender
  { ability: 'ash_harvest', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by barrowmaw
  { ability: 'barrow_bite', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by stonebreaker_maul
  { ability: 'quakefall', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by tollbreaker
  { ability: 'road_opens', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by kerbstone (THE DRAWN BREATH: the great school's casted summon)
  { ability: 'standing_stone', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by crowns_argument
  { ability: 'crowns_word', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by frostfell
  { ability: 'glacier_sunder', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by fens_lantern
  { ability: 'marsh_light', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by stormhewer
  { ability: 'thunder_fell', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by forgewrath
  { ability: 'white_heat', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by bearspine
  { ability: 'winters_hunger', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by seamsplitter
  { ability: 'open_seam', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 38 } },
  // taught by moonhewn
  { ability: 'pale_crescent', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 38 } },
  // taught by colossus_vow
  { ability: 'last_argument', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 44 } },
  // taught by mountains_end
  { ability: 'horizon_fall', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 50 } },
  // taught by riftglass
  { ability: 'riftfall', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 50 } },
  // taught by last_bell
  { ability: 'last_toll', style: 'twohand', unlockLevel: 0, secret: { anchorLevel: 54 } },

  // ------------ archery: the bow roster — wood lines and the Ten Flights
  // taught by stickbow, knucklebow … 8 teachers
  { ability: 'volley', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by thornwake
  { ability: 'wakewood', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 6 } },
  // taught by hunting_bow, oak_hunting_bow … 4 teachers
  { ability: 'broadhead', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 12 } },
  // taught by moonglass
  { ability: 'glasshail', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 12 } },
  // taught by suncrest
  { ability: 'larkshot', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 12 } },
  // taught by charbough
  { ability: 'charfall', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by driftwood, longbow … 7 teachers
  { ability: 'piercing_bolt', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by galespur
  { ability: 'stormskip', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by bramblethorn
  { ability: 'thorn_fan', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by sparrowhawk
  { ability: 'wingbeat', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by whisperwind
  { ability: 'ghost_shaft', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by wolfsong
  { ability: 'howling_loose', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by hushwing
  { ability: 'hushfall', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by runespan
  { ability: 'plucked_chord', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by heartwood
  { ability: 'verdant_burst', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 24 } },
  // taught by rimewood
  { ability: 'hoarfrost', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by starloom
  { ability: 'nightweft', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by redquarry
  { ability: 'quarry_call', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 32 } },
  // taught by emberglow
  { ability: 'cinder_rain', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 40 } },
  // taught by kingswood
  { ability: 'kings_arrow', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 40 } },
  // taught by starcall
  { ability: 'starfall_arrows', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 40 } },
  // taught by thunderhead
  { ability: 'the_anvil', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 40 } },
  // taught by oxbow (THE DRAWN BREATH: the bow school's casted read)
  { ability: 'full_draw', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 40 } },
  // taught by skyrender
  { ability: 'skyrend', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 46 } },
  // taught by windsinger
  { ability: 'windsong', style: 'archery', unlockLevel: 0, secret: { anchorLevel: 46 } },

  // ------------ arx: the staff roster — wood lines, battlestaves, and the Ten Voices
  // taught by carved_staff, hazel_switch … 5 teachers
  { ability: 'arcane_ring', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by apprentice_staff
  { ability: 'frost_nova', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by firstlight
  { ability: 'day_breaks', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 6 } },
  // taught by ember_staff
  { ability: 'fireburst', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 6 } },
  // taught by shepherds_crook, verdant_battlestaff
  { ability: 'overgrowth', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 6 } },
  // taught by wealdheart
  { ability: 'wild_root', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 6 } },
  // taught by wisplight
  { ability: 'wisp_flare', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 6 } },
  // taught by gravewood
  { ability: 'grave_chill', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 12 } },
  // taught by moonwell
  { ability: 'moonfall', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 12 } },
  // taught by gloomthorn
  { ability: 'gloom_burst', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by hearthwarden
  { ability: 'hearth_flare', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by galecall
  { ability: 'shearwind', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by firequill
  { ability: 'the_molt', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by serpentcoil
  { ability: 'venom_lash', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by candlewake (THE DRAWN BREATH: the held mend)
  { ability: 'vigil', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 18 } },
  // taught by runekey
  { ability: 'axiom', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by ember_battlestaff
  { ability: 'cinderstorm', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by storm_battlestaff
  { ability: 'galvanic_arc', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by frost_battlestaff
  { ability: 'glaciate', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by hollowstar
  { ability: 'hollowing', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by everthirst
  { ability: 'red_toll', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by runegnarl
  { ability: 'rune_echo', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by glacierbite
  { ability: 'shatterfrost', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by tidebinder
  { ability: 'undertow', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by skythrone
  { ability: 'crownstorm', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 34 } },
  // taught by tempest_crown
  { ability: 'eye_of_the_storm', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 34 } },
  // taught by pyreheart
  { ability: 'magma_orb', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 34 } },
  // taught by boneharrow
  { ability: 'marrow_pulse', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 34 } },
  // taught by driftstar
  { ability: 'perihelion', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 34 } },
  // taught by sunwrought
  { ability: 'solar_lance', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 34 } },
  // taught by heartspindle (THE DRAWN BREATH: the leech link)
  { ability: 'red_thread', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 34 } },
  // taught by bloodmoon
  { ability: 'red_eclipse', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 42 } },
  // taught by stormcaller
  { ability: 'stormlash', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 42 } },
  // taught by nightwell
  { ability: 'void_rift', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 42 } },
  // taught by worldsplinter
  { ability: 'realm_rend', style: 'arx', unlockLevel: 0, secret: { anchorLevel: 54 } },

  // ------------ polearm: the knight's roster — the spear line and the bespoke twelve
  // The polearm ruler reads the school's own gates: the bronze spear at
  // 1, the steel-band halberd and glaive near 26, the silver lances
  // near 44 — anchors climb with the cheapest teacher, never against it.
  // taught by spear, iron_spear … 11 teachers
  { ability: 'reaching_thrust', style: 'polearm', unlockLevel: 0, secret: { anchorLevel: 1 } },
  // taught by steel_glaive, moonglaive
  { ability: 'reapers_turn', style: 'polearm', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by watch_halberd, gatewarden_halberd
  { ability: 'skullhook', style: 'polearm', unlockLevel: 0, secret: { anchorLevel: 26 } },
  // taught by knights_lance, fellwinter_lance, dawnlance
  { ability: 'couched_charge', style: 'polearm', unlockLevel: 0, secret: { anchorLevel: 44 } },
];

export const SECRET_ARTS: readonly TechniqueDef[] = SEATS.map((s) => ({
  ...s,
  ranks: SECRET_RANKS[s.ability],
}));

const BY_ABILITY: ReadonlyMap<string, TechniqueDef> = new Map(
  SECRET_ARTS.map((s) => [s.ability, s]),
);

/** The secret seat an ability holds, if any. */
export function secretArtDef(ability: string): TechniqueDef | undefined {
  return BY_ABILITY.get(ability);
}

/** The secret shelf of one school, anchor-ordered as authored. */
export function secretArtsFor(style: TechniqueStyleId): TechniqueDef[] {
  // Secrets are weapon-taught, so only combat styles ever match — the
  // widened signature just lets the codex ask about ANY school shelf.
  return SECRET_ARTS.filter((s) => s.style === style);
}

/**
 * The whole technique pool's one lookup — rung, page, or secret seat.
 * THE SECOND HAND's seats resolve through here so every citizenship
 * answers at the same door; the ladder-only queries stay on
 * `techniqueDef`.
 */
export function techniquePoolDef(ability: string): TechniqueDef | undefined {
  return techniqueDef(ability) ?? BY_ABILITY.get(ability);
}
