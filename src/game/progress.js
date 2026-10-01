// Campaign progress: unlocked heroes, hero levels/XP and cleared stages.
// Saved in localStorage on this device.
import { LEVELS } from './levels.js';
import { XP_PER_LEVEL, MAX_LEVEL } from './data.js';

const KEY = 'gambit-arena:save';
export const STARTING_HEROES = ['kai', 'goro', 'rin', 'sora'];
export const REPLAY_XP = 0.6; // replaying a cleared stage gives 60% XP

export function newSave() {
  return { unlocked: [...STARTING_HEROES], heroes: {}, cleared: {}, lastSquad: [...STARTING_HEROES] };
}

export function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && Array.isArray(raw.unlocked)) return { ...newSave(), ...raw };
  } catch { /* private mode or bad data */ }
  return newSave();
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return newSave();
}

export const heroInfo = (save, id) => save.heroes[id] ?? { lv: 1, xp: 0 };

export function isStageUnlocked(save, index) {
  return index === 0 || !!save.cleared[LEVELS[index - 1].id];
}

// Give XP to everyone who fought, unlock new heroes on a first clear.
// Returns what happened so the results screen can show it.
export function awardVictory(save, level, squadIds) {
  const firstClear = !save.cleared[level.id];
  const xp = Math.round((level.xp ?? 100) * (firstClear ? 1 : REPLAY_XP));
  const levelUps = [];
  for (const id of squadIds) {
    const h = { ...heroInfo(save, id) };
    const from = h.lv;
    h.xp += xp;
    while (h.xp >= XP_PER_LEVEL && h.lv < MAX_LEVEL) { h.xp -= XP_PER_LEVEL; h.lv++; }
    if (h.lv >= MAX_LEVEL) h.xp = 0;
    save.heroes[id] = h;
    levelUps.push({ id, from, to: h.lv, xp: h.xp });
  }
  const joined = firstClear ? (level.joins ?? []).filter(id => !save.unlocked.includes(id)) : [];
  save.unlocked.push(...joined);
  // Recruits arrive ready for the next stage instead of at level 1.
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const joinLv = nextLevel?.heroLevel ?? (level.heroLevel ?? 1) + 1;
  for (const id of joined) if (!save.heroes[id]) save.heroes[id] = { lv: joinLv, xp: 0 };
  save.cleared[level.id] = true;
  save.lastSquad = squadIds;
  writeSave(save);
  return { xp, firstClear, levelUps, joined };
}
