// Enemy decision making.
//
// Each enemy scores every (move, action, target) it could do this turn and
// picks the best. Scoring favours knockouts, finishing wounded units and
// hitting fragile backliners (healers / ranged), and avoids attacks that would
// get it killed by a counter-strike.
//
// Behaviours (set per enemy in the level):
//   charge (default) — head for the nearest hero.
//   hold   — wait as a pack; once anyone on the team spots a hero (or is hit),
//            the whole pack attacks together.
//   guard  — stay at a post until a hero comes close or it gets hurt.
import {
  reachable, pathTo, key, availableActions, canAfford, validTargets, resolveAction,
  distanceMap, livingUnits, opponentOf, tileAt, DIRS, manhattan, unitById,
} from './rules.js';

const KO_BONUS = 40;
const FRAGILE_BONUS = 6;      // healers and ranged units
const WOUND_WEIGHT = 18;      // reward for the share of a target's max HP removed
const SELF_HIT_WEIGHT = 1.5;  // penalty per HP lost to counters
const SELF_KO_PENALTY = 60;
const LAVA_PENALTY = 12;
const SP_COST_WEIGHT = 0.15;

const isFragile = u => u.range[1] >= 2 || u.skills.some(id => id === 'mendingWave');

function scorePlan(state, unit, plan) {
  let score = 0;
  for (const e of plan.events) {
    const t = unitById(state, e.targetId);
    if (e.type === 'heal') { score += e.amount * (t.team === unit.team ? 1 : -1); continue; }
    if (t.team === unit.team) {
      // a counter-attack hitting us (or an ally)
      score -= e.amount * SELF_HIT_WEIGHT + (e.ko ? SELF_KO_PENALTY : 0);
      continue;
    }
    score += e.amount + WOUND_WEIGHT * (e.amount / t.maxHp);
    if (e.ko) score += KO_BONUS;
    if (isFragile(t)) score += FRAGILE_BONUS;
  }
  return score;
}

// Returns { dest: {r,c}, path, actionId?, target? }
export function planTurn(state, unit) {
  const nodes = reachable(state, unit);
  const dests = [...nodes.values()].filter(n => !n.blocked);
  const origin = { r: unit.r, c: unit.c };
  const lavaCost = d => (tileAt(state, d.r, d.c).type === 'lava' && unit.passive !== 'fireborn' ? LAVA_PENALTY : 0);
  let best = null;

  for (const d of dests) {
    const lava = lavaCost(d);
    unit.r = d.r; unit.c = d.c;
    for (const action of availableActions(unit)) {
      if (!canAfford(unit, action)) continue;
      for (const target of validTargets(state, unit, d, action)) {
        const plan = resolveAction(state, unit, action, target);
        const score = scorePlan(state, unit, plan) - action.cost * SP_COST_WEIGHT - lava - d.cost * 0.01;
        if (score > 0 && (!best || score > best.score)) {
          best = { score, dest: { r: d.r, c: d.c }, actionId: action.id, target };
        }
      }
    }
  }
  unit.r = origin.r; unit.c = origin.c;

  const foes = livingUnits(state, opponentOf(unit.team));
  const spotted = foes.some(f => manhattan(f, unit) <= unit.aggro) || unit.hp < unit.maxHp;
  if (best) {
    if (unit.ai === 'hold') state.alert = true;
    return { ...best, path: pathTo(nodes, best.dest.r, best.dest.c) };
  }

  // No attack this turn. Guards hold their post; packs wait until alerted.
  if (unit.ai === 'guard' && !spotted) return { dest: origin, path: [origin] };
  if (unit.ai === 'hold') {
    if (spotted) state.alert = true;
    if (!state.alert) return { dest: origin, path: [origin] };
  }

  // Close in on the nearest opponent.
  const goals = [];
  for (const f of foes) for (const [dr, dc] of DIRS) goals.push({ r: f.r + dr, c: f.c + dc });
  const dist = distanceMap(state, unit, goals);
  let bestMove = null;
  for (const d of dests) {
    const far = dist.get(key(d.r, d.c)) ?? 99 + Math.min(...foes.map(f => manhattan(d, f)));
    const score = far + lavaCost(d) * 0.5 + d.cost * 0.01;
    if (!bestMove || score < bestMove.score) bestMove = { score, dest: { r: d.r, c: d.c } };
  }
  const dest = bestMove?.dest ?? origin;
  return { dest, path: pathTo(nodes, dest.r, dest.c) };
}
