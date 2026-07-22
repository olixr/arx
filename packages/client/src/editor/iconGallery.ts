import { PASSIVES } from '@devcraft/shared';
import { TECHNIQUES, abilityDef, itemDef } from '@devcraft/content';
import {
  allIconBuildableIds,
  allIconItemIds,
  buildableIconUrl,
  itemIconUrl,
  slotGlyphUrl,
  uiIconUrl,
} from '../render/icons.js';
import {
  abilityIconUrl,
  allAbilityIconIds,
  allPassiveIconIds,
  passiveIconUrl,
} from '../render/abilityIcons.js';

/**
 * Dev icon gallery — `?icons` on the URL overlays every registered
 * icon at inventory sizes (64 hero + 24 at-a-glance) on slot-well
 * chrome, grouped and searchable. Pure audit surface: nothing here
 * ships to players, it exists so an art pass can eyeball the whole
 * set side by side and at scale.
 */
export function showIconGallery(): void {
  const root = document.createElement('div');
  root.id = 'icon-gallery';
  root.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10000', 'overflow:auto',
    'background:#241d16',
    'font-family:system-ui,sans-serif', 'padding:18px 22px 60px',
  ].join(';');

  const bar = document.createElement('div');
  bar.style.cssText =
    'position:sticky;top:0;z-index:1;background:#241d16;padding:8px 0 10px;display:flex;gap:12px;align-items:center';
  const title = document.createElement('div');
  title.textContent = 'Icon gallery';
  title.style.cssText = 'color:#e8dcc0;font-size:20px;font-weight:700';
  const search = document.createElement('input');
  search.placeholder = 'filter…';
  search.style.cssText =
    'background:#1a140e;border:1px solid #4a3c28;color:#e8dcc0;padding:6px 10px;border-radius:6px;font-size:14px;width:220px';
  const count = document.createElement('div');
  count.style.cssText = 'color:#9a8a6a;font-size:13px';
  bar.append(title, search, count);
  root.appendChild(bar);

  interface Entry {
    id: string;
    label: string;
    url64: string;
    url24: string;
  }
  interface Group {
    name: string;
    entries: Entry[];
  }

  const items = allIconItemIds();
  const pick = (test: (id: string) => boolean): string[] => items.filter(test);
  const used = new Set<string>();
  const take = (name: string, test: (id: string) => boolean): Group => {
    const ids = pick((id) => !used.has(id) && test(id));
    for (const id of ids) used.add(id);
    return {
      name,
      entries: ids.map((id) => ({
        id,
        label: itemDef(id)?.name ?? id,
        url64: itemIconUrl(id, 64),
        url24: itemIconUrl(id, 24),
      })),
    };
  };

  const groups: Group[] = [
    take('Tools', (id) => /_(axe|pickaxe)$/.test(id) || id === 'fishing_rod' || id === 'watering_can'),
    take('Blades', (id) => /(sword|dagger|dirk|blade)/.test(id)),
    take('Bows & ammo', (id) => /(bow|arrow|quiver)/.test(id)),
    take('Staves & orbs', (id) => /(staff|orb|tome)/.test(id)),
    take('Shields', (id) => /(shield|buckler)/.test(id)),
    take('Head', (id) => /(helm|hood|cowl|hat|circlet|coif|crown)/.test(id)),
    take('Body', (id) => /(platebody|robe|jerkin|body)/.test(id)),
    take('Legs', (id) => /(greaves|chaps|skirts|leggings|trousers)/.test(id)),
    take('Feet', (id) => /(boots|sabatons|slippers)/.test(id)),
    take('Hands', (id) => /(gauntlets|gloves|wraps|mitts)/.test(id)),
    take('Capes', (id) => /(cape|cloak|banner)/.test(id)),
    take('Trinkets & sigils', (id) =>
      /(ring|band|charm|stone|pearl|shard_|sigil|totem|coil|bell|decoy|snare|key|essence|dust)/.test(id) &&
      !/_ore$/.test(id)),
    take('Ores & smithing', (id) => /(_ore|_bar|coal|obsidian_shard)/.test(id)),
    take('Wood & fibers', (id) => /(log|fibre|twine|cloth|linen|silk|flour)/.test(id)),
    take('Hides & drops', (id) => /(hide|leather|fur|bones|feather|venom|gland|egg)/.test(id)),
    take('Food & drink', (id) =>
      /(trout|chicken|beef|meat|burnt|bread|stew|cake|milk|berries|carrot|fried)/.test(id)),
    take('Potions & oils', (id) => /(tincture|brew|tonic|salve|oil|kiss)/.test(id)),
    take('Farming', (id) => /(seed|wheat|cotton|sagewort|sunflower|moonbell|herb)/.test(id)),
    take('Scrolls', (id) => /^scroll_/.test(id)),
    take('Everything else', () => true),
  ];

  // The spell-plates, grouped the way the design document groups them:
  // techniques and the sigil pulled out first, the arts left together.
  {
    const abilityIds = allAbilityIconIds();
    const techIds = new Set(TECHNIQUES.map((t) => t.ability));
    const abTaken = new Set<string>();
    const takeAbility = (name: string, test: (id: string) => boolean): void => {
      const ids = abilityIds.filter((id) => !abTaken.has(id) && test(id));
      for (const id of ids) abTaken.add(id);
      if (!ids.length) return;
      groups.push({
        name,
        entries: ids.map((id) => ({
          id,
          label: abilityDef(id)?.name ?? id,
          url64: abilityIconUrl(id, 64),
          url24: abilityIconUrl(id, 24),
        })),
      });
    };
    takeAbility('Techniques', (id) => techIds.has(id));
    takeAbility('Sigils & specials', (id) => id === 'bone_tempest' || id === 'ground_slam');
    const relicActives = new Set([
      'ember_dash', 'healing_totem', 'snare_trap', 'storm_bell', 'hunters_decoy',
      'stone_aegis', 'coil_lance', 'bramble_burst', 'arcane_seekers', 'venom_dart',
    ]);
    takeAbility('Relic actives', (id) => relicActives.has(id));
    takeAbility('Weapon Arts', () => true);
    groups.push({
      name: 'Gear passives',
      entries: allPassiveIconIds().map((id) => ({
        id,
        label: PASSIVES[id as keyof typeof PASSIVES]?.name ?? id,
        url64: passiveIconUrl(id, 64),
        url24: passiveIconUrl(id, 24),
      })),
    });
  }

  groups.push({
    name: 'Buildables',
    entries: allIconBuildableIds().map((id) => ({
      id,
      label: id,
      url64: buildableIconUrl(id, 64)!,
      url24: buildableIconUrl(id, 24)!,
    })),
  });
  groups.push({
    name: 'Slot glyphs',
    entries: ['head', 'body', 'legs', 'gloves', 'boots', 'weapon', 'offhand', 'tool', 'relic', 'sigil', 'cape'].map(
      (slot) => ({ id: slot, label: slot, url64: slotGlyphUrl(slot, 64), url24: slotGlyphUrl(slot, 24) }),
    ),
  });
  groups.push({
    name: 'UI glyphs',
    entries: (['backpack', 'scroll', 'hammer', 'house', 'attack', 'bell'] as const).map((k) => ({
      id: k,
      label: k,
      url64: uiIconUrl(k, 64),
      url24: uiIconUrl(k, 24),
    })),
  });

  const sections: Array<{ head: HTMLElement; grid: HTMLElement; tiles: Array<{ el: HTMLElement; key: string }> }> = [];
  for (const g of groups) {
    if (!g.entries.length) continue;
    const head = document.createElement('div');
    head.textContent = `${g.name} (${g.entries.length})`;
    head.style.cssText =
      'color:#c9b98a;font-size:15px;font-weight:700;margin:22px 0 8px;border-bottom:1px solid #3a3226;padding-bottom:4px';
    const grid = document.createElement('div');
    grid.style.display = 'flex';
    grid.style.flexWrap = 'wrap';
    grid.style.gap = '10px';
    const tiles: Array<{ el: HTMLElement; key: string }> = [];
    for (const e of g.entries) {
      const tile = document.createElement('div');
      tile.style.cssText = [
        'width:118px', 'display:flex', 'flex-direction:column', 'align-items:center', 'gap:4px',
        'background:linear-gradient(#33291d,#2b2217)', 'border:1px solid #4a3c28', 'border-radius:8px',
        'padding:10px 6px 7px', 'box-shadow:inset 0 2px 6px rgba(0,0,0,0.45)',
      ].join(';');
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-end;gap:6px';
      const big = document.createElement('img');
      big.src = e.url64;
      big.width = big.height = 64;
      const small = document.createElement('img');
      small.src = e.url24;
      small.width = small.height = 24;
      row.append(big, small);
      const cap = document.createElement('div');
      cap.textContent = e.label;
      cap.title = e.id;
      cap.style.cssText =
        'color:#b8a888;font-size:10.5px;text-align:center;line-height:1.25;max-width:110px;overflow:hidden';
      tile.append(row, cap);
      grid.appendChild(tile);
      tiles.push({ el: tile, key: `${e.id} ${e.label}`.toLowerCase() });
    }
    root.append(head, grid);
    sections.push({ head, grid, tiles });
  }

  const applyFilter = (): void => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    for (const s of sections) {
      let any = false;
      for (const t of s.tiles) {
        const on = !q || t.key.includes(q);
        t.el.style.display = on ? '' : 'none';
        if (on) {
          any = true;
          shown++;
        }
      }
      s.head.style.display = any ? '' : 'none';
      s.grid.style.display = any ? 'flex' : 'none';
    }
    count.textContent = `${shown} icons`;
  };
  search.addEventListener('input', applyFilter);
  applyFilter();

  document.body.appendChild(root);
}
