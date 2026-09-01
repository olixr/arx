/**
 * THE WALL WEARS ITS KEEPING — the sixteen wall-hung painters: banners,
 * arms, drapes, pennants, signs, trellises, baskets, sill herbs, tapestries.
 * Moved verbatim off the Renderer class (foundations F2 wave A); the
 * painters reach the engine through the shared PaintHost slice.
 */
import { ClientGame } from '../game/clientGame.js';
import type { PaintHost } from './paintHost.js';
/**
 * THE HANGING LAW — wall-hung cloth. Detail.BannerCrown, BannerMoon,
 * and Tapestry are authored ON a wall tile and painted by that
 * wall's own face pass, inside the face frame: the cloth leans,
 * sinks, and sorts with the masonry it hangs from, and like glazing
 * it sheds when the reveal eases the wall below hanging height — a
 * sinking wall drops its rod before the crown could swallow it. The
 * ground bake draws nothing for these details (WALL_HUNG_DETAILS).
 * Coordinates are face-local: x in screen px, y rising NEGATIVE
 * from 0 at the wall's south base.
 */
export declare function wallHangings(rend: PaintHost, game: ClientGame, tx: number, ty: number, px0: number, s: number, whT: number, garrison: boolean): void;
/**
 * THE WALL TAKES A HANGING — the player's banner: the royal
 * swallowtail grammar in the ten common dyes, a woven diamond
 * where the crown would sit. Two-beat cloth (hoist sways, tails
 * trail), its own shadow seating it on the masonry.
 */
export declare function playerBannerOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, dye: number): void;
/**
 * The woven charge at a great cloth's heart, drawn in the house
 * metal. Features stay at or above the chest-law minimum — bold
 * marks the avenue reads, never embroidery only a zoom sees.
 */
export declare function paintBannerEmblem(rend: PaintHost, cx: number, cy: number, w: number, metal: string, emblem: number): void;
/**
 * THE GREAT CLOTH — the castle drop shared by the wall's
 * GreatBanner and the standing BannerStand (one cooper: never fork
 * the dialect). A square-bodied drop with a CRENELLATED hem — two
 * square notches biting up between three teeth, the castle-pillar
 * cut; the swallowtail stays the royals' and the street's. TRUE
 * SEWN BORDER law: the border is a trim-colored fill of the full
 * silhouette with the dye field inset, never a stroked line.
 * THE COLOR IS THE HOUSE: the woven charge follows the DYE (dye %
 * BANNER_EMBLEM_COUNT) — never a position hash, whose grid seams
 * once flew two different houses on one authored gatefront. Choose
 * the cloth, choose the charge; a matched pair can never argue.
 * Returns the outer path for the caller's ink.
 */
export declare function paintGreatCloth(rend: PaintHost, cx: number, yTop: number, bw: number, bl: number, dye: number, s: number, sway: number, lag: number): Path2D;
/**
 * THE WALL TAKES THE STEEL — mounted arms on the armory face.
 * Steel is STILL: nothing here samples the breeze but the great
 * crest's mantling ribbons — a mounted sword that swayed would
 * read as hanging by a thread. Every piece throws a soft SE ghost
 * on the masonry (the WeaponRack's iron-off-the-wood law), wears
 * one west light, and rings its own exposed silhouette; lapped
 * steel inks under the piece that laps it (the woodpile law
 * brought to the wall).
 */
export declare function wallArmsOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, form: number, garrison: boolean): void;
/**
 * THE CASTLE DROP — the great hall banner off a lance rod. Taller,
 * wider, and crenel-hemmed against the street banner's swallowtail;
 * garrison faces fly it garrison-tall so the avenue reads the
 * colors from the market. Charge by the sixteen-tile heraldry.
 */
export declare function greatBannerOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, dye: number, garrison: boolean): void;
/**
 * THE LONG FALL — a floor-length drape off a turned timber rod:
 * gathered at a corded waist, flaring to a hem that PUDDLES on the
 * boards (cloth long enough to spill is the luxury the castle pays
 * for). Interior cloth has weight: the hem barely breathes, the
 * tie tassel swings a touch — never the street banner's ripple.
 */
export declare function drapeFallOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, dye: number, garrison: boolean): void;
/**
 * THE HERALD'S ROW — hanging pennants: a wrought rail bearing three
 * long tapered pennons in the chosen dye, each bordered in its cream
 * partner (the fill is trim, the inner field cloth — a true sewn
 * border, never a stroked cheat), the center pennon longer and
 * charged with the woven diamond, the points running out solid trim
 * into a bound tassel. Headers are pinned to the rail; the body
 * sways and the tip trails a beat behind (the two-beat law), each
 * pennon a phase out of step with its neighbours. Adjacent pennant
 * tiles merge into one continuous rail — straps only at true free
 * ends (the ONE RAIL law brought to the wall). ONE PATH: each
 * pennon's silhouette is both its fill and its ring.
 */
export declare function pennantOnFace(rend: PaintHost, game: ClientGame, tx: number, ty: number, px0: number, s: number, dye: number): void;
/**
 * The bracket sign — PERSPECTIVE-HONEST: a board hung perpendicular
 * to a south face would show the camera only its edge, so on these
 * faces the trade board hangs FLAT IN THE WALL PLANE — a wrought
 * rod above it, two chains to its corners, the whole sign swinging
 * as a pendulum in that plane (an honest motion for an in-plane
 * board). The face-on read is legitimate carpentry, not a cheat:
 * wall-hung painted boards are period signage. Eight carved motifs,
 * chunky enough to read at street zoom.
 */
export declare function bracketSignOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, motif: number): void;
/**
 * One carved trade motif, centered at (mx,my) in a w-wide field —
 * chunky flat-vector, two tones, readable at street zoom. Order is
 * FOREVER (the id math): mug, loaf, blade, fish, sprig, boot, bed,
 * hammer.
 */
export declare function signMotif(rend: PaintHost, motif: number, mx: number, my: number, w: number): void;
/**
 * The trellis: garden lattice up the wall face, a climbing vine
 * choosing its species — ivy's deep green, the madder rose in
 * bloom, the hopvine's pale cones. Leaf tips flutter; the blooms
 * carry a glint (the beacon law, whispered).
 */
export declare function trellisOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, species: number): void;
/**
 * The wall basket: a wicker bowl off a bracket peg, blooms in the
 * FlowerBox's own mixed palette, swaying on its rope like a slow
 * pendulum. The gardener's smallest word.
 */
export declare function wallBasketOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number): void;
/**
 * THE HERBALIST'S SILL: three glazed pots standing on the window's
 * sill course, herbs by mix — the one hanging painted by the window
 * stack itself. Coordinates arrive in the wall's leaned face frame;
 * sillY is the glass's bottom edge (the sill course paints just
 * below it). GLAZED WARE NEVER BARE CLAY: the pots deal from the
 * jar-glaze roster, each with its slip band and lit cheek, and the
 * row is dealt — heights, jitter, and species stations vary by the
 * world hash so no two sills in a street read as one stamp.
 */
export declare function sillHerbsOnSill(rend: PaintHost, tx: number, ty: number, wx: number, wxE: number, sillY: number, s: number, mix: number): void;
/**
 * THE HARVEST ON THE BEAM: a pegged oak batten across the wall
 * face, three heads-down drying bundles and a seed string swinging
 * on the banner's two-beat breeze — the herbalist's overflow where
 * the freestanding rack is the workshop station. Bundle heads reuse
 * the rack's layered-teardrop grammar at wall scale; the mix keys
 * the hues (green harvest / healer's mix / seed heads).
 */
export declare function herbBundlesOnFace(rend: PaintHost, tx: number, ty: number, px0: number, s: number, mix: number): void;
/**
 * The grand tapestry — the Silverfall weave. Adjacent wall tiles of
 * the same run carrying Detail.Tapestry merge into ONE wide hanging:
 * every member computes the run's extent, draws the ENTIRE
 * composition, and clips to its own face span, so the picture
 * assembles seamlessly from identical geometry (the one-loom law,
 * raised onto the wall). The scene is the city's own: the silver
 * fall dropping from the ridge saddle past the keep to the water,
 * under a gold sun.
 */
export declare function tapestryOnFace(rend: PaintHost, game: ClientGame, tx: number, ty: number, px0: number, s: number, garrison: boolean): void;
//# sourceMappingURL=wallHungArt.d.ts.map