import type { QuestDef, QuestObjective } from '@arx/content';
import type { SkillId } from '@arx/shared';

/**
 * THE QUEST LEDGER's pure logic — availability, credit, readiness,
 * and the wire shapes — behind plain data, testable without the
 * GameServer (the SocialSystem law). The server owns persistence,
 * rewards, and ceremonies; this module owns the arithmetic.
 *
 * THE LIVE-COLLECT LAW: collect objectives are never counted into
 * `progress` — they are answered from the pack at the moment anyone
 * asks (accept time, tick time, gate time, turn-in time). Eggs you
 * already carry count; eggs you drop stop counting. Kill, talk, and
 * discover objectives are event-shaped and ride `progress`.
 */

export interface QuestProgress {
  status: 'active' | 'done';
  /** Current stage index while active; last-played stage when done. */
  stage: number;
  /** Per-objective event counters for the CURRENT stage (collect stays 0). */
  progress: number[];
  acceptedAt: number;
  completions: number;
  /** Repeatables: re-offerable once this passes (ms epoch). */
  cooldownUntil?: number;
}

/** Everything availability and readiness need to know about a player. */
export interface QuestPlayerCtx {
  quests: ReadonlyMap<string, QuestProgress>;
  hasFlag(flag: string): boolean;
  skillLevel(skill: SkillId): number;
  hasDiscovered(place: string): boolean;
  countItem(item: string): number;
  now: number;
}

function objectiveNeed(obj: QuestObjective): number {
  return obj.kind === 'kill' || obj.kind === 'collect' ? obj.count : 1;
}

/** How much of an objective stands done, live-collect law included. */
export function objectiveHave(
  obj: QuestObjective,
  progress: number,
  ctx: QuestPlayerCtx,
): number {
  const need = objectiveNeed(obj);
  if (obj.kind === 'collect') return Math.min(ctx.countItem(obj.item), need);
  return Math.min(progress, need);
}

function stageSatisfied(def: QuestDef, q: QuestProgress, ctx: QuestPlayerCtx): boolean {
  const stage = def.stages[q.stage];
  if (!stage) return false;
  return stage.objectives.every(
    (obj, i) => objectiveHave(obj, q.progress[i] ?? 0, ctx) >= objectiveNeed(obj),
  );
}

/** Active, on the final stage, every ask answered — turn-in time. */
export function questReady(def: QuestDef, q: QuestProgress | undefined, ctx: QuestPlayerCtx): boolean {
  if (!q || q.status !== 'active') return false;
  if (q.stage !== def.stages.length - 1) return false;
  return stageSatisfied(def, q, ctx);
}

/** Offerable now: gates pass, not underway, never done or off cooldown. */
export function questAvailable(def: QuestDef, ctx: QuestPlayerCtx): boolean {
  const entry = ctx.quests.get(def.id);
  if (entry?.status === 'active') return false;
  if (entry?.status === 'done') {
    if (!def.repeat) return false;
    if ((entry.cooldownUntil ?? 0) > ctx.now) return false;
  }
  const req = def.requires;
  if (req?.quests?.some((id) => ctx.quests.get(id)?.completions === undefined || ctx.quests.get(id)!.completions < 1)) {
    return false;
  }
  if (req?.skills?.some((s) => ctx.skillLevel(s.skill) < s.level)) return false;
  if (req?.flags?.some((f) => !ctx.hasFlag(f))) return false;
  return true;
}

/** Fresh per-objective counters for a stage, discover retro-credited. */
function freshProgress(def: QuestDef, stage: number, ctx: QuestPlayerCtx): number[] {
  const s = def.stages[stage];
  if (!s) return [];
  return s.objectives.map((obj) =>
    obj.kind === 'discover' && ctx.hasDiscovered(obj.place) ? 1 : 0,
  );
}

/** Open (or re-open) the ledger entry. Caller guards questAvailable. */
export function acceptQuest(def: QuestDef, prior: QuestProgress | undefined, ctx: QuestPlayerCtx): QuestProgress {
  return {
    status: 'active',
    stage: 0,
    progress: freshProgress(def, 0, ctx),
    acceptedAt: ctx.now,
    completions: prior?.completions ?? 0,
    cooldownUntil: undefined,
  };
}

export type QuestCreditKind = 'kill' | 'talk' | 'discover';

/**
 * Credit one event against the CURRENT stage. Returns true when a
 * counter moved (the caller persists and pushes the quiet wire).
 */
export function creditQuest(
  def: QuestDef,
  q: QuestProgress,
  kind: QuestCreditKind,
  key: string,
): boolean {
  if (q.status !== 'active') return false;
  const stage = def.stages[q.stage];
  if (!stage) return false;
  let changed = false;
  for (const [i, obj] of stage.objectives.entries()) {
    if (obj.kind !== kind) continue;
    const objKey = obj.kind === 'kill' ? obj.npc : obj.kind === 'talk' ? obj.actor : obj.place;
    if (objKey !== key) continue;
    const need = objectiveNeed(obj);
    const have = q.progress[i] ?? 0;
    if (have >= need) continue;
    q.progress[i] = have + 1;
    changed = true;
  }
  return changed;
}

/**
 * Walk forward while every objective of a NON-final stage is met. The
 * final stage never auto-completes — only the turn-in closes a quest.
 * Returns how many stages were crossed.
 */
export function advanceStages(def: QuestDef, q: QuestProgress, ctx: QuestPlayerCtx): number {
  let crossed = 0;
  while (
    q.status === 'active' &&
    q.stage < def.stages.length - 1 &&
    stageSatisfied(def, q, ctx)
  ) {
    q.stage += 1;
    q.progress = freshProgress(def, q.stage, ctx);
    crossed += 1;
  }
  return crossed;
}

/**
 * A quest-gated drop still owed? Active, and the current stage's
 * collect ask for this item is short of the pack's live count — the
 * cap is structural: a satisfied ask never drops again.
 */
export function questDropWanted(
  def: QuestDef,
  q: QuestProgress | undefined,
  item: string,
  ctx: QuestPlayerCtx,
): boolean {
  if (!q || q.status !== 'active') return false;
  const stage = def.stages[q.stage];
  if (!stage) return false;
  return stage.objectives.some(
    (obj) => obj.kind === 'collect' && obj.item === item && ctx.countItem(item) < obj.count,
  );
}

/** The synthetic quest: namespace, answered live from the ledger. */
export function answerQuestFlag(
  def: QuestDef | undefined,
  q: QuestProgress | undefined,
  state: 'available' | 'active' | 'ready' | 'done' | 'stage',
  stageId: string | undefined,
  ctx: QuestPlayerCtx,
): boolean {
  if (!def) return false;
  switch (state) {
    case 'available':
      return questAvailable(def, ctx);
    case 'active':
      return q?.status === 'active' && !questReady(def, q, ctx);
    case 'ready':
      return questReady(def, q, ctx);
    case 'done':
      return (q?.completions ?? 0) >= 1;
    case 'stage':
      return q?.status === 'active' && def.stages[q.stage]?.id === stageId;
  }
}

/** Display names, resolved by the server against its live registries. */
export interface QuestNameRefs {
  itemName(id: string): string;
  npcName(id: string): string;
  actorName(id: string): string;
  placeName(id: string): string;
}

export interface QuestObjectiveWire {
  kind: 'kill' | 'collect' | 'discover' | 'talk';
  /** The referenced id in its own namespace — the client's icon key. */
  item?: string;
  npc?: string;
  actor?: string;
  place?: string;
  label: string;
  have: number;
  need: number;
}

export interface QuestWire {
  id: string;
  name: string;
  status: 'active' | 'ready';
  giver: string;
  giverName: string;
  turnIn: string;
  turnInName: string;
  /** 0-based stage index and the total, for "Part n of m". */
  stage: number;
  stages: number;
  journal: string;
  objectives: QuestObjectiveWire[];
  repeatable?: boolean;
}

/** One active quest, shaped for the journal screen and the tracker. */
export function questWire(
  def: QuestDef,
  q: QuestProgress,
  ctx: QuestPlayerCtx,
  names: QuestNameRefs,
): QuestWire {
  const stage = def.stages[q.stage] ?? def.stages[def.stages.length - 1]!;
  const objectives: QuestObjectiveWire[] = stage.objectives.map((obj, i) => {
    const have = objectiveHave(obj, q.progress[i] ?? 0, ctx);
    const need = objectiveNeed(obj);
    switch (obj.kind) {
      case 'kill':
        return { kind: obj.kind, npc: obj.npc, label: names.npcName(obj.npc), have, need };
      case 'collect':
        return { kind: obj.kind, item: obj.item, label: names.itemName(obj.item), have, need };
      case 'discover':
        return { kind: obj.kind, place: obj.place, label: names.placeName(obj.place), have, need };
      case 'talk':
        return { kind: obj.kind, actor: obj.actor, label: names.actorName(obj.actor), have, need };
    }
  });
  return {
    id: def.id,
    name: def.name,
    status: questReady(def, q, ctx) ? 'ready' : 'active',
    giver: def.giver,
    giverName: names.actorName(def.giver),
    turnIn: def.turnIn ?? def.giver,
    turnInName: names.actorName(def.turnIn ?? def.giver),
    stage: q.stage,
    stages: def.stages.length,
    journal: stage.journal,
    objectives,
    repeatable: def.repeat ? true : undefined,
  };
}
