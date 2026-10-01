// Character profile + roster screens.
import { UNITS, SKILLS, ASPECTS } from '../game/data.js';
import { PROFILES } from '../game/characters.js';
import { renderPortrait } from '../render/sprites.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export const HERO_IDS = ['kai', 'goro', 'rin', 'sora', 'nyx', 'aiko', 'pip', 'hana', 'mako'];
export const ENEMY_IDS = ['varg', 'imp', 'brute', 'gargoyle'];

const STAT_MAX = { hp: 130, atk: 30, def: 20, mov: 7, jump: 5 };

let anim = null;
function animate(canvas, look, opts) {
  cancelAnimationFrame(anim);
  const loop = now => {
    if (!canvas.isConnected || canvas.closest('.hidden')) return;
    renderPortrait(canvas, look, { ...opts, t: now });
    anim = requestAnimationFrame(loop);
  };
  anim = requestAnimationFrame(loop);
}

function rangeText(r) { return r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`; }

function moveRow(skill, kind) {
  const area = skill.area > 0 ? ` · area ${skill.area}` : '';
  const cost = kind === 'ult' ? '100 SP' : `${skill.cost} SP`;
  const extra = [skill.kind === 'heal' ? 'heal' : `power ×${skill.power}`, skill.pierce ? 'ignores DEF' : ''].filter(Boolean).join(' · ');
  return `<div class="pf-move ${kind}">
    <div class="pf-move-head"><b>${kind === 'ult' ? '★ ' : ''}${esc(skill.name)}</b><span>${cost}</span></div>
    <div class="pf-move-meta">⌖ Reach ${skill.range[1] === 0 ? 'self' : `${rangeText(skill.range)} tile${skill.range[1] > 1 ? 's' : ''}`}${area} · ${extra}</div>
    <div class="pf-move-desc">${esc(skill.desc)}</div>
  </div>`;
}

function statBar(label, value, max, shown = value) {
  const pct = Math.max(4, Math.min(100, (value / max) * 100));
  return `<div class="pf-stat"><span>${label}</span><div class="pf-bar"><i style="width:${pct}%"></i></div><b>${shown}</b></div>`;
}

// Open a character's profile. `unit` (optional) shows live battle HP/SP.
export function openProfile(id, unit = null) {
  const t = UNITS[id], p = PROFILES[id];
  if (!t || !p) return;
  const asp = ASPECTS[t.aspect];
  const enemy = ENEMY_IDS.includes(id);
  const hp = unit ? `${unit.hp}/${unit.maxHp}` : t.hp;
  $('profile-body').innerHTML = `
    <div class="pf-grid">
      <div class="pf-art" style="--asp:${asp.color}">
        <canvas id="pf-canvas"></canvas>
        <div class="pf-piece">♟ ${esc(p.piece)}</div>
      </div>
      <div class="pf-info">
        <div class="pf-name">${esc(t.name)}</div>
        <div class="pf-sub">${esc(p.fullName)}</div>
        <div class="pf-chips">
          <span class="chip ${enemy ? 'enemy' : 'hero'}">${enemy ? 'Enemy' : 'Hero'} · ${esc(t.title)}</span>
          <span class="chip" style="background:${asp.color};color:#120f1f">${asp.glyph} ${asp.name}</span>
        </div>
        <blockquote>“${esc(p.quote.replace(/^“|”$/g, ''))}”</blockquote>
        <div class="pf-facts"><span><b>Age</b> ${esc(p.age)}</span><span><b>From</b> ${esc(p.from)}</span></div>

        <div class="pf-passive"><div class="pf-label">Passive · ${esc(t.passive.name)}</div>${esc(t.passive.desc)}</div>

        <div class="pf-section">Stats</div>
        <div class="pf-stats">
          ${statBar('HP', unit ? unit.hp : t.hp, STAT_MAX.hp, hp)}
          ${unit ? statBar('SP', unit.sp, 100, `${unit.sp}/100`) : ''}
          ${statBar('ATK', t.atk, STAT_MAX.atk)}
          ${statBar('DEF', t.def, STAT_MAX.def)}
          ${statBar('MOV', t.mov, STAT_MAX.mov)}
          ${statBar('JUMP', Math.min(t.jump, 5), STAT_MAX.jump, t.flier ? 'Flies' : t.jump)}
          ${statBar('REACH', t.range[1], 5, rangeText(t.range))}
        </div>

        <div class="pf-section">Moves</div>
        ${moveRow({ name: 'Attack', kind: 'damage', cost: 0, power: 1, area: 0, range: t.range, desc: 'Basic attack. Free, and charges SP.' }, 'basic').replace('0 SP', 'Free')}
        ${t.skills.map(k => moveRow(SKILLS[k], 'skill')).join('')}
        ${t.ult ? moveRow(SKILLS[t.ult], 'ult') : ''}

        <div class="pf-section">Story</div>
        ${p.bio.map(x => `<p>${esc(x)}</p>`).join('')}
        <div class="pf-section">Personality</div>
        <p>${esc(p.personality)}</p>
        <div class="pf-section">${enemy ? 'How to beat them' : 'How to play them'}</div>
        <p>${esc(p.style)}</p>
        <div class="pf-likes"><div><b>Likes</b>${esc(p.likes)}</div><div><b>Dislikes</b>${esc(p.dislikes)}</div></div>
      </div>
    </div>`;
  $('profile').classList.remove('hidden');
  $('profile-body').scrollTop = 0;
  const canvas = $('pf-canvas');
  const big = ['brute', 'gargoyle', 'varg'].includes(id);
  animate(canvas, t.look, { zoom: Math.min(canvas.clientHeight / (big ? 78 : 70), canvas.clientWidth / 52) });
}

export function closeProfile() {
  $('profile').classList.add('hidden');
  cancelAnimationFrame(anim);
}

// unlocked: hero ids the player has recruited (others show as silhouettes).
export function openRoster(unlocked = HERO_IDS) {
  const card = id => {
    const t = UNITS[id];
    if (HERO_IDS.includes(id) && !unlocked.includes(id)) {
      return `<div class="roster-item locked"><div class="roster-q">?</div><span>???</span><small>Joins later</small></div>`;
    }
    return `<button class="roster-item" data-id="${id}" style="--asp:${ASPECTS[t.aspect].color}">
      <canvas></canvas><span>${esc(t.name)}</span><small>${esc(t.title)} · ${esc(PROFILES[id].piece.split(' ')[0])}</small></button>`;
  };
  $('roster-heroes').innerHTML = HERO_IDS.map(card).join('');
  $('roster-enemies').innerHTML = ENEMY_IDS.map(card).join('');
  $('roster').classList.remove('hidden');
  for (const el of document.querySelectorAll('.roster-item')) {
    const c = el.querySelector('canvas');
    renderPortrait(c, UNITS[el.dataset.id].look, { focus: 'bust', zoom: c.clientHeight / 42, t: 1000 });
  }
}

export function bindProfileUi(onClick = () => {}) {
  $('btn-profile-close').addEventListener('click', () => { onClick(); closeProfile(); });
  $('profile').addEventListener('click', e => { if (e.target.id === 'profile') { onClick(); closeProfile(); } });
  $('btn-roster-close').addEventListener('click', () => { onClick(); $('roster').classList.add('hidden'); });
  $('roster').addEventListener('click', e => {
    const b = e.target.closest('.roster-item');
    if (b) { onClick(); openProfile(b.dataset.id); }
  });
}
