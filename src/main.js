import { Board } from './render/board.js';
import { Battle } from './ui/battle.js';
import { LEVELS } from './game/levels.js';
import { audio } from './audio.js';
import { bindProfileUi, openRoster } from './ui/profile.js';
import { showCampaign, hideCampaign, showSquad, hideSquad } from './ui/campaign.js';
import { loadSave, resetSave, awardVictory, heroInfo } from './game/progress.js';
import { UNITS, XP_PER_LEVEL } from './game/data.js';
import { renderPortrait } from './render/sprites.js';
import { VERSION, VERSION_NOTE, ASSETS } from './version.js';

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------- settings
const SETTINGS_KEY = 'gambit-arena:settings';
const settings = { music: true, sfx: true, orient: 'landscape', speed: 1, difficulty: 'normal' };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* private mode */ }

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

function applySettings() {
  audio.musicOn = settings.music;
  audio.sfxOn = settings.sfx;
  board.speed = Number(settings.speed) || 1;
  document.body.classList.toggle('want-landscape', settings.orient === 'landscape');
  document.body.classList.toggle('want-portrait', settings.orient === 'portrait');
  $('rotate-text').textContent = settings.orient === 'portrait' ? 'Rotate your phone upright' : 'Rotate your phone sideways';
  $('btn-rotate-switch').textContent = settings.orient === 'portrait' ? 'Play in landscape instead' : 'Play in portrait instead';
}

// ------------------------------------------------------------------- board
const canvas = $('board');
const board = new Board(canvas);
const battle = new Battle(board, { onEnd: (result, info) => handleEnd(result, info) });
let save = loadSave();
let current = null; // { index, squad }

function layout() {
  const portrait = window.innerHeight > window.innerWidth;
  board.insets = portrait
    ? { top: 64, bottom: 250, left: 8, right: 8 }
    : { top: 56, bottom: 14, left: 14, right: 14 };
  board.resize();
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 200));
layout();

function loop(now) {
  board.frame(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ------------------------------------------------- touch: tap, pan, pinch
const pointers = new Map();
let gesture = null;

canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) gesture = { x: e.clientX, y: e.clientY, moved: false };
  else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { pinch: Math.hypot(a.x - b.x, a.y - b.y), moved: true };
  }
});

canvas.addEventListener('pointermove', e => {
  const prev = pointers.get(e.pointerId);
  if (!prev || !gesture) return;
  const cur = { x: e.clientX, y: e.clientY };
  pointers.set(e.pointerId, cur);
  if (pointers.size === 2 && gesture.pinch) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    board.zoomBy(d / gesture.pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
    gesture.pinch = d;
    return;
  }
  if (!gesture.moved && Math.hypot(cur.x - gesture.x, cur.y - gesture.y) > 10) gesture.moved = true;
  if (gesture.moved) board.pan(cur.x - prev.x, cur.y - prev.y);
});

function endPointer(e) {
  const had = pointers.delete(e.pointerId);
  if (!had) return;
  if (pointers.size === 0) {
    if (gesture && !gesture.moved && e.type === 'pointerup') battle.onTap(board.pick(e.clientX, e.clientY));
    gesture = null;
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => { e.preventDefault(); board.zoomBy(e.deltaY < 0 ? 1.1 : 0.9, e.clientX, e.clientY); }, { passive: false });
$('btn-map').addEventListener('click', () => { audio.sfx('click'); board.toggleOverview(); });
document.addEventListener('gesturestart', e => e.preventDefault()); // iOS page zoom

// ------------------------------------------------------------------ screens
const esc = x => String(x).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const hideAll = () => ['title', 'campaign', 'squad', 'result'].forEach(id => $(id).classList.add('hidden'));

function openCampaign() {
  audio.unlock();
  battle.stop();
  hideAll();
  hideSquad();
  board.setState(titleMap());
  board.setOverlays(new Map());
  $('btn-forfeit').classList.add('hidden');
  audio.play('title');
  showCampaign(save, i => { audio.sfx('select'); openSquad(i); });
}

function openSquad(index) {
  hideAll();
  hideCampaign();
  showSquad(save, LEVELS[index], squad => { audio.sfx('select'); startStage(index, squad); });
}

function startStage(index, squad) {
  hideAll();
  hideCampaign();
  hideSquad();
  current = { index, squad };
  $('btn-forfeit').classList.remove('hidden');
  battle.start(LEVELS[index], { squad, difficulty: settings.difficulty });
}

async function handleEnd(result, { level, squadIds }) {
  const title = $('result-title');
  const next = LEVELS[current.index + 1];
  let html = '';
  if (result === 'victory') {
    if (!save.cleared[level.id] && level.outro) await battle.runDialog(level.outro);
    const r = awardVictory(save, level, squadIds);
    title.textContent = 'VICTORY!';
    html += `<p class="res-sub">${esc(level.stage)} ${esc(level.name)} cleared! <b>+${r.xp} XP</b> each${r.firstClear ? '' : ' (replay)'}</p>`;
    html += '<div class="res-list">' + r.levelUps.map(u => `
      <div class="res-row">
        <canvas data-id="${u.id}"></canvas>
        <span class="res-name">${esc(UNITS[u.id].name)}</span>
        <span class="res-lv">Lv ${u.from}${u.to > u.from ? ` → <b>${u.to}</b> <em>LEVEL UP!</em>` : ''}</span>
        <div class="res-xp"><i style="width:${(u.xp / XP_PER_LEVEL) * 100}%"></i></div>
      </div>`).join('') + '</div>';
    for (const id of r.joined) html += `<div class="res-join">✨ <b>${esc(UNITS[id].name)}</b> joined your team!</div>`;
    if (!next) html += '<div class="res-join">👑 Board 1 complete! More boards are coming.</div>';
  } else {
    title.textContent = 'DEFEAT';
    html = `<p class="res-sub">Your squad was knocked out.</p>
      <ul class="rules">
        <li>Replay earlier stages to <b>level up</b> your heroes.</li>
        <li>Try a different squad — check enemy aspects with the <b>?</b> chart.</li>
        <li>Hit from <b>behind</b>, stack <b>combos</b>, and keep Rin healing.</li>
        <li>Or switch to <b>Easy</b> in Settings.</li>
      </ul>`;
  }
  title.className = result;
  $('result-body').innerHTML = html;
  $('btn-next').classList.toggle('hidden', !(result === 'victory' && next));
  $('result').classList.remove('hidden');
  for (const c of $('result-body').querySelectorAll('canvas[data-id]')) {
    renderPortrait(c, UNITS[c.dataset.id].look, { focus: 'bust', zoom: c.clientHeight / 40, t: 1000 });
  }
}

$('btn-start').addEventListener('click', () => { audio.sfx('click'); openCampaign(); });
$('btn-camp-back').addEventListener('click', () => { audio.sfx('click'); toTitle(); });
$('btn-squad-back').addEventListener('click', () => { audio.sfx('click'); openCampaign(); });
$('btn-camp-roster').addEventListener('click', () => { audio.sfx('click'); openRoster(save.unlocked); });
$('btn-next').addEventListener('click', () => { audio.sfx('click'); battle.stop(); openSquad(current.index + 1); });
$('btn-retry').addEventListener('click', () => {
  audio.sfx('click');
  startStage(current.index, current.squad.map(h => ({ id: h.id, lv: heroInfo(save, h.id).lv })));
});
$('btn-to-camp').addEventListener('click', () => { audio.sfx('click'); openCampaign(); });

function toTitle() {
  battle.stop();
  hideAll();
  hideCampaign();
  hideSquad();
  board.setState(titleMap());
  board.setOverlays(new Map());
  $('btn-forfeit').classList.add('hidden');
  $('title').classList.remove('hidden');
  audio.play('title');
}

function openSettings() {
  audio.unlock();
  audio.sfx('click');
  $('set-music').checked = settings.music;
  $('set-sfx').checked = settings.sfx;
  $('set-orient').value = settings.orient;
  $('set-speed').value = String(settings.speed);
  $('set-diff').value = settings.difficulty;
  $('settings').classList.remove('hidden');
}
$('btn-settings').addEventListener('click', openSettings);
$('btn-title-settings').addEventListener('click', openSettings);
$('btn-settings-close').addEventListener('click', () => { $('settings').classList.add('hidden'); audio.sfx('click'); });
$('btn-forfeit').addEventListener('click', () => { $('settings').classList.add('hidden'); openCampaign(); });
$('set-diff').addEventListener('change', e => { settings.difficulty = e.target.value; saveSettings(); });
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Reset all progress? Hero levels, recruits and cleared stages will be lost.')) return;
  save = resetSave();
  $('settings').classList.add('hidden');
  if (!$('campaign').classList.contains('hidden')) openCampaign();
});
$('set-music').addEventListener('change', e => { settings.music = e.target.checked; saveSettings(); applySettings(); });
$('set-sfx').addEventListener('change', e => { settings.sfx = e.target.checked; saveSettings(); applySettings(); });
$('set-orient').addEventListener('change', e => { settings.orient = e.target.value; saveSettings(); applySettings(); layout(); });
$('set-speed').addEventListener('change', e => { settings.speed = Number(e.target.value); saveSettings(); applySettings(); });
$('btn-rotate-switch').addEventListener('click', () => {
  settings.orient = settings.orient === 'portrait' ? 'landscape' : 'portrait';
  saveSettings(); applySettings(); layout();
});
bindProfileUi(() => audio.sfx('click'));
$('btn-roster').addEventListener('click', () => { audio.unlock(); audio.sfx('click'); openRoster(save.unlocked); });
$('btn-help').addEventListener('click', () => { audio.sfx('click'); $('help').classList.remove('hidden'); });
$('btn-help-close').addEventListener('click', () => { audio.sfx('click'); $('help').classList.add('hidden'); });

// First tap anywhere on the title unlocks audio and starts the title music.
$('title').addEventListener('pointerdown', () => { audio.unlock(); audio.play('title'); }, { once: true });

applySettings();

// Show the arena behind the title screen.
const BOSS = LEVELS[LEVELS.length - 1];
const titleMap = () => ({ map: { rows: BOSS.tiles.length, cols: BOSS.tiles[0].length, tiles: BOSS.tiles }, units: [], phase: 'hero' });
board.setState(titleMap());

// ---------------------------------------------------------- offline (PWA) + updates
$('app-version').textContent = `v${VERSION} · ${VERSION_NOTE}`;
$('set-version').textContent = `v${VERSION}`;

let swReg = null;
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then(r => { swReg = r; })
    .catch(() => {});
}

function showBanner(text, { button = true } = {}) {
  $('update-text').textContent = text;
  $('btn-update-now').classList.toggle('hidden', !button);
  $('btn-update-later').classList.toggle('hidden', !button);
  $('update-banner').classList.remove('hidden');
}

// Compare our VERSION with version.json on the server (bypassing every cache).
async function checkForUpdate({ manual = false } = {}) {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { version } = await res.json();
    if (version !== VERSION) showBanner(`Version ${version} is ready (you have ${VERSION}).`);
    else if (manual) showBanner(`You have the latest version (v${VERSION}).`, { button: false });
  } catch {
    if (manual) showBanner('Couldn’t check for updates — are you online?', { button: false });
  }
  if (manual) setTimeout(() => { if ($('btn-update-now').classList.contains('hidden')) $('update-banner').classList.add('hidden'); }, 2500);
  swReg?.update().catch(() => {});
}

// Throw away every cached copy of the game, re-download it all, and reload.
// Saved progress and settings live in localStorage and are not touched.
async function forceUpdate() {
  showBanner('Updating… downloading the newest version.', { button: false });
  $('settings').classList.add('hidden');
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map(r => r.unregister()));
  } catch { /* ignore */ }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  } catch { /* ignore */ }
  await Promise.all(ASSETS.map(u => fetch(u, { cache: 'reload' }).catch(() => {})));
  location.replace(`./?v=${Date.now()}`);
}

$('btn-update-now').addEventListener('click', forceUpdate);
$('btn-update-later').addEventListener('click', () => $('update-banner').classList.add('hidden'));
$('app-version').addEventListener('click', () => { audio.sfx('click'); checkForUpdate({ manual: true }); });
$('btn-check-update').addEventListener('click', () => { audio.sfx('click'); checkForUpdate({ manual: true }); });
$('btn-force-update').addEventListener('click', () => { audio.sfx('click'); forceUpdate(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
setTimeout(() => checkForUpdate(), 1500);
// Drop the ?v= cache-buster from the address once loaded.
if (location.search.includes('v=')) history.replaceState(null, '', location.pathname);

// Handy for debugging from the browser console.
window.__gambit = { board, battle, settings, get save() { return save; }, startStage };
