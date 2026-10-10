// Endless Arena: survive wave after wave on one arena map.
// Rewards are banked after every wave cleared; KO'd heroes stay down until the run ends.
import { parseMap } from './levels.js';
import { LEVELS } from './levels.js';
import { heroInfo, writeSave } from './progress.js';
import { xpToNext, MAX_LEVEL } from './data.js';
import { createUnit } from './rules.js';

export const ENDLESS_UNLOCK = 'hills'; // clear 1-2 to open the arena
export const BOSS_EVERY = 5;
export const WAVE_HEAL = 0.3; // survivors recover 30% max HP between waves
export const WAVE_SP = 20;
const BOSSES = ['varg', 'ignis'];

export const ARENA = {
  id: 'endless',
  name: 'Endless Arena',
  stage: 'Arena',
  board: 'Endless Arena',
  mission: 'Survive wave after wave. Rewards are banked after every wave. Survivors heal 30% between waves, but KO’d heroes stay down until the run ends. A champion arrives every 5th wave.',
  missionType: { type: 'endless', wave: 1 },
  tiles: parseMap(`
    .. .. .. .. s2 s2 s2 s2 s2 s2 s2 .. .. .. ..
    .. .. g1 g1 s1 s1 s1 s1 s1 s1 s1 g1 g1 .. ..
    .. g1 g1 T1 s1 a1 a1 a1 a1 a1 s1 T1 g1 g1 ..
    .. g1 s2 s2 p3 a1 a1 a1 a1 a1 p3 s2 s2 g1 ..
    g1 g1 s2 s2 s1 a1 s1 s1 s1 a1 s1 s2 s2 g1 g1
    g1 s1 s1 s1 a1 a1 s1 s1 s1 a1 a1 s1 s1 s1 g1
    g1 s1 a1 a1 a1 s1 s2 s2 s2 s1 a1 a1 a1 s1 g1
    g1 s1 a1 p3 a1 s1 s2 x2 s2 s1 a1 p3 a1 s1 g1
    g1 s1 a1 a1 a1 s1 s2 s2 s2 s1 a1 a1 a1 s1 g1
    g1 s1 s1 s1 a1 a1 s1 s1 s1 a1 a1 s1 s1 s1 g1
    g1 g1 s2 s2 s1 a1 s1 s1 s1 a1 s1 s2 s2 g1 g1
    .. g1 s2 s2 p3 a1 a1 a1 a1 a1 p3 s2 s2 g1 ..
    .. g1 g1 T1 s1 s1 s1 s1 s1 s1 s1 T1 g1 g1 ..
    .. .. g1 g1 s1 s1 s1 s1 s1 s1 s1 g1 g1 .. ..
    .. .. .. .. s1 s1 s1 s1 s1 s1 s1 .. .. .. ..
  `),
  spawns: [{ r: 13, c: 7 }, { r: 13, c: 6 }, { r: 13, c: 8 }, { r: 12, c: 6 }, { r: 12, c: 8 }],
  enemySpawns: [{ r: 1, c: 7 }, { r: 1, c: 5 }, { r: 1, c: 9 }, { r: 2, c: 4 }, { r: 2, c: 10 }, { r: 1, c: 6 }, { r: 1, c: 8 }, { r: 0, c: 7 }],
  enemies: [],
  intro: [],
};

export const isEndlessUnlocked = save => !!save.cleared[ENDLESS_UNLOCK];
export const endlessRecord = save => save.endless ?? { best: 0, runs: 0 };

// Enemies you've met in the campaign (only those can show up), bosses excluded.
export function arenaPool(save) {
  const seen = new Set(LEVELS.filter(l => save.cleared[l.id]).flatMap(l => l.enemies.map(e => e.id)));
  const pool = [...seen].filter(id => !BOSSES.includes(id));
  return pool.length ? pool : ['imp', 'brute'];
}

// Average level of the squad you start the run with.
export const squadLevel = (save, ids) => Math.max(1, Math.round(ids.reduce((a, id) => a + heroInfo(save, id).lv, 0) / Math.max(1, ids.length)));

// Deterministic-ish wave builder. `rnd` lets tests and sims pass a seeded RNG.
export function makeWave(n, { teamLv, pool, bossesSeen = [], rnd = Math.random }) {
  const count = Math.min(3 + Math.floor((n - 1) / 2), 7);
  const lv = Math.max(1, teamLv - 1 + Math.floor((n - 1) / 2));
  const spots = ARENA.enemySpawns;
  const enemies = [];
  const boss = n % BOSS_EVERY === 0;
  if (boss) {
    const id = n >= 10 && bossesSeen.includes('ignis') ? 'ignis' : bossesSeen.includes('varg') ? 'varg' : 'brute';
    enemies.push({ id, lv, mult: id === 'ignis' ? 0.9 : 1.1, name: 'Arena Champion', leader: true, ai: 'charge', r: spots[7].r, c: spots[7].c, facing: { dr: 1, dc: 0 } });
  }
  // A champion replaces one of the regular enemies.
  for (let k = 0; enemies.length < count && k < spots.length - 1; k++) {
    const id = pool[Math.floor(rnd() * pool.length)];
    enemies.push({ id, lv, ai: 'charge', r: spots[k].r, c: spots[k].c, facing: { dr: 1, dc: 0 } });
  }
  return enemies;
}

export function waveRewards(n) {
  const boss = n % BOSS_EVERY === 0;
  return { gold: (25 + 10 * n) * (boss ? 2 : 1), xp: 20 + 8 * n };
}

// Bank one cleared wave: gold, XP for everyone who started the run, and the record.
export function awardWave(save, n, squadIds) {
  const { gold, xp } = waveRewards(n);
  save.gold = (save.gold ?? 0) + gold;
  const levelUps = [];
  for (const id of squadIds) {
    const h = { ...heroInfo(save, id) };
    const from = h.lv;
    h.xp += xp;
    while (h.xp >= xpToNext(h.lv) && h.lv < MAX_LEVEL) { h.xp -= xpToNext(h.lv); h.lv++; }
    if (h.lv >= MAX_LEVEL) h.xp = 0;
    save.heroes[id] = h;
    levelUps.push({ id, from, to: h.lv, xp: h.xp });
  }
  const rec = endlessRecord(save);
  const newBest = n > rec.best;
  save.endless = { ...rec, best: Math.max(rec.best, n) };
  save.lastSquad = squadIds;
  writeSave(save);
  return { gold, xp, levelUps, newBest };
}

export function startRun(save) {
  save.endless = { ...endlessRecord(save), runs: endlessRecord(save).runs + 1 };
  writeSave(save);
}

// Prepare the same battle state for wave `n`: survivors heal and regroup, new enemies arrive.
export function setupWave(state, n, enemies, { mult = 1 } = {}) {
  state.units = state.units.filter(u => u.alive && u.team === 'hero');
  state.units.forEach((u, i) => {
    const s = ARENA.spawns[i];
    u.r = s.r; u.c = s.c; u.facing = { dr: -1, dc: 0 };
    u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * WAVE_HEAL));
    u.sp = Math.min(100, u.sp + WAVE_SP);
    u.moved = false; u.acted = false;
  });
  for (const e of enemies) {
    state.units.push(Object.assign(
      createUnit(e.id, 'enemy', e.r, e.c, e.facing, { lv: e.lv, mult: mult * (e.mult ?? 1) }),
      { ai: e.ai ?? 'charge', aggro: 99 },
      e.leader ? { leader: true } : {},
      e.name ? { name: e.name } : {}));
  }
  state.turn = 1;
  state.phase = 'hero';
  state.alert = true;
  state.mission = { type: 'endless', wave: n };
  return state;
}
