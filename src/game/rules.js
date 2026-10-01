// Pure game rules. No DOM access here so it can be unit-tested in Node.
import { UNITS, SKILLS, BASIC_ATTACK, aspectMult } from './data.js';

export const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];
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

const IMPASSABLE = new Set(['water', 'pillar']);

export const key = (r, c) => `${r},${c}`;
export const manhattan = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

let nextId = 1;

export function createUnit(templateId, team, r, c, facing) {
  const t = UNITS[templateId];
  return {
    id: `${templateId}-${nextId++}`,
    templateId,
    team,
    name: t.name,
    title: t.title,
    aspect: t.aspect,
    look: t.look,
    maxHp: t.hp,
    hp: t.hp,
    atk: t.atk,
    def: t.def,
    mov: t.mov,
    jump: t.jump,
    range: t.range,
    backstab: t.backstab ?? DEFAULT_BACKSTAB,
    skills: t.skills ?? [],
    ult: t.ult ?? null,
    sp: 20,
    r, c,
    facing: facing ?? { dr: team === 'hero' ? -1 : 1, dc: 0 },
    moved: false,
    acted: false,
    alive: true,
  };
}

export function createBattle(level) {
  const tiles = level.tiles.map(row => row.map(t => ({ ...t })));
  const units = [
    ...level.heroes.map(s => createUnit(s.id, 'hero', s.r, s.c, s.facing)),
    ...level.enemies.map(s => createUnit(s.id, 'enemy', s.r, s.c, s.facing)),
  ];
  return { map: { rows: tiles.length, cols: tiles[0].length, tiles }, units, phase: 'hero', turn: 1 };
}

export function tileAt(state, r, c) {
  if (r < 0 || c < 0 || r >= state.map.rows || c >= state.map.cols) return null;
  return state.map.tiles[r][c];
}

export const isPassable = tile => !!tile && !IMPASSABLE.has(tile.type);

export function unitAt(state, r, c) {
  return state.units.find(u => u.alive && u.r === r && u.c === c) ?? null;
}

export const livingUnits = (state, team) => state.units.filter(u => u.alive && (!team || u.team === team));
export const opponentOf = team => (team === 'hero' ? 'enemy' : 'hero');

// Breadth-first search of every tile the unit can walk to this turn.
// Returns Map<key, {r, c, cost, prev, blocked}>; blocked = an ally stands there.
export function reachable(state, unit) {
  const start = { r: unit.r, c: unit.c, cost: 0, prev: null, blocked: false };
  const nodes = new Map([[key(unit.r, unit.c), start]]);
  const queue = [start];
  while (queue.length) {
    const n = queue.shift();
    if (n.cost >= unit.mov) continue;
    const here = tileAt(state, n.r, n.c);
    for (const [dr, dc] of DIRS) {
      const r = n.r + dr, c = n.c + dc;
      const k = key(r, c);
      if (nodes.has(k)) continue;
      const t = tileAt(state, r, c);
      if (!isPassable(t) || Math.abs(t.h - here.h) > unit.jump) continue;
      const occ = unitAt(state, r, c);
      if (occ && occ.team !== unit.team) continue;
      const node = { r, c, cost: n.cost + 1, prev: n, blocked: !!occ };
      nodes.set(k, node);
      queue.push(node);
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
    if (!dist.has(k) && isPassable(tileAt(state, g.r, g.c))) { dist.set(k, 0); queue.push(g); }
  }
  while (queue.length) {
    const n = queue.shift();
    const d = dist.get(key(n.r, n.c));
    const here = tileAt(state, n.r, n.c);
    for (const [dr, dc] of DIRS) {
      const r = n.r + dr, c = n.c + dc;
      const k = key(r, c);
      if (dist.has(k)) continue;
      const t = tileAt(state, r, c);
      if (!isPassable(t) || Math.abs(t.h - here.h) > unit.jump) continue;
      const occ = unitAt(state, r, c);
      if (occ && occ.team !== unit.team) continue;
      dist.set(k, d + 1);
      queue.push({ r, c });
    }
  }
  return dist;
}

export function getAction(unit, actionId) {
  if (actionId === 'attack') return { ...BASIC_ATTACK, id: 'attack', range: unit.range };
  return { ...SKILLS[actionId], id: actionId };
}

export function availableActions(unit) {
  const ids = ['attack', ...unit.skills];
  if (unit.ult) ids.push(unit.ult);
  return ids.map(id => getAction(unit, id));
}

export const canAfford = (unit, action) => unit.sp >= action.cost;

// Tiles the action can be aimed at from position `from`.
export function rangeTiles(state, unit, from, action) {
  const [min, max] = action.range;
  const out = [];
  const fromTile = tileAt(state, from.r, from.c);
  for (let r = from.r - max; r <= from.r + max; r++) {
    for (let c = from.c - max; c <= from.c + max; c++) {
      const d = Math.abs(r - from.r) + Math.abs(c - from.c);
      if (d < min || d > max) continue;
      const t = tileAt(state, r, c);
      if (!t) continue;
      if (max === 1 && Math.abs(t.h - fromTile.h) > MELEE_HEIGHT) continue;
      out.push({ r, c });
    }
  }
  return out;
}

export function areaTiles(state, center, radius) {
  const out = [];
  for (let r = center.r - radius; r <= center.r + radius; r++) {
    for (let c = center.c - radius; c <= center.c + radius; c++) {
      if (Math.abs(r - center.r) + Math.abs(c - center.c) <= radius && tileAt(state, r, c)) out.push({ r, c });
    }
  }
  return out;
}

// Units that the action would affect if aimed at `target`.
export function affectedUnits(state, unit, action, target) {
  const wantTeam = action.kind === 'heal' ? unit.team : opponentOf(unit.team);
  if (action.area === 0) {
    const u = unitAt(state, target.r, target.c);
    return u && u.team === wantTeam ? [u] : [];
  }
  return areaTiles(state, target, action.area)
    .map(p => unitAt(state, p.r, p.c))
    .filter(u => u && u.team === wantTeam);
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

export function hitDamage(attacker, defender, power, { pierce = false, from = attacker } = {}) {
  const aspect = aspectMult(attacker.aspect, defender.aspect);
  const back = isBehind(from, defender);
  const base = attacker.atk * power - (pierce ? 0 : defender.def);
  const amount = Math.max(1, Math.round(base * aspect * (back ? attacker.backstab : 1)));
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
    for (const t of targets) {
      const h = hitDamage(unit, t, action.power, { pierce: action.pierce });
      const amount = Math.min(h.amount, hp.get(t.id));
      hp.set(t.id, hp.get(t.id) - amount);
      dealt = true;
      addSp(t.id, SP_ON_HURT);
      events.push({ type: 'hit', sourceId: unit.id, targetId: t.id, amount, back: h.back, aspect: h.aspect, ko: hp.get(t.id) <= 0 });
    }
    if (dealt) addSp(unit.id, SP_ON_HIT);

    // Assists: single-target attacks only, from allies standing next to the target.
    if (action.area === 0 && targets.length === 1) {
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
    u.sp = Math.min(SP_MAX, u.sp + SP_PER_TURN);
    const t = tileAt(state, u.r, u.c);
    if (t.type === 'lava') {
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
  return events;
}

export function outcome(state) {
  if (livingUnits(state, 'enemy').length === 0) return 'victory';
  if (livingUnits(state, 'hero').length === 0) return 'defeat';
  return null;
}
