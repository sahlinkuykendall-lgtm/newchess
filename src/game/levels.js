// Level definitions.
//
// Maps are one grid of 2-character cells: tile type + height (0-9), or ".." for
// empty space (the edge of the island). Types:
//   g grass   s stone   d dirt path   a sand   w water   b bridge
//   l lava    x shrine  p pillar      T tree   R rock (on grass)
//   O obsidian rock (on ash)          Q boulder (on stone)
const TYPE = {
  g: 'grass', s: 'stone', d: 'dirt', a: 'sand', w: 'water', b: 'bridge',
  l: 'lava', x: 'shrine', p: 'pillar', T: 'tree', R: 'rock', O: 'obsidian', Q: 'boulder',
};

export function parseMap(text) {
  return text.trim().split('\n').map(row => row.trim().split(/\s+/).map(cell => {
    if (cell === '..') return null;
    const type = TYPE[cell[0]];
    if (!type) throw new Error(`Unknown map cell "${cell}"`);
    return { type, h: Number(cell.slice(1)) };
  }));
}

export const LEVELS = [
  {
    id: 'yard',
    name: 'Training Yard',
    stage: '1-1',
    board: 'Proving Grounds',
    mission: 'Rout: KO all three qualifier enemies.',
    intro: [
      { who: 'Goro', text: 'Qualifier match. Two imps and a bog brute — a warm-up.' },
      { who: 'Sora', text: 'Tip: hit them from BEHIND for big damage. Check which way they face.' },
      { who: 'Rin', text: 'And stand next to whoever is attacking — allies beside the target join in with a combo hit!' },
      { who: 'Kai', text: 'Got it. Hit from behind, stick together, punch everything.' },
    ],
    tiles: parseMap(`
      .. .. g1 g1 g1 .. .. g1 g1 g1 g1 a1 .. .. .. ..
      .. .. g1 g1 g1 T1 g2 g2 g2 a1 w0 w0 w0 w0 g1 ..
      .. .. g1 T1 g1 g1 g2 g2 g2 a1 w0 w0 w0 w0 g1 ..
      .. T1 g1 g1 T1 g1 g1 g1 g1 a1 w0 w0 w0 w0 g1 ..
      g1 g1 g1 g1 p3 s1 s1 s1 s1 s1 s1 p3 a1 a1 g1 g1
      g1 T1 g1 g1 s1 s1 s1 s1 s1 s1 s1 s1 g1 g1 g1 g1
      g1 g1 g1 g1 s1 s1 s1 Q1 s1 s1 s1 s1 g1 g1 g1 g1
      g1 x1 g1 g1 s1 s1 s1 s1 s1 s1 s1 s1 g1 g1 g1 g1
      g1 g1 g1 g1 s1 s1 s1 s1 s1 s1 s1 s1 g1 T1 g1 g1
      g1 g1 g1 g1 s1 s1 s1 s1 Q1 s1 s1 s1 g1 g1 T1 g1
      .. g1 g1 g1 s1 s1 s1 s1 s1 s1 s1 s1 g1 T1 g1 ..
      .. g1 g1 g1 p3 s1 s1 d1 d1 d1 s1 p3 g1 g1 g1 g1
      g1 g1 g1 g1 g1 g1 s2 s2 s2 s2 s2 g1 g1 g1 g1 g1
      .. .. g1 g1 g1 g1 s2 s2 s2 s2 s2 g1 g1 g1 g1 ..
      .. .. g1 g1 g1 g1 s2 s2 s2 s2 s2 g1 g1 g1 .. ..
      .. .. .. .. g1 g1 g1 g1 g1 g1 g1 .. .. .. .. ..
    `),
    spawns: [{ r: 12, c: 8 }, { r: 12, c: 7 }, { r: 13, c: 8 }, { r: 12, c: 9 }, { r: 13, c: 7 }],
    party: ['kai', 'goro', 'rin', 'sora'],
    heroLevel: 1,
    xp: 100,
    joins: ['nyx'],
    outro: [
      { who: 'Nyx', text: 'Not bad. I’m on your team now.' },
      { who: 'Kai', text: 'Wait — who ARE you?' },
    ],
    enemies: [
      { id: 'imp', lv: 1, mult: 0.8, r: 2, c: 6 },
      { id: 'imp', lv: 1, mult: 0.8, r: 2, c: 8 },
      { id: 'brute', lv: 1, mult: 0.8, r: 5, c: 8 },
    ],
  },
  {
    id: 'hills',
    name: 'Windmill Hills',
    stage: '1-2',
    board: 'Proving Grounds',
    mission: 'Rout: clear the hills. Gargoyles fly — protect your back line.',
    intro: [
      { who: 'Sora', text: 'High ground! From height 2 or more my arrows reach one tile farther.' },
      { who: 'Goro', text: 'The gargoyles will dive at Rin. Keep her between us.' },
    ],
    tiles: parseMap(`
      .. .. .. .. .. g4 g4 g4 g4 g3 g2 .. .. g1 g1 .. .. ..
      .. .. .. .. g4 g4 g4 g4 g4 g3 g2 g1 g1 g1 g1 .. .. ..
      .. g4 g5 g5 g5 g5 g5 g4 g4 g3 g2 g1 T1 g1 g1 g1 g1 ..
      g4 g4 g5 p8 p8 g5 g5 g4 g4 g3 g2 g1 g1 g1 g1 g1 g1 ..
      g4 g4 g5 p8 p8 g5 g5 g4 g4 g3 g2 g1 g1 g1 g1 T1 g1 ..
      .. g4 g5 g5 g5 x5 g5 g4 g4 g3 g2 g1 g1 g2 g2 g2 g2 g1
      .. g4 g5 g5 g5 g5 g5 g4 d4 g3 g2 g1 g1 g2 g2 g2 g2 g1
      g4 g4 g4 g4 g4 g4 g4 g4 d4 g3 g2 g1 T1 g1 g1 g1 g1 g1
      g4 g4 g4 g4 g4 g4 d4 d4 g4 g3 g2 d1 g1 R1 g1 g1 g1 g1
      .. g3 g3 g3 g3 g3 g3 g3 g3 g3 g2 g1 d1 g1 g1 g1 g1 g1
      g2 g2 g2 g2 g2 g2 g2 g2 g2 g2 g2 g1 d1 g1 g1 g1 g1 g1
      g1 g1 g1 g1 g1 g1 g1 g1 g1 g1 g1 d1 g1 g1 T1 g1 g1 ..
      g1 g1 T1 g1 g1 g1 g1 g1 g1 R1 g1 d1 g1 g1 g1 g1 g1 ..
      .. g1 g1 g1 T1 g1 g1 g1 g1 s1 s1 s1 s1 R1 g1 g1 g1 g1
      .. g1 g1 g1 g1 g1 T1 g1 g1 s1 s1 s1 s1 g1 g1 g1 g1 ..
      .. g1 g1 T1 g1 g1 g1 g1 g1 s1 s1 s1 s1 g1 g1 g1 .. ..
      .. .. .. g1 g1 g1 g1 g1 g1 s1 s1 s1 s1 g1 .. .. .. ..
      .. .. .. g1 .. .. .. g1 g1 g1 g1 g1 g1 .. .. .. .. ..
    `),
    spawns: [{ r: 14, c: 10 }, { r: 14, c: 11 }, { r: 15, c: 10 }, { r: 15, c: 11 }, { r: 13, c: 10 }],
    party: ['kai', 'goro', 'rin', 'sora', 'nyx'],
    heroLevel: 2,
    xp: 110,
    joins: ['aiko', 'pip'],
    outro: [
      { who: 'Aiko', text: 'I’m Aiko — captain of the human team. My shoulder’s healed. Mind if I take my spot back?' },
      { who: 'Pip', text: 'And I’m Pip! I build bombs! Small ones! Mostly!' },
    ],
    enemies: [
      { id: 'gargoyle', lv: 2, r: 5, c: 14 },
      { id: 'gargoyle', lv: 2, r: 2, c: 13 },
      { id: 'imp', lv: 1, r: 7, c: 6, ai: 'guard', aggro: 7 },
      { id: 'imp', lv: 1, r: 8, c: 2, ai: 'guard', aggro: 7 },
      { id: 'brute', lv: 2, r: 10, c: 5 },
    ],
  },
  {
    id: 'pits',
    name: 'Ember Pits',
    stage: '1-3',
    board: 'Proving Grounds',
    mission: 'Rout: imps hide in the lava — lava burns everyone else.',
    intro: [
      { who: 'Pip', text: 'Imps are FIREBORN — they can stand in lava all day. We can’t. 10 damage a turn!' },
      { who: 'Aiko', text: 'My Dawnbreaker hits harder on anyone still at full health. I’ll open the fights.' },
    ],
    tiles: parseMap(`
      .. .. .. .. d1 d1 .. .. .. d1 d1 d1 .. .. .. .. .. ..
      .. .. .. .. .. d1 d1 d1 a1 d1 d1 d1 .. .. d1 d1 .. ..
      .. .. .. .. s2 d1 d1 d1 d1 d1 d1 d1 d1 d1 l0 l0 .. ..
      .. .. s2 s2 s2 d1 d1 d1 O1 d1 d1 d1 d1 l0 l0 d1 .. ..
      .. d1 d1 d1 d1 d1 d1 d1 d2 d2 d1 d1 l0 l0 d1 d1 d1 d1
      .. d1 d1 d1 d1 d1 l0 d2 s3 s3 l0 l0 l0 d1 d1 d1 d1 d1
      .. d1 d1 d1 d1 l0 l0 s3 s4 s4 s3 s3 d2 d1 d1 d1 d1 d1
      .. .. O1 d1 d1 d2 s3 s4 l3 l3 s4 s3 d2 d1 d1 d1 d1 d1
      .. d1 d1 d1 d2 s3 s4 l3 l3 l3 l3 s4 s3 d2 O1 d1 d1 d1
      d1 d1 d1 d1 d2 s3 s4 l3 l3 l3 l3 s4 s3 d2 d1 d1 d1 ..
      d1 d1 d1 O1 d1 d2 s3 s4 l3 l3 s4 s3 d2 d1 d1 d1 .. ..
      .. d1 d1 d1 d1 d2 s3 s3 s4 s4 s3 s3 l0 d1 d1 d1 d1 d1
      d1 d1 d1 d1 d1 d1 l0 l0 s3 s3 d2 l0 d1 d1 d1 d1 d1 ..
      d1 d1 d1 d1 d1 l0 l0 d1 d2 d2 d1 d1 l0 d1 d1 d1 d1 ..
      .. .. d1 d1 l0 l0 d1 d1 d1 d1 d1 d1 s1 s1 s1 s1 .. ..
      .. x1 d1 l0 l0 d1 d1 d1 d1 O1 d1 d1 s1 s1 .. .. .. ..
      .. .. d1 l0 .. .. d1 d1 a1 d1 d1 d1 s1 s1 .. .. .. ..
      .. .. .. .. .. .. d1 d1 a1 .. .. .. d1 d1 .. .. .. ..
    `),
    spawns: [{ r: 14, c: 13 }, { r: 14, c: 14 }, { r: 15, c: 12 }, { r: 15, c: 13 }, { r: 14, c: 12 }],
    party: ['kai', 'goro', 'rin', 'sora', 'aiko'],
    heroLevel: 3,
    xp: 120,
    joins: ['hana'],
    outro: [
      { who: 'Hana', text: 'Big brother!! I snuck in! Don’t be mad, I brought my fan!' },
      { who: 'Kai', text: 'HANA?! …Fine. Stay next to me. Always.' },
    ],
    enemies: [
      { id: 'imp', lv: 3, r: 5, c: 11 },
      { id: 'imp', lv: 3, r: 3, c: 13 },
      { id: 'imp', lv: 2, r: 13, c: 6 },
      { id: 'gargoyle', lv: 3, r: 6, c: 8 },
      { id: 'brute', lv: 3, r: 3, c: 3, ai: 'guard', aggro: 8 },
    ],
  },
  {
    id: 'mire',
    name: 'Mirewood',
    stage: '1-4',
    board: 'Proving Grounds',
    mission: 'Rout: swamp channels split the map — use the bridges.',
    intro: [
      { who: 'Rin', text: 'Bog Brutes. Arrows and bombs barely scratch them — hit them up close.' },
      { who: 'Hana', text: 'And when I stand next to Kai we BOTH hit harder. Sibling Bond!' },
    ],
    tiles: parseMap(`
      .. .. .. .. .. g1 g1 g1 g1 b1 w0 .. .. g1 g1 g1 .. .. .. ..
      .. .. .. .. g1 g1 g1 g1 g1 b1 w0 g1 g1 T1 g1 g1 .. .. .. ..
      .. T1 g1 g1 g1 g1 g1 g1 g1 b1 w0 g1 g1 g1 g1 g1 g1 T1 .. ..
      .. g1 g1 g1 g1 g1 T1 g1 g1 b1 w0 R1 g1 g1 g1 g1 g1 g1 .. ..
      g1 g1 g1 g1 g1 g1 g1 g1 w0 w0 w0 w0 g1 g1 g1 T1 g1 g1 .. ..
      .. g1 g1 g1 g1 g1 w0 w0 w0 w0 w0 w0 w0 w0 g1 g1 g1 g1 w0 w0
      .. w0 w0 b1 w0 w0 w0 w0 g1 g1 g1 g1 w0 w0 w0 w0 b1 w0 w0 ..
      g1 w0 w0 b1 w0 w0 g1 g1 g1 g2 g2 g1 R1 g1 w0 w0 b1 w0 g1 ..
      g1 g1 T1 g1 g1 g1 T1 g1 g2 x2 g2 g2 g1 g1 g1 g1 g1 g1 g1 g1
      g1 g1 g1 g1 g1 T1 g1 R1 g1 g2 g2 g1 g1 g1 g1 g1 g1 T1 g1 g1
      g1 g1 g1 g1 g1 w0 w0 w0 w0 w0 g1 g1 g1 T1 g1 g1 g1 g1 g1 w0
      g1 g1 g1 b1 w0 w0 w0 w0 w0 w0 w0 w0 g1 g1 g1 g1 g1 w0 w0 w0
      w0 w0 w0 b1 w0 g1 g1 g1 g1 g1 w0 w0 w0 w0 w0 w0 b1 w0 w0 g1
      .. w0 w0 g1 g1 g1 g1 g1 g1 g1 g1 g1 w0 w0 w0 w0 b1 g1 g1 ..
      .. g1 T1 g1 s1 s1 s1 s1 R1 w0 b1 g1 g1 g1 g1 g1 g1 T1 .. ..
      .. g1 g1 g1 s1 s1 s1 s1 g1 w0 b1 g1 g1 g1 g1 T1 g1 g1 .. ..
      .. .. .. g1 s1 s1 s1 s1 g1 w0 b1 g1 g1 T1 g1 .. .. g1 g1 ..
      .. .. .. g1 g1 .. .. g1 g1 w0 b1 g1 g1 g1 .. .. .. g1 .. ..
    `),
    spawns: [{ r: 14, c: 5 }, { r: 14, c: 6 }, { r: 15, c: 5 }, { r: 15, c: 6 }, { r: 14, c: 4 }],
    party: ['kai', 'goro', 'rin', 'sora', 'hana'],
    heroLevel: 4,
    xp: 130,
    joins: ['mako'],
    outro: [
      { who: 'Mako', text: 'Ha! You lot fight like a storm. Name’s Mako. I’ll lend you my blade for the final.' },
    ],
    enemies: [
      { id: 'brute', lv: 3, r: 8, c: 9 },
      { id: 'brute', lv: 3, r: 3, c: 12 },
      { id: 'gargoyle', lv: 3, r: 2, c: 15 },
      { id: 'gargoyle', lv: 3, r: 9, c: 16 },
      { id: 'imp', lv: 3, r: 3, c: 5 },
    ],
  },
  {
    id: 'ruins',
    name: 'Ruins of Ash',
    stage: '1-5',
    board: 'Proving Grounds',
    boss: true,
    mission: 'Rout: KO every member of Team Crimson Fang.',
    intro: [
      { who: 'Varg the Red', text: 'A substitute team? The Grand Board must be desperate. Come to my fortress — if you can cross the river.' },
      { who: 'Kai', text: 'Two bridges, one wolf. Easy math.' },
      { who: 'Rin', text: 'Watch the walls — those imps will rain fire on anything near the gate.' },
    ],
    tiles: parseMap(`
      .. .. .. .. .. g1 g1 g1 g1 .. .. g1 g1 g1 .. .. .. .. .. ..
      .. .. p5 s4 s4 s4 s4 s4 p5 g1 g1 g1 g2 g2 g2 .. g2 g1 .. ..
      .. .. s4 s3 s3 s3 s3 s3 s4 g1 g1 g2 g2 g2 g2 g2 g2 g1 .. ..
      .. .. s4 s3 s3 s3 s3 s3 s3 d2 g1 g2 g2 g2 g2 g2 g2 g2 g1 ..
      .. .. s4 s3 s3 s3 s3 s3 s3 d2 d1 g1 g2 g2 g2 g2 g2 g1 g1 g1
      g2 g2 s4 s3 s3 s3 s3 s3 s4 d1 d1 g1 p3 g1 g2 g2 g1 a1 a1 a1
      g1 g1 p5 s4 s4 s3 s3 s4 p5 g1 d1 g1 g2 g1 g1 g1 a1 w0 w0 w0
      g1 g1 g1 g1 g1 d2 d2 a1 a1 a1 p3 g2 x2 g2 g1 a1 w0 w0 w0 w0
      .. g1 g1 g1 g1 d1 a1 w0 w0 w0 w0 g1 g2 d1 b1 w0 w0 a1 a1 a1
      .. g1 g1 g1 a1 d1 b1 w0 w0 w0 w0 w0 w0 b1 b1 w0 a1 g1 g1 ..
      g1 a1 a1 a1 w0 b1 b1 a1 a1 R1 a1 w0 w0 b1 d1 a1 g1 g1 g1 ..
      .. w0 w0 w0 w0 b1 a1 g1 g1 g1 R1 a1 a1 a1 g1 R1 g1 l0 g1 g1
      .. w0 w0 w0 a1 d1 g1 g1 R1 g1 g1 g2 g2 g2 g2 l0 l0 g1 R1 g1
      g2 a1 a1 a1 g1 d1 T1 d1 g1 g1 g1 g2 g2 g2 d2 l0 l0 l0 g1 ..
      g2 T2 g2 g2 T1 d1 d1 d1 d1 d1 d1 d1 d1 d1 R2 g2 l0 g2 R1 g1
      .. .. T2 g2 g1 g1 g1 T1 g1 s2 s2 s2 s2 s2 g2 g2 g2 g2 g1 g1
      .. g2 g2 g1 g1 T1 g1 g1 g1 s2 s2 s2 s2 s2 g2 g2 g2 g1 g1 ..
      .. g1 g1 T1 g1 g1 g1 g1 g1 s2 s2 s2 s2 s2 g1 g1 g1 .. .. ..
      .. .. .. .. .. g1 g1 g1 g1 s2 s2 s2 s2 s2 g1 g1 .. .. .. ..
      .. .. .. .. .. g1 g1 g1 .. .. g1 g1 g1 .. .. .. .. .. .. ..
    `),
    spawns: [{ r: 15, c: 11 }, { r: 15, c: 12 }, { r: 15, c: 10 }, { r: 16, c: 11 }, { r: 17, c: 12 }],
    party: ['kai', 'goro', 'nyx', 'rin', 'sora'],
    heroLevel: 5,
    xp: 150,
    enemies: [
      { id: 'varg', lv: 7, r: 3, c: 5, ai: 'guard', aggro: 8 },
      { id: 'imp', lv: 5, r: 6, c: 4, ai: 'guard', aggro: 7 },
      { id: 'imp', lv: 5, r: 5, c: 8, ai: 'guard', aggro: 7 },
      { id: 'brute', lv: 6, r: 7, c: 6 },
      { id: 'gargoyle', lv: 6, r: 6, c: 12 },
      { id: 'imp', lv: 5, r: 8, c: 3 },
    ],
  },
];
