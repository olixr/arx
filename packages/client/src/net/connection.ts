import {
  BinaryMsgType,
  ByteReader,
  decodeChunk,
  decodeDetailPatch,
  decodeSnapshot,
  decodeTilePatch,
  type C2SMessage,
  type ChunkData,
  type DetailPatch,
  type S2CMessage,
  type Snapshot,
  type TilePatch,
} from '@arx/shared';

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
export class Connection {
  private ws: WebSocket | null = null;

  constructor(private readonly handlers: ConnectionHandlers) {}

  connect(): void {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => this.handlers.onOpen();
    ws.onclose = () => this.handlers.onClose();
    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        let msg: S2CMessage;
        try {
          msg = JSON.parse(ev.data) as S2CMessage;
        } catch {
          return;
        }
        this.handlers.onMessage(msg);
      } else {
        const r = new ByteReader(ev.data as ArrayBuffer);
        const type = r.u8();
        if (type === BinaryMsgType.Snapshot) {
          this.handlers.onSnapshot(decodeSnapshot(r));
        } else if (type === BinaryMsgType.Chunk) {
          this.handlers.onChunk(decodeChunk(r));
        } else if (type === BinaryMsgType.TilePatch) {
          this.handlers.onTilePatch(decodeTilePatch(r));
        } else if (type === BinaryMsgType.DetailPatch) {
          this.handlers.onDetailPatch(decodeDetailPatch(r));
        }
      }
    };
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

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
  abort(): void {
    const ws = this.ws;
    if (!ws) return;
    this.ws = null;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    try {
      ws.close();
    } catch {
      /* already failed — the goal was only to stop the retries */
    }
    this.handlers.onClose();
  }

  send(msg: C2SMessage): void {
    if (this.isOpen) this.ws!.send(JSON.stringify(msg));
  }

  close(): void {
    this.ws?.close();
  }
}
