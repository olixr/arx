import { type C2SMessage, type ChunkData, type DetailPatch, type S2CMessage, type Snapshot, type TilePatch } from '@arx/shared';
export interface ConnectionHandlers {
    onMessage(msg: S2CMessage): void;
    onSnapshot(snap: Snapshot): void;
    onChunk(chunk: ChunkData): void;
    onTilePatch(patch: TilePatch): void;
    onDetailPatch(patch: DetailPatch): void;
    onClose(): void;
    onOpen(): void;
}
/** WebSocket wrapper: JSON control messages + binary snapshots. */
export declare class Connection {
    private readonly handlers;
    private ws;
    constructor(handlers: ConnectionHandlers);
    connect(): void;
    get isOpen(): boolean;
    /**
     * THE LIVE WIRE's teardown: kill the socket NOW and report it closed,
     * without waiting for the close handshake. A dead route rarely says
     * goodbye — close() on a blackholed TCP can leave onclose unfired
     * for minutes while the browser retransmits into the void, and the
     * whole point of the watchdog is not to wait for that. Handlers
     * detach first, so if the zombie socket's real close event ever does
     * arrive it finds nobody listening and cannot double-fire the
     * reconnect path.
     */
    abort(): void;
    send(msg: C2SMessage): void;
    close(): void;
}
//# sourceMappingURL=connection.d.ts.map