import { isRarityTier, isSkillId } from '@arx/shared';
import { ITEMS } from '../items.js';
import { NPCS } from '../npcs.js';
import { NPC_ACTORS } from '../actors/registry.js';
import { parseDialogueMarkup } from '../dialogues/markup.js';
import { FACTION_FLAG_RE, isFactionFlag } from '../factions/flags.js';
import { FACTIONS, factionIds } from '../factions/factions.js';
import type {
  QuestDef,
  QuestDrop,
  QuestObjective,
  QuestRequires,
  QuestRewards,
  QuestStage,
} from './types.js';

/**
 * THE ONE VALIDATOR — every path a quest def can travel goes through
 * here: authored JSON at registry init, DB rows reassembled at server
 * boot, and tool submissions. Errors are collected, not thrown, so
 * tooling can show a full report.
 */

export type ValidateQuestResult =
  | { ok: true; quest: QuestDef }
  | { ok: false; errors: string[] };

/**
 * Live cross-reference sets. The authored registries are the default;
 * a running server passes its DB-loaded rosters so a quest may name a
 * studio-born actor the shipped code never heard of. `placeIds` is the
 * set of authored zone ids (bare, without the 'zone:' prefix); absent
 * = structural check only.
 */
export interface ValidateQuestRefs {
  actorIds?: ReadonlySet<string>;
  npcIds?: ReadonlySet<string>;
  itemIds?: ReadonlySet<string>;
  placeIds?: ReadonlySet<string>;
}

const SLUG_RE = /^[a-z][a-z0-9_]*$/;
const PLACE_RE = /^zone:[a-z][a-z0-9_]*$/;
/** Quest requires/rewards flags: plain story slugs or dlg: completions. */
const STORY_FLAG_RE = /^(dlg:)?[a-z][a-z0-9_]*$/;
/**
 * THE FLAG OBJECTIVE's flag: a plain slug or a trigger's once-mark
 * (the trigger validator's own FLAG_RE) — never world:/quest:/faction:,
 * which the world answers and no hand ever holds.
 */
const OBJECTIVE_FLAG_RE = /^(trig:)?[a-z][a-z0-9_]*$/;
/** THE PEOPLE SPEAK: the label is a wire name, ninety or fewer. */
const OBJECTIVE_LABEL_MAX = 90;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isCount(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function knownActor(id: string, refs?: ValidateQuestRefs): boolean {
  return refs?.actorIds ? refs.actorIds.has(id) : NPC_ACTORS.has(id);
}

function knownNpc(id: string, refs?: ValidateQuestRefs): boolean {
  return refs?.npcIds ? refs.npcIds.has(id) : NPCS.has(id);
}

function knownItem(id: string, refs?: ValidateQuestRefs): boolean {
  return refs?.itemIds ? refs.itemIds.has(id) : ITEMS.has(id);
}

function validateObjective(
  raw: unknown,
  where: string,
  errors: string[],
  refs?: ValidateQuestRefs,
): QuestObjective | undefined {
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  if (raw.kind === 'kill') {
    if (typeof raw.npc !== 'string' || !knownNpc(raw.npc, refs)) {
      errors.push(`${where} references unknown npc '${String(raw.npc)}'`);
      return undefined;
    }
    if (!isCount(raw.count, 1, 500)) {
      errors.push(`${where}.count must be an integer 1..500`);
      return undefined;
    }
    return { kind: 'kill', npc: raw.npc, count: raw.count };
  }
  if (raw.kind === 'collect') {
    if (typeof raw.item !== 'string' || !knownItem(raw.item, refs)) {
      errors.push(`${where} references unknown item '${String(raw.item)}'`);
      return undefined;
    }
    // Rolled gear is instance-addressed (the roll IS the item) — a
    // turn-in consumes by id, so only plain, roll-less items may be
    // asked for. Checkable only against the authored registry.
    if (!refs?.itemIds && ITEMS.get(raw.item)?.gear) {
      errors.push(`${where} asks for rolled gear '${raw.item}' — collect objectives take plain items only`);
      return undefined;
    }
    if (!isCount(raw.count, 1, 500)) {
      errors.push(`${where}.count must be an integer 1..500`);
      return undefined;
    }
    return { kind: 'collect', item: raw.item, count: raw.count };
  }
  if (raw.kind === 'discover') {
    if (typeof raw.place !== 'string' || !PLACE_RE.test(raw.place) || raw.place.length > 64) {
      errors.push(`${where}.place must match ^zone:[a-z][a-z0-9_]*$`);
      return undefined;
    }
    if (refs?.placeIds && !refs.placeIds.has(raw.place.slice(5))) {
      errors.push(`${where}.place '${raw.place}' is not a known zone`);
      return undefined;
    }
    return { kind: 'discover', place: raw.place };
  }
  if (raw.kind === 'talk') {
    if (typeof raw.actor !== 'string' || !knownActor(raw.actor, refs)) {
      errors.push(`${where} references unknown actor '${String(raw.actor)}'`);
      return undefined;
    }
    return { kind: 'talk', actor: raw.actor };
  }
  if (raw.kind === 'flag') {
    // THE FLAG OBJECTIVE: the world already knows the fact; the quest
    // asks you to have it be true. Only a holdable flag may be asked
    // for — the synthetic namespaces are answered live and can never
    // be stamped on a character.
    if (typeof raw.flag !== 'string' || !OBJECTIVE_FLAG_RE.test(raw.flag) || raw.flag.length > 64) {
      errors.push(
        `${where}.flag '${String(raw.flag)}' must be a plain story slug (or trig: once-mark) — never world:/quest:/faction:`,
      );
      return undefined;
    }
    if (typeof raw.label !== 'string' || raw.label.length === 0 || raw.label.length > OBJECTIVE_LABEL_MAX) {
      errors.push(`${where}.label must be a non-empty string of at most ${OBJECTIVE_LABEL_MAX} chars`);
      return undefined;
    }
    return { kind: 'flag', flag: raw.flag, label: raw.label };
  }
  errors.push(`${where}.kind must be 'kill', 'collect', 'discover', 'talk', or 'flag'`);
  return undefined;
}

function validateStage(
  raw: unknown,
  index: number,
  last: boolean,
  errors: string[],
  refs?: ValidateQuestRefs,
): QuestStage | undefined {
  const where = `stages[${index}]`;
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!SLUG_RE.test(id) || id.length > 48) {
    errors.push(`${where}.id '${String(raw.id)}' must match ^[a-z][a-z0-9_]*$ (max 48 chars)`);
    return undefined;
  }
  const stage: QuestStage = { id, journal: '', objectives: [] };
  if (typeof raw.journal !== 'string' || raw.journal.length === 0 || raw.journal.length > 600) {
    errors.push(`${where}.journal must be a non-empty string of at most 600 chars`);
  } else {
    stage.journal = raw.journal;
    // The one markup parser rules the journal too.
    const parsed = parseDialogueMarkup(raw.journal);
    for (const e of parsed.errors) errors.push(`${where}.journal: ${e}`);
    for (const tok of parsed.tokens) {
      if (tok.kind === 'item' && !knownItem(tok.item, refs)) {
        errors.push(`${where}.journal: {item:${tok.item}} references an unknown item`);
      }
    }
  }
  if (!Array.isArray(raw.objectives) || raw.objectives.length < 1 || raw.objectives.length > 4) {
    errors.push(`${where}.objectives must be an array of 1..4 objectives`);
    return stage;
  }
  for (const [i, o] of raw.objectives.entries()) {
    const obj = validateObjective(o, `${where}.objectives[${i}]`, errors, refs);
    if (!obj) continue;
    // THE TURN-IN CONSUMES: collected items are taken only when the
    // quest is handed in, so a collect may only stand in the FINAL
    // stage — an earlier one could never advance honestly.
    if (obj.kind === 'collect' && !last) {
      errors.push(`${where}.objectives[${i}]: collect objectives may only appear in the final stage`);
      continue;
    }
    stage.objectives.push(obj);
  }
  if (raw.mark !== undefined) {
    const m = raw.mark;
    if (
      !isRecord(m) ||
      !isCount(m.x, -20000, 20000) ||
      !isCount(m.y, -20000, 20000)
    ) {
      errors.push(`${where}.mark must be {x, y} integer world tiles within ±20000`);
    } else {
      stage.mark = { x: m.x, y: m.y };
    }
  }
  return stage;
}

function validateRequires(
  raw: unknown,
  errors: string[],
): QuestRequires | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    errors.push('requires must be an object');
    return undefined;
  }
  const out: QuestRequires = {};
  if (raw.quests !== undefined) {
    if (!Array.isArray(raw.quests) || raw.quests.length > 4) {
      errors.push('requires.quests must be an array of at most 4 quest ids');
    } else {
      out.quests = [];
      for (const q of raw.quests) {
        if (typeof q !== 'string' || !SLUG_RE.test(q) || q.length > 48) {
          errors.push(`requires.quests entry '${String(q)}' must be a quest id slug`);
          continue;
        }
        out.quests.push(q);
      }
    }
  }
  if (raw.skills !== undefined) {
    if (!Array.isArray(raw.skills) || raw.skills.length > 3) {
      errors.push('requires.skills must be an array of at most 3 entries');
    } else {
      out.skills = [];
      for (const [i, s] of raw.skills.entries()) {
        if (!isRecord(s) || typeof s.skill !== 'string' || !isSkillId(s.skill)) {
          errors.push(`requires.skills[${i}].skill is not a known skill`);
          continue;
        }
        if (!isCount(s.level, 2, 99)) {
          errors.push(`requires.skills[${i}].level must be an integer 2..99`);
          continue;
        }
        out.skills.push({ skill: s.skill, level: s.level });
      }
    }
  }
  if (raw.flags !== undefined) {
    if (!Array.isArray(raw.flags) || raw.flags.length > 4) {
      errors.push('requires.flags must be an array of at most 4 flags');
    } else {
      out.flags = [];
      for (const f of raw.flags) {
        // Availability is answered anywhere, speakerless, and must
        // never recurse — so no world: (needs a speaker) and no
        // quest: (requires.quests is the cross-quest gate). faction:
        // band gates ARE speakerless (the name is the player's) and
        // pass under their own grammar + closed roster.
        if (typeof f === 'string' && isFactionFlag(f)) {
          const m = FACTION_FLAG_RE.exec(f);
          if (!m) {
            errors.push(
              `requires.flags entry '${f}' must match faction:<id>:(atleast:|atmost:)?<band>`,
            );
            continue;
          }
          if (!factionIds().includes(m[1]!)) {
            errors.push(`requires.flags entry '${f}' references unknown faction '${m[1]}'`);
            continue;
          }
          out.flags.push(f);
          continue;
        }
        if (typeof f !== 'string' || !STORY_FLAG_RE.test(f) || f.length > 64) {
          errors.push(`requires.flags entry '${String(f)}' must be a plain or dlg: flag`);
          continue;
        }
        out.flags.push(f);
      }
    }
  }
  return out;
}

function validateRewards(
  raw: unknown,
  errors: string[],
  refs?: ValidateQuestRefs,
): QuestRewards {
  const out: QuestRewards = {};
  if (!isRecord(raw)) {
    errors.push('rewards must be an object (may be empty)');
    return out;
  }
  if (raw.xp !== undefined) {
    if (!Array.isArray(raw.xp) || raw.xp.length > 4) {
      errors.push('rewards.xp must be an array of at most 4 entries');
    } else {
      out.xp = [];
      for (const [i, e] of raw.xp.entries()) {
        if (!isRecord(e) || typeof e.skill !== 'string' || !isSkillId(e.skill)) {
          errors.push(`rewards.xp[${i}].skill is not a known skill`);
          continue;
        }
        if (!isCount(e.amount, 1, 100000)) {
          errors.push(`rewards.xp[${i}].amount must be an integer 1..100000`);
          continue;
        }
        out.xp.push({ skill: e.skill, amount: e.amount });
      }
    }
  }
  if (raw.items !== undefined) {
    if (!Array.isArray(raw.items) || raw.items.length > 6) {
      errors.push('rewards.items must be an array of at most 6 entries');
    } else {
      out.items = [];
      for (const [i, e] of raw.items.entries()) {
        if (!isRecord(e) || typeof e.item !== 'string' || !knownItem(e.item, refs)) {
          errors.push(`rewards.items[${i}] references unknown item '${String(isRecord(e) ? e.item : e)}'`);
          continue;
        }
        if (!isCount(e.qty, 1, 1000)) {
          errors.push(`rewards.items[${i}].qty must be an integer 1..1000`);
          continue;
        }
        if (e.rarity !== undefined) {
          // Gear-only: the turn-in mints the piece at this tier. A
          // shipped item we can see must actually BE gear; a DB-born
          // id (refs path) is trusted — the import already vetted it.
          if (!isRarityTier(e.rarity)) {
            errors.push(`rewards.items[${i}].rarity '${String(e.rarity)}' is not a rarity tier`);
            continue;
          }
          const shipped = ITEMS.get(e.item);
          if (shipped && !shipped.gear) {
            errors.push(`rewards.items[${i}].rarity on '${e.item}' — only gear takes a rarity`);
            continue;
          }
          out.items.push({ item: e.item, qty: e.qty, rarity: e.rarity });
          continue;
        }
        out.items.push({ item: e.item, qty: e.qty });
      }
    }
  }
  if (raw.coins !== undefined) {
    if (!isCount(raw.coins, 1, 100000)) errors.push('rewards.coins must be an integer 1..100000');
    else out.coins = raw.coins;
  }
  if (raw.flags !== undefined) {
    if (!Array.isArray(raw.flags) || raw.flags.length > 4) {
      errors.push('rewards.flags must be an array of at most 4 flags');
    } else {
      out.flags = [];
      for (const f of raw.flags) {
        // Plain story slugs only: dlg:/qst: are the systems' to stamp,
        // world:/quest: are synthetic and unwritable by law.
        if (typeof f !== 'string' || !SLUG_RE.test(f) || f.length > 64) {
          errors.push(`rewards.flags entry '${String(f)}' must be a plain story slug`);
          continue;
        }
        out.flags.push(f);
      }
    }
  }
  if (raw.standing !== undefined) {
    if (!Array.isArray(raw.standing) || raw.standing.length > 4) {
      errors.push('rewards.standing must be an array of at most 4 entries');
    } else {
      out.standing = [];
      for (const [i, s] of raw.standing.entries()) {
        if (!isRecord(s) || typeof s.faction !== 'string' || !factionIds().includes(s.faction)) {
          errors.push(`rewards.standing[${i}].faction is not a known faction`);
          continue;
        }
        const cap = FACTIONS.deeds.questCap;
        if (
          typeof s.delta !== 'number' ||
          !Number.isInteger(s.delta) ||
          s.delta === 0 ||
          Math.abs(s.delta) > cap
        ) {
          errors.push(`rewards.standing[${i}].delta must be a non-zero integer within ±${cap}`);
          continue;
        }
        out.standing.push({ faction: s.faction, delta: s.delta });
      }
    }
  }
  return out;
}

function validateQuestDrops(
  raw: unknown,
  stages: QuestStage[],
  errors: string[],
  refs?: ValidateQuestRefs,
): QuestDrop[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > 8) {
    errors.push('questDrops must be an array of at most 8 entries');
    return undefined;
  }
  const collected = new Set<string>();
  for (const stage of stages) {
    for (const o of stage.objectives) if (o.kind === 'collect') collected.add(o.item);
  }
  const out: QuestDrop[] = [];
  for (const [i, d] of raw.entries()) {
    if (!isRecord(d)) {
      errors.push(`questDrops[${i}] must be an object`);
      continue;
    }
    if (typeof d.npc !== 'string' || !knownNpc(d.npc, refs)) {
      errors.push(`questDrops[${i}] references unknown npc '${String(d.npc)}'`);
      continue;
    }
    if (typeof d.item !== 'string' || !knownItem(d.item, refs)) {
      errors.push(`questDrops[${i}] references unknown item '${String(d.item)}'`);
      continue;
    }
    // A quest drop exists to feed a collect ask — an item no objective
    // wants would rain forever (the cap reads the objective's need).
    if (!collected.has(d.item)) {
      errors.push(`questDrops[${i}].item '${d.item}' is not asked for by any collect objective`);
      continue;
    }
    if (typeof d.chance !== 'number' || !(d.chance > 0) || d.chance > 1) {
      errors.push(`questDrops[${i}].chance must be in (0, 1]`);
      continue;
    }
    out.push({ npc: d.npc, item: d.item, chance: d.chance });
  }
  return out;
}

/** Validate one untrusted quest def (parsed JSON, DB row, tool input). */
export function validateQuest(raw: unknown, refs?: ValidateQuestRefs): ValidateQuestResult {
  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ['quest def must be an object'] };

  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!SLUG_RE.test(id) || id.length > 48) {
    errors.push(`id '${String(raw.id)}' must match ^[a-z][a-z0-9_]*$ (max 48 chars)`);
  }
  if (typeof raw.name !== 'string' || raw.name.length < 3 || raw.name.length > 48) {
    errors.push('name must be a string of 3..48 chars');
  }
  const name = typeof raw.name === 'string' ? raw.name : '';

  const giver = typeof raw.giver === 'string' ? raw.giver : '';
  if (!knownActor(giver, refs)) {
    errors.push(`giver references unknown actor '${String(raw.giver)}'`);
  }
  let turnIn: string | undefined;
  if (raw.turnIn !== undefined) {
    if (typeof raw.turnIn !== 'string' || !knownActor(raw.turnIn, refs)) {
      errors.push(`turnIn references unknown actor '${String(raw.turnIn)}'`);
    } else if (raw.turnIn !== giver) {
      turnIn = raw.turnIn;
    }
  }

  const requires = validateRequires(raw.requires, errors);
  if (requires?.quests?.includes(id)) {
    errors.push('requires.quests may not name the quest itself');
  }

  let repeat: QuestDef['repeat'];
  if (raw.repeat !== undefined) {
    if (!isRecord(raw.repeat) || !isCount(raw.repeat.cooldownHours, 1, 720)) {
      errors.push('repeat.cooldownHours must be an integer 1..720');
    } else {
      repeat = { cooldownHours: raw.repeat.cooldownHours };
    }
  }

  if (!Array.isArray(raw.stages) || raw.stages.length < 1 || raw.stages.length > 8) {
    errors.push('stages must be an array of 1..8 stages');
    return { ok: false, errors: errors.map((e) => `${id || '<quest>'}: ${e}`) };
  }
  const stages: QuestStage[] = [];
  const stageIds = new Set<string>();
  for (const [i, rawStage] of raw.stages.entries()) {
    const stage = validateStage(rawStage, i, i === raw.stages.length - 1, errors, refs);
    if (!stage) continue;
    if (stageIds.has(stage.id)) errors.push(`stages[${i}]: duplicate stage id '${stage.id}'`);
    stageIds.add(stage.id);
    stages.push(stage);
  }

  const questDrops = validateQuestDrops(raw.questDrops, stages, errors, refs);
  const rewards = validateRewards(raw.rewards, errors, refs);

  if (errors.length > 0) return { ok: false, errors: errors.map((e) => `${id || '<quest>'}: ${e}`) };
  return {
    ok: true,
    quest: { id, name, giver, turnIn, requires, repeat, stages, questDrops, rewards },
  };
}
