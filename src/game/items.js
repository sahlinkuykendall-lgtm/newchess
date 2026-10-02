// Gear: every hero has a weapon, armor and charm slot. Better items unlock in
// the shop as you clear stages (tier = how far the campaign has gone).
//   stats: atk / def / hp / mov / jump add to the hero's stats
//   sp: starting SP · spRegen: extra SP each turn · regen: HP healed each turn
export const SLOTS = ['weapon', 'armor', 'charm'];
export const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armor', charm: 'Charm' };
export const SLOT_ICONS = { weapon: '⚔', armor: '🛡', charm: '✧' };

export const ITEMS = {
  // weapons
  trainingWraps: { slot: 'weapon', name: 'Training Wraps', price: 60, tier: 0, atk: 2, desc: 'Worn cloth wraps. Better than bare knuckles.' },
  ironEdge: { slot: 'weapon', name: 'Iron Edge', price: 160, tier: 1, atk: 4, desc: 'A solid, honest blade.' },
  emberFang: { slot: 'weapon', name: 'Ember Fang', price: 340, tier: 2, atk: 6, desc: 'Forged in the Ember Pits. Still warm.' },
  starsteel: { slot: 'weapon', name: 'Starsteel', price: 650, tier: 3, atk: 9, desc: 'Metal from a fallen star.' },
  // armor
  paddedVest: { slot: 'armor', name: 'Padded Vest', price: 60, tier: 0, def: 2, desc: 'Thick quilted cloth.' },
  chainMail: { slot: 'armor', name: 'Chain Mail', price: 170, tier: 1, def: 3, hp: 8, desc: 'Rings of iron, heavy but trusty.' },
  stoneplate: { slot: 'armor', name: 'Stoneplate', price: 360, tier: 2, def: 5, hp: 12, desc: 'Carved from Hollowpeak granite.' },
  dragonscale: { slot: 'armor', name: 'Dragonscale', price: 680, tier: 3, def: 7, hp: 20, desc: 'Scales shed by an ancient wyrm.' },
  // charms
  featherCharm: { slot: 'charm', name: 'Feather Charm', price: 90, tier: 0, jump: 2, desc: '+2 Jump: hop up cliffs and walls.' },
  spiritBead: { slot: 'charm', name: 'Spirit Bead', price: 120, tier: 0, sp: 25, desc: 'Start each battle with +25 SP.' },
  swiftBoots: { slot: 'charm', name: 'Swift Boots', price: 220, tier: 1, mov: 1, desc: '+1 Move every turn.' },
  healingLeaf: { slot: 'charm', name: 'Healing Leaf', price: 280, tier: 2, regen: 6, desc: 'Heal 6 HP at the start of each turn.' },
  focusBand: { slot: 'charm', name: 'Focus Band', price: 420, tier: 3, spRegen: 6, desc: '+6 extra SP every turn — Ultimates come faster.' },
};

// Totals of every bonus from a hero's equipped items.
export function gearBonus(gear = {}) {
  const b = { atk: 0, def: 0, hp: 0, mov: 0, jump: 0, sp: 0, regen: 0, spRegen: 0 };
  for (const slot of SLOTS) {
    const it = ITEMS[gear[slot]];
    if (!it) continue;
    for (const k of Object.keys(b)) b[k] += it[k] ?? 0;
  }
  return b;
}

// Short stat summary, e.g. "+4 ATK · +8 HP".
export function itemStats(it) {
  const parts = [];
  if (it.atk) parts.push(`+${it.atk} ATK`);
  if (it.def) parts.push(`+${it.def} DEF`);
  if (it.hp) parts.push(`+${it.hp} HP`);
  if (it.mov) parts.push(`+${it.mov} MOV`);
  if (it.jump) parts.push(`+${it.jump} JUMP`);
  if (it.sp) parts.push(`+${it.sp} start SP`);
  if (it.regen) parts.push(`+${it.regen} HP/turn`);
  if (it.spRegen) parts.push(`+${it.spRegen} SP/turn`);
  return parts.join(' · ');
}
