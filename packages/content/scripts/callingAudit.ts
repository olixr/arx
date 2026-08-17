/**
 * THE HALL'S AUDIT — the authoring CLI for one ladder (or the whole
 * hall). Reads the SAME laws the suites read (src/callingLaws.ts) and
 * prints the ladder as the codex would: seat, price, name, the
 * package at every rank in plain kinds, and every page it touches.
 *
 *   npx tsx scripts/callingAudit.ts smithing        one ladder
 *   npx tsx scripts/callingAudit.ts --all           every ladder + hall-wide laws
 *   npx tsx scripts/callingAudit.ts --synergy       the register as a synergy map
 *
 * Exit code 1 on any fault, so an author's loop is: write, audit,
 * repeat until silence.
 */
import { SKILL_IDS, STATUS_BOOK, type SkillId } from '@arx/shared';
import { CALLINGS, CALLING_LICENSES, callingsFor, CALLING_MAX_RANK } from '../src/callings.js';
import { ladderFaults, pageTouches, everyPackage } from '../src/callingLaws.js';
import type { CallingEffect } from '../src/callings.js';
import { abilityDef } from '../src/abilities.js';

const arg = process.argv[2] ?? "";
const hall = [...CALLINGS.values()];

function kindWord(fx: CallingEffect): string {
  switch (fx.kind) {
    case 'gear': {
      const e = fx.effect as { kind: string } & Record<string, unknown>;
      const mag = 'amount' in e ? e.amount : 'pct' in e ? `${e.pct}%` : 'ticks' in e ? `${e.ticks}t` : '';
      const tag = 'style' in e ? `:${e.style}` : 'element' in e ? `:${e.element}` : 'status' in e ? `:${e.status}` : 'skill' in e ? `:${e.skill}` : '';
      return `gear.${e.kind}${tag} ${mag}`.trim();
    }
    case 'perPiece':
      return `perPiece.${fx.armorClass}${fx.speedPct ? ` +${fx.speedPct}%spd` : ''}${fx.maxHp ? ` +${fx.maxHp}hp` : ''}${fx.armor ? ` +${fx.armor}arm` : ''}`;
    case 'perk':
      return `perk.${fx.perk} ${fx.magnitude}`;
    case 'doubleGather':
    case 'materialSave':
      return `${fx.kind} ${Math.round(fx.chance * 100)}%`;
    case 'gatherSpeed':
    case 'craftSpeed':
      return `${fx.kind} x${fx.mult}`;
    case 'proc': {
      const t = fx.proc.trigger as { on: string } & Record<string, unknown>;
      const a = fx.proc.action as { do: string } & Record<string, unknown>;
      const tt = `${t.on}${'status' in t ? `:${t.status}` : ''}${'every' in t ? `/${t.every}` : ''}${'count' in t ? `x${t.count}(${t.per})` : ''}${'chance' in t ? ` ${Math.round((t.chance as number) * 100)}%` : ''}${'pct' in t ? ` ${t.pct}%` : ''}${'tiles' in t ? ` ${t.tiles}t` : ''}`;
      const aa = `${a.do}${'status' in a ? `:${a.status}` : ''}${'stat' in a ? `:${a.stat}` : ''}${'damage' in a ? ` ${a.damage}` : ''}${'amount' in a ? ` ${a.amount}` : ''}${'pct' in a ? ` ${a.pct}%` : ''}${'power' in a ? ` p${a.power}` : ''}${'ticks' in a ? ` ${a.ticks}t` : ''}${'absorb' in a ? ` ${a.absorb}` : ''}${'extra' in a ? ` +${a.extra}` : ''}`;
      return `proc "${fx.proc.name}" on ${tt} → ${aa} icd ${fx.proc.icd}`;
    }
    case 'when': {
      const c = fx.cond as { when: string } & Record<string, unknown>;
      const g = Object.entries(fx.grant)
        .filter(([k]) => k !== 'name' && k !== 'quiet')
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      return `when ${c.when}${'frac' in c ? ` ${c.frac}` : ''}${'status' in c ? `:${c.status}` : ''}${'style' in c ? `:${c.style}` : ''}${'count' in c ? ` ${c.count}` : ''} → "${fx.grant.name}" ${g}${fx.grant.quiet ? ' (quiet)' : ''}`;
    }
    case 'art':
      return `art ${fx.ability} (${abilityDef(fx.ability)?.name ?? '?'})`;
  }
}

function printLadder(skill: SkillId): number {
  const defs = callingsFor(skill).sort((a, b) => a.unlockLevel - b.unlockLevel);
  const licenses = CALLING_LICENSES.filter((r) => defs.some((d) => d.id === r.calling));
  console.log(`\n=== ${skill.toUpperCase()} — ${defs.length} seats, ${licenses.length} license rows ===`);
  for (const d of defs) {
    console.log(`\n[${String(d.unlockLevel).padStart(2)}] ${d.name}  (${d.id})  cost ${d.focusCost}  ${d.color}`);
    console.log(`     "${d.desc}"`);
    for (const [rank, pkg] of everyPackage(d)) {
      const note = rank > 1 ? d.ranks?.[rank - 2]?.note : undefined;
      console.log(`     ${['', 'I  ', 'II ', 'III', 'IV '][rank]} ${pkg.map(kindWord).join(' | ')}${note ? `   ~ ${note}` : ''}`);
    }
    const touches = new Set(everyPackage(d).flatMap(([, p]) => pageTouches(p)).map(([s, v]) => `${v}:${s}`));
    if (touches.size) console.log(`     pages: ${[...touches].join(', ')}`);
  }
  const faults = ladderFaults(skill, defs, licenses, hall);
  console.log(faults.length ? `\n${skill}: ${faults.length} FAULT(S)\n  - ${faults.join('\n  - ')}` : `\n${skill}: lawful.`);
  return faults.length;
}

function printSynergy(): void {
  const lays = new Map<string, string[]>();
  const reads = new Map<string, string[]>();
  for (const d of hall) {
    for (const [, pkg] of everyPackage(d)) {
      for (const [s, via] of pageTouches(pkg)) {
        const bucket = via.startsWith('lay') ? lays : reads;
        const list = bucket.get(s) ?? [];
        const tag = `${d.id}(${via.split(':')[1]})`;
        if (!list.includes(tag)) list.push(tag);
        bucket.set(s, list);
      }
    }
  }
  console.log('\n=== THE REGISTER AS A SYNERGY MAP ===');
  for (const page of Object.keys(STATUS_BOOK)) {
    const l = lays.get(page) ?? [];
    const r = reads.get(page) ?? [];
    if (!l.length && !r.length) continue;
    console.log(`\n${page}:`);
    console.log(`  laid by  (${l.length}): ${l.join(', ') || '—'}`);
    console.log(`  read by  (${r.length}): ${r.join(', ') || '—'}`);
  }
  // Arts licensed.
  const arts: string[] = [];
  for (const d of hall) for (const [, pkg] of everyPackage(d)) for (const fx of pkg) if (fx.kind === 'art') arts.push(`${d.id}→${fx.ability}`);
  console.log(`\narts licensed (${new Set(arts).size}): ${[...new Set(arts)].join(', ')}`);
}

let total = 0;
if (arg === '--all' || arg === '') {
  for (const s of SKILL_IDS) total += printLadder(s);
  console.log(`\nHALL: ${hall.length} callings, ${CALLING_LICENSES.length} license rows, ${total} fault(s), max rank ${CALLING_MAX_RANK}.`);
} else if (arg === '--synergy') {
  printSynergy();
} else if ((SKILL_IDS as readonly string[]).includes(arg)) {
  total = printLadder(arg as SkillId);
} else {
  console.error(`unknown skill '${arg}'. Skills: ${SKILL_IDS.join(', ')}`);
  process.exit(2);
}
process.exit(total > 0 ? 1 : 0);
