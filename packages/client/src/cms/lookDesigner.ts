import {
  BEARD_STYLES,
  CLOTH_COLORS,
  DEFAULT_LOOK,
  EAR_STYLES,
  EYE_STYLES,
  FACE_FEATURES,
  HAIR_COLORS,
  HAIR_COLOR_NAMES,
  HAIR_STYLES,
  HERITAGES,
  SKIN_TONES,
  SKIN_TONE_NAMES,
  applyHeritage,
  randomLook,
  type Look,
} from '@devcraft/shared';
import { lookBust } from './portraits.js';
import { el } from './widgets.js';

/**
 * The studio's Hero's Mirror — the character-creation surface for
 * humanoid actors. Every choice is shown as the ART it produces:
 * heritage cards and style tiles are live rig busts, colors are true
 * palette swatches, and each pick repaints the whole mirror so the
 * face you are building is always the face on screen. The component
 * mutates the given Look in place and reports through onChange.
 */
export function lookDesigner(look: Look, onChange: () => void): HTMLElement {
  const wrap = el('div', 'mirror');

  const changed = (): void => {
    paint();
    onChange();
  };

  const row = (label: string, content: HTMLElement, hint = ''): HTMLElement => {
    const r = el('div', 'mirror-row');
    const head = el('div', 'mirror-row-head');
    head.appendChild(el('span', 'mirror-label', label));
    if (hint) head.appendChild(el('span', 'note', hint));
    r.appendChild(head);
    r.appendChild(content);
    return r;
  };

  /** A tile whose face is the actual bust this choice produces. */
  const styleTile = (
    tileLook: Look,
    label: string,
    active: boolean,
    onPick: () => void,
  ): HTMLElement => {
    const tile = el('button', 'style-tile' + (active ? ' active' : '')) as HTMLButtonElement;
    tile.type = 'button';
    const face = el('div', 'style-face');
    const bust = lookBust(tileLook, 46);
    if (bust) face.appendChild(bust);
    tile.appendChild(face);
    tile.appendChild(el('span', 'style-name', label));
    tile.onclick = onPick;
    return tile;
  };

  const swatch = (
    color: string,
    name: string,
    active: boolean,
    onPick: () => void,
  ): HTMLElement => {
    const b = el('button', 'swatch' + (active ? ' active' : '')) as HTMLButtonElement;
    b.type = 'button';
    b.style.setProperty('--swatch', color);
    b.title = name;
    b.onclick = onPick;
    return b;
  };

  const paint = (): void => {
    wrap.innerHTML = '';

    // Heritage shelf — one-click ancestries, each card wearing its face.
    const shelf = el('div', 'heritage-row');
    for (const h of HERITAGES) {
      const signature: Look = {
        ...DEFAULT_LOOK,
        hair: 2,
        skin: h.skins[0]!,
        ears: h.ears,
        feature: h.feature,
        hairColor: h.hairColors?.[0] ?? DEFAULT_LOOK.hairColor,
        beard: h.beards?.[0] ?? 0,
      };
      const card = el('button', 'heritage-card') as HTMLButtonElement;
      card.type = 'button';
      card.title = h.blurb;
      const face = el('div', 'heritage-face');
      const bust = lookBust(signature, 52);
      if (bust) face.appendChild(bust);
      card.appendChild(face);
      card.appendChild(el('b', '', h.name));
      card.onclick = () => {
        Object.assign(look, applyHeritage(h, look));
        changed();
      };
      shelf.appendChild(card);
    }
    const dice = el('button', 'heritage-card dice') as HTMLButtonElement;
    dice.type = 'button';
    dice.title = 'Roll a coherent random look';
    dice.appendChild(el('div', 'heritage-face dice-face', '?'));
    dice.appendChild(el('b', '', 'Surprise me'));
    dice.onclick = () => {
      Object.assign(look, randomLook());
      changed();
    };
    shelf.appendChild(dice);
    wrap.appendChild(row('Heritage', shelf, 'a starting point — every choice below stays yours'));

    // Skin.
    const skins = el('div', 'swatch-row');
    SKIN_TONES.forEach((c, i) => {
      skins.appendChild(
        swatch(c, SKIN_TONE_NAMES[i]!, look.skin === i, () => {
          look.skin = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Skin', skins, SKIN_TONE_NAMES[look.skin] ?? ''));

    // Hair — style tiles wear the CURRENT face with each cut.
    const hair = el('div', 'style-row');
    HAIR_STYLES.forEach((name, i) => {
      hair.appendChild(
        styleTile({ ...look, hair: i }, name, look.hair === i, () => {
          look.hair = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Hair', hair));

    const hairColors = el('div', 'swatch-row');
    HAIR_COLORS.forEach((c, i) => {
      hairColors.appendChild(
        swatch(c, HAIR_COLOR_NAMES[i]!, look.hairColor === i, () => {
          look.hairColor = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Hair color', hairColors, HAIR_COLOR_NAMES[look.hairColor] ?? ''));

    // Beard.
    const beard = el('div', 'style-row');
    BEARD_STYLES.forEach((name, i) => {
      beard.appendChild(
        styleTile({ ...look, beard: i }, name, look.beard === i, () => {
          look.beard = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Beard', beard));

    // The face: eyes, ears, features — tiles again, the art decides.
    const eyes = el('div', 'style-row');
    EYE_STYLES.forEach((name, i) => {
      eyes.appendChild(
        styleTile({ ...look, eyes: i }, name, look.eyes === i, () => {
          look.eyes = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Eyes', eyes));

    const ears = el('div', 'style-row');
    EAR_STYLES.forEach((name, i) => {
      ears.appendChild(
        styleTile({ ...look, ears: i }, name, look.ears === i, () => {
          look.ears = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Ears', ears, 'the pointed kinds make an elf'));

    const feature = el('div', 'style-row');
    FACE_FEATURES.forEach((name, i) => {
      feature.appendChild(
        styleTile({ ...look, feature: i }, name, look.feature === i, () => {
          look.feature = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Face', feature));

    // The starter wardrobe dyes — worn gear covers these in the world.
    const shirt = el('div', 'swatch-row');
    CLOTH_COLORS.forEach((c, i) => {
      shirt.appendChild(
        swatch(c, `dye ${i + 1}`, look.shirt === i, () => {
          look.shirt = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Tunic', shirt, 'shows wherever armor does not cover'));

    const pants = el('div', 'swatch-row');
    CLOTH_COLORS.forEach((c, i) => {
      pants.appendChild(
        swatch(c, `dye ${i + 1}`, look.pants === i, () => {
          look.pants = i;
          changed();
        }),
      );
    });
    wrap.appendChild(row('Trousers', pants));
  };

  paint();
  return wrap;
}
