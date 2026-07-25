/**
 * @devcraft/content — data-driven game definitions.
 * Items, NPCs, skills, recipes, loot tables, maps, and spawn tables all
 * live here as typed data, validated at build time by tools/validate.
 */
export * from './abilities.js';
export * from './items.js';
export * from './equipment/types.js';
export * from './equipment/enchants.js';
export * from './equipment/tables.js';
export * from './equipment/roll.js';
export * from './equipment/naming.js';
export * from './equipment/compile.js';
export * from './equipment/serialize.js';
export * from './equipment/defs.js';
export * from './loot/types.js';
export * from './loot/tables.js';
export * from './loot/roll.js';
export * from './loot/serialize.js';
export * from './danger.js';
export * from './nodes.js';
export * from './wilds.js';
export * from './pois/types.js';
export * from './pois/validate.js';
export * from './pois/prefabs.js';
export * from './pois/defs.js';
export * from './crops.js';
export * from './npcs.js';
export * from './actors/types.js';
export * from './actors/validate.js';
export * from './actors/registry.js';
export * from './dialogues/types.js';
export * from './dialogues/markup.js';
export * from './dialogues/validate.js';
export * from './dialogues/registry.js';
export * from './routines/types.js';
export * from './routines/schedule.js';
export * from './routines/validate.js';
export * from './routines/registry.js';
export * from './recipes.js';
export * from './shop.js';
export * from './buildables.js';
export * from './structures/types.js';
export * from './structures/stamp.js';
export * from './structures/serialize.js';
export * from './structures/templates.js';
export * from './maps/types.js';
export * from './maps/builder.js';
export * from './maps/serialize.js';
export * from './maps/prefab.js';
export * from './maps/dawnmead.js';
