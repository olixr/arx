/**
 * THE KEYBOARD — one window keydown door for the whole studio. Tool
 * keys come from the command registry (single source); the bespoke
 * gestures (Esc cascade, Space pan, road Enter, brackets, digits) are
 * the hands' grammar and live here. ⌘K opens the command lens from
 * anywhere, both modes.
 */

import type { WorldMode } from '../editor/world/worldMode.js';
import { toast } from '../studio2/kit.js';
import { TOOL_BY_CODE, type StudioMode } from './commands.js';
import type { CommandPalette } from './cmdk.js';
import type { GhostWalk } from './ghostWalk.js';
import type { EditorOps } from './ops.js';

export interface KeysDeps {
  ops: EditorOps;
  world: WorldMode;
  cmdk: CommandPalette;
  ghost: GhostWalk;
  getMode: () => StudioMode;
  setMode: (m: StudioMode) => void;
  save: () => void;
  open: () => void;
  zoomFit: () => void;
  focusPaletteSearch: () => void;
}

export interface KeysHandle {
  isSpaceHeld: () => boolean;
}

export function installKeys(deps: KeysDeps): KeysHandle {
  const { ops, world, cmdk } = deps;
  const { state, view } = ops;
  let spaceHeld = false;

  window.addEventListener('keydown', (e) => {
    const inField =
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement ||
      document.activeElement instanceof HTMLSelectElement;
    const mod = e.metaKey || e.ctrlKey;

    // The command lens outranks everything and works in every mode.
    if (mod && e.code === 'KeyK') {
      e.preventDefault();
      cmdk.toggle();
      return;
    }
    if (cmdk.isOpen) return; // the lens owns the keyboard while open

    // The world hears its own keys while it is the view on stage.
    if (deps.getMode() === 'world') {
      if (mod && e.code === 'KeyO') {
        e.preventDefault();
        deps.open();
        return;
      }
      if (mod && (e.code === 'KeyZ' || e.code === 'KeyS')) {
        e.preventDefault();
        world.keydown(e);
        return;
      }
      if (inField) return;
      if (e.code === 'Space') {
        e.preventDefault();
        world.keydown(e);
        return;
      }
      if (e.code === 'KeyZ') {
        deps.setMode('zone');
        return;
      }
      if (world.keydown(e)) e.preventDefault();
      return;
    }
    // GHOST WALK owns WASD while it walks (W never flips the mode
    // out from under a walker), and Q is its door both ways.
    if (!inField && !mod && e.code === 'KeyQ') {
      deps.ghost.toggle();
      return;
    }
    if (!inField && !mod && deps.ghost.keydown(e.code)) {
      e.preventDefault();
      return;
    }
    if (!inField && !mod && e.code === 'KeyW') {
      deps.setMode('world');
      return;
    }

    if (mod && e.code === 'KeyZ') {
      e.preventDefault();
      ops.undoRedo(e.shiftKey ? 'redo' : 'undo');
      return;
    }
    if (mod && e.code === 'KeyS') {
      e.preventDefault();
      deps.save();
      return;
    }
    if (mod && e.code === 'KeyO') {
      e.preventDefault();
      deps.open();
      return;
    }
    if (inField) return;

    if (mod && e.code === 'KeyC') {
      if (ops.copySelection()) toast('copied selection');
      return;
    }
    if (mod && e.code === 'KeyX') {
      ops.cutSelection();
      return;
    }
    if (mod && e.code === 'KeyV') {
      ops.armPaste();
      return;
    }

    if (e.code === 'Space') {
      spaceHeld = true;
      e.preventDefault();
      return;
    }
    const tool = TOOL_BY_CODE.get(e.code);
    if (tool) {
      ops.setTool(tool);
      return;
    }
    if (e.code === 'KeyX' && (state.tool === 'structure' || state.tool === 'prefab')) {
      state.stampFlip = !state.stampFlip;
      if (state.tool === 'prefab') toast('prefabs stamp as captured (no mirror) — flip applies to structures');
      else toast(state.stampFlip ? 'mirrored east-west' : 'mirror off');
      state.changed();
      return;
    }
    switch (e.code) {
      case 'Digit1':
        state.layer = 'ground';
        state.changed();
        break;
      case 'Digit2':
        state.layer = 'detail';
        state.changed();
        break;
      case 'Digit3':
        state.layer = 'elev';
        state.changed();
        break;
      case 'BracketLeft':
        state.brushSize = Math.max(1, state.brushSize - 1);
        state.changed();
        break;
      case 'BracketRight':
        state.brushSize = Math.min(12, state.brushSize + 1);
        state.changed();
        break;
      case 'Digit0':
        deps.zoomFit();
        break;
      case 'Slash':
        e.preventDefault();
        deps.focusPaletteSearch();
        break;
      case 'Enter':
        if (ops.commitPatrolEdit()) break;
        if (state.tool === 'road' && ops.roadPts.length >= 2) ops.commitRoad();
        if (state.tool === 'polygon') ops.commitPolygon();
        break;
      case 'Escape': {
        // One cancel per press, most-transient first — predictable exits.
        if (deps.ghost.end()) break;
        if (ops.cancelPatrolEdit()) break;
        if (ops.cancelPaste()) break;
        if (ops.disarmStamp()) break;
        if (ops.abandonRoad()) break;
        if (ops.abandonPolygon()) break;
        if (state.selected) {
          state.selected = null;
          state.changed();
          break;
        }
        if (state.selection) {
          ops.clearSelection();
        }
        break;
      }
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        // THE NUDGE: arrows carry the selection's content one tile.
        if (!state.selection) break;
        e.preventDefault();
        const dx = e.code === 'ArrowLeft' ? -1 : e.code === 'ArrowRight' ? 1 : 0;
        const dy = e.code === 'ArrowUp' ? -1 : e.code === 'ArrowDown' ? 1 : 0;
        ops.nudgeSelection(dx, dy);
        break;
      }
      case 'Delete':
      case 'Backspace': {
        // A selected placement outranks a tile selection.
        if (state.selected) {
          ops.removePlacementRef(state.selected);
          break;
        }
        if (state.selection) {
          ops.clearSelectedCells('delete selection');
          toast('cleared selection');
        }
        break;
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') spaceHeld = false;
    deps.ghost.keyup(e.code);
    world.keyup(e);
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.dirty || world.ws.dirty) e.preventDefault();
  });

  void view;
  return { isSpaceHeld: () => spaceHeld };
}
