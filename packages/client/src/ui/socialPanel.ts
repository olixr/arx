import { EQUIP_SLOTS, EntityKind } from '@arx/shared';
import type { EntityId } from '@arx/shared';
import { instanceName } from '@arx/content';
import { itemIconUrl } from '../render/icons.js';
import { bigButton, iconTile, sectionHead } from './panel.js';
import { tabRail } from './kit/tabs.js';
import type { ClientGame } from '../game/clientGame.js';

/** The social snapshot as the server tells it. */
interface SocialSnap {
  friends: Array<{ name: string; online: boolean; zone?: string }>;
  incoming: string[];
  outgoing: string[];
}

/** How often the Nearby section re-reads the world while open. */
const NEARBY_MS = 750;
/** Event-driven snapshot refetch debounce. */
const REFETCH_MS = 250;

/**
 * The fellowship ledger: who stands near you, who walks with you, and
 * who is asking to. Five sections — party, search, nearby, friends,
 * requests — built in the LootPanel dialect (loot-row rows, sticky
 * order, signature dedupe) so a live list never reshuffles or rebuilds
 * under a cursor.
 *
 * Server truth: the panel never patches state from events; a friendevent
 * simply schedules a fresh snapshot request. The Nearby section is pure
 * client knowledge (the interest window already streams every visible
 * player), and Inspect reads a neighbor's worn gear straight off their
 * replicated appearance — item identities only, never rolls.
 */
export class SocialPanel {
  private readonly panel = document.getElementById('social-panel')!;
  private readonly partyList: HTMLElement;
  private readonly searchInput: HTMLInputElement;
  private readonly searchResults: HTMLElement;
  private readonly nearbyList: HTMLElement;
  private readonly friendsList: HTMLElement;
  private readonly requestsHead: HTMLElement;
  private readonly requestsList: HTMLElement;
  private readonly ledger: HTMLElement;
  private readonly inspectView: HTMLElement;

  private snap: SocialSnap = { friends: [], incoming: [], outgoing: [] };
  private results: Array<{ name: string; online: boolean }> = [];
  private nearbyTimer: number | null = null;
  private refetchTimer: number | null = null;
  /** Sticky Nearby row order: player eid → rank. */
  private order = new Map<EntityId, number>();
  private nextRank = 0;
  private nearbySig = '';
  /** Who the gear sheet is showing; null = the ledger view. */
  private inspecting: { eid: EntityId; name: string } | null = null;
  /** Two-click Remove confirmation: the name armed for it. */
  private armedRemove: string | null = null;
  /** Two-click Disband confirmation. */
  private armedDisband = false;

  /** The standing tab and its wrappers (Grand Refit Ph6). */
  private socialTab = 'party';
  private readonly tabWraps = new Map<string, HTMLElement>();
  private readonly rail: ReturnType<typeof tabRail>;

  constructor(private readonly game: ClientGame) {
    this.ledger = document.createElement('div');
    this.ledger.className = 'social-body';

    // THE FELLOWSHIP'S TABS: five sections, one standing at a time —
    // LT/RT step them; Requests wears a pip when someone is asking.
    this.rail = tabRail(
      [
        { id: 'party', label: 'Party' },
        { id: 'nearby', label: 'Nearby' },
        { id: 'friends', label: 'Friends' },
        { id: 'requests', label: 'Requests' },
        { id: 'find', label: 'Find' },
      ],
      (id) => {
        this.socialTab = id;
        for (const [tab, wrap] of this.tabWraps) wrap.classList.toggle('hidden', tab !== id);
      },
      'socialtab',
    );
    this.ledger.appendChild(this.rail.root);
    const wrap = (id: string, ...els: HTMLElement[]): void => {
      const box = document.createElement('div');
      box.className = 'social-sec' + (id === this.socialTab ? '' : ' hidden');
      // Each tab's list is its own region — the rail above it keeps the
      // ring only when the list has nothing further that way.
      box.dataset.region = '';
      box.append(...els);
      this.tabWraps.set(id, box);
      this.ledger.appendChild(box);
    };

    // PARTY — the fellowship you actively walk with.
    this.partyList = document.createElement('div');
    this.partyList.className = 'row-list';
    wrap('party', this.partyList);

    // SEARCH — the only text the HUD asks you to type outside chat.
    const searchRow = document.createElement('div');
    searchRow.className = 'social-search';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.maxLength = 16;
    this.searchInput.placeholder = 'Name…';
    // A pad can land here: Ⓐ takes the pen (a keyboard types), Ⓑ puts
    // it down.
    this.searchInput.dataset.nav = '';
    this.searchInput.dataset.navkey = 'social:searchline';
    this.searchInput.dataset.acta = 'Write';
    this.searchInput.addEventListener('keydown', (e) => {
      // The input owns its keys: Enter asks, Escape lets go — and no
      // keystroke leaks through to movement or panel hotkeys.
      e.stopPropagation();
      if (e.key === 'Enter') this.doSearch();
      if (e.key === 'Escape') this.searchInput.blur();
    });
    searchRow.appendChild(this.searchInput);
    searchRow.appendChild(bigButton('Search', 'social:search', () => this.doSearch()));
    this.searchResults = document.createElement('div');
    this.searchResults.className = 'row-list';

    this.nearbyList = document.createElement('div');
    this.nearbyList.className = 'row-list';
    wrap('nearby', this.nearbyList);

    this.friendsList = document.createElement('div');
    this.friendsList.className = 'row-list';
    wrap('friends', this.friendsList);

    this.requestsHead = sectionHead('Requests');
    this.requestsHead.classList.add('hidden');
    this.requestsList = document.createElement('div');
    this.requestsList.className = 'row-list';
    wrap('requests', this.requestsList);
    wrap('find', searchRow, this.searchResults);

    this.inspectView = document.createElement('div');
    this.inspectView.className = 'social-body hidden';

    this.panel.append(this.ledger, this.inspectView);
  }

  get isOpen(): boolean {
    return !this.panel.classList.contains('hidden');
  }

  /** True while the search box holds the keyboard (gates WASD/hotkeys). */
  get isTyping(): boolean {
    return document.activeElement === this.searchInput;
  }

  open(): void {
    this.panel.classList.remove('hidden');
    this.showLedger();
    this.game.requestSocial();
    this.game.requestParty();
    this.renderParty();
    this.renderNearby();
    this.renderFriends();
    this.renderRequests();
    if (this.nearbyTimer === null) {
      this.nearbyTimer = window.setInterval(() => this.tick(), NEARBY_MS);
    }
  }

  close(): void {
    this.panel.classList.add('hidden');
    if (this.nearbyTimer !== null) {
      window.clearInterval(this.nearbyTimer);
      this.nearbyTimer = null;
    }
    this.searchInput.blur();
    this.searchInput.value = '';
    this.results = [];
    this.searchResults.innerHTML = '';
    this.armedRemove = null;
    this.armedDisband = false;
    this.showLedger();
  }

  /** The server answered a snapshot request. */
  onSnapshot(snap: SocialSnap): void {
    this.snap = snap;
    if (!this.isOpen) return;
    this.armedRemove = null;
    this.renderFriends();
    this.renderRequests();
    // Relationship labels ride the nearby/search rows too.
    this.nearbySig = '';
    this.renderNearby();
    this.renderSearchResults();
  }

  onSearchResults(results: Array<{ name: string; online: boolean }>): void {
    this.results = results;
    if (this.isOpen) this.renderSearchResults();
  }

  /** A friendevent arrived — refetch (debounced) while the panel shows. */
  notifyEvent(): void {
    if (!this.isOpen || this.refetchTimer !== null) return;
    this.refetchTimer = window.setTimeout(() => {
      this.refetchTimer = null;
      if (this.isOpen) this.game.requestSocial();
    }, REFETCH_MS);
  }

  /** The party snapshot landed (ClientGame already holds it). */
  onPartySnapshot(): void {
    if (!this.isOpen) return;
    this.armedDisband = false;
    this.renderParty();
    // Invite-button states ride the nearby/friend rows too.
    this.nearbySig = '';
    this.renderNearby();
    this.renderFriends();
  }

  /** A partyevent arrived — refetch (debounced) while the panel shows. */
  notifyPartyEvent(): void {
    if (!this.isOpen || this.partyRefetchTimer !== null) return;
    this.partyRefetchTimer = window.setTimeout(() => {
      this.partyRefetchTimer = null;
      if (this.isOpen) this.game.requestParty();
    }, REFETCH_MS);
  }

  private partyRefetchTimer: number | null = null;

  // ------------------------------------------------------------ views

  private showLedger(): void {
    this.inspecting = null;
    this.inspectView.classList.add('hidden');
    this.ledger.classList.remove('hidden');
  }

  private tick(): void {
    if (this.inspecting) this.renderInspect();
    else this.renderNearby();
  }

  /** friend / outgoing / incoming / none — case-insensitive by name. */
  private relation(name: string): 'friend' | 'outgoing' | 'incoming' | 'none' {
    const low = name.toLowerCase();
    if (this.snap.friends.some((f) => f.name.toLowerCase() === low)) return 'friend';
    if (this.snap.outgoing.some((n) => n.toLowerCase() === low)) return 'outgoing';
    if (this.snap.incoming.some((n) => n.toLowerCase() === low)) return 'incoming';
    return 'none';
  }

  /**
   * Send a social action, then ask for a fresh snapshot. The socket
   * orders both, so the answer always reflects the action — this is
   * how the ledger stays live for YOUR moves (friendevents only go to
   * the other party).
   */
  private act(send: () => void): void {
    send();
    this.game.requestSocial();
  }

  /** Same law for party actions: action then snapshot on one socket. */
  private partyAct(send: () => void): void {
    send();
    this.game.requestParty();
  }

  /** member / invited / none — case-insensitive by name. */
  private partyRelation(name: string): 'member' | 'invited' | 'none' {
    const snap = this.game.party;
    if (!snap) return 'none';
    const low = name.toLowerCase();
    if (snap.members.some((m) => m.name.toLowerCase() === low)) return 'member';
    if (snap.outgoing.some((n) => n.toLowerCase() === low)) return 'invited';
    return 'none';
  }

  /** The Invite/Invited button — or null when they already walk with you. */
  private inviteButton(name: string, navkey: string): HTMLButtonElement | null {
    if (name.toLowerCase() === this.game.ownName.toLowerCase()) return null;
    const rel = this.partyRelation(name);
    if (rel === 'member') return null;
    const btn = bigButton(
      rel === 'invited' ? 'Invited' : 'Invite',
      navkey,
      () => this.partyAct(() => this.game.partyInvite(name)),
      { minor: rel === 'invited' },
    );
    if (rel === 'invited') btn.disabled = true;
    return btn;
  }

  private renderParty(): void {
    const snap = this.game.party ?? { members: [], invites: [], outgoing: [] };
    this.partyList.innerHTML = '';

    for (const name of snap.invites) {
      const { row, actions } = this.row(name, 'invites you to their party');
      actions.appendChild(
        bigButton('Join', `social:pacc:${name}`, () => this.partyAct(() => this.game.partyAccept(name))),
      );
      actions.appendChild(
        bigButton('Decline', `social:pdec:${name}`, () => this.partyAct(() => this.game.partyDecline(name)), {
          minor: true,
        }),
      );
      this.partyList.appendChild(row);
    }

    if (snap.members.length === 0) {
      if (snap.invites.length === 0) {
        this.partyList.appendChild(this.empty('You walk alone — invite a friend or someone nearby.'));
      }
      return;
    }

    const selfLow = this.game.ownName.toLowerCase();
    const meLeader = snap.members.some((m) => m.leader && m.name.toLowerCase() === selfLow);
    for (const m of snap.members) {
      const isSelf = m.name.toLowerCase() === selfLow;
      const place = m.online ? (m.zone ?? 'Online') : 'Offline';
      const sub = m.leader ? `Leader · ${place}` : place;
      const { row, actions } = this.row(m.name, sub, !m.online);
      if (m.online) row.classList.add('social-online');
      if (isSelf) {
        if (meLeader) {
          actions.appendChild(
            bigButton(this.armedDisband ? 'Sure?' : 'Disband', 'social:disband', () => {
              if (this.armedDisband) {
                this.armedDisband = false;
                this.partyAct(() => this.game.partyDisband());
              } else {
                // First press arms it; the second commits.
                this.armedDisband = true;
                this.renderParty();
              }
            }, { minor: !this.armedDisband }),
          );
        }
        actions.appendChild(
          bigButton('Leave', 'social:pleave', () => this.partyAct(() => this.game.partyLeave()), {
            minor: true,
          }),
        );
      } else if (meLeader) {
        actions.appendChild(
          bigButton('Kick', `social:kick:${m.name}`, () => this.partyAct(() => this.game.partyKick(m.name)), {
            minor: true,
          }),
        );
      }
      this.partyList.appendChild(row);
    }

    for (const name of snap.outgoing) {
      const { row } = this.row(name, 'invited — awaiting an answer', true);
      this.partyList.appendChild(row);
    }
  }

  /** The Ask/Asked/Accept/Friend button, one vocabulary everywhere. */
  private askButton(name: string, navkey: string): HTMLButtonElement {
    const rel = this.relation(name);
    if (rel === 'incoming') {
      return bigButton('Accept', navkey, () => this.act(() => this.game.friendAccept(name)));
    }
    const label = rel === 'friend' ? 'Friend' : rel === 'outgoing' ? 'Asked' : 'Ask';
    const btn = bigButton(label, navkey, () => this.act(() => this.game.friendRequest(name)), {
      minor: rel !== 'none',
    });
    if (rel !== 'none') btn.disabled = true;
    return btn;
  }

  private row(name: string, sub: string, dim = false): { row: HTMLElement; actions: HTMLElement } {
    const row = document.createElement('div');
    row.className = dim ? 'loot-row social-row social-dim' : 'loot-row social-row';
    const mid = document.createElement('div');
    mid.className = 'loot-mid';
    const nameEl = document.createElement('div');
    nameEl.className = 'loot-name';
    nameEl.textContent = name;
    const subEl = document.createElement('span');
    subEl.className = 'loot-sub';
    subEl.textContent = sub;
    mid.append(nameEl, subEl);
    row.appendChild(mid);
    const actions = document.createElement('div');
    actions.className = 'loot-actions social-actions';
    row.appendChild(actions);
    return { row, actions };
  }

  private empty(text: string): HTMLElement {
    const p = document.createElement('div');
    p.className = 'social-empty';
    p.textContent = text;
    return p;
  }

  private doSearch(): void {
    const q = this.searchInput.value.trim();
    if (q.length < 2) return;
    this.game.friendSearch(q);
  }

  private renderSearchResults(): void {
    this.searchResults.innerHTML = '';
    for (const r of this.results) {
      const { row, actions } = this.row(r.name, r.online ? 'Online' : 'Offline', !r.online);
      actions.appendChild(this.askButton(r.name, `social:find:${r.name}`));
      this.searchResults.appendChild(row);
    }
  }

  private renderNearby(): void {
    const near = this.game.nearbyPlayers();
    for (const p of near) {
      if (!this.order.has(p.eid)) this.order.set(p.eid, this.nextRank++);
    }
    near.sort((a, b) => this.order.get(a.eid)! - this.order.get(b.eid)!);
    const sig = near
      .map((p) => `${p.eid}:${Math.round(p.dist)}:${this.relation(p.name)}:${this.partyRelation(p.name)}`)
      .join(',');
    if (sig === this.nearbySig) return;
    this.nearbySig = sig;

    this.nearbyList.innerHTML = '';
    if (near.length === 0) {
      this.nearbyList.appendChild(this.empty('No one else stands nearby.'));
      return;
    }
    for (const p of near) {
      const paces = Math.max(1, Math.round(p.dist));
      const { row, actions } = this.row(p.name, `${paces} pace${paces === 1 ? '' : 's'} away`);
      actions.appendChild(
        bigButton('Inspect', `social:inspect:${p.eid}`, () => this.openInspect(p.eid, p.name), {
          minor: true,
        }),
      );
      const invite = this.inviteButton(p.name, `social:pnear:${p.eid}`);
      if (invite) actions.appendChild(invite);
      actions.appendChild(this.askButton(p.name, `social:near:${p.eid}`));
      this.nearbyList.appendChild(row);
    }
  }

  private renderFriends(): void {
    this.friendsList.innerHTML = '';
    if (this.snap.friends.length === 0) {
      this.friendsList.appendChild(this.empty('Your ledger is empty — ask someone nearby.'));
      return;
    }
    const sorted = [...this.snap.friends].sort(
      (a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
    );
    for (const f of sorted) {
      const sub = f.online ? (f.zone ?? 'Online') : 'Offline';
      const { row, actions } = this.row(f.name, sub, !f.online);
      if (f.online) row.classList.add('social-online');
      if (f.online) {
        const invite = this.inviteButton(f.name, `social:pinv:${f.name}`);
        if (invite) actions.appendChild(invite);
      }
      const armed = this.armedRemove === f.name;
      actions.appendChild(
        bigButton(armed ? 'Sure?' : 'Remove', `social:remove:${f.name}`, () => {
          if (this.armedRemove === f.name) {
            this.armedRemove = null;
            this.act(() => this.game.friendRemove(f.name));
          } else {
            // First press arms it; the second within the ledger commits.
            this.armedRemove = f.name;
            this.renderFriends();
          }
        }, { minor: !armed }),
      );
      this.friendsList.appendChild(row);
    }
  }

  private renderRequests(): void {
    this.requestsList.innerHTML = '';
    const none = this.snap.incoming.length === 0 && this.snap.outgoing.length === 0;
    // Someone asking lights the tab's pip — the ask is never buried.
    this.rail.setPip('requests', this.snap.incoming.length > 0);
    if (none) {
      const empty = document.createElement('div');
      empty.className = 'quest-empty';
      empty.textContent = 'No asks standing. Friends you seek wait under Find.';
      this.requestsList.appendChild(empty);
      return;
    }
    for (const name of this.snap.incoming) {
      const { row, actions } = this.row(name, 'wants to be your friend');
      actions.appendChild(
        bigButton('Accept', `social:acc:${name}`, () => this.act(() => this.game.friendAccept(name))),
      );
      actions.appendChild(
        bigButton('Decline', `social:dec:${name}`, () => this.act(() => this.game.friendDecline(name)), {
          minor: true,
        }),
      );
      this.requestsList.appendChild(row);
    }
    for (const name of this.snap.outgoing) {
      const { row, actions } = this.row(name, 'awaiting an answer', true);
      actions.appendChild(
        bigButton('Cancel', `social:cancel:${name}`, () => this.act(() => this.game.friendDecline(name)), {
          minor: true,
        }),
      );
      this.requestsList.appendChild(row);
    }
  }

  // ---------------------------------------------------------- inspect

  private openInspect(eid: EntityId, name: string): void {
    this.inspecting = { eid, name };
    this.ledger.classList.add('hidden');
    this.inspectView.classList.remove('hidden');
    this.renderInspect();
  }

  /**
   * A neighbor's worn kit, read off their replicated appearance — the
   * same data that already dresses their rig on screen. Identities
   * only: rolls never travel to watchers, so none are shown.
   */
  private renderInspect(): void {
    const who = this.inspecting;
    if (!who) return;
    const remote = this.game.entities.get(who.eid);
    // They walked beyond the interest window — the sheet goes with them.
    if (!remote || remote.meta.kind !== EntityKind.Player) {
      this.showLedger();
      this.renderNearby();
      return;
    }
    this.inspectView.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'social-inspect-head';
    const title = document.createElement('div');
    title.className = 'loot-name';
    title.textContent = who.name;
    head.appendChild(title);
    head.appendChild(
      bigButton('Back', 'social:back', () => {
        this.showLedger();
        this.renderNearby();
      }, { minor: true }),
    );
    this.inspectView.appendChild(head);

    const equip = remote.meta.appearance?.equip ?? {};
    const ench = remote.meta.appearance?.ench ?? {};
    const worn = EQUIP_SLOTS.filter((slot) => equip[slot]);
    if (worn.length === 0) {
      this.inspectView.appendChild(this.empty('They carry nothing you can see.'));
      return;
    }
    const list = document.createElement('div');
    list.className = 'row-list';
    for (const slot of worn) {
      const id = equip[slot]!;
      const { row, actions } = this.row(
        instanceName(id, undefined),
        ench[slot] ? `${slot} · enchanted` : slot,
      );
      row.insertBefore(iconTile(itemIconUrl(id, 40), 'sm'), row.firstChild);
      actions.remove();
      list.appendChild(row);
    }
    this.inspectView.appendChild(list);
  }
}
