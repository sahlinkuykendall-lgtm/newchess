// Battle controller: turns taps into game actions, drives animations and the HUD.
import * as R from '../game/rules.js';
import { planTurn } from '../game/ai.js';
import { ASPECTS, UNITS } from '../game/data.js';
import { renderPortrait } from '../render/sprites.js';
import { audio } from '../audio.js';
import { openProfile } from './profile.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export class Battle {
  constructor(board, { onEnd }) {
    this.board = board;
    this.onEnd = onEnd;
    this.mode = 'busy';
    this.cardUnitId = null;
    this.gen = 0; // bumped on start/stop so stale async turns bail out
    this.bindHud();
  }

  // ---------------------------------------------------------------- setup
  async start(level, { squad = null, difficulty = 'normal' } = {}) {
    const gen = ++this.gen;
    this.level = level;
    this.state = R.createBattle(level, { squad, difficulty });
    this.squadIds = R.livingUnits(this.state, 'hero').map(u => u.templateId);
    $('result').classList.add('hidden');
    this.board.setState(this.state);
    this.board.focusUnits(R.livingUnits(this.state, 'hero'), { animate: false, zoom: this.board.playZoom() });
    this.sel = null;
    this.inspect = null;
    this.action = null;
    this.pending = null;
    this.mode = 'busy';
    $('hud').classList.remove('hidden');
    this.renderAll();
    audio.play('battle');
    await this.runDialog(level.intro ?? []);
    if (gen !== this.gen) return;
    this.board.focusUnits(R.livingUnits(this.state, 'hero'));
    R.startPhase(this.state, 'hero');
    await this.banner('YOUR TURN', 'hero');
    if (gen !== this.gen) return;
    this.mode = 'idle';
    this.renderAll();
  }

  stop() {
    this.gen++;
    this.mode = 'over';
    $('dialog').classList.add('hidden');
    this.dialogCleanup?.();
    $('hud').classList.add('hidden');
    $('result').classList.add('hidden');
  }

  bindHud() {
    $('btn-end').addEventListener('click', () => {
      if (this.mode === 'busy' || this.mode === 'over' || this.state?.phase !== 'hero') return;
      audio.sfx('click');
      this.endTurn();
    });
    $('actions').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      this.onActionButton(b.dataset.act);
    });
    $('unit-card').addEventListener('click', () => {
      const u = this.inspect ?? this.sel;
      if (!u) return;
      audio.sfx('click');
      openProfile(u.templateId, u);
    });
    $('forecast').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.fc === 'go') this.execute();
      else { audio.sfx('cancel'); this.pending = null; this.renderAll(); }
    });
  }

  // --------------------------------------------------------------- input
  // Decide which tile a tap means when sprites and raised tiles overlap.
  resolveTap(hit) {
    // A highlighted tile wins, even one partly hidden behind a pillar.
    const lit = hit.tiles.find(t => ['move', 'target', 'heal'].includes(this.board.overlays.get(R.key(t.r, t.c))));
    // When sprites overlap, prefer a valid target, then a hero that can still act.
    const unit = (this.mode === 'target' && hit.units.find(u => this.targets.some(t => t.r === u.r && t.c === u.c)))
      || (this.mode !== 'target' && hit.units.find(u => u.team === 'hero' && !u.acted && u !== this.sel))
      || hit.units[0];
    return lit ?? (unit ? { r: unit.r, c: unit.c } : hit.tile);
  }

  onTap(hit) {
    if (this.mode === 'busy' || this.mode === 'over' || this.mode === 'dialog') return;
    const tile = this.resolveTap(hit);
    if (!tile) return;
    const { r, c } = tile;
    const u = R.unitAt(this.state, r, c);

    if (this.mode === 'target') {
      const ok = this.targets.some(t => t.r === r && t.c === c);
      if (ok) {
        if (this.pending && this.pending.target.r === r && this.pending.target.c === c) return this.execute();
        audio.sfx('select');
        this.pending = { target: { r, c }, plan: R.resolveAction(this.state, this.sel, this.action, { r, c }) };
      } else {
        audio.sfx('cancel');
        this.mode = 'selected';
        this.action = null;
        this.pending = null;
      }
      return this.renderAll();
    }

    if (this.mode === 'selected') {
      const sel = this.sel;
      const node = this.nodes?.get(R.key(r, c));
      // Tap an enemy you can hit right now → jump straight to the attack forecast.
      if (u && u.team === 'enemy') {
        const atk = R.getAction(sel, 'attack');
        const ts = R.validTargets(this.state, sel, sel, atk);
        if (ts.some(t => t.r === r && t.c === c)) {
          this.chooseAction('attack');
          this.pending = { target: { r, c }, plan: R.resolveAction(this.state, sel, this.action, { r, c }) };
          audio.sfx('select');
          return this.renderAll();
        }
      }
      if (!sel.moved && node && !node.blocked && !(r === sel.r && c === sel.c)) return this.moveSelected(r, c);
      if (u && u.team === 'hero' && u !== sel && !u.acted && !sel.moved) return this.select(u);
      if (u && u !== sel) { this.inspect = u; return this.renderAll(); }
      if (!u && !sel.moved) { audio.sfx('cancel'); this.deselect(); }
      return;
    }

    // idle
    if (u && u.team === 'hero' && !u.acted) return this.select(u);
    this.inspect = u;
    this.renderAll();
  }

  select(u) {
    audio.sfx('select');
    this.sel = u;
    this.inspect = null;
    this.origin = { r: u.r, c: u.c, facing: { ...u.facing } };
    this.nodes = R.reachable(this.state, u);
    this.mode = 'selected';
    this.action = null;
    this.pending = null;
    this.renderAll();
    this.board.focusTile(u.r, u.c, { onlyIfOffscreen: true });
  }

  deselect() {
    this.sel = null;
    this.action = null;
    this.pending = null;
    this.mode = 'idle';
    this.renderAll();
  }

  async moveSelected(r, c) {
    const u = this.sel;
    this.mode = 'busy';
    this.renderAll();
    const path = R.moveUnit(this.state, u, r, c);
    await this.board.walk(u, path, () => audio.sfx('step'));
    this.board.focusTile(u.r, u.c, { onlyIfOffscreen: true });
    this.mode = 'selected';
    this.renderAll();
  }

  onActionButton(act) {
    if (!this.sel || this.mode === 'busy') return;
    audio.sfx('click');
    if (act === 'wait') {
      this.sel.acted = true;
      this.sel.moved = true;
      this.deselect();
      return this.afterHeroAction();
    }
    if (act === 'undo') {
      const u = this.sel;
      u.r = this.origin.r; u.c = this.origin.c; u.facing = { ...this.origin.facing }; u.moved = false;
      this.board.syncUnit(u);
      this.nodes = R.reachable(this.state, u);
      this.mode = 'selected';
      this.action = null;
      this.pending = null;
      return this.renderAll();
    }
    if (this.mode === 'target' && this.action?.id === act) {
      this.mode = 'selected'; this.action = null; this.pending = null;
      return this.renderAll();
    }
    this.chooseAction(act);
    this.renderAll();
  }

  chooseAction(id) {
    this.action = R.getAction(this.sel, id);
    this.targets = R.validTargets(this.state, this.sel, this.sel, this.action);
    this.pending = null;
    this.mode = 'target';
    // If there's only one possible target, pre-select it.
    if (this.targets.length === 1) {
      const t = this.targets[0];
      this.pending = { target: t, plan: R.resolveAction(this.state, this.sel, this.action, t) };
    }
  }

  async execute() {
    if (!this.pending) return;
    const u = this.sel, action = this.action, { target, plan } = this.pending;
    this.mode = 'busy';
    this.pending = null;
    this.renderAll();
    await this.playAction(u, action, target, plan);
    this.sel = null;
    this.action = null;
    if (await this.checkOutcome()) return;
    this.mode = 'idle';
    this.renderAll();
    this.afterHeroAction();
  }

  afterHeroAction() {
    if (R.livingUnits(this.state, 'hero').every(h => h.acted)) this.endTurn();
  }

  // ------------------------------------------------------------ playback
  async playAction(u, action, target, plan) {
    const b = this.board;
    const face = R.dirToward(u, target);
    if (face) u.facing = face;
    const color = ASPECTS[u.aspect].color;
    if (action.ult) await this.cutIn(u, action);

    const ranged = action.range[1] > 1 && !(target.r === u.r && target.c === u.c);
    if (action.kind === 'heal') {
      audio.sfx('heal');
      b.areaFx(R.areaTiles(this.state, target, action.area), '#7dffb2');
      await b.wait(250);
    } else if (ranged) {
      await b.projectile(u, target, color);
    } else if (target.r === u.r && target.c === u.c) {
      b.shake = 8;
      audio.sfx('boom');
    } else {
      await b.lunge(u, target);
    }
    if (action.area > 0 && action.kind !== 'heal') {
      b.areaFx(R.areaTiles(this.state, target, action.area), color);
      if (action.ult) audio.sfx('boom');
    }

    for (const e of plan.events) {
      const t = R.unitById(this.state, e.targetId);
      if (e.assist || e.counter) {
        const helper = R.unitById(this.state, e.sourceId);
        helper.facing = R.dirToward(helper, t) ?? helper.facing;
        b.floatText(helper, e.counter ? 'RIPOSTE!' : 'COMBO!', e.counter ? '#7fd8ff' : '#e3b5ff');
        await b.lunge(helper, t);
      }
      R.applyEvent(this.state, e);
      if (e.type === 'heal') {
        b.hitFx(t, { amount: e.amount, heal: true });
        if (e.passive === 'bloodlust') b.floatText(t, 'BLOODLUST', '#ff4d6d');
      } else {
        const tags = [e.back && 'BACKSTAB!', e.aspect > 1 && 'STRONG', e.aspect < 1 && 'resist'].filter(Boolean).join(' ');
        const big = e.back || action.ult || e.aspect > 1;
        audio.sfx(big ? 'crit' : 'hit');
        b.hitFx(t, { amount: e.amount, color, text: tags || null, big });
      }
      this.renderCard();
      await b.wait(e.assist ? 260 : 320);
      if (e.ko) {
        audio.sfx('ko');
        b.floatText(t, 'K.O.', '#ff4d6d');
        await b.koFx(t);
      }
    }
    R.finishPlan(this.state, plan);
    this.renderAll();
    await b.wait(150);
  }

  cutIn(u, action) {
    return new Promise(resolve => {
      const el = $('cutin');
      el.style.setProperty('--cut', ASPECTS[u.aspect].color);
      $('cutin-who').textContent = u.name.toUpperCase();
      $('cutin-move').textContent = action.name.toUpperCase();
      el.classList.remove('hidden');
      // restart CSS animations
      for (const n of [el, ...el.querySelectorAll('*')]) { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; }
      renderPortrait($('cutin-portrait'), u.look, { zoom: $('cutin-portrait').clientHeight / 62 });
      audio.sfx('charge');
      setTimeout(() => { el.classList.add('hidden'); resolve(); }, 1600);
    });
  }

  banner(text, cls) {
    return new Promise(resolve => {
      const el = $('banner');
      el.textContent = text;
      el.className = cls;
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      audio.sfx(cls === 'hero' ? 'turn' : 'enemyTurn');
      setTimeout(() => { el.classList.add('hidden'); resolve(); }, 1150);
    });
  }

  runDialog(lines) {
    if (!lines.length) return Promise.resolve();
    const prevMode = this.mode;
    this.mode = 'dialog';
    const el = $('dialog');
    let i = 0;
    return new Promise(resolve => {
      const show = () => {
        const line = lines[i];
        $('dialog-who').textContent = line.who;
        $('dialog-text').textContent = line.text;
        const speaker = this.state.units.find(u => u.name === line.who)
          ?? Object.values(UNITS).find(t => t.name === line.who);
        if (speaker) renderPortrait($('dialog-portrait'), speaker.look, { focus: 'bust', zoom: 76 / 40 });
        if (speaker?.id) this.board.focusTile(speaker.r, speaker.c);
      };
      const next = () => {
        audio.sfx('click');
        i++;
        if (i >= lines.length) {
          el.classList.add('hidden');
          el.removeEventListener('click', next);
          this.mode = prevMode;
          resolve();
        } else show();
      };
      this.dialogCleanup?.();
      this.dialogCleanup = () => el.removeEventListener('click', next);
      el.classList.remove('hidden');
      el.addEventListener('click', next);
      show();
    });
  }

  async showPhaseEvents(events) {
    for (const e of events) {
      const t = R.unitById(this.state, e.targetId);
      if (e.type === 'heal') {
        audio.sfx('heal');
        this.board.hitFx(t, { amount: e.amount, heal: true });
        if (e.passive === 'tidalGrace') this.board.floatText(t, 'TIDAL GRACE', '#7fd8ff');
      }
      else {
        audio.sfx('hit');
        this.board.hitFx(t, { amount: e.amount, color: '#ff6a1f', text: 'BURN' });
        if (e.ko) { await this.board.wait(250); await this.board.koFx(t); }
      }
      await this.board.wait(250);
    }
  }

  async endTurn() {
    const gen = this.gen;
    const stale = () => gen !== this.gen;
    this.mode = 'busy';
    this.sel = null; this.action = null; this.pending = null; this.inspect = null;
    this.renderAll();

    const eEvents = R.startPhase(this.state, 'enemy');
    this.renderAll();
    await this.banner('ENEMY TURN', 'enemy');
    await this.showPhaseEvents(eEvents);
    if (stale() || await this.checkOutcome()) return;

    for (const u of R.livingUnits(this.state, 'enemy')) {
      if (!u.alive) continue;
      const p = planTurn(this.state, u);
      const idle = !p.actionId && p.dest.r === u.r && p.dest.c === u.c;
      if (idle) { u.acted = true; continue; } // guards holding position
      this.inspect = u;
      this.renderCard();
      await this.board.focusTile(u.r, u.c, { onlyIfOffscreen: true });
      const path = R.moveUnit(this.state, u, p.dest.r, p.dest.c) ?? [];
      if (path.length > 1) await this.board.walk(u, path, () => audio.sfx('step'));
      if (p.actionId) {
        await this.board.focusTile(p.target.r, p.target.c, { onlyIfOffscreen: true });
        const action = R.getAction(u, p.actionId);
        const plan = R.resolveAction(this.state, u, action, p.target);
        await this.board.wait(120);
        await this.playAction(u, action, p.target, plan);
      } else {
        u.acted = true;
        await this.board.wait(120);
      }
      if (stale() || await this.checkOutcome()) return;
    }

    this.inspect = null;
    const hEvents = R.startPhase(this.state, 'hero');
    this.renderAll();
    this.board.focusUnits(R.livingUnits(this.state, 'hero'), { onlyIfOffscreen: true });
    await this.banner('YOUR TURN', 'hero');
    await this.showPhaseEvents(hEvents);
    if (stale() || await this.checkOutcome()) return;
    this.mode = 'idle';
    this.renderAll();
  }

  async checkOutcome() {
    const result = R.outcome(this.state);
    if (!result) return false;
    this.mode = 'over';
    this.renderAll();
    await this.board.wait(500);
    audio.stop();
    audio.sfx(result);
    this.onEnd?.(result, { level: this.level, squadIds: this.squadIds, state: this.state });
    return true;
  }

  // ------------------------------------------------------------------ HUD
  renderAll() {
    this.renderOverlays();
    this.renderTopbar();
    this.renderCard();
    this.renderActions();
    this.renderForecast();
  }

  renderOverlays() {
    const ov = new Map();
    const set = (list, type) => list.forEach(t => ov.set(R.key(t.r, t.c), type));
    if (this.mode === 'selected' && this.sel) {
      // Red fringe: everywhere this unit could attack (after moving, if it still can).
      const from = this.sel.moved ? new Map([[R.key(this.sel.r, this.sel.c), { r: this.sel.r, c: this.sel.c }]]) : this.nodes;
      set(R.threatTiles(this.state, this.sel, from), 'reach');
      if (!this.sel.moved) set([...this.nodes.values()].filter(n => !n.blocked), 'move');
    }
    if (this.mode === 'target' && this.action) {
      set(R.rangeTiles(this.state, this.sel, this.sel, this.action), 'range');
      set(this.targets, this.action.kind === 'heal' ? 'heal' : 'target');
      if (this.pending) {
        if (this.action.area > 0) set(R.areaTiles(this.state, this.pending.target, this.action.area), 'area');
        set([this.pending.target], this.action.kind === 'heal' ? 'heal' : 'target');
      }
    }
    if ((this.mode === 'idle' || this.mode === 'selected') && this.inspect?.team === 'enemy') {
      const zone = [...R.reachable(this.state, this.inspect).values()].filter(n => !n.blocked);
      for (const n of zone) if (!ov.has(R.key(n.r, n.c))) ov.set(R.key(n.r, n.c), 'danger');
    }
    this.board.setOverlays(ov);
    this.board.selectedId = this.sel?.id ?? null;
  }

  renderTopbar() {
    const pill = $('turn-pill');
    const enemy = this.state.phase === 'enemy';
    pill.textContent = `Turn ${this.state.turn} · ${enemy ? 'Enemy turn' : 'Your move'}`;
    pill.classList.toggle('enemy', enemy);
    $('btn-end').disabled = enemy || this.mode === 'busy' || this.mode === 'over';
  }

  renderCard() {
    const u = this.inspect ?? this.sel;
    const card = $('unit-card');
    if (!u) { card.classList.add('hidden'); this.cardUnitId = null; return; }
    card.classList.remove('hidden');
    const asp = ASPECTS[u.aspect];
    const enemy = u.team === 'enemy';
    const html = `
      <canvas id="uc-portrait"></canvas>
      <div class="uc-name"><span class="n">${esc(u.name)}</span> <span class="uc-lv">Lv ${u.lv}</span> <span class="uc-title">${esc(u.title)}</span>
        <span class="uc-aspect" style="background:${asp.color}">${asp.name}</span></div>
      <div class="bar hp ${enemy ? 'enemy' : ''}"><i style="width:${(u.hp / u.maxHp) * 100}%"></i><b>HP ${u.hp}/${u.maxHp}</b></div>
      <div class="bar sp ${u.sp >= 100 ? 'full' : ''}"><i style="width:${u.sp}%"></i><b>SP ${u.sp}${u.sp >= 100 ? ' · ULTIMATE READY' : ''}</b></div>
      <div class="uc-info">ⓘ</div>
      <div class="uc-stats"><span>ATK <b>${u.atk}</b></span><span>DEF <b>${u.def}</b></span><span>MOV <b>${u.mov}</b></span><span>JMP <b>${u.jump}</b></span><span>REACH <b>${u.range[0] === u.range[1] ? u.range[1] : `${u.range[0]}–${u.range[1]}`}</b></span></div>`;
    const sameUnit = this.cardUnitId === u.id;
    const old = sameUnit ? card.querySelector('#uc-portrait') : null;
    card.innerHTML = html;
    if (old) card.replaceChild(old, card.querySelector('#uc-portrait'));
    else { const c = card.querySelector('#uc-portrait'); renderPortrait(c, u.look, { focus: 'bust', zoom: c.clientHeight / 40, bg: 'rgba(255,255,255,0.06)' }); }
    this.cardUnitId = u.id;
  }

  renderActions() {
    const el = $('actions');
    const u = this.sel;
    if (!u || !(this.mode === 'selected' || this.mode === 'target')) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const btn = (id, label, sub, { disabled = false, cls = '', meta = '' } = {}) =>
      `<button class="act ${cls} ${this.action?.id === id ? 'active' : ''}" data-act="${id}" ${disabled ? 'disabled' : ''}>` +
      `<span class="act-main"><span>${esc(label)}</span><small>${esc(sub)}</small></span>${meta ? `<span class="act-meta">${meta}</span>` : ''}</button>`;
    const meta = a => this.reachMeta(u, a);
    const parts = [];
    const atk = R.getAction(u, 'attack');
    const atkOk = R.validTargets(this.state, u, u, atk).length > 0;
    parts.push(btn('attack', 'Attack', atkOk ? 'Free' : 'no target', { disabled: !atkOk, meta: meta(atk) }));
    for (const id of u.skills) {
      const a = R.getAction(u, id);
      const none = !R.validTargets(this.state, u, u, a).length;
      parts.push(btn(id, a.name, none ? 'no target' : `${a.cost} SP`, { disabled: u.sp < a.cost || none, meta: meta(a) }));
    }
    if (u.ult) {
      const a = R.getAction(u, u.ult);
      const none = !R.validTargets(this.state, u, u, a).length;
      parts.push(btn(u.ult, `★ ${a.name}`, u.sp >= 100 ? (none ? 'no target' : 'READY') : `${u.sp}/100`, { disabled: u.sp < 100 || none, cls: u.sp >= 100 && !none ? 'ult' : '', meta: meta(a) }));
    }
    parts.push(`<div class="act-row">${btn('wait', 'Wait', '')}${btn('undo', 'Undo', '', { disabled: !u.moved })}</div>`);
    el.innerHTML = parts.join('');
  }

  // "⌖ Reach 2–4 tiles · Area 1" for an action from the unit's current tile.
  reachMeta(u, a) {
    const r = R.actionRange(this.state, u, u, a);
    const bonus = r[1] > a.range[1] ? ' <em>+1 high ground</em>' : '';
    const area = a.area > 0 ? ` · Area ${a.area}` : '';
    const kind = a.kind === 'heal' ? ' · Heals' : '';
    return `⌖ Reach ${R.rangeLabel(r)}${bonus}${area}${kind}`;
  }

  renderForecast() {
    const el = $('forecast');
    if (this.mode !== 'target' || !this.action) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const a = this.action;
    if (!this.pending) {
      el.innerHTML = `<div class="fc-title">${esc(a.name)}</div><div class="fc-reach">${this.reachMeta(this.sel, a)}</div><div class="fc-hint">${esc(a.desc ?? 'Basic attack.')} Tap a target marked with ⌖.</div>`;
      return;
    }
    const lines = this.pending.plan.events.map(e => {
      const t = R.unitById(this.state, e.targetId);
      if (e.type === 'heal') return `<div class="fc-line"><span>${esc(t.name)}</span><span class="heal">+${e.amount} HP</span></div>`;
      const src = e.assist ? `<span class="tag combo">COMBO · ${esc(R.unitById(this.state, e.sourceId).name)}</span>` : '';
      const tags = [
        e.back ? '<span class="tag back">BACKSTAB</span>' : '',
        e.aspect > 1 ? '<span class="tag strong">STRONG</span>' : '',
        e.aspect < 1 ? '<span class="tag weak">RESIST</span>' : '',
        e.ko ? '<span class="tag ko">K.O.</span>' : '',
      ].join('');
      return `<div class="fc-line"><span>${esc(t.name)} ${src}</span><span><span class="dmg">−${e.amount}</span>${tags}</span></div>`;
    }).join('');
    el.innerHTML = `
      <div class="fc-title">${esc(this.sel.name)} ▸ ${esc(a.name)}</div>
      ${lines || '<div class="fc-hint">No effect.</div>'}
      <div class="fc-confirm"><button class="btn small" data-fc="go">Confirm</button><button class="btn small ghost" data-fc="no">Cancel</button></div>
      <div class="fc-hint">or tap the target again</div>`;
  }
}
