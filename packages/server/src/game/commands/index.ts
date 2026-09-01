import { DEV_COMMANDS } from './devCommands.js';
import { PLAYER_COMMANDS } from './playerCommands.js';
import type { ChatCommand } from './types.js';

export type { ChatCommand } from './types.js';
/** The ledger, in claim order: player verbs first, then the dev bench. */
export const CHAT_COMMANDS: readonly ChatCommand[] = [...PLAYER_COMMANDS, ...DEV_COMMANDS];
