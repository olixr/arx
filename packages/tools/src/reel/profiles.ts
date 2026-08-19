/**
 * THE CAST — the bodies the reels are performed by.
 *
 * A profile is an account plus a one-time make-ready: the skills, the
 * arms, the armour. It runs once and then persists in the database, so
 * the second capture of the day skips straight to staging. Re-run any
 * profile with `--make` when the content beneath it changes.
 *
 * Every profile is a legitimate character. Nothing here is a render
 * cheat — a player who put the hours in stands exactly like this.
 */

export interface Profile {
  id: string;
  /** In-world name. Short: it stands over the body on nameplates. */
  name: string;
  /** Skills to carry to mastery before the arms are handed over. */
  skills: string[];
  /** Dev commands run once, in order, at make-ready. */
  make: string[];
  /** Worn kit, in equip order. */
  wear: string[];
}

/** 13,034,431 xp is level 99; the command caps at ten million a call. */
const MASTER = ['/xp SKILL 10000000', '/xp SKILL 4000000'];
const master = (skills: string[]) =>
  skills.flatMap((s) => MASTER.map((c) => c.replace('SKILL', s)));

export const PROFILES: Record<string, Profile> = {
  /** THE BLADE — the greatsword line, for the combat and crown reels. */
  blade: {
    id: 'blade',
    name: 'Ash',
    skills: ['vitality', 'combat', 'twohand', 'onehand', 'defence', 'shield', 'arx', 'archery', 'beastcraft', 'polearm', 'dualwield', 'sneak'],
    make: [],
    wear: [],
  },
  /** THE ADEPT — the arx line, for the arcana reels. */
  adept: {
    id: 'adept',
    name: 'Wren',
    skills: ['vitality', 'arx', 'combat', 'defence', 'enchanting', 'herbalism', 'beastcraft'],
    make: [],
    wear: [],
  },
  /** THE STEADER — the tended-earth reels: fields, beasts, the yard. */
  steader: {
    id: 'steader',
    name: 'Mab',
    skills: ['vitality', 'farming', 'foraging', 'herbalism', 'cooking', 'construction', 'beastcraft', 'woodcutting', 'mining', 'combat', 'onehand'],
    make: [],
    wear: [],
  },
};

export function makeCommands(p: Profile): string[] {
  return [...master(p.skills), ...p.make];
}
