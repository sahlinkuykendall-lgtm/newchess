// Isometric board renderer, camera, hit testing and visual effects.
import { drawCharacter, drawShadow } from './sprites.js';
import { ASPECTS } from '../game/data.js';

export const TW = 64, TH = 32, HS = 14;
const BASE = -2.5; // the island's rock base below height 0

export function iso(r, c, h) {
  return { x: (c - r) * TW / 2, y: (c + r) * TH / 2 - h * HS };
}

const PALETTE = {
  grass: { top: '#5aa152', top2: '#529849', left: '#7a5638', right: '#634529', rim: '#3f7a35' },
  stone: { top: '#9493a3', top2: '#8a899a', left: '#646374', right: '#525161', rim: '#6c6b7c' },
  pillar: { top: '#a7a3b6', top2: '#a7a3b6', left: '#6e6a80', right: '#5a566b', rim: '#7f7a92' },
  water: { top: '#2c7fd6', top2: '#2a78cc', left: '#1d5698', right: '#174a85', rim: '#2468b5' },
  lava: { top: '#ff6a1f', top2: '#ff7d2a', left: '#7a2a10', right: '#62210c', rim: '#c2410c' },
  shrine: { top: '#d9cf9c', top2: '#d9cf9c', left: '#7a5638', right: '#634529', rim: '#a99b5f' },
  sand: { top: '#dcc68f', top2: '#d3bd84', left: '#9b7b4c', right: '#86693e', rim: '#c4ad73' },
  dirt: { top: '#a98257', top2: '#a07a4f', left: '#7a5638', right: '#634529', rim: '#8d6a45' },
  ash: { top: '#5a524d', top2: '#534b46', left: '#3a3330', right: '#2e2826', rim: '#463f3b' },
  basalt: { top: '#4a4553', top2: '#4a4553', left: '#2c2833', right: '#221f28', rim: '#3a3542' },
  bridge: { top: '#b07a42', top2: '#a8733d', left: '#6e4724', right: '#5b3a1c', rim: '#7d5229' },
};
// Tiles drawn on top of another ground type.
const GROUND = { tree: 'grass', rock: 'grass', obsidian: 'ash', boulder: 'stone' };
const TALL = new Set(['pillar', 'tree', 'basalt']);

// Tile highlights: fill, outline color, dashed outline, icon, pulse.
const OVERLAY = {
  move: { fill: 'rgba(30,110,255,0.45)', edge: '#9fd6ff' },
  reach: { fill: 'rgba(255,55,55,0.22)', edge: '#ff6b6b', dashed: true },
  danger: { fill: 'rgba(170,70,255,0.30)', edge: '#d3a6ff', dashed: true },
  range: { fill: 'rgba(255,85,55,0.30)', edge: '#ff8a65' },
  target: { fill: 'rgba(255,35,60,0.58)', edge: '#ffffff', icon: 'cross', pulse: true },
  heal: { fill: 'rgba(40,230,140,0.48)', edge: '#c6ffe2', icon: 'plus', pulse: true },
  area: { fill: 'rgba(255,170,40,0.62)', edge: '#ffe7a3', pulse: true },
};
// Grid neighbours for each diamond edge: [dr, dc, cornerA, cornerB]
const EDGES = [[-1, 0, 'T', 'R'], [0, 1, 'R', 'B'], [1, 0, 'B', 'L'], [0, -1, 'L', 'T']];

const easeOut = t => 1 - (1 - t) ** 3;

export class Board {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = null;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.overlays = new Map(); // key -> overlay type
    this.selectedId = null;
    this.vis = new Map(); // unit id -> {r, c, h, dx, dy, alpha, flashUntil}
    this.particles = [];
    this.texts = [];
    this.tweens = [];
    this.shake = 0;
    this.time = 0;
    this.speed = 1;
    this.insets = { top: 60, bottom: 20, left: 20, right: 20 };
    this.resize();
  }

  setState(state) {
    this.state = state;
    this.vis.clear();
    for (const u of state.units) this.vis.set(u.id, { r: u.r, c: u.c, h: this.heightAt(u.r, u.c), dx: 0, dy: 0, alpha: 1, flashUntil: 0 });
    this._bounds = null;
    this.fit();
    this.cam = { ...this.overview };
  }

  heightAt(r, c) {
    const t = this.state.map.tiles[r]?.[c];
    if (!t) return 0;
    return t.type === 'water' ? t.h - 0.3 : t.h;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.dpr = dpr;
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    if (this.state) {
      this.fit();
      this.cam.zoom = Math.max(this.fitZoom, Math.min(this.maxZoom(), this.cam.zoom));
    }
  }

  bounds() {
    if (this._bounds) return this._bounds;
    const { rows, cols } = this.state.map;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const t = this.state.map.tiles[r][c];
      if (!t) continue;
      const top = iso(r, c, t.h);
      const bot = iso(r, c, BASE);
      minX = Math.min(minX, top.x - TW / 2); maxX = Math.max(maxX, top.x + TW / 2);
      minY = Math.min(minY, top.y - TH / 2 - 40); maxY = Math.max(maxY, bot.y + TH / 2);
    }
    this._bounds = { minX, maxX, minY, maxY };
    return this._bounds;
  }

  // Overview camera: the whole map fits the screen.
  fit() {
    const b = this.bounds();
    const { top, bottom, left, right } = this.insets;
    const aw = Math.max(100, this.w - left - right), ah = Math.max(100, this.h - top - bottom);
    const zoom = Math.min(aw / (b.maxX - b.minX), ah / (b.maxY - b.minY), 2.2);
    this.fitZoom = zoom;
    this.overview = this.camFor((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, zoom);
  }

  // Zoom used while playing: characters stay big enough to tap on a phone.
  playZoom() {
    return Math.max(this.fitZoom, Math.min(1.7, Math.max(0.8, Math.min(this.w, this.h) / 420)));
  }

  maxZoom() { return Math.max(this.fitZoom * 1.5, 2.6); }

  // Camera that puts world point (wx, wy) in the middle of the free screen area.
  camFor(wx, wy, zoom) {
    const { top, bottom, left, right } = this.insets;
    return { x: wx - (left - right) / 2 / zoom, y: wy - (top - bottom) / 2 / zoom, zoom };
  }

  clampCam() {
    const b = this.bounds();
    this.cam.x = Math.max(b.minX, Math.min(b.maxX, this.cam.x));
    this.cam.y = Math.max(b.minY, Math.min(b.maxY, this.cam.y));
  }

  moveCam(target, ms = 380) {
    const from = { ...this.cam };
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    return this.tween(ms, t => {
      const k = ease(t);
      this.cam.x = from.x + (target.x - from.x) * k;
      this.cam.y = from.y + (target.y - from.y) * k;
      this.cam.zoom = from.zoom + (target.zoom - from.zoom) * k;
    });
  }

  // Center the camera on a tile. With onlyIfOffscreen, skip when it's already comfortably visible.
  focusTile(r, c, { animate = true, onlyIfOffscreen = false, zoom = null } = {}) {
    const p = iso(r, c, this.heightAt(r, c));
    if (onlyIfOffscreen) {
      const s = this.toScreen(p.x, p.y - 20);
      const { top, bottom, left, right } = this.insets;
      const mx = (this.w - left - right) * 0.18, my = (this.h - top - bottom) * 0.2;
      if (s.x > left + mx && s.x < this.w - right - mx && s.y > top + my && s.y < this.h - bottom - my) return Promise.resolve();
    }
    const z = zoom ?? (this.cam.zoom < this.playZoom() * 0.95 ? this.playZoom() : this.cam.zoom);
    const target = this.camFor(p.x, p.y - 20, z);
    this.lastFocus = { r, c };
    if (!animate) { this.cam = target; return Promise.resolve(); }
    return this.moveCam(target);
  }

  focusUnits(units, opts) {
    if (!units.length) return Promise.resolve();
    const r = Math.round(units.reduce((a, u) => a + u.r, 0) / units.length);
    const c = Math.round(units.reduce((a, u) => a + u.c, 0) / units.length);
    return this.focusTile(r, c, opts);
  }

  toggleOverview() {
    if (this.cam.zoom <= this.fitZoom * 1.05) {
      const f = this.lastFocus;
      if (f) return this.focusTile(f.r, f.c, { zoom: this.playZoom() });
      return this.moveCam({ ...this.overview, zoom: this.playZoom() });
    }
    return this.moveCam(this.overview);
  }

  pan(dx, dy) {
    this.cam.x -= dx / this.cam.zoom;
    this.cam.y -= dy / this.cam.zoom;
    this.clampCam();
  }

  zoomBy(f, sx, sy) {
    const before = this.toWorld(sx, sy);
    this.cam.zoom = Math.max(this.fitZoom * 0.9, Math.min(this.maxZoom(), this.cam.zoom * f));
    const after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
    this.clampCam();
  }

  toWorld(sx, sy) {
    return { x: (sx - this.w / 2) / this.cam.zoom + this.cam.x, y: (sy - this.h / 2) / this.cam.zoom + this.cam.y };
  }

  toScreen(wx, wy) {
    return { x: (wx - this.cam.x) * this.cam.zoom + this.w / 2, y: (wy - this.cam.y) * this.cam.zoom + this.h / 2 };
  }

  unitScreenPos(unit) {
    const v = this.vis.get(unit.id);
    const p = iso(v.r, v.c, v.h);
    return this.toScreen(p.x, p.y);
  }

  // What is under the screen point? Returns { units, tile, tiles }: every unit
  // whose sprite was hit (closest body first) and the tiles under the point.
  pick(sx, sy) {
    const w = this.toWorld(sx, sy);
    let tile = null;
    const bodyDist = u => {
      const v = this.vis.get(u.id);
      const p = iso(v.r, v.c, v.h);
      return Math.hypot(w.x - p.x, (w.y - (p.y - 22)) * 0.6);
    };
    const units = this.state.units.filter(u => u.alive)
      .filter(u => {
        const v = this.vis.get(u.id);
        const p = iso(v.r, v.c, v.h);
        return Math.abs(w.x - p.x) < 14 && w.y < p.y + 5 && w.y > p.y - 48;
      })
      .sort((a, b) => bodyDist(a) - bodyDist(b));
    const { rows, cols } = this.state.map;
    const order = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (this.state.map.tiles[r][c]) order.push({ r, c });
    order.sort((a, b) => (b.r + b.c) - (a.r + a.c));
    const tiles = order.filter(({ r, c }) => {
      const p = iso(r, c, this.heightAt(r, c));
      return Math.abs(w.x - p.x) / (TW / 2) + Math.abs(w.y - p.y) / (TH / 2) <= 1;
    });
    tile = tiles[0] ?? null;
    return { units, tile, tiles };
  }

  setOverlays(map) { this.overlays = map; }

  // --- animation helpers -------------------------------------------------
  tween(duration, fn) {
    return new Promise(resolve => this.tweens.push({ start: this.time, duration: duration / this.speed, fn, resolve }));
  }

  async projectile(from, to, color) {
    const a = iso(from.r, from.c, this.heightAt(from.r, from.c)), b = iso(to.r, to.c, this.heightAt(to.r, to.c));
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    await this.tween(120 + dist * 0.8, t => {
      const x = a.x + (b.x - a.x) * t, y = a.y - 24 + (b.y - a.y) * t - Math.sin(t * Math.PI) * dist * 0.25;
      this.particles.push({ x, y, vx: 0, vy: 0, born: this.time, life: 220, color, size: 4 });
      this.particles.push({ x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4, vx: 0, vy: 0, born: this.time, life: 300, color: '#fff', size: 2 });
    });
  }

  wait(ms) { return this.tween(ms, () => {}); }

  syncUnit(unit) {
    const v = this.vis.get(unit.id);
    v.r = unit.r; v.c = unit.c; v.h = this.heightAt(unit.r, unit.c);
  }

  async walk(unit, path, onStep) {
    const v = this.vis.get(unit.id);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const ha = this.heightAt(a.r, a.c), hb = this.heightAt(b.r, b.c);
      const hop = Math.abs(hb - ha) > 0 ? 0.6 : 0.15;
      onStep?.();
      await this.tween(140, t => {
        v.r = a.r + (b.r - a.r) * t;
        v.c = a.c + (b.c - a.c) * t;
        v.h = ha + (hb - ha) * t + Math.sin(t * Math.PI) * hop;
      });
    }
    this.syncUnit(unit);
  }

  async lunge(unit, target) {
    const v = this.vis.get(unit.id);
    const a = iso(unit.r, unit.c, 0), b = iso(target.r, target.c, 0);
    const dx = (b.x - a.x) * 0.35, dy = (b.y - a.y) * 0.35;
    await this.tween(110, t => { v.dx = dx * easeOut(t); v.dy = dy * easeOut(t); });
    this.tween(160, t => { v.dx = dx * (1 - t); v.dy = dy * (1 - t); });
  }

  hitFx(unit, { amount, color = '#fff', text = null, big = false, heal = false }) {
    const v = this.vis.get(unit.id);
    const p = iso(v.r, v.c, v.h);
    if (!heal) {
      v.flashUntil = this.time + 160;
      this.shake = Math.max(this.shake, big ? 9 : 4);
    }
    this.burst(p.x, p.y - 22, heal ? '#7dffb2' : color, big ? 26 : 12);
    this.texts.push({ x: p.x, y: p.y - 50, vy: -0.03, text: heal ? `+${amount}` : `${amount}`, color: heal ? '#7dffb2' : '#fff', stroke: heal ? '#0b4a2a' : '#5a0a14', size: big ? 22 : 17, born: this.time, life: 900 });
    if (text) this.texts.push({ x: p.x, y: p.y - 68, vy: -0.02, text, color: '#ffe066', stroke: '#3a2400', size: 11, born: this.time, life: 1000 });
  }

  floatText(unit, text, color = '#ffe066') {
    const v = this.vis.get(unit.id);
    const p = iso(v.r, v.c, v.h);
    this.texts.push({ x: p.x, y: p.y - 62, vy: -0.025, text, color, stroke: '#1a1426', size: 12, born: this.time, life: 1000 });
  }

  burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.05 + Math.random() * 0.15;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.06, born: this.time, life: 400 + Math.random() * 400, color, size: 1.5 + Math.random() * 2.5 });
    }
  }

  areaFx(tiles, color) {
    for (const t of tiles) {
      const p = iso(t.r, t.c, this.heightAt(t.r, t.c));
      this.burst(p.x, p.y, color, 8);
    }
  }

  async koFx(unit) {
    const v = this.vis.get(unit.id);
    const p = iso(v.r, v.c, v.h);
    this.burst(p.x, p.y - 20, '#ffffff', 20);
    await this.tween(500, t => { v.alpha = 1 - t; v.dy = -t * 12; });
  }

  // --- rendering ---------------------------------------------------------
  frame(now) {
    const dt = this.time ? Math.min(50, now - this.time) : 16;
    this.time = now;
    for (const tw of [...this.tweens]) {
      const t = Math.min(1, (now - tw.start) / tw.duration);
      tw.fn(t);
      if (t >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.resolve(); }
    }
    this.draw(dt);
  }

  draw(dt) {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.state) return;

    this.shake *= 0.85;
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    const z = this.cam.zoom * dpr;
    ctx.setTransform(z, 0, 0, z, (this.w / 2 + sx) * dpr - this.cam.x * z, (this.h / 2 + sy) * dpr - this.cam.y * z);
    ctx.lineJoin = 'round';

    const { rows, cols, tiles } = this.state.map;
    const v0 = this.toWorld(0, 0), v1 = this.toWorld(this.w, this.h);
    const items = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const tile = tiles[r][c];
      if (!tile) continue;
      const p = iso(r, c, tile.h);
      if (p.x < v0.x - TW || p.x > v1.x + TW || p.y < v0.y - 40 || p.y > v1.y + 120 + (tile.h - BASE) * HS) continue;
      items.push({ d: (r + c) * 2, r, c, tile });
    }
    for (const u of this.state.units) {
      const v = this.vis.get(u.id);
      if (!u.alive && v.alpha <= 0) continue;
      items.push({ d: (Math.ceil(v.r) + Math.ceil(v.c)) * 2 + 1, unit: u, v });
    }
    items.sort((a, b) => a.d - b.d);
    for (const it of items) {
      if (it.unit) this.drawUnit(it.unit, it.v);
      else this.drawTile(it.r, it.c, it.tile);
    }

    // particles + text on top
    this.particles = this.particles.filter(p => this.time - p.born < p.life);
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.0004 * dt;
      ctx.globalAlpha = 1 - (this.time - p.born) / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    this.texts = this.texts.filter(t => this.time - t.born < t.life);
    for (const t of this.texts) {
      const age = this.time - t.born;
      const pop = age < 120 ? 0.6 + 0.4 * (age / 120) * 1.3 : 1;
      ctx.globalAlpha = Math.min(1, 2 - (age / t.life) * 2);
      ctx.font = `900 ${t.size * pop}px "Avenir Next", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = t.stroke;
      const y = t.y + t.vy * age;
      ctx.strokeText(t.text, t.x, y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, y);
    }
    ctx.globalAlpha = 1;
  }

  // Tall blocks and trees fade out when a unit or highlight is right behind them.
  hidesUnit(r, c, tile) {
    if (!TALL.has(tile.type)) return false;
    const behind = (pr, pc) => pr + pc < r + c && Math.abs(pr - r) <= 1 && Math.abs(pc - c) <= 1;
    if (this.state.units.some(u => u.alive && behind(u.r, u.c))) return true;
    return [[r - 1, c], [r, c - 1], [r - 1, c - 1]].some(([pr, pc]) => this.overlays.has(`${pr},${pc}`));
  }

  drawTile(r, c, tile) {
    const { ctx } = this;
    const fade = this.hidesUnit(r, c, tile) ? 0.4 : 1;
    ctx.globalAlpha = fade;
    if (tile.type === 'bridge') this.drawRiverBed(r, c, tile.h - 1.3);
    const pal = PALETTE[GROUND[tile.type] ?? tile.type];
    const h = this.heightAt(r, c);
    const p = iso(r, c, h);
    const depth = tile.type === 'bridge' ? 5 : (h - BASE) * HS;
    const L = { x: p.x - TW / 2, y: p.y }, R = { x: p.x + TW / 2, y: p.y };
    const T = { x: p.x, y: p.y - TH / 2 }, B = { x: p.x, y: p.y + TH / 2 };

    // side faces
    ctx.beginPath();
    ctx.moveTo(L.x, L.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x, B.y + depth); ctx.lineTo(L.x, L.y + depth); ctx.closePath();
    ctx.fillStyle = pal.left; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(B.x, B.y); ctx.lineTo(R.x, R.y); ctx.lineTo(R.x, R.y + depth); ctx.lineTo(B.x, B.y + depth); ctx.closePath();
    ctx.fillStyle = pal.right; ctx.fill();
    // grass lip
    if (pal.rim && tile.type !== 'bridge' && tile.type !== 'water' && tile.type !== 'lava') {
      ctx.beginPath();
      ctx.moveTo(L.x, L.y); ctx.lineTo(B.x, B.y); ctx.lineTo(R.x, R.y); ctx.lineTo(R.x, R.y + 4); ctx.lineTo(B.x, B.y + 4); ctx.lineTo(L.x, L.y + 4); ctx.closePath();
      ctx.fillStyle = pal.rim; ctx.fill();
    }

    // top face
    let top = (r * 7 + c * 13) % 3 === 0 ? pal.top2 : pal.top;
    if (tile.type === 'lava') {
      const k = 0.5 + 0.5 * Math.sin(this.time / 400 + r + c);
      top = `rgb(255,${90 + 50 * k},${20 + 20 * k})`;
    }
    ctx.beginPath();
    ctx.moveTo(T.x, T.y); ctx.lineTo(R.x, R.y); ctx.lineTo(B.x, B.y); ctx.lineTo(L.x, L.y); ctx.closePath();
    ctx.fillStyle = top; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.stroke();

    if (tile.type === 'water') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      const o = ((this.time / 60) + (r * 7 + c * 13)) % 24 - 12;
      ctx.beginPath(); ctx.moveTo(p.x - 10 + o * 0.5, p.y - 2); ctx.lineTo(p.x + 2 + o * 0.5, p.y - 2); ctx.stroke();
    } else if (tile.type === 'shrine') {
      const k = 0.5 + 0.5 * Math.sin(this.time / 500);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 16, 8, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(90,255,200,${0.5 + 0.4 * k})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(90,255,200,${0.25 + 0.25 * k})`; ctx.fill();
    } else if (tile.type === 'pillar') {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.moveTo(B.x - 6, B.y + 8); ctx.lineTo(B.x - 2, B.y + 20); ctx.lineTo(B.x - 7, B.y + 30); ctx.stroke();
    } else if (tile.type === 'bridge') {
      ctx.strokeStyle = 'rgba(60,35,15,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        ctx.moveTo(L.x + (T.x - L.x) * t, L.y + (T.y - L.y) * t);
        ctx.lineTo(B.x + (R.x - B.x) * t, B.y + (R.y - B.y) * t);
      }
      ctx.stroke();
    } else if (tile.type === 'tree') {
      this.drawTree(p.x, p.y, r * 13 + c * 7);
    } else if (tile.type === 'rock' || tile.type === 'boulder') {
      this.drawRock(p.x, p.y, r * 5 + c * 11);
    } else if (tile.type === 'obsidian') {
      this.drawRock(p.x, p.y, r * 5 + c * 11, ['#3a3248', '#5a4f70', '#241e30']);
    } else if ((tile.type === 'grass' || tile.type === 'dirt') && (r * 31 + c * 17) % 5 === 0) {
      ctx.strokeStyle = '#3f7a35'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p.x - 6, p.y + 2); ctx.lineTo(p.x - 7, p.y - 3); ctx.moveTo(p.x - 4, p.y + 2); ctx.lineTo(p.x - 3, p.y - 4); ctx.moveTo(p.x + 8, p.y - 3); ctx.lineTo(p.x + 9, p.y - 7); ctx.stroke();
    }

    const ov = this.overlays.get(`${r},${c}`);
    if (ov) this.drawOverlay(r, c, p, ov, fade);
    ctx.globalAlpha = 1;
  }

  // A highlighted tile: solid fill, faint grid line, and a bold outline only on
  // the outside edges of each highlighted region so areas read clearly.
  drawOverlay(r, c, p, type, fade) {
    const { ctx } = this;
    const o = OVERLAY[type];
    const pulse = o.pulse ? 0.78 + 0.22 * Math.sin(this.time / 150) : 1;
    const k = 0.9; // outline sits just inside the tile so tiles in front don't cover it
    const P = {
      T: { x: p.x, y: p.y - TH / 2 }, R: { x: p.x + TW / 2, y: p.y },
      B: { x: p.x, y: p.y + TH / 2 }, L: { x: p.x - TW / 2, y: p.y },
    };
    const I = Object.fromEntries(Object.entries(P).map(([n, q]) => [n, { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k }]));
    ctx.globalAlpha = pulse * fade;
    ctx.beginPath();
    ctx.moveTo(P.T.x, P.T.y); ctx.lineTo(P.R.x, P.R.y); ctx.lineTo(P.B.x, P.B.y); ctx.lineTo(P.L.x, P.L.y); ctx.closePath();
    ctx.fillStyle = o.fill; ctx.fill();
    ctx.globalAlpha = 0.35 * fade;
    ctx.strokeStyle = o.edge; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = fade;
    // outer boundary
    const outer = EDGES.filter(([dr, dc]) => this.overlays.get(`${r + dr},${c + dc}`) !== type);
    if (outer.length) {
      ctx.lineCap = 'round';
      ctx.setLineDash(o.dashed ? [5, 4] : []);
      for (const [w, col] of [[5, 'rgba(10,8,20,0.55)'], [2.6, o.edge]]) {
        ctx.beginPath();
        for (const [, , a, b] of outer) { ctx.moveTo(I[a].x, I[a].y); ctx.lineTo(I[b].x, I[b].y); }
        ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    // icons
    if (o.icon) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, 0.5);
      ctx.lineCap = 'round';
      for (const [w, col] of [[4.5, 'rgba(10,8,20,0.6)'], [2, '#ffffff']]) {
        ctx.beginPath();
        if (o.icon === 'cross') {
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.moveTo(-14, 0); ctx.lineTo(-5, 0); ctx.moveTo(5, 0); ctx.lineTo(14, 0);
          ctx.moveTo(0, -14); ctx.lineTo(0, -5); ctx.moveTo(0, 5); ctx.lineTo(0, 14);
        } else {
          ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7);
        }
        ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Water seen under a bridge deck.
  drawRiverBed(r, c, h) {
    const { ctx } = this;
    const pal = PALETTE.water;
    const p = iso(r, c, h);
    const depth = (h - BASE) * HS;
    const L = { x: p.x - TW / 2, y: p.y }, R = { x: p.x + TW / 2, y: p.y };
    const T = { x: p.x, y: p.y - TH / 2 }, B = { x: p.x, y: p.y + TH / 2 };
    ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(B.x, B.y); ctx.lineTo(B.x, B.y + depth); ctx.lineTo(L.x, L.y + depth); ctx.closePath();
    ctx.fillStyle = pal.left; ctx.fill();
    ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(R.x, R.y); ctx.lineTo(R.x, R.y + depth); ctx.lineTo(B.x, B.y + depth); ctx.closePath();
    ctx.fillStyle = pal.right; ctx.fill();
    ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(R.x, R.y); ctx.lineTo(B.x, B.y); ctx.lineTo(L.x, L.y); ctx.closePath();
    ctx.fillStyle = pal.top; ctx.fill();
    // support posts
    const top = iso(r, c, h + 1.3);
    ctx.fillStyle = '#5b3a1c';
    for (const [x, y] of [[top.x - 18, top.y + 2], [top.x + 18, top.y + 2], [top.x, top.y + 11]]) ctx.fillRect(x - 2, y, 4, 1.3 * HS);
  }

  drawTree(x, y, seed) {
    const { ctx } = this;
    const s = 0.85 + (seed % 5) * 0.06;
    const sway = Math.sin(this.time / 900 + seed) * 1.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 2, 16, 6, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
    ctx.fillStyle = '#6b4424'; ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.rect(-3.5, -18, 7, 20); ctx.fill(); ctx.stroke();
    const blob = (bx, by, br, col) => {
      ctx.beginPath(); ctx.arc(bx + sway, by, br, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill(); ctx.stroke();
    };
    ctx.strokeStyle = '#173a1a';
    blob(-10, -24, 11, '#2f7a3a');
    blob(10, -25, 11, '#2f7a3a');
    blob(0, -38, 14, '#3d9448');
    blob(-4, -28, 10, '#46a352');
    ctx.beginPath(); ctx.arc(-4 + sway, -42, 4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
    ctx.restore();
  }

  drawRock(x, y, seed, [base, light, dark] = ['#8b8798', '#a9a5b6', '#6f6b7e']) {
    const { ctx } = this;
    const s = 0.9 + (seed % 4) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * (seed % 2 ? 1 : -1), s);
    ctx.beginPath(); ctx.ellipse(0, 3, 17, 6, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-16, 3); ctx.lineTo(-13, -10); ctx.lineTo(-4, -19); ctx.lineTo(8, -17); ctx.lineTo(15, -7); ctx.lineTo(16, 3); ctx.closePath();
    ctx.fillStyle = base; ctx.fill();
    ctx.strokeStyle = '#2b2838'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-13, -10); ctx.lineTo(-4, -19); ctx.lineTo(8, -17); ctx.lineTo(0, -9); ctx.closePath();
    ctx.fillStyle = light; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(16, 3); ctx.lineTo(15, -7); ctx.lineTo(8, -17); ctx.closePath();
    ctx.fillStyle = dark; ctx.fill();
    ctx.restore();
  }

  drawUnit(u, v) {
    const { ctx } = this;
    const p = iso(v.r, v.c, v.h);
    const bob = u.alive && !u.acted ? Math.sin(this.time / 300 + u.id.length) * 0.8 : 0;
    ctx.save();
    ctx.translate(p.x + v.dx, p.y + v.dy);
    ctx.globalAlpha = v.alpha;

    // selection ring / team ring
    const ring = u.team === 'hero' ? '#4cc3ff' : '#ff4d6d';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
    ctx.strokeStyle = this.selectedId === u.id ? '#ffe066' : ring;
    ctx.lineWidth = this.selectedId === u.id ? 2.5 : 1.5;
    ctx.stroke();
    drawShadow(ctx, 12);

    ctx.translate(0, bob);
    if (u.sp >= 100 && u.alive) {
      const k = 0.5 + 0.5 * Math.sin(this.time / 160);
      ctx.shadowColor = ASPECTS[u.aspect].color;
      ctx.shadowBlur = 8 + 8 * k;
    }
    if (u.acted && u.team === 'hero' && this.state.phase === 'hero') ctx.globalAlpha = v.alpha * 0.55;
    drawCharacter(ctx, u.look, u.facing);
    ctx.restore();

    if (this.time < v.flashUntil) {
      // quick white flash overlay
      ctx.save();
      ctx.translate(p.x + v.dx, p.y + v.dy + bob);
      ctx.globalAlpha = 0.7;
      ctx.globalCompositeOperation = 'lighter';
      drawCharacter(ctx, u.look, u.facing);
      ctx.restore();
    }

    // HP bar (+ crown for mission leaders)
    if (u.alive) {
      const x = p.x - 14, y = p.y - 58 + v.dy;
      if (u.leader) {
        ctx.font = '12px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('👑', p.x, y - 3);
      }
      ctx.fillStyle = 'rgba(10,8,20,0.8)';
      ctx.fillRect(x - 1, y - 1, 30, 6);
      const f = u.hp / u.maxHp;
      ctx.fillStyle = u.team === 'hero' ? (f > 0.35 ? '#4ade80' : '#facc15') : (f > 0.35 ? '#ff5d73' : '#ff9f43');
      ctx.fillRect(x, y, 28 * f, 2.6);
      ctx.fillStyle = ASPECTS[u.aspect].color;
      ctx.fillRect(x, y + 2.8, 28 * (u.sp / 100), 1.4);
    }
  }
}
