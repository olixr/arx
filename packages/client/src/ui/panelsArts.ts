/**
 * THE PROVING HALL'S WING — the arts and callings codex: rail, stages, benches, plates, seats and their describers.
 * Moved verbatim off Panels (foundations F5.3); the functions hold the
 * panel through its public surface.
 */
import { ActionId, bindings } from '../input/bindings.js';
import { abilityIconUrl, queueAbilityIcon } from '../render/abilityIcons.js';
import { itemIconUrl } from '../render/icons.js';
import { SheetVerb, openSheet } from './kit/contextSheet.js';
import { glyphLine, seatChip } from './kit/glyphs.js';
import { socket } from './kit/plates.js';
import { ringGauge } from './kit/ring.js';
import { bigButton } from './panel.js';
import { CALLING_MAX_RANK, CallingCondition, CallingDef, CallingEffect, CallingGrant, PerkId, abilityDef, callingDef, callingRank, callingsFor, describeAction, describeEffect, describeTrigger, honedCalling, itemDef, techniquePoolDef, techniquesFor } from '@arx/content';
import { CAST_STILL_FACTOR, HIDDEN_SKILLS, RANK_ROMAN, SKILL_IDS, SkillId, TECHNIQUE_MAX_RANK, TechniqueDef, callingCost, focusBudget, honedAbility, levelForXp, masteryXp, rankLevel, skillName, techniqueAnchor, techniqueRankFor } from '@arx/shared';
// Back-imports from the host file — the deferred cycle every split
// rides; touched only at render time, long after both initialize.
import { SKILL_FACE, WIELD_WORD } from './panelFaces.js';
import type { Panels } from './panels.js';

/** Combat schools owning a technique ladder, hidden law honored. */
export function artsSchoolIds(host: Panels): SkillId[] {
  return SKILL_IDS.filter(
    (s) =>
      techniquesFor(s).length > 0 && !(HIDDEN_SKILLS[s] && host.lastSkills[s] === undefined),
  );
}

/**
 * THE HONED-ART LAW, mirrored: the rank the BASE level has earned.
 * THE LOAN LAW holds an unmastered secret at Rank I — the borrowed
 * motion is correct but not yet yours.
 */
export function techRank(host: Panels, style: SkillId, tech: TechniqueDef): number {
  const license = host.licensedArts().get(tech.ability) ?? 0;
  const natural =
    tech.secret && !host.ownsArt(tech.ability)
      ? 1
      : techniqueRankFor(tech, levelForXp(host.lastSkills[style] ?? 0));
  return Math.max(1, natural, license);
}

/** A technique's rung state against the player's skill level. */
export function techState(host: Panels, 
  style: SkillId,
  tech: { ability: string; unlockLevel: number },
): 'equipped' | 'unlocked' | 'locked' | 'veiled' {
  const level = levelForXp(host.lastSkills[style] ?? 0);
  if (level >= tech.unlockLevel || host.licensedArts().has(tech.ability)) {
    return host.seatOf(tech.ability) !== null ? 'equipped' : 'unlocked';
  }
  const firstLocked = techniquesFor(style)
    .filter((t) => !t.hidden && level < t.unlockLevel)
    .reduce((m, t) => Math.min(m, t.unlockLevel), Infinity);
  return tech.unlockLevel > firstLocked ? 'veiled' : 'locked';
}

/** Record that an unlocked art has been laid eyes on. */
export function markTechSeen(host: Panels, ability: string | null): void {
  if (!ability || host.seenTech.has(ability)) return;
  const entry = artsSchoolIds(host)
    .flatMap((s) => host.visibleTechniques(s).map((t) => ({ style: s, t })))
    .find((e) => e.t.ability === ability);
  if (!entry) return;
  const st = techState(host, entry.style, entry.t);
  if (st !== 'unlocked' && st !== 'equipped') return;
  host.seenTech.add(ability);
  localStorage.setItem('arx.techSeen', JSON.stringify([...host.seenTech]));
}

/** The dock button's glint: any unlocked art or Calling not yet inspected. */
export function updateArtsPip(host: Panels): void {
  const unseen =
    artsSchoolIds(host).some((s) =>
      host.visibleTechniques(s).some((t) => {
        const st = techState(host, s, t);
        return (st === 'unlocked' || st === 'equipped') && !host.seenTech.has(t.ability);
      }),
    ) || unseenCallings(host) > 0;
  document.getElementById('btn-arts')?.classList.toggle('has-new', unseen);
}

/**
 * THE SCHOOL RAIL — one crest per school, the Callings last, LT/RT
 * stepping the stops. It replaced the wing tabs AND the jump strip:
 * one school stands on the stage at a time, so the eight-ladder
 * scroll is gone and nothing lives below the fold.
 */
export function renderArtsRail(host: Panels, schools: SkillId[]): void {
  host.artsRail.innerHTML = '';
  host.artsRail.dataset.pager = '';
  // The rail is the codex's SECTIONS — the bumpers step it now
  // (THE BUMPER SERVES THE ROOM); LT/RT still reach it as pager.
  host.artsRail.dataset.tabs = '';
  // THE OPEN HALL (callings-v2 Phase 5): both wings ride ONE rail.
  // The arts wing stops at the technique schools; the callings wing
  // stops at every visible skill (every skill owns a ladder of
  // seats). The wing toggle lives in the stage head, so the rail
  // never carries a foreign stop.
  const stops: SkillId[] = host.artsWing === 'callings' ? callingSkillIds(host) : schools;
  if (!host.artsRail.dataset.pagerWired) {
    host.artsRail.dataset.pagerWired = '1';
    host.artsRail.addEventListener('kit-page', (e) => {
      const dir = (e as CustomEvent<-1 | 1>).detail;
      const order = host.artsWing === 'callings' ? callingSkillIds(host) : artsSchoolIds(host);
      const current = host.artsWing === 'callings' ? host.callingSkillSel : host.artsSchoolSel;
      const i = current ? order.indexOf(current) : -1;
      const next = order[Math.max(0, Math.min(order.length - 1, i + dir))];
      if (next !== undefined && next !== current) pickRailStop(host, next);
    });
  }
  for (const stop of stops) {
    const active =
      host.artsWing === 'callings' ? host.callingSkillSel === stop : host.artsSchoolSel === stop;
    const face = SKILL_FACE[stop] ?? { icon: 'bread', color: '#d9a441' };
    const btn = document.createElement('button');
    btn.className = 'rail-stop' + (active ? ' active' : '');
    btn.style.setProperty('--skill-accent', face.color);
    btn.dataset.nav = '';
    btn.dataset.navkey = `rail:${stop}`;
    btn.dataset.acta = 'Open';
    btn.dataset.navnext = '#arts-schools';
    // The crest: the school's mark ringed by its climb.
    const level = levelForXp(host.lastSkills[stop] ?? 0);
    const ring = ringGauge(level / 99, { tone: face.color });
    const img = document.createElement('img');
    // The callings wing wears crest-only stops at couch size — fetch
    // the sharper asset; the arts wing's smaller ring downscales it.
    img.src = itemIconUrl(face.icon, host.artsWing === 'callings' ? 40 : 26);
    img.draggable = false;
    ring.center.appendChild(img);
    const text = document.createElement('span');
    text.className = 'rail-text';
    const name = document.createElement('span');
    name.className = 'rail-name';
    name.textContent = skillName(stop);
    const lv = document.createElement('span');
    lv.className = 'rail-sub';
    if (host.artsWing === 'callings') {
      // The callings rail speaks the ladder: answered of unlocked.
      const defs = callingsFor(stop);
      const answered = defs.filter((d) => callingState(host, d) === 'answered').length;
      const open = defs.filter((d) => callingState(host, d) !== 'locked').length;
      lv.textContent = open > 0 ? `${answered} of ${open}` : `Lv ${level}`;
    } else {
      lv.textContent = `Lv ${level}`;
    }
    text.append(name, lv);
    btn.append(ring.root, text);
    const unseenHere =
      host.artsWing === 'callings'
        ? callingsFor(stop).some((d) => callingState(host, d) !== 'locked' && !host.seenCallings.has(d.id))
        : host.visibleTechniques(stop).some((t) => {
            const s = techState(host, stop, t);
            return (s === 'unlocked' || s === 'equipped') && !host.seenTech.has(t.ability);
          });
    if (unseenHere) btn.classList.add('has-pip');
    // A school holding a seated art wears its quiet in-hand mark; a
    // skill holding an answered calling wears the same mark.
    if (
      host.artsWing === 'callings'
        ? callingsFor(stop).some((d) => host.callings.includes(d.id))
        : host.techniques.some((a) => techniquePoolDef(a ?? '')?.style === stop)
    ) {
      btn.classList.add('in-hand-stop');
    }
    btn.dataset.tipname = skillName(stop);
    btn.dataset.tipsub =
      host.artsWing === 'callings' ? `Level ${level} · ${lv.textContent}` : `Level ${level}`;
    btn.addEventListener('click', () => pickRailStop(host, stop));
    host.artsRail.appendChild(btn);
  }
}

/** Step or click to a rail stop: a school (or a skill's ladder) onto the stage. */
export function pickRailStop(host: Panels, stop: SkillId): void {
  if (host.artsWing === 'callings') {
    host.callingSkillSel = stop;
    // The bench follows the stage: keep the pick if it lives here,
    // else lift the skill's best seat onto the bench.
    const here = callingsFor(stop);
    if (!here.some((d) => d.id === host.callingSel)) {
      host.callingSel =
        here.find((d) => callingState(host, d) === 'answered')?.id ??
        here.find((d) => callingState(host, d) === 'unlocked')?.id ??
        here[0]?.id ??
        host.callingSel;
    }
  } else {
    host.artsSchoolSel = stop;
    // The bench follows the stage: keep the pick if it lives here,
    // else lift the school's best face onto the bench.
    const here = host.visibleTechniques(stop);
    if (!here.some((t) => t.ability === host.artsSel)) {
      host.artsSel =
        here.find((t) => techState(host, stop, t) === 'equipped')?.ability ??
        here.find((t) => techState(host, stop, t) === 'unlocked')?.ability ??
        here[0]?.ability ??
        host.artsSel;
    }
  }
  renderArts(host);
}

/** THE OPEN HALL's door: swap the wing, keeping the skill on the stage when both wings own it. */
export function setArtsWing(host: Panels, wing: 'arts' | 'callings'): void {
  if (host.artsWing === wing) return;
  host.artsWing = wing;
  if (wing === 'callings') {
    const skills = callingSkillIds(host);
    if (host.artsSchoolSel && skills.includes(host.artsSchoolSel)) host.callingSkillSel = host.artsSchoolSel;
  } else if (host.callingSkillSel && artsSchoolIds(host).includes(host.callingSkillSel)) {
    host.artsSchoolSel = host.callingSkillSel;
  }
  renderArts(host);
}

/** The codex, whole: altar, rail, the standing stop, the bench. */
export function renderArts(host: Panels): void {
  const schools = artsSchoolIds(host);
  const all = schools.flatMap((s) => host.visibleTechniques(s).map((t) => ({ style: s, t })));

  // Resolve the bench's subject: keep the player's pick if it still
  // exists, else default to a seated art (first seat first).
  if (!host.artsSel || !all.some((e) => e.t.ability === host.artsSel)) {
    host.artsSel =
      host.techniques[0] ??
      host.techniques[1] ??
      all.find((e) => techState(host, e.style, e.t) === 'unlocked')?.t.ability ??
      all.find((e) => techState(host, e.style, e.t) !== 'veiled')?.t.ability ??
      all[0]?.t.ability ??
      null;
  }
  // The stage follows the bench's subject on first open.
  if (host.artsWing === 'arts' && (!host.artsSchoolSel || !schools.includes(host.artsSchoolSel))) {
    host.artsSchoolSel =
      all.find((e) => e.t.ability === host.artsSel)?.style ?? schools[0] ?? null;
  }
  markTechSeen(host, host.artsSel);
  // THE OPEN HALL: the callings stage follows the bench's subject on
  // first open — resolved BEFORE the rail renders, so the rail lights
  // its active stop on the very first paint.
  if (host.artsWing === 'callings') {
    const skills = callingSkillIds(host);
    if (!host.callingSkillSel || !skills.includes(host.callingSkillSel)) {
      host.callingSkillSel =
        (host.callingSel ? callingDef(host.callingSel)?.skill : undefined) ??
        skills.find((sk) => callingsFor(sk).some((d) => callingState(host, d) === 'answered')) ??
        (host.artsSchoolSel && skills.includes(host.artsSchoolSel) ? host.artsSchoolSel : undefined) ??
        skills[0] ??
        null;
    }
  }
  renderArtsRail(host, schools);

  // The room wears its wing: the callings wing folds the proving
  // ground away and hands the stage to the passives (CSS keys on it).
  host.artsPanel.classList.toggle('wing-callings', host.artsWing === 'callings');
  // The hall names itself for the wing it is showing.
  const title = host.artsPanel.querySelector('h3');
  if (title) title.textContent = host.artsWing === 'callings' ? 'Callings' : 'Techniques';

  if (host.artsWing === 'callings') {
    host.ground.show(null);
    renderCallingsWing(host);
    return;
  }

  renderArtsLoadout(host);
  host.artsSchools.innerHTML = '';
  if (host.artsSchoolSel) host.artsSchools.appendChild(artsStage(host, host.artsSchoolSel));
  recenterRibbon(host);
  renderArtsBench(host, all);
  updateArtsPip(host);
}

/** Skills whose Callings may show — the hidden-skill law honored. */
export function callingSkillIds(host: Panels): SkillId[] {
  return SKILL_IDS.filter((s) => !(HIDDEN_SKILLS[s] && host.lastSkills[s] === undefined));
}

export function callingState(host: Panels, def: CallingDef): 'answered' | 'unlocked' | 'locked' {
  if (host.callings.includes(def.id)) return 'answered';
  const level = levelForXp(host.lastSkills[def.skill] ?? 0);
  return level >= def.unlockLevel ? 'unlocked' : 'locked';
}

export function focusUsed(host: Panels): number {
  let used = 0;
  for (const id of host.callings) {
    const def = callingDef(id);
    if (def) used += callingCost(def.focusCost, host.appliedRank(id));
  }
  return used;
}

/** Unlocked-but-never-inspected Callings (the NEW-pip ledger). */
export function unseenCallings(host: Panels): number {
  let n = 0;
  for (const skill of callingSkillIds(host)) {
    for (const def of callingsFor(skill)) {
      if (callingState(host, def) !== 'locked' && !host.seenCallings.has(def.id)) n++;
    }
  }
  return n;
}

export function markCallingSeen(host: Panels, id: string | null): void {
  if (!id || host.seenCallings.has(id)) return;
  const def = callingDef(id);
  if (!def || callingState(host, def) === 'locked') return;
  host.seenCallings.add(id);
  localStorage.setItem('arx.callSeen', JSON.stringify([...host.seenCallings]));
}

/**
 * THE ANSWERED LIFE — the callings wing's foot band, the build in
 * one look: the Focus instrument, the roster of every answered
 * Calling worn as its gem, and THE SUM of what the whole answered
 * set gives, told in engraved chips.
 */
export function renderAnsweredLife(host: Panels): void {
  const budget = focusBudget(host.lastSkills);
  const used = focusUsed(host);
  host.artsLoadout.innerHTML = '';

  const focus = document.createElement('div');
  focus.className = 'life-focus';
  const ftitle = document.createElement('span');
  ftitle.className = 'load-title';
  ftitle.textContent = 'Focus';
  const nums = document.createElement('span');
  nums.className = 'focus-nums' + (used > budget ? ' over' : '');
  nums.textContent = `${used} / ${budget}`;
  const bar = document.createElement('div');
  bar.className = 'focus-forge';
  const fill = document.createElement('div');
  fill.className = 'focus-fill' + (used >= budget ? ' full' : '');
  fill.style.width = `${budget > 0 ? Math.min(100, (used / budget) * 100) : 0}%`;
  bar.appendChild(fill);
  const teach = document.createElement('span');
  teach.className = 'focus-teach';
  teach.textContent = 'Every skill at 25, 50, 75, and 99 deepens it.';
  focus.append(ftitle, nums, bar, teach);

  const roster = document.createElement('div');
  roster.className = 'life-roster';
  const rtitle = document.createElement('span');
  rtitle.className = 'load-title';
  rtitle.textContent = 'The Answered Life';
  const strip = document.createElement('div');
  strip.className = 'life-strip';
  const answeredDefs = host.callings
    .map((id) => callingDef(id))
    .filter((d): d is CallingDef => !!d)
    .sort((a, b) =>
      a.skill === b.skill ? a.unlockLevel - b.unlockLevel : a.skill < b.skill ? -1 : 1,
    );
  if (answeredDefs.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'life-empty';
    empty.textContent = 'Nothing answered yet. The ladders wait.';
    strip.appendChild(empty);
  }
  for (const def of answeredDefs) {
    const held = host.appliedRank(def.id);
    const b = document.createElement('button');
    b.className = 'life-gem' + (host.callingSel === def.id ? ' selected' : '');
    b.dataset.nav = '';
    b.dataset.navkey = `life:${def.id}`;
    b.dataset.acta = 'Visit';
    b.dataset.tipname = def.name;
    b.dataset.tipsub = `${skillName(def.skill)} · Rank ${RANK_ROMAN[held]} · ${callingCost(def.focusCost, held)} Focus`;
    const gem = document.createElement('span');
    gem.className = 'call-gem';
    gem.style.setProperty('--gem', def.color);
    const rank = document.createElement('span');
    rank.className = 'life-rank';
    rank.textContent = RANK_ROMAN[held] ?? 'I';
    b.append(gem, rank);
    b.addEventListener('click', () => jumpToCalling(host, def.id));
    strip.appendChild(b);
  }
  roster.append(rtitle, strip);

  const sum = document.createElement('div');
  sum.className = 'life-sum';
  const stitle = document.createElement('span');
  stitle.className = 'load-title';
  stitle.textContent = 'The Sum';
  const chips = document.createElement('div');
  chips.className = 'sum-chips';
  const gauges = answeredSums(host, answeredDefs);
  if (gauges.length === 0) {
    const c = document.createElement('span');
    c.className = 'life-empty';
    c.textContent = 'Answer a Calling and its gifts total here.';
    chips.appendChild(c);
  }
  for (const g of gauges) {
    const cell = document.createElement('span');
    cell.className = 'sum-cell';
    // The gauge explains itself: what it means, and WHICH answered
    // Callings feed it.
    cell.dataset.tipname = `${g.num} ${g.word}`;
    cell.dataset.tipsub = `${g.tip} From ${g.from.join(', ')}.`;
    // Every glyph stands on the same fixed stage, so the bank's
    // cells hold one rhythm whatever shape the family wears.
    const stage = document.createElement('span');
    stage.className = 'sum-glyph-stage';
    const glyph = document.createElement('span');
    glyph.className = `sum-glyph ${g.kind}`;
    stage.appendChild(glyph);
    const col = document.createElement('span');
    col.className = 'sum-col';
    const num = document.createElement('span');
    num.className = 'sum-num';
    num.textContent = g.num;
    const word = document.createElement('span');
    word.className = 'sum-word';
    word.textContent = g.word;
    col.append(num, word);
    cell.append(stage, col);
    chips.appendChild(cell);
  }
  sum.append(stitle, chips);

  host.artsLoadout.append(focus, roster, sum);
}

/**
 * THE SUM's gauges: the always-on aggregates summed honestly, the
 * verbs counted, and EVERY gauge carrying the names of the
 * Callings that feed it — so the tooltip answers "where is this
 * from?" without a spreadsheet. Conditional edges are never folded
 * into flat sums (a vs-state clause is a clause, not armor).
 */
export function answeredSums(host: Panels, 
  defs: CallingDef[],
): Array<{ kind: string; num: string; word: string; tip: string; from: string[] }> {
  const flat: Record<string, { sum: number; from: Set<string> }> = {};
  const count: Record<string, { n: number; from: Set<string> }> = {};
  const addFlat = (ch: string, amount: number, who: string): void => {
    (flat[ch] ??= { sum: 0, from: new Set() }).sum += amount;
    flat[ch]!.from.add(who);
  };
  const addCount = (ch: string, who: string): void => {
    (count[ch] ??= { n: 0, from: new Set() }).n += 1;
    count[ch]!.from.add(who);
  };
  for (const def of defs) {
    for (const fx of honedCalling(def, host.appliedRank(def.id))) {
      switch (fx.kind) {
        case 'gear': {
          const e = fx.effect;
          if (e.kind === 'armor') addFlat('armor', e.amount, def.name);
          else if (e.kind === 'maxHp') addFlat('maxHp', e.amount, def.name);
          else if (e.kind === 'regen') addFlat('regen', e.amount, def.name);
          else if (e.kind === 'speed') addFlat('speed', e.pct, def.name);
          else if (e.kind === 'crit') addFlat('crit', e.pct, def.name);
          else if (e.kind === 'cooldown') addFlat('cooldown', e.pct, def.name);
          else if (e.kind === 'thorns') addFlat('thorns', e.amount, def.name);
          else if (e.kind === 'skill') addFlat('skill', e.amount, def.name);
          else if (e.kind === 'styleDmg' || e.kind === 'elementDmg' || e.kind === 'vsState')
            addCount('edge', def.name);
          else if (e.kind === 'proc') addCount('proc', def.name);
          break;
        }
        case 'proc':
          addCount('proc', def.name);
          break;
        case 'when':
          addCount('when', def.name);
          break;
        case 'art':
          addCount('art', def.name);
          break;
        case 'perPiece':
          addCount('piece', def.name);
          break;
        case 'perk':
          addCount('knack', def.name);
          break;
        case 'doubleGather':
        case 'gatherSpeed':
        case 'materialSave':
        case 'craftSpeed':
          addCount('trade', def.name);
          break;
      }
    }
  }
  const out: Array<{ kind: string; num: string; word: string; tip: string; from: string[] }> = [];
  const F = (
    ch: string,
    kind: string,
    num: (n: number) => string,
    word: string,
    tip: string,
  ): void => {
    const f = flat[ch];
    if (f && f.sum) out.push({ kind, num: num(f.sum), word, tip, from: [...f.from] });
  };
  const C = (ch: string, kind: string, one: string, many: string, tip: string): void => {
    const c = count[ch];
    if (c && c.n) {
      out.push({ kind, num: String(c.n), word: c.n === 1 ? one : many, tip, from: [...c.from] });
    }
  };
  F('armor', 'armor', (n) => `+${n}`, 'armor', 'Flat armor, always on.');
  F('maxHp', 'health', (n) => `+${n}`, 'max health', 'A deeper well of health, always on.');
  F('regen', 'mending', (n) => `+${n}`, 'health per 4s', 'Wounds close on their own, always on.');
  F('speed', 'speed', (n) => `+${n}%`, 'move speed', 'Quicker on your feet, always on.');
  F('crit', 'crit', (n) => `+${n}%`, 'critical chance', 'Blows strike true more often.');
  F('cooldown', 'arts', (n) => `${n}%`, 'quicker arts', 'Your abilities return sooner.');
  F('thorns', 'thorns', (n) => `+${n}`, 'thorns', 'Attackers cut themselves on you.');
  F('skill', 'skill', (n) => `+${n}`, 'skill levels', 'You work as if levels wiser.');
  C('edge', 'edge', 'damage bonus', 'damage bonuses', 'Extra damage against certain foes or with certain weapons.');
  C('proc', 'proc', 'triggered effect', 'triggered effects', 'A working that fires on a moment: a blow, a wound, a rhythm.');
  C('when', 'when', 'conditional boon', 'conditional boons', 'A standing gift that holds while its condition is true.');
  C('trade', 'trade', 'trade bonus', 'trade bonuses', 'Faster or richer gathering and crafting.');
  C('piece', 'gear', 'per-piece bonus', 'per-piece bonuses', 'Grows with each matching armor piece you wear.');
  C('knack', 'knack', 'special knack', 'special knacks', 'A one-of-a-kind talent read at its own moment.');
  C('art', 'art', 'art unlocked', 'arts unlocked', 'An ability licensed to your codex while this stays answered.');
  return out;
}

/** A gem in the foot band pressed: walk the hall to its own seat. */
export function jumpToCalling(host: Panels, id: string): void {
  const def = callingDef(id);
  if (!def) return;
  host.callingSkillSel = def.skill;
  host.callingSel = id;
  markCallingSeen(host, id);
  renderArts(host);
}

/**
 * THE OPEN HALL (callings-v2 Phase 5): the passives wing rebuilt for
 * a ten-seat world. ONE skill's ladder stands on the stage at a time
 * (the rail picks it — never 250 chips in one scroll, pad nav stays
 * key-true); the ladder is a path ribbon of seat plates in the arts
 * stage's own vocabulary; the Focus meter rides the loadout strip;
 * the bench reads the package.
 */
export function renderCallingsWing(host: Panels): void {
  const skill = host.callingSkillSel;
  const here = skill ? callingsFor(skill) : [];
  // Resolve the bench subject: keep the pick while it lives on this
  // ladder, else lift the ladder's best seat.
  if (!host.callingSel || !here.some((d) => d.id === host.callingSel)) {
    host.callingSel =
      here.find((d) => callingState(host, d) === 'answered')?.id ??
      here.find((d) => callingState(host, d) === 'unlocked')?.id ??
      here[0]?.id ??
      null;
  }
  markCallingSeen(host, host.callingSel);
  renderAnsweredLife(host);
  host.artsSchools.innerHTML = '';
  if (skill) host.artsSchools.appendChild(callingStage(host, skill));
  renderCallingBench(host);
  updateArtsPip(host);
}

/** The wing toggle that sits in every stage head: Arts ◇ Callings. */
export function wingToggle(host: Panels): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'wing-toggle';
  wrap.dataset.tipname = 'The two wings';
  wrap.dataset.tipsub = 'Arts are what you cast. Callings are what you are.';
  for (const wing of ['arts', 'callings'] as const) {
    const b = document.createElement('button');
    b.className = 'wing-tab' + (host.artsWing === wing ? ' active' : '');
    b.dataset.nav = '';
    b.dataset.navkey = `wing:${wing}`;
    b.dataset.acta = 'Open';
    b.textContent = wing === 'arts' ? 'Arts' : 'Callings';
    if (wing === 'callings' && unseenCallings(host) > 0) b.classList.add('has-pip');
    b.addEventListener('click', () => setArtsWing(host, wing));
    wrap.appendChild(b);
  }
  return wrap;
}

/**
 * THE ROAD (the callings wing rebuilt): one skill's sixteen seats
 * as a serpentine tree — two runs of eight, the second walking
 * back, joined by a forged turn — so the whole ladder stands on the
 * stage at once, every seat a large plaque the hand can press. The
 * pad's down press lands on the true ladder neighbor by geometry.
 */
export function callingStage(host: Panels, skill: SkillId): HTMLElement {
  const face = SKILL_FACE[skill] ?? { icon: 'bread', color: '#d9a441' };
  const hidden = HIDDEN_SKILLS[skill];
  const level = levelForXp(host.lastSkills[skill] ?? 0);
  const block = document.createElement('div');
  block.className = 'arts-stage calling-stage' + (hidden ? ' secret-skill' : '');
  block.style.setProperty('--skill-accent', face.color);

  const head = document.createElement('div');
  head.className = 'stage-head';
  const crest = document.createElement('span');
  crest.className = 'stage-crest';
  const crestImg = document.createElement('img');
  crestImg.src = itemIconUrl(face.icon, 30);
  crestImg.draggable = false;
  crest.appendChild(crestImg);
  const name = document.createElement('span');
  name.className = 'stage-school';
  name.textContent = skillName(skill);
  const gem = document.createElement('span');
  gem.className = 'stage-gem';
  gem.dataset.tipname = 'Skill level';
  gem.dataset.tipsub = `${skillName(skill)} stands at level ${level}.`;
  const gn = document.createElement('span');
  gn.className = 'stage-gem-num';
  gn.textContent = String(level);
  gem.appendChild(gn);
  head.append(crest, name, gem);

  const seats = callingsFor(skill).slice().sort((a, b) => a.unlockLevel - b.unlockLevel);
  let answered = 0;
  const pips = document.createElement('span');
  pips.className = 'ladder-pips';
  for (const d of seats) {
    const st = callingState(host, d);
    if (st === 'answered') answered++;
    const p = document.createElement('i');
    p.className = st;
    pips.appendChild(p);
  }
  pips.dataset.tipname = 'The ladder';
  pips.dataset.tipsub = `${seats.length} Callings on this ladder; ${answered} answer to you now.`;
  const count = document.createElement('span');
  count.className = 'stage-count';
  count.textContent = `${answered} of ${seats.length} answered`;
  head.append(pips, count, wingToggle(host));
  block.appendChild(head);

  const tree = document.createElement('div');
  tree.className = 'calling-tree';
  const runs = [seats.slice(0, 8), seats.slice(8).reverse()].filter((r) => r.length > 0);
  runs.forEach((run, r) => {
    const row = document.createElement('div');
    row.className = 'tree-row' + (r === 1 ? ' rev' : '');
    run.forEach((def, i) => {
      if (i > 0) {
        // The link belongs to the pair's LATER seat on the ladder —
        // it lights once that seat's rung is climbed.
        const later = r === 0 ? def : run[i - 1]!;
        const link = document.createElement('span');
        link.className = 'tree-link' + (callingState(host, later) !== 'locked' ? ' lit' : '');
        row.appendChild(link);
      }
      row.appendChild(seatPlaque(host, def));
    });
    tree.appendChild(row);
  });
  if (runs.length === 2) {
    // The turn at the road's far edge, down from seat eight to nine.
    const ninth = seats[8]!;
    const turn = document.createElement('span');
    turn.className = 'tree-turn' + (callingState(host, ninth) !== 'locked' ? ' lit' : '');
    tree.appendChild(turn);
    // Pin the bend to the two well lines once layout stands — the
    // rows' heights breathe with their names, so the road measures
    // itself rather than trusting arithmetic.
    requestAnimationFrame(() => {
      const rows = tree.querySelectorAll<HTMLElement>('.tree-row');
      const wellA = rows[0]?.querySelector<HTMLElement>('.seat-plaque:last-child .plaque-well');
      const wellB = rows[1]?.querySelector<HTMLElement>('.seat-plaque:last-child .plaque-well');
      if (!wellA || !wellB) return;
      const t = tree.getBoundingClientRect();
      const a = wellA.getBoundingClientRect();
      const b = wellB.getBoundingClientRect();
      turn.style.top = `${Math.round(a.top + a.height / 2 - t.top)}px`;
      turn.style.height = `${Math.round(b.top + b.height / 2 - (a.top + a.height / 2))}px`;
      turn.style.left = `${Math.round(Math.max(a.right, b.right) - t.left + 10)}px`;
      turn.style.right = 'auto';
    });
  }
  tree.addEventListener(
    'wheel',
    (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (d === 0) return;
      e.preventDefault();
      stepCallingLadder(host, d > 0 ? 1 : -1);
    },
    { passive: false },
  );
  block.appendChild(tree);
  return block;
}

/** The wheel walks the ladder in seat order, whatever the road's bends. */
export function stepCallingLadder(host: Panels, dir: -1 | 1): void {
  const skill = host.callingSkillSel;
  if (!skill) return;
  const seats = callingsFor(skill).slice().sort((a, b) => a.unlockLevel - b.unlockLevel);
  const i = seats.findIndex((d) => d.id === host.callingSel);
  const next = seats[Math.max(0, Math.min(seats.length - 1, (i < 0 ? 0 : i) + dir))];
  if (next && next.id !== host.callingSel) inspectCalling(host, next.id);
}

/**
 * One seat as a PLAQUE: the painted well holding the calling's gem,
 * the seat level cut into a corner shield, THE RANK PIPS beneath,
 * and the name on the plate. States are drawn, never labeled:
 * answered floods the gem's own color, an open seat sits lit and
 * waiting, a locked seat is a dark socket with its level engraved.
 */
export function seatPlaque(host: Panels, def: CallingDef): HTMLElement {
  const st = callingState(host, def);
  const level = levelForXp(host.lastSkills[def.skill] ?? 0);
  const cap = st === 'locked' ? 0 : Math.max(1, callingRank(def, level));
  const held = st === 'answered' ? host.appliedRank(def.id) : 0;
  const btn = document.createElement('button');
  btn.className = `seat-plaque ${st}`;
  if (host.callingSel === def.id) btn.classList.add('selected');
  btn.dataset.nav = '';
  btn.dataset.navkey = `call:${def.id}`;
  btn.dataset.acta = 'Inspect';
  btn.style.setProperty('--gem', def.color);
  const well = document.createElement('span');
  well.className = 'plaque-well';
  const gem = document.createElement('span');
  gem.className = 'call-gem xl';
  gem.style.setProperty('--gem', def.color);
  well.appendChild(gem);
  const seat = document.createElement('span');
  seat.className = 'seat-lv';
  const sn = document.createElement('span');
  sn.className = 'seat-lv-num';
  sn.textContent = String(def.unlockLevel);
  seat.appendChild(sn);
  seat.dataset.tipname = 'The seat';
  seat.dataset.tipsub =
    st === 'locked'
      ? `Answers at ${skillName(def.skill)} level ${def.unlockLevel}.`
      : `Seated at ${skillName(def.skill)} level ${def.unlockLevel}.`;
  well.appendChild(seat);
  if (st !== 'locked' && !host.seenCallings.has(def.id)) {
    const pip = document.createElement('span');
    pip.className = 'new-pip';
    pip.textContent = 'NEW';
    well.appendChild(pip);
  }
  if (st !== 'locked') {
    const pips = document.createElement('span');
    pips.className = 'rank-pips';
    pips.dataset.tipname = 'Rank';
    pips.dataset.tipsub =
      held > 0
        ? `Answered at Rank ${RANK_ROMAN[held]}; honed to Rank ${RANK_ROMAN[cap]}.`
        : `Honed to Rank ${RANK_ROMAN[cap]}.`;
    for (let r = 1; r <= CALLING_MAX_RANK; r++) {
      const dot = document.createElement('i');
      dot.className = r <= held ? 'applied' : r <= cap ? 'earned' : '';
      pips.appendChild(dot);
    }
    well.appendChild(pips);
  }
  const nameEl = document.createElement('span');
  nameEl.className = 'plaque-name';
  nameEl.textContent = def.name;
  const sub = document.createElement('span');
  sub.className = 'plaque-sub';
  // The corner shield already speaks the seat; the sub never repeats it.
  sub.textContent =
    st === 'answered'
      ? `Rank ${RANK_ROMAN[held]} · ${callingCost(def.focusCost, held)} Focus`
      : `${def.focusCost} Focus`;
  btn.append(well, nameEl, sub);
  btn.addEventListener('click', () => inspectCalling(host, def.id));
  return btn;
}

/**
 * Light the bench for one calling without rebuilding the stage:
 * focus and hover ride this, so reading is free and the ring never
 * loses the plate it stands on.
 */
export function inspectCalling(host: Panels, id: string): void {
  if (host.callingSel === id) return;
  host.callingSel = id;
  markCallingSeen(host, id);
  const key = `call:${id}`;
  host.artsSchools
    .querySelectorAll('.seat-plaque.selected')
    .forEach((p) => p.classList.remove('selected'));
  host.artsSchools.querySelector(`[data-navkey="${CSS.escape(key)}"]`)?.classList.add('selected');
  // The foot band's roster mirrors the choice.
  host.artsLoadout
    .querySelectorAll('.life-gem.selected')
    .forEach((p) => p.classList.remove('selected'));
  host.artsLoadout
    .querySelector(`[data-navkey="${CSS.escape(`life:${id}`)}"]`)
    ?.classList.add('selected');
  renderCallingBench(host);
  // The rail's pip and the plaque's own pip may have just cleared.
  host.artsSchools.querySelector(`[data-navkey="${CSS.escape(key)}"] .new-pip`)?.remove();
  updateArtsPip(host);
}

/**
 * THE PACKAGE, spoken: one plain line per entry. Gear entries ride
 * the enchant vocabulary's own reader (one truth for cards and
 * benches); procs speak trigger and action; a when clause speaks
 * its condition and its grant; the trade dials and perks speak in
 * their own units.
 */
export function describeCallingEffect(host: Panels, fx: CallingEffect): string {
  switch (fx.kind) {
    case 'gear':
      return describeEffect(fx.effect);
    case 'proc':
      return describeEffect(fx.proc);
    case 'perPiece': {
      const parts: string[] = [];
      if (fx.speedPct) parts.push(`+${fx.speedPct}% speed`);
      if (fx.maxHp) parts.push(`+${fx.maxHp} max HP`);
      if (fx.armor) parts.push(`+${fx.armor} armor`);
      return `${parts.join(', ')} per worn ${fx.armorClass} piece`;
    }
    case 'perk':
      return describePerk(host, fx.perk, fx.magnitude);
    case 'doubleGather':
      return `${Math.round(fx.chance * 100)}% chance ${skillName(fx.skill)} yields double`;
    case 'gatherSpeed':
      return `${skillName(fx.skill)} ${Math.round((fx.mult - 1) * 100)}% faster`;
    case 'materialSave':
      return `${Math.round(fx.chance * 100)}% chance ${skillName(fx.skill)} saves its materials`;
    case 'craftSpeed':
      return `${skillName(fx.skill)} works ${Math.round((1 - fx.mult) * 100)}% faster`;
    case 'when':
      return `While ${describeCondition(host, fx.cond)}: ${describeGrant(host, fx.grant)}`;
    case 'art':
      return `Licenses the art ${abilityDef(fx.ability)?.name ?? fx.ability}`;
  }
}

export function describeCondition(host: Panels, c: CallingCondition): string {
  switch (c.when) {
    case 'hpBelow':
      return `below ${Math.round(c.frac * 100)}% health`;
    case 'hpAbove':
      return `above ${Math.round(c.frac * 100)}% health`;
    case 'still':
      return 'standing firm';
    case 'moving':
      return 'on the move';
    case 'shieldRaised':
      return 'a shield is raised';
    case 'underground':
      return 'underground';
    case 'night':
      return 'night holds';
    case 'stateRiding':
      return `${c.status} rides you`;
    case 'wellFed':
      return 'well fed';
    case 'day':
      return 'day holds';
    case 'sneaking':
      return 'sneaking';
    case 'mounted':
      return 'in the saddle';
    case 'wielding':
      return `${WIELD_WORD[c.style]} is in hand`;
    case 'dualWielding':
      return 'a blade in each hand';
    case 'petOut':
      return 'your companion is out';
    case 'inCombat':
      return 'in the fight';
    case 'outOfCombat':
      return 'the fight is over';
    case 'outnumbered':
      return `${c.count} or more foes press you`;
  }
}

export function describeGrant(host: Panels, g: CallingGrant): string {
  const parts = grantParts(host, g);
  return parts.length > 0 ? `${g.name} (${parts.join(', ')})` : g.name;
}

/** The grant's dials alone, no chip name — the working plate's head. */
export function grantParts(host: Panels, g: CallingGrant): string[] {
  const parts: string[] = [];
  if (g.armor) parts.push(`+${g.armor} armor`);
  if (g.speedMult && g.speedMult !== 1) parts.push(`${g.speedMult > 1 ? '+' : ''}${Math.round((g.speedMult - 1) * 100)}% speed`);
  if (g.attackSpeedMult && g.attackSpeedMult !== 1) parts.push(`+${Math.round((g.attackSpeedMult - 1) * 100)}% swing speed`);
  if (g.critPct) parts.push(`+${g.critPct}% crit`);
  if (g.dmgMult && g.dmgMult !== 1) parts.push(`+${Math.round((g.dmgMult - 1) * 100)}% damage`);
  if (g.regenPer4s) parts.push(`mends ${g.regenPer4s} every four breaths`);
  if (g.reflectFrac) parts.push(`returns ${Math.round(g.reflectFrac * 100)}% of blows`);
  if (g.meleeLifesteal) parts.push(`blows drink ${Math.round(g.meleeLifesteal * 100)}%`);
  if (g.gatherSpeed && g.gatherSpeed !== 1) parts.push(`gathers ${Math.round((g.gatherSpeed - 1) * 100)}% faster`);
  if (g.evadePct) parts.push(`slips ${Math.round(g.evadePct)}% of blows`);
  return parts;
}

/** The one-site dials in plain words — the map PERK_DIALS documents, spoken. */
export function describePerk(host: Panels, perk: PerkId, m: number): string {
  const pct = (x: number): string => `${Math.round(Math.abs(x - 1) * 100)}%`;
  switch (perk) {
    case 'foodHealMult': return `food heals ${pct(m)} more`;
    case 'foodBuffDurMult': return `food buffs last ${pct(m)} longer`;
    case 'tonicBuffDurMult': return `tonics last ${pct(m)} longer`;
    case 'finisherBonusMult': return `finishers hit ${pct(m)} harder`;
    case 'stillArmor': return `+${m} armor while standing firm`;
    case 'shieldMult': return `wards are ${pct(m)} thicker`;
    case 'snapShotMult': return `snap shots hit ${pct(m)} harder`;
    case 'drawMoveFactor': return `walk your aim at ${Math.round(m * 100)}% pace`;
    case 'sneakFactorBonus': return `${Math.round(m * 100)}% quieter steps`;
    case 'backstabBonus': return `+${Math.round(m * 100)}% backstab`;
    case 'offhandDelayTicks': return `the off hand echoes in ${m} ticks`;
    case 'offhandFactorBonus': return `the echo strikes +${Math.round(m * 100)}% harder`;
    case 'undergroundGatherMult': return `gathers ${pct(m)} faster underground`;
    case 'nightGatherMult': return `gathers ${pct(m)} faster after dusk`;
    case 'burnChanceMult': return `${pct(m)} fewer meals burn`;
    case 'dotResistMult': return `poison and burning grip ${pct(m)} weaker`;
    case 'seedRefundChance': return `${Math.round(m * 100)}% chance seeds return`;
    case 'doubleHarvestChance': return `${Math.round(m * 100)}% chance harvests double`;
    case 'doubleProduceChance': return `${Math.round(m * 100)}% chance produce doubles`;
    case 'produceRestMult': return `beasts recover their gifts ${pct(m)} sooner`;
    case 'buildSpeedMult': return `builds ${pct(m)} faster`;
    case 'shieldArm': return `+${m} armor while a shield is raised`;
    case 'shieldThorns': return `+${m} thorns while a shield is raised`;
    case 'greatReach': return `+${m} tiles greatweapon reach`;
    case 'greatExecute': return `+${Math.round(m * 100)}% greatblow damage under 25% health`;
    case 'poleReach': return `+${m} tiles polearm reach`;
    case 'warGripBonus': return `+${Math.round(m * 100)}% war-grip damage`;
    case 'marchArmor': return `+${m} armor while moving`;
    case 'warSchooling': return `weapon schools fight ${m} levels higher`;
    case 'inscribeQuality': return `+${m} quality on every inscription`;
    case 'compostDiscount': return `compost closes ${m} worth sooner`;
    case 'brushRestMult': return `the brush window opens ${pct(m)} sooner`;
    case 'larderSellMult': return `larder orders pay ${pct(m)} more`;
  }
}

/**
 * THE BENCH of the callings wing, rebuilt as its own furniture: the
 * gem in a painted well, the state worn as a forged SEAL (never a
 * labeled box), the package as illuminated VERSES each led by its
 * kind's glyph, THE RANK SPINE instrument for the four depths, and
 * the verbs on brass. Everything drawn, nothing web.
 */
export function renderCallingBench(host: Panels): void {
  host.artsDetail.innerHTML = '';
  const def = host.callingSel ? callingDef(host.callingSel) : undefined;
  const bench = document.createElement('div');
  bench.className = 'call-bench';
  host.artsDetail.appendChild(bench);
  if (!def) {
    const note = document.createElement('div');
    note.className = 'bench-empty';
    note.textContent = 'Raise a skill to 5 and its first Calling will gather here.';
    bench.appendChild(note);
    return;
  }
  const st = callingState(host, def);
  const callingSkill = skillName(def.skill);

  const head = document.createElement('div');
  head.className = 'bench-head';
  const well = document.createElement('div');
  well.className = 'bench-plate call-plate';
  well.style.setProperty('--gem', def.color);
  const gem = document.createElement('span');
  gem.className = 'call-gem xl';
  gem.style.setProperty('--gem', def.color);
  well.appendChild(gem);
  const names = document.createElement('div');
  names.className = 'bench-names';
  const name = document.createElement('div');
  name.className = 'bench-name';
  name.textContent = def.name;
  const line = document.createElement('div');
  line.className = 'bench-line';
  line.textContent = `${callingSkill} · Calling`;
  const level = levelForXp(host.lastSkills[def.skill] ?? 0);
  const cap = st === 'locked' ? 0 : Math.max(1, callingRank(def, level));
  const held = st === 'answered' ? host.appliedRank(def.id) : 0;
  const budget = focusBudget(host.lastSkills);
  const used = focusUsed(host);
  const heldCost = held > 0 ? callingCost(def.focusCost, held) : 0;

  // The state, worn as a seal on the head's shoulder — a cut
  // banner, never a bordered label, never its own spent row.
  const seal = document.createElement('div');
  seal.className = `call-seal ${st}`;
  seal.textContent =
    st === 'answered'
      ? `Answered at Rank ${RANK_ROMAN[held]} · holding ${heldCost} Focus`
      : st === 'unlocked'
        ? `Ready to answer · ${def.focusCost} Focus at Rank I`
        : `Answers at ${callingSkill} level ${def.unlockLevel}`;
  names.append(name, line, seal);
  head.append(well, names);
  bench.appendChild(head);

  const desc = document.createElement('p');
  desc.className = 'bench-desc';
  desc.textContent = def.desc;
  bench.appendChild(desc);

  // EVERY ANSWER IS SEEN: the package as WORKING PLATES — the
  // mechanic in bold display type, the condition beneath it, the
  // family's emblem on the left. The effect is the star.
  const readAt = held > 0 ? held : 1;
  const plates = document.createElement('div');
  plates.className = 'working-plates';
  for (const fx of honedCalling(def, readAt)) {
    const w = callingWorking(host, fx);
    const row = document.createElement('div');
    // An always-on dial needs no second deck: its plate reads on one
    // line. Conditions and licenses keep the full two-deck plate.
    row.className = 'wp-plate' + (w.sub === 'Always on' ? ' quiet' : '');
    const emblem = document.createElement('span');
    emblem.className = 'wp-emblem';
    const glyph = document.createElement('span');
    glyph.className = `verse-glyph ${w.kind}`;
    emblem.appendChild(glyph);
    const col = document.createElement('span');
    col.className = 'wp-col';
    const head2 = document.createElement('span');
    head2.className = 'wp-head';
    head2.textContent = w.head;
    const sub2 = document.createElement('span');
    sub2.className = 'wp-sub';
    sub2.textContent = w.sub;
    col.append(head2, sub2);
    row.append(emblem, col);
    plates.appendChild(row);
  }
  bench.appendChild(plates);

  // THE FOUR DEPTHS: the rank spine and the next depth's note,
  // grouped on one inset panel.
  const depths = document.createElement('div');
  depths.className = 'depth-block';
  const depthTitle = document.createElement('span');
  depthTitle.className = 'depth-title';
  depthTitle.textContent = 'The Four Depths';
  depths.appendChild(depthTitle);
  const spine = document.createElement('div');
  spine.className = 'rank-spine call-spine';
  spine.style.setProperty('--walked-n', String(held > 1 ? (held - 1) / (CALLING_MAX_RANK - 1) : 0));
  for (let r = 1; r <= CALLING_MAX_RANK; r++) {
    const stud = document.createElement('span');
    stud.className =
      'spine-stud' +
      (r <= held ? ' attained' : r <= cap ? ' earned' : '') +
      (held > 0 && r === held ? ' current' : '');
    stud.dataset.tipname = `Rank ${RANK_ROMAN[r]}`;
    stud.dataset.tipsub =
      r <= cap
        ? `Earned. Holds ${callingCost(def.focusCost, r)} Focus when answered at this depth.`
        : st === 'locked'
          ? `Waits on the seat itself.`
          : `Waits on ${callingSkill} level ${rankLevel(def.unlockLevel, r)}.`;
    const num = document.createElement('span');
    num.className = 'stud-numeral';
    num.textContent = RANK_ROMAN[r] ?? String(r);
    stud.appendChild(num);
    const under = document.createElement('span');
    under.className = 'stud-under';
    under.textContent = `${callingCost(def.focusCost, r)}`;
    stud.appendChild(under);
    spine.appendChild(stud);
  }
  depths.appendChild(spine);

  // The next depth's own note, previewed inside the block.
  if (def.ranks && readAt < CALLING_MAX_RANK) {
    const next = def.ranks[readAt - 1];
    if (next) {
      const nextLine = document.createElement('div');
      nextLine.className = 'bench-next-rank';
      const glyph = document.createElement('span');
      glyph.className = 'next-rank-glyph';
      glyph.textContent = RANK_ROMAN[readAt + 1] ?? '';
      const text = document.createElement('span');
      text.textContent = next.note;
      nextLine.append(glyph, text);
      depths.appendChild(nextLine);
    }
  }
  if (st !== 'locked') {
    // The honed line is rank truth: it lives with the depths.
    const honed = document.createElement('div');
    honed.className = 'bench-line bench-honed';
    honed.textContent =
      cap >= CALLING_MAX_RANK
        ? `Honed to Rank ${RANK_ROMAN[cap]}, the deepest.`
        : `Honed to Rank ${RANK_ROMAN[cap]}. Rank ${RANK_ROMAN[cap + 1]} at ${callingSkill} level ${rankLevel(def.unlockLevel, cap + 1)}.`;
    depths.appendChild(honed);
  }
  bench.appendChild(depths);

  // THE FOOT: the verbs and the teach, pinned to the bench's floor.
  const foot = document.createElement('div');
  foot.className = 'bench-foot';
  bench.appendChild(foot);

  const verbs = document.createElement('div');
  verbs.className = 'bench-verbs';
  foot.appendChild(verbs);
  let cant = false;
  if (st === 'answered') {
    if (held < cap) {
      const next = held + 1;
      const nextCost = callingCost(def.focusCost, next);
      const btn = bigButton(
        `Deepen to Rank ${RANK_ROMAN[next]} · ${nextCost} Focus`,
        `callrank:${def.id}:${next}`,
        () => host.onCalling(def.id, true, next),
      );
      if (used - heldCost + nextCost > budget) {
        btn.classList.add('cant');
        cant = true;
      }
      verbs.appendChild(btn);
    }
    if (held > 1) {
      verbs.appendChild(
        bigButton(
          `Lighten to Rank ${RANK_ROMAN[held - 1]} · ${callingCost(def.focusCost, held - 1)} Focus`,
          `callrank:${def.id}:${held - 1}`,
          () => host.onCalling(def.id, true, held - 1),
          { minor: true },
        ),
      );
    }
    verbs.appendChild(
      bigButton('Set down', `calloff:${def.id}`, () => host.onCalling(def.id, false), {
        minor: true,
      }),
    );
  } else if (st === 'unlocked') {
    const btn = bigButton(
      `Answer · ${def.focusCost} Focus`,
      `callon:${def.id}`,
      () => host.onCalling(def.id, true, 1),
    );
    if (used + def.focusCost > budget) {
      btn.classList.add('cant');
      cant = true;
    }
    verbs.appendChild(btn);
  }
  const teach = document.createElement('div');
  teach.className = 'bench-teach';
  teach.textContent = cant
    ? `Focus ${used}/${budget}. Set a Calling down, or deepen a skill past a milestone.`
    : st === 'locked'
      ? `Climb ${callingSkill} and this seat will open on its own.`
      : 'Free to change any time. The budget is the only law.';
  foot.appendChild(teach);
}

/**
 * THE WORKING, split for its plate: the MECHANIC as the bold head
 * (what actually happens, numbers first) and the condition as the
 * line beneath it (when it happens). The star is the effect.
 */
export function callingWorking(host: Panels, fx: CallingEffect): { kind: string; head: string; sub: string } {
  const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);
  switch (fx.kind) {
    case 'gear': {
      if (fx.effect.kind === 'proc') {
        const p = fx.effect;
        return { kind: 'proc', head: cap(describeAction(p.action)), sub: `On ${describeTrigger(p.trigger)}` };
      }
      return { kind: 'gear', head: cap(describeEffect(fx.effect)), sub: 'Always on' };
    }
    case 'proc':
      return {
        kind: 'proc',
        head: cap(describeAction(fx.proc.action)),
        sub: `On ${describeTrigger(fx.proc.trigger)}`,
      };
    case 'when': {
      const parts = grantParts(host, fx.grant);
      return {
        kind: 'when',
        head: cap(parts.join(', ') || fx.grant.name),
        sub: `While ${describeCondition(host, fx.cond)}`,
      };
    }
    case 'perPiece': {
      const parts: string[] = [];
      if (fx.speedPct) parts.push(`+${fx.speedPct}% speed`);
      if (fx.maxHp) parts.push(`+${fx.maxHp} max HP`);
      if (fx.armor) parts.push(`+${fx.armor} armor`);
      return { kind: 'gear', head: cap(parts.join(', ')), sub: `Per worn ${fx.armorClass} piece` };
    }
    case 'doubleGather':
      return { kind: 'trade', head: `${Math.round(fx.chance * 100)}% chance the yield doubles`, sub: `${skillName(fx.skill)} harvests` };
    case 'gatherSpeed':
      return { kind: 'trade', head: `Gather ${Math.round((fx.mult - 1) * 100)}% faster`, sub: `${skillName(fx.skill)} work` };
    case 'materialSave':
      return { kind: 'trade', head: `${Math.round(fx.chance * 100)}% chance materials are saved`, sub: `${skillName(fx.skill)} work` };
    case 'craftSpeed':
      return { kind: 'trade', head: `Work ${Math.round((1 - fx.mult) * 100)}% faster`, sub: `${skillName(fx.skill)} craft` };
    case 'perk':
      return { kind: 'knack', head: cap(describePerk(host, fx.perk, fx.magnitude)), sub: 'A knack of the trade' };
    case 'art':
      return {
        kind: 'art',
        head: abilityDef(fx.ability)?.name ?? fx.ability,
        sub: 'Licensed to your codex, any weapon in hand',
      };
  }
}

/** The glyph family a package entry belongs to, for the verse lead. */
export function callingKindOf(host: Panels, fx: CallingEffect): string {
  switch (fx.kind) {
    case 'gear':
      return fx.effect.kind === 'proc' ? 'proc' : 'gear';
    case 'perPiece':
      return 'gear';
    case 'doubleGather':
    case 'gatherSpeed':
    case 'materialSave':
    case 'craftSpeed':
      return 'trade';
    case 'perk':
      return 'knack';
    default:
      return fx.kind; // proc | when | art
  }
}

/**
 * The action a technique seat answers to (seat 0 casts ability1,
 * seat 1 ability3). EVERY GLYPH KNOWS ITS DEVICE: the seat is only
 * ever NAMED by a seatChip built from this action — never by a bare
 * letter baked into a sentence. `seatKey` died here in the Grand
 * Refit, Phase 3.
 */
export function seatAction(host: Panels, seat: 0 | 1): ActionId {
  return seat === 0 ? 'ability1' : 'ability3';
}

/** The raw pad button a seat rides — THE SEAT ANSWERS ITS OWN BUTTON. */
export function seatPadButton(host: Panels, seat: 0 | 1): number | undefined {
  return bindings.pad(seatAction(host, seat))[0];
}

/**
 * The seat sheet: the verbs a technique plate offers, seat chips
 * set into them. Seating an art is one press at the plate — the
 * two-column trip to the bench buttons is over.
 */
export function seatVerbs(host: Panels, ability: string, st: 'unlocked' | 'equipped'): SheetVerb[] {
  const verbs: SheetVerb[] = [];
  const seatOf = host.seatOf(ability);
  for (const seat of [0, 1] as const) {
    if (st === 'equipped' && seatOf === seat) continue;
    const label =
      st === 'equipped'
        ? glyphLine('Move to the • seat', seatChip(seatAction(host, seat)))
        : glyphLine('Seat on •', seatChip(seatAction(host, seat)));
    verbs.push({
      label,
      act: () => {
        seatFlight(host, ability, seat);
        host.onTechnique(ability, seat === 0 ? 0 : 2);
      },
      padButton: seatPadButton(host, seat),
    });
  }
  return verbs;
}

/**
 * THE LOADOUT ALTAR — four painted seats, always visible: the two
 * art seats side by side, then the trinkets, THE PAIRED HAND's
 * order matching the hotbar exactly. Each seat is a kit socket
 * wearing its live chip; a filled art seat presses through to its
 * plate on the stage.
 */
export function renderArtsLoadout(host: Panels): void {
  const relic = itemDef(host.lastEquipment.relic?.id ?? '');
  const sigil = itemDef(host.lastEquipment.sigil?.id ?? '');
  host.artsLoadout.innerHTML = '';
  host.artsLoadout.dataset.region = '';
  host.altarSockets = [];
  const title = document.createElement('span');
  title.className = 'load-title';
  title.textContent = 'The Hand';
  host.artsLoadout.appendChild(title);
  for (const row of [
    { action: 'ability1', src: 'First art', ab: host.techniques[0] ?? undefined, empty: 'Choose above', art: true },
    { action: 'ability3', src: 'Second art', ab: host.techniques[1] ?? undefined, empty: 'Choose above', art: true },
    { action: 'ability2', src: 'Relic', ab: relic?.relic, empty: 'Wear a relic', art: false },
    { action: 'ability4', src: 'Sigil', ab: sigil?.sigil, empty: 'Fell a boss', art: false },
  ] as const) {
    const ab = row.ab ? abilityDef(row.ab) : undefined;
    // THE LOAN LAW at the altar: a seated secret with its teacher
    // away reads asleep here too — the altar never overpromises.
    const tdef = row.ab ? techniquePoolDef(row.ab) : undefined;
    const dormant = !!tdef && secretDormant(host, tdef);
    const seat = socket({ action: row.action, label: row.src });
    seat.root.classList.add('altar-seat');
    if (row.art) host.altarSockets.push(seat);
    if (dormant) seat.root.classList.add('dormant');
    // The seat holding the art on the reading wears the choice glow —
    // the eye finds where the chosen art already lives.
    if (row.art && ab && host.artsSel === ab.id) seat.root.classList.add('holds-choice');
    if (ab) seat.fill(abilityIconUrl(ab.id, 44), ab.name);
    const name = document.createElement('span');
    name.className = 'load-name' + (ab ? '' : ' empty');
    name.textContent = ab
      ? dormant
        ? `${ab.name} (asleep)`
        : ab.name
      : row.empty;
    seat.root.appendChild(name);
    if (dormant && ab) seat.root.title = `${ab.name} sleeps. Hold a weapon that teaches it.`;
    // A filled art seat is a door to its plate on the stage.
    if (row.art && ab) {
      seat.root.dataset.nav = '';
      seat.root.dataset.navkey = `load:${row.action}`;
      seat.root.dataset.acta = 'Inspect';
      seat.root.addEventListener('click', () => {
        const style = techniquePoolDef(ab.id)?.style;
        if (style) {
          host.artsWing = 'arts';
          host.artsSchoolSel = style;
          host.artsSel = ab.id;
          renderArts(host);
        }
      });
    }
    host.artsLoadout.appendChild(seat.root);
  }
  // The seats' law, told beside them — the hand explains itself.
  const teach = document.createElement('div');
  teach.className = 'hand-teach';
  teach.appendChild(
    glyphLine(
      'The • and • seats both carry any learned art, whatever you wield. Swapping is always free.',
      seatChip(seatAction(host, 0)),
      seatChip(seatAction(host, 1)),
    ),
  );
  host.artsLoadout.appendChild(teach);
}

/**
 * THE PATH — one school's arts as a single center-staged ribbon.
 * Everything unlocked stands linked on a forged spine; the FIRST
 * locked rung shows its name and level; every deeper rung condenses
 * into ONE veil cap ("✦ N more wait past Lv X") — the mist at the
 * ladder's end, not a row of question marks. Secrets ride the same
 * ribbon past a forged seam (THE QUIET SHELF still holds: only
 * secrets this hand has met). The track slides so the chosen art
 * stands center stage; `overflow: clip` on the ribbon keeps
 * scrollIntoView from ever fighting the slide.
 */
export function artsStage(host: Panels, style: SkillId): HTMLElement {
  const face = SKILL_FACE[style] ?? { icon: 'bread', color: '#d9a441' };
  const hidden = HIDDEN_SKILLS[style];
  const level = levelForXp(host.lastSkills[style] ?? 0);
  const block = document.createElement('div');
  block.className = 'arts-stage' + (hidden ? ' secret-skill' : '');
  block.style.setProperty('--skill-accent', face.color);

  // The stage head: the school named once, its climb told in rungs.
  const head = document.createElement('div');
  head.className = 'stage-head';
  const name = document.createElement('span');
  name.className = 'stage-school';
  name.textContent = skillName(style);
  const lv = document.createElement('span');
  lv.className = 'stage-gem';
  lv.dataset.tipname = 'Skill level';
  lv.dataset.tipsub = `${skillName(style)} stands at level ${level}.`;
  const lvNum = document.createElement('span');
  lvNum.className = 'stage-gem-num';
  lvNum.textContent = String(level);
  lv.appendChild(lvNum);
  head.append(name, lv);
  const rungs = host.visibleTechniques(style).filter((t) => !t.hidden && !t.secret);
  const climbed = rungs.filter((t) => {
    const s = techState(host, style, t);
    return s === 'unlocked' || s === 'equipped';
  }).length;
  const count = document.createElement('span');
  count.className = 'stage-count';
  count.textContent = `${climbed} of ${rungs.length} arts`;
  count.dataset.tipname = 'The ladder';
  count.dataset.tipsub = `${climbed} of ${rungs.length} arts answer to this school so far.`;
  head.appendChild(count);
  for (const seat of [0, 1] as const) {
    if (techniquePoolDef(host.techniques[seat] ?? '')?.style !== style) continue;
    const hand = document.createElement('span');
    hand.className = 'in-hand';
    hand.appendChild(glyphLine('On •', seatChip(seatAction(host, seat))));
    hand.dataset.tipname = 'In hand';
    hand.dataset.tipsub = 'This school owns an art riding one of your seats.';
    head.appendChild(hand);
  }
  // THE OPEN HALL: the door to the other wing stands in every head.
  head.appendChild(wingToggle(host));
  block.appendChild(head);

  const visible = host.visibleTechniques(style);
  const ladder = visible.filter((t) => !t.secret);
  const secrets = visible.filter((t) => t.secret);
  // The shown rungs: everything up to the first locked; the veil
  // condenses. Earned pages (hidden) always show — they sit at the
  // ribbon's head end, outside the spine.
  const shown = ladder.filter((t) => techState(host, style, t) !== 'veiled');
  const veiled = ladder.filter((t) => techState(host, style, t) === 'veiled');

  const ribbon = document.createElement('div');
  ribbon.className = 'path-ribbon';
  const track = document.createElement('div');
  track.className = 'path-track';
  shown.forEach((tech, i) => {
    const prev = shown[i - 1];
    const linked = !tech.hidden && !!prev && !prev.hidden;
    track.appendChild(techPlate(host, style, tech, linked));
  });
  if (veiled.length > 0) {
    const minLv = veiled.reduce((m, t) => Math.min(m, t.unlockLevel), Infinity);
    track.appendChild(veilCap(host, style, veiled.length, minLv));
  }
  if (secrets.length > 0) {
    // The forged seam: where the ladder ends and the shelf begins.
    const seam = document.createElement('div');
    seam.className = 'path-seam';
    const mark = document.createElement('span');
    mark.className = 'seam-mark';
    mark.textContent = '◈';
    const word = document.createElement('span');
    word.className = 'seam-word';
    word.textContent = 'Secrets';
    seam.append(mark, word);
    seam.dataset.tipname = 'The secret shelf';
    seam.dataset.tipsub =
      'Arts that weapons teach. Fight with the teacher and its art becomes yours for good.';
    track.appendChild(seam);
    for (const tech of secrets) track.appendChild(techPlate(host, style, tech, false));
  }
  ribbon.appendChild(track);
  // The pointer's way along a slid ribbon: the wheel steps the
  // choice, and a chevron waits at either edge on hover. (The pad
  // never needs them — spatial nav walks clipped plates natively.)
  ribbon.addEventListener(
    'wheel',
    (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (d === 0) return;
      e.preventDefault();
      stepRibbon(host, d > 0 ? 1 : -1);
    },
    { passive: false },
  );
  for (const dir of [-1, 1] as const) {
    const nudge = document.createElement('button');
    nudge.className = 'ribbon-nudge ' + (dir < 0 ? 'prev' : 'next');
    nudge.textContent = dir < 0 ? '‹' : '›';
    nudge.setAttribute('aria-label', dir < 0 ? 'Previous art' : 'Next art');
    nudge.addEventListener('click', () => stepRibbon(host, dir));
    ribbon.appendChild(nudge);
  }
  block.appendChild(ribbon);
  return block;
}

/** Step the ribbon's choice to the neighboring plate. */
export function stepRibbon(host: Panels, dir: -1 | 1): void {
  const track = host.artsSchools.querySelector<HTMLElement>('.path-track');
  if (!track) return;
  const keys = Array.from(track.querySelectorAll<HTMLElement>('[data-navkey]'))
    .map((el) => el.dataset.navkey ?? '')
    .filter((k) => k.startsWith('art:') || k.startsWith('artveil:'));
  const currentKey = host.artsSel?.startsWith('veil:')
    ? `artveil:${host.artsSel.slice('veil:'.length)}`
    : `art:${host.artsSel}`;
  const i = keys.indexOf(currentKey);
  const next = keys[Math.max(0, Math.min(keys.length - 1, (i < 0 ? 0 : i) + dir))];
  if (!next || next === currentKey) return;
  inspectArt(host, 
    next.startsWith('artveil:') ? `veil:${next.slice('artveil:'.length)}` : next.slice('art:'.length),
  );
}

/**
 * The ladder's mist: one plate standing for every rung past the
 * next — it admits how much waits without spelling any of it.
 */
export function veilCap(host: Panels, style: SkillId, count: number, minLevel: number): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'tech-plate-btn veiled veil-cap';
  if (host.artsSel === `veil:${style}`) btn.classList.add('selected');
  btn.dataset.nav = '';
  btn.dataset.navkey = `artveil:${style}`;
  btn.dataset.acta = 'Peer';
  const wellEl = document.createElement('span');
  wellEl.className = 'tech-plate-well';
  const q = document.createElement('span');
  q.className = 'tech-mystery';
  q.textContent = '✦';
  wellEl.appendChild(q);
  const nameEl = document.createElement('span');
  nameEl.className = 'tech-plate-name';
  nameEl.textContent = `${count} more`;
  const sub = document.createElement('span');
  sub.className = 'tech-plate-sub';
  sub.textContent = `past Lv ${minLevel}`;
  btn.append(wellEl, nameEl, sub);
  btn.addEventListener('click', () => inspectArt(host, `veil:${style}`));
  return btn;
}

/**
 * Slide the ribbon so the chosen plate stands center stage. The
 * track rides the `translate` channel (compositor-only), clamped so
 * the ribbon never shows void past either end.
 */
export function recenterRibbon(host: Panels): void {
  const ribbon = host.artsSchools.querySelector<HTMLElement>('.path-ribbon');
  const track = host.artsSchools.querySelector<HTMLElement>('.path-track');
  if (!ribbon || !track) return;
  // Both wings ride one ribbon: recenter on whichever wing's pick.
  const sel = host.artsWing === 'callings' ? host.callingSel : host.artsSel;
  const veilPrefix = host.artsWing === 'callings' ? 'callveil:' : 'artveil:';
  const plainPrefix = host.artsWing === 'callings' ? 'call:' : 'art:';
  const key = sel?.startsWith('veil:')
    ? `${veilPrefix}${sel.slice('veil:'.length)}`
    : `${plainPrefix}${sel}`;
  const plate = track.querySelector<HTMLElement>(`[data-navkey="${CSS.escape(key)}"]`);
  // Measure in track-local space (offsetLeft is translate-immune,
  // so a mid-slide recenter still lands true).
  const ribbonW = ribbon.clientWidth;
  const trackW = track.scrollWidth;
  if (trackW <= ribbonW || !plate) {
    track.style.translate = '0 0';
    return;
  }
  const center = plate.offsetLeft + plate.offsetWidth / 2;
  const tx = Math.max(ribbonW - trackW, Math.min(0, ribbonW / 2 - center));
  track.style.translate = `${Math.round(tx)}px 0`;
}

/**
 * THE LOAN LAW's dormancy, mirrored for the codex: a seated secret
 * whose teaching weapon left the hands sleeps until it returns.
 */
export function secretDormant(host: Panels, tech: TechniqueDef): boolean {
  return (
    !!tech.secret &&
    host.seatOf(tech.ability) !== null &&
    !host.ownsArt(tech.ability) &&
    !host.licensedArts().has(tech.ability) &&
    !host.equippedArtIds().has(tech.ability)
  );
}

/** One plate on a rail — rung, page, and secret speak the same shape. */
export function techPlate(host: Panels, style: SkillId, tech: TechniqueDef, linked: boolean): HTMLElement {
  const ab = abilityDef(tech.ability)!;
  const st = techState(host, style, tech);
  const btn = document.createElement('button');
  btn.className = `tech-plate-btn ${st}`;
  if (linked) {
    btn.classList.add('rail-link');
    if (st === 'unlocked' || st === 'equipped') btn.classList.add('rail-lit');
  }
  if (secretDormant(host, tech)) btn.classList.add('dormant');
  if (host.artsSel === tech.ability) btn.classList.add('selected');
  btn.dataset.nav = '';
  btn.dataset.navkey = `art:${tech.ability}`;
  btn.dataset.acta = 'Inspect';
  const wellEl = document.createElement('span');
  wellEl.className = 'tech-plate-well';
  if (st === 'veiled') {
    const q = document.createElement('span');
    q.className = 'tech-mystery';
    q.textContent = '?';
    wellEl.appendChild(q);
  } else {
    const plate = document.createElement('img');
    // The codex grid is a first-open burst (one plate per known
    // technique) — plates fill through the BUDGETED LANE; cached
    // plates still land synchronously, so reopen never flickers.
    queueAbilityIcon(plate, tech.ability, 44);
    plate.draggable = false;
    wellEl.appendChild(plate);
    if ((st === 'unlocked' || st === 'equipped') && !host.seenTech.has(tech.ability)) {
      const pip = document.createElement('span');
      pip.className = 'new-pip';
      pip.textContent = 'NEW';
      wellEl.appendChild(pip);
    }
    if (st === 'equipped') {
      const rBadge = document.createElement('span');
      rBadge.className = 'r-badge';
      rBadge.appendChild(
        seatChip(seatAction(host, host.seatOf(tech.ability) === 0 ? 0 : 1)),
      );
      wellEl.appendChild(rBadge);
    }
    if (tech.hidden) {
      const seal = document.createElement('span');
      seal.className = 'earned-seal';
      seal.textContent = '❖';
      seal.dataset.tipname = 'An unwritten page';
      seal.dataset.tipsub = 'Earned by deed — no rung of the ladder holds it.';
      wellEl.appendChild(seal);
    }
    if (tech.secret) {
      const pctOf = (banked: number): number =>
        Math.min(99, Math.floor(Math.min(1, banked / masteryXp(tech.secret!.anchorLevel)) * 100));
      const bankedNow = host.lessons[tech.ability] ?? 0;
      const seal = document.createElement('span');
      seal.className = 'earned-seal';
      seal.textContent = host.ownsArt(tech.ability) ? '❖' : '◈';
      seal.dataset.tipname = 'A secret art';
      seal.dataset.tipsub = host.ownsArt(tech.ability)
        ? 'Mastered — yours from any hand, forever.'
        : bankedNow > 0
          ? `Lent by the weapon that teaches it. Mastery ${pctOf(bankedNow) < 1 ? 'under 1' : pctOf(bankedNow)}% — fight on, and it will stay.`
          : host.seatOf(tech.ability) === null
            ? 'Lent by the weapon that teaches it. Seat it and fight, and the art will stay.'
            : 'Lent by the weapon that teaches it. Fight on, and it will stay.';
      wellEl.appendChild(seal);
      // THE LESSON's fill at plate scale: how far the blade has
      // carried you, told without a number.
      const banked = host.lessons[tech.ability] ?? 0;
      if (!host.ownsArt(tech.ability) && banked > 0 && tech.secret) {
        const meter = document.createElement('span');
        meter.className = 'plate-lesson';
        const fill = document.createElement('span');
        fill.className = 'plate-lesson-fill';
        const frac = Math.min(1, banked / masteryXp(tech.secret.anchorLevel));
        fill.style.width = `${Math.round(frac * 100)}%`;
        meter.appendChild(fill);
        wellEl.appendChild(meter);
      }
    }
  }
  const nameEl = document.createElement('span');
  nameEl.className = 'tech-plate-name';
  nameEl.textContent = st === 'veiled' ? '???' : ab.name;
  const sub = document.createElement('span');
  sub.className = 'tech-plate-sub';
  const rank = techRank(host, style, tech);
  const seat = host.seatOf(tech.ability);
  const chip = (): HTMLElement => seatChip(seatAction(host, seat === 0 ? 0 : 1));
  const licensedHere = host.licensedArts().has(tech.ability) && !host.ownsArt(tech.ability);
  if (licensedHere) {
    // THE MASTER'S LICENSE speaks its citizenship and its rank.
    if (st === 'equipped') sub.appendChild(glyphLine(`On • · ${RANK_ROMAN[rank]} · licensed`, chip()));
    else sub.textContent = `Licensed · ${RANK_ROMAN[rank]}`;
  } else if (tech.secret && !host.ownsArt(tech.ability)) {
    // A lent secret speaks its citizenship, not a rank it cannot climb.
    if (st === 'equipped') {
      sub.appendChild(glyphLine(`On • · ${secretDormant(host, tech) ? 'asleep' : 'lent'}`, chip()));
    } else {
      sub.textContent = 'Lent';
    }
  } else if (st === 'equipped') {
    sub.appendChild(glyphLine(`On • · ${RANK_ROMAN[rank]}`, chip()));
  } else {
    sub.textContent = st === 'unlocked' ? `Rank ${RANK_ROMAN[rank]}` : `Lv ${tech.unlockLevel}`;
  }
  btn.append(wellEl, nameEl, sub);
  btn.addEventListener('click', () => {
    inspectArt(host, tech.ability);
    // THE VERB COMES TO THE HAND: a seatable art raises its seat
    // sheet AT the plate — mouse and pad ride the same wire. The
    // inspect is bench-only, so the plate under the sheet stands.
    if (st === 'unlocked' || st === 'equipped') {
      openSheet(btn, seatVerbs(host, tech.ability, st));
    }
  });
  return btn;
}

/**
 * Light the bench for one art without rebuilding the stage: focus
 * and hover ride this, so reading is free and the ring never loses
 * the plate it stands on.
 */
export function inspectArt(host: Panels, ability: string): void {
  if (host.artsSel === ability) return;
  host.artsSel = ability;
  markTechSeen(host, ability);
  const key = ability.startsWith('veil:')
    ? `artveil:${ability.slice('veil:'.length)}`
    : `art:${ability}`;
  host.artsSchools
    .querySelectorAll('.tech-plate-btn.selected')
    .forEach((p) => p.classList.remove('selected'));
  host.artsSchools
    .querySelector(`[data-navkey="${CSS.escape(key)}"]`)
    ?.classList.add('selected');
  for (const s of [0, 1] as const) {
    host.altarSockets[s]?.root.classList.toggle('holds-choice', host.techniques[s] === ability);
  }
  recenterRibbon(host);
  renderArtsBench(host);
  updateArtsPip(host);
}

/**
 * THE SEAT FLIGHT — the chosen plate's face flies from the ribbon
 * into its seat, so seating an art is a thing you SEE land. Pure
 * grace note: gated by the Interface-motion setting, and the server
 * echo (setTechniques) repaints the truth under it either way.
 */
export function seatFlight(host: Panels, ability: string, seat: 0 | 1): void {
  if (document.body.classList.contains('no-ui-motion')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const from = host.artsSchools
    .querySelector<HTMLElement>(`[data-navkey="${CSS.escape(`art:${ability}`)}"] .tech-plate-well img`);
  const target = host.altarSockets[seat]?.root.querySelector<HTMLElement>('.socket-well');
  if (!from || !target) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (a.width === 0 || b.width === 0) return;
  const ghost = from.cloneNode(true) as HTMLElement;
  ghost.className = 'seat-flight';
  ghost.style.width = `${a.width}px`;
  ghost.style.height = `${a.height}px`;
  ghost.style.left = `${a.x}px`;
  ghost.style.top = `${a.y}px`;
  document.body.appendChild(ghost);
  const dx = b.x + b.width / 2 - (a.x + a.width / 2);
  const dy = b.y + b.height / 2 - (a.y + a.height / 2);
  const scale = (b.width * 0.72) / a.width;
  const flight = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      {
        transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 28}px) scale(${(1 + scale) / 2})`,
        opacity: 1,
        offset: 0.55,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.4 },
    ],
    { duration: 430, easing: 'cubic-bezier(0.3, 0.6, 0.25, 1)' },
  );
  flight.onfinish = () => {
    ghost.remove();
    host.altarSockets[seat]?.flash();
  };
}

/**
 * THE SCHOOL ENVELOPE — the maxima the reading's gauges measure
 * against, so every bar is a COMPARISON, not a lone number: a
 * damage bar filled halfway means half the hardest hit this school
 * knows. Veiled rungs stay out of the envelope (no spoilers in the
 * scale).
 */
export function schoolEnvelope(host: Panels, style: SkillId): {
  damage: number;
  cooldown: number;
  range: number;
  radius: number;
} {
  const out = { damage: 1, cooldown: 1, range: 1, radius: 1 };
  for (const t of host.visibleTechniques(style)) {
    if (techState(host, style, t) === 'veiled') continue;
    const base = abilityDef(t.ability);
    if (!base) continue;
    const ab = honedAbility(base, t.ranks, Math.max(techRank(host, style, t), 1));
    out.damage = Math.max(out.damage, ab.damage);
    out.cooldown = Math.max(out.cooldown, ab.cooldownTicks / 20);
    out.range = Math.max(out.range, ab.range ?? 0);
    out.radius = Math.max(out.radius, Math.max(ab.radius ?? 0, ab.splashRadius ?? 0));
  }
  return out;
}

/**
 * One gauge of the reading: a forged channel with the fill measured
 * against the school envelope, faceted by ticks when the unit is
 * countable (tiles), the numeral standing at the end. The stat
 * cards died here — a measure is an instrument, not a plaque.
 */
export function measureRow(host: Panels, opts: {
  label: string;
  value: string;
  frac: number;
  tone: string;
  ticks?: number;
  tip?: string;
}): HTMLElement {
  const row = document.createElement('div');
  row.className = 'measure';
  row.style.setProperty('--m-tone', opts.tone);
  if (opts.tip) {
    row.dataset.tipname = opts.label;
    row.dataset.tipsub = opts.tip;
  }
  const label = document.createElement('span');
  label.className = 'm-label';
  label.textContent = opts.label;
  const channel = document.createElement('span');
  channel.className = 'm-channel';
  const fill = document.createElement('span');
  fill.className = 'm-fill';
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, opts.frac)) * 100)}%`;
  channel.appendChild(fill);
  if (opts.ticks && opts.ticks > 1 && opts.ticks <= 24) {
    for (let i = 1; i < opts.ticks; i++) {
      const tick = document.createElement('span');
      tick.className = 'm-tick';
      tick.style.left = `${(i / opts.ticks) * 100}%`;
      channel.appendChild(tick);
    }
  }
  const value = document.createElement('span');
  value.className = 'm-value';
  value.textContent = opts.value;
  row.append(label, channel, value);
  return row;
}

/** One small forged seal in the marks row — a fact, worn not listed. */
export function markSeal(host: Panels, text: string, tone: string, tip?: string): HTMLElement {
  const seal = document.createElement('span');
  seal.className = 'mark-seal';
  seal.style.setProperty('--m-tone', tone);
  seal.textContent = text;
  if (tip) {
    seal.dataset.tipname = text;
    seal.dataset.tipsub = tip;
  }
  return seal;
}

/** THE READING: the chosen art laid out as instruments, not cards. */
export function renderArtsBench(host: Panels, all?: Array<{ style: SkillId; t: TechniqueDef }>): void {
  all ??= artsSchoolIds(host).flatMap((s) =>
    host.visibleTechniques(s).map((t) => ({ style: s, t })),
  );
  host.artsDetail.innerHTML = '';
  // The veil cap's reading: how much the mist is holding, no more.
  if (host.artsSel?.startsWith('veil:')) {
    const style = host.artsSel.slice('veil:'.length) as SkillId;
    const veiled = host.visibleTechniques(style).filter(
      (t) => !t.secret && techState(host, style, t) === 'veiled',
    );
    const minLv = veiled.reduce((m, t) => Math.min(m, t.unlockLevel), Infinity);
    const hiddenSkill = HIDDEN_SKILLS[style];
    const styleName = hiddenSkill ? hiddenSkill.name : style;
    const head = document.createElement('div');
    head.className = 'bench-head';
    const well = document.createElement('div');
    well.className = 'bench-plate veiled';
    const q = document.createElement('span');
    q.className = 'tech-mystery lg';
    q.textContent = '✦';
    well.appendChild(q);
    const names = document.createElement('div');
    names.className = 'bench-names';
    const name = document.createElement('div');
    name.className = 'bench-name';
    name.textContent = 'The mist holds more';
    const line = document.createElement('div');
    line.className = 'bench-line';
    line.textContent = styleName;
    names.append(name, line);
    head.append(well, names);
    host.artsDetail.appendChild(head);
    const desc = document.createElement('p');
    desc.className = 'bench-desc';
    desc.textContent =
      veiled.length === 1
        ? `One more art waits past ${styleName} level ${minLv}. Train on, and it will show its face.`
        : `${veiled.length} arts wait in this school's mist. The next shows its face at ${styleName} level ${minLv}.`;
    host.artsDetail.appendChild(desc);
    host.ground.show(null);
    return;
  }
  const entry = all.find((e) => e.t.ability === host.artsSel);
  if (!entry) {
    const note = document.createElement('div');
    note.className = 'bench-empty';
    note.textContent = 'Raise a combat skill and its arts will gather here.';
    host.artsDetail.appendChild(note);
    host.ground.show(null);
    return;
  }
  const { style, t } = entry;
  const base = abilityDef(t.ability)!;
  const st = techState(host, style, t);
  const rank = techRank(host, style, t);
  // Stats speak at the rank the hand has earned — the same resolver
  // the server casts through, so the bench can never overpromise.
  const ab = honedAbility(base, t.ranks, Math.max(rank, 1));
  const hidden = HIDDEN_SKILLS[style];
  const styleName = hidden ? hidden.name : style;

  const head = document.createElement('div');
  head.className = 'bench-head';
  const well = document.createElement('div');
  well.className = 'bench-plate' + (st === 'veiled' ? ' veiled' : '');
  if (st === 'veiled') {
    const q = document.createElement('span');
    q.className = 'tech-mystery lg';
    q.textContent = '?';
    well.appendChild(q);
  } else {
    const img = document.createElement('img');
    img.src = abilityIconUrl(t.ability, 72);
    img.draggable = false;
    well.appendChild(img);
  }
  const names = document.createElement('div');
  names.className = 'bench-names';
  const name = document.createElement('div');
  name.className = 'bench-name';
  name.textContent = st === 'veiled' ? 'An unwritten page' : ab.name;
  const line = document.createElement('div');
  line.className = 'bench-line';
  line.textContent =
    st === 'unlocked' || st === 'equipped'
      ? `${styleName} · Rank ${RANK_ROMAN[rank]}${
          t.hidden ? ' · Earned' : t.secret ? (host.ownsArt(t.ability) ? ' · Mastered' : ' · Lent') : ''
        }`
      : styleName;
  names.append(name, line);
  head.append(well, names);
  host.artsDetail.appendChild(head);

  const seat = host.seatOf(t.ability);
  const benchChip = (): HTMLElement => seatChip(seatAction(host, seat === 0 ? 0 : 1));
  // The state chip rides the head row — identity and standing on one
  // line, the reading's height spent on instruments instead.
  const state = document.createElement('div');
  state.className = `art-state ${st}`;
  if (st === 'equipped') {
    if (t.secret && !host.ownsArt(t.ability)) {
      const licensor = host.licensingCalling(t.ability);
      if (licensor) {
        // THE MASTER'S LICENSE keeps the seat awake — say who holds it.
        state.appendChild(glyphLine(`Riding your • seat, licensed by ${licensor.name}`, benchChip()));
      } else if (host.equippedArtIds().has(t.ability)) {
        state.appendChild(glyphLine('Riding your • seat, lent by the weapon in your hand', benchChip()));
      } else {
        state.appendChild(glyphLine('Seated on •, asleep. Hold a weapon that teaches it.', benchChip()));
      }
    } else {
      state.appendChild(glyphLine('Riding your • seat', benchChip()));
    }
  } else {
    const licensor = host.licensingCalling(t.ability);
    state.textContent =
      st === 'unlocked'
        ? licensor && !host.ownsArt(t.ability)
          ? `Licensed by ${licensor.name}. Yours while that calling stays answered.`
          : t.secret && !host.ownsArt(t.ability)
            ? 'Lent while its weapon is in your hand. Fight with it and the art will stay.'
            : 'Unlocked — ready to seat'
        : st === 'locked'
          ? `Unlocks at ${styleName} level ${t.unlockLevel}`
          : `A secret of ${styleName} — still veiled`;
  }
  head.appendChild(state);

  // THE LESSON LAW's meter — the courtship told PLAINLY (user
  // mandate 2026-07-31, supersedes the launch quiet-fill: the player
  // must know how close the art is to staying). The bar carries its
  // percent, and the label under it says what the number means.
  if (t.secret && !host.ownsArt(t.ability)) {
    const banked = host.lessons[t.ability] ?? 0;
    const frac = Math.min(1, banked / masteryXp(t.secret.anchorLevel));
    const pct = Math.min(99, Math.floor(frac * 100));
    // The lesson has two doors: the art must HOLD a seat, and its
    // teacher must be in hand. A meter that stands still without
    // saying which door is shut reads as broken — name the door.
    const seated = host.seatOf(t.ability) !== null;
    const taught = host.equippedArtIds().has(t.ability);
    const row = document.createElement('div');
    row.className = 'lesson-row';
    row.dataset.tipname = 'The lesson';
    row.dataset.tipsub = !seated
      ? 'The lesson only counts while this art holds one of your two seats. Seat it, take up its weapon, and fight.'
      : !taught
        ? 'The seat is set, but the teacher is away. Hold a weapon that teaches this art, and every fight counts.'
        : pct <= 0
          ? 'Fight with the weapon that teaches this art, and the art will begin to stay.'
          : pct < 50
            ? 'The blade still has things to teach. Every fight with it counts.'
            : pct < 90
              ? 'More than half yours. Keep fighting with the teacher.'
              : 'The lesson is nearly yours.';
    const meter = document.createElement('div');
    meter.className = 'lesson-meter';
    const fill = document.createElement('div');
    fill.className = 'lesson-fill';
    fill.style.width = `${Math.round(frac * 100)}%`;
    meter.appendChild(fill);
    const label = document.createElement('span');
    label.className = 'lesson-label';
    label.textContent =
      banked > 0 && pct < 1
        ? 'Mastery: under 1%'
        : pct >= 1
          ? `Mastery: ${pct}%`
          : !seated
            ? 'Mastery: seat this art to begin'
            : !taught
              ? 'Mastery: waiting on its weapon'
              : 'Mastery: not yet begun';
    row.append(meter, label);
    host.artsDetail.appendChild(row);
  }

  const desc = document.createElement('p');
  desc.className = 'bench-desc';
  desc.textContent =
    st === 'veiled'
      ? `Something waits at ${styleName} level ${t.unlockLevel}. Train on, and it will show its face.`
      : ab.desc;
  host.artsDetail.appendChild(desc);

  if (st !== 'veiled') {
    // THE MEASURES: every figure told against the school envelope —
    // a bar half full IS the comparison, no second art needed.
    const env = schoolEnvelope(host, style);
    const measures = document.createElement('div');
    measures.className = 'measures';
    const secs = (ticks: number): string => {
      const s = ticks / 20;
      return `${s % 1 === 0 ? s : s.toFixed(1)}s`;
    };
    const channeled = (ab.channelTicks ?? 0) > 0 && ab.shape !== 'tame';
    if (ab.damage > 0) {
      measures.appendChild(
        measureRow(host, {
          label: channeled ? 'Per beat' : 'Damage',
          value: String(ab.damage),
          frac: ab.damage / env.damage,
          tone: '#d95763',
          tip: `Measured against the hardest hit this school knows (${env.damage}).`,
        }),
      );
    }
    if (ab.cooldownTicks > 0) {
      measures.appendChild(
        measureRow(host, {
          label: 'Cooldown',
          value: secs(ab.cooldownTicks),
          frac: ab.cooldownTicks / 20 / env.cooldown,
          tone: '#b49af0',
          tip: `The wait between casts — the school's longest is ${env.cooldown % 1 === 0 ? env.cooldown : env.cooldown.toFixed(1)}s.`,
        }),
      );
    }
    // THE MASTERED HAND: the relationships between presses, each a
    // full-bar row (they are facts, not figures against the envelope).
    if (ab.follow) {
      const after = typeof ab.follow.after === 'string' ? ab.follow.after : ab.follow.after.join(' or ');
      const gain = ab.follow.damageMult
        ? `×${ab.follow.damageMult} damage`
        : ab.follow.status
          ? `lays ${ab.follow.status.status}`
          : ab.follow.refundTicks
            ? `${secs(ab.follow.refundTicks)} given back`
            : 'answers';
      measures.appendChild(
        measureRow(host, {
          label: 'Follows',
          value: `after ${after} · ${gain}`,
          frac: 1,
          tone: '#f2c94c',
          tip: `Cast within ${secs(ab.follow.windowTicks)} of an art that leaves ${after} and this one ${gain}. A follow spends the opening.`,
        }),
      );
    }
    if (ab.tag) {
      measures.appendChild(
        measureRow(host, {
          label: 'Leaves',
          value: ab.tag,
          frac: 1,
          tone: '#f2c94c',
          tip: `The word this art leaves in the air for a follower to answer.`,
        }),
      );
    }
    if (ab.aftermath) {
      const a = ab.aftermath;
      measures.appendChild(
        measureRow(host, {
          label: 'Aftermath',
          value: `${a.damage > 0 ? `${a.damage} every ${secs(a.everyTicks ?? 16)} for ` : ''}${secs(a.fieldTicks)}${a.status ? ` · ${a.status.status}` : ''}${a.self ? ' · holds ground' : ''}`,
          frac: 1,
          tone: '#e07a3a',
          tip: a.self
            ? 'The ground stays. Stand in it and wear its boon.'
            : 'The ground keeps burning after the press lands.',
        }),
      );
    }
    if (ab.finaleMult && ab.finaleMult > 1) {
      measures.appendChild(
        measureRow(host, {
          label: 'Finale',
          value: `last beat ×${ab.finaleMult}`,
          frac: 1,
          tone: '#d2e0f6',
          tip: 'Hold the whole note and its last beat lands at this weight. Break it early and keep only the quiet beats.',
        }),
      );
    }
    if (ab.onKill) {
      measures.appendChild(
        measureRow(host, {
          label: 'On a kill',
          value: `${secs(ab.onKill.refundTicks)} given back`,
          frac: 1,
          tone: '#d95763',
          tip: 'A kill landed within two seconds of the press refunds this much of the cooldown.',
        }),
      );
    }
    // THE DRAWN BREATH / THE HELD NOTE wear words: the planted
    // figure reads the same ONE ruler the accrual does.
    if (ab.castTicks) {
      measures.appendChild(
        measureRow(host, {
          label: 'Cast',
          value: `${secs(ab.castTicks)} · ${secs(ab.castTicks / CAST_STILL_FACTOR)} planted`,
          frac: ab.castTicks / 20 / Math.max(env.cooldown, 3),
          tone: '#d2e0f6',
          tip: 'The breath drawn before the art fires. Standing still breathes faster.',
        }),
      );
    }
    if (ab.channelTicks) {
      measures.appendChild(
        measureRow(host, {
          label: 'Channel',
          value: secs(ab.channelTicks),
          frac: ab.channelTicks / 20 / Math.max(env.cooldown, 3),
          tone: '#f6e2b2',
          tip: 'Held while the working runs its course.',
        }),
      );
    }
    if (ab.range) {
      measures.appendChild(
        measureRow(host, {
          label: 'Range',
          value: `${ab.range} tiles`,
          frac: ab.range / env.range,
          tone: '#7dc46a',
          ticks: Math.ceil(env.range),
          tip: `Each notch is one tile; the channel runs to the school's longest reach (${env.range}).`,
        }),
      );
    }
    const blast = Math.max(ab.radius ?? 0, ab.splashRadius ?? 0);
    if (blast > 0) {
      measures.appendChild(
        measureRow(host, {
          label: ab.radius ? 'Radius' : 'Splash',
          value: `${blast} tiles`,
          frac: blast / env.radius,
          tone: '#8ac4e8',
          ticks: Math.ceil(env.radius),
          tip: `How far the blast claims, in tiles — the school's widest is ${env.radius}.`,
        }),
      );
    }
    host.artsDetail.appendChild(measures);

    // THE MARKS: the art's remaining facts worn as forged seals.
    const marks = document.createElement('div');
    marks.className = 'mark-row';
    if ((ab.projectiles ?? 0) > 1) {
      marks.appendChild(markSeal(host, `×${ab.projectiles} shots`, '#e8b64c', 'A fan of projectiles across the aim.'));
    }
    if (ab.chainTargets) {
      marks.appendChild(markSeal(host, `chains ×${ab.chainTargets}`, '#ffe86a', 'Arcs on to more foes after the first.'));
    }
    if (ab.dashTiles) {
      marks.appendChild(
        markSeal(host, 
          (ab.dashTiles < 0 ? 'leaps back ' : 'dash ') + Math.abs(ab.dashTiles),
          '#e8b64c',
          ab.dashTiles < 0 ? 'Carries you away from the aim.' : 'Carries you through everything on the way.',
        ),
      );
    }
    if (ab.pierce) marks.appendChild(markSeal(host, 'pierces', '#d2e0f6', 'Shots punch through instead of stopping.'));
    if (ab.homing) marks.appendChild(markSeal(host, 'seeking', '#b49af0', 'Shots bend toward their mark.'));
    if (ab.knockback) {
      marks.appendChild(
        ab.knockback < 0
          ? markSeal(host, 'pulls in', '#8a6ac8', 'Drags foes toward the center.')
          : markSeal(host, 'knocks back', '#9aa2ac', 'Shoves foes away from the blow.'),
      );
    }
    if (ab.status) {
      const statusName = ab.status.status.charAt(0).toUpperCase() + ab.status.status.slice(1);
      marks.appendChild(
        markSeal(host, 
          `${statusName} ${secs(ab.status.durationTicks)}`,
          '#7ac46a',
          `Leaves ${statusName} riding the target.`,
        ),
      );
    }
    if (ab.vs) {
      // THE READING EDGE tooltip law: every payoff clause prints.
      const vsName = ab.vs.status.charAt(0).toUpperCase() + ab.vs.status.slice(1);
      marks.appendChild(
        markSeal(host, 
          `×${ab.vs.mult} ${ab.vs.consume ? 'spends' : 'vs'} ${vsName}`,
          '#e8b64c',
          ab.vs.consume
            ? `Bodies wearing ${vsName} take ×${ab.vs.mult} — and the state is spent for it.`
            : `Bodies wearing ${vsName} take ×${ab.vs.mult}.`,
        ),
      );
    }
    if (marks.childElementCount > 0) host.artsDetail.appendChild(marks);
  }

  // THE PROVING GROUND reads the same honed figures the measures do.
  host.ground.show(st === 'veiled' ? null : ab);

  // THE HONED-ART LAW's spine: the four ranks as studs on one forged
  // bar — the walked length lit brass, the current stud crowned,
  // waiting studs naming their level. A progression you READ as a
  // road, not four little cards.
  if ((st === 'unlocked' || st === 'equipped') && t.ranks?.length) {
    const spine = document.createElement('div');
    spine.className = 'rank-spine';
    const walked = (rank - 1) / (TECHNIQUE_MAX_RANK - 1);
    spine.style.setProperty('--walked-n', walked.toFixed(3));
    for (let r = 1; r <= TECHNIQUE_MAX_RANK; r++) {
      const stud = document.createElement('span');
      stud.className =
        'spine-stud' + (r <= rank ? ' attained' : '') + (r === rank ? ' current' : '');
      const num = document.createElement('span');
      num.className = 'stud-numeral';
      num.textContent = RANK_ROMAN[r] ?? '?';
      stud.appendChild(num);
      const under = document.createElement('span');
      under.className = 'stud-under';
      under.textContent = r <= rank ? '' : `Lv ${rankLevel(techniqueAnchor(t), r)}`;
      stud.appendChild(under);
      const note = r === 1 ? base.desc : (t.ranks[r - 2]?.note ?? '');
      if (r <= rank) {
        stud.dataset.tipname = `Rank ${RANK_ROMAN[r]}`;
        stud.dataset.tipsub = note;
      } else {
        stud.dataset.tipname = `Rank ${RANK_ROMAN[r]} — ${styleName} Lv ${rankLevel(techniqueAnchor(t), r)}`;
        stud.dataset.tipsub = 'Train on, and the art will sharpen itself.';
      }
      spine.appendChild(stud);
    }
    host.artsDetail.appendChild(spine);
    if (rank < TECHNIQUE_MAX_RANK) {
      const nextNote = t.ranks[rank - 1]?.note;
      if (nextNote) {
        const next = document.createElement('div');
        next.className = 'bench-next';
        next.textContent = `Rank ${RANK_ROMAN[rank + 1]} at ${styleName} ${rankLevel(techniqueAnchor(t), rank + 1)} — ${nextNote}`;
        host.artsDetail.appendChild(next);
      }
    }
  }

  if (st === 'unlocked') {
    const seats = document.createElement('div');
    seats.className = 'bench-seats';
    for (const s of [0, 1] as const) {
      const btn = bigButton('Seat', s === 0 ? `artequip:${t.ability}` : `artequipr:${t.ability}`, () => {
        seatFlight(host, t.ability, s);
        host.onTechnique(t.ability, s === 0 ? 0 : 2);
      });
      btn.textContent = '';
      btn.appendChild(glyphLine('Seat on •', seatChip(seatAction(host, s))));
      seats.appendChild(btn);
    }
    host.artsDetail.appendChild(seats);
  }
}
