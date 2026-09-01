/**
 * THE COMMAND LEDGER (foundations F4) — one slash command, one entry.
 * chat() walks the ledger in order and the first claim wins, exactly as
 * the old if-chain read; `dev` entries answer only when the server runs
 * with dev commands on. A command that claims a line owns it entirely —
 * every run() path is terminal.
 */
import type { EntityId } from '@arx/shared';
import type { GameServer, PlayerComp } from '../gameServer.js';

export interface ChatCommand {
  /** The verb, for ledgers and docs ('/tp'). */
  readonly name: string;
  claims(text: string): boolean;
  run(srv: GameServer, eid: EntityId, player: PlayerComp, text: string): void;
}
