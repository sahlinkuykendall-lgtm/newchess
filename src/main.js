import { Board } from './render/board.js';
import { Battle } from './ui/battle.js';
import { LEVELS } from './game/levels.js';
import { audio } from './audio.js';
import { bindProfileUi } from './ui/profile.js';
import { showSquad, hideSquad } from './ui/campaign.js';
import { bindArmory } from './ui/armory.js';
import { initHub, showHub, hideHub, renderSplash, teamLevel } from './ui/hub.js';
import { loadSave, resetSave, awardVictory, squadEntry, isStageUnlocked } from './game/progress.js';
import { UNITS, xpToNext } from './game/data.js';
import { DIFFICULTY } from './game/rules.js';
import { ARENA, makeWave, arenaPool, squadLevel, awardWave, startRun, endlessRecord, isEndlessUnlocked } from './game/endless.js';
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
const hideAll = () => {
  ['title', 'result'].forEach(id => $(id).classList.add('hidden'));
  hideSquad();
  hideHub();
};

// The main menu. `tab`: home | story | heroes | armory | modes.
function openMenu(tab = 'home', extra = {}) {
  audio.unlock();
  battle.stop();
  hideAll();
  board.setState(titleMap());
  board.setOverlays(new Map());
  $('btn-forfeit').classList.add('hidden');
  audio.play('title');
  showHub(tab, extra);
}

function openSquad(index) {
  current = { ...(current ?? {}), pendingIndex: index };
  hideAll();
  showSquad(save, LEVELS[index], squad => { audio.sfx('select'); startStage(index, squad); }, n => audio.sfx(n));
}

// ---------------------------------------------------------------- endless arena
function openEndlessSquad() {
  if (!isEndlessUnlocked(save)) return;
  current = { ...(current ?? {}), pendingEndless: true };
  hideAll();
  const level = { ...ARENA, heroLevel: teamLevel(save) };
  showSquad(save, level, squad => { audio.sfx('select'); startEndless(squad); }, n => audio.sfx(n));
}

const bossesSeen = () => ['varg', 'ignis'].filter(id => LEVELS.some(l => save.cleared[l.id] && l.enemies.some(e => e.id === id)));
const waveOpts = run => ({ teamLv: run.teamLv, pool: run.pool, bossesSeen: run.bosses });

function startEndless(squad) {
  hideAll();
  startRun(save);
  const run = { wave: 1, gold: 0, xp: 0, teamLv: squadLevel(save, squad.map(h => h.id)), pool: arenaPool(save), bosses: bossesSeen() };
  current = { endless: true, squad, run };
  $('btn-forfeit').classList.remove('hidden');
  battle.start({ ...ARENA, enemies: makeWave(1, waveOpts(run)) }, { squad, difficulty: settings.difficulty });
}

function nextWave() {
  const run = current.run;
  run.wave++;
  $('result').classList.add('hidden');
  battle.nextWave(run.wave, makeWave(run.wave, waveOpts(run)), { mult: DIFFICULTY[settings.difficulty] ?? 1 });
}

const levelRows = levelUps => '<div class="res-list">' + levelUps.map(u => `
      <div class="res-row">
        <canvas data-id="${u.id}"></canvas>
        <span class="res-name">${esc(UNITS[u.id].name)}</span>
        <span class="res-lv">Lv ${u.from}${u.to > u.from ? ` → <b>${u.to}</b> <em>LEVEL UP!</em>` : ''}</span>
        <div class="res-xp"><i style="width:${(u.xp / xpToNext(u.to)) * 100}%"></i></div>
      </div>`).join('') + '</div>';

function showResult(result, title, html, { next = null, retry = 'Retry', menu = 'Menu' } = {}) {
  $('result-title').textContent = title;
  $('result-title').className = result;
  $('result-body').innerHTML = html;
  $('btn-next').classList.toggle('hidden', !next);
  if (next) $('btn-next').textContent = next;
  $('btn-retry').textContent = retry;
  $('btn-to-camp').textContent = menu;
  $('result').classList.remove('hidden');
  for (const c of $('result-body').querySelectorAll('canvas[data-id]')) {
    renderPortrait(c, UNITS[c.dataset.id].look, { focus: 'bust', zoom: c.clientHeight / 40, t: 1000 });
  }
}

function handleEndless(result, { squadIds, state }) {
  const run = current.run;
  if (result === 'victory') {
    const r = awardWave(save, run.wave, squadIds);
    run.gold += r.gold; run.xp += r.xp;
    const left = state.units.filter(u => u.alive && u.team === 'hero').length;
    const champ = (run.wave + 1) % 5 === 0;
    showResult('victory', `WAVE ${run.wave} CLEARED!`, `
      <p class="res-sub">Banked <b>+${r.xp} XP</b> each · <b>+${r.gold} 🪙</b>${r.newBest ? ' · <b>🏆 New best!</b>' : ''}<br>
      This run: <b>${run.gold} 🪙</b> · <b>${run.xp} XP</b> · ${left}/${squadIds.length} heroes standing</p>
      ${levelRows(r.levelUps)}
      <div class="res-join">Next: <b>Wave ${run.wave + 1}</b>${champ ? ' — 👑 an <b>Arena Champion</b> joins the fight!' : ''} Survivors heal 30%. Level-ups apply next run.</div>`,
      { next: `Wave ${run.wave + 1} ▶`, retry: 'New Run', menu: 'Cash Out' });
    $('btn-retry').classList.add('hidden');
  } else {
    const rec = endlessRecord(save);
    const cleared = run.wave - 1;
    showResult('defeat', 'RUN OVER', `
      <p class="res-sub">You cleared <b>${cleared} wave${cleared === 1 ? '' : 's'}</b> · Best: <b>wave ${rec.best}</b><br>
      Earned this run: <b>${run.gold} 🪙</b> · <b>${run.xp} XP</b> each — already banked.</p>
      <ul class="rules"><li>Level up and gear up, then try again.</li><li>Keep a healer alive — KO’d heroes stay down until the run ends.</li></ul>`,
      { retry: 'New Run', menu: 'Menu' });
    $('btn-retry').classList.remove('hidden');
  }
}

function startStage(index, squad) {
  hideAll();
  current = { index, squad };
  $('btn-forfeit').classList.remove('hidden');
  battle.start(LEVELS[index], { squad, difficulty: settings.difficulty });
}

async function handleEnd(result, info) {
  if (current?.endless) return handleEndless(result, info);
  const { level, squadIds } = info;
  $('btn-retry').classList.remove('hidden');
  const title = $('result-title');
  const next = LEVELS[current.index + 1];
  let html = '';
  if (result === 'victory') {
    if (!save.cleared[level.id] && level.outro) await battle.runDialog(level.outro);
    const r = awardVictory(save, level, squadIds);
    title.textContent = 'VICTORY!';
    html += `<p class="res-sub">${esc(level.stage)} ${esc(level.name)} cleared! <b>+${r.xp} XP</b> each · <b>+${r.gold} 🪙</b>${r.firstClear ? '' : ' (replay)'} · Gold: ${save.gold}</p>`;
    html += levelRows(r.levelUps);
    for (const id of r.joined) html += `<div class="res-join">✨ <b>${esc(UNITS[id].name)}</b> joined your team!</div>`;
    if (next && next.boardNo !== level.boardNo) html += `<div class="res-join">🗺 <b>Board ${next.boardNo}: ${esc(next.board)}</b> unlocked!</div>`;
    if (!next) html += '<div class="res-join">👑 Every board cleared! More are coming.</div>';
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
  showResult(result, title.textContent, html, { next: result === 'victory' && next ? 'Next Stage ›' : null });
}

$('btn-start').addEventListener('click', e => { e.stopPropagation(); audio.sfx('click'); openMenu('home'); });
$('title').addEventListener('click', () => { audio.sfx('click'); openMenu('home'); });
$('btn-squad-back').addEventListener('click', () => { audio.sfx('click'); openMenu(current?.pendingEndless ? 'modes' : 'story'); });
// Enemies you've met: everything in stages you can play.
const seenEnemies = () => [...new Set(LEVELS.filter((l, i) => isStageUnlocked(save, i)).flatMap(l => l.enemies.map(e => e.id)))];
bindArmory();
initHub({
  getSave: () => save,
  onBattle: i => { audio.sfx('select'); current = { ...(current ?? {}), pendingEndless: false }; openSquad(i); },
  onEndless: () => { audio.sfx('select'); openEndlessSquad(); },
  onSettings: () => openSettings(),
  sound: n => audio.sfx(n),
  seenEnemies,
});
$('btn-squad-armory').addEventListener('click', () => {
  audio.sfx('click');
  const idx = current?.pendingIndex ?? 0;
  const endless = !!current?.pendingEndless;
  openMenu('armory', { onBack: () => (endless ? openEndlessSquad() : openSquad(idx)) });
});
$('btn-next').addEventListener('click', () => {
  audio.sfx('click');
  if (current.endless) return nextWave();
  battle.stop(); openSquad(current.index + 1);
});
$('btn-retry').addEventListener('click', () => {
  audio.sfx('click');
  const squad = current.squad.map(h => squadEntry(save, h.id));
  if (current.endless) return startEndless(squad);
  startStage(current.index, squad);
});
$('btn-to-camp').addEventListener('click', () => { audio.sfx('click'); openMenu('home'); });

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
$('btn-settings-close').addEventListener('click', () => { $('settings').classList.add('hidden'); audio.sfx('click'); });
$('btn-forfeit').addEventListener('click', () => { $('settings').classList.add('hidden'); openMenu(current?.endless ? 'modes' : 'story'); });
$('set-diff').addEventListener('change', e => { settings.difficulty = e.target.value; saveSettings(); });
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Reset all progress? Hero levels, recruits and cleared stages will be lost.')) return;
  save = resetSave();
  $('settings').classList.add('hidden');
  if (!$('shell').classList.contains('hidden')) openMenu('home');
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
$('btn-help').addEventListener('click', () => { audio.sfx('click'); $('help').classList.remove('hidden'); });
$('btn-help-close').addEventListener('click', () => { audio.sfx('click'); $('help').classList.add('hidden'); });

// First tap anywhere on the title unlocks audio and starts the title music.
$('title').addEventListener('pointerdown', () => { audio.unlock(); audio.play('title'); }, { once: true });

applySettings();

// Show the arena behind the title screen.
const BOSS = LEVELS[LEVELS.length - 1];
const titleMap = () => ({ map: { rows: BOSS.tiles.length, cols: BOSS.tiles[0].length, tiles: BOSS.tiles }, units: [], phase: 'hero' });
board.setState(titleMap());
renderSplash(save);

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
