// Squad select: a formation row of up to 5 slots and your roster below.
import { UNITS, ASPECTS, xpToNext } from '../game/data.js';
import { heroInfo, squadEntry, heroGear } from '../game/progress.js';
import { ITEMS, SLOTS, SLOT_ICONS } from '../game/items.js';
import { renderPortrait } from '../render/sprites.js';
import { HERO_IDS } from './profile.js';
import { missionOf } from './hub.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// Calls onFight([{id, lv, gear}]) with the chosen heroes in order.
export function showSquad(save, level, onFight, sound = () => {}) {
  const max = level.spawns.length;
  let picked = (save.lastSquad ?? []).filter(id => save.unlocked.includes(id)).slice(0, max);
  for (const id of save.unlocked) if (picked.length < max && !picked.includes(id)) picked.push(id);
  const m = missionOf(level);

  const portrait = (c, id) => renderPortrait(c, UNITS[id].look, { focus: 'bust', zoom: c.clientHeight / 40, t: 1000 });

  const render = () => {
    $('squad-stage').textContent = `${level.stage} · ${m.icon} ${m.name}`;
    $('squad-title').textContent = `${level.boss ? '👑 ' : ''}${level.name}`;
    $('squad-sub').textContent = level.mission;

    $('squad-slots').innerHTML = Array.from({ length: 5 }, (_, k) => {
      if (k >= max) return '<div class="slot closed">🔒</div>';
      const id = picked[k];
      if (!id) return `<div class="slot empty"><span>+</span><small>Slot ${k + 1}</small></div>`;
      const t = UNITS[id];
      return `<button class="slot filled" data-id="${id}" style="--asp:${ASPECTS[t.aspect].color}">
        <span class="slot-n">${k + 1}</span><canvas></canvas><b>${esc(t.name)}</b><small>Lv ${heroInfo(save, id).lv}</small></button>`;
    }).join('');
    for (const b of $('squad-slots').querySelectorAll('button.slot')) portrait(b.querySelector('canvas'), b.dataset.id);

    $('squad-grid').innerHTML = HERO_IDS.map(id => {
      const t = UNITS[id];
      if (!save.unlocked.includes(id)) return '<div class="sq-card locked"><div class="sq-art">?</div><b>???</b></div>';
      const h = heroInfo(save, id);
      const n = picked.indexOf(id);
      return `<button class="sq-card ${n >= 0 ? 'on' : ''}" data-id="${id}" style="--asp:${ASPECTS[t.aspect].color}">
        ${n >= 0 ? `<span class="sq-num">${n + 1}</span>` : ''}
        <span class="sq-asp">${ASPECTS[t.aspect].glyph}</span>
        <canvas class="sq-art"></canvas>
        <b>${esc(t.name)}</b>
        <small><span class="sq-lv">Lv ${h.lv}</span> · ${esc(t.title)}</small>
        <div class="sq-xp"><i style="width:${(h.xp / xpToNext(h.lv)) * 100}%"></i></div>
        <div class="sq-gear">${SLOTS.map(s => { const g = heroGear(save, id)[s]; return `<span class="${g ? 'on' : ''}" title="${g ? ITEMS[g].name : 'empty'}">${SLOT_ICONS[s]}</span>`; }).join('')}</div>
      </button>`;
    }).join('');
    for (const c of $('squad-grid').querySelectorAll('button.sq-card')) portrait(c.querySelector('canvas'), c.dataset.id);

    const need = level.heroLevel ?? 1;
    const avg = picked.length ? Math.round(picked.reduce((a, id) => a + heroInfo(save, id).lv, 0) / picked.length) : 0;
    const cls = !picked.length ? 'warn' : avg >= need + 1 ? 'good' : avg >= need ? 'ok' : 'warn';
    $('squad-power').innerHTML = `<span class="lv-check ${cls}">Team Lv ${avg} · Suggested ${need}</span><small>${picked.length}/${max} heroes</small>`;
    $('btn-squad-go').disabled = picked.length === 0;
  };

  const toggle = id => {
    if (picked.includes(id)) { picked = picked.filter(x => x !== id); sound('cancel'); }
    else if (picked.length < max) { picked.push(id); sound('select'); }
    render();
  };
  $('squad-grid').onclick = e => { const b = e.target.closest('button.sq-card'); if (b) toggle(b.dataset.id); };
  $('squad-slots').onclick = e => { const b = e.target.closest('button.slot'); if (b) toggle(b.dataset.id); };
  $('btn-squad-go').onclick = () => {
    if (!picked.length) return;
    onFight(picked.map(id => squadEntry(save, id)));
  };
  $('squad').classList.remove('hidden');
  render();
}

export function hideSquad() { $('squad').classList.add('hidden'); }
