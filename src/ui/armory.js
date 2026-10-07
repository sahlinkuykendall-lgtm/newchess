// Armory: buy gear in the shop and equip it on each hero.
import { UNITS, ASPECTS } from '../game/data.js';
import { ITEMS, SLOTS, SLOT_NAMES, SLOT_ICONS, gearBonus, itemStats } from '../game/items.js';
import { heroInfo, heroGear, owned, equippedCount, buyItem, equipItem, shopTier } from '../game/progress.js';
import { statsAt } from '../game/rules.js';
import { renderPortrait } from '../render/sprites.js';
import { HERO_IDS } from './profile.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const TIER_HINT = ['', 'after 1-1', 'after 1-3', 'after the 1-5 boss'];

let state = null; // { save, hero, slot, onBack, onSound }

export function showArmory(save, { onBack = null, onSound = () => {}, onChange = () => {}, hero = null } = {}) {
  const first = hero && save.unlocked.includes(hero) ? hero : save.unlocked[0];
  state = { save, hero: first, slot: 'weapon', onBack, onSound, onChange };
  $('armory').classList.remove('hidden');
  $('btn-armory-back').classList.toggle('hidden', !onBack);
  render();
}

export function hideArmory() { $('armory').classList.add('hidden'); }

// Hero currently wearing a given copy of an item (other than `except`).
function wearers(save, itemId, except) {
  return Object.entries(save.gear ?? {})
    .filter(([id, g]) => id !== except && SLOTS.some(s => g[s] === itemId))
    .map(([id]) => UNITS[id].name);
}

function render() {
  const { save, hero, slot } = state;

  // hero tabs
  $('armory-heroes').innerHTML = HERO_IDS.filter(id => save.unlocked.includes(id)).map(id =>
    `<button class="arm-tab ${id === hero ? 'on' : ''}" data-hero="${id}" style="--asp:${ASPECTS[UNITS[id].aspect].color}">
      <canvas></canvas><span>${esc(UNITS[id].name)}</span></button>`).join('');
  for (const b of $('armory-heroes').querySelectorAll('.arm-tab')) {
    const c = b.querySelector('canvas');
    renderPortrait(c, UNITS[b.dataset.hero].look, { focus: 'bust', zoom: c.clientHeight / 42, t: 1000 });
  }

  // hero panel: stats with gear bonus + three slots
  const t = UNITS[hero];
  const lv = heroInfo(save, hero).lv;
  const base = statsAt(hero, lv);
  const gear = heroGear(save, hero);
  const b = gearBonus(gear);
  const stat = (label, v, plus) => `<div class="arm-stat"><span>${label}</span><b>${v + plus}</b>${plus ? `<em>+${plus}</em>` : ''}</div>`;
  $('armory-hero').innerHTML = `
    <div class="arm-hero-head"><b>${esc(t.name)}</b> <span class="uc-lv">Lv ${lv}</span> <small>${esc(t.title)}</small></div>
    <div class="arm-stats">
      ${stat('HP', base.hp, b.hp)}${stat('ATK', base.atk, b.atk)}${stat('DEF', base.def, b.def)}
      ${stat('MOV', t.mov, b.mov)}${stat('JUMP', t.jump, b.jump)}
    </div>
    ${b.sp || b.regen || b.spRegen ? `<div class="arm-extra">${[b.sp && `+${b.sp} start SP`, b.regen && `+${b.regen} HP/turn`, b.spRegen && `+${b.spRegen} SP/turn`].filter(Boolean).join(' · ')}</div>` : ''}
    <div class="arm-slots">${SLOTS.map(s => {
      const it = ITEMS[gear[s]];
      return `<button class="arm-slot ${s === slot ? 'on' : ''}" data-slot="${s}">
        <span class="arm-slot-name">${SLOT_ICONS[s]} ${SLOT_NAMES[s]}</span>
        <b>${it ? esc(it.name) : 'Empty'}</b><small>${it ? esc(itemStats(it)) : 'Tap to choose'}</small></button>`;
    }).join('')}</div>`;
  $('armory-hero').scrollTop = 0;

  // item list for the chosen slot
  const tier = shopTier(save);
  const list = Object.entries(ITEMS).filter(([, it]) => it.slot === slot).sort((a, b2) => a[1].tier - b2[1].tier || a[1].price - b2[1].price);
  $('armory-items').innerHTML = `<div class="arm-items-head">${SLOT_ICONS[slot]} ${SLOT_NAMES[slot]}s</div>` + list.map(([id, it]) => {
    const locked = it.tier > tier;
    const have = owned(save, id);
    const free = have - equippedCount(save, id);
    const onMe = gear[slot] === id;
    const others = wearers(save, id, hero);
    let buttons = '';
    if (locked) buttons = `<span class="arm-lock">🔒 Unlocks ${TIER_HINT[it.tier]}</span>`;
    else {
      if (onMe) buttons += `<button class="btn small ghost" data-unequip="${id}">Unequip</button>`;
      else if (free > 0) buttons += `<button class="btn small" data-equip="${id}">Equip</button>`;
      buttons += `<button class="btn small ${onMe || free > 0 ? 'ghost' : ''}" data-buy="${id}" ${save.gold < it.price ? 'disabled' : ''}>Buy 🪙${it.price}</button>`;
    }
    const ownTxt = have ? `Owned ×${have}${others.length ? ` · worn by ${esc(others.join(', '))}` : ''}` : '';
    return `<div class="arm-item ${locked ? 'locked' : ''} ${onMe ? 'on' : ''}">
      <div class="arm-item-info"><b>${esc(it.name)}</b><span class="arm-item-stats">${esc(itemStats(it))}</span>
        <small>${esc(it.desc)}</small>${ownTxt ? `<small class="arm-own">${ownTxt}</small>` : ''}</div>
      <div class="arm-item-btns">${buttons}</div></div>`;
  }).join('');
}

export function bindArmory() {
  $('armory').addEventListener('click', e => {
    if (!state) return;
    const el = e.target.closest('button');
    if (!el || el.disabled) return;
    const { save } = state;
    if (el.id === 'btn-armory-back') { state.onSound('click'); state.onBack?.(); return; }
    if (el.dataset.hero) { state.hero = el.dataset.hero; state.onSound('click'); }
    else if (el.dataset.slot) { state.slot = el.dataset.slot; state.onSound('click'); }
    else if (el.dataset.buy) {
      if (buyItem(save, el.dataset.buy)) {
        state.onSound('heal');
        // auto-equip the purchase if this hero's slot is empty
        if (!heroGear(save, state.hero)[state.slot]) equipItem(save, state.hero, state.slot, el.dataset.buy);
      }
    } else if (el.dataset.equip) { equipItem(save, state.hero, state.slot, el.dataset.equip); state.onSound('select'); }
    else if (el.dataset.unequip) { equipItem(save, state.hero, state.slot, null); state.onSound('cancel'); }
    else return;
    render();
    state.onChange();
  });
}
