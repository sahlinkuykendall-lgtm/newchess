import { Board } from './render/board.js';
import { Battle } from './ui/battle.js';
import { LEVELS } from './game/levels.js';
import { audio } from './audio.js';

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------- settings
const SETTINGS_KEY = 'gambit-arena:settings';
const settings = { music: true, sfx: true, orient: 'landscape', speed: 1 };
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
const battle = new Battle(board, {});

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
function startBattle() {
  audio.unlock();
  $('title').classList.add('hidden');
  $('result').classList.add('hidden');
  $('btn-forfeit').classList.remove('hidden');
  battle.start(LEVELS[0]);
}

function toTitle() {
  battle.stop();
  board.setState(titleMap());
  board.setOverlays(new Map());
  $('btn-forfeit').classList.add('hidden');
  $('title').classList.remove('hidden');
  audio.play('title');
}

$('btn-start').addEventListener('click', startBattle);
$('btn-retry').addEventListener('click', startBattle);
$('btn-to-title').addEventListener('click', () => { audio.unlock(); toTitle(); });

function openSettings() {
  audio.unlock();
  audio.sfx('click');
  $('set-music').checked = settings.music;
  $('set-sfx').checked = settings.sfx;
  $('set-orient').value = settings.orient;
  $('set-speed').value = String(settings.speed);
  $('settings').classList.remove('hidden');
}
$('btn-settings').addEventListener('click', openSettings);
$('btn-title-settings').addEventListener('click', openSettings);
$('btn-settings-close').addEventListener('click', () => { $('settings').classList.add('hidden'); audio.sfx('click'); });
$('btn-forfeit').addEventListener('click', () => { $('settings').classList.add('hidden'); toTitle(); });
$('set-music').addEventListener('change', e => { settings.music = e.target.checked; saveSettings(); applySettings(); });
$('set-sfx').addEventListener('change', e => { settings.sfx = e.target.checked; saveSettings(); applySettings(); });
$('set-orient').addEventListener('change', e => { settings.orient = e.target.value; saveSettings(); applySettings(); layout(); });
$('set-speed').addEventListener('change', e => { settings.speed = Number(e.target.value); saveSettings(); applySettings(); });
$('btn-rotate-switch').addEventListener('click', () => {
  settings.orient = settings.orient === 'portrait' ? 'landscape' : 'portrait';
  saveSettings(); applySettings(); layout();
});
$('btn-help').addEventListener('click', () => { audio.sfx('click'); $('help').classList.remove('hidden'); });
$('btn-help-close').addEventListener('click', () => { audio.sfx('click'); $('help').classList.add('hidden'); });

// First tap anywhere on the title unlocks audio and starts the title music.
$('title').addEventListener('pointerdown', () => { audio.unlock(); audio.play('title'); }, { once: true });

applySettings();

// Show the arena behind the title screen.
const titleMap = () => ({ map: { rows: LEVELS[0].tiles.length, cols: LEVELS[0].tiles[0].length, tiles: LEVELS[0].tiles }, units: [], phase: 'hero' });
board.setState(titleMap());

// ---------------------------------------------------------- offline (PWA)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Handy for debugging from the browser console.
window.__gambit = { board, battle, settings };
