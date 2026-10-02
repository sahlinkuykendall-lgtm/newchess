// Campaign map (stage select) and squad select screens.
import { LEVELS } from '../game/levels.js';
import { UNITS, ASPECTS, XP_PER_LEVEL } from '../game/data.js';
import { heroInfo, isStageUnlocked, squadEntry, heroGear } from '../game/progress.js';
import { ITEMS, SLOTS, SLOT_ICONS } from '../game/items.js';
import { renderPortrait } from '../render/sprites.js';
import { HERO_IDS } from './profile.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const ENEMY_ICON = { varg: '🐺', imp: '😈', brute: '🐸', gargoyle: '🗿' };

export function showCampaign(save, onPick) {
  const el = $('camp-stages');
  el.innerHTML = LEVELS.map((lv, i) => {
    const open = isStageUnlocked(save, i);
    const done = !!save.cleared[lv.id];
    const foes = {};
    for (const e of lv.enemies) foes[e.id] = (foes[e.id] ?? 0) + 1;
    const foeText = Object.entries(foes).map(([id, n]) => `${ENEMY_ICON[id] ?? '•'}×${n}`).join(' ');
    return `<button class="stage ${open ? '' : 'locked'} ${done ? 'done' : ''} ${lv.boss ? 'boss' : ''}" data-i="${i}" ${open ? '' : 'disabled'}>
      <div class="stage-num">${esc(lv.stage)}</div>
      <div class="stage-name">${lv.boss ? '👑 ' : ''}${esc(lv.name)}</div>
      <div class="stage-foes">${open ? foeText : '🔒 Clear the previous stage'}</div>
      <div class="stage-rec">Suggested Lv ${lv.heroLevel ?? 1}${done ? ' · ✓ Cleared' : ''}</div>
    </button>`;
  }).join('<div class="stage-link"></div>');
  el.onclick = e => {
    const b = e.target.closest('.stage');
    if (b && !b.disabled) onPick(Number(b.dataset.i));
  };
  $('camp-board').textContent = `Board 1 · ${LEVELS[0].board}`;
  $('camp-gold').textContent = `🪙 ${save.gold ?? 0}`;
  $('campaign').classList.remove('hidden');
  // scroll to the first uncleared stage
  const next = LEVELS.findIndex(l => !save.cleared[l.id]);
  el.querySelector(`[data-i="${Math.max(0, next)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

export function hideCampaign() { $('campaign').classList.add('hidden'); }

// Squad select. Calls onFight([{id, lv}]) with the chosen heroes in order.
export function showSquad(save, level, onFight) {
  const max = level.spawns.length;
  let picked = (save.lastSquad ?? []).filter(id => save.unlocked.includes(id)).slice(0, max);
  for (const id of save.unlocked) if (picked.length < max && !picked.includes(id)) picked.push(id);

  const render = () => {
    $('squad-title').textContent = `${level.stage} · ${level.name}`;
    $('squad-sub').textContent = `${level.mission} Pick up to ${max} heroes (${picked.length}/${max}). Suggested level ${level.heroLevel ?? 1}.`;
    $('squad-grid').innerHTML = HERO_IDS.map(id => {
      const t = UNITS[id];
      if (!save.unlocked.includes(id)) {
        return `<div class="sq-card locked"><div class="sq-art">?</div><b>???</b><small>Joins later</small></div>`;
      }
      const h = heroInfo(save, id);
      const n = picked.indexOf(id);
      return `<button class="sq-card ${n >= 0 ? 'on' : ''}" data-id="${id}" style="--asp:${ASPECTS[t.aspect].color}">
        ${n >= 0 ? `<span class="sq-num">${n + 1}</span>` : ''}
        <canvas class="sq-art"></canvas>
        <b>${esc(t.name)} <span class="sq-lv">Lv ${h.lv}</span></b>
        <small>${esc(t.title)} · ${ASPECTS[t.aspect].glyph}</small>
        <div class="sq-xp"><i style="width:${(h.xp / XP_PER_LEVEL) * 100}%"></i></div>
        <div class="sq-gear">${SLOTS.map(s => { const g = heroGear(save, id)[s]; return `<span class="${g ? 'on' : ''}" title="${g ? ITEMS[g].name : 'empty'}">${SLOT_ICONS[s]}</span>`; }).join('')}</div>
      </button>`;
    }).join('');
    for (const c of $('squad-grid').querySelectorAll('button.sq-card')) {
      const canvas = c.querySelector('canvas');
      renderPortrait(canvas, UNITS[c.dataset.id].look, { focus: 'bust', zoom: canvas.clientHeight / 42, t: 1000 });
    }
    $('btn-squad-go').disabled = picked.length === 0;
  };

  $('squad-grid').onclick = e => {
    const b = e.target.closest('button.sq-card');
    if (!b) return;
    const id = b.dataset.id;
    if (picked.includes(id)) picked = picked.filter(x => x !== id);
    else if (picked.length < max) picked.push(id);
    render();
  };
  $('btn-squad-go').onclick = () => {
    if (!picked.length) return;
    onFight(picked.map(id => squadEntry(save, id)));
  };
  $('squad').classList.remove('hidden');
  render();
}

export function hideSquad() { $('squad').classList.add('hidden'); }
