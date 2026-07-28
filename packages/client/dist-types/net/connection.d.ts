import { type C2SMessage, type ChunkData, type S2CMessage, type Snapshot, type TilePatch } from '@arx/shared';
export interface ConnectionHandlers {
    onMessage(msg: S2CMessage): void;
    onSnapshot(snap: Snapshot): void;
    onChunk(chunk: ChunkData): void;
    onTilePatch(patch: TilePatch): void;
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
    send(msg: C2SMessage): void;
    close(): void;
}
//# sourceMappingURL=connection.d.ts.map