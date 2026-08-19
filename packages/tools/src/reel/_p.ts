import * as C from '@arx/content';
const list: any[] = Object.values(C.EQUIPMENT_DEFS as any);
const bySlot: Record<string, any[]> = {};
for (const d of list) if (d.slot) (bySlot[d.slot] ??= []).push(d);
for (const [slot, ds] of Object.entries(bySlot)) {
  const top = ds.filter((d) => (d.armorClass === 'plate' || d.armorClass === 'cloth' || !d.armorClass))
    .sort((a, b) => (a.levelReq?.level ?? 0) - (b.levelReq?.level ?? 0)).slice(-6);
  console.log(slot.toUpperCase(), top.map((d) => `${d.id}(${d.armorClass ?? '-'},${d.levelReq?.level ?? 0})`).join(' '));
}
