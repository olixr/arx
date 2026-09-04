/**
 * THE SCARRED LAND — E. the marks: five peoples finally get a glyph.
 * CharterPost (526, the towns), LampCairn (527, the waykeepers),
 * LegionStandard (528), BoneTree (529, the wolfkin), TallyStone (530,
 * the kobolds), WardThread (531, the evencourt), RedRagStake (532, the
 * reavers), PitLamp / PitLampDark (533/534, the Returners). Light is
 * content: the cairn and the lit pit lamp have lights.ts rows; the
 * dark lamp and the thread have none by law. Every rag, thread and
 * hanging will sample rend.breezeAt under 4Hz in K2 (ONE BREEZE);
 * K0 stubs read no clock. Faction cloth is its own ink — never a dye
 * band (the Legion's crimson, the reavers' rag red).
 */
import { Tile } from '@arx/shared';
import { DGN_BONE, DGN_IRON, CHARTER_BRASS, LEGION_CRIMSON, SCAR_RAG_RED } from '../palette.js';
import { stubBlock } from './stub.js';
import type { PropEntries } from '../types.js';

const POST_OAK = '#5a4226';
const CAIRN_STONE = '#7c7889';
const TALLY_STONE = '#6b6678';

export const MARKS_PROPS: PropEntries = [
  [[Tile.CharterPost], stubBlock({ hw: 0.1, up: 1.1, ink: POST_OAK, lit: CHARTER_BRASS, depth: 0.2, sortOff: 0.66 })],
  [[Tile.LampCairn], stubBlock({ hw: 0.28, up: 0.7, ink: CAIRN_STONE, lit: '#e8c06a', depth: 0.3 })],
  [[Tile.LegionStandard], stubBlock({ hw: 0.1, up: 1.5, ink: DGN_IRON, lit: LEGION_CRIMSON, depth: 0.2, sortOff: 0.66 })],
  [[Tile.BoneTree], stubBlock({ hw: 0.2, up: 1.2, ink: '#4a4046', lit: DGN_BONE, depth: 0.26, sortOff: 0.68 })],
  [[Tile.TallyStone], stubBlock({ hw: 0.26, up: 0.5, ink: TALLY_STONE, depth: 0.3 })],
  [[Tile.WardThread], stubBlock({ hw: 0.48, up: 0.05, ink: POST_OAK, lit: '#d8cba8', depth: 0.12, flat: true, sortOff: 0.5 })],
  [[Tile.RedRagStake], stubBlock({ hw: 0.07, up: 0.9, ink: POST_OAK, lit: SCAR_RAG_RED, depth: 0.16, sortOff: 0.64 })],
  [[Tile.PitLamp], stubBlock({ hw: 0.12, up: 1.0, ink: DGN_IRON, lit: '#e8933c', depth: 0.22, sortOff: 0.66 })],
  [[Tile.PitLampDark], stubBlock({ hw: 0.12, up: 1.0, ink: DGN_IRON, lit: '#5d5670', depth: 0.22, sortOff: 0.66 })],
];
