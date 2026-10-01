// Level definitions. Maps are written as two grids: tile types and heights.
//   g grass   s stone   w water   l lava   p pillar   x shrine
const TYPE = { g: 'grass', s: 'stone', w: 'water', l: 'lava', p: 'pillar', x: 'shrine' };

function parseMap(types, heights) {
  const t = types.trim().split('\n').map(r => r.trim().split(/\s+/));
  const h = heights.trim().split('\n').map(r => r.trim().split(/\s+/).map(Number));
  return t.map((row, r) => row.map((ch, c) => ({ type: TYPE[ch], h: h[r][c] })));
}

export const LEVELS = [
  {
    id: 'round-1',
    name: 'Round 1 — Arena of Ash',
    board: 'Proving Grounds',
    mission: 'Rout: KO every member of Team Crimson Fang.',
    intro: [
      { who: 'Varg the Red', text: 'A substitute team? The Grand Board must be desperate.' },
      { who: 'Kai', text: 'Keep talking. It makes you easier to find.' },
    ],
    tiles: parseMap(`
      s s s g g g g g g g
      s s s g g g w w g g
      s s s g p g w w g g
      g g g g g g g g g l
      g g p g x g g g l l
      g w w g g g p g g g
      g w w g g g g g g g
      g g g g p g g s s s
      g g g g g g g s s s
      g g g g g g g s s s
    `, `
      2 2 2 1 1 0 0 0 0 0
      2 2 2 1 1 0 0 0 0 0
      2 2 2 1 3 0 0 0 0 0
      1 1 1 1 0 0 0 0 1 0
      1 1 3 0 1 0 0 0 0 0
      0 0 0 0 0 0 3 0 1 1
      0 0 0 0 0 0 0 1 1 1
      0 0 0 0 3 0 1 2 2 2
      0 0 0 0 0 0 1 2 2 2
      0 0 0 0 0 0 1 2 2 2
    `),
    heroes: [
      { id: 'kai', r: 7, c: 7 },
      { id: 'goro', r: 7, c: 8 },
      { id: 'nyx', r: 8, c: 7 },
      { id: 'sora', r: 8, c: 9 },
      { id: 'rin', r: 9, c: 8 },
    ],
    enemies: [
      { id: 'varg', r: 1, c: 1 },
      { id: 'imp', r: 0, c: 2 },
      { id: 'imp', r: 2, c: 0 },
      { id: 'brute', r: 2, c: 2 },
      { id: 'gargoyle', r: 1, c: 2 },
    ],
  },
];
