// Level definitions.
//
// Maps are one grid of 2-character cells: tile type + height (0-9), or ".." for
// empty space (the edge of the island). Types:
//   g grass   s stone   d dirt path   a sand   w water   b bridge
//   l lava    x shrine  p pillar      T tree   R rock
const TYPE = {
  g: 'grass', s: 'stone', d: 'dirt', a: 'sand', w: 'water', b: 'bridge',
  l: 'lava', x: 'shrine', p: 'pillar', T: 'tree', R: 'rock',
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
    id: 'round-1',
    name: 'Round 1 — Ruins of Ash',
    board: 'Proving Grounds',
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
    heroes: [
      { id: 'kai', r: 15, c: 11 },
      { id: 'goro', r: 15, c: 12 },
      { id: 'nyx', r: 15, c: 10 },
      { id: 'sora', r: 17, c: 12 },
      { id: 'rin', r: 16, c: 11 },
    ],
    enemies: [
      { id: 'varg', r: 3, c: 5, ai: 'guard', aggro: 8 },
      { id: 'imp', r: 6, c: 4, ai: 'guard', aggro: 7 },
      { id: 'imp', r: 5, c: 8, ai: 'guard', aggro: 7 },
      { id: 'brute', r: 7, c: 6 },
      { id: 'gargoyle', r: 6, c: 12 },
      { id: 'imp', r: 8, c: 3 },
    ],
  },
];
