// Static game data: aspects (elements), skills and unit templates.

export const ASPECTS = {
  blaze: { name: 'Blaze', color: '#ff6a3d', glyph: '🔥' },
  gale: { name: 'Gale', color: '#5fe0a8', glyph: '🌪' },
  stone: { name: 'Stone', color: '#c9a36b', glyph: '⛰' },
  tide: { name: 'Tide', color: '#4aa8ff', glyph: '🌊' },
  lumen: { name: 'Lumen', color: '#ffe066', glyph: '✦' },
  umbra: { name: 'Umbra', color: '#b06cff', glyph: '☾' },
};

// Each aspect is strong against the one it points to.
const BEATS = { blaze: 'gale', gale: 'stone', stone: 'tide', tide: 'blaze', lumen: 'umbra', umbra: 'lumen' };

export function aspectMult(attacker, defender) {
  if (BEATS[attacker] === defender) return 1.5;
  if (BEATS[defender] === attacker) return 0.75;
  return 1;
}

// kind: 'damage' | 'heal'
// range: [min, max] Manhattan distance from the user to the target tile
// area: radius of the diamond hit around the target tile (0 = single target)
// pierce: ignores DEF
export const SKILLS = {
  // Kai
  flareFist: { name: 'Flare Fist', kind: 'damage', cost: 30, power: 1.7, range: [1, 1], area: 0, desc: 'A burning haymaker.' },
  phoenixBreaker: { name: 'Phoenix Breaker', kind: 'damage', ult: true, cost: 100, power: 3.0, range: [1, 1], area: 1, desc: 'Explodes on the target and everyone around it.' },
  // Goro
  quakeSlam: { name: 'Quake Slam', kind: 'damage', cost: 35, power: 1.3, range: [0, 0], area: 1, desc: 'Hits every enemy next to Goro.' },
  titanCrash: { name: 'Titan Crash', kind: 'damage', ult: true, cost: 100, power: 2.4, range: [1, 3], area: 1, desc: 'Leaps and crushes an area.' },
  // Rin
  mendingWave: { name: 'Mending Wave', kind: 'heal', cost: 30, power: 1.4, range: [0, 3], area: 1, desc: 'Heals allies in an area.' },
  tidalRequiem: { name: 'Tidal Requiem', kind: 'damage', ult: true, cost: 100, power: 2.2, range: [1, 4], area: 2, desc: 'A crashing wave over a wide area.' },
  // Sora
  piercingGale: { name: 'Piercing Gale', kind: 'damage', cost: 30, power: 1.5, range: [2, 5], area: 0, pierce: true, desc: 'Long shot that ignores DEF.' },
  skyrendVolley: { name: 'Skyrend Volley', kind: 'damage', ult: true, cost: 100, power: 2.6, range: [2, 5], area: 1, desc: 'Rain of wind arrows.' },
  // Nyx
  nightFang: { name: 'Night Fang', kind: 'damage', cost: 25, power: 1.3, range: [1, 1], area: 0, pierce: true, desc: 'Strike that ignores DEF.' },
  eclipseEdge: { name: 'Eclipse Edge', kind: 'damage', ult: true, cost: 100, power: 3.4, range: [1, 1], area: 0, pierce: true, desc: 'A single lethal cut.' },
  // Enemies
  rendingClaw: { name: 'Rending Claw', kind: 'damage', cost: 30, power: 1.6, range: [1, 1], area: 0, desc: 'Savage claw.' },
  bloodMoon: { name: 'Blood Moon', kind: 'damage', ult: true, cost: 100, power: 2.4, range: [1, 2], area: 1, desc: 'Crimson shockwave.' },
  fireball: { name: 'Fireball', kind: 'damage', cost: 35, power: 1.2, range: [2, 4], area: 1, desc: 'Explosive fire.' },
  mudSlam: { name: 'Mud Slam', kind: 'damage', cost: 30, power: 1.5, range: [1, 1], area: 0, desc: 'Heavy sludge blow.' },
  stoneDive: { name: 'Stone Dive', kind: 'damage', cost: 30, power: 1.6, range: [1, 2], area: 0, desc: 'Diving strike.' },
};

export const BASIC_ATTACK = { name: 'Attack', kind: 'damage', cost: 0, power: 1, area: 0 };

// passive: an always-on trait (see rules.js).
// look: drives the procedural sprite renderer.
// Story profiles live in characters.js.
export const UNITS = {
  kai: {
    name: 'Kai', title: 'Brawler', aspect: 'blaze',
    hp: 82, atk: 26, def: 10, mov: 5, jump: 2, range: [1, 1],
    skills: ['flareFist'], ult: 'phoenixBreaker',
    passive: { id: 'burningSpirit', name: 'Burning Spirit', desc: 'Gains +5 extra SP every time he deals damage, so his Ultimate charges faster.' },
    look: { art: 'kai', skin: '#f2c6a0', hair: '#ff5a2a', hairStyle: 'spiky', outfit: '#2b2f45', accent: '#ff8a3d' },
  },
  goro: {
    name: 'Goro', title: 'Guardian', aspect: 'stone',
    hp: 112, atk: 21, def: 17, mov: 4, jump: 1, range: [1, 1],
    skills: ['quakeSlam'], ult: 'titanCrash',
    passive: { id: 'bedrock', name: 'Bedrock', desc: 'Can’t be backstabbed. Hits from behind do normal damage.' },
    look: { art: 'goro', skin: '#c98e62', hair: '#3a2a20', hairStyle: 'short', outfit: '#6b5a3e', accent: '#e0b46a' },
  },
  rin: {
    name: 'Rin', title: 'Mystic', aspect: 'tide',
    hp: 64, atk: 22, def: 8, mov: 5, jump: 2, range: [1, 2],
    skills: ['mendingWave'], ult: 'tidalRequiem',
    passive: { id: 'tidalGrace', name: 'Tidal Grace', desc: 'At the start of your turn, Rin and every ally next to her recover 6 HP.' },
    look: { art: 'rin', skin: '#f6d3b8', hair: '#3ec7ff', hairStyle: 'long', outfit: '#e9f1ff', accent: '#4aa8ff' },
  },
  sora: {
    name: 'Sora', title: 'Ranger', aspect: 'gale',
    hp: 60, atk: 24, def: 7, mov: 5, jump: 3, range: [2, 4],
    skills: ['piercingGale'], ult: 'skyrendVolley',
    passive: { id: 'eagleEye', name: 'Eagle Eye', desc: '+1 range on attacks and skills while standing on height 2 or higher.' },
    look: { art: 'sora', skin: '#e8b48f', hair: '#2fbf7f', hairStyle: 'ponytail', outfit: '#264d3b', accent: '#5fe0a8' },
  },
  nyx: {
    name: 'Nyx', title: 'Shade', aspect: 'umbra', backstab: 2,
    hp: 58, atk: 25, def: 7, mov: 6, jump: 3, range: [1, 1],
    skills: ['nightFang'], ult: 'eclipseEdge',
    passive: { id: 'shadowStrike', name: 'Shadow Strike', desc: 'Backstabs deal ×2 damage instead of ×1.5.' },
    look: { art: 'nyx', skin: '#d9b9a6', hair: '#e8e8f0', hairStyle: 'hood', outfit: '#1d1a2b', accent: '#b06cff' },
  },

  varg: {
    name: 'Varg the Red', title: 'Captain', aspect: 'umbra',
    hp: 120, atk: 24, def: 12, mov: 5, jump: 2, range: [1, 1],
    skills: ['rendingClaw'], ult: 'bloodMoon',
    passive: { id: 'bloodlust', name: 'Bloodlust', desc: 'Heals 15 HP whenever he knocks out an enemy.' },
    look: { art: 'varg', skin: '#7a2630', hair: '#c23a3a', outfit: '#2a1420', accent: '#ff4d6d' },
  },
  imp: {
    name: 'Cinder Imp', title: 'Caster', aspect: 'blaze',
    hp: 46, atk: 19, def: 6, mov: 5, jump: 3, range: [2, 3],
    skills: ['fireball'],
    passive: { id: 'fireborn', name: 'Fireborn', desc: 'Immune to lava. Imps love standing in it.' },
    look: { art: 'imp', skin: '#d8462b', hair: '#ffb347', outfit: '#5a1a12', accent: '#ffb347' },
  },
  brute: {
    name: 'Bog Brute', title: 'Bruiser', aspect: 'tide',
    hp: 96, atk: 21, def: 14, mov: 4, jump: 1, range: [1, 1],
    skills: ['mudSlam'],
    passive: { id: 'sludgeBody', name: 'Sludge Body', desc: 'Takes 25% less damage from ranged attacks — the mud swallows them.' },
    look: { art: 'brute', skin: '#3f8a7a', hair: '#2a5f55', outfit: '#244a42', accent: '#7fe0c8' },
  },
  gargoyle: {
    name: 'Gargoyle', title: 'Flier', aspect: 'stone',
    hp: 70, atk: 21, def: 13, mov: 6, jump: 9, range: [1, 1], flier: true,
    skills: ['stoneDive'],
    passive: { id: 'stoneWings', name: 'Stone Wings', desc: 'Can fly over water.' },
    look: { art: 'gargoyle', skin: '#8a8d99', hair: '#5c5f6b', outfit: '#4a4c57', accent: '#c9a36b' },
  },
};
