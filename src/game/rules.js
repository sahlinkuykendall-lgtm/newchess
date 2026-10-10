// Pure game rules. No DOM access here so it can be unit-tested in Node.
import { UNITS, SKILLS, BASIC_ATTACK, GROWTH, aspectMult } from './data.js';
import { gearBonus } from './items.js';

export const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
export const DIAGS = [[-1, -1], [-1, 1], [1, 1], [1, -1]];
export const DIRS8 = [...DIRS, ...DIAGS];
export const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
export const SP_MAX = 100;
export const SP_PER_TURN = 10;
export const SP_ON_HIT = 10;
export const SP_ON_HURT = 8;
export const SP_ON_ASSIST = 5;
export const ASSIST_POWER = 0.5;
export const DEFAULT_BACKSTAB = 1.5;
export const MELEE_HEIGHT = 2;
export const LAVA_DAMAGE = 10;
export const SHRINE_HEAL = 0.15;
// Passive tuning
export const BURNING_SPIRIT_SP = 5;
export const TIDAL_GRACE_HEAL = 6;
export const BLOODLUST_HEAL = 15;
export const SLUDGE_RANGED = 0.75;
export const DAWNBREAKER = 1.25;
export const RIPOSTE_POWER = 0.6;
export const SIBLING_BOND = 1.2;
export const DIFFICULTY = { easy: 0.85, normal: 1, hard: 1.15 };
export const PACK_HUNTER = 1.25;
export const CINDER_VEIL = 0.75;
export const MOLTEN_BURN = 6;
export const TYRANT_GUARD = 0.7;

const IMPASSABLE = new Set(['water', 'pillar', 'tree', 'rock', 'obsidian', 'boulder', 'basalt']);
// Tall scenery stops arrows, bolts and beams.
export const BLOCKS_SHOTS = new Set(['pillar', 'tree', 'basalt']);
// Extra movement cost to enter these tiles (on top of 1 per tile).
export const SLOW_TILES = new Set(['sand', 'lava']);

export const key = (r, c) => `${r},${c}`;
export const manhattan = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
export const chebyshev = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));

let nextId = 1;

// Stats at a given level: base + growth per level, then a difficulty multiplier
// on HP/ATK (enemies only).
export function statsAt(templateId, lv = 1, mult = 1) {
  const t = UNITS[templateId];
  const g = lv - 1;
  return {
    hp: Math.round((t.hp + GROWTH.hp * g) * mult),
    atk: Math.round((t.atk + GROWTH.atk * g) * mult),
    def: Math.round(t.def + GROWTH.def * g),
  };
}

export function createUnit(templateId, team, r, c, facing, { lv = 1, mult = 1, gear = null } = {}) {
  const t = UNITS[templateId];
  const st = statsAt(templateId, lv, mult);
  const g = gearBonus(gear ?? {});
  return {
    id: `${templateId}-${nextId++}`,
    templateId,
    team,
    name: t.name,
    title: t.title,
    aspect: t.aspect,
    look: t.look,
    lv,
    gear: gear ?? {},
    maxHp: st.hp + g.hp,
    hp: st.hp + g.hp,
    atk: st.atk + g.atk,
    def: st.def + g.def,
    mov: t.mov + g.mov,
    jump: t.jump + g.jump,
    regen: g.regen,
    spRegen: g.spRegen,
    range: (t.attack ?? t).range,
    attack: t.attack ?? null,
    moveRule: { step: 'walk', ...(t.move ?? {}) },
    backstab: t.backstab ?? DEFAULT_BACKSTAB,
    passive: t.passive?.id ?? null,
    flier: !!t.flier,
    ai: 'charge',
    aggro: 0,
    skills: t.skills ?? [],
    ult: t.ult ?? null,
    sp: Math.min(100, 20 + g.sp),
    r, c,
    facing: facing ?? { dr: team === 'hero' ? -1 : 1, dc: 0 },
    moved: false,
    acted: false,
    alive: true,
  };
}

// squad: [{ id, lv }] placed on the level's spawn tiles in order.
// Defaults to the level's suggested party at its suggested level (used by tests).
export function createBattle(level, { squad = null, difficulty = 'normal' } = {}) {
  const tiles = level.tiles.map(row => row.map(t => (t ? { ...t } : null)));
  const party = squad ?? level.party.map(id => ({ id, lv: level.heroLevel ?? 1 }));
  const mult = DIFFICULTY[difficulty] ?? 1;
  const units = [
    ...party.slice(0, level.spawns.length).map((h, i) =>
      createUnit(h.id, 'hero', level.spawns[i].r, level.spawns[i].c, level.spawns[i].facing, { lv: h.lv, gear: h.gear })),
    ...level.enemies.map(s => Object.assign(
      createUnit(s.id, 'enemy', s.r, s.c, s.facing, { lv: s.lv ?? 1, mult: mult * (s.mult ?? 1) }),
      s.ai ? { ai: s.ai, aggro: s.aggro ?? 6 } : {},
      s.leader ? { leader: true } : {},
      s.name ? { name: s.name } : {})),
  ];
  return { map: { rows: tiles.length, cols: tiles[0].length, tiles }, units, phase: 'hero', turn: 1, alert: false, mission: level.missionType ?? { type: 'rout' } };
}

export function tileAt(state, r, c) {
  if (r < 0 || c < 0 || r >= state.map.rows || c >= state.map.cols) return null;
  return state.map.tiles[r][c];
}

// Fliers can cross water; nothing can enter empty space, pillars, trees or rocks.
export const isPassable = (tile, unit = null) =>
  !!tile && (!IMPASSABLE.has(tile.type) || (unit?.flier && tile.type === 'water'));

export function unitAt(state, r, c) {
  return state.units.find(u => u.alive && u.r === r && u.c === c) ?? null;
}

export const livingUnits = (state, team) => state.units.filter(u => u.alive && (!team || u.team === team));
export const opponentOf = team => (team === 'hero' ? 'enemy' : 'hero');

// Movement styles (unit.moveRule, from `move` in data.js):
//   step: 'walk'   — 4 directions
//         'king'   — 8 directions
//         'bishop' — diagonal steps cost 1 MOV, straight steps cost 2
//         'fly'    — 4 directions, ignores terrain cost (and water)
//   hops: n          — up to n knight leaps (L-shape, 1 MOV each, jump over anything)
//   lines: {dirs, len} — or rush in a straight line (4 or 8 ways) up to len tiles
// Terrain: sand and lava cost +1 MOV, and every level climbed costs +1.
export function stepCost(unit, from, to, diagonal = false) {
  const base = unit.moveRule?.step === 'bishop' && !diagonal ? 2 : 1;
  if (unit.flier || unit.moveRule?.step === 'fly') return base;
  return base + (SLOW_TILES.has(to.type) ? 1 : 0) + Math.max(0, to.h - from.h);
}

// Can the unit move one step from (r, c) by (dr, dc)? Returns the tile or null.
function stepTile(state, unit, r, c, dr, dc) {
  const here = tileAt(state, r, c);
  const t = tileAt(state, r + dr, c + dc);
  if (!isPassable(t, unit) || Math.abs(t.h - here.h) > unit.jump) return null;
  // No squeezing diagonally between two walls.
  if (dr && dc && !unit.flier && !isPassable(tileAt(state, r + dr, c), unit) && !isPassable(tileAt(state, r, c + dc), unit)) return null;
  const occ = unitAt(state, r + dr, c + dc);
  if (occ && occ.team !== unit.team && unit.passive !== 'lightFeet') return null;
  return t;
}

const STEP_DIRS = { walk: DIRS, fly: DIRS, king: DIRS8, bishop: DIRS8 };

// Every tile the unit can reach this turn (cheapest route first).
// Returns Map<key, {r, c, cost, prev, blocked, leap}>; blocked = an ally stands there.
export function reachable(state, unit) {
  const rule = unit.moveRule ?? { step: 'walk' };
  const hops = rule.hops ?? 0;
  const dirs = STEP_DIRS[rule.step] ?? DIRS;
  const start = { r: unit.r, c: unit.c, cost: 0, prev: null, blocked: false, leap: false, hop: 0 };
  const nodes = new Map([[key(unit.r, unit.c), start]]);
  const best = new Map([[`${unit.r},${unit.c},0`, 0]]);
  const open = [start];
  const visit = (n, r, c, cost, leap) => {
    if (cost > unit.mov) return;
    const hop = n.hop + (leap ? 1 : 0);
    const sk = `${r},${c},${hop}`;
    if (best.has(sk) && best.get(sk) <= cost) return;
    best.set(sk, cost);
    const node = { r, c, cost, prev: n, blocked: !!unitAt(state, r, c), leap, hop };
    open.push(node);
    const k = key(r, c);
    const old = nodes.get(k);
    if (!old || cost < old.cost) nodes.set(k, node);
  };
  while (open.length) {
    let i = 0;
    for (let j = 1; j < open.length; j++) if (open[j].cost < open[i].cost) i = j;
    const n = open.splice(i, 1)[0];
    if (best.get(`${n.r},${n.c},${n.hop}`) < n.cost) continue;
    const here = tileAt(state, n.r, n.c);
    for (const [dr, dc] of dirs) {
      const t = stepTile(state, unit, n.r, n.c, dr, dc);
      if (t) visit(n, n.r + dr, n.c + dc, n.cost + stepCost(unit, here, t, !!(dr && dc)), false);
    }
    if (n.hop < hops) {
      for (const [dr, dc] of KNIGHT) {
        const r = n.r + dr, c = n.c + dc;
        const t = tileAt(state, r, c);
        if (!isPassable(t, unit) || Math.abs(t.h - here.h) > unit.jump) continue;
        const occ = unitAt(state, r, c);
        if (occ && occ.team !== unit.team) continue;
        visit(n, r, c, n.cost + 1, true);
      }
    }
  }
  // Straight-line rushes from the starting tile.
  if (rule.lines) {
    for (const [dr, dc] of rule.lines.dirs === 8 ? DIRS8 : DIRS) {
      let prev = start;
      for (let i = 1; i <= rule.lines.len; i++) {
        if (!stepTile(state, unit, prev.r, prev.c, dr, dc)) break;
        const r = prev.r + dr, c = prev.c + dc;
        const node = { r, c, cost: i, prev, blocked: !!unitAt(state, r, c), leap: false, hop: 0 };
        const old = nodes.get(key(r, c));
        if (!old || (old.blocked && !node.blocked)) nodes.set(key(r, c), node);
        prev = node;
      }
    }
  }
  return nodes;
}

export function pathTo(nodes, r, c) {
  const path = [];
  for (let n = nodes.get(key(r, c)); n; n = n.prev) path.unshift({ r: n.r, c: n.c });
  return path;
}

// Grid distance (respecting jump) from every tile to the nearest goal tile.
export function distanceMap(state, unit, goals) {
  const dist = new Map();
  const queue = [];
  for (const g of goals) {
    const k = key(g.r, g.c);
    if (!dist.has(k) && isPassable(tileAt(state, g.r, g.c), unit)) { dist.set(k, 0); queue.push(g); }
  }
  const dirs = ['king', 'bishop'].includes(unit.moveRule?.step) ? DIRS8 : DIRS;
  while (queue.length) {
    const n = queue.shift();
    const d = dist.get(key(n.r, n.c));
    const here = tileAt(state, n.r, n.c);
    for (const [dr, dc] of dirs) {
      const r = n.r + dr, c = n.c + dc;
      const k = key(r, c);
      if (dist.has(k)) continue;
      const t = tileAt(state, r, c);
      if (!isPassable(t, unit) || Math.abs(t.h - here.h) > unit.jump) continue;
      const occ = unitAt(state, r, c);
      if (occ && occ.team !== unit.team) continue;
      dist.set(k, d + 1);
      queue.push({ r, c });
    }
  }
  return dist;
}

export function getAction(unit, actionId) {
  if (actionId === 'attack') return { ...BASIC_ATTACK, range: unit.range, ...(unit.attack ?? {}), id: 'attack' };
  return { ...SKILLS[actionId], id: actionId };
}

export function availableActions(unit) {
  const ids = ['attack', ...unit.skills];
  if (unit.ult) ids.push(unit.ult);
  return ids.map(id => getAction(unit, id));
}

export const canAfford = (unit, action) => unit.sp >= action.cost;

// Tiles the action can be aimed at from position `from`.
// Sora's Eagle Eye: +1 max range for ranged actions from height 2 or more.
export function actionRange(state, unit, from, action) {
  const [min, max] = action.range;
  const h = tileAt(state, from.r, from.c)?.h ?? 0;
  if (unit.passive === 'eagleEye' && max > 1 && h >= 2) return [min, max + 1];
  return [min, max];
}

// Human-readable reach, e.g. "1 tile", "2–4 tiles", "Self".
export function rangeLabel([min, max]) {
  if (max === 0) return 'Self';
  if (min === max) return `${max} tile${max > 1 ? 's' : ''}`;
  return `${min}–${max} tiles`;
}

// Every tile the unit could hit with `actionId` after moving anywhere in `nodes`.
export function threatTiles(state, unit, nodes, actionId = 'attack') {
  const action = getAction(unit, actionId);
  const out = new Map();
  for (const n of nodes.values()) {
    if (n.blocked) continue;
    for (const t of rangeTiles(state, unit, n, action)) out.set(key(t.r, t.c), t);
  }
  return [...out.values()];
}

// Attack shapes (action.shape), measured from the attacker:
//   diamond — any tile within the range (default)
//   line    — straight lines in 4 directions (rook)
//   diag    — diagonal lines (bishop)
//   star    — all 8 lines (queen)
//   knight  — the 8 L-shaped jumps
//   ring    — the 8 surrounding tiles
// Shots along lines are stopped by pillars, trees and basalt.
const LINE_DIRS = { line: DIRS, diag: DIAGS, star: DIRS8 };

export function rangeTiles(state, unit, from, action) {
  const [min, max] = actionRange(state, unit, from, action);
  const fromTile = tileAt(state, from.r, from.c);
  const shape = action.shape ?? 'diamond';
  const out = [];
  const melee = t => max !== 1 || Math.abs(t.h - fromTile.h) <= MELEE_HEIGHT;
  if (shape === 'knight' || shape === 'ring') {
    for (const [dr, dc] of shape === 'knight' ? KNIGHT : DIRS8) {
      const t = tileAt(state, from.r + dr, from.c + dc);
      if (t && (shape === 'knight' || Math.abs(t.h - fromTile.h) <= MELEE_HEIGHT)) out.push({ r: from.r + dr, c: from.c + dc });
    }
    return out;
  }
  if (LINE_DIRS[shape]) {
    for (const [dr, dc] of LINE_DIRS[shape]) {
      for (let i = 1; i <= max; i++) {
        const r = from.r + dr * i, c = from.c + dc * i;
        const t = tileAt(state, r, c);
        if (!t) continue;
        if (i >= min && melee(t)) out.push({ r, c });
        if (BLOCKS_SHOTS.has(t.type)) break;
      }
    }
    return out;
  }
  for (let r = from.r - max; r <= from.r + max; r++) {
    for (let c = from.c - max; c <= from.c + max; c++) {
      const d = Math.abs(r - from.r) + Math.abs(c - from.c);
      if (d < min || d > max) continue;
      const t = tileAt(state, r, c);
      if (t && melee(t)) out.push({ r, c });
    }
  }
  return out;
}

// Blast around a tile. shape: diamond (default) | square | cross.
export function areaTiles(state, center, radius, shape = 'diamond') {
  const out = [];
  for (let r = center.r - radius; r <= center.r + radius; r++) {
    for (let c = center.c - radius; c <= center.c + radius; c++) {
      const dr = Math.abs(r - center.r), dc = Math.abs(c - center.c);
      const inside = shape === 'square' ? true : shape === 'cross' ? dr === 0 || dc === 0 : dr + dc <= radius;
      if (inside && tileAt(state, r, c)) out.push({ r, c });
    }
  }
  return out;
}

// Single-target actions get combo assists and can be riposted.
export const isSingle = action => !action.area && !action.hits;

// Every tile an action hits when aimed at `target`:
//   hits: 'beam' — every tile in a line from the user out to max range
//   hits: 'cone' — the tile in front plus a 3-wide row behind it
//   area > 0     — a blast around the target (areaShape)
export function effectTiles(state, unit, action, target) {
  const dr = Math.sign(target.r - unit.r), dc = Math.sign(target.c - unit.c);
  if (action.hits === 'beam') {
    if (!dr && !dc) return [];
    const [min, max] = actionRange(state, unit, unit, action);
    const out = [];
    for (let i = 1; i <= max; i++) {
      const r = unit.r + dr * i, c = unit.c + dc * i;
      const t = tileAt(state, r, c);
      if (!t) continue;
      if (i >= Math.max(1, min)) out.push({ r, c });
      if (BLOCKS_SHOTS.has(t.type)) break;
    }
    return out;
  }
  if (action.hits === 'cone') {
    if (!dr && !dc) return [];
    const pr = Math.abs(dc), pc = Math.abs(dr);
    const r2 = unit.r + 2 * dr, c2 = unit.c + 2 * dc;
    return [{ r: unit.r + dr, c: unit.c + dc }, { r: r2, c: c2 }, { r: r2 + pr, c: c2 + pc }, { r: r2 - pr, c: c2 - pc }]
      .filter(p => tileAt(state, p.r, p.c));
  }
  if (action.area > 0) return areaTiles(state, target, action.area, action.areaShape);
  return [{ r: target.r, c: target.c }];
}

// Units that the action would affect if aimed at `target`.
export function affectedUnits(state, unit, action, target) {
  const wantTeam = action.kind === 'heal' ? unit.team : opponentOf(unit.team);
  return effectTiles(state, unit, action, target)
    .map(p => unitAt(state, p.r, p.c))
    .filter(u => u && u.team === wantTeam);
}

// Short description of where an action reaches, e.g. "2–4 tiles · straight lines".
// Beams hit every unit along the line; cones hit 1 tile ahead plus 3 across behind it.
const SHAPE_NAMES = { line: 'straight lines', diag: 'diagonals', star: '8-way lines' };
const BEAM_NAMES = { line: 'straight beam', diag: 'diagonal beam' };
const AREA_NAMES = { diamond: 'blast', square: 'square blast', cross: 'cross blast' };
export function shapeLabel(action, range = action.range) {
  if (action.hits === 'cone') return 'Cone (1 + 3 wide)';
  const shape = action.shape ?? 'diamond';
  if (shape === 'knight') return 'Knight L-jump';
  if (shape === 'ring') return 'All 8 around';
  let s = rangeLabel(range);
  if (action.hits === 'beam') s += ` · ${BEAM_NAMES[shape] ?? 'beam'}`;
  else if (SHAPE_NAMES[shape]) s += ` · ${SHAPE_NAMES[shape]}`;
  if (action.area > 0) s += ` · ${AREA_NAMES[action.areaShape ?? 'diamond']} ${action.area}`;
  return s;
}

// e.g. "Walk 5", "Diagonal 4", "Walk 3 · or straight rush 6".
export function moveLabel(unit) {
  const m = unit.moveRule ?? { step: 'walk', ...(unit.move ?? {}) };
  const parts = [{ walk: `Walk ${unit.mov}`, king: `8-way ${unit.mov}`, bishop: `Diagonal ${unit.mov}`, fly: `Fly ${unit.mov}` }[m.step] ?? `Walk ${unit.mov}`];
  if (m.hops) parts.push(`${m.hops} knight leap${m.hops > 1 ? 's' : ''}`);
  if (m.lines) parts.push(`or ${m.lines.dirs === 8 ? '8-way' : 'straight'} rush ${m.lines.len}`);
  return parts.join(' · ');
}

// Target tiles that would actually affect at least one unit.
export function validTargets(state, unit, from, action) {
  const saved = { r: unit.r, c: unit.c };
  unit.r = from.r; unit.c = from.c;
  const out = rangeTiles(state, unit, from, action).filter(t => {
    const hit = affectedUnits(state, unit, action, t);
    if (action.kind === 'heal') return hit.some(u => u.hp < u.maxHp);
    return hit.length > 0;
  });
  unit.r = saved.r; unit.c = saved.c;
  return out;
}

export function dirToward(from, to) {
  const dr = to.r - from.r, dc = to.c - from.c;
  if (dr === 0 && dc === 0) return null;
  return Math.abs(dr) >= Math.abs(dc) ? { dr: Math.sign(dr), dc: 0 } : { dr: 0, dc: Math.sign(dc) };
}

// True if `from` is inside the rear cone of `target`.
export function isBehind(from, target) {
  const dr = from.r - target.r, dc = from.c - target.c;
  const f = target.facing;
  const dot = dr * f.dr + dc * f.dc;
  const cross = Math.abs(dr * f.dc - dc * f.dr);
  return dot < 0 && -dot >= cross;
}

// Kai and Hana hit harder standing next to each other (Hana's Sibling Bond).
export function bondBonus(state, unit) {
  const partner = { kai: 'hana', hana: 'kai' }[unit.templateId];
  if (!partner) return 1;
  const p = state.units.find(u => u.alive && u.team === unit.team && u.templateId === partner && manhattan(u, unit) === 1);
  return p && (unit.passive === 'siblingBond' || p.passive === 'siblingBond') ? SIBLING_BOND : 1;
}

export function hitDamage(attacker, defender, power, { pierce = false, from = attacker, defHp = defender.hp, mult = 1 } = {}) {
  const aspect = aspectMult(attacker.aspect, defender.aspect);
  const back = isBehind(from, defender) && defender.passive !== 'bedrock';
  const sludge = defender.passive === 'sludgeBody' && chebyshev(from, defender) > 1 ? SLUDGE_RANGED : 1;
  const base = attacker.atk * power - (pierce ? 0 : defender.def);
  const dawn = attacker.passive === 'dawnbreaker' && defHp >= defender.maxHp ? DAWNBREAKER : 1;
  const amount = Math.max(1, Math.round(base * aspect * sludge * dawn * mult * (back ? attacker.backstab : 1)));
  return { amount, aspect, back };
}

// Work out exactly what an action will do, without changing the state.
export function resolveAction(state, unit, action, target) {
  const hp = new Map(state.units.map(u => [u.id, u.hp]));
  const sp = new Map();
  const addSp = (id, n) => sp.set(id, (sp.get(id) ?? 0) + n);
  const events = [];
  const targets = affectedUnits(state, unit, action, target);

  addSp(unit.id, -action.cost);

  if (action.kind === 'heal') {
    for (const t of targets) {
      const amount = Math.min(Math.round(unit.atk * action.power), t.maxHp - hp.get(t.id));
      if (amount <= 0) continue;
      hp.set(t.id, hp.get(t.id) + amount);
      events.push({ type: 'heal', sourceId: unit.id, targetId: t.id, amount });
    }
  } else {
    let dealt = false;
    const bond = bondBonus(state, unit);
    for (const t of targets) {
      let mult = bond;
      // Hellhound Pack Hunter: another ally already next to the target.
      if (unit.passive === 'packHunter' && state.units.some(a => a.alive && a.team === unit.team && a.id !== unit.id && manhattan(a, t) === 1)) mult *= PACK_HUNTER;
      if (t.passive === 'cinderVeil' && !isSingle(action)) mult *= CINDER_VEIL;
      // Ignis takes reduced damage while his minions stand.
      if (t.passive === 'tyrant' && state.units.some(a => a.alive && a.team === t.team && a.id !== t.id)) mult *= TYRANT_GUARD;
      const h = hitDamage(unit, t, action.power, { pierce: action.pierce, defHp: hp.get(t.id), mult });
      const amount = Math.min(h.amount, hp.get(t.id));
      hp.set(t.id, hp.get(t.id) - amount);
      dealt = true;
      addSp(t.id, SP_ON_HURT);
      events.push({ type: 'hit', sourceId: unit.id, targetId: t.id, amount, back: h.back, aspect: h.aspect, ko: hp.get(t.id) <= 0 });
    }
    if (dealt) addSp(unit.id, SP_ON_HIT + (unit.passive === 'burningSpirit' ? BURNING_SPIRIT_SP : 0));

    // Assists: single-target attacks only, from allies standing next to the target.
    if (isSingle(action) && targets.length === 1) {
      const t = targets[0];
      const helpers = state.units.filter(a =>
        a.alive && a.team === unit.team && a.id !== unit.id && manhattan(a, t) === 1);
      for (const a of helpers) {
        if (hp.get(t.id) <= 0) break;
        const raw = a.atk * ASSIST_POWER - t.def * 0.5;
        const amount = Math.min(
          Math.max(1, Math.round(raw * aspectMult(a.aspect, t.aspect))),
          hp.get(t.id));
        hp.set(t.id, hp.get(t.id) - amount);
        addSp(a.id, SP_ON_ASSIST);
        events.push({ type: 'hit', assist: true, sourceId: a.id, targetId: t.id, amount, back: false, aspect: aspectMult(a.aspect, t.aspect), ko: hp.get(t.id) <= 0 });
      }
    }
    // Magma Golem Molten Core: touching it burns.
    for (const t of targets) {
      if (t.passive === 'moltenCore' && chebyshev(unit, t) === 1 && hp.get(unit.id) > 0) {
        const amount = Math.min(MOLTEN_BURN, hp.get(unit.id));
        hp.set(unit.id, hp.get(unit.id) - amount);
        events.push({ type: 'hit', counter: true, burn: true, sourceId: t.id, targetId: unit.id, amount, back: false, aspect: 1, ko: hp.get(unit.id) <= 0 });
      }
    }
    // Mako's Riposte: survive a close-range single hit and strike back.
    if (isSingle(action) && targets.length === 1) {
      const t = targets[0];
      if (t.passive === 'riposte' && hp.get(t.id) > 0 && chebyshev(unit, t) === 1 && hp.get(unit.id) > 0) {
        const raw = t.atk * RIPOSTE_POWER - unit.def * 0.5;
        const amount = Math.min(Math.max(1, Math.round(raw * aspectMult(t.aspect, unit.aspect))), hp.get(unit.id));
        hp.set(unit.id, hp.get(unit.id) - amount);
        events.push({ type: 'hit', counter: true, sourceId: t.id, targetId: unit.id, amount, back: false, aspect: aspectMult(t.aspect, unit.aspect), ko: hp.get(unit.id) <= 0 });
      }
    }
    // Varg's Bloodlust: a knockout heals him.
    if (unit.passive === 'bloodlust' && hp.get(unit.id) > 0 && events.some(e => e.ko && e.targetId !== unit.id) && hp.get(unit.id) < unit.maxHp) {
      const amount = Math.min(BLOODLUST_HEAL, unit.maxHp - hp.get(unit.id));
      hp.set(unit.id, hp.get(unit.id) + amount);
      events.push({ type: 'heal', passive: 'bloodlust', sourceId: unit.id, targetId: unit.id, amount });
    }
  }
  return { unitId: unit.id, actionId: action.id, target, events, sp };
}

export const unitById = (state, id) => state.units.find(u => u.id === id);

export function applyEvent(state, e) {
  const t = unitById(state, e.targetId);
  if (e.type === 'heal') t.hp = Math.min(t.maxHp, t.hp + e.amount);
  else t.hp = Math.max(0, t.hp - e.amount);
  if (t.hp <= 0) t.alive = false;
}

export function applyPlan(state, plan) {
  for (const e of plan.events) applyEvent(state, e);
  finishPlan(state, plan);
}

// Everything except the HP changes (so the UI can apply hits one at a time).
export function finishPlan(state, plan) {
  const byId = id => unitById(state, id);
  const unit = byId(plan.unitId);
  for (const [id, delta] of plan.sp) {
    const u = byId(id);
    u.sp = Math.max(0, Math.min(SP_MAX, u.sp + delta));
  }
  const face = dirToward(unit, plan.target);
  if (face) unit.facing = face;
  unit.acted = true;
  unit.moved = true;
}

export function moveUnit(state, unit, r, c) {
  const nodes = reachable(state, unit);
  const n = nodes.get(key(r, c));
  if (!n || n.blocked) return null;
  const path = pathTo(nodes, r, c);
  if (path.length > 1) {
    const a = path[path.length - 2], b = path[path.length - 1];
    unit.facing = dirToward(a, b);
  }
  unit.r = r; unit.c = c;
  unit.moved = true;
  return path;
}

// Begin a side's phase: refresh units, regain SP, apply terrain effects.
export function startPhase(state, team) {
  if (team === 'hero' && state.phase === 'enemy') state.turn++;
  state.phase = team;
  const events = [];
  for (const u of livingUnits(state, team)) {
    u.moved = false;
    u.acted = false;
    u.sp = Math.min(SP_MAX, u.sp + SP_PER_TURN + (u.spRegen ?? 0));
    if (u.regen && u.hp < u.maxHp) {
      const amount = Math.min(u.regen, u.maxHp - u.hp);
      u.hp += amount;
      events.push({ type: 'heal', passive: 'healingLeaf', targetId: u.id, amount });
    }
    const t = tileAt(state, u.r, u.c);
    if (t.type === 'lava' && u.passive !== 'fireborn') {
      const amount = Math.min(LAVA_DAMAGE, u.hp);
      u.hp -= amount;
      if (u.hp <= 0) u.alive = false;
      events.push({ type: 'burn', targetId: u.id, amount, ko: !u.alive });
    } else if (t.type === 'shrine' && u.hp < u.maxHp) {
      const amount = Math.min(Math.round(u.maxHp * SHRINE_HEAL), u.maxHp - u.hp);
      u.hp += amount;
      events.push({ type: 'heal', targetId: u.id, amount });
    }
  }
  // Rin's Tidal Grace: she and adjacent allies recover HP.
  for (const rin of livingUnits(state, team).filter(u => u.passive === 'tidalGrace')) {
    for (const u of livingUnits(state, team)) {
      if (manhattan(u, rin) > 1 || u.hp >= u.maxHp) continue;
      const amount = Math.min(TIDAL_GRACE_HEAL, u.maxHp - u.hp);
      u.hp += amount;
      events.push({ type: 'heal', passive: 'tidalGrace', targetId: u.id, amount });
    }
  }
  return events;
}

// Missions: rout (KO everyone), checkmate (KO the leader), survive (last N turns).
export function outcome(state) {
  if (livingUnits(state, 'hero').length === 0) return 'defeat';
  if (livingUnits(state, 'enemy').length === 0) return 'victory';
  const m = state.mission;
  if (m?.type === 'checkmate' && !state.units.some(u => u.alive && u.leader)) return 'victory';
  if (m?.type === 'survive' && state.phase === 'hero' && state.turn > m.turns) return 'victory';
  return null;
}

export function missionText(state) {
  const m = state.mission;
  if (m?.type === 'checkmate') return `Checkmate: KO ${state.units.find(u => u.leader)?.name ?? 'the leader'}`;
  if (m?.type === 'survive') return `Survive: turn ${Math.min(state.turn, m.turns)}/${m.turns}`;
  if (m?.type === 'endless') return `Wave ${m.wave}: ${livingUnits(state, 'enemy').length} enemies left`;
  return `Rout: ${livingUnits(state, 'enemy').length} enemies left`;
}
