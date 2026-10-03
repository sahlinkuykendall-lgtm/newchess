// Level definitions.
//
// Maps are one grid of 2-character cells: tile type + height (0-9), or ".." for
// empty space (the edge of the island). Types:
//   g grass   s stone   d dirt path   a sand   w water   b bridge
//   l lava    x shrine  p pillar      T tree   R rock (on grass)
//   O obsidian rock (on ash)          Q boulder (on stone)
//   h ash ground                      V basalt column (tall, blocks)
const TYPE = {
  g: 'grass', s: 'stone', d: 'dirt', a: 'sand', w: 'water', b: 'bridge',
  l: 'lava', x: 'shrine', p: 'pillar', T: 'tree', R: 'rock', O: 'obsidian', Q: 'boulder',
  h: 'ash', V: 'basalt',
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
    boardNo: 1,
    mission: 'Rout: KO all three qualifier enemies. They attack together once they spot you.',
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
    gold: 120,
    joins: ['nyx'],
    outro: [
      { who: 'Nyx', text: 'Not bad. I’m on your team now.' },
      { who: 'Kai', text: 'Wait — who ARE you?' },
    ],
    enemies: [
      { id: 'imp', lv: 1, r: 2, c: 6, ai: 'hold', aggro: 8 },
      { id: 'imp', lv: 1, r: 2, c: 8, ai: 'hold', aggro: 8 },
      { id: 'brute', lv: 1, r: 5, c: 8, ai: 'hold', aggro: 8 },
    ],
  },
  {
    id: 'hills',
    name: 'Windmill Hills',
    stage: '1-2',
    board: 'Proving Grounds',
    boardNo: 1,
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
    xp: 120,
    gold: 150,
    joins: ['aiko', 'pip'],
    outro: [
      { who: 'Aiko', text: 'I’m Aiko — captain of the human team. My shoulder’s healed. Mind if I take my spot back?' },
      { who: 'Pip', text: 'And I’m Pip! I build bombs! Small ones! Mostly!' },
    ],
    enemies: [
      { id: 'gargoyle', lv: 2, r: 5, c: 14 },
      { id: 'gargoyle', lv: 2, r: 2, c: 13 },
      { id: 'imp', lv: 3, r: 7, c: 6, ai: 'guard', aggro: 7 },
      { id: 'imp', lv: 3, r: 8, c: 2, ai: 'guard', aggro: 7 },
      { id: 'brute', lv: 4, r: 10, c: 5, ai: 'hold', aggro: 8 },
      { id: 'imp', lv: 3, r: 11, c: 4, ai: 'hold', aggro: 8 },
    ],
  },
  {
    id: 'pits',
    name: 'Ember Pits',
    stage: '1-3',
    board: 'Proving Grounds',
    boardNo: 1,
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
    xp: 140,
    gold: 180,
    joins: ['hana'],
    outro: [
      { who: 'Hana', text: 'Big brother!! I snuck in! Don’t be mad, I brought my fan!' },
      { who: 'Kai', text: 'HANA?! …Fine. Stay next to me. Always.' },
    ],
    enemies: [
      { id: 'imp', lv: 4, r: 5, c: 11, ai: 'hold', aggro: 9 },
      { id: 'imp', lv: 4, r: 3, c: 13, ai: 'hold', aggro: 9 },
      { id: 'imp', lv: 4, r: 13, c: 6, ai: 'hold', aggro: 9 },
      { id: 'gargoyle', lv: 6, r: 6, c: 8 },
      { id: 'gargoyle', lv: 6, r: 9, c: 2, ai: 'hold', aggro: 9 },
      { id: 'brute', lv: 6, r: 3, c: 3, ai: 'hold', aggro: 9 },
    ],
  },
  {
    id: 'mire',
    name: 'Mirewood',
    stage: '1-4',
    board: 'Proving Grounds',
    boardNo: 1,
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
    xp: 160,
    gold: 210,
    joins: ['mako'],
    outro: [
      { who: 'Mako', text: 'Ha! You lot fight like a storm. Name’s Mako. I’ll lend you my blade for the final.' },
    ],
    enemies: [
      { id: 'brute', lv: 5, r: 8, c: 9, ai: 'hold', aggro: 9 },
      { id: 'brute', lv: 5, r: 3, c: 12, ai: 'hold', aggro: 9 },
      { id: 'gargoyle', lv: 5, r: 2, c: 15 },
      { id: 'gargoyle', lv: 5, r: 9, c: 16 },
      { id: 'imp', lv: 5, r: 3, c: 5, ai: 'hold', aggro: 9 },
      { id: 'imp', lv: 5, r: 8, c: 13, ai: 'hold', aggro: 9 },
    ],
  },
  {
    id: 'ruins',
    name: 'Ruins of Ash',
    stage: '1-5',
    board: 'Proving Grounds',
    boardNo: 1,
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
    xp: 180,
    gold: 300,
    enemies: [
      { id: 'varg', lv: 6, r: 3, c: 5, ai: 'guard', aggro: 8 },
      { id: 'imp', lv: 5, r: 6, c: 4, ai: 'guard', aggro: 7 },
      { id: 'imp', lv: 5, r: 5, c: 8, ai: 'guard', aggro: 7 },
      { id: 'brute', lv: 6, r: 7, c: 6, ai: 'hold', aggro: 9 },
      { id: 'gargoyle', lv: 6, r: 6, c: 12 },
      { id: 'gargoyle', lv: 5, r: 8, c: 2, ai: 'hold', aggro: 9 },
      { id: 'imp', lv: 5, r: 8, c: 3, ai: 'hold', aggro: 9 },
    ],
  },

  // ============================================================ Board 2
  {
    id: 'ashroad',
    name: 'Ash Road',
    stage: '2-1',
    board: 'Ember Wastes',
    boardNo: 2,
    mission: 'Rout: hellhounds hunt in packs — they hit harder when two reach the same hero.',
    intro: [
      { who: 'Aiko', text: 'The Ember Wastes. Ignis rules here — the Ember Tyrant. Varg was just his gatekeeper.' },
      { who: 'Sora', text: 'Hellhounds. Never let two of them get next to the same person.' },
      { who: 'Kai', text: 'Then we hit them first.' },
    ],
    tiles: parseMap(`
      .. .. .. h1 h1 h1 .. .. h1 h1 h1 h1 .. .. .. .. .. ..
      .. .. .. .. h1 h1 h2 h2 h2 h2 h2 h2 .. h1 h1 h1 .. ..
      h1 .. .. .. h1 h1 h2 h2 h2 h2 h2 h2 h1 V3 h1 h1 .. ..
      .. h1 h1 V3 h1 h1 h2 h2 h2 h2 h2 h2 h1 h1 h1 h1 h1 ..
      .. h1 h1 h1 h1 h1 h1 h1 h1 O1 h1 h1 h1 h1 h1 h1 h1 h1
      h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 V3 h1 h1 ..
      h1 h1 h1 O1 h1 h1 h1 h1 V3 l0 l0 l0 s1 h1 h1 h1 h1 h1
      .. h1 h1 h1 h1 h1 h1 l0 l0 l0 l0 l0 s1 l0 h1 h1 h1 h1
      l0 l0 h1 h1 h1 h1 l0 l0 l0 h1 h1 h1 h1 l0 l0 l0 h1 h1
      l0 l0 l0 l0 s1 l0 l0 h1 h1 h1 h1 h1 h1 h1 l0 l0 l0 l0
      h1 h1 l0 l0 s1 l0 h1 V3 h1 h1 h1 h1 h1 h1 h1 h1 l0 l0
      h1 h1 V3 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1
      h1 h1 h1 h1 h1 h1 h1 h1 h1 O1 h1 h1 h1 h1 h1 V3 h1 ..
      h1 h1 h1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 h1 h1 h1 h1 ..
      .. h1 h1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 V3 h1 h1 h1 ..
      .. h1 x1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 h1 h1 h1 h1 ..
      .. h1 h1 .. .. h1 s1 s1 s1 s1 s1 s1 h1 h1 h1 h1 .. ..
      .. .. .. .. .. h1 h1 h1 h1 .. .. h1 h1 h1 .. .. .. ..
    `),
    spawns: [{ r: 14, c: 8 }, { r: 14, c: 9 }, { r: 14, c: 7 }, { r: 15, c: 8 }, { r: 15, c: 9 }],
    party: ['kai', 'goro', 'rin', 'sora', 'aiko'],
    heroLevel: 6,
    xp: 200,
    gold: 320,
    outro: [
      { who: 'Rin', text: 'That woman in the back — she was healing them. An Ash Witch.' },
      { who: 'Mako', text: 'Then next time, we cut the healer first.' },
    ],
    enemies: [
      { id: 'hound', lv: 7, r: 2, c: 7 },
      { id: 'hound', lv: 7, r: 2, c: 9 },
      { id: 'hound', lv: 7, r: 5, c: 12 },
      { id: 'witch', lv: 7, r: 1, c: 8, ai: 'hold', aggro: 9 },
      { id: 'golem', lv: 8, r: 3, c: 10, ai: 'hold', aggro: 8 },
      { id: 'imp', lv: 7, r: 5, c: 2, ai: 'hold', aggro: 9 },
    ],
  },
  {
    id: 'kennels',
    name: 'Hound Kennels',
    stage: '2-2',
    board: 'Ember Wastes',
    boardNo: 2,
    mission: 'Checkmate: KO the Pack Alpha (👑). The rest don’t matter.',
    missionType: { type: 'checkmate' },
    intro: [
      { who: 'Nyx', text: 'The Pack Alpha sleeps in the back of the kennels. Kill it and the pack scatters.' },
      { who: 'Goro', text: 'We don’t need to fight every dog. Just the big one.' },
    ],
    tiles: parseMap(`
      .. .. .. .. h1 h1 h1 h1 h1 h1 .. .. h1 h1 h1 .. .. ..
      .. .. .. s2 s2 s2 s2 s2 V4 s3 s3 s3 s3 s3 s3 .. .. ..
      .. h1 s2 s2 s2 s2 s2 s2 s2 s3 s3 s3 s3 s3 s3 s3 h1 ..
      h1 h1 s2 s2 s2 s2 s2 s2 V4 s3 s3 s3 s3 s3 s3 s3 h1 ..
      h1 h1 V4 V4 V4 s2 s2 V4 V4 V4 V4 s2 s2 V4 V4 V4 h1 ..
      .. h1 s2 s2 s2 s2 s2 s2 V4 s2 s2 s2 s2 s2 s2 s2 h1 h1
      .. h1 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 h1 h1
      h1 h1 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 s2 h1 h1
      h1 h1 s2 s2 s2 s2 s2 s2 V4 s2 s2 s2 s2 s2 s2 s2 h1 h1
      .. h1 h1 h1 h1 d1 d1 h1 h1 h1 h1 d1 d1 h1 h1 h1 h1 h1
      h1 h1 h1 h1 h1 h1 h1 h1 h1 O1 h1 h1 h1 h1 h1 h1 h1 h1
      h1 h1 h1 O1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 l0 ..
      h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 O1 h1 h1 ..
      .. h1 h1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 h1 h1 h1 h1 h1
      h1 h1 O1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 h1 h1 h1 h1 ..
      .. h1 h1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 h1 l0 h1 h1 ..
      .. .. h1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 l0 .. .. .. ..
      .. .. h1 h1 .. .. .. h1 h1 h1 h1 h1 h1 .. .. .. .. ..
    `),
    spawns: [{ r: 14, c: 8 }, { r: 14, c: 9 }, { r: 14, c: 7 }, { r: 15, c: 8 }, { r: 15, c: 9 }],
    party: ['kai', 'goro', 'rin', 'nyx', 'aiko'],
    heroLevel: 7,
    xp: 220,
    gold: 360,
    enemies: [
      { id: 'hound', name: 'Pack Alpha', lv: 11, mult: 1.5, r: 2, c: 12, leader: true, ai: 'guard', aggro: 6 },
      { id: 'hound', lv: 8, r: 6, c: 4 },
      { id: 'hound', lv: 8, r: 6, c: 13 },
      { id: 'hound', lv: 8, r: 2, c: 4, ai: 'hold', aggro: 9 },
      { id: 'hound', lv: 8, r: 7, c: 9 },
      { id: 'witch', lv: 7, r: 2, c: 14, ai: 'guard', aggro: 7 },
    ],
  },
  {
    id: 'caldera',
    name: 'Witch’s Caldera',
    stage: '2-3',
    board: 'Ember Wastes',
    boardNo: 2,
    mission: 'Rout: two Ash Witches keep the golems alive. Break through the ridge.',
    intro: [
      { who: 'Pip', text: 'Magma Golems! Don’t punch them — anyone who hits them up close gets burned!' },
      { who: 'Hana', text: 'And the witches heal them. Ugh. Fan them first!' },
    ],
    tiles: parseMap(`
      .. .. .. .. h1 h1 .. .. h1 h1 h1 h1 .. .. .. .. .. ..
      .. .. .. .. h1 h1 h1 h1 h1 h1 h1 h1 .. .. h1 h1 .. ..
      .. .. .. .. h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 .. ..
      .. .. h1 h1 h1 h1 h1 h1 d2 h1 h1 h1 h1 h1 h1 O1 .. ..
      .. h1 h1 h1 h1 h1 h1 h3 d2 h3 h3 h1 h1 h1 h1 h1 h1 h1
      h1 h1 h1 h1 h1 h3 h3 h3 h3 h3 h3 h3 h3 h1 h1 h1 h1 h1
      .. h1 h1 h1 h1 h3 V5 d1 d1 d1 d1 V5 h3 h1 h1 h1 h1 h1
      .. h1 h1 h1 h3 h3 d1 d1 d1 d1 d1 d1 h3 h3 h1 h1 h1 h1
      .. h1 h1 d2 d2 h3 d1 d1 x1 l0 d1 d1 h3 V5 h1 h1 h1 h1
      h1 h1 h1 h1 h3 h3 d1 d1 d1 l0 d1 d1 h3 h3 h1 h1 h1 ..
      h1 h1 h1 h1 h3 h3 d1 d1 d1 d1 d1 d1 h3 h3 h1 h1 .. ..
      h1 h1 h1 h1 h1 h3 V5 d1 d1 d1 d1 V5 h3 h1 h1 O1 h1 h1
      h1 h1 h1 h1 h1 h3 h3 h3 h3 d2 h3 h3 h3 h1 h1 h1 h1 ..
      h1 h1 h1 h1 h1 h1 h1 h3 V5 d2 h3 h1 h1 h1 h1 h1 h1 ..
      .. .. h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 s1 s1 s1 s1 h1 ..
      .. .. h1 O1 h1 h1 h1 h1 h1 h1 h1 h1 s1 s1 .. s1 h1 ..
      .. .. h1 .. .. .. h1 h1 h1 h1 h1 h1 s1 s1 .. .. .. ..
      .. .. .. .. .. .. h1 h1 h1 .. .. h1 h1 h1 .. .. .. ..
    `),
    spawns: [{ r: 14, c: 13 }, { r: 14, c: 12 }, { r: 14, c: 14 }, { r: 15, c: 12 }, { r: 15, c: 13 }],
    party: ['kai', 'goro', 'rin', 'sora', 'pip'],
    heroLevel: 8,
    xp: 240,
    gold: 400,
    enemies: [
      { id: 'witch', lv: 7, r: 5, c: 8, ai: 'hold', aggro: 9 },
      { id: 'witch', lv: 7, r: 10, c: 7, ai: 'hold', aggro: 9 },
      { id: 'golem', lv: 6, r: 7, c: 7, ai: 'hold', aggro: 8 },
      { id: 'golem', lv: 6, r: 9, c: 10, ai: 'hold', aggro: 8 },
      { id: 'hound', lv: 7, r: 4, c: 13 },
      { id: 'gargoyle', lv: 7, r: 12, c: 3 },
    ],
  },
  {
    id: 'pass',
    name: 'Obsidian Pass',
    stage: '2-4',
    board: 'Ember Wastes',
    boardNo: 2,
    mission: 'Survive 5 turns: hold the ridge while the Tyrant’s army charges up the canyon.',
    missionType: { type: 'survive', turns: 5 },
    intro: [
      { who: 'Aiko', text: 'Ignis sent his whole army down the pass. We only have to hold the high ground for five turns.' },
      { who: 'Goro', text: 'A narrow canyon. Good. Let them come one at a time.' },
    ],
    tiles: parseMap(`
      .. .. .. .. V4 h1 h1 h1 h1 h1 h1 V4 .. V5 V5 ..
      .. V5 V5 V5 V4 h1 h1 h1 h1 h1 h1 V4 V5 V5 V5 ..
      .. V5 V5 V4 h1 h1 h1 h1 h1 h1 h1 h1 V4 V5 V5 V5
      V5 V5 V5 V4 h1 h1 h1 h1 h1 l0 h1 h1 V4 V5 V5 V5
      V5 V5 V5 V4 h1 h1 h1 h1 O1 h1 h1 h1 V4 V5 V5 V5
      V5 V5 V5 V5 V4 h1 h1 h1 h1 h1 h1 V4 V5 V5 V5 V5
      V5 V5 V5 V5 V4 h1 h1 O1 h1 h1 h1 V4 V5 V5 V5 V5
      V5 V5 V5 V5 V4 h1 h1 h1 h1 h1 h1 V4 V5 V5 V5 V5
      V5 V5 V5 V5 V5 l0 l0 h1 h1 h1 V4 V5 V5 V5 V5 V5
      V5 V5 V5 V5 V5 V4 h1 h1 h1 h1 V4 V5 V5 V5 V5 V5
      V5 V5 V5 V5 V5 V4 O1 h1 h1 h1 V4 V5 V5 V5 V5 V5
      V5 V5 V5 V5 V5 V4 h1 h1 h1 h1 V4 V5 V5 V5 V5 V5
      V5 V5 V5 V5 V4 h1 h1 h1 h1 O1 h1 V4 V5 V5 V5 V5
      V5 V5 V5 V5 V4 h1 h1 h1 h1 h1 h1 V4 V5 V5 V5 V5
      V5 V5 V5 V5 V4 h2 h2 h2 h2 h2 h2 V4 V5 V5 V5 V5
      V5 V5 V5 V4 h2 h2 h2 h2 h2 h2 h2 h2 V4 V5 V5 V5
      .. V5 V5 V4 h2 h2 h2 h2 h2 h2 h2 h2 V4 V5 V5 ..
      .. V5 V5 V4 h3 s3 s3 s3 s3 s3 s3 h3 V4 V5 V5 ..
      .. V5 V5 V5 V4 s3 s3 x3 s3 s3 s3 V4 V5 V5 V5 ..
      .. .. .. V5 V4 s3 s3 s3 s3 s3 s3 V4 V5 V5 .. ..
    `),
    spawns: [{ r: 17, c: 7 }, { r: 17, c: 8 }, { r: 17, c: 6 }, { r: 18, c: 7 }, { r: 18, c: 8 }],
    party: ['goro', 'rin', 'sora', 'mako', 'aiko'],
    heroLevel: 9,
    xp: 260,
    gold: 440,
    enemies: [
      { id: 'hound', lv: 9, r: 3, c: 6 },
      { id: 'hound', lv: 9, r: 3, c: 8 },
      { id: 'hound', lv: 9, r: 5, c: 7 },
      { id: 'golem', lv: 9, r: 1, c: 7 },
      { id: 'witch', lv: 8, r: 1, c: 6 },
      { id: 'witch', lv: 8, r: 1, c: 9 },
      { id: 'imp', lv: 8, r: 6, c: 9 },
      { id: 'imp', lv: 8, r: 7, c: 5 },
    ],
  },
  {
    id: 'throne',
    name: 'Tyrant’s Throne',
    stage: '2-5',
    board: 'Ember Wastes',
    boardNo: 2,
    boss: true,
    mission: 'Rout: Ignis takes 30% less damage while any minion stands. Clear his guard first.',
    intro: [
      { who: 'Ignis', text: 'Varg. My hounds. My witches. And still you crawl to my throne?' },
      { who: 'Kai', text: 'Yeah. And you’re next.' },
      { who: 'Ignis', text: 'Then burn, little pawn.' },
    ],
    tiles: parseMap(`
      .. .. .. .. h1 h1 .. .. .. h1 h1 h1 .. .. .. .. .. .. .. ..
      .. .. .. .. h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 .. .. ..
      .. h1 .. .. h1 l0 l0 l0 l0 l0 l0 l0 l0 l0 l0 h1 h1 .. .. ..
      .. .. h1 h1 h1 l0 l0 l0 l0 l0 l0 l0 l0 l0 l0 h1 h1 h1 h1 ..
      .. h1 h1 h1 h1 l0 l0 V6 s4 s4 s4 s4 V6 l0 l0 h1 h1 h1 h1 ..
      .. h1 h1 h1 h1 l0 l0 s4 s4 s4 s4 s4 s4 l0 l0 h1 h1 h1 h1 ..
      h1 h1 h1 h1 h1 s2 s3 s4 s4 s4 s4 s4 s4 s3 s2 h1 h1 h1 h1 h1
      .. h1 h1 h1 h1 s2 s3 s4 s4 s4 s4 s4 s4 s3 s2 h1 h1 h1 h1 h1
      h1 h1 h1 h1 h1 l0 l0 V6 s4 s4 s4 s4 V6 l0 l0 h1 h1 h1 h1 h1
      h1 h1 h1 h1 h1 l0 l0 s4 s4 s3 s3 s4 s4 l0 l0 h1 h1 h1 h1 h1
      h1 h1 h1 h1 h1 l0 l0 l0 l0 s2 s2 l0 l0 l0 l0 h1 h1 h1 h1 h1
      h1 h1 h1 h1 h1 l0 l0 l0 l0 s2 s2 l0 l0 l0 l0 V3 h1 h1 h1 h1
      h1 h1 h1 V3 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 ..
      h1 h1 h1 h1 h1 h1 O1 h1 h1 h1 h1 h1 h1 O1 h1 h1 V3 h1 h1 ..
      .. h1 h1 h1 h1 h1 h1 h1 h1 V3 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1
      .. h1 h1 h1 V3 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 h1 ..
      .. h1 O1 h1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 h1 h1 h1 O1 .. ..
      .. .. x1 h1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 h1 h1 h1 .. .. ..
      .. .. .. h1 h1 h1 h1 s1 s1 s1 s1 s1 s1 h1 h1 .. .. .. h1 ..
      .. .. .. h1 h1 .. .. .. h1 h1 h1 h1 .. .. h1 .. .. .. .. ..
    `),
    spawns: [{ r: 16, c: 9 }, { r: 16, c: 10 }, { r: 16, c: 8 }, { r: 16, c: 11 }, { r: 17, c: 9 }],
    party: ['kai', 'goro', 'rin', 'sora', 'aiko'],
    heroLevel: 10,
    xp: 280,
    gold: 600,
    outro: [
      { who: 'Kai', text: 'The Ember Tyrant… down.' },
      { who: 'Nyx', text: 'He wasn’t the one pulling the strings. Someone above him wants you gone.' },
    ],
    enemies: [
      { id: 'ignis', lv: 8, r: 6, c: 9, leader: true, ai: 'guard', aggro: 5 },
      { id: 'golem', lv: 7, r: 8, c: 9, ai: 'guard', aggro: 6 },
      { id: 'golem', lv: 7, r: 8, c: 10, ai: 'guard', aggro: 6 },
      { id: 'witch', lv: 7, r: 5, c: 8, ai: 'guard', aggro: 8 },
      { id: 'witch', lv: 7, r: 5, c: 11, ai: 'guard', aggro: 8 },
      { id: 'hound', lv: 7, r: 12, c: 5 },
      { id: 'hound', lv: 7, r: 12, c: 14 },
    ],
  },
];
