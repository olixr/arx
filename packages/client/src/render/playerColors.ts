import { hashString } from '@arx/shared';

/** Identity tints for undressed player rigs — also the party marker
 * inks (map tokens + wayfinder pills), so a fellow reads as the same
 * color on the chart as in the world. */
export const PLAYER_COLORS = ['#c4553d', '#3d78c4', '#3da865', '#c4a03d', '#8a55c4', '#3da8a0', '#c47a3d'];

/** The one law for name → tint, so chart and world can never drift. */
export function playerColor(name: string): string {
  return PLAYER_COLORS[hashString(name) % PLAYER_COLORS.length]!;
}
