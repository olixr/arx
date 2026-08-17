import type { EntityId } from '@arx/shared';
import { GroundList } from './groundList.js';
import type { ClientGame } from '../game/clientGame.js';

/** How far the panel reaches — a shade past the 2.2 interact radius. */
const REACH = 2.4;
/** ONWARD's horizon: how far the panel looks for the next stop. */
const HORIZON = 8;

/**
 * The ground manager tray (THE GILDED HAND): everything lying within
 * reach as a best-first ledger you can actually choose from — the
 * answer to a battlefield of overlapping bags. Rendering, order, and
 * motion live in the shared GroundList (one component behind this
 * tray AND the inventory's ground pane); this shell owns the tray's
 * conversation:
 *
 * - THE ANCHOR LAW: opened here, closed by walking >3 tiles away —
 *   EXCEPT while ONWARD carries you: the errand keeps the tray open,
 *   and arrival at the next pile re-anchors it. The sweep is a
 *   rhythm, not a re-open.
 * - THE HERO LANDING: opening in pad mode lands the ring on Take all
 *   (or the lone Take) — one press before the hand ever moves.
 * - THE CHOSEN HAND CHIP: the walk-over toggle lives in the head,
 *   right where the itch is felt, beside its Settings twin.
 */
export class LootPanel {
  private readonly panel = document.getElementById('loot-panel')!;
  private readonly ground: GroundList;
  /** Where the panel was opened — walking away from here closes it. */
  private anchor: { x: number; y: number } | null = null;
  /** ONWARD in flight: the walk errand holds the tray open. */
  private traveling = false;
  private prefChip: HTMLButtonElement | null = null;

  // The close chip + header dressing come from dressPanel in main.
  constructor(
    private readonly game: ClientGame,
    private readonly hooks: {
      /** Land the pad ring on a navkey (main gates on pad mode). */
      requestFocus: (key: string) => void;
    },
  ) {
    this.ground = new GroundList(document.getElementById('loot-list')!, 'loot', {
      pickup: (eid) => this.game.pickup(eid),
      takeAll: () => this.game.takeAll(),
      onward: (eid) => this.travel(eid),
    });
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  open(): void {
    const pos = this.game.predictor.pos;
    this.anchor = { x: pos.x, y: pos.y };
    this.traveling = false;
    this.ground.reset();
    this.ensurePrefChip();
    this.panel.classList.remove('hidden');
    this.refresh();
    const key = this.ground.bestFocusKey();
    if (key) this.hooks.requestFocus(key);
  }

  close(): void {
    this.panel.classList.add('hidden');
    this.anchor = null;
    this.traveling = false;
  }

  /** ONWARD: walk to the next pile; the tray rides along. */
  private travel(eid: EntityId): void {
    if (!this.game.pickupWalk(eid)) return;
    this.traveling = true;
    this.anchor = null;
  }

  /** Called every frame with the player's position (anchor law). */
  update(px: number, py: number): void {
    if (!this.isOpen) return;
    if (this.traveling) {
      // Arrival re-anchors; a cancelled errand with nothing in reach
      // ends the conversation.
      if (this.game.nearbyLoot(REACH).length > 0) {
        this.traveling = false;
        this.anchor = { x: px, y: py };
      } else if (!this.game.hasPickupErrand) {
        this.close();
        return;
      }
    } else if (this.anchor) {
      const dx = this.anchor.x - px;
      const dy = this.anchor.y - py;
      if (dx * dx + dy * dy > 3 * 3) {
        this.close();
        return;
      }
    }
    this.refresh();
  }

  private refresh(): void {
    const near = this.game.nearbyLoot(REACH);
    const far = this.game.nearbyLoot(HORIZON).filter((l) => l.d > REACH);
    // Picked clean with nothing on the horizon: the conversation is
    // over. (While ONWARD walks, the errand holds the door.)
    if (near.length === 0 && far.length === 0 && !this.traveling) {
      this.close();
      return;
    }
    this.ground.update(near, far);
    this.paintPrefChip();
  }

  /**
   * THE CHOSEN HAND's chip — built once, riding the hint line's right
   * end so the head keeps its full title (dressPanel assembles both
   * before the first open; main dresses panels at boot).
   */
  private ensurePrefChip(): void {
    if (this.prefChip?.isConnected) return;
    const hint = this.panel.querySelector('.panel-hint') ?? this.panel.querySelector('.panel-head');
    if (!hint) return;
    const chip = document.createElement('button');
    chip.className = 'sort-chip loot-pref-chip';
    chip.dataset.nav = '';
    chip.dataset.navkey = 'loot:pref';
    chip.dataset.acta = 'Toggle';
    chip.dataset.tipname = 'Walk-over looting';
    chip.dataset.tipsub = 'Off = nothing sticks to your feet; you choose every take here.';
    chip.addEventListener('click', () => {
      this.game.setLootPref(!this.game.lootAuto);
      this.paintPrefChip();
    });
    hint.appendChild(chip);
    this.prefChip = chip;
    this.paintPrefChip();
  }

  private paintPrefChip(): void {
    if (!this.prefChip) return;
    const on = this.game.lootAuto;
    const label = on ? 'Walk-over: on' : 'Walk-over: off';
    if (this.prefChip.textContent !== label) this.prefChip.textContent = label;
    this.prefChip.classList.toggle('active', on);
  }
}
