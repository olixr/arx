/**
 * THE GAZETTEER — what the herald says about an authored place.
 *
 * One entry per built-in zone: the epithet the ceremony speaks under
 * the name, one plain sentence of what the place IS, and the danger
 * tier of the surrounding country so the herald can read the walk-out
 * from the one law table (DANGER_LAWS — never a second level ladder).
 *
 * Copy obeys docs/VOICE.md: short, plain, no dashes, no zingers. A
 * zone with no entry still discovers fine — the herald just speaks
 * the kind word and skips the story line. Frontier sites never live
 * here: their story is PoiDef.description, keyed by the wire's defId.
 */

export interface GazetteerEntry {
  /** The epithet spoken under the name (the herald sets it uppercase). */
  epithet: string;
  /** One plain sentence of what this place is. */
  line: string;
  /**
   * Danger tier of the country around the walls (a DANGER_LAWS row).
   * The herald turns it into pips, a level band, and a threat word.
   * Absent = the herald stays quiet about the surrounding land.
   */
  country?: number;
}

export const GAZETTEER: Readonly<Record<string, GazetteerEntry>> = {
  dawnmead: {
    epithet: 'The awakening village',
    line: 'Every road in the Dawnlands sets out from this hearth.',
    country: 1,
  },
  amberford: {
    epithet: 'The crossroads market town',
    line: 'Fen trade crosses the ford here and the roads part for the north.',
    country: 2,
  },
  silverfall: {
    epithet: 'The mountain capital',
    line: 'The crown keeps its court above the falls and the terraces climb to meet it.',
    country: 4,
  },
  saltmere: {
    epithet: 'The town at the water’s end',
    line: 'The quay and the salt pans keep the Salt Road fed.',
    country: 3,
  },
  pinewatch: {
    epithet: 'The watch on the old wood',
    line: 'The muster yard and the boom stand guard where the pines grow dark.',
    country: 4,
  },
  hartfell: {
    epithet: 'The town past the treeline',
    line: 'A warm ring of walls where the fells run to the far dark.',
    country: 5,
  },
  undercroft: {
    epithet: 'The buried works',
    line: 'Old mason halls under the mountain, dug deep and left to the dark.',
    country: 5,
  },
  lowhall: {
    epithet: 'The hall under the roads',
    line: 'The Red Company keeps its hearth where five cities keep their cellars.',
  },
};

/**
 * The threat ladder, one word per danger tier — the walk-out's names,
 * spoken by the herald beside the level band. Indexed by tier 0..5,
 * clamped by the caller through dangerLaw's own bounds.
 */
export const THREAT_WORDS: readonly string[] = [
  'The settled land',
  'The near frontier',
  'The walk out',
  'The expedition line',
  'The deep frontier',
  'The far dark',
];
