import type { ClientGame } from '../game/clientGame.js';
/** The social snapshot as the server tells it. */
interface SocialSnap {
    friends: Array<{
        name: string;
        online: boolean;
        zone?: string;
    }>;
    incoming: string[];
    outgoing: string[];
}
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
export declare class SocialPanel {
    private readonly game;
    private readonly panel;
    private readonly partyList;
    private readonly searchInput;
    private readonly searchResults;
    private readonly nearbyList;
    private readonly friendsList;
    private readonly requestsHead;
    private readonly requestsList;
    private readonly ledger;
    private readonly inspectView;
    private snap;
    private results;
    private nearbyTimer;
    private refetchTimer;
    /** Sticky Nearby row order: player eid → rank. */
    private order;
    private nextRank;
    private nearbySig;
    /** Who the gear sheet is showing; null = the ledger view. */
    private inspecting;
    /** Two-click Remove confirmation: the name armed for it. */
    private armedRemove;
    /** Two-click Disband confirmation. */
    private armedDisband;
    constructor(game: ClientGame);
    get isOpen(): boolean;
    /** True while the search box holds the keyboard (gates WASD/hotkeys). */
    get isTyping(): boolean;
    open(): void;
    close(): void;
    /** The server answered a snapshot request. */
    onSnapshot(snap: SocialSnap): void;
    onSearchResults(results: Array<{
        name: string;
        online: boolean;
    }>): void;
    /** A friendevent arrived — refetch (debounced) while the panel shows. */
    notifyEvent(): void;
    /** The party snapshot landed (ClientGame already holds it). */
    onPartySnapshot(): void;
    /** A partyevent arrived — refetch (debounced) while the panel shows. */
    notifyPartyEvent(): void;
    private partyRefetchTimer;
    private showLedger;
    private tick;
    /** friend / outgoing / incoming / none — case-insensitive by name. */
    private relation;
    /**
     * Send a social action, then ask for a fresh snapshot. The socket
     * orders both, so the answer always reflects the action — this is
     * how the ledger stays live for YOUR moves (friendevents only go to
     * the other party).
     */
    private act;
    /** Same law for party actions: action then snapshot on one socket. */
    private partyAct;
    /** member / invited / none — case-insensitive by name. */
    private partyRelation;
    /** The Invite/Invited button — or null when they already walk with you. */
    private inviteButton;
    private renderParty;
    /** The Ask/Asked/Accept/Friend button, one vocabulary everywhere. */
    private askButton;
    private row;
    private empty;
    private doSearch;
    private renderSearchResults;
    private renderNearby;
    private renderFriends;
    private renderRequests;
    private openInspect;
    /**
     * A neighbor's worn kit, read off their replicated appearance — the
     * same data that already dresses their rig on screen. Identities
     * only: rolls never travel to watchers, so none are shown.
     */
    private renderInspect;
}
export {};
//# sourceMappingURL=socialPanel.d.ts.map