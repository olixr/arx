/**
 * THE DISPLAY BENCH — the Display settings rows: the accelerated-stage
 * toggle, water and footprint switches, interface motion, walk-over
 * looting, and the interface-size chips. Moved verbatim from main.ts
 * (foundations F5.1); returns the walk-over box the frame loop keeps
 * honest to the server's pref.
 *
 * `lanes` is the canvas2d lane switch-board (the 2D Renderer). A door
 * with no such lanes passes null and the stage / resolution /
 * water rows are NOT built — a bench must never show a switch that
 * governs nothing here yet writes the keys another door reads.
 */
import type { ViewDisplayFlags } from './viewAdapter.js';
import { FOOTPRINT_TUNE } from '../render/footprints.js';
import { UI_SIZES, setUiSize, uiSize } from './kit/scale.js';
import type { StageResTier } from '../render/stage/renderScale.js';

export function initDisplaySettings(lanes: ViewDisplayFlags | null, setLootPref: (on: boolean) => void): HTMLInputElement | null {
  let walkoverBox: HTMLInputElement | null = null;
    const rows = document.getElementById('display-rows')!;
    const toggle = (label: string, initial: boolean, apply: (on: boolean) => void): void => {
      const row = document.createElement('div');
      row.className = 'audio-row';
      const lab = document.createElement('label');
      lab.textContent = label;
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = initial;
      // The pad walks the display toggles like everything else: Ⓐ flips.
      box.dataset.nav = '';
      box.dataset.navkey = `display:${label}`;
      box.dataset.acta = 'Toggle';
      box.dataset.tipname = label;
      box.addEventListener('change', () => apply(box.checked));
      row.appendChild(lab);
      row.appendChild(box);
      rows.appendChild(row);
    };
    if (lanes) laneRows(lanes, rows, toggle);

    toggle('Footprints', FOOTPRINT_TUNE.enabled, (on) => {
      FOOTPRINT_TUNE.enabled = on;
      localStorage.setItem('arx.footprints', on ? 'on' : 'off');
    });

    toggle('Interface motion', localStorage.getItem('arx.uimotion') !== 'off', (on) => {
      localStorage.setItem('arx.uimotion', on ? 'on' : 'off');
      document.body.classList.toggle('no-ui-motion', !on);
    });

    // THE CHOSEN HAND: walk-over looting is a preference, not a fate.
    // Server-persisted per character (the welcome carries the truth —
    // the frame loop keeps this box honest to it); its twin chip lives
    // in the loot tray's head, right where the itch is felt.
    toggle('Walk-over looting', true, (on) => setLootPref(on));
    walkoverBox = rows.lastElementChild!.querySelector('input');
    if (walkoverBox) {
      walkoverBox.dataset.tipsub =
        'Off = running over loot picks up nothing; you choose every take from the ground list.';
    }

    sizeRowInto(rows);
  return walkoverBox;
}

/** The canvas2d lane rows: stage, render resolution, water. */
function laneRows(
  renderer: ViewDisplayFlags,
  rows: HTMLElement,
  toggle: (label: string, initial: boolean, apply: (on: boolean) => void) => void,
): void {
    // THE DISPLAY TOGGLE: the whole painted-stage epic behind one
    // honest switch. Applies live — the parity drills toggle it
    // mid-frame hundreds of times a session.
    toggle('Accelerated display (beta)', renderer.stageWorld, (on) => {
      renderer.stageGround = on;
      renderer.stageWorld = on;
      localStorage.setItem('arx.stage', on ? 'on' : 'off');
      // THE BACKEND SWAPS UNDER A LIVE WORLD: the bakes on hand were
      // minted for the backend we just left (canvas gutters vs GL atlas
      // residency). Drop the render/bake caches — for BOTH directions —
      // so the new backend re-bakes cleanly from scratch; otherwise props
      // stay cropped/broken until a teleport or reload clears them.
      renderer.onBackendSwitch();
    });
    {
      const box = rows.lastElementChild!.querySelector('input');
      if (box) {
        box.dataset.tipsub =
          'Draws the world through your graphics card. This can lift the frame rate on machines where the standard display struggles; if it ever fails, the game returns to the standard display on its own.';
      }
    }
    // THE RENDER SCALE (A2): the accelerated display's resolution tier.
    // Auto keeps native sharpness everywhere but a very large HiDPI
    // window, where it trades a little crispness for frame rate and
    // graphics memory. Shown only when the accelerated display can be
    // used — it governs nothing otherwise.
    {
      const resRow = document.createElement('div');
      resRow.className = 'audio-row';
      const resLab = document.createElement('label');
      resLab.textContent = 'Render resolution';
      const resChips = document.createElement('span');
      resChips.className = 'size-chips';
      const tiers: Array<{ id: StageResTier; label: string; sub: string }> = [
        { id: 'auto', label: 'Auto', sub: 'Full sharpness, easing back only on a very large high-resolution window to keep the frame rate up.' },
        { id: 'full', label: 'Full', sub: 'Always the display’s native sharpness. Best-looking; heaviest on the graphics card.' },
        { id: 'balanced', label: 'Balanced', sub: 'Favors frame rate on every high-resolution window. Softer, lighter on the graphics card.' },
      ];
      const paintRes = (): void => {
        resChips.querySelectorAll('button').forEach((b) => {
          b.classList.toggle('active', b.dataset.res === renderer.stageResTier);
        });
      };
      for (const t of tiers) {
        const chip = document.createElement('button');
        chip.className = 'sort-chip';
        chip.textContent = t.label;
        chip.dataset.res = t.id;
        chip.dataset.nav = '';
        chip.dataset.navkey = `display:stageres:${t.id}`;
        chip.dataset.acta = 'Choose';
        chip.dataset.tipname = `${t.label} render resolution`;
        chip.dataset.tipsub = t.sub;
        chip.addEventListener('click', () => {
          renderer.stageResTier = t.id;
          localStorage.setItem('arx.stageres', t.id);
          paintRes();
        });
        resChips.appendChild(chip);
      }
      resRow.append(resLab, resChips);
      rows.appendChild(resRow);
      paintRes();
    }
    toggle('Water reflections', renderer.reflectionsOn, (on) => {
      renderer.reflectionsOn = on;
      localStorage.setItem('arx.reflections', on ? 'on' : 'off');
    });
    toggle('Water motion', renderer.waterFxFull, (on) => {
      renderer.waterFxFull = on;
      localStorage.setItem('arx.waterfx', on ? 'full' : 'basic');
    });
}

/** The interface-size chips. */
function sizeRowInto(rows: HTMLElement): void {
    // The player's hand on the one ruler: Snug / Standard / Grand
    // multiply the automatic fit. Applies live, no restart.
    const sizeRow = document.createElement('div');
    sizeRow.className = 'audio-row';
    const sizeLab = document.createElement('label');
    sizeLab.textContent = 'Interface size';
    const chips = document.createElement('span');
    chips.className = 'size-chips';
    const paint = (): void => {
      chips.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b.dataset.size === uiSize());
      });
    };
    for (const s of UI_SIZES) {
      const chip = document.createElement('button');
      chip.className = 'sort-chip';
      chip.textContent = s.label;
      chip.dataset.size = s.id;
      chip.dataset.nav = '';
      chip.dataset.navkey = `display:uisize:${s.id}`;
      chip.dataset.acta = 'Choose';
      chip.dataset.tipname = `${s.label} interface`;
      chip.dataset.tipsub =
        s.id === 'grand'
          ? 'Larger menus and HUD. Suits a far couch.'
          : s.id === 'snug'
            ? 'Smaller menus and HUD. More world in view.'
            : 'The fitted size for this display.';
      chip.addEventListener('click', () => {
        setUiSize(s.id);
        paint();
      });
      chips.appendChild(chip);
    }
    sizeRow.append(sizeLab, chips);
    rows.appendChild(sizeRow);
    paint();
}
