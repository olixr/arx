import { ArxMark } from './wornLight.js';
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
    pauldron: 'none' | 'round' | 'spiked' | 'layered' | 'bladed' | 'fur' | 'feathered' | 'orbs' | 'shards' | 'wyrmwing' | 'bonemaw' | 'boneridge' | 'thorncrest' | 'lionhead' | 'gonfalon' | 'rampart' | 'sunfan' | 'veilwing' | 'stormspire' | 'charbrand' | 'wardcrest' | 'aethercrest' | 'gateshard' | 'mothpile' | 'dawncrest' | 'boughmantle' | 'orchidpaul' | 'cattailpaul' | 'heronwing' | 'cloudbank' | 'anvilpaul' | 'showerpaul' | 'aurorabind' | 'tideorbs' | 'deeppaul' | 'darkwells' | 'vortexpaul' | 'brazierpaul' | 'sunderpaul' | 'downpaul' | 'shadowdrape' | 'grapnel' | 'duskmantle' | 'razorcrest' | 'sharkfin' | 'escalight' | 'krakengrip' | 'sailfan' | 'guardhair' | 'drakewing' | 'oakspaul';
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
    broidery?: {
        thread: string;
        sprig: string;
    };
    /** Thistledown: THE CORDED SASH — the rope belt reborn as a woven
     *  two-strand cord, knotted at the leading hip, its two tassel
     *  cords hanging with seed-fluff ends that stir on the breeze. */
    sashcord?: {
        color: string;
        tassel: string;
    };
    /** Thistledown: two clean lapped hem courses, each with its own
     *  stitch border — layered tailoring, never patchwork. */
    hemcourse?: {
        colors: [string, string];
    };
    /** Thistledown: THE DRIFT — loosed seeds riding ONE WIND across
     *  the skirt air at a constant pace, brightening when the breeze
     *  passes. Read by downpaul for its own shed (the cross-read
     *  pattern). */
    driftdown?: {
        seed: string;
    };
    emblem?: 'chevron' | 'diamond' | 'bolt' | 'skull' | 'sun' | 'leaf' | 'star' | 'moon' | 'eye' | 'moth' | 'coin' | 'bullhead' | 'flame' | 'orrery' | 'crown' | 'lion';
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
    tail?: {
        color: string;
        tip: string;
        ember?: string;
    };
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
    capelet?: {
        color?: string;
        trim?: string;
        hem: 'scallop' | 'point' | 'dag';
    };
    /**
     * Two cloth bands hanging from the shoulders past the belt, tick-
     * marked — the ordained read. From behind they cross the shoulders
     * as short tabs. Colors default shade(color, -16) / trim.
     */
    stole?: {
        color?: string;
        trim?: string;
    };
    /**
     * The knight's cloth front panel over the cuirass, pointed hem past
     * the fauld; the waist crosses it (a surcoat is CINCHED). The chest
     * emblem rides the tabard. Back gets a shorter plain panel.
     */
    tabard?: {
        color: string;
        trim?: string;
    };
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
    yoke?: {
        color?: string;
        stitch?: boolean;
    };
    /**
     * A real belt where the anonymous waist band was: two-tone strap,
     * buckle plate, hanging strap end. Colors default shade(trim, -8) /
     * metal. Skipped when a sash owns the waist.
     */
    belt?: {
        color?: string;
        buckle?: string;
    } | true;
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
    charms?: {
        color: string;
    };
    /**
     * Silk binding cords crossing the torso both ways, front AND back
     * (a wrap that vanished on turn would break the garment), knotted
     * where they meet — the broodsilk read.
     */
    cords?: {
        color: string;
    };
    /**
     * Bone inlay: three lapped ivory arcs across the chest plate — the
     * barrow-king's ribs, worn on the outside. Front only; the back
     * keeps its spine ridge.
     */
    ribs?: {
        color: string;
    };
    /**
     * Ice on the garment: icicle points hanging from the capelet hem
     * (rides the capelet — it needs an eave to freeze from) and slow
     * winking frost glints low on the skirt. The wintercourt read:
     * the cold lives ON the cloth, not around it.
     */
    icefringe?: {
        color: string;
    };
    /**
     * A prayer-bead loop hung from the neckline, two strands meeting at
     * a drop medallion over the sternum, swinging a hair with the
     * stride — the keeper's jewelry. Front only; the back stays plain.
     */
    beads?: {
        color: string;
    };
    /**
     * Two ribbons of living light rising off the shoulder blades and
     * waving on their own slow sky — aurora worn as a garment. Light,
     * not cloth: they ride above every layer and never go out.
     */
    ribbons?: {
        colors: [string, string];
    };
    /**
     * A layered feather mantle ringing the shoulders, front AND back —
     * two lapped rows of broad vanes, tips broken to a second color,
     * each with its own spine. An optional sheen walks the rows on a
     * slow clock — the rook's oil-slick iridescence. The bird worn as
     * a garment, never a trophy.
     */
    plumage?: {
        color: string;
        tip: string;
        sheen?: string;
    };
    /**
     * The archer's back quiver on the trailing shoulder blade. From
     * behind it is the whole story: banded tube, three fletched nocks.
     * From the front the story is the chest strap and the fletchings
     * peeking over the shoulder — gear that survives the turn.
     */
    quiver?: {
        color: string;
        fletch: string;
    };
    /**
     * A neck scarf knotted at the trailing shoulder, its tail waving
     * behind in a lazy S on its own clock, tip dipped in a second
     * color — the assassin's flag. Cloth, not light: full weight.
     */
    scarftail?: {
        color: string;
        tip?: string;
    };
    /**
     * Smoke curling off the shoulders, rising and thinning — the burn
     * never quite went out. Deterministic from the clock alone.
     */
    wisps?: {
        color: string;
    };
    /**
     * Fireflies keeping the wearer company: low wandering lights that
     * BLINK on their own beats — alive, where motes merely drift.
     */
    fireflies?: {
        color: string;
    };
    /**
     * Shed feathers rocking down past the hem and fading — the rook
     * molts and never runs out.
     */
    featherfall?: {
        color: string;
    };
    /**
     * Storm arcs snapping across the plate on their own beats — a
     * jagged bolt that flickers alive, jumps shoulder to chest, and is
     * gone. Between snaps, small charge sparks keep the current honest.
     */
    arcsparks?: {
        color: string;
    };
    /**
     * The forge's veins: branching molten cracks glowing between the
     * chest plates, each breathing on its own furnace beat. The metal
     * never cooled; the seams admit it.
     */
    moltenSeams?: {
        color: string;
    };
    /**
     * Hot sparks rising off the plate and flickering out — embers where
     * motes merely drift; they burn, wobble upward, and die mid-air.
     */
    embers?: {
        color: string;
    };
    /**
     * Star glints winking off the plate's high points on their own
     * beats — armor polished past vanity into legend.
     */
    gleam?: {
        color: string;
    };
    /**
     * The chest device wakes: two lights kindle in the emblem skull's
     * eye sockets, hold their look, and gutter out on their own slow
     * blink — the device is not entirely a decoration. Rides the skull
     * emblem's own geometry; the jadeskull word.
     */
    skullgaze?: {
        color: string;
    };
    /**
     * Watch-fire rosettes: silver petal bosses set at the harness
     * points, each with a gem heart. The hearts keep a rotation — one
     * flares awake at a time, the way watch fires answer each other
     * down a border wall. The redmarch word.
     */
    rosettes?: {
        color: string;
        metal: string;
    };
    /**
     * Cold fire off the shoulder thorns: pale flame tongues that lick
     * up from behind the pauldrons on their own gutter, re-shaping
     * every beat, giving no heat. Consumed by drawPauldron so the fire
     * rides ABOVE the caps. The thorn twins' word (rimethorn burns
     * pale blue, palethorn burns bone gold).
     */
    coldfire?: {
        color: string;
    };
    /**
     * Marrow-light between the shoulder bones: two small cold flames
     * guttering in the gaps of the boneridge fan, and one drifting
     * mote that never strays far. Consumed by drawPauldron so the
     * light sits IN the bone, not on the chest. The fellbone word.
     */
    hollowlight?: {
        color: string;
    };
    /**
     * THE CROWN RING: a broad gilt ring floating about the torso,
     * turning slowly on its own axis — from the front two arcs stand
     * off the flanks, from behind the whole circle shows. One glint
     * walks the rim; nothing holds it up. The kingsmane word, and the
     * wardrobe's one floating regalia.
     */
    crownring?: {
        color: string;
    };
    /**
     * Three charged orbs orbiting the WHOLE torso on the crown ring's
     * depth law — near side big and lit, far side small and dim, and
     * hidden where the body stands between it and you. Each orb snaps
     * a static spark on its own beat. The stormsinger word.
     */
    stormorbs?: {
        color: string;
    };
    /**
     * Sigils surfacing through the skirt cloth — one rises, holds its
     * look, and sinks back into the weave while the next wakes. The
     * garment is reading; so is whoever faces it. The gloamsight word.
     */
    sigilweave?: {
        color: string;
    };
    /**
     * Hanging inscribed strips off the shoulders and hem, swaying on
     * the stride, their runes kindling in a slow reading wave — top
     * strip first, hem last. Cloth, not light: full weight. The
     * flamewrought word.
     */
    runestrips?: {
        color: string;
        rune: string;
    };
    /**
     * Gem clusters riding the capelet hem, winking awake in rotation
     * the way watch fires answer each other (rides the capelet — the
     * cape IS the setting; without one there is nothing to stud). The
     * duskwarden word.
     */
    gemwake?: {
        color: string;
        metal: string;
    };
    /**
     * THE GLYPH RING: a circle of living runes floating about the
     * hips, turning slowly — from the front two arcs of runes stand
     * off the flanks (the body hides the rest); from behind the whole
     * circle shows. Every rune rides the rim on the fake-3D depth law,
     * and one glint walks among them. Nothing holds it up. The
     * aetherion word, and the wardrobe's second floating regalia after
     * the kingsmane crown ring.
     */
    glyphring?: {
        color: string;
    };
    /**
     * THE VIGIL: warm lamp-light walking the procession — the crown
     * device woven into each shoulder gonfalon kindles, holds its glow,
     * and passes the light on: left banner, right banner, then the
     * helm's shrine lamp, the way votive lights are lit down a nave.
     * Consumed by drawPauldron so the light lives ON the cloth. The
     * oathgold word.
     */
    vigil?: {
        color: string;
    };
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
    breach?: {
        color: string;
    };
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
        color: string;
        spot: string;
        tails?: string;
        emberEdge?: string;
        crescent?: string;
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
    raycollar?: {
        color: string;
    };
    /** Dawnsworn: two small sun medallions hung on cords off the sash,
     *  each a disc with ray nubs, swinging with the stride. */
    sunmedals?: {
        color: string;
    };
    /** Fenwalker: THE WATERLINE — the hem stitched as still black
     *  water: a dark band riding the living hem's own contour, reed
     *  blades standing out of it, and one slow ripple ring opening at
     *  a time where something under the cloth moved. */
    mirehem?: {
        water: string;
        ripple: string;
        reed: string;
    };
    /** Fenwalker: THE WISP COURT — three fen lights circling the hem
     *  in slow court on THE FENLIGHT clock, each on its own watch.
     *  Far-side lights inside the skirt silhouette are SKIPPED, per
     *  the floating-orbit occlusion law. */
    wispcourt?: {
        color: string;
    };
    /** Fenwalker: the reed girdle — a two-strand woven cord crossing
     *  at the waist, carrying a bound rush bundle and one carved
     *  bog-charm that swings with the stride. */
    reedgirdle?: {
        cord: string;
        charm: string;
    };
    /** Mirebloom lot: the crown's orchid sheds — one petal at a time
     *  drifting down the skirt, rocking as it falls. MUST contrast the
     *  robe, per the species-lots law. */
    petalfall?: {
        color: string;
    };
    /** Rustsedge lot: two cattail seed-heads standing stiff off the
     *  girdle line, velvet brown tipped in pale fluff. */
    seedheads?: {
        head: string;
        fluff: string;
    };
    /** Graymist lot: the low fog — a translucent mist band sliding
     *  around the skirt, guttering on the fen clock. */
    mistwrap?: {
        color: string;
    };
    /** Stormwoven: THE THUNDER BANK — the front itself banked across
     *  the chest, fat cloud rolls with flat lit caps, the gold charge
     *  waking along the underside on THE STORMBOLT clock. */
    thunderbank?: {
        color: string;
        glow: string;
    };
    /** Stormwoven: THE BOLT BRAND — the storm's mark inlaid down the
     *  skirt's leading side in its own dark channel; it charges with
     *  the sky and burns white on the shared strike. */
    boltbrand?: {
        color: string;
    };
    /** Stormwoven: THE RAIN HEM — a soaked band riding the living hem,
     *  slanted rain falling past it, one ring at a time where a drop
     *  gives up. */
    rainhem?: {
        color: string;
    };
    /** Stormwoven: THE STATIC COURT — three charge sparks climbing the
     *  hem air, faint on the charge, popping together on the strike. */
    staticcourt?: {
        color: string;
    };
    /** Stormwoven: THE CHARGE BEADS — three storm-glass beads on the
     *  waist cords, lighting in sequence as the sky charges. */
    chargebeads?: {
        cord: string;
        bead: string;
    };
    /** Stormwoven base: THE STORM SHROUD — low fog banks sliding
     *  around the hem, lit from within for a beat at the strike. */
    stormshroud?: {
        color: string;
    };
    /** Thunderhead lot: the ground flash — for one beat after the
     *  strike, the world under the hem answers. */
    groundflash?: {
        color: string;
    };
    /** Sunshower lot: one warm window of light sliding across the
     *  cloth as the clouds shift. The luck is that it finds you. */
    sunpatch?: {
        color: string;
    };
    /** Aurora lot: THE RISING AURA — the wardrobe's fourth floating
     *  regalia (crown ring, glyphs, the eddy, now the lights loose):
     *  three ribbons of aurora corkscrewing the whole body chest to
     *  hem on the glyph ring's occlusion law, spinning at one
     *  constant pace, surging by amplitude alone; at the dance,
     *  risers slip the aura and climb. */
    auroraband?: {
        colors: string[];
    };
    /** Aurora lot: stars scattered down the skirt cloth, one waking
     *  at a time — the night the lights need behind them. */
    starfield?: {
        color: string;
    };
    /** Aurora lot: THE SNOWLINE — a frost band riding the living hem;
     *  at the dance's last station the snow answers the sky in the
     *  curtain's own colors, drawn dashes, never a wash. */
    frosthem?: {
        color: string;
        glow: string;
    };
    /** Hedgemage: herb bundles and a seed pouch hung off the sash cord,
     *  swinging on the stride — the garden carried along. */
    herbgirdle?: {
        cord: string;
        leaf: string;
    };
    /** Tidecaller: THE LIVING SURF — scalloped surf tiers whose
     *  waterline rides THE TIDE clock: they climb the robe with the
     *  swell and draw back through the slack, foam crescents seated
     *  in the dips, backwash sparkle on the retreat. */
    foamtiers?: {
        color: string;
    };
    /** Tidecaller: a pearl strand off the neckline, no medallion — one
     *  glimmer walks bead to bead, and the whole strand catches the
     *  light when the wave breaks. */
    pearlstrand?: {
        color: string;
    };
    /** Tidecaller: THE STREAM WRAP — drawn currents crossing the
     *  torso with foam riding the flow, surging at the break. Water
     *  is DRAWN, never glowed. */
    streamwrap?: {
        color: string;
        foam: string;
        core?: string;
    };
    /** Tidecaller: THE TIDE MOON — the caller's warrant high on the
     *  chest; its lit face waxes with the swell and stands full at
     *  the break. The moon moves the water; the robe repeats it. */
    tidemoon?: {
        color: string;
    };
    /** Abyss lot: bioluminescent motes rising through the hem air in
     *  their own procession. */
    luremotes?: {
        color: string;
    };
    /** Dark-waters lot: THE UNDERTOW — the lot's light, carried: deep
     *  `water` casing under the cold `neon` core, cross-read by every
     *  dark-waters device (the dawncrest pattern); its own verse is
     *  the sinking motes — the abyss breathes out and rises, the dark
     *  waters take, and everything sinks. */
    undertow?: {
        water: string;
        neon: string;
    };
    /** Dark-waters lot: THE STRATA — the robe re-clothed as lapped
     *  sheets of standing water, each a step darker (the drowning
     *  gradient worn down the body), every hem a slack DIAGONAL
     *  waterline breathing a beat behind its neighbor; colors[0] is
     *  the chest collar sheet, the rest descend the skirt. A drawn
     *  rip-current runs the second seam. The water column, not a
     *  cloth tube. */
    depthveils?: {
        colors: string[];
    };
    /** Dark-waters lot: THE DISSOLVING HEM — the last stratum tears
     *  into sinking tongues that fall PAST the cloth's edge, `deep`
     *  showing between them. The robe does not end; it goes under.
     *  Silhouette: structure — the tongues hold white in the hurt
     *  flash. */
    sinkhem?: {
        color: string;
        deep: string;
    };
    /** Dark-waters lot: THE EDDY — the wardrobe's third floating
     *  regalia (kingsmane's crown ring, aetherion's glyphs, now a
     *  ring CURRENT orbiting the hips): near arc only, drawn casing
     *  under a cold core, droplets sinking off its low points.
     *  Floating regalia never take the front-plane transform. */
    eddyring?: {
        water: string;
        neon: string;
    };
    /** Maelstrom lot: spindrift — the churn riding the living hem,
     *  spume streaking off the leading side at the break. */
    spindrift?: {
        color: string;
    };
    /** Abyss lot: THE TWIN MEDUSAE — the living jellyfish at each
     *  shoulder, read by deeppaul (the cross-read pattern): bell
     *  color and the light its organs and rim carry. */
    medusae?: {
        bell: string;
        lume: string;
    };
    /** Abyss lot: THE JELLY FRINGE — oral-arm streamers off the
     *  shoulder line, swaying, lume-tipped. */
    jellyfringe?: {
        color: string;
        lume: string;
    };
    /** Voidwhisper: THE WHISPER RIFT — one grand tear leaning across
     *  the torso where the void took a strip of the robe (a diagonal
     *  kills the tube). Interior = the garment's darkest value, plasma
     *  only on the torn edge (THE VOID IS AN ABSENCE). Read by
     *  sunderpaul for its rim light (the cross-read pattern). */
    voidrift?: {
        casing: string;
        core: string;
        void: string;
    };
    /** Voidwhisper: THE ARRIVALS — pale star-points living at fixed
     *  seats scattered down the skirt: each wakes, brightens, dies,
     *  and is next seen at its NEXT seat. Nothing ever travels. */
    winkmotes?: {
        color: string;
    };
    /** Voidwhisper: THE SUNDERED HEM — the robe's last hem course is
     *  SEVERED: it floats below the skirt with a band of true void
     *  between, both torn edges rim-lit, drifting on the hush. The
     *  band is silhouette — structure — it holds white in the flash. */
    sunderhem?: {
        color: string;
    };
    /** Cindersworn: THE OATH SEAMS — drawn fissures where the char
     *  split and the fire looked out; the ember crawl walks them.
     *  Read by brazierpaul for its coal-bed light (the cross-read
     *  pattern). Casing = deep fire, ember = the hot core. */
    emberveins?: {
        casing: string;
        ember: string;
    };
    /** Cindersworn: THE CINDER VEILS — the robe re-clothed as lapped
     *  sheets of charred cloth descending the skirt, each a step
     *  darker, every hem a slack burnt diagonal; ember light breathes
     *  in the gaps BETWEEN the laps, never on them. colors[0] is the
     *  charred yoke at the chest; the rest descend. */
    cinderveils?: {
        colors: string[];
    };
    /** Cindersworn: THE ASH HEM — the hem is burning away: ragged
     *  char tongues past the cloth's bottom edge (structure — they
     *  hold white in the flash), the burn line crawling along it, and
     *  sparks that RISE off the line and die. What the robe loses it
     *  gives to the air. */
    ashhem?: {
        char: string;
        ember: string;
    };
    /** Starweaver: a linked constellation low on the skirt — five stars
     *  joined by faint lines, flaring one at a time in sequence. */
    constellation?: {
        color: string;
    };
    /** Hareswift: the courier's cross-body satchel — strap over the
     *  chest (front-plane), flap bag riding the trailing hip. */
    satchel?: {
        color: string;
        strap: string;
    };
    /** Hareswift: THE WIND MANTLE — a draped two-tier shoulder cape in
     *  wind-torn swept points, all raked the same way (the wind lives
     *  in the cut), hare-fur lining peeking only at the throat. The
     *  collar done the way collars are done. */
    windmantle?: {
        color: string;
        under: string;
        lining: string;
    };
    /** Hareswift: wind-cut hem tabs at the waist — layered swept
     *  triangles kicked by the stride, the hood's own language carried
     *  to the hem. ONE furniture family, crown to waist. */
    windtabs?: {
        color: string;
    };
    /** Hareswift: the luck worn openly — a hare's-foot talisman on a
     *  belt cord, swinging with the stride. Couriers don't carry
     *  trophies; they carry LUCK. */
    luckcharm?: {
        foot: string;
        cord: string;
    };
    /** Hareswift: THE SLIPSTREAM — speed made visible: pale wind
     *  streaks that trail off the shoulders only while moving, scaled
     *  by the run. At rest there is nothing to see; that is the
     *  point. */
    slipstream?: {
        color: string;
    };
    /** Hareswift: two waybill ribbons off the belt knot, streaming and
     *  kicking with the stride — speed made visible at a standstill's
     *  first step. */
    streamers?: {
        color: string;
    };
    /** Kingfisher: THE SCALECOAT — fish-leather worn whole: dense
     *  crescent-scale rows banding the torso, nacre edges, a dorsal
     *  fin ridge on the back read — and THE SHEENWAVE, an iridescent
     *  light band that travels the rows on a slow clock: light through
     *  water, the secret-boss shimmer. */
    scalecoat?: {
        color: string;
        edge: string;
        sheen: string;
    };
    /** Kingfisher: THE HOOKLINE — a slack fishing line slung across
     *  the chest, three barbed hooks riding it and one feathered lure
     *  at the low point. The lure winks WARM on the rare-glint law:
     *  bait, not jewelry. */
    hookline?: {
        line: string;
        hook: string;
        lure: string;
    };
    /** Cutpurse: the guild tether — a cord slung shoulder-to-hip strung
     *  with lifted coins; one glint WALKS the strand, coin to coin. The
     *  trophies are the heraldry. */
    cointether?: {
        cord: string;
        coin: string;
        glint?: string;
    };
    /** Cutpurse: THE CUT KIT — the lifted purse at the trailing hip,
     *  its slit showing a coin on the rare clock, the curved snip
     *  that made the slit hanging beside. The trade, worn as gear. */
    cutkit?: {
        pouch: string;
        blade: string;
        coin: string;
        glint?: string;
    };
    /** Alleyrat: three skeleton keys off one iron ring at the leading
     *  hip — borrowed doors, rare uneven glint. */
    keyring?: {
        ring: string;
        keys: string;
        glint?: string;
    };
    /** Moonless: two bulbs of bottled dark on the belt; one leaks a
     *  slow wisp. The exit, worn ready. */
    smokeflasks?: {
        glass: string;
        cork: string;
        wisp: string;
    };
    /** Redhand: the crimson cord above the belt, one knot per job
     *  that ended the only way the Knife's jobs end. */
    tallycord?: {
        cord: string;
        knot: string;
    };
    /** Alleyrat: the pry bar slung flat across the BACK — the
     *  housebreaker's answer, worn where the door can't see it
     *  coming. Back read only. */
    prybar?: {
        color: string;
    };
    /** Moonless: a wound sash crossing the chest in the veil's own
     *  band language, one silver thread stitched along its edge. */
    nightsash?: {
        color: string;
        thread: string;
    };
    /** Redhand: crossed crimson cords over the chest, knotted at the
     *  heart — the red hand's harness; the mark is the binding. */
    redharness?: {
        cord: string;
        knot: string;
    };
    /** Redhand: THE BLOOD SHROUD — layered tiers of night cloth
     *  draped off the trailing shoulder, every cut edge showing the
     *  crimson `lining`; the `edge` is the one arterial tick per
     *  tier. Back read = the layered half-cape. The armor bleeds by
     *  design. */
    bloodshroud?: {
        cloth: string;
        lining: string;
        edge: string;
    };
    /** Redhand: THE WRIT — the contract in a slim black case at the
     *  trailing hip, sealed in blood-dark wax with cut ribbon ends.
     *  Matte on purpose: paper kills quieter than steel shines. */
    writkit?: {
        case: string;
        seal: string;
        ribbon: string;
    };
    /** Trapline: the working bandolier — strap, bone toggles, a coiled
     *  snare wire, and a hanging lure that swings on the stride. Every
     *  loop has caught something. */
    snareline?: {
        strap: string;
        bone: string;
        wire: string;
    };
    /** Emberfox: the cream throat bib, rounded and fur-ticked at its
     *  edge — the fox's own front. Front-plane. */
    foxbib?: {
        color: string;
    };
    /** Wayfarer: the bedroll slung diagonal across the back — a fat
     *  wool roll with strapped end caps; from the front only the strap
     *  and the roll's shoulder peek admit to it. */
    bedroll?: {
        color: string;
        strap: string;
    };
    /** Wolfstalker: the trophy strap — a chest cord hung with four
     *  wolf claws, points down. Front-plane. */
    clawstrap?: {
        strap: string;
        claw: string;
    };
    /** Nightveil: the knife baldric — three sheathed throwing blades on
     *  a diagonal strap; a violet glint wakes one blade at long, uneven
     *  intervals. Front-plane. */
    knifebaldric?: {
        strap: string;
        steel: string;
        glint?: string;
    };
    /** Nightveil: twin dusk scarf tails off the shoulders, drifting on
     *  the cowl's own slow clock — the dark that follows you out. */
    shadowtails?: {
        color: string;
    };
    /** Drakescale: THE TAILORED HIDE — front, a center plastron of
     *  five great belly plates (`plate` body, `lit` top plane) lapped
     *  bottom-up over dark flank fields dressed with `hide` scutes;
     *  back, the dorsal ridge owns the spine. Tailored, never tiled. */
    drakerows?: {
        hide: string;
        plate: string;
        lit: string;
    };
    /** Drakescale: the banked forge under the plates — molten light
     *  breathing in the plastron gaps, ember motes rising rare off the
     *  waist seam. `core` is the hottest value. */
    heatseam?: {
        color: string;
        core: string;
    };
    /** Stagheart: the forest mantle — lapped bark-leather tiers over
     *  the shoulders with moss spilling at every edge. */
    mossmantle?: {
        bark: string;
        moss: string;
    };
    /** Stagheart: gold leaves shed from nowhere, falling slow and
     *  fluttering — the wilds acknowledging their own. */
    leaffall?: {
        color: string;
    };
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
    kind: 'greathelm' | 'bascinet' | 'barbute' | 'armet' | 'sallet' | 'radiant' | 'ramfort' | 'warmask' | 'dread' | 'briar' | 'drake' | 'aurochs' | 'barrow' | 'tempest' | 'furnace' | 'wyrm' | 'warcrown' | 'gatehelm' | 'hood' | 'circlet' | 'wizard' | 'veil' | 'magus' | 'thistlehat' | 'mothcowl' | 'hedgehat' | 'hushcowl' | 'oathcowl' | 'stardiadem' | 'shroudcowl' | 'thunderhat' | 'showerhat' | 'coronacowl' | 'tidehat' | 'depthcrown' | 'murkcowl' | 'maelcowl' | 'courierhood' | 'sharkmaw' | 'anglerhood' | 'krakencowl' | 'marlincrest' | 'guildcowl' | 'latchhood' | 'veilwrap' | 'gripmask' | 'trapperhood' | 'foxmantle' | 'roadhood' | 'wolfmantle' | 'shadowcowl' | 'stagcrown' | 'orisoncowl' | 'vespercowl' | 'zenithhat' | 'umbrahood' | 'wealdcowl' | 'bloomcrown' | 'sedgehat' | 'heroncowl';
    visor?: 'slit' | 'cross';
    plume?: {
        color: string;
    };
    /** `curl` bends the sweep into a ram's spiral beside the temples;
     *  `tine` forks a second point off each horn — the bramble read. */
    horns?: {
        color: string;
        size: number;
        curl?: boolean;
        tine?: boolean;
    };
    /** Up-curved boar tusks flanking the jaw — the charge read. */
    tusks?: {
        color: string;
    };
    /** A row of forged spikes riding the crown centerline, front-to-back
     *  — the mohawk of war. Reads as rising points frontal, a full
     *  spiked ridge at profile. */
    spikesCrown?: {
        color: string;
    };
    /** Swept-back side fins — blade silhouettes off the temples. */
    fins?: {
        color: string;
    };
    /** Upswept feathered wing blades — the valkyrie read. */
    wings?: {
        color: string;
    };
    /** A solid metal ridge crest riding the crown centerline. */
    crest?: {
        color: string;
    };
    /** The forge-accent metal: warmask cheek plates, dread bevor teeth,
     *  briar cage bars, ramfort keel plate, drake snout. Each kind
     *  interprets it as ITS structural second metal — never a tint. */
    jaw?: string;
    /** Wizard hats: a band buckle / star charm on the crown. */
    charm?: string;
    /** Hoods: a lumpy fur ruff ringing the face opening. */
    ruff?: {
        color: string;
    };
    /** Hoods: pricked ear points on the crown. `tall` is the hare read
     *  (long upright blades); `tip` paints the top third — black-tipped
     *  hare and fox ears both. */
    ears?: {
        color: string;
        tall?: boolean;
        tip?: string;
    };
    /** Hoods: a swept feather tucked at the temple, trailing back. */
    feather?: {
        color: string;
    };
    /** Hoods: a half-mask across the lower face — the rogue read.
     *  Warmask: the sculpted face-plate metal behind the bronze work. */
    mask?: string;
    /** Hoods: two bold curled moth feelers off the crown, clubbed tips. */
    antennae?: {
        color: string;
    };
    /** Hoods: branched ivory antlers — the forest-king crown. */
    antlers?: {
        color: string;
    };
    /** Hoods/domes: a cut gem set at the brow band. */
    gem?: {
        color: string;
    };
    /** A floating ring above the crown that never quite touches down. */
    halo?: {
        color: string;
    };
    /** Hoods: bell-flowers tucked at the temple, open and hanging —
     *  the moonbell picked and worn. */
    blooms?: {
        color: string;
    };
    /** Hoods: two dry fangs at the mouth of the face opening — the
     *  adder's own, pointed down. */
    fangs?: {
        color: string;
    };
    /** Three slivers of night glass floating above the crown, each on
     *  its own slow bob — the rift's answer to a halo. */
    shards?: {
        color: string;
    };
    /** Circlets: icicle points hanging from the brow band — a crown the
     *  cold made and never asked back. */
    icicles?: {
        color: string;
    };
    /** Hoods: two light-ribbon tails streaming off the crown's trailing
     *  edge, waving on the sky's clock — the skydancer's wake. */
    streamers?: {
        colors: [string, string];
    };
    /** A thin ring round the crown with two small worlds circling it,
     *  near side bright and large, far side dim and small — a working
     *  orrery worn as a diadem. It keeps perfect time. */
    orbitals?: {
        color: string;
        ring?: string;
    };
    /** Hoods: two coals burning in the opening's shadow, pulsing on a
     *  slow breath — front only; the back keeps its secret. On the
     *  fire-hearted forged shells (furnace, wyrm) the same word is the
     *  heat inside the helm: grate glow, nostril vents, eye slits. */
    emberEyes?: {
        color: string;
    };
    /** A swept crest of three feathers off the crown, trailing back
     *  and fluttering at the tips — the hawk's wake. Painted before
     *  the shell so the roots tuck under. */
    crestfeathers?: {
        colors: [string, string];
    };
    /** Fireflies circling the crown on their own wandering loops,
     *  blinking — the forest keeps its king company. */
    fireflies?: {
        color: string;
    };
    /** Tempest shells: a storm arc snapping between the crown points on
     *  its own beat, and the charge glow that never quite leaves. */
    arcs?: {
        color: string;
    };
    /** A star glint winking off the crown on its own beat — the same
     *  polished-past-vanity law the body's gleam keeps. */
    gleam?: {
        color: string;
    };
    /** THE STANDARD: a slim pole rising off the crown flying a small
     *  square banner that ripples on the march wind's clock — the
     *  king's colors carried on the helm itself. The kingsmane word. */
    standard?: {
        pole: string;
        banner: string;
        trim?: string;
    };
    /** THE BONE MASK: a carved death-mask riding the armet's face in
     *  place of its wedge visor — brow ridge, cheek arcs, a nasal keel,
     *  the eye pits left dark for whatever looks out. Consumed by the
     *  armet shell as ITS face when present. The jadeskull word. */
    boneMask?: {
        color: string;
    };
    /** THE BONE CROWN: a row of forward-hooked fangs riding the crown
     *  centerline on a gilt seam — a trophy jaw worn as a comb, teeth
     *  where the spike crown keeps nails. The jadeskull word. */
    boneCrown?: {
        color: string;
        seam: string;
    };
    /** THE TRANSVERSE CREST: the legion officer's brush worn ear to
     *  ear — full span frontal where the fore-aft crest shows its
     *  blade, striped in the two colors. The redmarch word. */
    transverse?: {
        colors: [string, string];
    };
    /** THE AUREOLE: a fan of gilt rays standing behind the crown,
     *  breathing on a slow clock, tallest at the peak — dawn worn as
     *  a halo's older sister. Painted before the shell so the rays
     *  stand BEHIND the cloth. The sunhallow word. */
    aureole?: {
        color: string;
    };
    /** Iron tines rising off the crown band, each guttering a hot
     *  flame that re-shapes every beat — the coldfire idiom run hot,
     *  worn as a crown. The flamewrought word. */
    flamecrown?: {
        tine: string;
        flame: string;
    };
    /** Three angular rune glyphs orbiting the crown on the fake-3D
     *  depth law — the far side painted before the shell so the hood
     *  occludes it honestly, the near side riding above. None of them
     *  repeats. The aetherion word. */
    glyphs?: {
        color: string;
    };
    /** THE VIGIL: the warcrown's own fire — the brow gem and the eye
     *  cuts burn with a pilot glow that never dies, surging when the
     *  procession's rotation reaches the helm (the third station after
     *  the two shoulder banners). The oathgold word. */
    vigil?: {
        color: string;
    };
    /** THE KEYSTONE: the gatehelm's missing capstone — the broken arch
     *  over the crown never meets, and the stone that should close it
     *  hangs in the gap, point down, riding its own slow bob. The gap
     *  beneath it bleeds otherlight, surging when the breach rotation
     *  reaches the helm (the fourth station, after both shoulders and
     *  the chest). `glass` is the stone's night-glass body; `color` is
     *  the light that will not let it fall. The gatefall word. */
    keystone?: {
        color: string;
        glass: string;
    };
    /** Thistlehat: THE BLOOM — a real thistle head crowning the
     *  dropped tip: green calyx bulb under a brush of soft down,
     *  nodding on the breeze; at the gust it lets ONE seed go to
     *  ride the wind past the brim. The starter's jewel is alive. */
    bloom?: {
        calyx: string;
        down: string;
        seed: string;
    };
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
    verdance?: {
        vine: string;
        leaf: string;
        glow: string;
    };
    /** Bloomcrown: the orchid's keeping — the heart burning between
     *  the standards as the crown breathes open, dew at the fall
     *  tips, and pale petal `tails` streaming off the back (MUST
     *  contrast the plum, per the species-tails law). */
    bloomheart?: {
        color: string;
        dew: string;
        tails?: string;
    };
    /** Sedgehat: the darter — a dragonfly settled at the crown's foot,
     *  wings folded back along the body, shivering awake once a cycle. */
    darter?: {
        body: string;
        wing: string;
    };
    /** Heroncowl: the folded plume crest lapped down the swept peak,
     *  dark-tipped, each vane riding its own slow air. */
    plumecrest?: {
        color: string;
        tip: string;
    };
    /** Shroudcowl: THE STORM-EYE — the gold boss at the brow, the one
     *  forged thing on all that weather. */
    stormeye?: {
        color: string;
    };
    /** Shroudcowl: THE SHROUD — the orbiting fog puffs and the charge
     *  `ember` that lights them from within on the strike. */
    cloudwreath?: {
        color: string;
        ember: string;
    };
    /** Anvilcrown: the forked jewel hung off the anvil's spill on its
     *  chain, and the gold charge `seam` burning under the lip. */
    boltjewel?: {
        color: string;
        seam?: string;
    };
    /** Showerhat: the luck — the gilt `sun` boss at the band's leading
     *  side and the rain-`bead` drip ring off the brim. */
    showerluck?: {
        sun: string;
        bead: string;
    };
    /** Showerhat: the prism arc off the trailing brim — the rainbow
     *  only this weather owns, waking with the charge. */
    prismarc?: {
        colors: string[];
    };
    /** Coronacowl: THE CORONA — the zenith's crown of drawn rays at
     *  the peak, asleep to a frost seed through the quiet arc and
     *  erupting on the substorm; `star` is the pricks in the cloth. */
    corona?: {
        colors: string[];
        star: string;
    };
    /** Tidehat: the pearl hat band — one glimmer walks it, and the
     *  whole strand catches the light when the wave breaks. */
    pearls?: {
        color: string;
    };
    /** Depthcrown: THE DEEP LURE — the angler stalk arcing off the
     *  crown to hang its caged lamp before the brow, breathing on
     *  the tide; the deep's one lamp. */
    deeplure?: {
        stalk: string;
        glow: string;
    };
    /** Depthcrown: bioluminescent freckles on the cowl cloth, waking
     *  in a wave that travels the dome — the deep keeps count. */
    lumefreckles?: {
        color: string;
    };
    /** Depthcrown: jelly-bell lappets trailing at the jaw, scallop
     *  hems, swaying — hung things trail. */
    jellyveil?: {
        color: string;
    };
    /** Depthcrown: THE BELL CROWN — the medusa worn as the crown:
     *  scalloped bell over the cowl, organ glow inside, rim light
     *  breathing on the tide and flaring at the break. */
    bellcrown?: {
        bell: string;
        lume: string;
    };
    /** Murkcowl: THE RIPSEAM — the one drawn current woven down the
     *  seam of the cowl's depth bands: deep `water` casing under the
     *  cold `neon` core, its beads sinking with the flow. The murk's
     *  only light — carried by the water, never a glow. */
    ripseam?: {
        water: string;
        neon: string;
    };
    /** Murkcowl: THE DROWNLINE — the waterline lying across the
     *  veiled face, seen from below; it rises with the swell, past
     *  the eyes at the stand, and lets its bubbles go at the break.
     *  The wearer is under the water. The water does the looking. */
    drownline?: {
        color: string;
    };
    /** Maelcowl: the spiral the cloth was wound on — churn seams
     *  sweeping the dome, slowly turning, foam at each leading tip. */
    spiralwrap?: {
        color: string;
    };
    /** Maelcowl: spume — the flecks the streamer tears off at the
     *  break. */
    spume?: {
        color: string;
    };
    /** Hushcowl: THE RIFT LIGHT — the void's three values worn at the
     *  head: plasma casing and pale core on every torn edge, and the
     *  true void behind them (darker than any cloth on the garment).
     *  Feeds the severed peak's rims, the shell tear, and the
     *  wandering light in the doorway dark. */
    riftlight?: {
        casing: string;
        core: string;
        void: string;
    };
    /** Oathcowl: THE OATH COAL — the one sworn ember, set in an iron
     *  shrine at the brow. It has never once gone out. Breathes with
     *  the drawn breath; at the flare it remembers, and lets go one
     *  rising spark. */
    oathcoal?: {
        iron: string;
        coal: string;
        ember: string;
    };
    /** Oathcowl: the fissures in the char — drawn cracks carrying the
     *  ember crawl through the cloth (FIRE LIVES IN THE CRACK). */
    crackseams?: {
        casing: string;
        ember: string;
    };
    /** Stardiadem: star points rising off the woven band, center
     *  tallest. */
    starpoints?: {
        color: string;
    };
    /** Stardiadem: the halo rebuilt as a turning ring of small stars on
     *  the fake-3D depth law — near bright and large, far dim and
     *  small. Replaces the plain halo for the one set that owns it. */
    starring?: {
        color: string;
    };
    /** Hedgehat: the herb sprig tucked in the woven cord band. */
    sprig?: {
        color: string;
    };
    /** Courierhood: the waybill — a parchment ribbon pinned at the
     *  temple by a wax seal, streaming off the trailing edge. */
    waybill?: {
        color: string;
        seal: string;
    };
    /** Sharkmaw/marlincrest: the crest colors — sharkmaw reads `color`
     *  as its belly-pale and `flash` as the tooth ivory; marlincrest
     *  reads `color` as sail membrane and `flash` as the bill/spine
     *  counter-metal. */
    divecrest?: {
        color: string;
        flash: string;
    };
    /** Anglerhood: the rod-and-lure — a thin spine curving off the
     *  crown, dangling a warm lure bead before the brow. It breathes
     *  on a slow clock; the face below stays void. THE LURE IS
     *  ALWAYS WARM — bait must contrast the water. */
    lure?: {
        color: string;
    };
    /** Guildcowl: the guild's one vanity — a brass bead at the very
     *  tip of the master's beak peak, glinting rarely. */
    coinpin?: {
        color: string;
    };
    /** Latchhood: THE LATCH — iron brow band with a punched keyhole,
     *  jaw wrap, and three skeleton keys at the trailing jaw. */
    latch?: {
        band: string;
        keys: string;
        wrap: string;
    };
    /** Veilwrap: the cold light breathing inside the veil's one slit.
     *  Not eyes — a place where eyes refuse to be. */
    slitglow?: {
        color: string;
    };
    /** Gripmask: THE MASTER'S GRIP — the guild's red right hand
     *  clamped over a faceless visor void: `hand` the print, `dark`
     *  its shadowed underside, `ember` the two points of light that
     *  blink between the fingers on the rare clock. */
    grip?: {
        hand: string;
        dark: string;
        ember: string;
    };
    /** Drake: the slain drake's skull — `horn` the bone of the trailing
     *  horn pair and the fangs, `ember` the banked fire in the crest
     *  roots and the watching eyes, `maw` the furnace-dark void inside
     *  the bite. */
    drakeset?: {
        horn: string;
        ember: string;
        maw: string;
    };
    /** Foxmantle / wolfmantle: the worn pelt's own colors — the beast's
     *  coat, its dark points (nose, sockets, ear backs), its pale
     *  flashes (cheeks, fangs, frost tips); `ember` wakes the fox's
     *  bead eyes on a slow clock. Each kind reads the fields its own
     *  way — the emberEyes precedent. */
    pelt?: {
        color: string;
        dark: string;
        pale: string;
        ember?: string;
    };
    /** Shadowcowl: the ONE BRIGHT EDGE — a dusk-violet arris light down
     *  the cowl's leading fold; everything else stays night. */
    edgelight?: {
        color: string;
    };
    /** Wolfmantle: a slow pale breath curling from under the muzzle
     *  every few seconds — the winter worn honestly. */
    frostbreath?: {
        color: string;
    };
    /** Stagcrown: the moss band ringing the hood below the antler
     *  roots, tufts spilling where it ties. */
    mossband?: {
        color: string;
    };
    /** Mothcowl: THE MOTH'S OWN EYES — two large luminous compound
     *  discs set on the cowl above the face opening, faceted, glowing
     *  on a breath slower than anything human. The wearer's face keeps
     *  the dark below them; the moth does the looking. */
    motheyes?: {
        color: string;
    };
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
    /** Hareswift: hare-fur hocks — a pale fur tuft off the back of each
     *  ankle, the spring made visible. */
    hock?: {
        color: string;
    };
    /** Kingfisher: waxed waders — a hard waterline break high on the
     *  shin with one lit rim where the wax catches. */
    wader?: {
        color: string;
        rim: string;
    };
    /** Kingfisher: a small swept fin blade off each outer calf —
     *  sharp, back-raked, bright-edged. */
    calffin?: {
        color: string;
        edge: string;
    };
    /** Cutpurse: the tool roll strapped flat to the lead thigh, pick
     *  ends ticking out of it. */
    pickroll?: {
        color: string;
        glint?: string;
    };
    /** Moonless: wound shin bands — the veil's language carried to
     *  the ground; the loose tie dresses leg 0 only. */
    shadewrap?: {
        color: string;
        tie?: string;
    };
    /** Redhand: the Knife's spare, flat to the outer thigh. Muted
     *  register — no glint lives at the leg. */
    thighsheath?: {
        sheath: string;
        pommel: string;
    };
    /** Trapline: snare-cord X-lacing climbing the shin. */
    shinlace?: {
        color: string;
    };
    /** Emberfox: the fox's own socks — a hard dark break at mid-shin,
     *  tied off with an ember knot. */
    sock?: {
        color: string;
        tie?: string;
    };
    /** Wayfarer: a stitched road patch on the lead thigh. */
    roadpatch?: {
        color: string;
    };
    /** Wolfstalker: winter fur bursting over the knee. */
    furknee?: {
        color: string;
    };
    /** Nightveil: the thigh garter with its sheathed throwing blade. */
    garter?: {
        color: string;
        blade?: string;
    };
    /** Drakescale: lapped scale scallops down the thigh, tempered
     *  edges. */
    scalerows?: {
        plate: string;
    };
    /** Stagheart: moss-bound wrap bands with tufts spilling at the
     *  knee. */
    mossbind?: {
        color: string;
        tuft: string;
    };
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
    cuff?: {
        color: string;
    };
    /** Metal toe cap color (sabatons). */
    toe?: string;
    /** A short spike off the shaft top — dread sabatons. */
    spike?: boolean;
    /** Crossed straps climbing the shaft — the scout's lacing. */
    wrap?: {
        color: string;
    };
    /** A lumpy fur top instead of a clean cuff — winter boots. */
    fur?: {
        color: string;
    };
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
export declare const BODY_STYLES: Record<string, BodyStyle>;
export declare const HELM_STYLES: Record<string, HelmStyle>;
export declare const LEG_STYLES: Record<string, LegStyle>;
export declare const BOOT_STYLES: Record<string, BootStyle>;
/**
 * The glove wardrobe. Every themed set's pair is designed against that
 * set's own devices — a Warden glove grows the leaf-bladed patina, a
 * Dreadforge glove spikes like its pauldrons — never a generic mitt
 * with a new tint. Populated per-set in the wardrobe passes below.
 */
export declare const GLOVE_STYLES: Record<string, GloveStyle>;
export declare const OFFHAND_STYLES: Record<string, OffhandStyle>;
/** Unknown body item: a plain tunic in the item's color — today's read. */
export declare function bodyStyle(itemId: string): BodyStyle;
/** Unknown head item: a tinted barbute — full-face even as a stand-in,
 *  because a cap reads as a placeholder (THE FORGE LAW). */
export declare function helmStyle(itemId: string): HelmStyle;
export declare function legStyle(itemId: string): LegStyle;
export declare function bootStyle(itemId: string): BootStyle;
/** Unknown glove item: a plain mitt in the item's color, strap cuff. */
export declare function gloveStyle(itemId: string): GloveStyle;
export declare function offhandStyle(itemId: string): OffhandStyle;
//# sourceMappingURL=armorStyles.d.ts.map