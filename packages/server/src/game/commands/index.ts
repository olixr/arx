import { DEV_COMMANDS } from './devCommands.js';
import { PLAYER_COMMANDS } from './playerCommands.js';
import type { ChatCommand } from './types.js';

export type { ChatCommand } from './types.js';

/**
 * THE UNSPOKEN WORD: the terminal entry. Every slash line nobody
 * claimed — a mistyped verb, a dev lever on a box with the bench
 * closed — ends here as a system line to the one who typed it, never
 * as speech broadcast to the room. Named by its verb alone: player
 * verbs claim their line whatever trails it, so a verb that lands
 * here is one nobody holds.
 */
export const UNKNOWN_COMMAND: ChatCommand = {
  name: '/',
  claims: (text) => text.trimStart().startsWith('/'),
  run(_srv, _eid, player, text) {
    const verb = text.trim().split(/\s+/)[0] ?? '/';
    player.session?.sendJson({
      t: 'chat',
      channel: 'system',
      text: `No such command as ${verb} — the word goes unspoken.`,
    });
  },
};

/** The dev bench as a set — the chat gate asks per line, not per scan. */
export const DEV_COMMAND_SET: ReadonlySet<ChatCommand> = new Set(DEV_COMMANDS);

/** The ledger, in claim order: player verbs first, then the dev bench, then the unspoken word. */
export const CHAT_COMMANDS: readonly ChatCommand[] = [...PLAYER_COMMANDS, ...DEV_COMMANDS, UNKNOWN_COMMAND];
