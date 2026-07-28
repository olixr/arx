import { DEFAULT_LOOK, type Look } from '@arx/shared';
import type { NpcActorDef, NpcDisposition } from '@arx/content';
import { markDirty, renderAll, state, toast } from './cms.js';
import { creatureRender } from './gameRender.js';
import { lookDesigner } from './lookDesigner.js';
import { lookFigure } from './portraits.js';
import { el } from './widgets.js';

/**
 * The actor foundry — a full creation pipeline in the studio modal.
 * Step 1 names the soul: name, slug, epithet, and how they meet the
 * world. Step 2 gives it a body: the player rig through the Hero's
 * Mirror (live figure preview beside every choice), or any bestiary
 * body picked from a grid of true in-game renders. Creating lands a
 * draft in the editor with everything staged; Save ▸ Live makes it
 * real.
 */

const DISPOSITIONS: Array<{ id: NpcDisposition; label: string; blurb: string }> = [
  { id: 'friendly', label: 'Friendly', blurb: 'Beyond harm — the talk-and-trade side of the world.' },
  { id: 'neutral', label: 'Neutral', blurb: 'Can be fought if given combat stats, never starts it.' },
  { id: 'hostile', label: 'Hostile', blurb: 'A named enemy — attacks on sight, combat required.' },
];

export function openActorWizard(): void {
  const modal = document.getElementById('modal') as HTMLDialogElement;
  const body = document.getElementById('modal-body')!;
  body.innerHTML = '';

  // The draft under construction.
  let name = '';
  let slug = '';
  let slugTouched = false;
  let title = '';
  let disposition: NpcDisposition = 'friendly';
  let bodyKind: 'humanoid' | 'creature' = 'humanoid';
  const look: Look = { ...DEFAULT_LOOK };
  let creature: string | null = null;
  let step: 1 | 2 = 1;

  const close = (): void => {
    modal.close();
    body.innerHTML = '';
  };

  const slugFromName = (n: string): string =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^[0-9]+/, '');

  const slugProblem = (): string | null => {
    if (!/^[a-z][a-z0-9_]*$/.test(slug)) return 'slug must be lowercase letters, digits, _';
    if (state.actors.some((a) => a.def.id === slug)) return `'${slug}' already exists`;
    return null;
  };

  const create = (): void => {
    const def: NpcActorDef = {
      id: slug,
      name: name.trim(),
      disposition,
      model:
        bodyKind === 'humanoid'
          ? { kind: 'humanoid', look: { ...look } }
          : { kind: 'creature', creature: creature! },
    };
    if (title.trim()) def.title = title.trim();
    if (disposition === 'hostile') {
      // The validator's law: hostile requires a combat block. Seed it
      // from the body's own bestiary level so the draft saves clean.
      const base = creature ? state.npcs.find((n) => n.def.id === creature) : undefined;
      def.combat = { level: base?.def.level ?? 5 };
    }
    state.actors.push({ def, edited: true, authored: false });
    close();
    state.selectedId = slug;
    location.hash = `#actors/${slug}`;
    renderAll();
    markDirty();
    toast(`'${def.name}' drafted — refine below, then Save ▸ Live`, 3600);
  };

  const paint = (): void => {
    body.innerHTML = '';
    const head = el('div', 'wiz-head');
    head.appendChild(el('h2', '', step === 1 ? 'New actor — who are they?' : 'New actor — give them a body'));
    const closeBtn = el('button', 'wiz-close', '✕') as HTMLButtonElement;
    closeBtn.type = 'button';
    closeBtn.title = 'Cancel (Esc)';
    closeBtn.onclick = close;
    head.appendChild(closeBtn);
    body.appendChild(head);
    body.appendChild(
      el(
        'div',
        'wiz-steps',
        step === 1 ? '● Identity   ○ Body' : '○ Identity   ● Body',
      ),
    );

    if (step === 1) paintIdentity();
    else if (bodyKind === 'humanoid') paintMirror();
    else paintMenagerie();
  };

  // ------------------------------------------------ step 1: identity

  const paintIdentity = (): void => {
    const grid = el('div', 'fgrid');
    const field = (label: string, input: HTMLElement, note = '', wide = false): HTMLElement => {
      const w = el('label', 'ffield' + (wide ? ' wide' : ''));
      w.appendChild(el('span', '', label));
      w.appendChild(input);
      if (note) w.appendChild(el('span', 'note', note));
      return w;
    };

    const nameIn = document.createElement('input');
    nameIn.value = name;
    nameIn.placeholder = 'Herbalist Mira';
    nameIn.className = 'wiz-name';
    const slugIn = document.createElement('input');
    slugIn.value = slug;
    slugIn.placeholder = 'herbalist_mira';
    const slugNote = el('span', 'note');
    nameIn.oninput = () => {
      name = nameIn.value;
      if (!slugTouched) {
        slug = slugFromName(name);
        slugIn.value = slug;
      }
      refresh();
    };
    slugIn.oninput = () => {
      slugTouched = true;
      slug = slugIn.value;
      refresh();
    };
    const titleIn = document.createElement('input');
    titleIn.value = title;
    titleIn.placeholder = 'Keeper of the Greenhouse';
    titleIn.oninput = () => (title = titleIn.value);

    grid.appendChild(field('name', nameIn, 'the nameplate over their head', true));
    const slugField = field('slug', slugIn);
    slugField.appendChild(slugNote);
    grid.appendChild(slugField);
    grid.appendChild(field('title (optional)', titleIn, 'the epithet under the nameplate'));
    body.appendChild(grid);

    // Disposition cards.
    const disp = el('div', 'mode-cards');
    for (const d of DISPOSITIONS) {
      const card = el('button', 'mode-card' + (disposition === d.id ? ' active' : '')) as HTMLButtonElement;
      card.type = 'button';
      card.appendChild(el('b', '', d.label));
      card.appendChild(el('span', '', d.blurb));
      card.onclick = () => {
        disposition = d.id;
        paint();
      };
      disp.appendChild(card);
    }
    body.appendChild(el('p', 'mirror-label wiz-gap', 'How they meet the world'));
    body.appendChild(disp);

    // Body kind cards.
    const kinds = el('div', 'mode-cards');
    for (const [kind, label, blurb] of [
      ['humanoid', 'A person — the player rig', 'Face, hair, and heritage in the Hero’s Mirror; wears real gear.'],
      ['creature', 'A creature — a bestiary body', 'A named beast wearing any body from the bestiary, true render and all.'],
    ] as const) {
      const card = el('button', 'mode-card' + (bodyKind === kind ? ' active' : '')) as HTMLButtonElement;
      card.type = 'button';
      card.appendChild(el('b', '', label));
      card.appendChild(el('span', '', blurb));
      card.onclick = () => {
        bodyKind = kind;
        paint();
      };
      kinds.appendChild(card);
    }
    body.appendChild(el('p', 'mirror-label wiz-gap', 'The body they wear'));
    body.appendChild(kinds);

    const foot = el('div', 'wiz-foot');
    const next = el('button', 'primary', 'Continue — choose the body ▸') as HTMLButtonElement;
    next.onclick = () => {
      step = 2;
      paint();
    };
    foot.appendChild(next);
    body.appendChild(foot);

    const refresh = (): void => {
      const problem = !name.trim() ? 'name the actor first' : slugProblem();
      slugNote.textContent = problem ?? `will live at actors/${slug}`;
      slugNote.classList.toggle('bad', !!problem && !!name.trim());
      next.disabled = !!problem || !name.trim();
    };
    refresh();
    nameIn.focus();
  };

  // ------------------------------------- step 2a: the Hero's Mirror

  const paintMirror = (): void => {
    const split = el('div', 'wiz-mirror');
    const stage = el('div', 'wiz-stage');
    const stageArt = el('div', 'wiz-stage-art');
    stage.appendChild(stageArt);
    stage.appendChild(el('b', 'wiz-stage-name', name.trim() || 'The new face'));
    stage.appendChild(el('span', 'note', 'live — exactly as the world renders it'));
    split.appendChild(stage);

    const refreshStage = (): void => {
      stageArt.innerHTML = '';
      const fig = lookFigure(look, 224);
      if (fig) stageArt.appendChild(fig);
    };
    refreshStage();
    split.appendChild(lookDesigner(look, refreshStage));
    body.appendChild(split);
    body.appendChild(foot());
  };

  // ----------------------------------------- step 2b: the menagerie

  const paintMenagerie = (): void => {
    body.appendChild(
      el('p', 'sect-sub', 'Every body is the true in-game render — pick the one this named soul wears.'),
    );
    const grid = el('div', 'creature-grid');
    const sorted = state.npcs.slice().sort((a, b) => a.def.level - b.def.level);
    for (const n of sorted) {
      const tile = el('button', 'creature-tile' + (creature === n.def.id ? ' active' : '')) as HTMLButtonElement;
      tile.type = 'button';
      const face = el('div', 'creature-face');
      face.appendChild(creatureRender(n.def, 84));
      tile.appendChild(face);
      tile.appendChild(el('b', '', n.def.name));
      tile.appendChild(el('span', '', `lv ${n.def.level}`));
      tile.onclick = () => {
        creature = n.def.id;
        paint();
      };
      grid.appendChild(tile);
    }
    body.appendChild(grid);
    body.appendChild(foot());
  };

  const foot = (): HTMLElement => {
    const bar = el('div', 'wiz-foot');
    const back = el('button', '', '◂ Back') as HTMLButtonElement;
    back.onclick = () => {
      step = 1;
      paint();
    };
    bar.appendChild(back);
    const done = el('button', 'primary', `Create '${name.trim() || slug}'`) as HTMLButtonElement;
    done.disabled = bodyKind === 'creature' && !creature;
    done.title = done.disabled ? 'Pick a body first' : 'Draft the actor and open it in the editor';
    done.onclick = create;
    bar.appendChild(done);
    return bar;
  };

  paint();
  modal.showModal();
  modal.oncancel = () => {
    body.innerHTML = '';
  };
}
