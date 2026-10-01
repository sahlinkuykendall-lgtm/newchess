import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aspectMult } from '../src/game/data.js';
import {
  createBattle, createUnit, reachable, key, isBehind, hitDamage, resolveAction, applyPlan,
  getAction, validTargets, startPhase, outcome, moveUnit, livingUnits,
} from '../src/game/rules.js';
import { planTurn } from '../src/game/ai.js';
import { LEVELS } from '../src/game/levels.js';

const flat = (rows, cols, h = 0) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ type: 'grass', h })));

function battle(units, tiles = flat(6, 6)) {
  return { map: { rows: tiles.length, cols: tiles[0].length, tiles }, units, phase: 'hero', turn: 1 };
}

test('aspect wheel', () => {
  assert.equal(aspectMult('blaze', 'gale'), 1.5);
  assert.equal(aspectMult('gale', 'blaze'), 0.75);
  assert.equal(aspectMult('tide', 'blaze'), 1.5);
  assert.equal(aspectMult('lumen', 'umbra'), 1.5);
  assert.equal(aspectMult('umbra', 'lumen'), 1.5);
  assert.equal(aspectMult('blaze', 'umbra'), 1);
});

test('movement respects range, jump, enemies and allies', () => {
  const tiles = flat(6, 6);
  tiles[2][3].h = 3; // wall too tall to climb
  const kai = createUnit('kai', 'hero', 2, 2);
  const goro = createUnit('goro', 'hero', 1, 2);
  const imp = createUnit('imp', 'enemy', 3, 2);
  const s = battle([kai, goro, imp], tiles);
  const nodes = reachable(s, kai);
  assert.ok(!nodes.has(key(2, 3)), 'cannot climb 3');
  assert.ok(!nodes.has(key(3, 2)), 'cannot enter enemy tile');
  assert.ok(nodes.get(key(1, 2)).blocked, 'can pass but not stop on ally');
  assert.ok(nodes.has(key(0, 2)), 'can walk through ally');
  for (const n of nodes.values()) assert.ok(n.cost <= kai.mov);
});

test('backstab cone', () => {
  const t = createUnit('imp', 'enemy', 3, 3, { dr: 1, dc: 0 }); // facing south
  assert.equal(isBehind({ r: 2, c: 3 }, t), true);
  assert.equal(isBehind({ r: 4, c: 3 }, t), false);
  assert.equal(isBehind({ r: 3, c: 2 }, t), false);
  assert.equal(isBehind({ r: 1, c: 4 }, t), true);
});

test('damage formula is deterministic and uses aspect + backstab', () => {
  const nyx = createUnit('nyx', 'hero', 2, 3);
  const imp = createUnit('imp', 'enemy', 3, 3, { dr: 1, dc: 0 });
  const h = hitDamage(nyx, imp, 1);
  // (25 - 6) * 1 (umbra vs blaze) * 2 (Nyx backstab)
  assert.deepEqual(h, { amount: 38, aspect: 1, back: true });
});

test('assists add combo hits and SP', () => {
  const kai = createUnit('kai', 'hero', 2, 2);
  const goro = createUnit('goro', 'hero', 3, 3);
  const brute = createUnit('brute', 'enemy', 2, 3, { dr: 0, dc: -1 });
  const s = battle([kai, goro, brute]);
  const plan = resolveAction(s, kai, getAction(kai, 'attack'), { r: 2, c: 3 });
  assert.equal(plan.events.length, 2);
  assert.equal(plan.events[1].assist, true);
  const before = brute.hp;
  applyPlan(s, plan);
  assert.equal(brute.hp, before - plan.events[0].amount - plan.events[1].amount);
  assert.equal(kai.acted, true);
  assert.equal(kai.sp, 30);
});

test('area skills hit only enemies, heals only allies', () => {
  const goro = createUnit('goro', 'hero', 2, 2);
  goro.sp = 100;
  const kai = createUnit('kai', 'hero', 2, 3);
  const imp1 = createUnit('imp', 'enemy', 1, 2);
  const imp2 = createUnit('imp', 'enemy', 3, 2);
  const s = battle([goro, kai, imp1, imp2]);
  const plan = resolveAction(s, goro, getAction(goro, 'quakeSlam'), { r: 2, c: 2 });
  assert.deepEqual(plan.events.map(e => e.targetId).sort(), [imp1.id, imp2.id].sort());

  const rin = createUnit('rin', 'hero', 4, 4);
  rin.sp = 100;
  kai.hp = 10;
  s.units.push(rin);
  const targets = validTargets(s, rin, rin, getAction(rin, 'mendingWave'));
  assert.ok(targets.some(t => t.r === 2 && t.c === 3));
});

test('phase start regenerates SP and applies terrain', () => {
  const tiles = flat(3, 3);
  tiles[0][0].type = 'lava';
  tiles[1][1].type = 'shrine';
  const a = createUnit('kai', 'hero', 0, 0);
  const b = createUnit('goro', 'hero', 1, 1);
  b.hp = 50;
  const s = battle([a, b], tiles);
  s.phase = 'enemy';
  startPhase(s, 'hero');
  assert.equal(s.turn, 2);
  assert.equal(a.hp, a.maxHp - 10);
  assert.equal(b.hp, 50 + 17);
  assert.equal(a.sp, 30);
});

test('AI vs AI finishes the first level in a sane number of turns', () => {
  for (const level of LEVELS) {
    const s = createBattle(level);
    let result = null;
    while (!result && s.turn <= 40) {
      for (const team of ['hero', 'enemy']) {
        startPhase(s, team);
        for (const u of livingUnits(s, team)) {
          const p = planTurn(s, u);
          moveUnit(s, u, p.dest.r, p.dest.c);
          if (p.actionId) applyPlan(s, resolveAction(s, u, getAction(u, p.actionId), p.target));
          result = outcome(s);
          if (result) break;
        }
        if (result) break;
      }
    }
    assert.ok(result, `${level.id} ended`);
    assert.ok(s.turn >= 3 && s.turn <= 25, `${level.id} took ${s.turn} turns (${result})`);
  }
});
