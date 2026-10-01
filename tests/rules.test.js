import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aspectMult } from '../src/game/data.js';
import {
  createBattle, createUnit, reachable, key, isBehind, hitDamage, resolveAction, applyPlan, actionRange,
  getAction, validTargets, startPhase, outcome, moveUnit, livingUnits, bondBonus,
} from '../src/game/rules.js';
import { planTurn } from '../src/game/ai.js';
import { LEVELS } from '../src/game/levels.js';
import { newSave, awardVictory, isStageUnlocked } from '../src/game/progress.js';

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
  assert.equal(kai.sp, 35); // 20 start + 10 hit + 5 Burning Spirit
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

test('every level is fully connected: each hero can walk to every enemy', () => {
  for (const level of LEVELS) {
    const s = createBattle(level);
    for (const hero of livingUnits(s, 'hero')) {
      const walker = { ...hero, mov: 999, jump: 3, team: 'nobody' };
      s.units = [];
      const nodes = reachable(s, walker);
      for (const e of level.enemies) {
        const adjacent = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => nodes.has(key(e.r + dr, e.c + dc)) || nodes.has(key(e.r, e.c)));
        assert.ok(adjacent, `${level.id}: ${hero.name} cannot reach enemy at ${e.r},${e.c}`);
      }
    }
  }
});

test('passives: Kai SP, Goro bedrock, Brute sludge, Nyx double backstab', () => {
  const kai = createUnit('kai', 'hero', 2, 2);
  const imp = createUnit('imp', 'enemy', 2, 3, { dr: 0, dc: 1 }); // facing away from Kai
  const s = battle([kai, imp]);
  applyPlan(s, resolveAction(s, kai, getAction(kai, 'attack'), { r: 2, c: 3 }));
  assert.equal(kai.sp, 20 + 10 + 5, 'Burning Spirit adds +5 SP');

  const nyx = createUnit('nyx', 'hero', 2, 2);
  const goro = createUnit('goro', 'enemy', 2, 3, { dr: 0, dc: 1 });
  assert.equal(hitDamage(nyx, goro, 1).back, false, 'Goro cannot be backstabbed');
  const brute = createUnit('brute', 'enemy', 2, 3, { dr: 0, dc: 1 });
  assert.equal(hitDamage(nyx, brute, 1).amount, Math.round((25 - 14) * 2), 'Nyx backstab x2');

  const sora = createUnit('sora', 'hero', 2, 0);
  const near = hitDamage(sora, brute, 1, { from: { r: 2, c: 2 } }).amount;
  const far = hitDamage(sora, brute, 1, { from: { r: 2, c: 0 } }).amount;
  assert.ok(far < near, 'Sludge Body reduces ranged damage');
});

test('passives: Sora Eagle Eye, Rin Tidal Grace, Imp Fireborn, Varg Bloodlust', () => {
  const tiles = flat(8, 8);
  tiles[0][0].h = 2;
  tiles[5][5].type = 'lava';
  const sora = createUnit('sora', 'hero', 0, 0);
  const s = battle([sora], tiles);
  assert.deepEqual(actionRange(s, sora, { r: 0, c: 0 }, getAction(sora, 'attack')), [2, 5]);
  assert.deepEqual(actionRange(s, sora, { r: 3, c: 3 }, getAction(sora, 'attack')), [2, 4]);

  const rin = createUnit('rin', 'hero', 3, 3);
  const kai = createUnit('kai', 'hero', 3, 4);
  const far = createUnit('goro', 'hero', 6, 6);
  rin.hp = 40; kai.hp = 40; far.hp = 40;
  const imp = createUnit('imp', 'enemy', 5, 5);
  const s2 = battle([rin, kai, far, imp], tiles);
  s2.phase = 'enemy';
  startPhase(s2, 'hero');
  assert.equal(rin.hp, 46); assert.equal(kai.hp, 46); assert.equal(far.hp, 40);
  startPhase(s2, 'enemy');
  assert.equal(imp.hp, imp.maxHp, 'Fireborn imp ignores lava');

  const varg = createUnit('varg', 'enemy', 1, 1);
  varg.hp = 50;
  const victim = createUnit('sora', 'hero', 1, 2);
  victim.hp = 5;
  const s3 = battle([varg, victim]);
  const plan = resolveAction(s3, varg, getAction(varg, 'attack'), { r: 1, c: 2 });
  assert.ok(plan.events.some(e => e.type === 'heal' && e.targetId === varg.id && e.amount === 15));
});

test('levels scale stats; difficulty scales enemies only', () => {
  const lv1 = createUnit('kai', 'hero', 0, 0);
  const lv5 = createUnit('kai', 'hero', 0, 0, null, { lv: 5 });
  assert.equal(lv5.maxHp, lv1.maxHp + 24);
  assert.ok(lv5.atk > lv1.atk && lv5.def > lv1.def);
  const level = LEVELS[0];
  const easy = createBattle(level, { difficulty: 'easy' });
  const hard = createBattle(level, { difficulty: 'hard' });
  const e = s => livingUnits(s, 'enemy')[0];
  assert.ok(e(easy).maxHp < e(hard).maxHp);
  assert.equal(livingUnits(easy, 'hero')[0].maxHp, livingUnits(hard, 'hero')[0].maxHp);
});

test('campaign: XP, level ups, unlocks and replay XP', () => {
  const save = newSave();
  const r = awardVictory(save, LEVELS[0], ['kai', 'rin']);
  assert.equal(r.firstClear, true);
  assert.deepEqual(r.joined, ['nyx']);
  assert.equal(save.heroes.kai.lv, 2);
  assert.ok(save.unlocked.includes('nyx'));
  assert.ok(isStageUnlocked(save, 1) && !isStageUnlocked(save, 2));
  const again = awardVictory(save, LEVELS[0], ['kai']);
  assert.equal(again.firstClear, false);
  assert.equal(again.xp, Math.round(LEVELS[0].xp * 0.6));
  assert.deepEqual(again.joined, []);
});

test('new passives: Dawnbreaker, Riposte, Light Feet, Sibling Bond', () => {
  const aiko = createUnit('aiko', 'hero', 2, 2);
  const imp = createUnit('imp', 'enemy', 2, 3, { dr: 1, dc: 0 });
  const fresh = hitDamage(aiko, imp, 1).amount;
  const hurt = hitDamage(aiko, imp, 1, { defHp: 10 }).amount;
  assert.ok(fresh > hurt, 'Dawnbreaker bonus at full HP');

  const mako = createUnit('mako', 'hero', 1, 1);
  const brute = createUnit('brute', 'enemy', 1, 2);
  const s = battle([mako, brute]);
  const plan = resolveAction(s, brute, getAction(brute, 'attack'), { r: 1, c: 1 });
  assert.ok(plan.events.some(e => e.counter && e.targetId === brute.id), 'Mako ripostes');

  const pip = createUnit('pip', 'hero', 2, 0);
  const wall = createUnit('brute', 'enemy', 2, 1);
  const s2 = battle([pip, wall], flat(5, 5));
  const nodes = reachable(s2, pip);
  assert.ok(nodes.get(key(2, 1))?.blocked && nodes.has(key(2, 2)), 'Pip walks through but cannot stop on enemies');

  const kai = createUnit('kai', 'hero', 3, 3);
  const hana = createUnit('hana', 'hero', 3, 4);
  const s3 = battle([kai, hana]);
  assert.equal(bondBonus(s3, kai), 1.2);
  assert.equal(bondBonus(s3, hana), 1.2);
  hana.r = 0;
  assert.equal(bondBonus(s3, kai), 1);
});

test('AI packs hold until one spots a hero, then all attack', () => {
  const tiles = flat(3, 20);
  const kai = createUnit('kai', 'hero', 1, 0);
  const a = Object.assign(createUnit('imp', 'enemy', 1, 10), { ai: 'hold', aggro: 4 });
  const b = Object.assign(createUnit('imp', 'enemy', 1, 18), { ai: 'hold', aggro: 4 });
  const s = { ...battle([kai, a, b], tiles), alert: false };
  assert.deepEqual(planTurn(s, a).dest, { r: 1, c: 10 }, 'nobody spotted yet: hold');
  kai.c = 7; // now within a's aggro
  planTurn(s, a);
  assert.equal(s.alert, true);
  assert.notDeepEqual(planTurn(s, b).dest, { r: 1, c: 18 }, 'the rest of the pack moves in');
});

test('AI prefers knockouts and fragile targets', () => {
  const imp = createUnit('imp', 'enemy', 2, 2);
  const goro = createUnit('goro', 'hero', 2, 4);
  const rin = createUnit('rin', 'hero', 4, 2);
  rin.hp = 10;
  const s = battle([imp, goro, rin]);
  const p = planTurn(s, imp);
  assert.ok(p.target && Math.abs(p.target.r - rin.r) + Math.abs(p.target.c - rin.c) <= 1, 'goes for the wounded healer');
});

test('recruits join at the next stage’s suggested level', () => {
  const save = newSave();
  awardVictory(save, LEVELS[0], ['kai']);
  assert.equal(save.heroes.nyx.lv, LEVELS[1].heroLevel);
});
