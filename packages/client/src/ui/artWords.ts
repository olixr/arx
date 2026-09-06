/**
 * THE HAND SEES — the technique grammar in the player's own words.
 *
 * THE MASTERED HAND gave every art a role and a relationship (a word it
 * leaves in the air, a word it answers, ground it leaves, a finale, a
 * kill that hands the seat back). The wire and the model speak in
 * field names; the player must never have to. This book turns each
 * word into a whole sentence in THE PEOPLE SPEAK register, names the
 * five roles, and finds an art's combo partners across every school
 * (the free hand's point: a secret answers another school's word).
 */
import { ABILITIES, SECRET_ARTS, TECHNIQUES, abilityDef } from '@arx/content';
import type { AbilityDef, AbilityRole } from '@arx/shared';

export interface WordEntry {
  /** The word as a seal reads it: short, upper on the plate. */
  seal: string;
  /** "…leaves the foe BRANDED" — what the opener does to the world. */
  leaves: string;
  /** "…a branded foe" — the state a follower reads. */
  reads: string;
}

export const WORD_BOOK: Record<string, WordEntry> = {
  brand: { seal: 'Brand', leaves: 'brands the foe for the next shot', reads: 'a branded foe' },
  plant: { seal: 'Plant', leaves: 'plants the ground it lands on', reads: 'planted ground' },
  loose: { seal: 'Loose', leaves: 'leaves a shaft loosed in the air', reads: 'a shaft just loosed' },
  burn: { seal: 'Burn', leaves: 'sets the foe burning', reads: 'a burning foe' },
  chill: { seal: 'Chill', leaves: 'leaves the foe chilled', reads: 'a chilled foe' },
  shock: { seal: 'Shock', leaves: 'leaves the foe charged with lightning', reads: 'a charged foe' },
  hollow: { seal: 'Hollow', leaves: 'opens a hollow the next working falls into', reads: 'an opened hollow' },
  root: { seal: 'Root', leaves: 'holds the foe rooted', reads: 'a rooted foe' },
  stagger: { seal: 'Stagger', leaves: 'sets the foe reeling', reads: 'a reeling foe' },
  sunder: { seal: 'Sunder', leaves: 'cracks the guard', reads: 'a cracked guard' },
  riposte: { seal: 'Riposte', leaves: 'opens the riposte', reads: 'an opened riposte' },
  venom: { seal: 'Venom', leaves: 'steeps the foe in venom', reads: 'a venomed foe' },
  expose: { seal: 'Expose', leaves: 'opens the foe to the knife', reads: 'an exposed foe' },
  vanish: { seal: 'Vanish', leaves: 'takes you out of their sight', reads: 'a foe who lost you' },
  wall: { seal: 'Wall', leaves: 'raises the wall', reads: 'a raised wall' },
  taunt: { seal: 'Taunt', leaves: 'calls every foe to you', reads: 'a foe you called out' },
  quake: { seal: 'Quake', leaves: 'sets the ground quaking', reads: 'quaking ground' },
  left: { seal: 'Left', leaves: 'is the left hand’s stroke', reads: 'the left hand’s stroke' },
  right: { seal: 'Right', leaves: 'is the right hand’s stroke', reads: 'the right hand’s stroke' },
  rend: { seal: 'Rend', leaves: 'opens a wound the shears can read', reads: 'an open wound' },
  rally: { seal: 'Rally', leaves: 'raises the rally', reads: 'a raised rally' },
  weaken: { seal: 'Weaken', leaves: 'dulls the foe’s arm', reads: 'a dulled foe' },
  hook: { seal: 'Hook', leaves: 'hooks the row onto your point', reads: 'a hooked row' },
  line: { seal: 'Line', leaves: 'draws the line', reads: 'a drawn line' },
};

export const ROLE_BOOK: Record<AbilityRole, { name: string; glyph: string; tone: string; said: string }> = {
  opener: { name: 'Opener', glyph: '◔', tone: '#f2c94c', said: 'The setup. It leaves a word in the air; a payoff answers it.' },
  payoff: { name: 'Payoff', glyph: '✦', tone: '#e07a3a', said: 'The answer. Cast inside the opening it reads, it lands heavier.' },
  sustain: { name: 'Sustain', glyph: '≡', tone: '#7fb0d8', said: 'The held note or the standing ground. Hold it and the last beat pays.' },
  answer: { name: 'Answer', glyph: '⌂', tone: '#9ec48a', said: 'The defence, the step, the stance. It keeps you in the fight.' },
  crown: { name: 'Crown', glyph: '♛', tone: '#f2c94c', said: 'The capstone. Three acts in one press.' },
};

export function wordOf(word: string): WordEntry {
  return WORD_BOOK[word] ?? { seal: word, leaves: `leaves the word ${word}`, reads: `the word ${word}` };
}

export function afterWords(ab: AbilityDef): string[] {
  if (!ab.follow) return [];
  return typeof ab.follow.after === 'string' ? [ab.follow.after] : [...ab.follow.after];
}

/** "Cast on a branded foe or a reeling foe" — the follow, spoken. */
export function followSentence(ab: AbilityDef): string {
  const reads = afterWords(ab).map((w) => wordOf(w).reads);
  const on = reads.length <= 1 ? reads[0] ?? '' : `${reads.slice(0, -1).join(', ')} or ${reads.at(-1)}`;
  const f = ab.follow!;
  const gains: string[] = [];
  if (f.damageMult) gains.push(`lands ${f.damageMult >= 2 ? 'twice as hard' : f.damageMult >= 1.5 ? 'half again as hard' : 'harder'}`);
  if (f.radiusMult) gains.push('reaches wider');
  if (f.knockbackMult) gains.push('shoves harder');
  if (f.status) gains.push(`lays ${wordOf(f.status.status).seal.toLowerCase()}`);
  if (f.refundTicks) gains.push(`gives back ${secs(f.refundTicks)}`);
  if (f.self) gains.push('dresses you');
  const gain = gains.length ? gains.join(' and ') : 'answers';
  return `Cast on ${on} within ${secs(f.windowTicks)}, it ${gain}.`;
}

export function leavesSentence(ab: AbilityDef): string {
  return ab.tag ? `It ${wordOf(ab.tag).leaves}.` : '';
}

export function secs(ticks: number): string {
  const s = ticks / 20;
  return `${s % 1 === 0 ? s : s.toFixed(1)}s`;
}

export interface Partner {
  id: string;
  name: string;
  style: string;
  word: string;
}

const seats = (): Array<{ ability: string; style: string }> => [...TECHNIQUES, ...SECRET_ARTS].map((t) => ({ ability: t.ability, style: t.style }));

/** The arts that ANSWER this one's word — across every school. */
export function answeredBy(ab: AbilityDef): Partner[] {
  if (!ab.tag) return [];
  const out: Partner[] = [];
  for (const s of seats()) {
    const other = ABILITIES.get(s.ability);
    if (!other || other.id === ab.id || !afterWords(other).includes(ab.tag)) continue;
    out.push({ id: other.id, name: other.name, style: s.style, word: ab.tag });
  }
  return out;
}

/** The arts whose word this one reads — its setups, across every school. */
export function setUpBy(ab: AbilityDef): Partner[] {
  const words = afterWords(ab);
  if (!words.length) return [];
  const out: Partner[] = [];
  for (const s of seats()) {
    const other = ABILITIES.get(s.ability);
    if (!other || other.id === ab.id || !other.tag || !words.includes(other.tag)) continue;
    out.push({ id: other.id, name: other.name, style: s.style, word: other.tag });
  }
  return out;
}

/** The one-line grammar for a tooltip: role, word left, word read, ground, finale, kill. */
export function artGrammarLine(ab: AbilityDef): string {
  const parts: string[] = [];
  if (ab.role) parts.push(ROLE_BOOK[ab.role].name);
  if (ab.follow) parts.push(`answers ${afterWords(ab).map((w) => wordOf(w).seal.toLowerCase()).join(' or ')} (${secs(ab.follow.windowTicks)})`);
  if (ab.tag) parts.push(`leaves ${wordOf(ab.tag).seal.toLowerCase()}`);
  if (ab.aftermath) parts.push(`the ground stays ${secs(ab.aftermath.fieldTicks)}`);
  if (ab.finaleMult && ab.finaleMult > 1) parts.push(`last beat ×${ab.finaleMult}`);
  if (ab.onKill) parts.push(`a kill gives back ${secs(ab.onKill.refundTicks)}`);
  return parts.join(' · ');
}

export function roleOfId(id: string): AbilityRole | undefined {
  return abilityDef(id)?.role;
}
