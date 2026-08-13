import { type ArxMark } from './wornLight.js';
/**
 * Visual equipment styles — the CAPE_STYLES pattern extended to every
 * armor slot. Each record is pure JSON-shaped data a painter interprets;
 * the content pass authors records + palettes here, never new painters.
 * Unknown items fall back to silhouettes derived from their item color,
 * so every future def is dressed the moment it exists.
 *
 * Painters run inside drawHumanoid's frames (torso squash frame, head
 * frame, arm joints) so the fake-3D foreshortening and facing bands are
 * inherited for free. Laws every painter obeys:
 * - hurt ⇒ paint flat #ffffff (the white-flash silhouette);
 * - fills/strokes on the live ctx only, no allocation, ≤ ~10 subpaths
 *   per garment (the cape budget — these run per entity per frame);
 * - front/profile/back reads gate on profileK/backK/lead like the face.
 */
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
    /** The high-wardrobe kinds each have ONE owner set: `axeblade` the
     *  jadeskull crescents, `boneridge` the fellbone slab fan,
     *  `thorncrest` the rimethorn hooks (palethorn is its pale quench),
     *  `lionhead` the kingsmane sculpted lions, `sunfan` the sunhallow
     *  gilt ray petals, `veilwing` the gloamsight swept wing plates,
     *  `stormspire` the stormsinger storm-glass crystals, `charbrand`
     *  the flamewrought ember-seamed char slabs, `wardcrest` the
     *  duskwarden brass crescent with its watch stone, `aethercrest`
     *  the aetherion floating silver arcs. */
    pauldron: 'none' | 'round' | 'spiked' | 'layered' | 'bladed' | 'fur' | 'feathered' | 'orbs' | 'shards' | 'wyrmwing' | 'axeblade' | 'boneridge' | 'thorncrest' | 'lionhead' | 'sunfan' | 'veilwing' | 'stormspire' | 'charbrand' | 'wardcrest' | 'aethercrest';
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
    /** Big mismatched cloth patches with stitch ticks — the homespun read. */
    patches?: string;
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
     * Two swallow-tailed banner pennons flying off the shoulders,
     * rippling on the march wind's own clock — heraldry that moves.
     * Field in the first color, tail dip in the second.
     */
    pennons?: {
        colors: [string, string];
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
    kind: 'greathelm' | 'bascinet' | 'barbute' | 'armet' | 'sallet' | 'radiant' | 'ramfort' | 'warmask' | 'dread' | 'briar' | 'drake' | 'aurochs' | 'barrow' | 'tempest' | 'furnace' | 'wyrm' | 'champion' | 'hood' | 'circlet' | 'wizard' | 'veil' | 'magus';
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
/**
 * The torso local frame drawHumanoid establishes before calling in:
 * translated to the hip line, rotated by combat lean, scaled by the
 * fake-3D squash — every coordinate here foreshortens for free.
 */
export interface TorsoFrame {
    s: number;
    /** Shoulder / waist half-widths, hip→shoulder height (local units). */
    tw: number;
    ww: number;
    th: number;
    lead: number;
    profileK: number;
    backK: number;
    hurt: boolean;
    /** Foot-lift differential — the gait beat hems sway on. */
    strideSw: number;
    /** Wall-clock ms — hem flutter, ember pulses, living details. */
    nowMs: number;
    /** Gait blend 0..1 — billow and cloth drag scale with real speed. */
    runF: number;
    /**
     * Cloth drag in local x: the hem trails the direction of travel like
     * real cloth (screen travel, un-squashed by the caller). Signed.
     */
    dragX: number;
    /**
     * Seated blend 0..1 (the caller-smoothed sit channel). A seated robe
     * cannot hang its full length — the skirt pools on the ground.
     */
    sit?: number;
    /** Ground line under the body in torso-local units (seated drape). */
    groundY?: number;
    /** Solved knees in the torso local frame (seated knee tents). */
    seatKnees?: Array<{
        x: number;
        y: number;
    }>;
}
/**
 * Torso garment. Replaces the fixed tunic: the `tunic` silhouette with
 * no details is stroke-for-stroke the original body. Pauldrons are NOT
 * drawn here — they are true shoulder joints, painted in screen space
 * on the solved shoulder anchors (drawPauldron) so they ride the arms.
 */
export declare function drawTorsoGarment(ctx: CanvasRenderingContext2D, st: BodyStyle, f: TorsoFrame): void;
export declare function drawPauldron(ctx: CanvasRenderingContext2D, st: BodyStyle, x: number, y: number, side: number, s: number, squashK: number, hurt: boolean, near: boolean, nowMs?: number, 
/** THE SHOULDER GLOBE's depth channel, -1 (far) .. +1 (near): the
 *  caller projects the shoulder bar through the tilted camera and
 *  this cap's place on it sizes the whole assembly — perspective as
 *  size, before the shading says a word. 0 = the level flank read. */
depthK?: number, 
/** Outward lean, radians: the cap rotates toward its own outward
 *  screen direction as the body turns — worn on the deltoid, not
 *  gimbaled upright at every heading. */
tilt?: number): void;
/** The head local frame (inside the torso squash) drawHelmet works in. */
export interface HeadFrame {
    s: number;
    headX: number;
    headY: number;
    hw: number;
    hh: number;
    cut: number;
    headR: number;
    fx: number;
    profileK: number;
    backK: number;
    lead: number;
    hurt: boolean;
    /** Wall-clock ms — hat-tip sway, living micro-motion. */
    nowMs: number;
}
/**
 * Styled head gear. `dome` reproduces the original helmet exactly;
 * the other kinds extend the same band grammar the face uses.
 */
export declare function drawHelmet(ctx: CanvasRenderingContext2D, st: HelmStyle, f: HeadFrame): void;
/**
 * Arm-carried offhand, strapped to the solved off forearm — drawn in
 * the same depth layer as the arm so the strap never breaks.
 */
export declare function drawOffhandOnArm(ctx: CanvasRenderingContext2D, st: OffhandStyle, arm: {
    ex: number;
    ey: number;
    kx: number;
    ky: number;
}, s: number, profileK: number, hurt: boolean, nowMs?: number): void;
/**
 * Back-mounted quiver (screen space, at the shoulder line). Depth is
 * the caller's: behind the torso when the player faces the camera, in
 * front when they face away — the cape's facing law. When a cape is
 * worn the quiver drops to the off hip so cloth and leather never fight.
 */
export declare function drawQuiver(ctx: CanvasRenderingContext2D, st: OffhandStyle, x: number, y: number, s: number, lead: number, hurt: boolean, nowMs?: number): void;
//# sourceMappingURL=armor.d.ts.map