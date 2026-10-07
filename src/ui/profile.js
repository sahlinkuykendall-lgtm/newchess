// Character profile + roster screens.
import { UNITS, SKILLS, ASPECTS } from '../game/data.js';
import { PROFILES } from '../game/characters.js';
import { renderPortrait } from '../render/sprites.js';
import { shapeLabel, moveLabel } from '../game/rules.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export const HERO_IDS = ['kai', 'goro', 'rin', 'sora', 'nyx', 'aiko', 'pip', 'hana', 'mako'];
export const ENEMY_IDS = ['varg', 'imp', 'brute', 'gargoyle', 'ignis', 'hound', 'witch', 'golem'];

const STAT_MAX = { hp: 130, atk: 30, def: 20, mov: 7, jump: 5 };
const MOVE_HINT = {
  bishop: ' — like a chess bishop: diagonal steps cost 1, straight steps cost 2.',
  king: ' — like a chess king: any of 8 directions, 1 MOV each.',
  fly: ' — ignores terrain cost and water.',
};

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
  const cost = kind === 'ult' ? '100 SP' : `${skill.cost} SP`;
  const extra = [skill.kind === 'heal' ? 'heal' : `power ×${skill.power}`, skill.pierce ? 'ignores DEF' : ''].filter(Boolean).join(' · ');
  return `<div class="pf-move ${kind}">
    <div class="pf-move-head"><b>${kind === 'ult' ? '★ ' : ''}${esc(skill.name)}</b><span>${cost}</span></div>
    <div class="pf-move-meta">⌖ ${esc(shapeLabel(skill))} · ${extra}</div>
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
  const atk = { name: 'Attack', range: t.range, ...(t.attack ?? {}) };
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
          ${statBar('MOV', t.mov, STAT_MAX.mov, `${t.mov}`)}
          <div class="pf-movestyle">🦶 ${esc(moveLabel({ mov: t.mov, move: t.move, moveRule: { step: t.flier ? 'fly' : 'walk', ...(t.move ?? {}) } }))}${MOVE_HINT[t.move?.step] ?? ''}</div>
          ${statBar('JUMP', Math.min(t.jump, 5), STAT_MAX.jump, t.flier ? 'Flies' : t.jump)}
          ${statBar('REACH', atk.range[1], 6, rangeText(atk.range))}
        </div>

        <div class="pf-section">Moves</div>
        ${moveRow({ kind: 'damage', cost: 0, power: 1, area: 0, ...atk, desc: 'Basic attack. Free, and charges SP.' }, 'basic').replace('0 SP', 'Free')}
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

export function bindProfileUi(onClick = () => {}) {
  $('btn-profile-close').addEventListener('click', () => { onClick(); closeProfile(); });
  $('profile').addEventListener('click', e => { if (e.target.id === 'profile') { onClick(); closeProfile(); } });
}
