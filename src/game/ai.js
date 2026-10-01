// Enemy decision making. Greedy: pick the move + action with the best score,
// otherwise march toward the nearest opponent.
import {
  reachable, pathTo, key, availableActions, canAfford, validTargets, resolveAction,
  distanceMap, livingUnits, opponentOf, tileAt, DIRS, manhattan,
} from './rules.js';

const KO_BONUS = 30;
const LAVA_PENALTY = 12;
const SP_COST_WEIGHT = 0.15;

function scorePlan(state, plan) {
  let score = 0;
  for (const e of plan.events) {
    score += e.amount;
    if (e.ko) score += KO_BONUS;
  }
  return score;
}

// Returns { dest: {r,c}, path, actionId?, target? }
export function planTurn(state, unit) {
  const nodes = reachable(state, unit);
  const dests = [...nodes.values()].filter(n => !n.blocked);
  const origin = { r: unit.r, c: unit.c };
  let best = null;

  for (const d of dests) {
    const lava = tileAt(state, d.r, d.c).type === 'lava' ? LAVA_PENALTY : 0;
    unit.r = d.r; unit.c = d.c;
    for (const action of availableActions(unit)) {
      if (!canAfford(unit, action)) continue;
      for (const target of validTargets(state, unit, d, action)) {
        const plan = resolveAction(state, unit, action, target);
        const score = scorePlan(state, plan) - action.cost * SP_COST_WEIGHT - lava - d.cost * 0.01;
        if (score > 0 && (!best || score > best.score)) {
          best = { score, dest: { r: d.r, c: d.c }, actionId: action.id, target };
        }
      }
    }
  }
  unit.r = origin.r; unit.c = origin.c;

  if (best) return { ...best, path: pathTo(nodes, best.dest.r, best.dest.c) };

  // No attack possible: get as close as we can to the nearest opponent.
  const foes = livingUnits(state, opponentOf(unit.team));
  // Guards hold their post until someone comes close (or they get hurt).
  if (unit.ai === 'guard' && unit.hp === unit.maxHp && !foes.some(f => manhattan(f, unit) <= unit.aggro)) {
    return { dest: origin, path: [origin] };
  }
  const goals = [];
  for (const f of foes) for (const [dr, dc] of DIRS) goals.push({ r: f.r + dr, c: f.c + dc });
  const dist = distanceMap(state, unit, goals);
  let bestMove = null;
  for (const d of dests) {
    const far = dist.get(key(d.r, d.c)) ?? 99 + Math.min(...foes.map(f => manhattan(d, f)));
    const lava = tileAt(state, d.r, d.c).type === 'lava' ? LAVA_PENALTY : 0;
    const score = far + lava * 0.5 + d.cost * 0.01;
    if (!bestMove || score < bestMove.score) bestMove = { score, dest: { r: d.r, c: d.c } };
  }
  const dest = bestMove?.dest ?? origin;
  return { dest, path: pathTo(nodes, dest.r, dest.c) };
}
