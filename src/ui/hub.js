// Main menu: splash lineup, top resource bar, bottom tab bar and the tab screens
// (Battle home, Story map, Heroes, Armory, Modes), plus the stage details sheet.
import { LEVELS } from '../game/levels.js';
import { UNITS, ASPECTS, xpToNext } from '../game/data.js';
import { PROFILES } from '../game/characters.js';
import { heroInfo, isStageUnlocked, REPLAY_XP } from '../game/progress.js';
import { renderPortrait } from '../render/sprites.js';
import { HERO_IDS, ENEMY_IDS, openProfile } from './profile.js';
import { showArmory, hideArmory } from './armory.js';
import { isEndlessUnlocked, endlessRecord } from '../game/endless.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export const ENEMY_ICON = { varg: '🐺', imp: '😈', brute: '🐸', gargoyle: '🗿', hound: '🐕', witch: '🧙', golem: '🪨', ignis: '🐉' };
export const MISSION = {
  rout: { icon: '⚔️', name: 'Rout' },
  checkmate: { icon: '♚', name: 'Checkmate' },
  survive: { icon: '⏳', name: 'Survive' },
  endless: { icon: '♾️', name: 'Endless' },
};
const RANKS = [[0, 'Rookie'], [2, 'Challenger'], [4, 'Contender'], [6, 'Veteran'], [8, 'Champion'], [10, 'Grandmaster']];
const SEEN_KEY = 'gambit-arena:seen-heroes';

let opts = null;      // { getSave, onBattle(index), onEndless(), onSettings, sound(name), seenEnemies() }
let tab = 'home';
let showcase = null;  // hero id on the home pedestal
let boardShown = null;
let anim = 0;
const animated = [];  // [{ canvas, look, opts }] redrawn every frame while visible

const save = () => opts.getSave();
export const missionOf = level => MISSION[level.missionType?.type ?? 'rout'];

// First stage that's unlocked but not cleared (or the last stage once everything is done).
export function nextStageIndex(s) {
  const i = LEVELS.findIndex((l, k) => isStageUnlocked(s, k) && !s.cleared[l.id]);
  return i >= 0 ? i : LEVELS.length - 1;
}

// Average level of your strongest heroes (up to the squad size).
export function teamLevel(s, size = 5) {
  const lvs = s.unlocked.map(id => heroInfo(s, id).lv).sort((a, b) => b - a).slice(0, size);
  return lvs.length ? Math.round(lvs.reduce((a, b) => a + b, 0) / lvs.length) : 1;
}

function foeList(level) {
  const foes = new Map();
  for (const e of level.enemies) {
    const f = foes.get(e.id) ?? { id: e.id, n: 0, lo: 99, hi: 0, leader: false };
    f.n++; f.lo = Math.min(f.lo, e.lv ?? 1); f.hi = Math.max(f.hi, e.lv ?? 1); f.leader ||= !!e.leader;
    foes.set(e.id, f);
  }
  return [...foes.values()];
}
const foeIcons = level => foeList(level).map(f => `<span class="foe">${ENEMY_ICON[f.id] ?? '•'}<small>×${f.n}</small></span>`).join('');

function levelCheck(s, level) {
  const team = teamLevel(s, level.spawns.length);
  const need = level.heroLevel ?? 1;
  const cls = team >= need + 1 ? 'good' : team >= need ? 'ok' : 'warn';
  return `<span class="lv-check ${cls}">Suggested Lv ${need} · Your team Lv ${team}${cls === 'warn' ? ' — tough!' : cls === 'good' ? ' ✓' : ''}</span>`;
}

function rewardChips(s, level) {
  const first = !s.cleared[level.id];
  const k = first ? 1 : REPLAY_XP;
  const chips = [`<span class="reward xp">⭐ ${Math.round(level.xp * k)} XP</span>`, `<span class="reward gold">🪙 ${Math.round(level.gold * k)}</span>`];
  if (first && level.joins?.length) chips.push(`<span class="reward join">✨ ${level.joins.map(id => esc(UNITS[id].name)).join(' & ')} join${level.joins.length > 1 ? '' : 's'}</span>`);
  if (!first) chips.push('<span class="reward replay">Replay</span>');
  return chips.join('');
}

// ------------------------------------------------------------------ animation
function addAnimated(canvas, look, o) { animated.push({ canvas, look, o }); }
function startAnim() {
  cancelAnimationFrame(anim);
  const loop = now => {
    for (let i = animated.length - 1; i >= 0; i--) {
      const a = animated[i];
      if (!a.canvas.isConnected) { animated.splice(i, 1); continue; }
      if (a.canvas.closest('.hidden')) continue;
      renderPortrait(a.canvas, a.look, { ...a.o, t: now + (a.o.offset ?? 0) });
    }
    if (animated.length) anim = requestAnimationFrame(loop);
  };
  anim = requestAnimationFrame(loop);
}

// ------------------------------------------------------------------ splash
export function renderSplash(s) {
  const el = $('splash-lineup');
  const ids = s.unlocked.slice(0, 5);
  el.innerHTML = ids.map(id => `<canvas data-id="${id}" style="--asp:${ASPECTS[UNITS[id].aspect].color}"></canvas>`).join('');
  animated.length = 0;
  el.querySelectorAll('canvas').forEach((c, i) => addAnimated(c, UNITS[c.dataset.id].look, { focus: 'body', zoom: c.clientHeight / 62, offset: i * 370 }));
  startAnim();
  $('install-hint').classList.toggle('hidden', !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches));
}

// ------------------------------------------------------------------ shell
export function initHub(o) {
  opts = o;
  $('hub-tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (b) { opts.sound('click'); setTab(b.dataset.tab); }
  });
  $('hub-settings').addEventListener('click', () => opts.onSettings());
  $('hub-avatar').addEventListener('click', () => { opts.sound('click'); setTab('heroes'); });
  $('hub-goldchip').addEventListener('click', () => { opts.sound('click'); setTab('armory'); });
  $('hub-trophy').addEventListener('click', () => { opts.sound('click'); setTab('story'); });
  $('stage-sheet').addEventListener('click', e => { if (e.target.id === 'stage-sheet') closeSheet(); });
  window.addEventListener('resize', () => { if (tab === 'story' && !$('shell').classList.contains('hidden')) drawPath(); });
}

export function showHub(t = tab, extra = {}) {
  $('shell').classList.remove('hidden');
  setTab(t, extra);
}

export function hideHub() {
  $('shell').classList.add('hidden');
  closeSheet();
  hideArmory();
  cancelAnimationFrame(anim);
  animated.length = 0;
}

export function setTab(t, extra = {}) {
  tab = t;
  for (const b of $('hub-tabs').querySelectorAll('button')) b.classList.toggle('on', b.dataset.tab === t);
  for (const id of ['home', 'story', 'heroes', 'modes']) $(`tab-${id}`).classList.toggle('hidden', id !== t);
  animated.length = 0;
  if (t === 'armory') showArmory(save(), { onSound: opts.sound, onChange: renderTopbar, ...extra });
  else hideArmory();
  if (t === 'home') renderHome();
  if (t === 'story') renderStory();
  if (t === 'heroes') renderHeroes(extra.bestiary);
  if (t === 'modes') renderModes();
  renderTopbar();
  startAnim();
}

export function renderTopbar() {
  const s = save();
  const cleared = LEVELS.filter(l => s.cleared[l.id]).length;
  const rankIdx = RANKS.reduce((k, [min], i) => (cleared >= min ? i : k), 0);
  const [lo] = RANKS[rankIdx], hi = RANKS[rankIdx + 1]?.[0];
  $('hub-rank').textContent = RANKS[rankIdx][1];
  $('hub-rank-bar').style.width = `${hi ? ((cleared - lo) / (hi - lo)) * 100 : 100}%`;
  $('hub-stars').textContent = `${cleared}/${LEVELS.length}`;
  $('hub-gold').textContent = s.gold ?? 0;
  $('hub-lv').textContent = Math.max(...s.unlocked.map(id => heroInfo(s, id).lv));
  const lead = s.lastSquad?.find(id => s.unlocked.includes(id)) ?? s.unlocked[0];
  const c = $('hub-avatar').querySelector('canvas');
  renderPortrait(c, UNITS[lead].look, { focus: 'bust', zoom: c.clientHeight / 34, t: 1000 });
  const unseen = s.unlocked.filter(id => !seenHeroes().includes(id)).length;
  $('heroes-badge').textContent = unseen;
  $('heroes-badge').classList.toggle('hidden', !unseen);
}

function seenHeroes() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)) ?? ['kai', 'goro', 'rin', 'sora']; } catch { return ['kai', 'goro', 'rin', 'sora']; }
}
function markHeroesSeen(ids) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* private mode */ }
}

// ------------------------------------------------------------------ home
function renderHome() {
  const s = save();
  if (!showcase || !s.unlocked.includes(showcase)) showcase = s.lastSquad?.find(id => s.unlocked.includes(id)) ?? s.unlocked[0];
  const i = nextStageIndex(s);
  const level = LEVELS[i];
  const allDone = LEVELS.every(l => s.cleared[l.id]);
  const boardLevels = LEVELS.filter(l => l.boardNo === level.boardNo);
  const boardDone = boardLevels.filter(l => s.cleared[l.id]).length;
  const t = UNITS[showcase], h = heroInfo(s, showcase), m = missionOf(level);
  $('tab-home').innerHTML = `
    <div class="home">
      <div class="showcase" style="--asp:${ASPECTS[t.aspect].color}">
        <div class="sc-rays"></div>
        <div class="sc-pedestal"></div>
        <canvas id="sc-canvas"></canvas>
        <div id="sc-bubble" class="sc-bubble hidden"></div>
        <button class="sc-arrow l" data-sc="-1" aria-label="Previous hero">‹</button>
        <button class="sc-arrow r" data-sc="1" aria-label="Next hero">›</button>
        <div class="sc-plate">
          <span class="sc-asp" style="background:${ASPECTS[t.aspect].color}">${ASPECTS[t.aspect].glyph}</span>
          <div><b>${esc(t.name)}</b><small>Lv ${h.lv} · ${esc(t.title)}</small></div>
        </div>
      </div>
      <div class="home-side">
        <div class="chapter-card ${level.boss ? 'boss' : ''}">
          <div class="cc-kicker">BOARD ${level.boardNo} · ${esc(level.board).toUpperCase()}</div>
          <div class="cc-progress"><i style="width:${(boardDone / boardLevels.length) * 100}%"></i><span>${boardDone}/${boardLevels.length}</span></div>
          <div class="cc-next">
            <span class="cc-stage">${esc(level.stage)}</span>
            <b>${level.boss ? '👑 ' : ''}${esc(level.name)}</b>
          </div>
          <div class="cc-row"><span class="mission-chip">${m.icon} ${m.name}</span><span class="cc-foes">${foeIcons(level)}</span></div>
          <div class="cc-row">${levelCheck(s, level)}</div>
          <div class="cc-rewards">${rewardChips(s, level)}</div>
        </div>
        <button id="home-battle" class="btn-battle ${level.boss ? 'boss' : ''}">
          <span class="bb-main">${allDone ? 'REPLAY' : 'BATTLE'}</span>
          <span class="bb-sub">${esc(level.stage)} ${esc(level.name)}</span>
        </button>
        <button id="home-map" class="btn ghost small">🗺️ Story map</button>
      </div>
    </div>`;
  const c = $('sc-canvas');
  addAnimated(c, t.look, { focus: 'body', zoom: c.clientHeight / 66 });
  $('home-battle').onclick = () => { opts.sound('select'); openSheet(i); };
  $('home-map').onclick = () => { opts.sound('click'); setTab('story'); };
  $('tab-home').querySelectorAll('[data-sc]').forEach(b => b.onclick = () => {
    const list = s.unlocked;
    showcase = list[(list.indexOf(showcase) + Number(b.dataset.sc) + list.length) % list.length];
    opts.sound('click');
    setTab('home');
  });
  c.onclick = () => {
    const bubble = $('sc-bubble');
    bubble.textContent = PROFILES[showcase].quote.replace(/^“|”$/g, '');
    bubble.classList.remove('hidden');
    bubble.style.animation = 'none'; void bubble.offsetWidth; bubble.style.animation = '';
    opts.sound('select');
  };
}

// ------------------------------------------------------------------ story map
function renderStory() {
  const s = save();
  const boards = [...new Set(LEVELS.map(l => l.boardNo))];
  const boardOpen = b => isStageUnlocked(s, LEVELS.findIndex(l => l.boardNo === b));
  const next = nextStageIndex(s);
  if (boardShown === null || !boardOpen(boardShown)) boardShown = LEVELS[next].boardNo;
  const items = LEVELS.map((lv, i) => ({ lv, i })).filter(x => x.lv.boardNo === boardShown);
  const done = items.filter(x => s.cleared[x.lv.id]).length;
  const OFF = [0, 1, 0, -1];
  $('tab-story').innerHTML = `
    <div class="story">
      <div class="seg" id="story-boards">${boards.map(b => {
        const first = LEVELS.find(l => l.boardNo === b);
        return `<button data-board="${b}" class="${b === boardShown ? 'on' : ''}" ${boardOpen(b) ? '' : 'disabled'}>${boardOpen(b) ? '' : '🔒 '}Board ${b}<small>${esc(first.board)}</small></button>`;
      }).join('')}</div>
      <div class="board-banner b${boardShown}">
        <div><div class="cc-kicker">BOARD ${boardShown}</div><h2>${esc(items[0].lv.board)}</h2></div>
        <div class="bb-progress"><b>${done}/${items.length}</b><small>cleared</small></div>
      </div>
      <div class="map-wrap" id="map-wrap">
        <svg class="map-path" id="map-path"></svg>
        <div class="map-nodes">${items.map(({ lv, i }, k) => {
          const open = isStageUnlocked(s, i), cleared = !!s.cleared[lv.id], cur = i === next && !cleared;
          const st = cleared ? 'done' : cur ? 'current' : open ? 'open' : 'locked';
          const m = missionOf(lv);
          return `<div class="node-row" style="--off:${OFF[k % 4]}">
            <button class="node ${st} ${lv.boss ? 'boss' : ''}" data-i="${i}" ${open ? '' : 'disabled'}>
              ${cur ? '<span class="node-flag">NEXT</span>' : ''}
              <span class="node-num">${lv.boss ? '👑' : esc(lv.stage)}</span>
              ${cleared ? '<span class="node-check">✓</span>' : ''}
              ${open ? '' : '<span class="node-lock">🔒</span>'}
            </button>
            <div class="node-label"><b>${esc(lv.name)}</b><small>${lv.boss ? `${esc(lv.stage)} · Boss` : `${m.icon} ${m.name}`}</small></div>
          </div>`;
        }).join('')}</div>
      </div>
    </div>`;
  $('story-boards').onclick = e => {
    const b = e.target.closest('button[data-board]');
    if (b && !b.disabled) { opts.sound('click'); boardShown = Number(b.dataset.board); renderStory(); }
  };
  $('map-wrap').onclick = e => {
    const b = e.target.closest('.node');
    if (b && !b.disabled) { opts.sound('select'); openSheet(Number(b.dataset.i)); }
  };
  requestAnimationFrame(() => {
    drawPath();
    // Centre the next stage: sideways in landscape (the map scrolls), else scroll the tab.
    const node = $('tab-story').querySelector('.node.current') ?? $('tab-story').querySelector('.node.open:last-of-type');
    const wrap = $('map-wrap'), tabEl = $('tab-story');
    if (!node) return;
    const n = node.getBoundingClientRect(), w = wrap.getBoundingClientRect(), t = tabEl.getBoundingClientRect();
    if (wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft += n.left + n.width / 2 - (w.left + w.width / 2);
    else if (matchMedia('(orientation: portrait)').matches) tabEl.scrollTop += n.top + n.height / 2 - (t.top + t.height / 2);
  });
}

// Dotted road joining the stage nodes, drawn behind them.
function drawPath() {
  const wrap = $('map-wrap'), svg = $('map-path');
  if (!wrap || !svg) return;
  const box = wrap.getBoundingClientRect();
  const pts = [...wrap.querySelectorAll('.node')].map(n => {
    const r = n.getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2 + wrap.scrollLeft, y: r.top - box.top + r.height / 2 + wrap.scrollTop, done: n.classList.contains('done') };
  });
  svg.setAttribute('width', wrap.scrollWidth);
  svg.setAttribute('height', wrap.scrollHeight);
  let d = '', dDone = '';
  pts.forEach((p, k) => {
    if (!k) { d = `M${p.x},${p.y}`; dDone = d; return; }
    const a = pts[k - 1];
    const vertical = Math.abs(p.y - a.y) > Math.abs(p.x - a.x);
    const seg = vertical
      ? ` C${a.x},${(a.y + p.y) / 2} ${p.x},${(a.y + p.y) / 2} ${p.x},${p.y}`
      : ` C${(a.x + p.x) / 2},${a.y} ${(a.x + p.x) / 2},${p.y} ${p.x},${p.y}`;
    d += seg;
    if (a.done) dDone += seg;
  });
  svg.innerHTML = `<path d="${d}" class="road"/><path d="${d}" class="road-dash"/>${dDone.includes('C') ? `<path d="${dDone}" class="road-done"/>` : ''}`;
}

// ------------------------------------------------------------------ stage sheet
export function openSheet(index) {
  const s = save(), level = LEVELS[index], m = missionOf(level);
  $('stage-sheet-body').innerHTML = `
    <div class="sheet-grab"></div>
    <div class="ss-head ${level.boss ? 'boss' : ''}">
      <span class="ss-stage">${esc(level.stage)}</span>
      <h2>${level.boss ? '👑 ' : ''}${esc(level.name)}</h2>
      <span class="mission-chip">${m.icon} ${m.name}</span>
    </div>
    <p class="ss-mission">${esc(level.mission)}</p>
    <div class="ss-section">Enemies</div>
    <div class="ss-foes">${foeList(level).map(f => `
      <button class="ss-foe" data-foe="${f.id}" style="--asp:${ASPECTS[UNITS[f.id].aspect].color}">
        <canvas data-id="${f.id}"></canvas>
        <b>${esc(f.leader ? level.enemies.find(e => e.leader && e.id === f.id)?.name ?? UNITS[f.id].name : UNITS[f.id].name)}${f.leader ? ' 👑' : ''}</b>
        <small>×${f.n} · Lv ${f.lo === f.hi ? f.lo : `${f.lo}–${f.hi}`}</small>
      </button>`).join('')}</div>
    <div class="ss-section">Rewards</div>
    <div class="ss-rewards">${rewardChips(s, level)}</div>
    <div class="ss-rec">${levelCheck(s, level)}</div>
    <div class="ss-buttons">
      <button id="ss-close" class="btn ghost">Close</button>
      <button id="ss-go" class="btn primary big">BATTLE ▶</button>
    </div>`;
  $('stage-sheet').classList.remove('hidden');
  for (const c of $('stage-sheet-body').querySelectorAll('canvas[data-id]')) {
    renderPortrait(c, UNITS[c.dataset.id].look, { focus: 'bust', zoom: c.clientHeight / 40, t: 1000 });
  }
  $('ss-close').onclick = () => { opts.sound('cancel'); closeSheet(); };
  $('ss-go').onclick = () => { closeSheet(); opts.onBattle(index); };
  $('stage-sheet-body').querySelectorAll('[data-foe]').forEach(b => b.onclick = () => { opts.sound('click'); openProfile(b.dataset.foe); });
}

export function closeSheet() { $('stage-sheet').classList.add('hidden'); }

// ------------------------------------------------------------------ heroes
function joinsAfter(id) {
  const lv = LEVELS.find(l => l.joins?.includes(id));
  return lv ? `Joins after ${lv.stage}` : 'Joins later';
}

function renderHeroes(bestiary = false) {
  const s = save();
  const seenFoes = opts.seenEnemies();
  const ids = bestiary ? ENEMY_IDS : HERO_IDS;
  const have = bestiary ? seenFoes.length : s.unlocked.length;
  $('tab-heroes').innerHTML = `
    <div class="heroes">
      <div class="seg" id="heroes-seg">
        <button data-b="0" class="${bestiary ? '' : 'on'}">Heroes <small>${s.unlocked.length}/${HERO_IDS.length}</small></button>
        <button data-b="1" class="${bestiary ? 'on' : ''}">Bestiary <small>${seenFoes.length}/${ENEMY_IDS.length}</small></button>
      </div>
      <div class="hero-cards">${ids.map(id => {
        const t = UNITS[id];
        const open = bestiary ? seenFoes.includes(id) : s.unlocked.includes(id);
        if (!open) return `<div class="hcard locked"><div class="hc-q">?</div><div class="hc-plate"><b>???</b><small>${bestiary ? 'Not met yet' : joinsAfter(id)}</small></div></div>`;
        const h = heroInfo(s, id);
        const piece = PROFILES[id].piece.split(' ')[0];
        const isNew = !bestiary && !seenHeroes().includes(id);
        return `<button class="hcard ${bestiary ? 'foe' : ''}" data-id="${id}" style="--asp:${ASPECTS[t.aspect].color}">
          ${bestiary ? '' : `<span class="hc-lv">Lv ${h.lv}</span>`}
          <span class="hc-asp">${ASPECTS[t.aspect].glyph}</span>
          ${isNew ? '<span class="hc-new">NEW</span>' : ''}
          <canvas></canvas>
          <div class="hc-plate"><b>${esc(t.name)}</b><small>${esc(t.title)} · ${esc(piece)}</small>
            ${bestiary ? '' : `<div class="hc-xp"><i style="width:${(h.xp / xpToNext(h.lv)) * 100}%"></i></div>`}</div>
        </button>`;
      }).join('')}</div>
      <p class="hint">${have} of ${ids.length} ${bestiary ? 'enemies met' : 'heroes recruited'} · tap a card for the full profile</p>
    </div>`;
  $('tab-heroes').querySelectorAll('.hcard canvas').forEach((c, k) => {
    const id = c.closest('.hcard').dataset.id;
    renderPortrait(c, UNITS[id].look, { focus: 'body', zoom: c.clientHeight / 64, t: 1000 + k * 300 });
  });
  $('heroes-seg').onclick = e => {
    const b = e.target.closest('button[data-b]');
    if (b) { opts.sound('click'); renderHeroes(b.dataset.b === '1'); }
  };
  $('tab-heroes').querySelector('.hero-cards').onclick = e => {
    const b = e.target.closest('button.hcard');
    if (b) { opts.sound('click'); openProfile(b.dataset.id); }
  };
  if (!bestiary) { markHeroesSeen(s.unlocked); }
}

// ------------------------------------------------------------------ modes
function renderModes() {
  const s = save();
  const cleared = LEVELS.filter(l => s.cleared[l.id]).length;
  const mode = (id, icon, name, desc, { soon = false, meta = '', locked = '' } = {}) => `
    <button class="mode-card m-${id} ${soon || locked ? 'soon' : ''}" data-mode="${id}" ${soon || locked ? 'disabled' : ''}>
      <span class="mc-icon">${icon}</span>
      <span class="mc-text"><b>${name}</b><small>${desc}</small></span>
      ${soon ? '<span class="mc-tag">SOON</span>' : locked ? `<span class="mc-tag">🔒 ${locked}</span>` : `<span class="mc-meta">${meta}</span>`}
    </button>`;
  $('tab-modes').innerHTML = `
    <div class="modes">
      ${mode('story', '📖', 'Story Campaign', 'The Grand Gambit — fight your way to the top.', { meta: `${cleared}/${LEVELS.length} ›` })}
      ${mode('endless', '♾️', 'Endless Arena', 'Survive wave after wave for gold and XP. A champion every 5th wave.', isEndlessUnlocked(s) ? { meta: `Best ${endlessRecord(s).best} ›` } : { locked: 'Clear 1-2' })}
      ${mode('tournament', '🏟️', 'Tournament', 'Bracket fights against rival teams.', { soon: true })}
      ${mode('daily', '📅', 'Daily Challenge', 'A new puzzle battle every day.', { soon: true })}
      ${mode('versus', '🤝', 'Pass & Play', 'Battle a friend on one phone.', { soon: true })}
    </div>`;
  $('tab-modes').querySelector('[data-mode="story"]').onclick = () => { opts.sound('click'); setTab('story'); };
  $('tab-modes').querySelector('[data-mode="endless"]').onclick = () => opts.onEndless();
}
