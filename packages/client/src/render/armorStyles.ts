/**
 * THE WORN BOOK'S STYLE SHELVES — the armor style contracts (body,
 * helm, leg, boot, glove, offhand), their rosters, THE DYE LAW's
 * colorways, and the one-line resolvers. Pure data and lookups; the
 * painters that read them stay in armor.ts. Moved verbatim from
 * armor.ts (foundations F3.1).
 */
import { shade } from './tint.js';
import { ArxMark } from './wornLight.js';
import { itemDef } from '@arx/content';

export type ArmorClassStyle = 'cloth' | 'leather' | 'plate';

export interface BodyStyle {
  /**
   * THE WORN LIGHT: the working bonded to this piece, overlaid onto the
   * resolved style rather than authored into it (see wornLight.ts). A
   * def never sets this; the rig does, per instance.
   */
  arx?: ArxMark;
  color: string;
  trim: string;
  /** Rivets, buckles, plate edges. Default shade(color, -20). */
  metal?: string;
  cls: ArmorClassStyle;
  silhouette: 'tunic' | 'robe' | 'jerkin' | 'cuirass' | 'brigandine';
  /** The high-wardrobe kinds each have ONE owner set: `bonemaw` the
   *  jadeskull trophy jaw clamped over a jade dome, `boneridge` the
   *  fellbone slab fan,
   *  `thorncrest` the rimethorn hooks (palethorn is its pale quench),
   *  `lionhead` the kingsmane sculpted lions, `gonfalon` the oathgold
   *  lame-stack, coronet and lance-spar flying its hung banner,
   *  `rampart` the redmarch crenellated parapet under its hung
   *  cross-banner, `sunfan` the
   *  sunhallow gilt ray petals, `veilwing` the gloamsight swept wing
   *  plates, `stormspire` the stormsinger storm-glass crystals,
   *  `charbrand` the flamewrought ember-seamed char slabs,
   *  `wardcrest` the duskwarden brass crescent with its watch stone,
   *  `aethercrest` the aetherion floating silver arcs, `gateshard`
   *  the gatefall broken arch of night glass that never meets. */
  pauldron:
    | 'none' | 'round' | 'spiked' | 'layered' | 'bladed' | 'fur'
    | 'feathered' | 'orbs' | 'shards' | 'wyrmwing'
    | 'bonemaw' | 'boneridge' | 'thorncrest' | 'lionhead'
    | 'gonfalon' | 'rampart' | 'sunfan' | 'veilwing'
    | 'stormspire' | 'charbrand' | 'wardcrest' | 'aethercrest'
    | 'gateshard' | 'mothpile' | 'dawncrest' | 'boughmantle'
    // The fen court's other shoulders — one owner each, and the
    // lots-override-pauldron law (the leviathans precedent) running
    // on cloth: `orchidpaul` mirebloom's bloom-and-bud, `cattailpaul`
    // rustsedge's sheaf-and-creel, `heronwing` graymist's folded
    // wing and plume tuft. Each kind wears TWO designs — the
    // shoulders answer each other, they do not repeat each other.
    | 'orchidpaul' | 'cattailpaul' | 'heronwing'
    // THE STORM COURT'S SHOULDERS — stormwoven's four weathers, one
    // owner each, every pair ASYMMETRIC: `cloudbank` the rolling
    // bank and the low fog (the shoulders ARE weather, lit from
    // within on the strike), `anvilpaul` the storm shelf and the
    // charge coil, `showerpaul` the sunbreak and the drip veil,
    // `aurorabind` the shoulder that IS the aurora — no shell at
    // all: ribbon streams of drawn light orbiting a torn night
    // heart, held by one still frost bind (per-side builds, one
    // wind). Three ride THE STORMBOLT clock; the aurora dances on
    // THE SUBSTORM instead — it never strikes.
    | 'cloudbank' | 'anvilpaul' | 'showerpaul' | 'aurorabind'
    // THE TIDE COURT'S SHOULDERS — tidecaller's four waters, one
    // owner each: `tideorbs` the base's MATCHED elemental pair —
    // levitating orbs of living seawater over wet seats (inner
    // swirls, ring current, droplet satellites, rising trickle,
    // surge crown on the beat; surfpaul is dead); `deeppaul` the
    // medusa and the mote fall, `darkwells` the dark waters' TWIN
    // WELLS — a MATCHED pair of wells of black water sunk into the
    // caps, THE RISER climbing from each deep with the swell
    // (murkpaul and coralpaul are dead), `vortexpaul` the whirl and
    // the wash. All on THE TIDE clock, each device offset by its
    // place down the garment (THE TRAVELING SWELL law).
    | 'tideorbs' | 'deeppaul' | 'darkwells' | 'vortexpaul'
    // THE SWORN BRAZIERS — cindersworn's MATCHED pair: an iron
    // brazier sunk into each cap, ringed by a crown of standing
    // char shards, holding a bed of coals whose light lives only in
    // the cracks BETWEEN them; the pair draws on ONE breath (the
    // cinder clock), and at the flare each vents a drawn flame lick
    // and lets its sparks rise. Fire sworn, not displayed.
    | 'brazierpaul'
    // THE TAKEN SHARDS — voidwhisper's MATCHED pair: a bite torn
    // from each cap's crown, true void showing inside the wound,
    // and the missing shard still HOVERING above it, torn edges
    // rim-lit in plasma. The pair shares the hush (one whisper
    // brightens both) while each shard bobs on its own time (the
    // clockwork law). The void does not return what it takes.
    | 'sunderpaul'
    // THE DOWN SHOULDERS — thistledown's MATCHED pair: quilted
    // linen caps crossed by stitch seams, soft down escaping at the
    // seam crossing, and on the passing breeze each shoulder lets a
    // seed go (per-side time — the clockwork law). The starter's
    // first shoulders are the field itself, worn gently.
    | 'downpaul'
    // THE FOUR SHADOWS' SHOULDERS — cutpurse's guild offices, one
    // owner per LOT, pairs asymmetric (one shoulder for the guild,
    // one for the work): `shadowdrape` the notched half-mantle and
    // the bare crossed straps, `grapnel` the climb and the pry,
    // `duskmantle` the dusk tabs and the silver cord. The Knife
    // outranks the offices: `razorcrest` is the master's MATCHED
    // pair — twin nested razor crescents, honed edge, the lining
    // bleeding in the lap gap.
    | 'shadowdrape' | 'grapnel' | 'duskmantle' | 'razorcrest'
    // The hunter's shoulders — one owner each: `halcyon` the
    // kingfisher folded wing, `guardhair` the wolfstalker winter
    // pelt, `drakewing` the drakescale ribbed wing-fin, `oakspaul`
    // the stagheart oak-leaf lappets.
    // Kingfisher's FOUR SHOULDERS — lots override `pauldron` the way
    // they override `kind` (one owner per LOT): `sharkfin` the
    // leviathan's dorsal icon, `escalight` the deep angler's barbel
    // lights, `krakengrip` the coiled sucker-armed tentacle,
    // `sailfan` the marlin's ribbed sail.
    | 'sharkfin' | 'escalight' | 'krakengrip' | 'sailfan'
    | 'guardhair' | 'drakewing' | 'oakspaul';
  pauldronColor?: string;
  /** Bright edge accent on the pauldron rim / blade edge. */
  pauldronTrim?: string;
  /** Spike count for 'spiked' pauldrons, 1..3. Default 1. */
  pauldronSpikes?: number;
  /** The boldness dial: scales the whole shoulder assembly. Heavy
   *  champion plate earns 1.1-1.2; leather stays nearer 1. Default 1. */
  pauldronScale?: number;
  chest: 'none' | 'straps' | 'plate' | 'emblem' | 'stitch' | 'scales' | 'diamondhide';
  /** Hanging leather fringe strips off the chest yoke — the buckskin read. */
  fringe?: boolean;
  /** Thistledown: THE BROIDERY — the starter's craft elevated from
   *  mending to needlework: a running-stitch border riding the yoke
   *  hem, a thistle sprig embroidered at the sternum (stem, leaf
   *  ticks, a small down bloom), and a vine stitch above the hem.
   *  Thread, not gold: the first robe's jewel is the hand that made
   *  it. */
  broidery?: { thread: string; sprig: string };
  /** Thistledown: THE CORDED SASH — the rope belt reborn as a woven
   *  two-strand cord, knotted at the leading hip, its two tassel
   *  cords hanging with seed-fluff ends that stir on the breeze. */
  sashcord?: { color: string; tassel: string };
  /** Thistledown: two clean lapped hem courses, each with its own
   *  stitch border — layered tailoring, never patchwork. */
  hemcourse?: { colors: [string, string] };
  /** Thistledown: THE DRIFT — loosed seeds riding ONE WIND across
   *  the skirt air at a constant pace, brightening when the breeze
   *  passes. Read by downpaul for its own shed (the cross-read
   *  pattern). */
  driftdown?: { seed: string };
  emblem?:
    | 'chevron' | 'diamond' | 'bolt' | 'skull' | 'sun' | 'leaf' | 'star'
    | 'moon' | 'eye' | 'moth' | 'coin' | 'bullhead' | 'flame' | 'orrery'
    | 'crown' | 'lion';
  /** Glowing rune dashes riding the hem trim — the enchanted-cloth read. */
  runes?: string;
  /** A waist sash: band, hip knot, two swinging tails. */
  sash?: string;
  /** Hip plates hanging from the fauld — the heavy-knight lower read. */
  tassets?: boolean;
  /** Vertical fluting on the breastplate — the Gothic-plate read. */
  ridges?: boolean;
  /** Robe/coat skirt length below the belt line, tiles. 0 = none. */
  skirt: number;
  skirtSlit?: boolean;
  /** drawArm sleeve override. Default shade(color, -12) — today's law. */
  sleeve?: string;
  /** Neck treatment: plate gorget ring or a fur ruff. */
  collar?: 'gorget' | 'fur';
  /** Fur-ruff pelt color. Default shade(trim, 34) — the old law. */
  collarColor?: string;
  /** A belt pouch on the hip — the adventurer's secondary read. */
  pouch?: boolean;
  /** A diagonal shoulder-to-hip cord with bone toggles — the trapper. */
  bandolier?: string;
  /** A brush tail swinging off the trailing hip — the fox trophy read. */
  tail?: { color: string; tip: string; ember?: string };
  /** Hem/trim accent that breathes with a slow ember pulse. */
  glowTrim?: string;
  /** Full sleeves: the forearm wears cloth with a belled cuff (robes). */
  sleeves?: 'full';
  /** Shoulder mantle (cope) color — the layered wizard majesty read. */
  mantle?: string;
  /** A second hem layer beneath the skirt — flowing depth. */
  underskirt?: string;
  /** Drifting Arx motes in this color — the quiet aura. */
  motes?: string;
  /**
   * Gravity folds: hanging-cloth creases down the torso and skirt with
   * a catch-light beside the deepest one — what turns a flat fill into
   * FABRIC. Every robe should want this.
   */
  folds?: boolean;
  /**
   * A short shoulder cape with a SHAPED hem ringing the upper chest —
   * the garment-over-garment layer for sets whose mantle story isn't
   * the wizard cope. scallop = foam/feather covers, point = leaf tips,
   * dag = storm flags. Colors default shade(color, -10) / trim.
   */
  capelet?: { color?: string; trim?: string; hem: 'scallop' | 'point' | 'dag' };
  /**
   * Two cloth bands hanging from the shoulders past the belt, tick-
   * marked — the ordained read. From behind they cross the shoulders
   * as short tabs. Colors default shade(color, -16) / trim.
   */
  stole?: { color?: string; trim?: string };
  /**
   * The knight's cloth front panel over the cuirass, pointed hem past
   * the fauld; the waist crosses it (a surcoat is CINCHED). The chest
   * emblem rides the tabard. Back gets a shorter plain panel.
   */
  tabard?: { color: string; trim?: string };
  /** Gambeson quilting: two-value diagonal stitch channels. */
  quilt?: boolean;
  /** Front X-lacing cord up the chest opening — how a jerkin closes.
   *  `true` derives shade(trim, -10). */
  lace?: boolean | string;
  /**
   * A contrasting shoulder-yoke panel, front AND back (a yoke wraps),
   * optionally stitch-ticked at its hem — the hunter's tailored cut.
   * Color defaults shade(color, -14).
   */
  yoke?: { color?: string; stitch?: boolean };
  /**
   * A real belt where the anonymous waist band was: two-tone strap,
   * buckle plate, hanging strap end. Colors default shade(trim, -8) /
   * metal. Skipped when a sash owns the waist.
   */
  belt?: { color?: string; buckle?: string } | true;
  /** Chest device size multiplier — sets whose identity IS the device
   *  wear it bolder. Default 1. */
  emblemScale?: number;
  /** Breastplate anatomy: center forge crease with a light/dark split
   *  down the chest plate — two halves hammered and joined. */
  midline?: boolean;
  /** Rivet rows along the chest plate's seam lines — the boilerwork
   *  read. Rides the 'plate' chest. */
  rivetSeams?: boolean;
  /**
   * Hanging charms off the waist line — small bells on cords that
   * sway with the stride. The moonbell read: jewelry that lives on
   * the garment, not a device stamped on it.
   */
  charms?: { color: string };
  /**
   * Silk binding cords crossing the torso both ways, front AND back
   * (a wrap that vanished on turn would break the garment), knotted
   * where they meet — the broodsilk read.
   */
  cords?: { color: string };
  /**
   * Bone inlay: three lapped ivory arcs across the chest plate — the
   * barrow-king's ribs, worn on the outside. Front only; the back
   * keeps its spine ridge.
   */
  ribs?: { color: string };
  /**
   * Ice on the garment: icicle points hanging from the capelet hem
   * (rides the capelet — it needs an eave to freeze from) and slow
   * winking frost glints low on the skirt. The wintercourt read:
   * the cold lives ON the cloth, not around it.
   */
  icefringe?: { color: string };
  /**
   * A prayer-bead loop hung from the neckline, two strands meeting at
   * a drop medallion over the sternum, swinging a hair with the
   * stride — the keeper's jewelry. Front only; the back stays plain.
   */
  beads?: { color: string };
  /**
   * Two ribbons of living light rising off the shoulder blades and
   * waving on their own slow sky — aurora worn as a garment. Light,
   * not cloth: they ride above every layer and never go out.
   */
  ribbons?: { colors: [string, string] };
  /**
   * A layered feather mantle ringing the shoulders, front AND back —
   * two lapped rows of broad vanes, tips broken to a second color,
   * each with its own spine. An optional sheen walks the rows on a
   * slow clock — the rook's oil-slick iridescence. The bird worn as
   * a garment, never a trophy.
   */
  plumage?: { color: string; tip: string; sheen?: string };
  /**
   * The archer's back quiver on the trailing shoulder blade. From
   * behind it is the whole story: banded tube, three fletched nocks.
   * From the front the story is the chest strap and the fletchings
   * peeking over the shoulder — gear that survives the turn.
   */
  quiver?: { color: string; fletch: string };
  /**
   * A neck scarf knotted at the trailing shoulder, its tail waving
   * behind in a lazy S on its own clock, tip dipped in a second
   * color — the assassin's flag. Cloth, not light: full weight.
   */
  scarftail?: { color: string; tip?: string };
  /**
   * Smoke curling off the shoulders, rising and thinning — the burn
   * never quite went out. Deterministic from the clock alone.
   */
  wisps?: { color: string };
  /**
   * Fireflies keeping the wearer company: low wandering lights that
   * BLINK on their own beats — alive, where motes merely drift.
   */
  fireflies?: { color: string };
  /**
   * Shed feathers rocking down past the hem and fading — the rook
   * molts and never runs out.
   */
  featherfall?: { color: string };
  /**
   * Storm arcs snapping across the plate on their own beats — a
   * jagged bolt that flickers alive, jumps shoulder to chest, and is
   * gone. Between snaps, small charge sparks keep the current honest.
   */
  arcsparks?: { color: string };
  /**
   * The forge's veins: branching molten cracks glowing between the
   * chest plates, each breathing on its own furnace beat. The metal
   * never cooled; the seams admit it.
   */
  moltenSeams?: { color: string };
  /**
   * Hot sparks rising off the plate and flickering out — embers where
   * motes merely drift; they burn, wobble upward, and die mid-air.
   */
  embers?: { color: string };
  /**
   * Star glints winking off the plate's high points on their own
   * beats — armor polished past vanity into legend.
   */
  gleam?: { color: string };
  /**
   * The chest device wakes: two lights kindle in the emblem skull's
   * eye sockets, hold their look, and gutter out on their own slow
   * blink — the device is not entirely a decoration. Rides the skull
   * emblem's own geometry; the jadeskull word.
   */
  skullgaze?: { color: string };
  /**
   * Watch-fire rosettes: silver petal bosses set at the harness
   * points, each with a gem heart. The hearts keep a rotation — one
   * flares awake at a time, the way watch fires answer each other
   * down a border wall. The redmarch word.
   */
  rosettes?: { color: string; metal: string };
  /**
   * Cold fire off the shoulder thorns: pale flame tongues that lick
   * up from behind the pauldrons on their own gutter, re-shaping
   * every beat, giving no heat. Consumed by drawPauldron so the fire
   * rides ABOVE the caps. The thorn twins' word (rimethorn burns
   * pale blue, palethorn burns bone gold).
   */
  coldfire?: { color: string };
  /**
   * Marrow-light between the shoulder bones: two small cold flames
   * guttering in the gaps of the boneridge fan, and one drifting
   * mote that never strays far. Consumed by drawPauldron so the
   * light sits IN the bone, not on the chest. The fellbone word.
   */
  hollowlight?: { color: string };
  /**
   * THE CROWN RING: a broad gilt ring floating about the torso,
   * turning slowly on its own axis — from the front two arcs stand
   * off the flanks, from behind the whole circle shows. One glint
   * walks the rim; nothing holds it up. The kingsmane word, and the
   * wardrobe's one floating regalia.
   */
  crownring?: { color: string };
  /**
   * Three charged orbs orbiting the WHOLE torso on the crown ring's
   * depth law — near side big and lit, far side small and dim, and
   * hidden where the body stands between it and you. Each orb snaps
   * a static spark on its own beat. The stormsinger word.
   */
  stormorbs?: { color: string };
  /**
   * Sigils surfacing through the skirt cloth — one rises, holds its
   * look, and sinks back into the weave while the next wakes. The
   * garment is reading; so is whoever faces it. The gloamsight word.
   */
  sigilweave?: { color: string };
  /**
   * Hanging inscribed strips off the shoulders and hem, swaying on
   * the stride, their runes kindling in a slow reading wave — top
   * strip first, hem last. Cloth, not light: full weight. The
   * flamewrought word.
   */
  runestrips?: { color: string; rune: string };
  /**
   * Gem clusters riding the capelet hem, winking awake in rotation
   * the way watch fires answer each other (rides the capelet — the
   * cape IS the setting; without one there is nothing to stud). The
   * duskwarden word.
   */
  gemwake?: { color: string; metal: string };
  /**
   * THE GLYPH RING: a circle of living runes floating about the
   * hips, turning slowly — from the front two arcs of runes stand
   * off the flanks (the body hides the rest); from behind the whole
   * circle shows. Every rune rides the rim on the fake-3D depth law,
   * and one glint walks among them. Nothing holds it up. The
   * aetherion word, and the wardrobe's second floating regalia after
   * the kingsmane crown ring.
   */
  glyphring?: { color: string };
  /**
   * THE VIGIL: warm lamp-light walking the procession — the crown
   * device woven into each shoulder gonfalon kindles, holds its glow,
   * and passes the light on: left banner, right banner, then the
   * helm's shrine lamp, the way votive lights are lit down a nave.
   * Consumed by drawPauldron so the light lives ON the cloth. The
   * oathgold word.
   */
  vigil?: { color: string };
  /**
   * THE BREACH: the door remembers opening. A hairline seam of
   * otherlight cracks open down the breastplate's forge crease,
   * blooms, and seals again, and the shoulder arches and the helm
   * keystone take their turns on the same slow rotation — left
   * arch, chest, right arch, then the crown gap — the way a locked
   * door is tried, hinge by hinge. While a station holds, glass
   * motes drift UP out of the light and fade: the far side's
   * gravity, leaking. Consumed by drawPauldron so the shoulder
   * stations burn IN the shard fractures. The gatefall word.
   */
  breach?: { color: string };
  /**
   * THE LOW WARDROBE'S OWN CLOTH — one owner each. A leveling robe
   * earns layers, not a palette swap.
   */
  /** Mothwing: THE WING CLOAK — the moth worn whole. Two layered
   *  folded wings (forewing lapped over hindwing) drape shoulder to
   *  hip, scalloped, veined, each forewing carrying its pale-ringed
   *  eye-spot. THE SHIVER is the living word: on a slow clock the
   *  folded wings tremble and shed luminous dust. Species options
   *  per dye lot: `tails` grows luna's long hindwing streamers,
   *  `emberEdge` smolders along ember's scallops, `crescent` wakes
   *  dusk's spots as moon crescents. */
  wingdrape?: {
    color: string; spot: string;
    tails?: string; emberEdge?: string; crescent?: string;
  };
  /** Dawnsworn: the horizon at the hem — three flat bands climbing
   *  from night up into gold, painted above the trim. They ride THE
   *  DAYBREAK clock: as the brow sun climbs, light walks the bands
   *  gold-first; `phase` matches the hood's sky. */
  dawnbands?: {
    colors: [string, string, string];
    phase?: 'rising' | 'setting' | 'noon' | 'eclipse';
  };
  /** Dawnsworn: the sun collar — gilt ray tabs ringing the shoulder
   *  line front and back, long over the shoulders, short at the
   *  throat: the sunrise worn as a yoke. */
  raycollar?: { color: string };
  /** Dawnsworn: two small sun medallions hung on cords off the sash,
   *  each a disc with ray nubs, swinging with the stride. */
  sunmedals?: { color: string };
  /** Fenwalker: THE WATERLINE — the hem stitched as still black
   *  water: a dark band riding the living hem's own contour, reed
   *  blades standing out of it, and one slow ripple ring opening at
   *  a time where something under the cloth moved. */
  mirehem?: { water: string; ripple: string; reed: string };
  /** Fenwalker: THE WISP COURT — three fen lights circling the hem
   *  in slow court on THE FENLIGHT clock, each on its own watch.
   *  Far-side lights inside the skirt silhouette are SKIPPED, per
   *  the floating-orbit occlusion law. */
  wispcourt?: { color: string };
  /** Fenwalker: the reed girdle — a two-strand woven cord crossing
   *  at the waist, carrying a bound rush bundle and one carved
   *  bog-charm that swings with the stride. */
  reedgirdle?: { cord: string; charm: string };
  /** Mirebloom lot: the crown's orchid sheds — one petal at a time
   *  drifting down the skirt, rocking as it falls. MUST contrast the
   *  robe, per the species-lots law. */
  petalfall?: { color: string };
  /** Rustsedge lot: two cattail seed-heads standing stiff off the
   *  girdle line, velvet brown tipped in pale fluff. */
  seedheads?: { head: string; fluff: string };
  /** Graymist lot: the low fog — a translucent mist band sliding
   *  around the skirt, guttering on the fen clock. */
  mistwrap?: { color: string };
  /** Stormwoven: THE THUNDER BANK — the front itself banked across
   *  the chest, fat cloud rolls with flat lit caps, the gold charge
   *  waking along the underside on THE STORMBOLT clock. */
  thunderbank?: { color: string; glow: string };
  /** Stormwoven: THE BOLT BRAND — the storm's mark inlaid down the
   *  skirt's leading side in its own dark channel; it charges with
   *  the sky and burns white on the shared strike. */
  boltbrand?: { color: string };
  /** Stormwoven: THE RAIN HEM — a soaked band riding the living hem,
   *  slanted rain falling past it, one ring at a time where a drop
   *  gives up. */
  rainhem?: { color: string };
  /** Stormwoven: THE STATIC COURT — three charge sparks climbing the
   *  hem air, faint on the charge, popping together on the strike. */
  staticcourt?: { color: string };
  /** Stormwoven: THE CHARGE BEADS — three storm-glass beads on the
   *  waist cords, lighting in sequence as the sky charges. */
  chargebeads?: { cord: string; bead: string };
  /** Stormwoven base: THE STORM SHROUD — low fog banks sliding
   *  around the hem, lit from within for a beat at the strike. */
  stormshroud?: { color: string };
  /** Thunderhead lot: the ground flash — for one beat after the
   *  strike, the world under the hem answers. */
  groundflash?: { color: string };
  /** Sunshower lot: one warm window of light sliding across the
   *  cloth as the clouds shift. The luck is that it finds you. */
  sunpatch?: { color: string };
  /** Aurora lot: THE RISING AURA — the wardrobe's fourth floating
   *  regalia (crown ring, glyphs, the eddy, now the lights loose):
   *  three ribbons of aurora corkscrewing the whole body chest to
   *  hem on the glyph ring's occlusion law, spinning at one
   *  constant pace, surging by amplitude alone; at the dance,
   *  risers slip the aura and climb. */
  auroraband?: { colors: string[] };
  /** Aurora lot: stars scattered down the skirt cloth, one waking
   *  at a time — the night the lights need behind them. */
  starfield?: { color: string };
  /** Aurora lot: THE SNOWLINE — a frost band riding the living hem;
   *  at the dance's last station the snow answers the sky in the
   *  curtain's own colors, drawn dashes, never a wash. */
  frosthem?: { color: string; glow: string };
  /** Hedgemage: herb bundles and a seed pouch hung off the sash cord,
   *  swinging on the stride — the garden carried along. */
  herbgirdle?: { cord: string; leaf: string };
  /** Tidecaller: THE LIVING SURF — scalloped surf tiers whose
   *  waterline rides THE TIDE clock: they climb the robe with the
   *  swell and draw back through the slack, foam crescents seated
   *  in the dips, backwash sparkle on the retreat. */
  foamtiers?: { color: string };
  /** Tidecaller: a pearl strand off the neckline, no medallion — one
   *  glimmer walks bead to bead, and the whole strand catches the
   *  light when the wave breaks. */
  pearlstrand?: { color: string };
  /** Tidecaller: THE STREAM WRAP — drawn currents crossing the
   *  torso with foam riding the flow, surging at the break. Water
   *  is DRAWN, never glowed. */
  streamwrap?: { color: string; foam: string; core?: string };
  /** Tidecaller: THE TIDE MOON — the caller's warrant high on the
   *  chest; its lit face waxes with the swell and stands full at
   *  the break. The moon moves the water; the robe repeats it. */
  tidemoon?: { color: string };
  /** Abyss lot: bioluminescent motes rising through the hem air in
   *  their own procession. */
  luremotes?: { color: string };
  /** Dark-waters lot: THE UNDERTOW — the lot's light, carried: deep
   *  `water` casing under the cold `neon` core, cross-read by every
   *  dark-waters device (the dawncrest pattern); its own verse is
   *  the sinking motes — the abyss breathes out and rises, the dark
   *  waters take, and everything sinks. */
  undertow?: { water: string; neon: string };
  /** Dark-waters lot: THE STRATA — the robe re-clothed as lapped
   *  sheets of standing water, each a step darker (the drowning
   *  gradient worn down the body), every hem a slack DIAGONAL
   *  waterline breathing a beat behind its neighbor; colors[0] is
   *  the chest collar sheet, the rest descend the skirt. A drawn
   *  rip-current runs the second seam. The water column, not a
   *  cloth tube. */
  depthveils?: { colors: string[] };
  /** Dark-waters lot: THE DISSOLVING HEM — the last stratum tears
   *  into sinking tongues that fall PAST the cloth's edge, `deep`
   *  showing between them. The robe does not end; it goes under.
   *  Silhouette: structure — the tongues hold white in the hurt
   *  flash. */
  sinkhem?: { color: string; deep: string };
  /** Dark-waters lot: THE EDDY — the wardrobe's third floating
   *  regalia (kingsmane's crown ring, aetherion's glyphs, now a
   *  ring CURRENT orbiting the hips): near arc only, drawn casing
   *  under a cold core, droplets sinking off its low points.
   *  Floating regalia never take the front-plane transform. */
  eddyring?: { water: string; neon: string };
  /** Maelstrom lot: spindrift — the churn riding the living hem,
   *  spume streaking off the leading side at the break. */
  spindrift?: { color: string };
  /** Abyss lot: THE TWIN MEDUSAE — the living jellyfish at each
   *  shoulder, read by deeppaul (the cross-read pattern): bell
   *  color and the light its organs and rim carry. */
  medusae?: { bell: string; lume: string };
  /** Abyss lot: THE JELLY FRINGE — oral-arm streamers off the
   *  shoulder line, swaying, lume-tipped. */
  jellyfringe?: { color: string; lume: string };
  /** Voidwhisper: THE WHISPER RIFT — one grand tear leaning across
   *  the torso where the void took a strip of the robe (a diagonal
   *  kills the tube). Interior = the garment's darkest value, plasma
   *  only on the torn edge (THE VOID IS AN ABSENCE). Read by
   *  sunderpaul for its rim light (the cross-read pattern). */
  voidrift?: { casing: string; core: string; void: string };
  /** Voidwhisper: THE ARRIVALS — pale star-points living at fixed
   *  seats scattered down the skirt: each wakes, brightens, dies,
   *  and is next seen at its NEXT seat. Nothing ever travels. */
  winkmotes?: { color: string };
  /** Voidwhisper: THE SUNDERED HEM — the robe's last hem course is
   *  SEVERED: it floats below the skirt with a band of true void
   *  between, both torn edges rim-lit, drifting on the hush. The
   *  band is silhouette — structure — it holds white in the flash. */
  sunderhem?: { color: string };
  /** Cindersworn: THE OATH SEAMS — drawn fissures where the char
   *  split and the fire looked out; the ember crawl walks them.
   *  Read by brazierpaul for its coal-bed light (the cross-read
   *  pattern). Casing = deep fire, ember = the hot core. */
  emberveins?: { casing: string; ember: string };
  /** Cindersworn: THE CINDER VEILS — the robe re-clothed as lapped
   *  sheets of charred cloth descending the skirt, each a step
   *  darker, every hem a slack burnt diagonal; ember light breathes
   *  in the gaps BETWEEN the laps, never on them. colors[0] is the
   *  charred yoke at the chest; the rest descend. */
  cinderveils?: { colors: string[] };
  /** Cindersworn: THE ASH HEM — the hem is burning away: ragged
   *  char tongues past the cloth's bottom edge (structure — they
   *  hold white in the flash), the burn line crawling along it, and
   *  sparks that RISE off the line and die. What the robe loses it
   *  gives to the air. */
  ashhem?: { char: string; ember: string };
  /** Starweaver: a linked constellation low on the skirt — five stars
   *  joined by faint lines, flaring one at a time in sequence. */
  constellation?: { color: string };

  // ======================== THE HUNTER'S WARDROBE (the leather lane's
  // own one-owner words — each named by exactly one family, per the
  // TEN COSTUMES law; colorway lots MUST restate every color here).

  /** Hareswift: the courier's cross-body satchel — strap over the
   *  chest (front-plane), flap bag riding the trailing hip. */
  satchel?: { color: string; strap: string };
  /** Hareswift: THE WIND MANTLE — a draped two-tier shoulder cape in
   *  wind-torn swept points, all raked the same way (the wind lives
   *  in the cut), hare-fur lining peeking only at the throat. The
   *  collar done the way collars are done. */
  windmantle?: { color: string; under: string; lining: string };
  /** Hareswift: wind-cut hem tabs at the waist — layered swept
   *  triangles kicked by the stride, the hood's own language carried
   *  to the hem. ONE furniture family, crown to waist. */
  windtabs?: { color: string };
  /** Hareswift: the luck worn openly — a hare's-foot talisman on a
   *  belt cord, swinging with the stride. Couriers don't carry
   *  trophies; they carry LUCK. */
  luckcharm?: { foot: string; cord: string };
  /** Hareswift: THE SLIPSTREAM — speed made visible: pale wind
   *  streaks that trail off the shoulders only while moving, scaled
   *  by the run. At rest there is nothing to see; that is the
   *  point. */
  slipstream?: { color: string };
  /** Hareswift: two waybill ribbons off the belt knot, streaming and
   *  kicking with the stride — speed made visible at a standstill's
   *  first step. */
  streamers?: { color: string };
  /** Kingfisher: THE SCALECOAT — fish-leather worn whole: dense
   *  crescent-scale rows banding the torso, nacre edges, a dorsal
   *  fin ridge on the back read — and THE SHEENWAVE, an iridescent
   *  light band that travels the rows on a slow clock: light through
   *  water, the secret-boss shimmer. */
  scalecoat?: { color: string; edge: string; sheen: string };
  /** Kingfisher: THE HOOKLINE — a slack fishing line slung across
   *  the chest, three barbed hooks riding it and one feathered lure
   *  at the low point. The lure winks WARM on the rare-glint law:
   *  bait, not jewelry. */
  hookline?: { line: string; hook: string; lure: string };
  /** Cutpurse: the guild tether — a cord slung shoulder-to-hip strung
   *  with lifted coins; one glint WALKS the strand, coin to coin. The
   *  trophies are the heraldry. */
  cointether?: { cord: string; coin: string; glint?: string };
  /** Cutpurse: THE CUT KIT — the lifted purse at the trailing hip,
   *  its slit showing a coin on the rare clock, the curved snip
   *  that made the slit hanging beside. The trade, worn as gear. */
  cutkit?: { pouch: string; blade: string; coin: string; glint?: string };
  /** Alleyrat: three skeleton keys off one iron ring at the leading
   *  hip — borrowed doors, rare uneven glint. */
  keyring?: { ring: string; keys: string; glint?: string };
  /** Moonless: two bulbs of bottled dark on the belt; one leaks a
   *  slow wisp. The exit, worn ready. */
  smokeflasks?: { glass: string; cork: string; wisp: string };
  /** Redhand: the crimson cord above the belt, one knot per job
   *  that ended the only way the Knife's jobs end. */
  tallycord?: { cord: string; knot: string };
  /** Alleyrat: the pry bar slung flat across the BACK — the
   *  housebreaker's answer, worn where the door can't see it
   *  coming. Back read only. */
  prybar?: { color: string };
  /** Moonless: a wound sash crossing the chest in the veil's own
   *  band language, one silver thread stitched along its edge. */
  nightsash?: { color: string; thread: string };
  /** Redhand: crossed crimson cords over the chest, knotted at the
   *  heart — the red hand's harness; the mark is the binding. */
  redharness?: { cord: string; knot: string };
  /** Redhand: THE BLOOD SHROUD — layered tiers of night cloth
   *  draped off the trailing shoulder, every cut edge showing the
   *  crimson `lining`; the `edge` is the one arterial tick per
   *  tier. Back read = the layered half-cape. The armor bleeds by
   *  design. */
  bloodshroud?: { cloth: string; lining: string; edge: string };
  /** Redhand: THE WRIT — the contract in a slim black case at the
   *  trailing hip, sealed in blood-dark wax with cut ribbon ends.
   *  Matte on purpose: paper kills quieter than steel shines. */
  writkit?: { case: string; seal: string; ribbon: string };
  /** Trapline: the working bandolier — strap, bone toggles, a coiled
   *  snare wire, and a hanging lure that swings on the stride. Every
   *  loop has caught something. */
  snareline?: { strap: string; bone: string; wire: string };
  /** Emberfox: the cream throat bib, rounded and fur-ticked at its
   *  edge — the fox's own front. Front-plane. */
  foxbib?: { color: string };
  /** Wayfarer: the bedroll slung diagonal across the back — a fat
   *  wool roll with strapped end caps; from the front only the strap
   *  and the roll's shoulder peek admit to it. */
  bedroll?: { color: string; strap: string };
  /** Wolfstalker: the trophy strap — a chest cord hung with four
   *  wolf claws, points down. Front-plane. */
  clawstrap?: { strap: string; claw: string };
  /** Nightveil: the knife baldric — three sheathed throwing blades on
   *  a diagonal strap; a violet glint wakes one blade at long, uneven
   *  intervals. Front-plane. */
  knifebaldric?: { strap: string; steel: string; glint?: string };
  /** Nightveil: twin dusk scarf tails off the shoulders, drifting on
   *  the cowl's own slow clock — the dark that follows you out. */
  shadowtails?: { color: string };
  /** Drakescale: THE TAILORED HIDE — front, a center plastron of
   *  five great belly plates (`plate` body, `lit` top plane) lapped
   *  bottom-up over dark flank fields dressed with `hide` scutes;
   *  back, the dorsal ridge owns the spine. Tailored, never tiled. */
  drakerows?: { hide: string; plate: string; lit: string };
  /** Drakescale: the banked forge under the plates — molten light
   *  breathing in the plastron gaps, ember motes rising rare off the
   *  waist seam. `core` is the hottest value. */
  heatseam?: { color: string; core: string };
  /** Stagheart: the forest mantle — lapped bark-leather tiers over
   *  the shoulders with moss spilling at every edge. */
  mossmantle?: { bark: string; moss: string };
  /** Stagheart: gold leaves shed from nowhere, falling slow and
   *  fluttering — the wilds acknowledging their own. */
  leaffall?: { color: string };
}

export interface HelmStyle {
  /**
   * THE WORN LIGHT: the working bonded to this piece, overlaid onto the
   * resolved style rather than authored into it (see wornLight.ts). A
   * def never sets this; the rig does, per instance.
   */
  arx?: ArxMark;
  color: string;
  trim: string;
  /** THE FORGE LAW: every metal kind is a FULL-FACE helm with its own
   *  forged silhouette — a knight's helm owns the whole head. The old
   *  open `dome`/`horned` caps are gone; caps read as placeholders.
   *  `bascinet` is the pig-faced full helm (protruding snout box);
   *  `barbute` wears a bold T-cut; `armet` a slatted wedge visor with
   *  pivot roundels; `sallet` a swept tail + icicle bevor; `radiant` a
   *  sculpted sun-mask; `ramfort` the riveted siege bucket; `warmask`
   *  the raider's bronze face plate; `dread` the tooth-visored maw;
   *  `briar` the woven thorn-cage visor; `drake` the lapped-scale
   *  visage with a copper snout. */
  kind:
    | 'greathelm' | 'bascinet' | 'barbute' | 'armet' | 'sallet'
    | 'radiant' | 'ramfort' | 'warmask' | 'dread' | 'briar' | 'drake'
    | 'aurochs' | 'barrow' | 'tempest' | 'furnace' | 'wyrm' | 'warcrown'
    | 'gatehelm'
    | 'hood' | 'circlet' | 'wizard' | 'veil' | 'magus'
    // THE LOW WARDROBE'S OWN HEADS — one owner each, per the
    // one-owner law. A leveling set is not a recolor: `thistlehat`
    // the thistledown wizard's hat on the magus chassis, crowned by
    // a real thistle bloom that sheds its seed to the breeze
    // (fieldhood and its rolled brim are dead — the first road
    // deserves a first HAT), `mothcowl` the mothwing
    // tufted moth's head,
    // `hedgehat`
    // the hedgemage patched twice-bent cone, `hushcowl` the
    // voidwhisper cowl whose peak the void took — the severed tip
    // still hovers over the gap (whispercowl and its embroidered eye
    // are dead — the void keeps only what it takes), `oathcowl` the
    // cindersworn char-tiered watch cowl under the one sworn coal
    // (cinderhood is dead — the fire keeps only what it re-forges),
    // `stardiadem` the starweaver woven silver band under its turning
    // ring of stars.
    | 'thistlehat' | 'mothcowl'
    | 'hedgehat' | 'hushcowl' | 'oathcowl'
    | 'stardiadem'
    // THE STORM COURT'S HEADS — stormwoven's four weathers, one
    // owner each, the lots-override-kind law (the vigils precedent):
    // `shroudcowl` the base cowl whose crown IS a cloud bank, ringed
    // by the orbiting fog shroud, `thunderhat` thunderhead's waved
    // wide-brim storm-wizard hat on the magus chassis with the bolt
    // jewel off the trailing tip, `showerhat` sunshower's
    // rain-slicked luck brim under its prism arc, `coronacowl`
    // aurora's folded midnight cowl under the zenith's ray crown,
    // its horizon mantle handing the hood to the shoulder line.
    // Three keep THE STORMBOLT clock; the aurora seceded to THE
    // SUBSTORM — the one weather that never strikes.
    | 'shroudcowl' | 'thunderhat' | 'showerhat' | 'coronacowl'
    // THE TIDE COURT'S HEADS — tidecaller's four waters, one owner
    // each (tidehood and crestcowl are dead): `tidehat` the base's
    // water-wizard hat — the brim is a circling sea, a drawn
    // current climbs the cone, the tip curls mid-break, a rill
    // pours off the trailing edge; `depthcrown` the abyss under
    // the deep lure's caged lamp, `murkcowl` the dark waters'
    // drowned watch — depth-banded black water under the neon
    // ripseam, the waterline rising inside the hood (conchcrown is
    // dead with the lagoon), `maelcowl` the whirlpool wound as
    // cloth. All four keep THE TIDE clock.
    | 'tidehat' | 'depthcrown' | 'murkcowl' | 'maelcowl'
    // THE HUNTER'S HEADS — the leather lane's own, one owner each:
    // `courierhood` the hareswift wind-flattened runner's hood,
    // kingfisher's FOUR LEVIATHANS (each dye lot wears its OWN sea
    // monster): `sharkmaw` the jaws worn whole — the wearer looks
    // out of the shark's mouth; `anglerhood` the deep hood under its
    // glowing rod-and-lure; `krakencowl` the mantle with eyes and
    // sucker-armed tentacles; `marlincrest` the bill-and-sail
    // strike. Cutpurse's FOUR SHADOWS (each dye lot is a guild
    // OFFICE with its own head): `guildcowl` the master's forward-
    // broken beak peak, `latchhood` the housebreaker's iron-banded
    // coif with the punched keyhole, `veilwrap` the Unseen's wound
    // bands with one lit slit, `gripmask` the Knife's sealed
    // casque — the guild's red right hand clamped across a
    // faceless void. `trapperhood` the trapline
    // deep winter fur tunnel, `foxmantle` the emberfox pelt worn
    // whole, `roadhood` the wayfarer patched traveler, `wolfmantle`
    // the wolfstalker headdress with its cascading mane, `shadowcowl`
    // the nightveil assassin's blade-point dark, `stagcrown` the
    // stagheart antlered forest crown.
    | 'courierhood' | 'sharkmaw' | 'anglerhood' | 'krakencowl'
    | 'marlincrest' | 'guildcowl' | 'latchhood' | 'veilwrap'
    | 'gripmask' | 'trapperhood'
    | 'foxmantle' | 'roadhood' | 'wolfmantle' | 'shadowcowl'
    | 'stagcrown'
    // THE FOUR VIGILS OF THE DAWN — dawnsworn's skies each wear
    // their OWN head now (dawnhood is dead): `orisoncowl` the rising
    // sun's shrine-framed triangle, `vespercowl` the setting sun's
    // hard-folded beak, `zenithhat` noon's brow-burying wide brim,
    // `umbrahood` the eclipse's void with its crowned corona.
    | 'orisoncowl' | 'vespercowl' | 'zenithhat' | 'umbrahood'
    // THE FEN COURT — fenwalker's four waters each wear their OWN
    // head now (fenhood and lanterncowl are dead): `wealdcowl` the
    // deep triangular leaf-fold worn low under its fiddlehead crest,
    // `bloomcrown` the mire orchid worn closed, `sedgehat` the low
    // woven brim under its perched darter, `heroncowl` the gray
    // sweep that sheds the fog it was cut from.
    | 'wealdcowl' | 'bloomcrown' | 'sedgehat' | 'heroncowl';
  visor?: 'slit' | 'cross';
  plume?: { color: string };
  /** `curl` bends the sweep into a ram's spiral beside the temples;
   *  `tine` forks a second point off each horn — the bramble read. */
  horns?: { color: string; size: number; curl?: boolean; tine?: boolean };
  /** Up-curved boar tusks flanking the jaw — the charge read. */
  tusks?: { color: string };
  /** A row of forged spikes riding the crown centerline, front-to-back
   *  — the mohawk of war. Reads as rising points frontal, a full
   *  spiked ridge at profile. */
  spikesCrown?: { color: string };
  /** Swept-back side fins — blade silhouettes off the temples. */
  fins?: { color: string };
  /** Upswept feathered wing blades — the valkyrie read. */
  wings?: { color: string };
  /** A solid metal ridge crest riding the crown centerline. */
  crest?: { color: string };
  /** The forge-accent metal: warmask cheek plates, dread bevor teeth,
   *  briar cage bars, ramfort keel plate, drake snout. Each kind
   *  interprets it as ITS structural second metal — never a tint. */
  jaw?: string;
  /** Wizard hats: a band buckle / star charm on the crown. */
  charm?: string;
  /** Hoods: a lumpy fur ruff ringing the face opening. */
  ruff?: { color: string };
  /** Hoods: pricked ear points on the crown. `tall` is the hare read
   *  (long upright blades); `tip` paints the top third — black-tipped
   *  hare and fox ears both. */
  ears?: { color: string; tall?: boolean; tip?: string };
  /** Hoods: a swept feather tucked at the temple, trailing back. */
  feather?: { color: string };
  /** Hoods: a half-mask across the lower face — the rogue read.
   *  Warmask: the sculpted face-plate metal behind the bronze work. */
  mask?: string;
  /** Hoods: two bold curled moth feelers off the crown, clubbed tips. */
  antennae?: { color: string };
  /** Hoods: branched ivory antlers — the forest-king crown. */
  antlers?: { color: string };
  /** Hoods/domes: a cut gem set at the brow band. */
  gem?: { color: string };
  /** A floating ring above the crown that never quite touches down. */
  halo?: { color: string };
  /** Hoods: bell-flowers tucked at the temple, open and hanging —
   *  the moonbell picked and worn. */
  blooms?: { color: string };
  /** Hoods: two dry fangs at the mouth of the face opening — the
   *  adder's own, pointed down. */
  fangs?: { color: string };
  /** Three slivers of night glass floating above the crown, each on
   *  its own slow bob — the rift's answer to a halo. */
  shards?: { color: string };
  /** Circlets: icicle points hanging from the brow band — a crown the
   *  cold made and never asked back. */
  icicles?: { color: string };
  /** Hoods: two light-ribbon tails streaming off the crown's trailing
   *  edge, waving on the sky's clock — the skydancer's wake. */
  streamers?: { colors: [string, string] };
  /** A thin ring round the crown with two small worlds circling it,
   *  near side bright and large, far side dim and small — a working
   *  orrery worn as a diadem. It keeps perfect time. */
  orbitals?: { color: string; ring?: string };
  /** Hoods: two coals burning in the opening's shadow, pulsing on a
   *  slow breath — front only; the back keeps its secret. On the
   *  fire-hearted forged shells (furnace, wyrm) the same word is the
   *  heat inside the helm: grate glow, nostril vents, eye slits. */
  emberEyes?: { color: string };
  /** A swept crest of three feathers off the crown, trailing back
   *  and fluttering at the tips — the hawk's wake. Painted before
   *  the shell so the roots tuck under. */
  crestfeathers?: { colors: [string, string] };
  /** Fireflies circling the crown on their own wandering loops,
   *  blinking — the forest keeps its king company. */
  fireflies?: { color: string };
  /** Tempest shells: a storm arc snapping between the crown points on
   *  its own beat, and the charge glow that never quite leaves. */
  arcs?: { color: string };
  /** A star glint winking off the crown on its own beat — the same
   *  polished-past-vanity law the body's gleam keeps. */
  gleam?: { color: string };
  /** THE STANDARD: a slim pole rising off the crown flying a small
   *  square banner that ripples on the march wind's clock — the
   *  king's colors carried on the helm itself. The kingsmane word. */
  standard?: { pole: string; banner: string; trim?: string };
  /** THE BONE MASK: a carved death-mask riding the armet's face in
   *  place of its wedge visor — brow ridge, cheek arcs, a nasal keel,
   *  the eye pits left dark for whatever looks out. Consumed by the
   *  armet shell as ITS face when present. The jadeskull word. */
  boneMask?: { color: string };
  /** THE BONE CROWN: a row of forward-hooked fangs riding the crown
   *  centerline on a gilt seam — a trophy jaw worn as a comb, teeth
   *  where the spike crown keeps nails. The jadeskull word. */
  boneCrown?: { color: string; seam: string };
  /** THE TRANSVERSE CREST: the legion officer's brush worn ear to
   *  ear — full span frontal where the fore-aft crest shows its
   *  blade, striped in the two colors. The redmarch word. */
  transverse?: { colors: [string, string] };
  /** THE AUREOLE: a fan of gilt rays standing behind the crown,
   *  breathing on a slow clock, tallest at the peak — dawn worn as
   *  a halo's older sister. Painted before the shell so the rays
   *  stand BEHIND the cloth. The sunhallow word. */
  aureole?: { color: string };
  /** Iron tines rising off the crown band, each guttering a hot
   *  flame that re-shapes every beat — the coldfire idiom run hot,
   *  worn as a crown. The flamewrought word. */
  flamecrown?: { tine: string; flame: string };
  /** Three angular rune glyphs orbiting the crown on the fake-3D
   *  depth law — the far side painted before the shell so the hood
   *  occludes it honestly, the near side riding above. None of them
   *  repeats. The aetherion word. */
  glyphs?: { color: string };
  /** THE VIGIL: the warcrown's own fire — the brow gem and the eye
   *  cuts burn with a pilot glow that never dies, surging when the
   *  procession's rotation reaches the helm (the third station after
   *  the two shoulder banners). The oathgold word. */
  vigil?: { color: string };
  /** THE KEYSTONE: the gatehelm's missing capstone — the broken arch
   *  over the crown never meets, and the stone that should close it
   *  hangs in the gap, point down, riding its own slow bob. The gap
   *  beneath it bleeds otherlight, surging when the breach rotation
   *  reaches the helm (the fourth station, after both shoulders and
   *  the chest). `glass` is the stone's night-glass body; `color` is
   *  the light that will not let it fall. The gatefall word. */
  keystone?: { color: string; glass: string };
  /** Thistlehat: THE BLOOM — a real thistle head crowning the
   *  dropped tip: green calyx bulb under a brush of soft down,
   *  nodding on the breeze; at the gust it lets ONE seed go to
   *  ride the wind past the brim. The starter's jewel is alive. */
  bloom?: { calyx: string; down: string; seed: string };
  /** Dawnhood: THE DAYBREAK — the sun at the brow, and it MOVES. On
   *  a slow shared clock the disc climbs out of the brow-band
   *  horizon, its rays reach, and first light washes the wearer's
   *  face from below. Each lot is its own sky: `rising` (default)
   *  runs the dawn, `setting` runs it backward for the vow to the
   *  other horizon, `noon` stands the full disc high and white-hot
   *  with a heat shimmer, `eclipse` hangs the dark disc in its gold
   *  `ring` with corona spikes and a rare ring flare. */
  sundisc?: {
    color: string;
    phase?: 'rising' | 'setting' | 'noon' | 'eclipse';
    ring?: string;
  };
  /** Wealdcowl: the living green — the vine that seams the leading
   *  flank, the leaf it breaks into, and the growth light riding the
   *  fiddlehead's tip on THE FENLIGHT clock. It swells, it gutters;
   *  it never goes out. */
  verdance?: { vine: string; leaf: string; glow: string };
  /** Bloomcrown: the orchid's keeping — the heart burning between
   *  the standards as the crown breathes open, dew at the fall
   *  tips, and pale petal `tails` streaming off the back (MUST
   *  contrast the plum, per the species-tails law). */
  bloomheart?: { color: string; dew: string; tails?: string };
  /** Sedgehat: the darter — a dragonfly settled at the crown's foot,
   *  wings folded back along the body, shivering awake once a cycle. */
  darter?: { body: string; wing: string };
  /** Heroncowl: the folded plume crest lapped down the swept peak,
   *  dark-tipped, each vane riding its own slow air. */
  plumecrest?: { color: string; tip: string };
  /** Shroudcowl: THE STORM-EYE — the gold boss at the brow, the one
   *  forged thing on all that weather. */
  stormeye?: { color: string };
  /** Shroudcowl: THE SHROUD — the orbiting fog puffs and the charge
   *  `ember` that lights them from within on the strike. */
  cloudwreath?: { color: string; ember: string };
  /** Anvilcrown: the forked jewel hung off the anvil's spill on its
   *  chain, and the gold charge `seam` burning under the lip. */
  boltjewel?: { color: string; seam?: string };
  /** Showerhat: the luck — the gilt `sun` boss at the band's leading
   *  side and the rain-`bead` drip ring off the brim. */
  showerluck?: { sun: string; bead: string };
  /** Showerhat: the prism arc off the trailing brim — the rainbow
   *  only this weather owns, waking with the charge. */
  prismarc?: { colors: string[] };
  /** Coronacowl: THE CORONA — the zenith's crown of drawn rays at
   *  the peak, asleep to a frost seed through the quiet arc and
   *  erupting on the substorm; `star` is the pricks in the cloth. */
  corona?: { colors: string[]; star: string };
  /** Tidehat: the pearl hat band — one glimmer walks it, and the
   *  whole strand catches the light when the wave breaks. */
  pearls?: { color: string };
  /** Depthcrown: THE DEEP LURE — the angler stalk arcing off the
   *  crown to hang its caged lamp before the brow, breathing on
   *  the tide; the deep's one lamp. */
  deeplure?: { stalk: string; glow: string };
  /** Depthcrown: bioluminescent freckles on the cowl cloth, waking
   *  in a wave that travels the dome — the deep keeps count. */
  lumefreckles?: { color: string };
  /** Depthcrown: jelly-bell lappets trailing at the jaw, scallop
   *  hems, swaying — hung things trail. */
  jellyveil?: { color: string };
  /** Depthcrown: THE BELL CROWN — the medusa worn as the crown:
   *  scalloped bell over the cowl, organ glow inside, rim light
   *  breathing on the tide and flaring at the break. */
  bellcrown?: { bell: string; lume: string };
  /** Murkcowl: THE RIPSEAM — the one drawn current woven down the
   *  seam of the cowl's depth bands: deep `water` casing under the
   *  cold `neon` core, its beads sinking with the flow. The murk's
   *  only light — carried by the water, never a glow. */
  ripseam?: { water: string; neon: string };
  /** Murkcowl: THE DROWNLINE — the waterline lying across the
   *  veiled face, seen from below; it rises with the swell, past
   *  the eyes at the stand, and lets its bubbles go at the break.
   *  The wearer is under the water. The water does the looking. */
  drownline?: { color: string };
  /** Maelcowl: the spiral the cloth was wound on — churn seams
   *  sweeping the dome, slowly turning, foam at each leading tip. */
  spiralwrap?: { color: string };
  /** Maelcowl: spume — the flecks the streamer tears off at the
   *  break. */
  spume?: { color: string };
  /** Hushcowl: THE RIFT LIGHT — the void's three values worn at the
   *  head: plasma casing and pale core on every torn edge, and the
   *  true void behind them (darker than any cloth on the garment).
   *  Feeds the severed peak's rims, the shell tear, and the
   *  wandering light in the doorway dark. */
  riftlight?: { casing: string; core: string; void: string };
  /** Oathcowl: THE OATH COAL — the one sworn ember, set in an iron
   *  shrine at the brow. It has never once gone out. Breathes with
   *  the drawn breath; at the flare it remembers, and lets go one
   *  rising spark. */
  oathcoal?: { iron: string; coal: string; ember: string };
  /** Oathcowl: the fissures in the char — drawn cracks carrying the
   *  ember crawl through the cloth (FIRE LIVES IN THE CRACK). */
  crackseams?: { casing: string; ember: string };
  /** Stardiadem: star points rising off the woven band, center
   *  tallest. */
  starpoints?: { color: string };
  /** Stardiadem: the halo rebuilt as a turning ring of small stars on
   *  the fake-3D depth law — near bright and large, far dim and
   *  small. Replaces the plain halo for the one set that owns it. */
  starring?: { color: string };
  /** Hedgehat: the herb sprig tucked in the woven cord band. */
  sprig?: { color: string };
  /** Courierhood: the waybill — a parchment ribbon pinned at the
   *  temple by a wax seal, streaming off the trailing edge. */
  waybill?: { color: string; seal: string };
  /** Sharkmaw/marlincrest: the crest colors — sharkmaw reads `color`
   *  as its belly-pale and `flash` as the tooth ivory; marlincrest
   *  reads `color` as sail membrane and `flash` as the bill/spine
   *  counter-metal. */
  divecrest?: { color: string; flash: string };
  /** Anglerhood: the rod-and-lure — a thin spine curving off the
   *  crown, dangling a warm lure bead before the brow. It breathes
   *  on a slow clock; the face below stays void. THE LURE IS
   *  ALWAYS WARM — bait must contrast the water. */
  lure?: { color: string };
  /** Guildcowl: the guild's one vanity — a brass bead at the very
   *  tip of the master's beak peak, glinting rarely. */
  coinpin?: { color: string };
  /** Latchhood: THE LATCH — iron brow band with a punched keyhole,
   *  jaw wrap, and three skeleton keys at the trailing jaw. */
  latch?: { band: string; keys: string; wrap: string };
  /** Veilwrap: the cold light breathing inside the veil's one slit.
   *  Not eyes — a place where eyes refuse to be. */
  slitglow?: { color: string };
  /** Gripmask: THE MASTER'S GRIP — the guild's red right hand
   *  clamped over a faceless visor void: `hand` the print, `dark`
   *  its shadowed underside, `ember` the two points of light that
   *  blink between the fingers on the rare clock. */
  grip?: { hand: string; dark: string; ember: string };
  /** Drake: the slain drake's skull — `horn` the bone of the trailing
   *  horn pair and the fangs, `ember` the banked fire in the crest
   *  roots and the watching eyes, `maw` the furnace-dark void inside
   *  the bite. */
  drakeset?: { horn: string; ember: string; maw: string };
  /** Foxmantle / wolfmantle: the worn pelt's own colors — the beast's
   *  coat, its dark points (nose, sockets, ear backs), its pale
   *  flashes (cheeks, fangs, frost tips); `ember` wakes the fox's
   *  bead eyes on a slow clock. Each kind reads the fields its own
   *  way — the emberEyes precedent. */
  pelt?: { color: string; dark: string; pale: string; ember?: string };
  /** Shadowcowl: the ONE BRIGHT EDGE — a dusk-violet arris light down
   *  the cowl's leading fold; everything else stays night. */
  edgelight?: { color: string };
  /** Wolfmantle: a slow pale breath curling from under the muzzle
   *  every few seconds — the winter worn honestly. */
  frostbreath?: { color: string };
  /** Stagcrown: the moss band ringing the hood below the antler
   *  roots, tufts spilling where it ties. */
  mossband?: { color: string };
  /** Mothcowl: THE MOTH'S OWN EYES — two large luminous compound
   *  discs set on the cowl above the face opening, faceted, glowing
   *  on a breath slower than anything human. The wearer's face keeps
   *  the dark below them; the moth does the looking. */
  motheyes?: { color: string };
}

export interface LegStyle {
  /**
   * THE WORN LIGHT: the working bonded to this piece, overlaid onto the
   * resolved style rather than authored into it (see wornLight.ts). A
   * def never sets this; the rig does, per instance.
   */
  arx?: ArxMark;
  kind: 'pants' | 'greaves' | 'wraps';
  /** Default: today's pants-color law (look pants / darkened body). */
  thigh?: string;
  shin?: string;
  knee?: 'none' | 'plate' | 'wrap';
  kneeColor?: string;

  // THE HUNTER'S LEGS — the leather lane's one-owner leg words. Ten
  // families stood on four flat colors for too long; each of these is
  // named by exactly one family and painted in rig.ts's leg pass.

  /** Hareswift: hare-fur hocks — a pale fur tuft off the back of each
   *  ankle, the spring made visible. */
  hock?: { color: string };
  /** Kingfisher: waxed waders — a hard waterline break high on the
   *  shin with one lit rim where the wax catches. */
  wader?: { color: string; rim: string };
  /** Kingfisher: a small swept fin blade off each outer calf —
   *  sharp, back-raked, bright-edged. */
  calffin?: { color: string; edge: string };
  /** Cutpurse: the tool roll strapped flat to the lead thigh, pick
   *  ends ticking out of it. */
  pickroll?: { color: string; glint?: string };
  /** Moonless: wound shin bands — the veil's language carried to
   *  the ground; the loose tie dresses leg 0 only. */
  shadewrap?: { color: string; tie?: string };
  /** Redhand: the Knife's spare, flat to the outer thigh. Muted
   *  register — no glint lives at the leg. */
  thighsheath?: { sheath: string; pommel: string };
  /** Trapline: snare-cord X-lacing climbing the shin. */
  shinlace?: { color: string };
  /** Emberfox: the fox's own socks — a hard dark break at mid-shin,
   *  tied off with an ember knot. */
  sock?: { color: string; tie?: string };
  /** Wayfarer: a stitched road patch on the lead thigh. */
  roadpatch?: { color: string };
  /** Wolfstalker: winter fur bursting over the knee. */
  furknee?: { color: string };
  /** Nightveil: the thigh garter with its sheathed throwing blade. */
  garter?: { color: string; blade?: string };
  /** Drakescale: lapped scale scallops down the thigh, tempered
   *  edges. */
  scalerows?: { plate: string };
  /** Stagheart: moss-bound wrap bands with tufts spilling at the
   *  knee. */
  mossbind?: { color: string; tuft: string };
}

export interface BootStyle {
  /**
   * THE WORN LIGHT: the working bonded to this piece, overlaid onto the
   * resolved style rather than authored into it (see wornLight.ts). A
   * def never sets this; the rig does, per instance.
   */
  arx?: ArxMark;
  color: string;
  /** Shaft height up the shin, tiles. 0.06 ≈ the bare foot chip. */
  height: number;
  cuff?: { color: string };
  /** Metal toe cap color (sabatons). */
  toe?: string;
  /** A short spike off the shaft top — dread sabatons. */
  spike?: boolean;
  /** Crossed straps climbing the shaft — the scout's lacing. */
  wrap?: { color: string };
  /** A lumpy fur top instead of a clean cuff — winter boots. */
  fur?: { color: string };
  /** A curled slipper toe — the wizard's footnote. */
  curl?: boolean;
}

/**
 * Gloves dress BOTH solved arms as one armor unit: the hand (in one of
 * four silhouette molds), the FULL forearm from elbow to wrist (skin
 * never shows on a gloved arm), and a cuff at the elbow seam where the
 * glove flows into the sleeve. Devices (spikes, talons, studs, gems)
 * ride the hand. Robed sleeves win the forearm: under a belled cuff a
 * glove keeps only its hand and knuckle device — the sleeve is a tube
 * the hand lives in.
 */
export interface GloveStyle {
  /**
   * THE WORN LIGHT: the working bonded to this piece, overlaid onto the
   * resolved style rather than authored into it (see wornLight.ts). A
   * def never sets this; the rig does, per instance.
   */
  arx?: ArxMark;
  /** The hand itself. */
  color: string;
  /** Hand silhouette: gauntlet = squared plated fist with a hard end
   * cap, glove = fitted taper with a finger seam, wrap = taper crossed
   * by binding strips, paw = round beast mitt with toe splits. */
  hand?: 'glove' | 'gauntlet' | 'wrap' | 'paw';
  /** Forearm color, elbow to wrist. Absent = shade(color, −8). */
  bracer?: string;
  /** The elbow-seam treatment where glove meets sleeve. */
  cuff?: {
    color: string;
    /** band = buckled strap, flare = forged vambrace mouth, fur = pelt
     * roll, roll = folded-over top. */
    kind: 'band' | 'flare' | 'fur' | 'roll';
  };
  /** Device on the back of the hand / past the knuckles. */
  knuckle?: {
    color: string;
    /** studs = riveted domes, spikes = forged punch spikes on a
     * knuckle bar, claws = curved talons, plate = beveled hand plate,
     * gem = a bezel-set jewel. */
    kind: 'studs' | 'spikes' | 'claws' | 'plate' | 'gem';
  };
  /** Fingertips stay bare — the thief's fingerless cut. */
  fingerless?: boolean;
}

export interface OffhandStyle {
  /**
   * THE WORN LIGHT: the working bonded to this piece, overlaid onto the
   * resolved style rather than authored into it (see wornLight.ts). A
   * def never sets this; the rig does, per instance.
   */
  arx?: ArxMark;
  /** 'weapon' = a dual-wielded blade: the rig paints the actual weapon. */
  kind: 'buckler' | 'kite' | 'tower' | 'tome' | 'quiver' | 'orb' | 'weapon';
  color: string;
  trim: string;
  boss?: string;
  spikes?: boolean;
  emblem?: 'chevron' | 'diamond';
}

// ------------------------------------------------------------- rosters

export const BODY_STYLES: Record<string, BodyStyle> = {
  apprentice_robe: {
    color: '#5a6ea0', trim: '#c9c4cf', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.34,
    sleeves: 'full', mantle: '#48587e', underskirt: '#3e4a6e',
    folds: true,
  },
  emberweave_robe: {
    color: '#c4553d', trim: '#e8a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem', emblem: 'bolt',
    skirt: 0.34, skirtSlit: true, glowTrim: '#ffb054',
    sleeves: 'full', mantle: '#8a3428', underskirt: '#7e2f24',
    motes: '#ffc26a', folds: true,
    stole: { color: '#8a3428', trim: '#e8a23c' }, emblemScale: 1.15,
  },
  leather_body: {
    color: '#b08a5c', trim: '#6b4a26', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
    pouch: true, yoke: { color: '#8a6a45', stitch: true }, lace: true,
    belt: true,
  },
  huntsman_jerkin: {
    color: '#3f6b3a', trim: '#2e4a28', metal: '#6b4a26', cls: 'leather',
    silhouette: 'brigandine', pauldron: 'layered', pauldronColor: '#5a3f1e',
    chest: 'straps', skirt: 0.12, collar: 'fur', pouch: true,
    lace: '#2e4a28', belt: { color: '#6b4a26', buckle: '#d8cfae' },
  },
  iron_platebody: {
    color: '#8d9299', trim: '#6a6f7d', metal: '#b0b6be', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', chest: 'plate', skirt: 0,
    collar: 'gorget', midline: true, rivetSeams: true,
  },
  steel_platebody: {
    color: '#b8bec8', trim: '#c9a23c', metal: '#d4dae2', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', chest: 'plate',
    emblem: 'diamond', skirt: 0, collar: 'gorget',
    midline: true, rivetSeams: true,
  },
  // The themed plate sets: one silhouette vocabulary, five color
  // stories. A new colorway is a spread + palette — never a painter.
  warden_platebody: {
    color: '#4a7a5a', trim: '#2e4a38', metal: '#87b294', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'bladed', pauldronColor: '#5a8a6a',
    pauldronTrim: '#d69a55', pauldronScale: 1.08, chest: 'plate',
    emblem: 'leaf', skirt: 0, collar: 'gorget',
  },
  frostplate_platebody: {
    color: '#9db6cc', trim: '#4a6a9c', metal: '#cfe0ee', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', pauldronTrim: '#e8f4ff',
    pauldronScale: 1.06, chest: 'plate', emblem: 'diamond', skirt: 0,
    collar: 'gorget',
  },
  bulwark_platebody: {
    color: '#5a6270', trim: '#b08a3c', metal: '#787f8e', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', pauldronColor: '#6a7280',
    pauldronTrim: '#b08a3c', pauldronScale: 1.08, chest: 'plate',
    skirt: 0, collar: 'gorget', tassets: true,
    tabard: { color: '#6e5a28', trim: '#b08a3c' }, emblem: 'diamond',
    emblemScale: 1.1,
  },
  dreadforge_platebody: {
    color: '#4a4553', trim: '#a83232', metal: '#625c6e', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'spiked', pauldronColor: '#3a3542',
    pauldronSpikes: 3, pauldronTrim: '#a83232', pauldronScale: 1.15,
    chest: 'plate', emblem: 'skull', skirt: 0, collar: 'gorget',
    tassets: true,
  },
  sunforged_platebody: {
    color: '#d4a43c', trim: '#f4e0a0', metal: '#e8c05c', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'bladed', pauldronColor: '#e0b04a',
    pauldronTrim: '#fff2c8', pauldronScale: 1.12, chest: 'plate',
    emblem: 'sun', skirt: 0, collar: 'gorget', tassets: true,
  },
  // The themed leather sets: fur, feathers, scales and antlers — the
  // skirmisher's wardrobe. Same colorway law as the plate sets.
  // The road: patched buckskin under a slung bedroll — the scout's
  // whole house on one strap.
  wayfarer_jerkin: {
    color: '#a8895a', trim: '#6b4a2e', metal: '#8a6a45', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'layered', pauldronColor: '#8a6a45',
    chest: 'straps', fringe: true, skirt: 0, pouch: true,
    yoke: { color: '#8a6a45', stitch: true }, belt: true,
    bedroll: { color: '#6a7a54', strap: '#6b4a2e' },
  },
  // The pack: winter guardhair shoulders, a claw tithe on the chest.
  wolfstalker_jerkin: {
    color: '#5f6470', trim: '#424652', metal: '#9aa0ae', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'guardhair', pauldronColor: '#8f96a6',
    pauldronTrim: '#dde2ea', pauldronScale: 1.14, chest: 'none',
    skirt: 0, collar: 'fur', collarColor: '#b8bec8', pouch: true,
    clawstrap: { strap: '#424652', claw: '#d8d2c0' },
    belt: { color: '#424652', buckle: '#9aa0ae' },
  },
  // The dark: knife baldric, drifting shadow tails, ink on ink.
  nightveil_jerkin: {
    color: '#3a3648', trim: '#7e6ba8', metal: '#8c4a5a', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'none', skirt: 0,
    pouch: true, yoke: { color: '#2e2a3c' }, sash: '#584a78',
    knifebaldric: { strap: '#262234', steel: '#7a7488', glint: '#b9a8e8' },
    shadowtails: { color: '#302c40' },
  },
  // The drake: the tailored hide — kite-scale flanks under a
  // tempered-copper belly plastron, the banked forge standing in
  // every plate gap and cracking through the waist keels, and the
  // drake's own wings folded matched on both shoulders. FIRE
  // dressed as patience.
  drakescale_body: {
    color: '#47201b', trim: '#b05c30', metal: '#e09048', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'drakewing', pauldronColor: '#6e2d26',
    pauldronTrim: '#e09048', pauldronScale: 1.16, chest: 'none',
    skirt: 0, drakerows: { hide: '#5f2a22', plate: '#b05c30', lit: '#e09048' },
    heatseam: { color: '#ff8848', core: '#ffc266' },
    belt: { color: '#2e1512', buckle: '#b05c30' },
  },
  // The forest king: moss-spilled bark mantle, oak-leaf shoulders,
  // gold leaves falling that no tree shed.
  stagheart_jerkin: {
    color: '#6b5138', trim: '#d4a43c', metal: '#3e5a30', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'oakspaul', pauldronColor: '#7a5c3e',
    pauldronTrim: '#d4a43c', pauldronScale: 1.14, chest: 'none',
    fringe: true, skirt: 0.14, pouch: true,
    mossmantle: { bark: '#5a4430', moss: '#6e8a4a' },
    leaffall: { color: '#d4a43c' },
    belt: { color: '#4a3826', buckle: '#d4a43c' },
  },
  // The themed cloth sets: sashes, hem runes, orbs and halos — the
  // caster's wardrobe. Same colorway law as plate and leather.
  hedgemage_robe: {
    color: '#5a6b3a', trim: '#c9a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'stitch', skirt: 0.32,
    sash: '#c9a23c', sleeves: 'full', underskirt: '#42502c', pouch: true,
    folds: true, capelet: { color: '#42502c', hem: 'point', trim: '#c9a23c' },
    herbgirdle: { cord: '#c9a23c', leaf: '#7a9a4a' },
  },
  tidecaller_robe: {
    color: '#2f6a78', trim: '#bfe8e0', cls: 'cloth',
    silhouette: 'robe', pauldron: 'tideorbs', pauldronColor: '#2a5f6c',
    pauldronTrim: '#bfe8e0', pauldronScale: 1.15, chest: 'none',
    skirt: 0.34, sleeves: 'full',
    underskirt: '#1f4a55', folds: true,
    capelet: { color: '#245663', hem: 'scallop', trim: '#bfe8e0' },
    foamtiers: { color: '#3a7d8c' }, pearlstrand: { color: '#e8e2d4' },
    streamwrap: { color: '#1f4a55', foam: '#dff4ef' },
    tidemoon: { color: '#e8e2d4' },
  },
  voidwhisper_robe: {
    // THE VOID WHISPER: near-dark ink violet. Three values — the ink,
    // the pale lavender worn only as lit rims, and the plasma pair on
    // the torn edges over true void (the absence law). Nothing on
    // this robe travels; it arrives.
    color: '#2a2140', trim: '#b8a8d8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'sunderpaul', pauldronColor: '#251d38',
    pauldronTrim: '#6a5a8c', pauldronScale: 1.15, chest: 'none',
    skirt: 0.34, sash: '#1a1428', sleeves: 'full', mantle: '#221a34',
    underskirt: '#1d1730', folds: true,
    voidrift: { casing: '#7a3df0', core: '#e8dcff', void: '#0a0714' },
    winkmotes: { color: '#e8dcff' },
    sunderhem: { color: '#241d36' },
  },
  cindersworn_robe: {
    // THE CINDER OATH: near-black char; the fire shows only in the
    // cracks. Three values — char, smoked bronze, the ember pair —
    // and no word wears its own light (the crack law).
    color: '#251a16', trim: '#d96a2c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'brazierpaul', pauldronColor: '#291c17',
    pauldronTrim: '#7a5a44', chest: 'none', skirt: 0.34,
    sash: '#4a1d14', sleeves: 'full', mantle: '#1b1310',
    underskirt: '#160f0c', folds: true,
    emberveins: { casing: '#c83a1a', ember: '#ffb054' },
    cinderveils: { colors: ['#2c1e18', '#261a15', '#1f1511', '#180f0b'] },
    ashhem: { char: '#180f0b', ember: '#ffb054' },
  },
  starweaver_robe: {
    color: '#2c3260', trim: '#c8cee8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'orbs', pauldronColor: '#9db6ff',
    chest: 'emblem', emblem: 'star', skirt: 0.36, runes: '#c8cee8',
    sleeves: 'full', mantle: '#232850', underskirt: '#1e2244',
    motes: '#aebeff', folds: true, constellation: { color: '#c8cee8' },
  },
  // The early-game cloth sets: five color stories for the leveling
  // road. Each ships in four dye lots via registerColorways below.
  thistledown_robe: {
    // THE FIRST WIND: the starter mage's robe — oat linen tailored,
    // embroidered, and sashed; never patchwork. The living word is
    // THE DRIFT: loosed seeds riding one wind past the hem.
    color: '#c9bfa3', trim: '#8a7a5c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'downpaul', pauldronColor: '#c2b697',
    pauldronTrim: '#8a7a5c', pauldronScale: 1.12, chest: 'none',
    skirt: 0.32, sleeves: 'full', underskirt: '#b0a688', folds: true,
    yoke: { color: '#bdb190' },
    broidery: { thread: '#7a6a4e', sprig: '#6e8a4a' },
    sashcord: { color: '#9a8458', tassel: '#efe7d2' },
    hemcourse: { colors: ['#bcb090', '#a89a7c'] },
    driftdown: { seed: '#f4eeda' },
  },
  mothwing_robe: {
    color: '#8a8a72', trim: '#d8d4b8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'mothpile', pauldronColor: '#8f8f76',
    pauldronTrim: '#e2ddc2', pauldronScale: 1.15, chest: 'none',
    skirt: 0.32, sleeves: 'full', underskirt: '#6e6e5a', motes: '#d8d4b8',
    folds: true, collar: 'fur', collarColor: '#c8c4a4',
    wingdrape: { color: '#6e6e58', spot: '#d8d4b8' },
  },
  dawnsworn_robe: {
    color: '#d9c9a0', trim: '#c9922f', cls: 'cloth',
    silhouette: 'robe', pauldron: 'dawncrest', pauldronColor: '#cbbb92',
    pauldronTrim: '#e8b54a', pauldronScale: 1.12,
    chest: 'emblem', emblem: 'sun',
    skirt: 0.32, sash: '#b0703c', sleeves: 'full', underskirt: '#b8a87e',
    folds: true, stole: { color: '#c9922f', trim: '#d9c9a0' },
    dawnbands: { colors: ['#e8b54a', '#c9764a', '#8a5a6e'] },
    raycollar: { color: '#e8b54a' }, sunmedals: { color: '#e8b54a' },
    emblemScale: 1.1,
  },
  // THE FEN COURT: the fen's own regalia — a waterline at the hem,
  // three wisps in slow court around it, a reed girdle at the waist
  // and a caged light at each shoulder. No borrowed runes, no stock
  // emblem: the fen speaks its own words or none.
  fenwalker_robe: {
    color: '#3a5648', trim: '#b8d0a8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'boughmantle', pauldronColor: '#35503f',
    pauldronTrim: '#b8d0a8', pauldronScale: 1.12, chest: 'none',
    skirt: 0.34, sleeves: 'full', underskirt: '#2c443a', folds: true,
    capelet: { color: '#334e42', hem: 'point', trim: '#7a9a5c' },
    mirehem: { water: '#22362e', ripple: '#9ae8c8', reed: '#2c443a' },
    wispcourt: { color: '#9ae8c8' },
    reedgirdle: { cord: '#8a9a6c', charm: '#d8e8b0' },
  },
  // THE STORM COURT: the sky's own regalia — the front banked on
  // the chest, the bolt branded on the skirt, charge beads keeping
  // the count at the waist, rain that never lands, and ONE shared
  // strike across every piece. No borrowed runes, no stock emblem:
  // the storm speaks its own words or none.
  stormwoven_robe: {
    color: '#4e5a78', trim: '#e8d878', cls: 'cloth',
    silhouette: 'robe', pauldron: 'cloudbank', pauldronColor: '#5a678a',
    pauldronTrim: '#e8d878', pauldronScale: 1.14, chest: 'none',
    skirt: 0.34, sleeves: 'full', mantle: '#3e4860',
    underskirt: '#3c4660', folds: true,
    stormshroud: { color: '#93a2c2' },
    thunderbank: { color: '#46536e', glow: '#e8d878' },
    boltbrand: { color: '#e8d878' },
    rainhem: { color: '#a8c4e8' },
    staticcourt: { color: '#e8d878' },
    chargebeads: { cord: '#3e4860', bead: '#e8d878' },
  },
  // The early-game leather sets: the skirmisher's leveling road. Each
  // ships in four dye lots via registerColorways below.
  // THE UNCATCHABLE: wind-torn mantle over a buckled courier
  // harness, wind-cut hem tabs, a hare's foot for luck — and the
  // slipstream that only exists at a run. The set the most players
  // will ever wear, built like it knows that.
  hareswift_jerkin: {
    color: '#c2a878', trim: '#8a6f48', metal: '#6e5638', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'none', skirt: 0,
    windmantle: { color: '#b09a68', under: '#7a6240', lining: '#ece4d0' },
    windtabs: { color: '#8a6f48' },
    luckcharm: { foot: '#cfc0a0', cord: '#6e5638' },
    slipstream: { color: '#ece4d0' },
    belt: { color: '#6e5638', buckle: '#c9a23c' },
    satchel: { color: '#8a6f48', strap: '#6e5638' },
    streamers: { color: '#b84a32' },
  },
  // THE RIVERKING'S FISHER: fish-leather worn whole — deep-water
  // scalecoat under a sailfin shoulder, hookline tackle across the
  // chest, the lure the one warm thing in all that cold. The
  // secret-boss set of the leather lane; it should read like nobody
  // was ever supposed to own it.
  kingfisher_jerkin: {
    color: '#1e404c', trim: '#cfe4e2', metal: '#26343c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'sharkfin', pauldronColor: '#1a3842',
    pauldronTrim: '#d8ecec', pauldronScale: 1.16, chest: 'none',
    skirt: 0,
    scalecoat: { color: '#24505e', edge: '#3e7484', sheen: '#cfe4e2' },
    hookline: { line: '#8a9a9e', hook: '#d8ecec', lure: '#ffb054' },
    belt: { color: '#26343c', buckle: '#cfe4e2' },
  },
  // The guild: umber under laced umber, and the ledger worn openly —
  // a tether of lifted coins with one traveling glint.
  cutpurse_jerkin: {
    color: '#4e4438', trim: '#c9a23c', metal: '#8a7a5c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'shadowdrape', pauldronColor: '#3e362c',
    pauldronTrim: '#c9a23c', pauldronScale: 1.14, chest: 'none', skirt: 0,
    yoke: { color: '#3e362c' }, lace: '#2e2820',
    belt: { color: '#2e2820', buckle: '#c9a23c' },
    cointether: { cord: '#2e2820', coin: '#c9a23c', glint: '#ffe9a8' },
    cutkit: { pouch: '#3a332c', blade: '#b8ae9a', coin: '#c9a23c', glint: '#ffe9a8' },
  },
  // The trapper: rawhide and quilt under the snareline — toggles,
  // wire coil, a swinging lure. Every loop earned.
  trapline_jerkin: {
    color: '#8a7248', trim: '#5a4a34', metal: '#d8cfae', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'fur', pauldronColor: '#b8a888',
    pauldronScale: 1.06, chest: 'none', skirt: 0, pouch: true,
    quilt: true, belt: { color: '#5a4a34', buckle: '#d8cfae' },
    snareline: { strap: '#5a4a34', bone: '#d8cfae', wire: '#9a8f78' },
  },
  // The showpiece: cream bib, fur collar, black socks — and the
  // brush tail smoldering at the tip. It knows exactly what it is.
  emberfox_jerkin: {
    color: '#b05a30', trim: '#e8dcc4', metal: '#3a3230', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'fur', pauldronColor: '#c9713c',
    pauldronScale: 1.05, chest: 'none', skirt: 0,
    collar: 'fur', collarColor: '#e8dcc4', foxbib: { color: '#e8dcc4' },
    tail: { color: '#b05a30', tip: '#e8dcc4', ember: '#ff9a3c' },
    belt: { color: '#7a3e20', buckle: '#3a3230' },
  },
  // The early-game plate sets: the knight's leveling road. Each ships
  // in four lots via registerColorways below — craft lots are the same
  // silhouette RE-FORGED from another bar, and some lots change the
  // structure itself (extra spikes, wings for fins), never just hue.
  tuskguard_platebody: {
    color: '#a4744b', trim: '#6e4a30', metal: '#c9955c', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', pauldronColor: '#b5854f',
    pauldronTrim: '#d9a86a', pauldronScale: 1.05, chest: 'plate',
    skirt: 0, collar: 'gorget', rivetSeams: true,
  },
  valiant_platebody: {
    color: '#c9ccd4', trim: '#c9a23c', metal: '#e2e6ec', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', pauldronColor: '#d4d8e0',
    pauldronTrim: '#e8c04c', chest: 'plate', emblem: 'chevron', skirt: 0,
    collar: 'gorget', tabard: { color: '#a83240', trim: '#e8c04c' },
    emblemScale: 1.1,
  },
  ramwall_platebody: {
    color: '#6a7080', trim: '#4a4f5c', metal: '#8a92a4', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', pauldronColor: '#7a8294',
    pauldronTrim: '#9aa4b8', pauldronScale: 1.08, chest: 'plate',
    ridges: true, skirt: 0, collar: 'gorget', tassets: true,
    rivetSeams: true,
  },
  briarplate_platebody: {
    color: '#3e4a38', trim: '#8a9a6e', metal: '#6a7a58', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'spiked', pauldronColor: '#33402e',
    pauldronSpikes: 2, pauldronTrim: '#8a9a6e', pauldronScale: 1.12,
    chest: 'plate', skirt: 0, tassets: true, midline: true,
  },
  sentinel_platebody: {
    color: '#55607a', trim: '#d4c28a', metal: '#707c9a', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'bladed', pauldronColor: '#606c88',
    pauldronTrim: '#d4c28a', pauldronScale: 1.12, chest: 'plate',
    ridges: true, skirt: 0, collar: 'gorget', tassets: true,
  },
  // The named wardrobe: six chase sets with owners. Every record here
  // is a full outfit story — the vocabulary earns its keep.
  moonbell_robe: {
    color: '#545a86', trim: '#cdd6f0', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'none', skirt: 0.34,
    sleeves: 'full', folds: true, underskirt: '#434871',
    capelet: { color: '#464b74', hem: 'scallop', trim: '#cdd6f0' },
    sash: '#3a3f63', charms: { color: '#cdd6f0' }, motes: '#bfd0ff',
  },
  riftweave_robe: {
    color: '#2b2438', trim: '#f2ecff', cls: 'cloth',
    silhouette: 'robe', pauldron: 'shards', pauldronColor: '#3a3050',
    pauldronTrim: '#f2ecff', chest: 'none', skirt: 0.36, skirtSlit: true,
    sleeves: 'full', folds: true, underskirt: '#221c2e',
    mantle: '#241e30', runes: '#8a6ad8', glowTrim: '#f2ecff',
    motes: '#cdc4ec',
  },
  adderfang_jerkin: {
    color: '#74683c', trim: '#4c5a30', metal: '#d8a03c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'layered', pauldronColor: '#655a34',
    pauldronTrim: '#d8a03c', chest: 'diamondhide',
    bandolier: '#584d2c', belt: { color: '#4c4126', buckle: '#d8a03c' },
    skirt: 0, pouch: true,
  },
  broodsilk_jerkin: {
    color: '#2c2a34', trim: '#e8e6f0', metal: '#9a96a8', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'round', pauldronColor: '#38353f',
    pauldronTrim: '#e8e6f0', chest: 'none', cords: { color: '#e8e6f0' },
    collar: 'fur', belt: { color: '#232028', buckle: '#9a96a8' },
    skirt: 0, pouch: true,
  },
  aurochs_platebody: {
    color: '#4a3f36', trim: '#b8925c', metal: '#6e5c4c', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'round', pauldronColor: '#564a3e',
    pauldronTrim: '#b8925c', pauldronScale: 1.18, chest: 'plate',
    emblem: 'bullhead',
    emblemScale: 1.15, midline: true, rivetSeams: true, tassets: true,
    skirt: 0, collar: 'gorget',
  },
  barrowking_platebody: {
    color: '#3a4038', trim: '#c9b25c', metal: '#565e52', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', pauldronColor: '#434a40',
    pauldronTrim: '#c9b25c', pauldronScale: 1.12, chest: 'plate',
    ribs: { color: '#ded6b8' },
    rivetSeams: true, tassets: true, skirt: 0, collar: 'gorget',
  },
  // The legendary cloth road: four vestments spread down the leveling
  // bands, each with a signature that MOVES. Drop-only, one lot each.
  wintercourt_robe: {
    color: '#3a5a74', trim: '#dcf0fc', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'none', skirt: 0.34,
    sleeves: 'full', folds: true, underskirt: '#2e4a60',
    capelet: { color: '#4a7290', hem: 'scallop', trim: '#dcf0fc' },
    icefringe: { color: '#e8f6ff' }, runes: '#9ad4f0',
    motes: '#d8f0ff', sash: '#2e4a60', charms: { color: '#dcf0fc' },
  },
  vigil_robe: {
    color: '#e0d6bc', trim: '#c9922f', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'emblem',
    emblem: 'flame', emblemScale: 1.2, skirt: 0.34, sleeves: 'full',
    folds: true, underskirt: '#c2b696',
    stole: { color: '#b8862e', trim: '#ffe6b0' },
    beads: { color: '#c9a23c' }, glowTrim: '#ffd88a', motes: '#ffe0b0',
  },
  skydancer_robe: {
    color: '#33465e', trim: '#8ae8c0', cls: 'cloth',
    silhouette: 'robe', pauldron: 'none', chest: 'none', skirt: 0.36,
    skirtSlit: true, sleeves: 'full', folds: true, underskirt: '#283a4e',
    sash: '#203042', ribbons: { colors: ['#8ae8c0', '#b08ae8'] },
    runes: '#8ae8c0', motes: '#a8ecd8',
  },
  orrery_robe: {
    color: '#262e4e', trim: '#c9a23c', cls: 'cloth',
    silhouette: 'robe', pauldron: 'orbs', pauldronColor: '#e0b054',
    chest: 'emblem', emblem: 'orrery', emblemScale: 1.3, skirt: 0.34,
    sleeves: 'full', folds: true, underskirt: '#1e2540',
    mantle: '#1e2540', runes: '#c9a23c', motes: '#e8c878',
  },
  // THE GRAND ARCANUM: the cloth high road — six chase vestments
  // climbing the plate lane's own rungs, each under the high-road
  // law: big curated silhouettes, and a signature that MOVES.
  sunhallow_robe: {
    color: '#ece6d8', trim: '#d4a843', cls: 'cloth',
    silhouette: 'robe', pauldron: 'sunfan', pauldronColor: '#f0b040',
    pauldronTrim: '#ffe9b0', pauldronScale: 1.18,
    chest: 'emblem', emblem: 'sun', emblemScale: 1.2, skirt: 0.36,
    sleeves: 'full', folds: true, underskirt: '#8a3030',
    mantle: '#ded4bc', stole: { color: '#efe8d8', trim: '#d4a843' },
    beads: { color: '#7ec8e8' }, runes: '#ffdf9a', motes: '#ffe9b0',
  },
  stormsinger_robe: {
    color: '#2c3a6e', trim: '#ccd4e8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'stormspire', pauldronColor: '#5578ac',
    pauldronTrim: '#8ae8ff', pauldronScale: 1.18, chest: 'emblem',
    emblem: 'bolt', emblemScale: 1.2, skirt: 0.36, skirtSlit: true,
    sleeves: 'full', folds: true, underskirt: '#1c2547',
    mantle: '#232e58',
    capelet: { color: '#232e58', hem: 'dag', trim: '#66d8f0' },
    sash: '#1c2547', runes: '#66d8f0', stormorbs: { color: '#66d8f0' },
  },
  gloamsight_robe: {
    color: '#4e5636', trim: '#b09346', cls: 'cloth',
    silhouette: 'robe', pauldron: 'veilwing', pauldronColor: '#8a7436',
    pauldronTrim: '#e8cc7a', pauldronScale: 1.16, chest: 'none',
    skirt: 0.36, sleeves: 'full', folds: true, underskirt: '#3d4429',
    mantle: '#434a2e', sash: '#3d4429',
    sigilweave: { color: '#ffb054' },
  },
  flamewrought_robe: {
    color: '#ddd2b8', trim: '#3a2e2a', cls: 'cloth',
    silhouette: 'robe', pauldron: 'charbrand', pauldronColor: '#2e2422',
    pauldronTrim: '#ff7a3c', pauldronScale: 1.14, chest: 'none', skirt: 0.36,
    sleeves: 'full', folds: true, underskirt: '#352a24',
    belt: { color: '#3a2e2a', buckle: '#8a6a4a' },
    runestrips: { color: '#cfc2a2', rune: '#ff7a3c' },
    glowTrim: '#ff7a3c',
  },
  duskwarden_robe: {
    color: '#232838', trim: '#9a7a44', cls: 'cloth',
    silhouette: 'robe', pauldron: 'wardcrest', pauldronColor: '#1c2130',
    pauldronTrim: '#b8945c', pauldronScale: 1.16, chest: 'none', skirt: 0.36,
    skirtSlit: true, sleeves: 'full', folds: true,
    underskirt: '#1a1e2c',
    capelet: { color: '#1c2130', hem: 'dag', trim: '#9a7a44' },
    belt: { color: '#1c2130', buckle: '#9a7a44' }, pouch: true,
    gemwake: { color: '#d84052', metal: '#9a7a44' },
  },
  aetherion_robe: {
    color: '#2e2452', trim: '#d8dce8', cls: 'cloth',
    silhouette: 'robe', pauldron: 'aethercrest', pauldronColor: '#d8dce8',
    pauldronTrim: '#8ce0e8', pauldronScale: 1.16, chest: 'none', skirt: 0.38,
    skirtSlit: true, sleeves: 'full', folds: true,
    underskirt: '#1f1838', mantle: '#261e44',
    capelet: { color: '#261e44', hem: 'point', trim: '#8ce0e8' },
    sash: '#1f1838', runes: '#8ce0e8', motes: '#b8ecf0',
    glyphring: { color: '#8ce0e8' },
  },
  // The legendary leather road: four hunter and assassin kits spread
  // down the leveling bands, each with a signature that MOVES.
  // Drop-only, one lot each — the same law the cloth road keeps.
  hartsong_jerkin: {
    color: '#33472e', trim: '#d8b84c', metal: '#8a7a52', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'layered', pauldronColor: '#3e5434',
    pauldronTrim: '#d8b84c', chest: 'none', skirt: 0.14,
    yoke: { color: '#2a3b26', stitch: true },
    belt: { color: '#2a3b26', buckle: '#d8b84c' },
    charms: { color: '#e8e2d0' }, fireflies: { color: '#d8e88a' },
    pouch: true,
  },
  skytalon_harness: {
    color: '#46596e', trim: '#e8ddc0', metal: '#c9a23c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'straps', skirt: 0,
    plumage: { color: '#5a7086', tip: '#e8ddc0' },
    quiver: { color: '#6e5a3c', fletch: '#a8e8ff' },
    belt: { color: '#32404f', buckle: '#c9a23c' },
  },
  cindershade_jerkin: {
    color: '#332e2c', trim: '#8a4a30', metal: '#6e5a4c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'layered', pauldronColor: '#3e3634',
    pauldronTrim: '#8a4a30', chest: 'straps', skirt: 0.12,
    yoke: { color: '#2a2624' }, glowTrim: '#ff9a4a',
    underskirt: '#241f1e', wisps: { color: '#b0a49c' },
    scarftail: { color: '#7a3226', tip: '#ff8a3c' },
    belt: { color: '#241f1e', buckle: '#b86a3c' }, pouch: true,
  },
  rookfeather_mantle: {
    color: '#2a2e38', trim: '#b8c0cc', metal: '#8a92a0', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'none', chest: 'none', skirt: 0,
    plumage: { color: '#343a48', tip: '#454c5e', sheen: '#7a5ab8' },
    featherfall: { color: '#454c5e' }, lace: '#1e2128',
    charms: { color: '#c9ccd8' },
    belt: { color: '#1e2128', buckle: '#b8c0cc' }, pouch: true,
  },
  // The legendary plate road: four war harnesses spread down the
  // leveling bands, each with a signature that MOVES. Drop-only, one
  // lot each — the same law the cloth and leather roads keep.
  stormcrown_platebody: {
    color: '#46506e', trim: '#8ab4e8', metal: '#5c6884', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'spiked', pauldronColor: '#46506e',
    pauldronSpikes: 2, pauldronTrim: '#8ab4e8', pauldronScale: 1.12,
    chest: 'plate', emblem: 'bolt', emblemScale: 1.15, skirt: 0,
    collar: 'gorget', midline: true, rivetSeams: true, tassets: true,
    arcsparks: { color: '#9ad4ff' },
  },
  forgeheart_platebody: {
    color: '#33302e', trim: '#ff8a3c', metal: '#4a443e', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', pauldronColor: '#3e3834',
    pauldronTrim: '#ff8a3c', pauldronScale: 1.14, chest: 'plate',
    skirt: 0, collar: 'gorget', midline: true, rivetSeams: true,
    tassets: true, moltenSeams: { color: '#ff8a3c' },
    wisps: { color: '#a89a8c' },
  },
  wyrmsteel_platebody: {
    color: '#2e4438', trim: '#6ee8a0', metal: '#3e5848', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'wyrmwing', pauldronColor: '#243a2e',
    pauldronTrim: '#6ee8a0', pauldronScale: 1.15, chest: 'scales',
    skirt: 0, collar: 'gorget', tassets: true,
    embers: { color: '#6ee8a0' },
  },
  oathgold_platebody: {
    // THE PROCESSION (the oathgold overhaul): the set re-founded on
    // three values of gold — antique bronze-gold as the ground,
    // polished gold as the working metal, pale electrum as the ONE
    // BRIGHT EDGE — with oath crimson as the cloth and THE VIGIL as
    // the living word. The old harness was one value of gold: body,
    // trim and metal within a stone's throw of each other, and the
    // whole read as a molten ingot (the same flat-field sin the
    // redmarch overhaul burned out). Shoulders wear the GONFALON: a
    // full war assembly — quilted arming pad, three lapped fluted
    // lames, a coronet of forged points, and a lance-spar flying the
    // hung crimson banner with a chain swag riding the same wind —
    // the vow carried in state, never pinned like a scrap.
    color: '#9c7a2c', trim: '#fff0c0', metal: '#d4a83e', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'gonfalon', pauldronColor: '#8a6a26',
    pauldronTrim: '#fff0c0', pauldronScale: 1.24, chest: 'plate',
    emblem: 'crown', emblemScale: 1.3, skirt: 0, collar: 'gorget',
    midline: true, rivetSeams: true, tassets: true,
    tabard: { color: '#7e222c', trim: '#d4a83e' },
    gleam: { color: '#fff6d8' },
    vigil: { color: '#ffd98a' },
  },
  // THE HIGH ROAD: the plate wardrobe's second reach — five bespoke
  // war harnesses (and one twin quench) above the old bands, each
  // with a signature that MOVES. Drop-only, one lot each, the same
  // law the first road keeps.
  jadeskull_platebody: {
    color: '#3e6644', trim: '#c9a23c', metal: '#2f5238', cls: 'plate',
    // THE BONEMAW: the trophy-taker's shoulder — a polished jade dome
    // with a bleached hunting jaw clamped over its outer slope, fangs
    // biting down over the rim, a small skull boss at the crown whose
    // eyes wake on the chest device's own clock. The old silver
    // crescents floated near the ear and read as feathers; the jaw is
    // WORN, teeth around the shoulder it claimed.
    silhouette: 'cuirass', pauldron: 'bonemaw', pauldronColor: '#35583c',
    pauldronTrim: '#d8b04c', pauldronScale: 1.17, chest: 'plate',
    emblem: 'skull', emblemScale: 1.5, skirt: 0, collar: 'gorget',
    midline: true, rivetSeams: true, tassets: true,
    skullgaze: { color: '#7ab8ff' },
  },
  fellbone_platebody: {
    color: '#d9d2bd', trim: '#b8925c', metal: '#b8a88a', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'boneridge', pauldronColor: '#e2dcc8',
    pauldronTrim: '#f4f0e0', pauldronScale: 1.18, chest: 'plate',
    skirt: 0, collar: 'fur', collarColor: '#6e7a88', midline: true,
    tassets: true, hollowlight: { color: '#a8d8e8' },
  },
  redmarch_platebody: {
    // THE WALL WALKS (the redmarch overhaul): the set is re-founded
    // on a three-value structure — deep oxblood lacquer as the
    // ground, blackened iron as the working metal, aged steel as the
    // one bright edge — with EMBER as the living word. The old set
    // was one flat crimson field: the iron vanished into it, the
    // silver floated on it, and the whole read as a toy soldier.
    // Shoulders wear the RAMPART: a crenellated parapet on the seat
    // dome, watch-light breathing in the embrasures, the legion's
    // cross-banner hung down the outer slope. The chest rosettes
    // keep the same fires — steel petals, EMBER hearts — so the
    // watch runs from the wall to the harness to the fists.
    color: '#722830', trim: '#b9bec8', metal: '#413339', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'rampart', pauldronColor: '#453940',
    pauldronTrim: '#b9bec8', pauldronScale: 1.18, chest: 'plate',
    skirt: 0, collar: 'fur', collarColor: '#2c262c', midline: true,
    rivetSeams: true, tassets: true,
    rosettes: { color: '#ffb060', metal: '#9aa0a8' },
  },
  rimethorn_platebody: {
    color: '#2a3040', trim: '#a8d8ff', metal: '#1f2430', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'thorncrest', pauldronColor: '#343b4e',
    pauldronTrim: '#a8d8ff', pauldronScale: 1.16, chest: 'plate',
    skirt: 0, collar: 'gorget', midline: true, tassets: true,
    coldfire: { color: '#a8d8ff' },
  },
  palethorn_platebody: {
    color: '#b8bec8', trim: '#b0703c', metal: '#8d9299', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'thorncrest', pauldronColor: '#9aa0ae',
    pauldronTrim: '#e8c8a0', pauldronScale: 1.16, chest: 'plate',
    skirt: 0, collar: 'gorget', midline: true, tassets: true,
    // Deep flame on pale steel — the contrast law read the other way
    // around from the winter lot.
    coldfire: { color: '#ffb060' },
  },
  kingsmane_platebody: {
    color: '#e8e4da', trim: '#c9a23c', metal: '#d4cfc2', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'lionhead', pauldronColor: '#e8e4da',
    pauldronTrim: '#c9a23c', pauldronScale: 1.22, chest: 'plate',
    emblem: 'lion', emblemScale: 1.45, skirt: 0, collar: 'gorget',
    midline: true, rivetSeams: true, tassets: true,
    tabard: { color: '#2c3a5e', trim: '#c9a23c' },
    crownring: { color: '#e8c05c' },
  },
  gatefall_platebody: {
    // THE GATEFALL — the door that fell, worn as war plate. When the
    // first riftgate shattered, a doorwarden smith forged its night
    // glass over the gate's own granite so the way down would never
    // again open unanswered. Three values by law: night-glass violet
    // as the ground, the riftgate's quarried stone as the working
    // metal, gate-glass white as the ONE BRIGHT EDGE — and the
    // otherlight as the living word. Shoulders wear the GATESHARD:
    // a broken arch springing off the seat dome, two glass voussoirs
    // reaching for a crown that is not there. No rivet seams on the
    // chest: glass is fused, not hammered — the granite fittings
    // carry the smith's rivets instead. The breastplate's forge
    // crease is the door's meeting line, and THE BREACH tries it on
    // every rotation.
    color: '#37304f', trim: '#f1e9ff', metal: '#494259', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'gateshard', pauldronColor: '#3e3560',
    pauldronTrim: '#f1e9ff', pauldronScale: 1.2, chest: 'plate',
    skirt: 0, collar: 'gorget', midline: true, tassets: true,
    breach: { color: '#a985ff' },
  },
  // THE WORN BOOK: three houses hunted at the top of their roads, and
  // every one a RESURGENCE — an early silhouette the eye already knows,
  // recut at a band that can afford to mean it. The kinship IS the
  // design: each house keeps its ancestor's own words and MATURES them
  // (palette, hardware, scale), never trades them for a stranger's.
  adderking_jerkin: {
    // ADDERKING — adderfang steeped black by its own years. The khaki
    // hide has gone deep lacquered olive and the moss diamonds have
    // gone near-black: the ancestor's DIAMONDHIDE band is still the
    // chest's one cell, and now the pattern only shows when it turns.
    // Everything else grows up around it — a tailored yoke under the
    // band where the little jerkin had bare hide, the road crews'
    // brassy hardware matured to a king's gold, the hood's two fangs
    // grown into the pair standing off each shoulder, and a short
    // scaled skirt the leveling cut never earned. THE VENOM is the
    // house's one clock: it breathes along this hem and out of the
    // crown's dark above, and nowhere else.
    color: '#464a2b', trim: '#21261a', metal: '#c9a04a', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'spiked', pauldronColor: '#3a3f24',
    pauldronSpikes: 2, pauldronTrim: '#c9a04a', pauldronScale: 1.06,
    chest: 'diamondhide', yoke: { color: '#3a3f24', stitch: true },
    skirt: 0.13, underskirt: '#2b3019', bandolier: '#2b3019',
    belt: { color: '#2b3019', buckle: '#c9a04a' }, pouch: true,
    glowTrim: '#a8d84a',
  },
  stormtalon_harness: {
    // STORMTALON — skytalon flown up into the weather it was named
    // for. Same rig, at altitude: the ancestor's feather mantle and
    // back quiver both survive, because this is the archer who never
    // changed his gear, only the sky he stands in. The slate deepens
    // to storm indigo, the hawk's cream tips go WHITE — the edge the
    // weather put on every feather, and the one bright edge the whole
    // house repeats — and the fletcher's warm gold cools to storm
    // silver. Over the mantle, one bold swept pinion per shoulder
    // carrying that white edge as a filled bevel; a soft wing would
    // have gone to mush against the vanes beneath it. THE STORM is
    // the one clock: an arc snaps shoulder to chest and is gone.
    color: '#2b3654', trim: '#eef4ff', metal: '#c8d2e0', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'bladed', pauldronColor: '#46608c',
    pauldronTrim: '#eef4ff', pauldronScale: 1.1, chest: 'straps',
    skirt: 0,
    plumage: { color: '#46608c', tip: '#c3d2e8' },
    quiver: { color: '#525f8c', fletch: '#7fd4ff' },
    belt: { color: '#1e2740', buckle: '#c8d2e0' }, pouch: true,
    arcsparks: { color: '#7fd4ff' },
  },
  warvaliant_platebody: {
    // WARVALIANT — the storybook knight's harness taken at a ford and
    // re-issued by a legion armorer. The silhouette is valiant's,
    // unchanged and on purpose: cuirass, lapped lames, the chevron on
    // the breast, the surcoat cinched at the waist — the shape a child
    // would still draw. Everything ELSE belongs to the legion now: the
    // mirror finish scoured off to a drab working iron, the tourney
    // gold beaten down to issue brass, rivets punched through the
    // seams in ranks, tassets hung for the march the tourney never
    // made, and the crimson surcoat restitched in the legion's own
    // banner oxblood (the hobgoblin line's colour, verbatim). No
    // signature light anywhere on it: issue kit does not shine, and
    // the refusal is the whole read.
    color: '#514e3f', trim: '#9c8248', metal: '#6a6656', cls: 'plate',
    silhouette: 'cuirass', pauldron: 'layered', pauldronColor: '#5c5849',
    pauldronTrim: '#9c8248', pauldronScale: 1.12, chest: 'plate',
    emblem: 'chevron', emblemScale: 1.15, skirt: 0, collar: 'gorget',
    tassets: true,
    // No `midline`/`rivetSeams` here, and that is the correct read of
    // the piece: the forge crease and the seam rivets are breastplate
    // work, and the breastplate only paints on a BARE chest — this one
    // wears the surcoat over it. The rivets in the flavour above are
    // the ones punched through the lames and the tassets, not cloth.
    tabard: { color: '#8e2f2c', trim: '#9c8248' },
  },
  // THE WORN BOOK's other three houses — the wave's CHARACTER pieces,
  // and the first wardrobes in the game that speak about keeping a
  // beast, working a river, and standing at a bench. None of the
  // three is a hunted trophy set, so none of them wears a light: the
  // read has to come from what the work put on the garment. The two
  // craft houses keep the honesty their lane is for (wayfarer's law —
  // real hardware, counted devices, no signature glow); the pack
  // house is a drop set and spends its allowance on MASS and MOTION
  // instead of on a glow that a hide would have no business carrying.
  packlord_jerkin: {
    // PACKLORD — named for the beast, not the hunter. The houndmaster
    // wears the pack: a grizzled pelt lying over each shoulder and
    // carried on round the throat as one collar (mane and mantle are
    // the same hide, so they must be the same two values), the hide
    // itself gone road-brown under it, and the beast's own brush
    // still hanging at the trailing hip — THE BRUSH is this house's
    // living word, kicked by the stride the way the fringe is: motion
    // where the hunted houses put light, because a working pelt has
    // an opinion and a pack set should never glow. The chest is the
    // HARNESS: the strap and buckle a handler already owns, over a
    // stitched yoke, with the treat pouch on the belt beside it. The
    // brightest thing on the whole rig is the grizzle at the pelt's
    // tips — bronze is hardware and stays hardware.
    color: '#5b4a33', trim: '#2b2318', metal: '#a8763c', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'fur', pauldronColor: '#7d6e54',
    pauldronTrim: '#c4b593', pauldronScale: 1.14, chest: 'straps',
    fringe: true, skirt: 0.12, underskirt: '#3e3325',
    collar: 'fur', collarColor: '#8a7c62',
    yoke: { color: '#483c2a', stitch: true },
    tail: { color: '#4a3f2d', tip: '#c4b593' },
    belt: { color: '#2b2318', buckle: '#a8763c' }, pouch: true,
  },
  weirkeeper_jerkin: {
    // WEIRKEEPER — the river worker, and deliberately NOT the
    // kingfisher: that house went to sea and came back a leviathan,
    // this one stayed at the weir. Pike skin lapped as a true scale
    // COAT (a skin has no front or back — the rows wrap), its wet
    // crescents caught in a pale water-green rather than the
    // leviathans' nacre, and over it the thing the whole set is
    // about: TARRED NET CORD crossed both ways and knotted at the
    // sternum, because a keeper wears his net between hauls. The
    // shoulders are the only hard corners on it — one crab plate
    // each, shell-orange against all that green, which is where the
    // set's warm note begins and ends. Craft honesty: brass for
    // hardware, a short oiled apron off the belt, and no light
    // anywhere.
    color: '#2a5b52', trim: '#7f9a86', metal: '#9fc0a8', cls: 'leather',
    silhouette: 'jerkin', pauldron: 'round', pauldronColor: '#8a4a32',
    pauldronTrim: '#d09a68', pauldronScale: 1.06, chest: 'scales',
    skirt: 0.14, underskirt: '#1d4139',
    yoke: { color: '#20463d', stitch: true },
    cords: { color: '#b8ad86' },
    belt: { color: '#1d4139', buckle: '#c0aa72' }, pouch: true,
  },
  wrightcloth_smock: {
    // WRIGHTCLOTH — the master-wright at the bench, and the one cloth
    // set in the wardrobe that wears a TABARD: an apron is a front
    // panel cinched at the waist, which is exactly what that word
    // paints, and the smith's leather over the tailor's linen is the
    // set's whole argument. Under it the linen is QUILTED (a bench
    // smock is padded, not draped) and the salvage forgeplate is
    // lapped as lames at the shoulders, where a working hand takes
    // its knocks. The tool-straps cross the apron afterward, because
    // straps go on last. Two deliberate refusals: no belled sleeve —
    // the wright's arm is rolled to the elbow and the mitts own the
    // forearm — and a skirt hemmed SHORT (0.22 against the mage
    // lane's 0.32), because a bench floor is never clean.
    color: '#8d7d5c', trim: '#4a3728', metal: '#8a8272', cls: 'cloth',
    silhouette: 'robe', pauldron: 'layered', pauldronColor: '#6b6760',
    pauldronTrim: '#9a958a', pauldronScale: 1.04, chest: 'straps',
    skirt: 0.22, underskirt: '#6b5f45', folds: true, quilt: true,
    sleeve: '#7d6f51',
    tabard: { color: '#4a3728', trim: '#7a5f3e' },
    belt: { color: '#3a2c20', buckle: '#a08a5c' }, pouch: true,
  },
};

export const HELM_STYLES: Record<string, HelmStyle> = {
  flower_crown: { color: '#e8c04c', trim: '#79a355', kind: 'circlet' },
  // The soldier's barbute: one hammered iron shell, a bold dark T cut
  // clean through it — honest metal, forged with intent.
  iron_helm: { color: '#8d9299', trim: '#6a6f7d', kind: 'barbute' },
  leather_hood: { color: '#8a6a45', trim: '#6b4a26', kind: 'hood' },
  wolfhide_hood: { color: '#6a6f7d', trim: '#9aa0ae', kind: 'hood' },
  runecloth_cowl: { color: '#7a5ac4', trim: '#c9a8e8', kind: 'hood' },
  wizards_hat: { color: '#4a5a9c', trim: '#c9a23c', kind: 'wizard', charm: '#e8d06a' },
  steel_greathelm: {
    color: '#b8bec8', trim: '#8d9299', kind: 'greathelm',
    visor: 'slit', plume: { color: '#8a2f3c' },
  },
  // The sea-wolf's war mask: a Vendel face plate with sculpted bronze
  // brow, nose bar and mustache flare under ivory horns.
  horned_raider_helm: {
    color: '#7d6a52', trim: '#e0d4ac', kind: 'warmask',
    mask: '#c9b06a', jaw: '#4a3a2c', horns: { color: '#e6e0d0', size: 1 },
  },
  // The grove-keeper's armet: slatted wedge visor, pivot roundels, a
  // bronze leaf-blade crest riding green enamel steel.
  warden_helm: {
    color: '#4a7a5a', trim: '#6f9a7f', kind: 'armet',
    jaw: '#b0703c', crest: { color: '#b0703c' },
  },
  // The glacier sallet: swept pointed tail, one cold eye slit, an
  // icicle-toothed bevor under crystal temple fins.
  frostplate_helm: {
    color: '#9db6cc', trim: '#cfe0ee', kind: 'sallet',
    jaw: '#b6cede', fins: { color: '#cfe0ee' },
  },
  bulwark_greathelm: {
    color: '#5a6270', trim: '#b08a3c', kind: 'greathelm', visor: 'cross',
  },
  // The black maw: an overhanging brow shelf shading an ember-lit
  // slit, a saw-tooth bevor biting down over darkness.
  dreadforge_helm: {
    color: '#4a4553', trim: '#a83232', kind: 'dread',
    horns: { color: '#35313e', size: 1.45 }, jaw: '#625c6e',
  },
  // The radiant mask: a serene sculpted gold face under a brow
  // sun-disc and its corona — the sun god read.
  sunforged_helm: {
    color: '#d4a43c', trim: '#e8c05c', kind: 'radiant',
    wings: { color: '#e8e2d0' },
  },
  wayfarer_hood: {
    color: '#a8895a', trim: '#6b4a2e', kind: 'roadhood',
    feather: { color: '#c94f38' },
  },
  wolfstalker_hood: {
    color: '#5f6470', trim: '#424652', kind: 'wolfmantle',
    pelt: { color: '#8f96a6', dark: '#2e323c', pale: '#dde2ea' },
    frostbreath: { color: '#cfe0ea' },
  },
  nightveil_cowl: {
    color: '#3a3648', trim: '#6a5a8c', kind: 'shadowcowl', mask: '#4a4260',
    edgelight: { color: '#b9a8e8' },
  },
  // The drake visage: the slain drake's skull worn whole — bite-arch
  // void, bone fangs and trailing horns, ember eyes on the brow shelf,
  // a banked-fire spine crest. FIRE DRESSED AS PATIENCE.
  drakescale_coif: {
    color: '#6e2d26', trim: '#ff8848', kind: 'drake', jaw: '#b05c30',
    drakeset: { horn: '#e6ddc8', ember: '#ff8848', maw: '#2e1512' },
  },
  stagheart_hood: {
    color: '#6b5138', trim: '#d4a43c', kind: 'stagcrown',
    antlers: { color: '#e6e0d0' }, mossband: { color: '#6e8a4a' },
  },
  hedgemage_hat: {
    color: '#5a6b3a', trim: '#c9a23c', kind: 'hedgehat',
    sprig: { color: '#7a9a4a' },
  },
  tidecaller_hood: {
    color: '#2f6a78', trim: '#bfe8e0', kind: 'tidehat',
    pearls: { color: '#e8e2d4' },
  },
  voidwhisper_cowl: {
    color: '#2a2140', trim: '#b8a8d8', kind: 'hushcowl',
    riftlight: { casing: '#7a3df0', core: '#e8dcff', void: '#0a0714' },
  },
  cindersworn_hood: {
    color: '#251a16', trim: '#d96a2c', kind: 'oathcowl',
    oathcoal: { iron: '#4a382c', coal: '#16100c', ember: '#ffb054' },
    crackseams: { casing: '#c83a1a', ember: '#ffb054' },
  },
  starweaver_circlet: {
    color: '#c8cee8', trim: '#9db6ff', kind: 'stardiadem',
    starpoints: { color: '#c8cee8' }, starring: { color: '#c8cee8' },
  },
  thistledown_hood: {
    color: '#c9bfa3', trim: '#8a7a5c', kind: 'thistlehat',
    bloom: { calyx: '#7a8a56', down: '#b49ad0', seed: '#f4eeda' },
  },
  mothwing_cowl: {
    color: '#8a8a72', trim: '#d8d4b8', kind: 'mothcowl',
    antennae: { color: '#d8d4b8' }, ruff: { color: '#a8a88c' },
    motheyes: { color: '#e0d89a' },
  },
  dawnsworn_hood: {
    color: '#d9c9a0', trim: '#c9922f', kind: 'orisoncowl',
    sundisc: { color: '#e8b54a', phase: 'rising' },
  },
  fenwalker_hood: {
    color: '#3a5648', trim: '#b8d0a8', kind: 'wealdcowl',
    verdance: { vine: '#7a9a5c', leaf: '#8fbf6e', glow: '#9ae8c8' },
  },
  stormwoven_hood: {
    color: '#4e5a78', trim: '#c9d4e8', kind: 'shroudcowl',
    stormeye: { color: '#e8d878' },
    cloudwreath: { color: '#79859f', ember: '#e8d878' },
  },
  hareswift_hood: {
    color: '#c2a878', trim: '#8a6f48', kind: 'courierhood',
    ears: { color: '#cfc0a0', tall: true, tip: '#4a4038' },
    waybill: { color: '#e8dcc0', seal: '#b84a32' },
  },
  kingfisher_hood: {
    color: '#1e404c', trim: '#cfe4e2', kind: 'sharkmaw',
    divecrest: { color: '#a8c2c2', flash: '#e8ecec' },
  },
  cutpurse_cowl: {
    color: '#4e4438', trim: '#c9a23c', kind: 'guildcowl', mask: '#332b23',
    coinpin: { color: '#c9a23c' },
  },
  trapline_hood: {
    color: '#8a7248', trim: '#5a4a34', kind: 'trapperhood',
    ruff: { color: '#b8a888' },
  },
  emberfox_hood: {
    color: '#b05a30', trim: '#e8dcc4', kind: 'foxmantle',
    pelt: { color: '#b05a30', dark: '#3a3230', pale: '#e8dcc4', ember: '#ff9a3c' },
  },
  // The early plate helms: every one a different silhouette — tusked
  // boar, crested-and-plumed hero, ram spiral, thorn crown, spiked
  // greathelm. A knight's helm is half the knight.
  tuskguard_helm: {
    color: '#a4744b', trim: '#6e4a30', kind: 'bascinet',
    tusks: { color: '#e8dcc0' }, spikesCrown: { color: '#38281c' },
  },
  valiant_helm: {
    color: '#c9ccd4', trim: '#c9a23c', kind: 'greathelm', visor: 'slit',
    crest: { color: '#b8bec8' }, plume: { color: '#a83a38' },
  },
  // The battering tower: a riveted siege bucket wider than the head,
  // twin eye slots, a keel plate — ram spirals bolted on roundels.
  ramwall_helm: {
    color: '#6a7080', trim: '#4a4f5c', kind: 'ramfort',
    horns: { color: '#cfc4a8', size: 1, curl: true }, jaw: '#7a8294',
  },
  // The thorn cage: a woven briar-bar visor under a twisted wreath
  // brow band — the hedge grown into a helm.
  briarplate_helm: {
    color: '#3e4a38', trim: '#8a9a6e', kind: 'briar',
    horns: { color: '#8a9a6e', size: 1.25, tine: true }, jaw: '#55644c',
  },
  sentinel_greathelm: {
    color: '#55607a', trim: '#d4c28a', kind: 'greathelm', visor: 'cross',
    spikesCrown: { color: '#d4c28a' }, fins: { color: '#707c9a' },
  },
  // The named wardrobe's heads: two new forged shells (aurochs,
  // barrow) and four hoods that earn their names.
  moonbell_hood: {
    color: '#545a86', trim: '#cdd6f0', kind: 'hood',
    gem: { color: '#bfd0ff' }, blooms: { color: '#bfd0ff' },
  },
  riftweave_cowl: {
    color: '#2b2438', trim: '#8a6ad8', kind: 'hood',
    gem: { color: '#f2ecff' }, shards: { color: '#3a3050' },
  },
  adderfang_hood: {
    color: '#74683c', trim: '#4c5a30', kind: 'hood',
    gem: { color: '#d8a03c' }, fangs: { color: '#e8e2ce' },
  },
  broodsilk_cowl: {
    color: '#2c2a34', trim: '#e8e6f0', kind: 'hood',
    ruff: { color: '#c8c4d8' }, mask: '#3a3742',
  },
  aurochs_helm: {
    color: '#4a3f36', trim: '#b8925c', kind: 'aurochs',
    jaw: '#6e5c4c', horns: { color: '#e8dcc4', size: 1.05 },
  },
  barrowking_helm: {
    color: '#3a4038', trim: '#c9b25c', kind: 'barrow', jaw: '#565e52',
  },
  // The legendary cloth road's heads: two crowns that move, a halo
  // that stays, and a hood trailing the sky it danced with.
  wintercourt_crown: {
    color: '#cfe4f0', trim: '#3a9ad0', kind: 'circlet',
    icicles: { color: '#e8f6ff' },
  },
  vigil_circlet: {
    color: '#c9a23c', trim: '#ffb054', kind: 'circlet',
    halo: { color: '#ffd88a' },
  },
  skydancer_hood: {
    color: '#33465e', trim: '#8ae8c0', kind: 'hood',
    gem: { color: '#8ae8c0' },
    streamers: { colors: ['#8ae8c0', '#b08ae8'] },
  },
  orrery_diadem: {
    color: '#c9a23c', trim: '#e8c878', kind: 'circlet',
    orbitals: { color: '#e0b054', ring: '#8a7434' },
  },
  // THE GRAND ARCANUM's heads: the dawn's hood, the storm-sung cone,
  // the sculpted veil, the burning crown, the road magus's brim, and
  // the glyph-circled cowl.
  sunhallow_hood: {
    color: '#ece6d8', trim: '#d4a843', kind: 'hood',
    gem: { color: '#7ec8e8' }, aureole: { color: '#f0b040' },
  },
  stormsinger_hat: {
    color: '#2c3a6e', trim: '#ccd4e8', kind: 'wizard',
    charm: '#66d8f0', arcs: { color: '#8ae8ff' },
  },
  gloamsight_veil: {
    color: '#4e5636', trim: '#b09346', kind: 'veil',
    fins: { color: '#b09346' }, emberEyes: { color: '#ffb054' },
  },
  flamewrought_crown: {
    color: '#3a2e2a', trim: '#8a6a4a', kind: 'hood',
    emberEyes: { color: '#ff9a4a' },
    flamecrown: { tine: '#2e2422', flame: '#ff7a3c' },
  },
  duskwarden_hat: {
    color: '#232838', trim: '#9a7a44', kind: 'magus',
    gem: { color: '#d84052' },
  },
  aetherion_cowl: {
    color: '#2e2452', trim: '#d8dce8', kind: 'hood',
    gem: { color: '#8ce0e8' }, glyphs: { color: '#8ce0e8' },
  },
  // The legendary leather road's heads: an antlered crown with living
  // company, a crested hawk hood, a hood with coals for eyes, and the
  // rook's swept-feather cowl.
  hartsong_crown: {
    color: '#33472e', trim: '#d8b84c', kind: 'hood',
    antlers: { color: '#e8e2d0' }, gem: { color: '#d8e88a' },
    fireflies: { color: '#d8e88a' },
  },
  skytalon_helm: {
    color: '#46596e', trim: '#e8ddc0', kind: 'hood',
    crestfeathers: { colors: ['#5a7086', '#e8ddc0'] },
    gem: { color: '#8ad4e8' },
  },
  cindershade_cowl: {
    color: '#332e2c', trim: '#8a4a30', kind: 'hood',
    mask: '#241f1e', emberEyes: { color: '#ff7a3c' },
  },
  rookfeather_cowl: {
    color: '#2a2e38', trim: '#b8c0cc', kind: 'hood',
    mask: '#333846',
    crestfeathers: { colors: ['#343a48', '#7a5ab8'] },
  },
  // The legendary plate road's heads: four forged shells — the
  // storm's crown, the living furnace, the wyrm's visage, and the
  // oath's gilded idol.
  stormcrown_helm: {
    color: '#46506e', trim: '#8ab4e8', kind: 'tempest', jaw: '#5c6884',
    arcs: { color: '#9ad4ff' },
  },
  forgeheart_helm: {
    color: '#33302e', trim: '#ff8a3c', kind: 'furnace', jaw: '#4a443e',
    emberEyes: { color: '#ff8a3c' },
  },
  wyrmsteel_helm: {
    color: '#2e4438', trim: '#6ee8a0', kind: 'wyrm', jaw: '#3e5848',
    horns: { color: '#d8d2c0', size: 1.1 },
    emberEyes: { color: '#6ee8a0' },
  },
  oathgold_helm: {
    // THE WARCROWN: the idol's serene mask is DEAD — the vow looks
    // back with fire now. An angular flared war-helm wearing a true
    // radiate crown of electrum points, angry ember cuts for eyes, a
    // crimson brow jewel, engraved sunburst cheek plates, and the
    // king's mantling cascading crimson down the nape. Regal AND
    // dangerous: a coronation you do not interrupt.
    color: '#9c7a2c', trim: '#fff0c0', kind: 'warcrown', jaw: '#d4a83e',
    gleam: { color: '#fff6d8' },
    vigil: { color: '#ffd98a' },
  },
  // THE HIGH ROAD's heads: forged shells wearing their sets' own
  // weather — waking blue eyes, hollow marrow-light, watch-fire
  // white, the cold that looks back twice, and the king's standard.
  jadeskull_helm: {
    // The trophy-taker's armet: a carved bone death-mask riding the
    // jade shell where the wedge visor would be, under a crown of
    // forward-hooked fangs on a gilt seam. The old silver spike row
    // was the wardrobe's stock mohawk; this head keeps its own dead.
    color: '#3e6644', trim: '#c9a23c', kind: 'armet', jaw: '#c9a23c',
    boneMask: { color: '#e6e0cc' },
    boneCrown: { color: '#e6e0cc', seam: '#c9a23c' },
    emberEyes: { color: '#7ab8ff' },
  },
  fellbone_helm: {
    color: '#d9d2bd', trim: '#b8925c', kind: 'sallet', jaw: '#b8a88a',
    horns: { color: '#e8e2d0', size: 1.3, tine: true },
    emberEyes: { color: '#a8d8e8' },
  },
  redmarch_helm: {
    // The border legion's greathelm, blackened: the officer's
    // transverse crest worn ear to ear in two DEPTHS of legion
    // crimson — the old red-and-white stripes read as a candy cap,
    // not a brush. Steel cross visor; ember behind the eye slits,
    // the same watch-fire the wall keeps.
    color: '#4a3a40', trim: '#b9bec8', kind: 'greathelm', visor: 'cross',
    transverse: { colors: ['#b23138', '#5e1c22'] },
    emberEyes: { color: '#ffb060' },
  },
  rimethorn_helm: {
    color: '#2a3040', trim: '#a8d8ff', kind: 'armet', jaw: '#4a5468',
    horns: { color: '#4a5268', size: 1.35, tine: true },
    emberEyes: { color: '#a8d8ff' },
  },
  palethorn_helm: {
    color: '#b8bec8', trim: '#b0703c', kind: 'armet', jaw: '#8d9299',
    horns: { color: '#6e747e', size: 1.35, tine: true },
    emberEyes: { color: '#ffd9a0' },
  },
  kingsmane_helm: {
    color: '#e8e4da', trim: '#c9a23c', kind: 'greathelm', visor: 'slit',
    standard: { pole: '#c9a23c', banner: '#2c3a5e', trim: '#e8e4da' },
  },
  gatefall_helm: {
    // THE GATEHELM: the door itself, worn as a face. A gate-arched
    // shell with the riftgate's granite for its jambs, a sculpted
    // double door where a visor would be — hinge straps, a leaking
    // meeting seam, and a jagged sight crack at eye height where the
    // glass broke exactly where the warden needed to see. Over the
    // crown the broken arch rises and never meets; the missing
    // KEYSTONE floats in the gap, point down, held by the light
    // that comes through from the other side.
    color: '#37304f', trim: '#f1e9ff', kind: 'gatehelm', jaw: '#494259',
    keystone: { color: '#a985ff', glass: '#4c4176' },
  },
  // THE WORN BOOK's heads. Two hoods and a greathelm — the same three
  // chassis their ancestors wore, because a resurgence you cannot
  // recognise is just a new set.
  adderking_crown: {
    // The little hood's two dry fangs come back GOLD-CAPPED at the
    // mouth of the opening, and the face behind them is given up to
    // the dark: a folded mask over the jaw, the brow band black on
    // black, and the venom burning where the eyes should be. The
    // ancestor's brow gem matures from flat gold to amber — the same
    // stone the gauntlet wears at the wrist. The little one bit; this
    // one decides.
    color: '#464a2b', trim: '#21261a', kind: 'hood', mask: '#21261a',
    gem: { color: '#e0902c' }, fangs: { color: '#c9a04a' },
    emberEyes: { color: '#a8d84a' },
  },
  stormtalon_helm: {
    // The crest is up and stays up: skytalon's three swept vanes
    // recut storm-indigo with the house's white edge on every tip,
    // over a hood whose brow band is that same white — the one bright
    // line on a head otherwise given to the weather. The lower face
    // folds into shadow (the raptor line at its most severe; the
    // ancestor showed its whole chin), and the brow stone cools from
    // the hawk's warm teal to storm glass.
    color: '#2b3654', trim: '#eef4ff', kind: 'hood', mask: '#1e2740',
    crestfeathers: { colors: ['#46608c', '#eef4ff'] },
    gem: { color: '#7fd4ff' },
  },
  warvaliant_helm: {
    // The tall tourney crest is still there — sawn to a stub of plain
    // iron and re-plumed in legion black where a tournament red used
    // to fly. The knight's clean eye slit is gone: the legion re-cut
    // the face as a REINFORCED CROSS, because a bare dark slit on a
    // scoured shell is no face at all (the redmarch law), and brass
    // edges it where gold once did.
    color: '#514e3f', trim: '#9c8248', kind: 'greathelm', visor: 'cross',
    crest: { color: '#7a7568' }, plume: { color: '#453b31' },
  },
  // The wave's other three heads. All three keep the face — a
  // houndmaster who cannot be read by a dog, a keeper who cannot see
  // his line and a wright who cannot see his work are all nonsense —
  // so the mystery planes the hunted houses wear stay off these.
  // Each spends its budget on ONE crown device instead.
  packlord_hood: {
    // THE BRISTLE CREST, worn as it grew: the ridge off the pack
    // beast's back standing upright along the hood's centerline,
    // near-black so it reads as pure silhouette at any range (dogs
    // read it before people do). ONE crown device only — pricked ears
    // over a bristle ridge over the hood's own point is three crowns
    // on one skull, and the courier's pineapple lesson holds here
    // too. The grizzled mane rings the opening the way the pelt rings
    // the throat below it (same two values as the collar — one hide),
    // and the brow band is plain harness leather with a single bronze
    // ring set in it: this house's jewellery is tack.
    color: '#5b4a33', trim: '#2b2318', kind: 'hood',
    ruff: { color: '#8a7c62' },
    spikesCrown: { color: '#332a1d' },
    gem: { color: '#a8763c' },
  },
  weirkeeper_hood: {
    // THE FRILL, still holding its colors: skral frill fanned back off
    // the TEMPLES rather than the centerline — a frill grows in a
    // pair, at the sides of a head, and taking the temple blades
    // instead of a crown crest also keeps this head's silhouette
    // clear of every crested hood in the wardrobe. It is the one
    // saturated thing the set owns. Under it an oiled fleece collar
    // frames the face (a keeper stands in spray all day) and the brow
    // band runs pale water-green, the color the rest of the kit only
    // gets as a wet crescent.
    color: '#2a5b52', trim: '#7f9a86', kind: 'hood',
    ruff: { color: '#5f7d68' },
    fins: { color: '#45a184' },
  },
  wrightcloth_cap: {
    // THE FOLDED CAP: the plainest head in the wave, and deliberately
    // so — a linen coif whose brow band IS the riveted salvage plate
    // (the hood's trim bar, spent on the one piece of armour a bench
    // worker actually needs), with a single copper rivet boss set at
    // its center. Nothing rises off the crown. The craft lane earns
    // its read by being right, not by being crowned; wayfarer's hood
    // makes the same bargain a road lower.
    color: '#8d7d5c', trim: '#6e6a60', kind: 'hood',
    gem: { color: '#b06a30' },
  },
};

export const LEG_STYLES: Record<string, LegStyle> = {
  woven_trousers: { kind: 'pants', thigh: '#8f9ed6' },
  leather_chaps: { kind: 'wraps', thigh: '#b08a5c', shin: '#8a6a45', knee: 'wrap', kneeColor: '#6b4a26' },
  iron_greaves: { kind: 'greaves', thigh: '#5c5460', shin: '#8d9299', knee: 'plate', kneeColor: '#9aa2ac' },
  steel_greaves: { kind: 'greaves', thigh: '#5c5460', shin: '#b8bec8', knee: 'plate', kneeColor: '#d4dae2' },
  warden_greaves: { kind: 'greaves', thigh: '#3e5a48', shin: '#4a7a5a', knee: 'plate', kneeColor: '#b0703c' },
  frostplate_greaves: { kind: 'greaves', thigh: '#55647a', shin: '#9db6cc', knee: 'plate', kneeColor: '#cfe0ee' },
  bulwark_greaves: { kind: 'greaves', thigh: '#454b58', shin: '#5a6270', knee: 'plate', kneeColor: '#b08a3c' },
  dreadforge_greaves: { kind: 'greaves', thigh: '#322f3a', shin: '#4a4553', knee: 'plate', kneeColor: '#a83232' },
  sunforged_greaves: { kind: 'greaves', thigh: '#8a6a2c', shin: '#d4a43c', knee: 'plate', kneeColor: '#f4e0a0' },
  wayfarer_chaps: {
    kind: 'wraps', thigh: '#a8895a', shin: '#8a6a45', knee: 'wrap',
    kneeColor: '#6b4a2e', roadpatch: { color: '#8a6a45' },
  },
  wolfstalker_chaps: {
    kind: 'wraps', thigh: '#5f6470', shin: '#4f5460', knee: 'none',
    furknee: { color: '#b8bec8' },
  },
  nightveil_leggings: {
    kind: 'wraps', thigh: '#3a3648', shin: '#302c3c', knee: 'none',
    garter: { color: '#584a78', blade: '#9a94b0' },
  },
  drakescale_chaps: {
    kind: 'greaves', thigh: '#47201b', shin: '#3a1a16', knee: 'plate',
    kneeColor: '#b05c30', scalerows: { plate: '#8a3f2c' },
  },
  stagheart_chaps: {
    kind: 'wraps', thigh: '#6b5138', shin: '#5a4430', knee: 'none',
    mossbind: { color: '#3e5a30', tuft: '#6e8a4a' },
  },
  thistledown_skirts: { kind: 'pants', thigh: '#a89a80' },
  mothwing_skirts: { kind: 'pants', thigh: '#6e6e5a' },
  dawnsworn_skirts: { kind: 'pants', thigh: '#b8a87e' },
  fenwalker_skirts: { kind: 'pants', thigh: '#2c443a' },
  stormwoven_skirts: { kind: 'pants', thigh: '#3c4660' },
  hedgemage_skirts: { kind: 'pants', thigh: '#4e5c33' },
  tidecaller_skirts: { kind: 'pants', thigh: '#245562' },
  voidwhisper_skirts: { kind: 'pants', thigh: '#241d36' },
  cindersworn_skirts: { kind: 'pants', thigh: '#1f1511' },
  starweaver_skirts: { kind: 'pants', thigh: '#232850' },
  hareswift_chaps: {
    kind: 'wraps', thigh: '#c2a878', shin: '#a88f60', knee: 'wrap',
    kneeColor: '#8a6f48', hock: { color: '#ece4d0' },
  },
  kingfisher_chaps: {
    kind: 'wraps', thigh: '#1e404c', shin: '#183642', knee: 'none',
    wader: { color: '#122a34', rim: '#cfe4e2' },
    calffin: { color: '#1e4450', edge: '#6e98a0' },
  },
  cutpurse_leggings: {
    kind: 'wraps', thigh: '#4e4438', shin: '#3e362c', knee: 'wrap',
    kneeColor: '#6e6050', pickroll: { color: '#3a332c', glint: '#c9a23c' },
  },
  trapline_chaps: {
    kind: 'wraps', thigh: '#8a7248', shin: '#6e5a3c', knee: 'wrap',
    kneeColor: '#5a4a34', shinlace: { color: '#d8cfae' },
  },
  // The fox's own socks: russet thigh into black shin.
  emberfox_leggings: {
    kind: 'wraps', thigh: '#b05a30', shin: '#7a3e20', knee: 'none',
    sock: { color: '#2e2724', tie: '#ff9a3c' },
  },
  tuskguard_greaves: { kind: 'greaves', thigh: '#6e5138', shin: '#a4744b', knee: 'plate', kneeColor: '#c9955c' },
  valiant_greaves: { kind: 'greaves', thigh: '#5c5460', shin: '#c9ccd4', knee: 'plate', kneeColor: '#e8c04c' },
  ramwall_greaves: { kind: 'greaves', thigh: '#454b58', shin: '#6a7080', knee: 'plate', kneeColor: '#8a92a4' },
  briarplate_greaves: { kind: 'greaves', thigh: '#2e382a', shin: '#3e4a38', knee: 'plate', kneeColor: '#8a9a6e' },
  sentinel_greaves: { kind: 'greaves', thigh: '#3e4658', shin: '#55607a', knee: 'plate', kneeColor: '#d4c28a' },
  // The named wardrobe.
  moonbell_skirts: { kind: 'pants', thigh: '#434871' },
  riftweave_skirts: { kind: 'pants', thigh: '#221c2e' },
  adderfang_leggings: { kind: 'wraps', thigh: '#74683c', shin: '#5c5230', knee: 'wrap', kneeColor: '#4c5a30' },
  broodsilk_leggings: { kind: 'wraps', thigh: '#2c2a34', shin: '#232028', knee: 'wrap', kneeColor: '#e8e6f0' },
  aurochs_greaves: { kind: 'greaves', thigh: '#38302a', shin: '#4a3f36', knee: 'plate', kneeColor: '#b8925c' },
  barrowking_greaves: { kind: 'greaves', thigh: '#2d322c', shin: '#3a4038', knee: 'plate', kneeColor: '#ded6b8' },
  // The legendary cloth road.
  wintercourt_skirts: { kind: 'pants', thigh: '#2e4a60' },
  vigil_skirts: { kind: 'pants', thigh: '#c2b696' },
  skydancer_skirts: { kind: 'pants', thigh: '#283a4e' },
  orrery_skirts: { kind: 'pants', thigh: '#1e2540' },
  // THE GRAND ARCANUM.
  sunhallow_skirts: { kind: 'pants', thigh: '#d9d1ba' },
  stormsinger_skirts: { kind: 'pants', thigh: '#22305c' },
  gloamsight_skirts: { kind: 'pants', thigh: '#3d4429' },
  flamewrought_skirts: { kind: 'pants', thigh: '#c9bda0' },
  duskwarden_skirts: { kind: 'pants', thigh: '#1e2330' },
  aetherion_skirts: { kind: 'pants', thigh: '#251d42' },
  // The legendary leather road.
  hartsong_leggings: { kind: 'wraps', thigh: '#2a3b26', shin: '#243320', knee: 'wrap', kneeColor: '#d8b84c' },
  skytalon_leggings: { kind: 'wraps', thigh: '#32404f', shin: '#2a3642', knee: 'wrap', kneeColor: '#e8ddc0' },
  cindershade_leggings: { kind: 'wraps', thigh: '#2a2624', shin: '#241f1e', knee: 'wrap', kneeColor: '#8a4a30' },
  rookfeather_leggings: { kind: 'wraps', thigh: '#232630', shin: '#1e2128', knee: 'wrap', kneeColor: '#b8c0cc' },
  // The legendary plate road.
  stormcrown_greaves: { kind: 'greaves', thigh: '#3a4258', shin: '#46506e', knee: 'plate', kneeColor: '#5c6884' },
  forgeheart_greaves: { kind: 'greaves', thigh: '#282523', shin: '#33302e', knee: 'plate', kneeColor: '#ff8a3c' },
  wyrmsteel_greaves: { kind: 'greaves', thigh: '#243a2e', shin: '#2e4438', knee: 'plate', kneeColor: '#4a7a5e' },
  oathgold_greaves: { kind: 'greaves', thigh: '#9c7a2c', shin: '#d4a83e', knee: 'plate', kneeColor: '#fff0c0' },
  // THE HIGH ROAD.
  jadeskull_greaves: { kind: 'greaves', thigh: '#2f4a36', shin: '#3e6644', knee: 'plate', kneeColor: '#c9a23c' },
  fellbone_greaves: { kind: 'greaves', thigh: '#3a332c', shin: '#d9d2bd', knee: 'plate', kneeColor: '#b8925c' },
  redmarch_greaves: { kind: 'greaves', thigh: '#722830', shin: '#413339', knee: 'plate', kneeColor: '#9aa0a8' },
  rimethorn_greaves: { kind: 'greaves', thigh: '#232838', shin: '#2a3040', knee: 'plate', kneeColor: '#a8d8ff' },
  palethorn_greaves: { kind: 'greaves', thigh: '#8d9299', shin: '#b8bec8', knee: 'plate', kneeColor: '#b0703c' },
  kingsmane_greaves: { kind: 'greaves', thigh: '#8a8478', shin: '#e8e4da', knee: 'plate', kneeColor: '#c9a23c' },
  gatefall_greaves: { kind: 'greaves', thigh: '#2c2542', shin: '#494259', knee: 'plate', kneeColor: '#8b81ab' },
  // THE WORN BOOK. The leather pair keeps the MUTED register at the
  // leg (the calffin verdict: a bright chip down there reads as a
  // floating tooth) — the venom and the storm-white both stay above
  // the belt. Only the plate house wears its trim at the knee.
  // Scaled to the ankle: olive thigh into the near-black shin, bound
  // off in dulled king's gold where the ancestor tied moss cord.
  adderking_leggings: { kind: 'wraps', thigh: '#3c4126', shin: '#2b3019', knee: 'wrap', kneeColor: '#9a7f3e' },
  // Cut for the long stand: a hard slate cop over indigo hide — the
  // brace the ancestor's soft knee wrap never gave the archer.
  stormtalon_leggings: { kind: 'wraps', thigh: '#2b3654', shin: '#222b42', knee: 'plate', kneeColor: '#7d8fb4' },
  // Parade steel beaten back into issue kit: drab iron, brass poleyn.
  warvaliant_greaves: { kind: 'greaves', thigh: '#3f3c31', shin: '#514e3f', knee: 'plate', kneeColor: '#8a7440' },
  // Bound in cord and tooth for the long lope: hide thigh into a
  // darker shin, tied off at the knee in the pelt's own grizzle so
  // the leg answers the mane above it.
  packlord_leggings: { kind: 'wraps', thigh: '#4a3f2d', shin: '#3a3123', knee: 'wrap', kneeColor: '#8a7c62' },
  // Sealed to the hip and SHELLED at the knee — the one crab plate
  // below the belt, quoting the shoulders exactly. The leg keeps the
  // muted register: the frill's green never comes down here.
  weirkeeper_waders: { kind: 'wraps', thigh: '#24504a', shin: '#1d4139', knee: 'plate', kneeColor: '#8a4a32' },
  // The one cloth skirt in the wardrobe that admits to a knee: the
  // hem is cut short, so the leg is on show, and a wright kneels at
  // his work — a scrap-forgeplate cop over soot-dark linen.
  wrightcloth_skirts: { kind: 'pants', thigh: '#6b5f45', shin: '#5c5240', knee: 'plate', kneeColor: '#6e6a60' },
};

export const BOOT_STYLES: Record<string, BootStyle> = {
  swiftstep_boots: { color: '#7fc9b3', height: 0.1, cuff: { color: '#4a8a78' } },
  leather_boots: { color: '#6b4a26', height: 0.08 },
  wanderer_boots: { color: '#8a6a45', height: 0.16, cuff: { color: '#6b4a26' } },
  iron_sabatons: { color: '#8d9299', height: 0.12, toe: '#c9ccd4' },
  steel_sabatons: { color: '#b8bec8', height: 0.13, toe: '#d4dae2' },
  warden_sabatons: { color: '#4a7a5a', height: 0.12, toe: '#b0703c' },
  frostplate_sabatons: { color: '#9db6cc', height: 0.12, toe: '#cfe0ee' },
  bulwark_sabatons: { color: '#5a6270', height: 0.14, toe: '#b08a3c', cuff: { color: '#787f8e' } },
  dreadforge_sabatons: { color: '#4a4553', height: 0.14, toe: '#625c6e', spike: true },
  sunforged_sabatons: { color: '#d4a43c', height: 0.13, toe: '#f4e0a0' },
  wayfarer_boots: { color: '#8a6a45', height: 0.12, wrap: { color: '#6b4a2e' } },
  wolfstalker_boots: { color: '#4f5460', height: 0.13, fur: { color: '#9aa0ae' } },
  nightveil_boots: { color: '#302c3c', height: 0.11, cuff: { color: '#6a5a8c' } },
  drakescale_boots: { color: '#3a1a16', height: 0.14, toe: '#b05c30', cuff: { color: '#6e2d26' } },
  stagheart_boots: { color: '#5a4430', height: 0.14, wrap: { color: '#3e5a30' }, cuff: { color: '#d4a43c' } },
  thistledown_slippers: { color: '#a89a80', height: 0.07 },
  mothwing_slippers: { color: '#6e6e5a', height: 0.09, fur: { color: '#a8a88c' } },
  dawnsworn_slippers: { color: '#b8a87e', height: 0.08, cuff: { color: '#c9922f' }, toe: '#e8b54a' },
  fenwalker_slippers: { color: '#2c443a', height: 0.1, wrap: { color: '#8a9a6c' }, toe: '#9ae8c8' },
  stormwoven_slippers: { color: '#3c4660', height: 0.09, cuff: { color: '#e8d878' } },
  hedgemage_slippers: { color: '#8a7a3c', height: 0.07, curl: true },
  tidecaller_slippers: { color: '#1f4a55', height: 0.08, cuff: { color: '#bfe8e0' } },
  voidwhisper_slippers: { color: '#1d1730', height: 0.08, cuff: { color: '#8a76b8' } },
  cindersworn_slippers: { color: '#180f0b', height: 0.08, cuff: { color: '#c8511f' } },
  starweaver_slippers: { color: '#232850', height: 0.08, curl: true, cuff: { color: '#c8cee8' } },
  hareswift_boots: { color: '#a88f60', height: 0.1, fur: { color: '#e8e2d4' } },
  kingfisher_boots: { color: '#122a34', height: 0.15, toe: '#cfe4e2', cuff: { color: '#1e4450' } },
  cutpurse_boots: { color: '#3a332c', height: 0.09, cuff: { color: '#6e6050' } },
  trapline_boots: { color: '#6e5a3c', height: 0.13, wrap: { color: '#d8cfae' } },
  emberfox_boots: { color: '#2e2724', height: 0.11, fur: { color: '#c9713c' } },
  tuskguard_sabatons: { color: '#a4744b', height: 0.12, toe: '#c9955c' },
  valiant_sabatons: { color: '#c9ccd4', height: 0.13, toe: '#e8c04c' },
  ramwall_sabatons: { color: '#6a7080', height: 0.14, toe: '#8a92a4', cuff: { color: '#7a8294' } },
  briarplate_sabatons: { color: '#3e4a38', height: 0.13, toe: '#55644c', spike: true },
  sentinel_sabatons: { color: '#55607a', height: 0.14, toe: '#d4c28a' },
  // The named wardrobe.
  // No curl toe: the long robe owns the foot line; a curl peeking past
  // the hem reads as a stray hook, not a slipper.
  moonbell_slippers: { color: '#434871', height: 0.09, cuff: { color: '#cdd6f0' } },
  riftweave_slippers: { color: '#221c2e', height: 0.1, cuff: { color: '#8a6ad8' } },
  adderfang_boots: { color: '#5c5230', height: 0.13, wrap: { color: '#e8e2ce' } },
  broodsilk_boots: { color: '#232028', height: 0.12, wrap: { color: '#e8e6f0' } },
  // The dark toe is the hoof.
  aurochs_sabatons: { color: '#4a3f36', height: 0.14, toe: '#2e2622', cuff: { color: '#b8925c' } },
  barrowking_sabatons: { color: '#3a4038', height: 0.14, toe: '#565e52', cuff: { color: '#c9b25c' } },
  // The legendary cloth road. Same no-curl law as moonbell — the robe
  // hem owns the foot line.
  wintercourt_slippers: { color: '#2e4a60', height: 0.09, cuff: { color: '#dcf0fc' } },
  vigil_slippers: { color: '#c2b696', height: 0.08, cuff: { color: '#c9922f' } },
  skydancer_slippers: { color: '#283a4e', height: 0.09, cuff: { color: '#8ae8c0' } },
  orrery_slippers: { color: '#1e2540', height: 0.09, cuff: { color: '#c9a23c' } },
  // THE GRAND ARCANUM. The hem owns the foot line; only the warden
  // wears road boots under the robe.
  sunhallow_slippers: { color: '#c9b073', height: 0.08, cuff: { color: '#ece6d8' } },
  stormsinger_slippers: { color: '#1f2a52', height: 0.09, cuff: { color: '#66d8f0' } },
  gloamsight_slippers: { color: '#39402a', height: 0.08, cuff: { color: '#b09346' } },
  flamewrought_slippers: { color: '#352a24', height: 0.08, cuff: { color: '#ff7a3c' } },
  duskwarden_slippers: { color: '#1c2130', height: 0.14, wrap: { color: '#9a7a44' } },
  aetherion_slippers: { color: '#211a3a', height: 0.09, cuff: { color: '#8ce0e8' } },
  // The legendary leather road: laced and wrapped, never curled.
  hartsong_treads: { color: '#2a3b26', height: 0.12, wrap: { color: '#d8b84c' } },
  skytalon_striders: { color: '#32404f', height: 0.13, cuff: { color: '#e8ddc0' } },
  cindershade_soles: { color: '#241f1e', height: 0.12, wrap: { color: '#8a4a30' } },
  rookfeather_steps: { color: '#1e2128', height: 0.12, cuff: { color: '#454c5e' } },
  // The legendary plate road.
  stormcrown_sabatons: { color: '#46506e', height: 0.14, toe: '#2e3448', cuff: { color: '#8ab4e8' } },
  forgeheart_sabatons: { color: '#33302e', height: 0.14, toe: '#1f1d1b', cuff: { color: '#ff8a3c' } },
  wyrmsteel_sabatons: { color: '#2e4438', height: 0.14, toe: '#a8d8bc', cuff: { color: '#3e5848' }, spike: true },
  oathgold_sabatons: { color: '#d4a83e', height: 0.15, toe: '#fff0c0', cuff: { color: '#7e222c' } },
  // THE HIGH ROAD.
  jadeskull_sabatons: { color: '#3e6644', height: 0.14, toe: '#c9ccd4', cuff: { color: '#c9a23c' } },
  fellbone_sabatons: { color: '#d9d2bd', height: 0.14, toe: '#b8a88a', fur: { color: '#6e7a88' } },
  redmarch_sabatons: { color: '#413339', height: 0.14, toe: '#9aa0a8' },
  rimethorn_sabatons: { color: '#2a3040', height: 0.14, toe: '#1f2430', spike: true, cuff: { color: '#a8d8ff' } },
  palethorn_sabatons: { color: '#b8bec8', height: 0.14, toe: '#8d9299', spike: true, cuff: { color: '#b0703c' } },
  kingsmane_sabatons: { color: '#e8e4da', height: 0.15, toe: '#c9a23c', cuff: { color: '#2c3a5e' } },
  gatefall_sabatons: { color: '#3e3560', height: 0.16, toe: '#8b81ab', cuff: { color: '#494259' } },
  // THE WORN BOOK.
  // They cross dry leaves the way the old hood did: the ancestor's
  // ivory shaft lacing re-laid in dulled gold over near-black scale.
  adderking_boots: { color: '#2b3019', height: 0.14, wrap: { color: '#9a7f3e' }, cuff: { color: '#3c4126' } },
  // THE TALON FULLY REALISED — the house's motif carried to the
  // ground: a capped fore-talon at the toe and the hind spur standing
  // off the shaft top, both in the muted storm silver so the foot
  // reads as a bird's without stealing the eye from the white edge
  // above. The ancestor's cuff stays, in the plumage's own blue.
  stormtalon_striders: { color: '#222b42', height: 0.14, toe: '#8ea0bc', spike: true, cuff: { color: '#46608c' } },
  // The gold went to the paymaster, and the iron under it never
  // noticed: an iron toe cap and nothing else. The one piece in the
  // house that carries NO brass — a boot ankle is a fat colour mass
  // in this grammar, and brass down there would have read as the
  // parade gold the legion stripped off.
  warvaliant_sabatons: { color: '#514e3f', height: 0.14, toe: '#6a6656' },
  // Wide soled for open ground, and the only boot in the house that
  // gets to wear the pelt: cord lacing up the shaft under a grizzled
  // fur top, so the pack runs crown to heel.
  packlord_treads: { color: '#3a3123', height: 0.13, wrap: { color: '#6e5f46' }, fur: { color: '#8a7c62' } },
  // Tall for standing in the current, lashed in tarred cord, and
  // studded at the toe in brass for wet stone. No green down here
  // (the calffin verdict): the water-pale stays above the belt.
  weirkeeper_boots: { color: '#1d4139', height: 0.16, toe: '#9a8a5c', wrap: { color: '#b8ad86' } },
  // Plate capped at the toe against a dropped anvil, on a low linen
  // shoe — a bench worker's foot, not a marching one.
  wrightcloth_shoes: { color: '#6b5f45', height: 0.09, toe: '#6e6a60', cuff: { color: '#4a3728' } },
};

/**
 * The glove wardrobe. Every themed set's pair is designed against that
 * set's own devices — a Warden glove grows the leaf-bladed patina, a
 * Dreadforge glove spikes like its pauldrons — never a generic mitt
 * with a new tint. Populated per-set in the wardrobe passes below.
 */
export const GLOVE_STYLES: Record<string, GloveStyle> = {
  // Starter basics: the three classes' plainest working pairs.
  leather_gloves: {
    color: '#b08a5c', hand: 'glove', bracer: '#a17c50',
    cuff: { color: '#6b4a26', kind: 'band' },
  },
  padded_mitts: {
    color: '#8a8ab0', hand: 'wrap', bracer: '#7c7ca2',
    cuff: { color: '#c9c4cf', kind: 'roll' },
  },
  iron_gauntlets: {
    color: '#8d9299', hand: 'gauntlet', bracer: '#7a7f8a',
    cuff: { color: '#b0b6be', kind: 'flare' },
    knuckle: { color: '#b0b6be', kind: 'plate' },
  },
  steel_gauntlets: {
    color: '#b8bec8', hand: 'gauntlet', bracer: '#a4aab6',
    cuff: { color: '#d4dae2', kind: 'flare' },
    knuckle: { color: '#c9a23c', kind: 'studs' },
  },
  // Themed plate: each gauntlet quotes its set's own devices — copper
  // leaf, rime studs, brass joints, blood spikes, ivory-cuffed gold.
  warden_gauntlets: {
    color: '#4a7a5a', hand: 'gauntlet', bracer: '#416c4f',
    cuff: { color: '#5a8a6a', kind: 'flare' },
    knuckle: { color: '#d69a55', kind: 'plate' },
  },
  frostplate_gauntlets: {
    color: '#9db6cc', hand: 'gauntlet', bracer: '#8ca6bc',
    cuff: { color: '#cfe0ee', kind: 'flare' },
    knuckle: { color: '#e8f4ff', kind: 'studs' },
  },
  bulwark_gauntlets: {
    color: '#5a6270', hand: 'gauntlet', bracer: '#505866',
    cuff: { color: '#787f8e', kind: 'flare' },
    knuckle: { color: '#b08a3c', kind: 'plate' },
  },
  dreadforge_gauntlets: {
    color: '#4a4553', hand: 'gauntlet', bracer: '#403b48',
    cuff: { color: '#625c6e', kind: 'flare' },
    knuckle: { color: '#a83232', kind: 'spikes' },
  },
  sunforged_gauntlets: {
    color: '#d4a43c', hand: 'gauntlet', bracer: '#c09330',
    cuff: { color: '#f4e0a0', kind: 'flare' },
    knuckle: { color: '#fff2c8', kind: 'plate' },
  },
  // Themed leather: fur, claws, scale rivets and moss — the wilds'
  // own hand-me-downs.
  wayfarer_gloves: {
    color: '#a8895a', hand: 'glove', bracer: '#8a6a45',
    cuff: { color: '#6b4a2e', kind: 'band' },
  },
  wolfstalker_gloves: {
    color: '#5f6470', hand: 'paw', bracer: '#555a66',
    cuff: { color: '#9aa0ae', kind: 'fur' },
    knuckle: { color: '#c9c4b4', kind: 'claws' },
  },
  nightveil_gloves: {
    color: '#302c3c', hand: 'glove', bracer: '#3a3648',
    cuff: { color: '#6a5a8c', kind: 'band' },
  },
  drakescale_gloves: {
    color: '#47201b', hand: 'gauntlet', bracer: '#6e2d26',
    cuff: { color: '#b05c30', kind: 'band' },
    knuckle: { color: '#b8a88a', kind: 'studs' },
  },
  stagheart_gloves: {
    color: '#5a4430', hand: 'glove', bracer: '#4f3c2a',
    cuff: { color: '#4e6a3c', kind: 'fur' },
    knuckle: { color: '#d4a43c', kind: 'studs' },
  },
  // Themed cloth: the casters keep their fingers free and their
  // devices close — pearl, eye, ember and star ride the hand.
  hedgemage_gloves: {
    color: '#5a6b3a', hand: 'glove', bracer: '#506033',
    cuff: { color: '#8a7a3c', kind: 'roll' }, fingerless: true,
  },
  tidecaller_gloves: {
    color: '#2f6a78', hand: 'glove', bracer: '#2a5f6c',
    cuff: { color: '#bfe8e0', kind: 'roll' },
    knuckle: { color: '#e8e2d4', kind: 'gem' },
  },
  voidwhisper_gloves: {
    color: '#241d36', hand: 'glove', bracer: '#1d1730',
    cuff: { color: '#6a5a8c', kind: 'band' },
    knuckle: { color: '#7a68a8', kind: 'gem' },
  },
  cindersworn_gloves: {
    color: '#1c130f', hand: 'glove', bracer: '#291c17',
    cuff: { color: '#c8511f', kind: 'band' },
    knuckle: { color: '#ffb054', kind: 'gem' },
  },
  starweaver_gloves: {
    color: '#2c3260', hand: 'glove', bracer: '#272c54',
    cuff: { color: '#c8cee8', kind: 'roll' },
    knuckle: { color: '#aab8e8', kind: 'gem' },
  },
  // Early cloth: the leveling road's wraps, in four dye lots each.
  thistledown_wraps: {
    color: '#c9bfa3', hand: 'wrap', bracer: '#bcb193',
    cuff: { color: '#a89a80', kind: 'roll' },
  },
  mothwing_wraps: {
    color: '#8a8a72', hand: 'wrap', bracer: '#7e7e67',
    cuff: { color: '#a8a88c', kind: 'fur' },
    knuckle: { color: '#c8c4a0', kind: 'studs' },
  },
  dawnsworn_wraps: {
    color: '#d9c9a0', hand: 'wrap', bracer: '#ccbc92',
    cuff: { color: '#c9922f', kind: 'band' },
    knuckle: { color: '#e8b84a', kind: 'gem' },
  },
  fenwalker_wraps: {
    color: '#3a5648', hand: 'wrap', bracer: '#334e42',
    cuff: { color: '#b8d0a8', kind: 'band' },
    knuckle: { color: '#9ae8c8', kind: 'gem' },
  },
  stormwoven_wraps: {
    color: '#4e5a78', hand: 'wrap', bracer: '#46516c',
    cuff: { color: '#e8d878', kind: 'band' },
    knuckle: { color: '#e8d878', kind: 'studs' },
  },
  // Early leather: fur cuffs, the flipped kingfisher, THE fingerless
  // thief pair, snare-cord wrists and the fox's black socks.
  hareswift_gloves: {
    color: '#c2a878', hand: 'paw', bracer: '#b0966a',
    cuff: { color: '#e8e2d4', kind: 'fur' },
  },
  kingfisher_gloves: {
    color: '#1e404c', hand: 'glove', bracer: '#183642',
    cuff: { color: '#cfe4e2', kind: 'band' },
    knuckle: { color: '#d8ecec', kind: 'spikes' },
  },
  cutpurse_gloves: {
    color: '#4e4438', hand: 'glove', bracer: '#453c31',
    cuff: { color: '#6e6050', kind: 'band' }, fingerless: true,
    knuckle: { color: '#c9a23c', kind: 'studs' },
  },
  trapline_gloves: {
    color: '#8a7248', hand: 'glove', bracer: '#6e5a3c',
    cuff: { color: '#d8cfae', kind: 'band' },
  },
  // The fox's black socks: dark paw, russet forearm — the pelt runs
  // unbroken from the jerkin sleeve down into the hand.
  emberfox_gloves: {
    color: '#2e2724', hand: 'paw', bracer: '#b05a30',
    cuff: { color: '#c9713c', kind: 'fur' },
    knuckle: { color: '#1e1a18', kind: 'claws' },
  },
  // Early plate: ivory tusk studs, tourney polish, fluted slate,
  // thorned knuckles and the vigil's gold.
  tuskguard_gauntlets: {
    color: '#a4744b', hand: 'gauntlet', bracer: '#8a5f3c',
    cuff: { color: '#c9955c', kind: 'flare' },
    knuckle: { color: '#e8dcc0', kind: 'studs' },
  },
  valiant_gauntlets: {
    color: '#c9ccd4', hand: 'gauntlet', bracer: '#b4b9c4',
    cuff: { color: '#e8c04c', kind: 'flare' },
    knuckle: { color: '#e8ecf2', kind: 'plate' },
  },
  ramwall_gauntlets: {
    color: '#6a7080', hand: 'gauntlet', bracer: '#5e6473',
    cuff: { color: '#7a8294', kind: 'flare' },
    knuckle: { color: '#8a92a4', kind: 'plate' },
  },
  briarplate_gauntlets: {
    color: '#3e4a38', hand: 'gauntlet', bracer: '#374231',
    cuff: { color: '#55644c', kind: 'band' },
    knuckle: { color: '#8a9a6e', kind: 'spikes' },
  },
  sentinel_gauntlets: {
    color: '#55607a', hand: 'gauntlet', bracer: '#4b556c',
    cuff: { color: '#6a7694', kind: 'flare' },
    knuckle: { color: '#d4c28a', kind: 'studs' },
  },
  // The named wardrobe.
  moonbell_wraps: {
    color: '#545a86', hand: 'wrap', bracer: '#4b5178',
    cuff: { color: '#cdd6f0', kind: 'roll' },
    knuckle: { color: '#bfd0ff', kind: 'gem' },
  },
  riftweave_wraps: {
    color: '#2b2438', hand: 'wrap', bracer: '#262032',
    cuff: { color: '#8a6ad8', kind: 'band' },
    knuckle: { color: '#f2ecff', kind: 'gem' },
  },
  adderfang_gloves: {
    color: '#74683c', hand: 'glove', bracer: '#685d36',
    cuff: { color: '#4c5a30', kind: 'band' },
    knuckle: { color: '#e8e2ce', kind: 'claws' },
  },
  broodsilk_gloves: {
    color: '#2c2a34', hand: 'wrap', bracer: '#282631',
    cuff: { color: '#e8e6f0', kind: 'roll' },
  },
  aurochs_gauntlets: {
    color: '#4a3f36', hand: 'gauntlet', bracer: '#41372f',
    cuff: { color: '#b8925c', kind: 'flare' },
    knuckle: { color: '#6e5c4c', kind: 'studs' },
  },
  barrowking_gauntlets: {
    color: '#3a4038', hand: 'gauntlet', bracer: '#343a33',
    cuff: { color: '#c9b25c', kind: 'flare' },
    knuckle: { color: '#ded6b8', kind: 'plate' },
  },
  // The legendary cloth road.
  wintercourt_wraps: {
    color: '#3a5a74', hand: 'wrap', bracer: '#345168',
    cuff: { color: '#dcf0fc', kind: 'roll' },
    knuckle: { color: '#8ad4f0', kind: 'gem' },
  },
  vigil_wraps: {
    color: '#e0d6bc', hand: 'wrap', bracer: '#d2c6a8',
    cuff: { color: '#c9922f', kind: 'band' },
    knuckle: { color: '#ffb054', kind: 'gem' },
  },
  skydancer_wraps: {
    color: '#33465e', hand: 'wrap', bracer: '#2e3f55',
    cuff: { color: '#b08ae8', kind: 'roll' },
    knuckle: { color: '#8ae8c0', kind: 'gem' },
  },
  orrery_wraps: {
    color: '#262e4e', hand: 'wrap', bracer: '#222946',
    cuff: { color: '#c9a23c', kind: 'band' },
    knuckle: { color: '#e0b054', kind: 'gem' },
  },
  // THE GRAND ARCANUM. The flamewrought pair runs char hands under
  // ivory forearms — the fire ends at the wrist by design.
  sunhallow_wraps: {
    color: '#ece6d8', hand: 'glove', bracer: '#ded4bc',
    cuff: { color: '#d4a843', kind: 'roll' },
    knuckle: { color: '#7ec8e8', kind: 'gem' },
  },
  stormsinger_wraps: {
    color: '#2c3a6e', hand: 'wrap', bracer: '#243156',
    cuff: { color: '#ccd4e8', kind: 'band' },
    knuckle: { color: '#66d8f0', kind: 'gem' },
  },
  gloamsight_wraps: {
    color: '#4e5636', hand: 'wrap', bracer: '#434a2e',
    cuff: { color: '#b09346', kind: 'band' },
    knuckle: { color: '#ffb054', kind: 'gem' },
  },
  flamewrought_wraps: {
    color: '#3a2e2a', hand: 'wrap', bracer: '#cfc2a2',
    cuff: { color: '#ddd2b8', kind: 'roll' },
    knuckle: { color: '#ff7a3c', kind: 'gem' },
  },
  duskwarden_wraps: {
    color: '#232838', hand: 'glove', bracer: '#1c2130',
    cuff: { color: '#9a7a44', kind: 'band' },
    knuckle: { color: '#d84052', kind: 'gem' },
  },
  aetherion_wraps: {
    color: '#2e2452', hand: 'wrap', bracer: '#261e44',
    cuff: { color: '#d8dce8', kind: 'roll' },
    knuckle: { color: '#8ce0e8', kind: 'gem' },
  },
  // The legendary leather road: the hunter grips, the hawk talons,
  // the assassin's fingerless cuts.
  hartsong_grips: {
    color: '#33472e', hand: 'glove', bracer: '#2a3b26',
    cuff: { color: '#d8b84c', kind: 'band' },
    knuckle: { color: '#e8e2d0', kind: 'studs' },
  },
  skytalon_talons: {
    color: '#46596e', hand: 'glove', bracer: '#3a4a5c',
    cuff: { color: '#e8ddc0', kind: 'band' },
    knuckle: { color: '#c9a23c', kind: 'claws' },
  },
  cindershade_grips: {
    color: '#332e2c', hand: 'wrap', bracer: '#2a2624',
    cuff: { color: '#8a4a30', kind: 'roll' }, fingerless: true,
  },
  rookfeather_fingers: {
    color: '#2a2e38', hand: 'wrap', bracer: '#232630',
    cuff: { color: '#b8c0cc', kind: 'roll' }, fingerless: true,
  },
  // The legendary plate road.
  stormcrown_gauntlets: {
    color: '#46506e', hand: 'gauntlet', bracer: '#3a4258',
    cuff: { color: '#5c6884', kind: 'flare' },
    knuckle: { color: '#8ab4e8', kind: 'plate' },
  },
  forgeheart_gauntlets: {
    color: '#33302e', hand: 'gauntlet', bracer: '#282523',
    cuff: { color: '#4a443e', kind: 'flare' },
    knuckle: { color: '#ff8a3c', kind: 'studs' },
  },
  wyrmsteel_gauntlets: {
    color: '#2e4438', hand: 'gauntlet', bracer: '#243a2e',
    cuff: { color: '#3e5848', kind: 'flare' },
    knuckle: { color: '#6ee8a0', kind: 'claws' },
  },
  oathgold_gauntlets: {
    // The vow set red at the fist: a crimson gem where the old hand
    // wore one more pale gold — the one drop of the banner's color
    // the gauntlet carries.
    color: '#d4a83e', hand: 'gauntlet', bracer: '#9c7a2c',
    cuff: { color: '#8a6a26', kind: 'flare' },
    knuckle: { color: '#b23138', kind: 'gem' },
  },
  // THE HIGH ROAD: every gauntlet quotes its set's own devices.
  jadeskull_gauntlets: {
    color: '#3e6644', hand: 'gauntlet', bracer: '#35583b',
    cuff: { color: '#c9a23c', kind: 'flare' },
    knuckle: { color: '#c9ccd4', kind: 'studs' },
  },
  fellbone_gauntlets: {
    color: '#d9d2bd', hand: 'gauntlet', bracer: '#c8c0a8',
    cuff: { color: '#6e7a88', kind: 'fur' },
    knuckle: { color: '#e8e2d0', kind: 'spikes' },
  },
  redmarch_gauntlets: {
    // Blackened fists off oxblood bracers; the knuckle gems burn
    // ember — the watch-fire carried to the hands.
    color: '#413339', hand: 'gauntlet', bracer: '#722830',
    cuff: { color: '#9aa0a8', kind: 'flare' },
    knuckle: { color: '#ffb060', kind: 'gem' },
  },
  rimethorn_gauntlets: {
    color: '#2a3040', hand: 'gauntlet', bracer: '#232838',
    cuff: { color: '#3a4256', kind: 'flare' },
    knuckle: { color: '#a8d8ff', kind: 'spikes' },
  },
  palethorn_gauntlets: {
    color: '#b8bec8', hand: 'gauntlet', bracer: '#a4aab6',
    cuff: { color: '#b0703c', kind: 'flare' },
    knuckle: { color: '#8d9299', kind: 'spikes' },
  },
  kingsmane_gauntlets: {
    color: '#e8e4da', hand: 'gauntlet', bracer: '#d4cfc2',
    cuff: { color: '#c9a23c', kind: 'flare' },
    knuckle: { color: '#4a6ad8', kind: 'gem' },
  },
  gatefall_gauntlets: {
    // A splinter of the gate bezel-set past the knuckles: the fist
    // knocks with the door's own glass.
    color: '#3e3560', hand: 'gauntlet', bracer: '#37304f',
    cuff: { color: '#494259', kind: 'flare' },
    knuckle: { color: '#a985ff', kind: 'gem' },
  },
  // THE WORN BOOK: each pair is where its house's motif lands last —
  // the fang, the talon, the rank stud.
  adderking_gloves: {
    // Amber at the wrist and a gold fang laid along each knuckle: the
    // ancestor's raw ivory claws, capped the way the crown's are — a
    // step deeper than the crown's gold on purpose, because at rest
    // both fists hang together at the waist and the pair reads as ONE
    // mass; the brightest gold in the house belongs at the brow.
    color: '#2b3019', hand: 'glove', bracer: '#3c4126',
    cuff: { color: '#e0902c', kind: 'band' },
    knuckle: { color: '#a8863a', kind: 'claws' },
  },
  stormtalon_talons: {
    // Silver at the knuckle, hooked for the stoop — skytalon's gold
    // talons cooled to the house's storm metal, off a cuff wearing
    // the white edge every feather on this rig carries.
    color: '#222b42', hand: 'glove', bracer: '#2b3654',
    cuff: { color: '#eef4ff', kind: 'band' },
    knuckle: { color: '#c8d2e0', kind: 'claws' },
  },
  warvaliant_gauntlets: {
    // The chevron at the cuff is hammered flat and still legible: the
    // tourney pair's bright hand plate re-punched as ranks of brass
    // studs, on an iron vambrace mouth where the gold flare was.
    color: '#514e3f', hand: 'gauntlet', bracer: '#3f3c31',
    cuff: { color: '#5e5b4b', kind: 'flare' },
    knuckle: { color: '#9c8248', kind: 'studs' },
  },
  packlord_grips: {
    // The hand that feeds and the hand that signals are the same
    // hand: a fitted hide glove off a fur cuff — the pelt reaching
    // its last station, wrist after shoulder after throat — with a
    // stitched tooth laid along each knuckle. Bone, not metal: this
    // house forges nothing, it keeps what the pack already had, and
    // the tooth is a full value step off the hide so the fist reads
    // at range without borrowing the crown's bronze.
    color: '#4a3f2d', hand: 'glove', bracer: '#3a3123',
    cuff: { color: '#8a7c62', kind: 'fur' },
    knuckle: { color: '#ddd2b4', kind: 'claws' },
  },
  weirkeeper_gloves: {
    // Open at the fingertip, because a keeper ties knots all day and
    // a line runs through these — the fingerless cut is the whole
    // design, so nothing rides the knuckles (a device there would sit
    // straight on top of the bare fingers). An oiled roll cuff in the
    // set's pale water-green tops a green-black working glove.
    color: '#24504a', hand: 'glove', bracer: '#1d4139',
    cuff: { color: '#7f9a86', kind: 'roll' }, fingerless: true,
  },
  wrightcloth_mitts: {
    // Two layers of linen wound on, a scrap of forgeplate across the
    // back of the hand, and the cuff carrying the mark the whole set
    // is named for: DYE. It is the only cool color anywhere on the
    // wright — the stain a tailor's hands live with, kept to one
    // place so it reads as work and not as trim.
    color: '#8d7d5c', hand: 'wrap', bracer: '#7d6f51',
    cuff: { color: '#41546b', kind: 'roll' },
    knuckle: { color: '#6e6a60', kind: 'plate' },
  },
};

export const OFFHAND_STYLES: Record<string, OffhandStyle> = {
  spiked_buckler: { kind: 'buckler', color: '#8f7449', trim: '#3f4450', boss: '#e4e9f1', spikes: true },
  oak_kiteshield: { kind: 'kite', color: '#79512a', trim: '#c08a4e', emblem: 'chevron' },
  frost_quiver: { kind: 'quiver', color: '#8ac4e8', trim: '#4a6a8a' },
  tome_of_embers: { kind: 'tome', color: '#e8763c', trim: '#6b3a1e' },
  arcane_orb: { kind: 'orb', color: '#8f9ed6', trim: '#c9c4cf' },
  tower_shield: { kind: 'tower', color: '#9aa1ab', trim: '#5d6472', boss: '#cdd4de' },
  // The greatshield class. `kind` only routes them into the shield
  // dialect — each one's real silhouette and art come from its
  // authored SHIELD_STYLES record.
  frostplate_greatshield: { kind: 'tower', color: '#9db6cc', trim: '#dbe9f4', boss: '#eaf7ff' },
  bulwark_bastion: { kind: 'tower', color: '#5a6270', trim: '#9c7c3a', boss: '#d8b76a' },
  sunforged_aegis: { kind: 'tower', color: '#d4a43c', trim: '#f0e2bd', boss: '#fff8e4' },
  gobnail_warboard: { kind: 'buckler', color: '#6b5233', trim: '#66513a', boss: '#9aa1ab', spikes: true },
  wolfjaw_targe: { kind: 'buckler', color: '#7a5a38', trim: '#6a7080', boss: '#565c68', spikes: true },
  bonespur_ward: { kind: 'tower', color: '#d9d2bd', trim: '#4a505c', boss: '#5a616e', spikes: true },
  kingsward: { kind: 'kite', color: '#8a2431', trim: '#d8b76a', boss: '#dfe6f4' },
  dreadforge_thornwall: { kind: 'tower', color: '#3a3d46', trim: '#c9a45e', boss: '#d8b76a', spikes: true },
  // THE SHIELD WAVE (docs/shield-wave-plan.md): kind only routes each
  // one into the shield dialect — silhouette and face come from its
  // authored SHIELD_STYLES record, wall/arm/fist carry included.
  lowhall_breacher: { kind: 'tower', color: '#4a3a30', trim: '#565b66', boss: '#6a707c' },
  legion_doorwall: { kind: 'tower', color: '#3f434e', trim: '#565b68', spikes: true },
  stagheart_palisade: { kind: 'tower', color: '#b09a6e', trim: '#6a5a40', boss: '#8a7458' },
  fellhorn_gate: { kind: 'tower', color: '#a89878', trim: '#4e535e', spikes: true },
  brinehold_carapace: { kind: 'tower', color: '#46655c', trim: '#7ba892', boss: '#dfe3d6', spikes: true },
  wintercourt_rime: { kind: 'buckler', color: '#cfd8d2', trim: '#8fa8b8', boss: '#9ad4e8' },
  nightveil_pinion: { kind: 'tower', color: '#2e3345', trim: '#4a5068' },
  vale_reliquary: { kind: 'kite', color: '#28324f', trim: '#c9d2e0', boss: '#eef4ff' },
  cindermaw_bulwark: { kind: 'tower', color: '#3e3a38', trim: '#5a5248' },
  everwood_crest: { kind: 'kite', color: '#e8e0cc', trim: '#a39072', boss: '#e6f0c2' },
  gatefall_bulwark: { kind: 'tower', color: '#3e3560', trim: '#494259', boss: '#cbb4ff', spikes: true },
  aldarens_gate: { kind: 'tower', color: '#c9d2e4', trim: '#d8b76a', boss: '#e6c36a', spikes: true },
  // The tyrant wore its authored colossus face (shields.ts) from the
  // day it shipped, but no kind routing — worn in the world it fell to
  // the fallback buckler frame. A colossus is a wall: route it tower.
  gilded_tyrant: { kind: 'tower', color: '#b08d3e', trim: '#d8b968', boss: '#6a4e1e', spikes: true },
  hunters_quiver: { kind: 'quiver', color: '#8a6a45', trim: '#3f6b3a' },
  scholars_tome: { kind: 'tome', color: '#4a5a9c', trim: '#c8cee8' },
};

// ---------------------------------------------------------- colorways

/**
 * The colorway law as a record generator: a dye lot reuses its base
 * piece's whole silhouette record and overrides only palette fields.
 * Every override below is intentional art — trims and accents are
 * re-picked per dye, never hue-rotated.
 */
function registerColorways<T>(
  table: Record<string, T>,
  baseId: string,
  dyes: Record<string, Partial<T>>,
): void {
  for (const [key, over] of Object.entries(dyes)) {
    table[`${baseId}_${key}`] = { ...table[baseId]!, ...over };
  }
}

// Thistledown dye lots: every new word takes the dye too (the
// colorway law) — yoke, cord, courses and thread follow the cloth;
// the bloom keeps its own species color per steep, and the seed
// down stays pale under every dye, as down does.
registerColorways(BODY_STYLES, 'thistledown_robe', {
  madder: {
    color: '#a8524a', trim: '#d9b08a', underskirt: '#8a4038',
    pauldronColor: '#a04e46', yoke: { color: '#9a4a42' },
    broidery: { thread: '#e0c4a4', sprig: '#7a8a56' },
    sashcord: { color: '#9a7050', tassel: '#e8d0c0' },
    hemcourse: { colors: ['#9c4c44', '#8a4038'] },
    driftdown: { seed: '#f0e0d4' },
  },
  woad: {
    color: '#54688e', trim: '#c9c4b0', underskirt: '#42527a',
    pauldronColor: '#506388', yoke: { color: '#4e6084' },
    broidery: { thread: '#c9c4b0', sprig: '#6e8a5a' },
    sashcord: { color: '#8a8468', tassel: '#dcdcc8' },
    hemcourse: { colors: ['#4e6084', '#42527a'] },
    driftdown: { seed: '#e8ecdc' },
  },
  bracken: {
    color: '#8a6f4a', trim: '#c9b088', underskirt: '#6e5738',
    pauldronColor: '#856b46', yoke: { color: '#816844' },
    broidery: { thread: '#c9b088', sprig: '#6e7a3a' },
    sashcord: { color: '#8a7448', tassel: '#e0d0b0' },
    hemcourse: { colors: ['#816844', '#6e5738'] },
    driftdown: { seed: '#eee0c4' },
  },
});
registerColorways(HELM_STYLES, 'thistledown_hood', {
  madder: { color: '#a8524a', trim: '#d9b08a', bloom: { calyx: '#7a8a56', down: '#d492a0', seed: '#f0e0d4' } },
  woad: { color: '#54688e', trim: '#c9c4b0', bloom: { calyx: '#6e8a5a', down: '#9aa8d8', seed: '#e8ecdc' } },
  bracken: { color: '#8a6f4a', trim: '#c9b088', bloom: { calyx: '#6e7a3a', down: '#d0b070', seed: '#eee0c4' } },
});
registerColorways(LEG_STYLES, 'thistledown_skirts', {
  madder: { thigh: '#8a4038' },
  woad: { thigh: '#42527a' },
  bracken: { thigh: '#6e5738' },
});
registerColorways(BOOT_STYLES, 'thistledown_slippers', {
  madder: { color: '#8a4038' },
  woad: { color: '#42527a' },
  bracken: { color: '#6e5738' },
});

// Mothwing dye lots: each lot is its own SPECIES, not a tint — the
// luna grows its long hindwing streamers, the dusk's eye-spots wake
// as crescent moons, the ember's scallops keep the fire. Pile, mane,
// plumes and eyes all follow the moth.
registerColorways(BODY_STYLES, 'mothwing_robe', {
  luna: {
    color: '#9ab88e', trim: '#e2eecc', underskirt: '#7a9670', motes: '#d8eec0',
    pauldronColor: '#94b288', pauldronTrim: '#e8f2d4', collarColor: '#c8dcb4',
    wingdrape: { color: '#7a986e', spot: '#e2eecc', tails: '#d8eec0' },
  },
  dusk: {
    color: '#7a6280', trim: '#d0c0dc', underskirt: '#615068', motes: '#c8b4d8',
    pauldronColor: '#746078', pauldronTrim: '#dcccec', collarColor: '#a892b0',
    wingdrape: { color: '#5a4660', spot: '#d0c0dc', crescent: '#e6d8f4' },
  },
  ember: {
    color: '#a8705c', trim: '#e8c8a0', underskirt: '#8a5a48', motes: '#e8b088',
    pauldronColor: '#a06a54', pauldronTrim: '#f0d4ac', collarColor: '#cc9a78',
    wingdrape: { color: '#865442', spot: '#e8c8a0', emberEdge: '#ff9a4a' },
  },
});
registerColorways(HELM_STYLES, 'mothwing_cowl', {
  luna: {
    color: '#9ab88e', trim: '#e2eecc', antennae: { color: '#e2eecc' },
    ruff: { color: '#b8ccaa' }, motheyes: { color: '#d4f4c4' },
  },
  dusk: {
    color: '#7a6280', trim: '#d0c0dc', antennae: { color: '#d0c0dc' },
    ruff: { color: '#94809c' }, motheyes: { color: '#c9a8f0' },
  },
  ember: {
    color: '#a8705c', trim: '#e8c8a0', antennae: { color: '#e8c8a0' },
    ruff: { color: '#c09078' }, motheyes: { color: '#ffb054' },
  },
});
registerColorways(LEG_STYLES, 'mothwing_skirts', {
  luna: { thigh: '#7a9670' },
  dusk: { thigh: '#615068' },
  ember: { thigh: '#8a5a48' },
});
registerColorways(BOOT_STYLES, 'mothwing_slippers', {
  luna: { color: '#7a9670', fur: { color: '#b8ccaa' } },
  dusk: { color: '#615068', fur: { color: '#94809c' } },
  ember: { color: '#8a5a48', fur: { color: '#c09078' } },
});

// Dawnsworn dye lots: the sun device keeps its gold except at noon,
// when it burns red on bleached white; eclipse rings gold on charcoal.
// Dawnsworn dye lots: each lot is its own SKY, not a tint — duskvow
// runs the daybreak BACKWARD (sworn to the other horizon), highnoon
// stands the full disc high and white-hot, eclipse hangs the dark
// stone in its gold ring. Collar, medals, crests and bands follow.
registerColorways(BODY_STYLES, 'dawnsworn_robe', {
  duskvow: {
    color: '#9a6a86', trim: '#e0b0c0', sash: '#6e4860', underskirt: '#7e5670',
    stole: { color: '#6e4860', trim: '#e0b0c0' },
    dawnbands: { colors: ['#e0b0c0', '#b87a96', '#6e4860'], phase: 'setting' },
    raycollar: { color: '#d97a9a' }, sunmedals: { color: '#d97a9a' },
    pauldronColor: '#8d607a', pauldronTrim: '#d97a9a',
  },
  highnoon: {
    color: '#eae4d2', trim: '#c04a3a', sash: '#b0703c', underskirt: '#c8c2b0',
    stole: { color: '#c04a3a', trim: '#eae4d2' },
    dawnbands: { colors: ['#e05438', '#d98a4a', '#c8b890'], phase: 'noon' },
    raycollar: { color: '#c04a3a' }, sunmedals: { color: '#e05438' },
    pauldronColor: '#c8b890', pauldronTrim: '#e05438',
  },
  eclipse: {
    color: '#4a4550', trim: '#d4a43c', sash: '#38343e', underskirt: '#3a3642',
    stole: { color: '#38343e', trim: '#d4a43c' },
    dawnbands: { colors: ['#d4a43c', '#8a6a34', '#5a5060'], phase: 'eclipse' },
    raycollar: { color: '#d4a43c' }, sunmedals: { color: '#d4a43c' },
    pauldronColor: '#3a3642', pauldronTrim: '#d4a43c',
  },
});
// The dawnsworn lots each wear their OWN head kind — the colorway
// law bends here by design: same five-piece record, but the sky
// changes the garment itself. Four vigils, one family.
registerColorways(HELM_STYLES, 'dawnsworn_hood', {
  duskvow: {
    color: '#82566e', trim: '#e0b0c0', kind: 'vespercowl',
    sundisc: { color: '#d97a9a', phase: 'setting' },
  },
  highnoon: {
    color: '#eae4d2', trim: '#c04a3a', kind: 'zenithhat',
    sundisc: { color: '#e05438', phase: 'noon' },
  },
  eclipse: {
    color: '#332e3c', trim: '#d4a43c', kind: 'umbrahood',
    sundisc: { color: '#38343e', phase: 'eclipse', ring: '#e8c04c' },
    emberEyes: { color: '#e8c04c' },
  },
});
registerColorways(LEG_STYLES, 'dawnsworn_skirts', {
  duskvow: { thigh: '#7e5670' },
  highnoon: { thigh: '#c8c2b0' },
  eclipse: { thigh: '#3a3642' },
});
registerColorways(BOOT_STYLES, 'dawnsworn_slippers', {
  duskvow: { color: '#7e5670', cuff: { color: '#e0b0c0' }, toe: '#d97a9a' },
  highnoon: { color: '#c8c2b0', cuff: { color: '#c04a3a' }, toe: '#e05438' },
  eclipse: { color: '#3a3642', cuff: { color: '#d4a43c' }, toe: '#d4a43c' },
});

// THE FEN COURT'S FOUR WATERS: each lot is its own aspect of the
// fen and wears its OWN head — the colorway law bends by design
// (the FOUR VIGILS precedent): mirebloom the orchid, rustsedge the
// darter's sedge hat, graymist the heron. Every color-bearing word
// restates, and each lot carries its own bespoke sub-word.
registerColorways(BODY_STYLES, 'fenwalker_robe', {
  mirebloom: {
    color: '#5e4260', trim: '#e0b0d8', underskirt: '#48334a',
    pauldron: 'orchidpaul', pauldronColor: '#553c57', pauldronTrim: '#e0b0d8',
    capelet: { color: '#523a54', hem: 'point', trim: '#a878a0' },
    mirehem: { water: '#2e2032', ripple: '#e8b0e0', reed: '#48334a' },
    wispcourt: { color: '#e8b0e0' },
    reedgirdle: { cord: '#8a6a88', charm: '#e8c8e8' },
    petalfall: { color: '#f0a8d0' },
  },
  rustsedge: {
    color: '#8a5a36', trim: '#e8cc90', underskirt: '#6a4428',
    pauldron: 'cattailpaul', pauldronColor: '#7e5230', pauldronTrim: '#e8cc90',
    capelet: { color: '#744b2c', hem: 'point', trim: '#b8823c' },
    mirehem: { water: '#3e2818', ripple: '#f0c078', reed: '#5c3c24' },
    wispcourt: { color: '#f0c078' },
    reedgirdle: { cord: '#a87c48', charm: '#f0dcae' },
    seedheads: { head: '#5e3c22', fluff: '#f0e4cc' },
  },
  graymist: {
    color: '#6e7a76', trim: '#d8e0dc', underskirt: '#57625e',
    pauldron: 'heronwing', pauldronColor: '#65716d', pauldronTrim: '#d8e0dc',
    capelet: { color: '#5e6a66', hem: 'point', trim: '#98a49c' },
    mirehem: { water: '#333e3b', ripple: '#d0ecdc', reed: '#48524e' },
    wispcourt: { color: '#d0ecdc' },
    reedgirdle: { cord: '#98a49c', charm: '#d8e8e0' },
    mistwrap: { color: '#eaf2ee' },
  },
});
registerColorways(HELM_STYLES, 'fenwalker_hood', {
  mirebloom: {
    color: '#5e4260', trim: '#e0b0d8', kind: 'bloomcrown',
    bloomheart: { color: '#f0a8d0', dew: '#f4e0f4', tails: '#f0c8e4' },
  },
  rustsedge: {
    color: '#a06840', trim: '#6a4428', kind: 'sedgehat',
    darter: { body: '#b84a32', wing: '#f0e4c8' },
  },
  graymist: {
    color: '#6e7a76', trim: '#d8e0dc', kind: 'heroncowl',
    plumecrest: { color: '#525c58', tip: '#2a3230' },
  },
});
registerColorways(LEG_STYLES, 'fenwalker_skirts', {
  mirebloom: { thigh: '#48334a' },
  rustsedge: { thigh: '#6a4428' },
  graymist: { thigh: '#57625e' },
});
registerColorways(BOOT_STYLES, 'fenwalker_slippers', {
  mirebloom: { color: '#48334a', wrap: { color: '#8a6a88' }, toe: '#e8b0e0' },
  rustsedge: { color: '#6a4428', wrap: { color: '#a87c48' }, toe: '#f0c078' },
  graymist: { color: '#57625e', wrap: { color: '#98a49c' }, toe: '#d0ecdc' },
});

// Stormwoven dye lots — THE STORM COURT: each weather wears its OWN
// head and its OWN shoulders (lots override `kind` AND `pauldron`,
// the vigils + leviathans laws), and every color-bearing word is
// restated whole so no lot wears stale weather.
registerColorways(BODY_STYLES, 'stormwoven_robe', {
  thunderhead: {
    color: '#3a3f4e', trim: '#e8c04c', mantle: '#2e323e', underskirt: '#2e323e',
    pauldron: 'anvilpaul', pauldronColor: '#333848', pauldronTrim: '#e8c04c',
    thunderbank: { color: '#333846', glow: '#e8c04c' },
    boltbrand: { color: '#e8c04c' },
    rainhem: { color: '#8898b8' },
    staticcourt: { color: '#e8c04c' },
    chargebeads: { cord: '#2e323e', bead: '#e8c04c' },
    groundflash: { color: '#fff2c0' },
  },
  sunshower: {
    color: '#c9a85c', trim: '#f4ecd0', mantle: '#a8894a', underskirt: '#a8894a',
    pauldron: 'showerpaul', pauldronColor: '#b2934e', pauldronTrim: '#f4ecd0',
    thunderbank: { color: '#b2934e', glow: '#fff0b0' },
    boltbrand: { color: '#fff0b0' },
    rainhem: { color: '#f4ecd0' },
    staticcourt: { color: '#fff0b0' },
    chargebeads: { cord: '#a8894a', bead: '#fff0b0' },
    sunpatch: { color: '#ffe9a8' },
  },
  aurora: {
    // THE AURORA SOVEREIGN: the polar night worn walking. The
    // ground is near-midnight (a dancing sky only reads against
    // dark — value steps widened, the anvilcrown lesson), frost
    // silver the one bright cold edge, and the lights themselves
    // live only as DRAWN devices. The robe is the WATER COLUMN
    // pattern: the storm's bolt words are explicitly removed —
    // this weather seceded from the discharge — and the column is
    // re-clothed in its own registers: horizon (helm mantle),
    // streams (hips), great curtain (skirt), snowline (hem).
    color: '#1d2f3a', trim: '#9fbdb6', mantle: '#17252f', underskirt: '#141f29',
    pauldron: 'aurorabind', pauldronColor: '#152836', pauldronTrim: '#c8e4dc',
    thunderbank: undefined,
    boltbrand: undefined,
    rainhem: undefined,
    staticcourt: undefined,
    chargebeads: undefined,
    stormshroud: undefined,
    auroraband: { colors: ['#7df2b0', '#54dcd0', '#b08cf0'] },
    starfield: { color: '#e8f4ee' },
    frosthem: { color: '#c8e4dc', glow: '#7df2b0' },
  },
});
registerColorways(HELM_STYLES, 'stormwoven_hood', {
  thunderhead: {
    color: '#3a3f4e', trim: '#8898b8', kind: 'thunderhat',
    boltjewel: { color: '#e8c04c', seam: '#e8c04c' },
  },
  sunshower: {
    color: '#c9a85c', trim: '#f4ecd0', kind: 'showerhat',
    showerluck: { sun: '#ffdf80', bead: '#eaf4ff' },
    prismarc: { colors: ['#e8a0a0', '#ffe9a8', '#a0d8c8'] },
  },
  aurora: {
    color: '#1d2f3a', trim: '#c8e4dc', kind: 'coronacowl',
    corona: { colors: ['#7df2b0', '#54dcd0', '#b08cf0'], star: '#e8f4ee' },
  },
});
registerColorways(LEG_STYLES, 'stormwoven_skirts', {
  thunderhead: { thigh: '#2e323e' },
  sunshower: { thigh: '#a8894a' },
  aurora: { thigh: '#131f28' },
});
registerColorways(BOOT_STYLES, 'stormwoven_slippers', {
  thunderhead: { color: '#2e323e', cuff: { color: '#e8c04c' } },
  sunshower: { color: '#a8894a', cuff: { color: '#f4ecd0' } },
  aurora: { color: '#131f28', cuff: { color: '#c8e4dc' } },
});

// Tidecaller dye lots — THE TIDE COURT: each water wears its OWN
// head and its OWN shoulders (lots override `kind` AND `pauldron`),
// and every color-bearing word is restated whole so no lot wears
// stale water.
registerColorways(BODY_STYLES, 'tidecaller_robe', {
  abyss: {
    color: '#2a3352', trim: '#8ad4e0', underskirt: '#1a2136',
    pauldron: 'deeppaul', pauldronColor: '#232c48', pauldronTrim: '#46527a',
    medusae: { bell: '#4a5680', lume: '#8af2e0' },
    jellyfringe: { color: '#3a4468', lume: '#8af2e0' },
    capelet: { color: '#232c48', hem: 'scallop', trim: '#46527a' },
    foamtiers: { color: '#323e60' }, pearlstrand: { color: '#bfeee8' },
    streamwrap: { color: '#1a2136', foam: '#8af2e0' },
    tidemoon: { color: '#bfeee8' },
    luremotes: { color: '#8af2e0' },
  },
  darkwater: {
    // THE DARK WATERS: near-black murk ground, drowned-slate working
    // planes, cold silver the one bright edge — and the neon deep
    // blue as the living word. The near-black lot widens its value
    // steps (the anvilcrown lesson). The robe is THE WATER COLUMN:
    // strata veils + dissolving hem + the eddy — so the court's
    // shared capelet/surf/currents are EXPLICITLY removed (spread
    // merge honors an undefined override).
    color: '#16223a', trim: '#8fb2d6', underskirt: '#070d18',
    pauldron: 'darkwells', pauldronColor: '#182238', pauldronTrim: '#425c85',
    capelet: undefined,
    foamtiers: undefined,
    streamwrap: undefined,
    pearlstrand: { color: '#c8dcec' },
    tidemoon: { color: '#d6e6f4' },
    undertow: { water: '#2456c8', neon: '#7fd4ff' },
    depthveils: { colors: ['#233754', '#1c2c47', '#14213a', '#0d172c'] },
    sinkhem: { color: '#0d172c', deep: '#070d18' },
    eddyring: { water: '#2456c8', neon: '#7fd4ff' },
  },
  maelstrom: {
    color: '#4a6360', trim: '#dce8e4', underskirt: '#374a48',
    pauldron: 'vortexpaul', pauldronColor: '#425855', pauldronTrim: '#98aca6',
    capelet: { color: '#40534f', hem: 'scallop', trim: '#98aca6' },
    foamtiers: { color: '#54706a' }, pearlstrand: { color: '#dce8e4' },
    streamwrap: { color: '#374a48', foam: '#eaf2ee' },
    tidemoon: { color: '#dce8e4' },
    spindrift: { color: '#eaf2ee' },
  },
});
registerColorways(HELM_STYLES, 'tidecaller_hood', {
  abyss: {
    color: '#2a3352', trim: '#8ad4e0', kind: 'depthcrown',
    deeplure: { stalk: '#5a6896', glow: '#8af2e0' },
    lumefreckles: { color: '#8af2e0' },
    jellyveil: { color: '#5a6896' },
    bellcrown: { bell: '#454f7c', lume: '#8af2e0' },
  },
  darkwater: {
    color: '#1e2c40', trim: '#8fb2d6', kind: 'murkcowl',
    ripseam: { water: '#2456c8', neon: '#7fd4ff' },
    drownline: { color: '#7fd4ff' },
  },
  maelstrom: {
    color: '#4a6360', trim: '#dce8e4', kind: 'maelcowl',
    spiralwrap: { color: '#2e3d3a' },
    spume: { color: '#eaf2ee' },
  },
});
registerColorways(LEG_STYLES, 'tidecaller_skirts', {
  abyss: { thigh: '#1e2740' },
  darkwater: { thigh: '#0e1524' },
  maelstrom: { thigh: '#374a48' },
});
registerColorways(BOOT_STYLES, 'tidecaller_slippers', {
  abyss: { color: '#1a2136', cuff: { color: '#8ad4e0' } },
  darkwater: { color: '#0e1524', cuff: { color: '#8fb2d6' } },
  maelstrom: { color: '#374a48', cuff: { color: '#dce8e4' } },
});

// Hareswift dye lots: the fur stays a coat, the ear tips stay black,
// the waybill keeps its seal — a hare is a hare in any season, and a
// courier is never off duty. Every color-bearing word restates.
registerColorways(BODY_STYLES, 'hareswift_jerkin', {
  clover: {
    color: '#7a9a58', trim: '#4e6a38', metal: '#42562e',
    windmantle: { color: '#6c8a4e', under: '#465c34', lining: '#e8f0d8' },
    windtabs: { color: '#4e6a38' },
    luckcharm: { foot: '#e8f0d8', cord: '#42562e' },
    slipstream: { color: '#e8f0d8' },
    belt: { color: '#42562e', buckle: '#c9a23c' },
    satchel: { color: '#5c7a42', strap: '#42562e' },
    streamers: { color: '#e0c860' },
  },
  snowmelt: {
    color: '#cfd2ca', trim: '#9aa096', metal: '#82887e',
    windmantle: { color: '#bcc0b6', under: '#8e948a', lining: '#f4f4ee' },
    windtabs: { color: '#9aa096' },
    luckcharm: { foot: '#f4f4ee', cord: '#82887e' },
    slipstream: { color: '#f4f4ee' },
    belt: { color: '#82887e', buckle: '#b0b6be' },
    satchel: { color: '#b0b4aa', strap: '#82887e' },
    streamers: { color: '#8fa8c8' },
  },
  sorrel: {
    color: '#a86a48', trim: '#6e4530', metal: '#5a3826',
    windmantle: { color: '#96593c', under: '#644028', lining: '#e8dcc4' },
    windtabs: { color: '#6e4530' },
    luckcharm: { foot: '#e8dcc4', cord: '#5a3826' },
    slipstream: { color: '#e8dcc4' },
    belt: { color: '#5a3826', buckle: '#c9a23c' },
    satchel: { color: '#8a5638', strap: '#5a3826' },
    streamers: { color: '#e8dcc0' },
  },
});
registerColorways(HELM_STYLES, 'hareswift_hood', {
  clover: {
    color: '#7a9a58', trim: '#4e6a38',
    ears: { color: '#8ab868', tall: true, tip: '#3a4a2c' },
    waybill: { color: '#e8e4d0', seal: '#b84a32' },
  },
  snowmelt: {
    color: '#cfd2ca', trim: '#9aa096',
    ears: { color: '#e0e2da', tall: true, tip: '#4a4038' },
    waybill: { color: '#f4f4ee', seal: '#a84a44' },
  },
  sorrel: {
    color: '#a86a48', trim: '#6e4530',
    ears: { color: '#b87e58', tall: true, tip: '#3a2c24' },
    waybill: { color: '#e8dcc0', seal: '#8a2e24' },
  },
});
registerColorways(LEG_STYLES, 'hareswift_chaps', {
  clover: { thigh: '#7a9a58', shin: '#62804a', kneeColor: '#4e6a38', hock: { color: '#e8f0d8' } },
  snowmelt: { thigh: '#cfd2ca', shin: '#b0b4aa', kneeColor: '#9aa096', hock: { color: '#f4f4ee' } },
  sorrel: { thigh: '#a86a48', shin: '#8a5638', kneeColor: '#6e4530', hock: { color: '#e8dcc4' } },
});
registerColorways(BOOT_STYLES, 'hareswift_boots', {
  clover: { color: '#62804a', fur: { color: '#e8f0d8' } },
  snowmelt: { color: '#b0b4aa', fur: { color: '#f4f4ee' } },
  sorrel: { color: '#8a5638', fur: { color: '#e8dcc4' } },
});

// Kingfisher dye lots — THE FOUR FISHERS: the FOUR VIGILS law on
// leather. Each lot re-tans the WHOLE fish AND wears its own head:
// the riverking's finhelm, the reed angler under its breathing lure,
// the storm-fisher behind the pale beak, the gold dart bare-faced.
// THE LURE IS ALWAYS WARM — bait must contrast the water (sundart's
// runs deep ember on the pale gold, the palethorn law).
registerColorways(BODY_STYLES, 'kingfisher_jerkin', {
  reedmace: {
    color: '#2c4434', trim: '#c8d8b0', metal: '#1e3024',
    pauldron: 'escalight' as const, pauldronColor: '#243a2c', pauldronTrim: '#c8d8b0',
    scalecoat: { color: '#35543c', edge: '#4e7050', sheen: '#c8d8b0' },
    hookline: { line: '#7a8a72', hook: '#c8d8b0', lure: '#ffb054' },
    belt: { color: '#1e3024', buckle: '#c8d8b0' },
  },
  stormgull: {
    color: '#46525c', trim: '#e2eaee', metal: '#323c44',
    pauldron: 'krakengrip' as const, pauldronColor: '#3c4852', pauldronTrim: '#e2eaee',
    scalecoat: { color: '#525f6a', edge: '#6e7e8a', sheen: '#e2eaee' },
    hookline: { line: '#9aa6ae', hook: '#e2eaee', lure: '#ffb054' },
    belt: { color: '#323c44', buckle: '#e2eaee' },
  },
  sundart: {
    color: '#b0802e', trim: '#f4e8c8', metal: '#8a6828',
    pauldron: 'sailfan' as const, pauldronColor: '#a0742a', pauldronTrim: '#2f7a8a',
    scalecoat: { color: '#bc8c34', edge: '#d8a848', sheen: '#f4e8c8' },
    hookline: { line: '#8a7a52', hook: '#f4e8c8', lure: '#e05820' },
    belt: { color: '#8a6828', buckle: '#f4e8c8' },
  },
});
registerColorways(HELM_STYLES, 'kingfisher_hood', {
  reedmace: {
    color: '#2c4434', trim: '#c8d8b0', kind: 'anglerhood',
    lure: { color: '#ffb054' },
  },
  stormgull: {
    color: '#46525c', trim: '#e2eaee', kind: 'krakencowl',
  },
  sundart: {
    color: '#b0802e', trim: '#f4e8c8', kind: 'marlincrest',
    divecrest: { color: '#2f7a8a', flash: '#f4e8c8' },
  },
});
registerColorways(LEG_STYLES, 'kingfisher_chaps', {
  reedmace: {
    thigh: '#2c4434', shin: '#243a2c',
    wader: { color: '#182618', rim: '#c8d8b0' },
    calffin: { color: '#2c4434', edge: '#7a9a72' },
  },
  stormgull: {
    thigh: '#46525c', shin: '#3c4852',
    wader: { color: '#2c343c', rim: '#e2eaee' },
    calffin: { color: '#46525c', edge: '#8a99a4' },
  },
  sundart: {
    thigh: '#b0802e', shin: '#a0742a',
    wader: { color: '#6e5220', rim: '#f4e8c8' },
    calffin: { color: '#8a6828', edge: '#5a8a94' },
  },
});
registerColorways(BOOT_STYLES, 'kingfisher_boots', {
  reedmace: { color: '#182618', toe: '#c8d8b0', cuff: { color: '#35543c' } },
  stormgull: { color: '#2c343c', toe: '#e2eaee', cuff: { color: '#525f6a' } },
  sundart: { color: '#6e5220', toe: '#f4e8c8', cuff: { color: '#bc8c34' } },
});

// Cutpurse dye lots: the coin is the tell — brass on umber and
// oxblood, silver in the gutter, pale moon-metal after dark.
// Cutpurse lots: THE FOUR SHADOWS — each dye lot is a guild OFFICE.
// Lots override `kind` AND `pauldron` (the leviathan law), and every
// shoulder pair is asymmetric: one shoulder for the guild, one for
// the work.
registerColorways(BODY_STYLES, 'cutpurse_jerkin', {
  // THE TETHER IS THE PURSE'S ALONE: the other three offices KILL
  // the inherited coin strand (explicit undefined through the
  // spread) and wear their own chest — a shared banding across four
  // masters reads as a uniform, and the guild does not do uniforms.
  alleyrat: {
    color: '#5c5c56', trim: '#b0b6be', metal: '#8a8e96',
    pauldron: 'grapnel', pauldronColor: '#4a4a44', pauldronTrim: '#b0b6be',
    pauldronScale: 1.14,
    yoke: { color: '#4a4a44' }, lace: '#3e3e38',
    belt: { color: '#3e3e38', buckle: '#b0b6be' },
    cointether: undefined,
    prybar: { color: '#6a6e76' },
    cutkit: { pouch: '#45453e', blade: '#c0c6ce', coin: '#b0b6be', glint: '#ffffff' },
    keyring: { ring: '#6a6e76', keys: '#c0c6ce', glint: '#ffffff' },
  },
  moonless: {
    color: '#33303c', trim: '#a8b0cc', metal: '#5c5a6e',
    pauldron: 'duskmantle', pauldronColor: '#2a2733', pauldronTrim: '#a8b0cc',
    pauldronScale: 1.16,
    yoke: { color: '#28252f' }, lace: '#201d28',
    belt: { color: '#201d28', buckle: '#a8b0cc' },
    cointether: undefined,
    // The sash body must step clear of the jerkin or only its
    // thread survives — a floating silver diagonal is the sash sin.
    nightsash: { color: '#1b1922', thread: '#a8b0cc' },
    cutkit: { pouch: '#262330', blade: '#8890ac', coin: '#a8b0cc', glint: '#e8ecff' },
    smokeflasks: { glass: '#1e1b26', cork: '#6e6050', wisp: '#a8b0cc' },
  },
  // THE VERDICT: the Knife re-founded. Near-black charcoal-plum
  // layers, and everywhere the cloth is CUT the crimson lining
  // shows — the armor bleeds by design. The Purse's gold is GONE
  // (brass buys silence; the Knife never pays); the only metal is
  // blackened steel, and the only warmth is red.
  redhand: {
    // Trim runs DEEP blood, not guild crimson — the jerkin's own
    // edging furniture must whisper so the cords, linings, mask and
    // hands keep the bright red to themselves.
    color: '#382c33', trim: '#6e1f1a', metal: '#4b4752',
    pauldron: 'razorcrest', pauldronColor: '#241c22', pauldronTrim: '#6e6a78',
    pauldronScale: 1.16,
    yoke: { color: '#2b222a' }, lace: '#1f181d',
    belt: { color: '#1f181d', buckle: '#4b4752' },
    cointether: undefined,
    // The Knife is not a purse-snatcher — the kit dies with the
    // office (explicit undefined kills the inherited word).
    cutkit: undefined,
    bloodshroud: { cloth: '#2b222a', lining: '#a83228', edge: '#d04434' },
    redharness: { cord: '#a83228', knot: '#6e1f1a' },
    writkit: { case: '#1f181d', seal: '#6e1f1a', ribbon: '#a83228' },
    tallycord: { cord: '#a83228', knot: '#6e1f1a' },
  },
});
registerColorways(HELM_STYLES, 'cutpurse_cowl', {
  alleyrat: {
    color: '#5c5c56', trim: '#b0b6be', kind: 'latchhood',
    latch: { band: '#4c5058', keys: '#c0c6ce', wrap: '#45453e' },
  },
  moonless: {
    color: '#33303c', trim: '#a8b0cc', kind: 'veilwrap',
    slitglow: { color: '#cfd8ff' },
  },
  redhand: {
    // THE MASTER'S GRIP: ink lacquer casque, no hood, no cloth —
    // and the guild's own mark clamped over the face.
    color: '#241c22', trim: '#a83228', kind: 'gripmask',
    grip: { hand: '#b8382a', dark: '#8e2a22', ember: '#e8764e' },
  },
});
registerColorways(LEG_STYLES, 'cutpurse_leggings', {
  alleyrat: { thigh: '#5c5c56', shin: '#4a4a44', kneeColor: '#767670', pickroll: { color: '#45453e', glint: '#b0b6be' } },
  // The Unseen carries no picks and the Knife carries no picks — an
  // explicit undefined KILLS the inherited roll (spread law).
  moonless: { thigh: '#33303c', shin: '#28252f', kneeColor: '#4e4a5c', pickroll: undefined, shadewrap: { color: '#201d28', tie: '#a8b0cc' } },
  redhand: { thigh: '#382c33', shin: '#2b222a', kneeColor: '#4b4752', pickroll: undefined, thighsheath: { sheath: '#1f181d', pommel: '#8a8e96' } },
});
registerColorways(BOOT_STYLES, 'cutpurse_boots', {
  alleyrat: { color: '#4a4a44', cuff: { color: '#767670' } },
  moonless: { color: '#28252f', cuff: { color: '#4e4a5c' } },
  redhand: { color: '#2b222a', cuff: { color: '#463840' } },
});

// Trapline dye lots: the bone toggles and snare cords stay bone —
// only the country the line runs through changes.
registerColorways(BODY_STYLES, 'trapline_jerkin', {
  juniper: {
    color: '#4e6a52', trim: '#34483a', pauldronColor: '#a8c0aa',
    belt: { color: '#34483a', buckle: '#d8cfae' },
    snareline: { strap: '#34483a', bone: '#d8cfae', wire: '#8a9a88' },
  },
  riverclay: {
    color: '#96604c', trim: '#6a4034', pauldronColor: '#c9ab98',
    belt: { color: '#6a4034', buckle: '#d8cfae' },
    snareline: { strap: '#6a4034', bone: '#d8cfae', wire: '#9a8a78' },
  },
  nightsnare: {
    color: '#3e4450', trim: '#2c303a', pauldronColor: '#9aa2b0',
    belt: { color: '#2c303a', buckle: '#b8c0cc' },
    snareline: { strap: '#2c303a', bone: '#b8c0cc', wire: '#7a828e' },
  },
});
registerColorways(HELM_STYLES, 'trapline_hood', {
  juniper: { color: '#4e6a52', trim: '#34483a', ruff: { color: '#a8c0aa' } },
  riverclay: { color: '#96604c', trim: '#6a4034', ruff: { color: '#c9ab98' } },
  nightsnare: { color: '#3e4450', trim: '#2c303a', ruff: { color: '#9aa2b0' } },
});
registerColorways(LEG_STYLES, 'trapline_chaps', {
  juniper: { thigh: '#4e6a52', shin: '#3e5642', kneeColor: '#34483a', shinlace: { color: '#d8cfae' } },
  riverclay: { thigh: '#96604c', shin: '#7a4e3c', kneeColor: '#6a4034', shinlace: { color: '#d8cfae' } },
  nightsnare: { thigh: '#3e4450', shin: '#333844', kneeColor: '#2c303a', shinlace: { color: '#b8c0cc' } },
});
registerColorways(BOOT_STYLES, 'trapline_boots', {
  juniper: { color: '#3e5642', wrap: { color: '#d8cfae' } },
  riverclay: { color: '#7a4e3c', wrap: { color: '#d8cfae' } },
  nightsnare: { color: '#333844', wrap: { color: '#b8c0cc' } },
});

// Emberfox dye lots: whole pelts, not tints — silver, shadow and dawn
// foxes each keep the dark socks and the pale-tipped tail.
// Each lot keeps the fox WHOLE: pelt, bib, socks and the ember all
// requench together — the silver fox burns cold, the dawn fox deep.
registerColorways(BODY_STYLES, 'emberfox_jerkin', {
  silverfox: {
    color: '#8a8e96', trim: '#ececf0', pauldronColor: '#a4a8b0',
    collarColor: '#ececf0', foxbib: { color: '#ececf0' },
    tail: { color: '#8a8e96', tip: '#ececf0', ember: '#a8d8ff' },
    belt: { color: '#5e626c', buckle: '#26242c' },
  },
  shadowfox: {
    color: '#3a3640', trim: '#b8b4c0', pauldronColor: '#4c4856',
    collarColor: '#b8b4c0', foxbib: { color: '#b8b4c0' },
    tail: { color: '#3a3640', tip: '#b8b4c0', ember: '#ff9a3c' },
    belt: { color: '#232028', buckle: '#b8b4c0' },
  },
  dawnfox: {
    color: '#d8b878', trim: '#f4ecd8', pauldronColor: '#e0c890',
    collarColor: '#f4ecd8', foxbib: { color: '#f4ecd8' },
    tail: { color: '#d8b878', tip: '#f4ecd8', ember: '#e06820' },
    belt: { color: '#8a6f42', buckle: '#6e5838' },
  },
});
registerColorways(HELM_STYLES, 'emberfox_hood', {
  silverfox: {
    color: '#8a8e96', trim: '#ececf0',
    pelt: { color: '#8a8e96', dark: '#26242c', pale: '#ececf0', ember: '#a8d8ff' },
  },
  shadowfox: {
    color: '#3a3640', trim: '#b8b4c0',
    pelt: { color: '#3a3640', dark: '#16141c', pale: '#b8b4c0', ember: '#ff9a3c' },
  },
  dawnfox: {
    color: '#d8b878', trim: '#f4ecd8',
    pelt: { color: '#d8b878', dark: '#6e5838', pale: '#f4ecd8', ember: '#e06820' },
  },
});
registerColorways(LEG_STYLES, 'emberfox_leggings', {
  silverfox: { thigh: '#8a8e96', shin: '#5e626c', sock: { color: '#26242c', tie: '#a8d8ff' } },
  shadowfox: { thigh: '#3a3640', shin: '#2c2934', sock: { color: '#16141c', tie: '#ff9a3c' } },
  dawnfox: { thigh: '#d8b878', shin: '#b09258', sock: { color: '#6e5838', tie: '#e06820' } },
});
registerColorways(BOOT_STYLES, 'emberfox_boots', {
  silverfox: { color: '#33303a', fur: { color: '#a4a8b0' } },
  shadowfox: { color: '#232028', fur: { color: '#4c4856' } },
  dawnfox: { color: '#6e5838', fur: { color: '#e0c890' } },
});

// Nightveil barrowdusk: veil leather steeped in barrow water — the
// violet drowned out to grave-green, and every lavender accent
// re-picked as the old kings' tarnished gold. The edgelight goes
// wisp-pale: barrow light, not moonlight. The knife keeps its glint,
// but the glint comes off grave-gold now.
registerColorways(BODY_STYLES, 'nightveil_jerkin', {
  barrowdusk: {
    color: '#4a5136', trim: '#a8934e', metal: '#7a6a3e',
    yoke: { color: '#3c422c' }, sash: '#5e5a38',
    knifebaldric: { strap: '#2c3122', steel: '#8a8a76', glint: '#d2dc9a' },
    shadowtails: { color: '#404830' },
  },
});
registerColorways(HELM_STYLES, 'nightveil_cowl', {
  barrowdusk: {
    color: '#4a5136', trim: '#a8934e', mask: '#565e3c',
    edgelight: { color: '#c8d89a' },
  },
});
registerColorways(LEG_STYLES, 'nightveil_leggings', {
  barrowdusk: {
    thigh: '#4a5136', shin: '#404830',
    garter: { color: '#5e5a38', blade: '#a8a88e' },
  },
});
registerColorways(BOOT_STYLES, 'nightveil_boots', {
  barrowdusk: { color: '#404830', cuff: { color: '#6e683e' } },
});
registerColorways(GLOVE_STYLES, 'nightveil_gloves', {
  barrowdusk: {
    color: '#404830', bracer: '#4a5136',
    cuff: { color: '#6e683e', kind: 'band' },
  },
});

// Tuskguard forge lots: the same boar hammered from iron, gold and
// coal-quenched bronze — the tusks stay ivory; that IS the helmet.
registerColorways(BODY_STYLES, 'tuskguard_platebody', {
  ironshod: { color: '#8d9299', trim: '#6a6f7d', metal: '#b0b6be', pauldronColor: '#9aa0aa', pauldronTrim: '#c9ccd4' },
  gilded: { color: '#d8ac44', trim: '#a4772c', metal: '#e8c05c', pauldronColor: '#e0b44e', pauldronTrim: '#f4e0a0' },
  ashen: { color: '#4a4644', trim: '#332f2e', metal: '#6a6462', pauldronColor: '#54504e', pauldronTrim: '#7d7674' },
});
registerColorways(HELM_STYLES, 'tuskguard_helm', {
  ironshod: { color: '#8d9299', trim: '#6a6f7d', spikesCrown: { color: '#3a3e46' } },
  gilded: { color: '#d8ac44', trim: '#a4772c', tusks: { color: '#f4ecd8' }, spikesCrown: { color: '#8a6a24' } },
  ashen: { color: '#4a4644', trim: '#332f2e', spikesCrown: { color: '#211e1d' } },
});
registerColorways(LEG_STYLES, 'tuskguard_greaves', {
  ironshod: { thigh: '#5c5460', shin: '#8d9299', kneeColor: '#b0b6be' },
  gilded: { thigh: '#8a6a2c', shin: '#d8ac44', kneeColor: '#e8c05c' },
  ashen: { thigh: '#332f2e', shin: '#4a4644', kneeColor: '#6a6462' },
});
registerColorways(BOOT_STYLES, 'tuskguard_sabatons', {
  ironshod: { color: '#8d9299', toe: '#b0b6be' },
  gilded: { color: '#d8ac44', toe: '#e8c05c' },
  ashen: { color: '#4a4644', toe: '#6a6462' },
});

// Valiant tourney lots: enamel over bright iron; every lot re-picks
// its plume — the heraldry is the point.
registerColorways(BODY_STYLES, 'valiant_platebody', {
  crimson: {
    color: '#a83a38', metal: '#c04a44', pauldronColor: '#b04240',
    pauldronTrim: '#e8c04c', tabard: { color: '#e8e4da', trim: '#e8c04c' },
  },
  azure: {
    color: '#4a5f9c', metal: '#5a70b0', pauldronColor: '#5468a4',
    pauldronTrim: '#e8e4da', tabard: { color: '#e8e4da', trim: '#e8c04c' },
  },
  gilded: {
    color: '#d8ac44', trim: '#f4e0a0', metal: '#e8c05c',
    pauldronColor: '#e0b44e', pauldronTrim: '#f4e0a0',
    tabard: { color: '#a83240', trim: '#f4e0a0' },
  },
});
registerColorways(HELM_STYLES, 'valiant_helm', {
  crimson: { color: '#a83a38', trim: '#e8c04c', crest: { color: '#8a2f2c' }, plume: { color: '#e8e4da' } },
  azure: { color: '#4a5f9c', trim: '#e8e4da', crest: { color: '#3e5188' }, plume: { color: '#e8e4da' } },
  gilded: { color: '#d8ac44', trim: '#f4e0a0', crest: { color: '#b8912e' }, plume: { color: '#a83a38' } },
});
registerColorways(LEG_STYLES, 'valiant_greaves', {
  crimson: { thigh: '#6e2a28', shin: '#a83a38', kneeColor: '#e8c04c' },
  azure: { thigh: '#324070', shin: '#4a5f9c', kneeColor: '#e8e4da' },
  gilded: { thigh: '#8a6a2c', shin: '#d8ac44', kneeColor: '#f4e0a0' },
});
registerColorways(BOOT_STYLES, 'valiant_sabatons', {
  crimson: { color: '#a83a38', toe: '#e8c04c' },
  azure: { color: '#4a5f9c', toe: '#e8e4da' },
  gilded: { color: '#d8ac44', toe: '#f4e0a0' },
});

// Ramwall lots: steel re-forge, gilded horns for rank, and the
// stormram — coal-dark with SPIKED shoulders, a structural upgrade.
registerColorways(BODY_STYLES, 'ramwall_platebody', {
  steelhorn: { color: '#b8bec8', trim: '#8d9299', metal: '#d4dae2', pauldronColor: '#c4cad4', pauldronTrim: '#e2e6ec' },
  goldhorn: { color: '#7a7466', trim: '#585349', metal: '#9a927e', pauldronColor: '#8a8272', pauldronTrim: '#e8c04c' },
  stormram: {
    color: '#3e4148', trim: '#2c2e34', metal: '#5a5e68',
    pauldron: 'spiked', pauldronColor: '#4a4d56', pauldronSpikes: 1, pauldronTrim: '#7d8290',
  },
});
registerColorways(HELM_STYLES, 'ramwall_helm', {
  steelhorn: { color: '#b8bec8', trim: '#8d9299', jaw: '#c4cad4' },
  goldhorn: { color: '#7a7466', trim: '#585349', horns: { color: '#e8c04c', size: 1, curl: true }, jaw: '#8a8272' },
  stormram: { color: '#3e4148', trim: '#2c2e34', horns: { color: '#9aa0ae', size: 1.1, curl: true }, jaw: '#4a4d56' },
});
registerColorways(LEG_STYLES, 'ramwall_greaves', {
  steelhorn: { thigh: '#5c5460', shin: '#b8bec8', kneeColor: '#d4dae2' },
  goldhorn: { thigh: '#585349', shin: '#7a7466', kneeColor: '#e8c04c' },
  stormram: { thigh: '#2c2e34', shin: '#3e4148', kneeColor: '#7d8290' },
});
registerColorways(BOOT_STYLES, 'ramwall_sabatons', {
  steelhorn: { color: '#b8bec8', toe: '#d4dae2', cuff: { color: '#c4cad4' } },
  goldhorn: { color: '#7a7466', toe: '#e8c04c', cuff: { color: '#8a8272' } },
  stormram: { color: '#3e4148', toe: '#7d8290', cuff: { color: '#4a4d56' }, spike: true },
});

// Briarplate lots: whole hedges, not tints — bonebriar grows a THIRD
// shoulder thorn and ivory horns; the briar thickens as it pales.
registerColorways(BODY_STYLES, 'briarplate_platebody', {
  bloodbriar: { color: '#5c3230', trim: '#c9a88a', metal: '#744240', pauldronColor: '#4c2a28', pauldronTrim: '#c9a88a' },
  bonebriar: {
    color: '#b0a890', trim: '#e6e0d0', metal: '#c4bca4',
    pauldronColor: '#a09880', pauldronSpikes: 3, pauldronTrim: '#e6e0d0',
  },
  nightbriar: { color: '#38304a', trim: '#9a8ab8', metal: '#4a4060', pauldronColor: '#2e2740', pauldronTrim: '#9a8ab8' },
});
registerColorways(HELM_STYLES, 'briarplate_helm', {
  bloodbriar: { color: '#5c3230', trim: '#c9a88a', horns: { color: '#c9a88a', size: 1.25, tine: true }, jaw: '#744240' },
  bonebriar: { color: '#b0a890', trim: '#e6e0d0', horns: { color: '#e6e0d0', size: 1.5, tine: true }, jaw: '#c4bca4' },
  nightbriar: { color: '#38304a', trim: '#9a8ab8', horns: { color: '#9a8ab8', size: 1.25, tine: true }, jaw: '#4a4060' },
});
registerColorways(LEG_STYLES, 'briarplate_greaves', {
  bloodbriar: { thigh: '#442624', shin: '#5c3230', kneeColor: '#c9a88a' },
  bonebriar: { thigh: '#8a8270', shin: '#b0a890', kneeColor: '#e6e0d0' },
  nightbriar: { thigh: '#282238', shin: '#38304a', kneeColor: '#9a8ab8' },
});
registerColorways(BOOT_STYLES, 'briarplate_sabatons', {
  bloodbriar: { color: '#5c3230', toe: '#744240' },
  bonebriar: { color: '#b0a890', toe: '#c4bca4' },
  nightbriar: { color: '#38304a', toe: '#4a4060' },
});

// Sentinel lots: the watch by hour — daybreak trades the fins for
// WINGS (structural), midnight pales the crown against the dark.
registerColorways(BODY_STYLES, 'sentinel_platebody', {
  daybreak: { color: '#cfc4a8', trim: '#e8c04c', metal: '#e0d8c0', pauldronColor: '#d8cfae', pauldronTrim: '#e8c04c' },
  bloodwatch: { color: '#6e3038', trim: '#d8cfae', metal: '#8a4048', pauldronColor: '#5c2830', pauldronTrim: '#d8cfae' },
  midnight: { color: '#2e3244', trim: '#aab4d0', metal: '#3e4458', pauldronColor: '#262a3a', pauldronTrim: '#aab4d0' },
});
registerColorways(HELM_STYLES, 'sentinel_greathelm', {
  daybreak: {
    color: '#cfc4a8', trim: '#e8c04c', spikesCrown: { color: '#e8c04c' },
    fins: undefined, wings: { color: '#e8e2d0' },
  },
  bloodwatch: { color: '#6e3038', trim: '#d8cfae', spikesCrown: { color: '#d8cfae' }, fins: { color: '#8a4048' } },
  midnight: { color: '#2e3244', trim: '#aab4d0', spikesCrown: { color: '#aab4d0' }, fins: { color: '#3e4458' } },
});
registerColorways(LEG_STYLES, 'sentinel_greaves', {
  daybreak: { thigh: '#a89e84', shin: '#cfc4a8', kneeColor: '#e8c04c' },
  bloodwatch: { thigh: '#502228', shin: '#6e3038', kneeColor: '#d8cfae' },
  midnight: { thigh: '#20233a', shin: '#2e3244', kneeColor: '#aab4d0' },
});
registerColorways(BOOT_STYLES, 'sentinel_sabatons', {
  daybreak: { color: '#cfc4a8', toe: '#e8c04c' },
  bloodwatch: { color: '#6e3038', toe: '#d8cfae' },
  midnight: { color: '#2e3244', toe: '#aab4d0' },
});

// Glove dye lots: every early set's pair follows its wardrobe's
// established palette — furs whiten with the snowmelt hare, the
// sundart kingfisher flips teal-on-gold, tusk studs stay ivory.
registerColorways(GLOVE_STYLES, 'thistledown_wraps', {
  madder: { color: '#a8524a', bracer: '#9c4a43', cuff: { color: '#8a4038', kind: 'roll' } },
  woad: { color: '#54688e', bracer: '#4c5e82', cuff: { color: '#42527a', kind: 'roll' } },
  bracken: { color: '#8a6f4a', bracer: '#7e6543', cuff: { color: '#6e5738', kind: 'roll' } },
});
registerColorways(GLOVE_STYLES, 'mothwing_wraps', {
  luna: { color: '#9ab88e', bracer: '#8dab82', cuff: { color: '#b8ccaa', kind: 'fur' }, knuckle: { color: '#d8eec0', kind: 'studs' } },
  dusk: { color: '#7a6280', bracer: '#6f5975', cuff: { color: '#94809c', kind: 'fur' }, knuckle: { color: '#c8b4d8', kind: 'studs' } },
  ember: { color: '#a8705c', bracer: '#9b6653', cuff: { color: '#c09078', kind: 'fur' }, knuckle: { color: '#e8b088', kind: 'studs' } },
});
registerColorways(GLOVE_STYLES, 'dawnsworn_wraps', {
  duskvow: { color: '#9a6a86', bracer: '#8d607a', cuff: { color: '#e0b0c0', kind: 'band' } },
  highnoon: { color: '#eae4d2', bracer: '#ddd6c1', cuff: { color: '#c04a3a', kind: 'band' } },
  eclipse: { color: '#4a4550', bracer: '#413d47', cuff: { color: '#d4a43c', kind: 'band' } },
});
registerColorways(GLOVE_STYLES, 'fenwalker_wraps', {
  mirebloom: { color: '#5e4260', bracer: '#523a54', cuff: { color: '#e0b0d8', kind: 'band' }, knuckle: { color: '#e8b0e0', kind: 'gem' } },
  rustsedge: { color: '#8a5a36', bracer: '#744b2c', cuff: { color: '#e8cc90', kind: 'band' }, knuckle: { color: '#f0c078', kind: 'gem' } },
  graymist: { color: '#6e7a76', bracer: '#5e6a66', cuff: { color: '#d8e0dc', kind: 'band' }, knuckle: { color: '#d0ecdc', kind: 'gem' } },
});
registerColorways(GLOVE_STYLES, 'tidecaller_gloves', {
  abyss: {
    color: '#2a3352', bracer: '#232c48',
    cuff: { color: '#8ad4e0', kind: 'roll' },
    knuckle: { color: '#8af2e0', kind: 'gem' },
  },
  darkwater: {
    color: '#131c2c', bracer: '#182238',
    cuff: { color: '#31486b', kind: 'roll' },
    knuckle: { color: '#7fd4ff', kind: 'gem' },
  },
  maelstrom: {
    color: '#4a6360', bracer: '#425855',
    cuff: { color: '#dce8e4', kind: 'roll' },
    knuckle: { color: '#eaf2ee', kind: 'gem' },
  },
});
registerColorways(GLOVE_STYLES, 'stormwoven_wraps', {
  thunderhead: { color: '#3a3f4e', bracer: '#333744', cuff: { color: '#e8c04c', kind: 'band' }, knuckle: { color: '#e8c04c', kind: 'studs' } },
  sunshower: { color: '#c9a85c', bracer: '#bb9b52', cuff: { color: '#f4ecd0', kind: 'band' }, knuckle: { color: '#f4ecd0', kind: 'studs' } },
  aurora: { color: '#22343e', bracer: '#1b2b34', cuff: { color: '#c8e4dc', kind: 'band' }, knuckle: { color: '#5e5080', kind: 'studs' } },
});
registerColorways(GLOVE_STYLES, 'hareswift_gloves', {
  clover: { color: '#7a9a58', bracer: '#6e8c4f', cuff: { color: '#e8f0d8', kind: 'fur' } },
  snowmelt: { color: '#cfd2ca', bracer: '#c0c4bb', cuff: { color: '#f4f4ee', kind: 'fur' } },
  sorrel: { color: '#a86a48', bracer: '#9a6041', cuff: { color: '#e8dcc4', kind: 'fur' } },
});
registerColorways(GLOVE_STYLES, 'kingfisher_gloves', {
  reedmace: {
    color: '#2c4434', bracer: '#243a2c',
    cuff: { color: '#c8d8b0', kind: 'band' },
    knuckle: { color: '#c8d8b0', kind: 'spikes' },
  },
  stormgull: {
    color: '#46525c', bracer: '#3c4852',
    cuff: { color: '#e2eaee', kind: 'band' },
    knuckle: { color: '#e2eaee', kind: 'spikes' },
  },
  sundart: {
    color: '#b0802e', bracer: '#a0742a',
    cuff: { color: '#f4e8c8', kind: 'band' },
    knuckle: { color: '#2f7a8a', kind: 'spikes' },
  },
});
registerColorways(GLOVE_STYLES, 'cutpurse_gloves', {
  alleyrat: { color: '#5c5c56', bracer: '#53534d', cuff: { color: '#767670', kind: 'band' } },
  moonless: { color: '#33303c', bracer: '#2c2935', cuff: { color: '#4e4a5c', kind: 'band' } },
  // THE RED HANDS THEMSELVES: the one piece that wears the name
  // literally — hands BOUND in arterial wraps to the fingertip
  // (the guild's cord language carried to the fist), near-black
  // bracers so the hands float out of the dark. The base kit's
  // fingerless cut and brass studs die here: no skin, no gold —
  // at ten paces the set is a shadow with a red face and red hands.
  redhand: {
    color: '#7e2820', hand: 'wrap', fingerless: undefined, bracer: '#2b222a',
    cuff: { color: '#6e1f1a', kind: 'band' }, knuckle: undefined,
  },
});
registerColorways(GLOVE_STYLES, 'trapline_gloves', {
  juniper: { color: '#4e6a52', bracer: '#3e5642' },
  riverclay: { color: '#96604c', bracer: '#7a4e3c' },
  nightsnare: { color: '#3e4450', bracer: '#333844', cuff: { color: '#b8c0cc', kind: 'band' } },
});
// Emberfox lots: each pelt keeps the law — dark paw, jerkin-toned
// forearm, so the sock runs unbroken up into the sleeve.
registerColorways(GLOVE_STYLES, 'emberfox_gloves', {
  silverfox: { color: '#33303a', bracer: '#8a8e96', cuff: { color: '#a4a8b0', kind: 'fur' } },
  shadowfox: { color: '#232028', bracer: '#3a3640', cuff: { color: '#4c4856', kind: 'fur' } },
  dawnfox: { color: '#6e5838', bracer: '#d8b878', cuff: { color: '#e0c890', kind: 'fur' } },
});
registerColorways(GLOVE_STYLES, 'tuskguard_gauntlets', {
  ironshod: { color: '#8d9299', bracer: '#767b84', cuff: { color: '#b0b6be', kind: 'flare' } },
  gilded: { color: '#d8ac44', bracer: '#b8902f', cuff: { color: '#f4e0a0', kind: 'flare' }, knuckle: { color: '#f4ecd8', kind: 'studs' } },
  ashen: { color: '#4a4644', bracer: '#3c3836', cuff: { color: '#6a6462', kind: 'flare' } },
});
registerColorways(GLOVE_STYLES, 'valiant_gauntlets', {
  crimson: { color: '#a83a38', bracer: '#8e302e', cuff: { color: '#e8c04c', kind: 'flare' } },
  azure: { color: '#4a5f9c', bracer: '#3e5084', cuff: { color: '#e8e4da', kind: 'flare' } },
  gilded: { color: '#d8ac44', bracer: '#b8902f', cuff: { color: '#f4e0a0', kind: 'flare' }, knuckle: { color: '#fff2c8', kind: 'plate' } },
});
registerColorways(GLOVE_STYLES, 'ramwall_gauntlets', {
  steelhorn: { color: '#b8bec8', bracer: '#a0a6b2', cuff: { color: '#c4cad4', kind: 'flare' }, knuckle: { color: '#d4dae2', kind: 'plate' } },
  goldhorn: { color: '#7a7466', bracer: '#686254', cuff: { color: '#8a8272', kind: 'flare' }, knuckle: { color: '#e8c04c', kind: 'plate' } },
  // Stormram spikes its fists like its shoulders — a structural lot.
  stormram: { color: '#3e4148', bracer: '#33363c', cuff: { color: '#4a4d56', kind: 'flare' }, knuckle: { color: '#7d8290', kind: 'spikes' } },
});
registerColorways(GLOVE_STYLES, 'briarplate_gauntlets', {
  bloodbriar: { color: '#5c3230', bracer: '#4c2a28', cuff: { color: '#744240', kind: 'band' }, knuckle: { color: '#a86a5c', kind: 'spikes' } },
  bonebriar: { color: '#b0a890', bracer: '#988f78', cuff: { color: '#c4bca4', kind: 'band' }, knuckle: { color: '#e8e0c8', kind: 'spikes' } },
  nightbriar: { color: '#38304a', bracer: '#2c2540', cuff: { color: '#4a4060', kind: 'band' }, knuckle: { color: '#8a7ab0', kind: 'spikes' } },
});
registerColorways(GLOVE_STYLES, 'sentinel_gauntlets', {
  daybreak: { color: '#cfc4a8', bracer: '#b8ac8e', cuff: { color: '#e8e2d0', kind: 'flare' }, knuckle: { color: '#d4a43c', kind: 'studs' } },
  bloodwatch: { color: '#6e3038', bracer: '#5c282e', cuff: { color: '#84424a', kind: 'flare' }, knuckle: { color: '#d8cfae', kind: 'studs' } },
  midnight: { color: '#2e3244', bracer: '#262a3a', cuff: { color: '#3c4258', kind: 'flare' }, knuckle: { color: '#aab4d0', kind: 'studs' } },
});

// ---------------------------------------------------------- resolvers

/** Unknown body item: a plain tunic in the item's color — today's read. */
export function bodyStyle(itemId: string): BodyStyle {
  const st = BODY_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a7a5f';
  return { color: c, trim: shade(c, -20), cls: 'cloth', silhouette: 'tunic', pauldron: 'none', chest: 'none', skirt: 0 };
}

/** Unknown head item: a tinted barbute — full-face even as a stand-in,
 *  because a cap reads as a placeholder (THE FORGE LAW). */
export function helmStyle(itemId: string): HelmStyle {
  const st = HELM_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8d9299';
  return { color: c, trim: shade(c, -22), kind: 'barbute' };
}

export function legStyle(itemId: string): LegStyle {
  const st = LEG_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color;
  return c ? { kind: 'pants', thigh: c } : { kind: 'pants' };
}

export function bootStyle(itemId: string): BootStyle {
  const st = BOOT_STYLES[itemId];
  if (st) return st;
  return { color: itemDef(itemId)?.color ?? '#4a3324', height: 0.08 };
}

/** Unknown glove item: a plain mitt in the item's color, strap cuff. */
export function gloveStyle(itemId: string): GloveStyle {
  const st = GLOVE_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a6a45';
  return { color: c, cuff: { color: shade(c, -20), kind: 'band' } };
}

export function offhandStyle(itemId: string): OffhandStyle {
  const st = OFFHAND_STYLES[itemId];
  if (st) return st;
  const c = itemDef(itemId)?.color ?? '#8a744a';
  // A dual-wielded weapon in the off hand paints as ITSELF, not as a
  // fallback shield — the rig routes 'weapon' to the weapon painters.
  if (itemDef(itemId)?.weapon) return { kind: 'weapon', color: c, trim: shade(c, -20) };
  return { kind: 'buckler', color: c, trim: shade(c, -20) };
}

