// Procedural chibi-anime character art. Every character has a hand-built
// drawing function (no image files): cel shading, faces, outfits, weapons and
// small idle animations. Feet sit at (0,0); the sprite faces screen-right and
// is mirrored for the other directions.

const INK = '#1a1426';

// ---------------------------------------------------------------- helpers
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Fill a path; pass lw = null for no outline.
function fill(ctx, color, draw, lw = 1.3, stroke = INK) {
  ctx.beginPath();
  draw();
  ctx.fillStyle = color;
  ctx.fill();
  if (lw !== null && stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

function line(ctx, color, lw, draw) {
  ctx.beginPath();
  draw();
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// Cel shading: paint `color` inside `shapeFn`, limited to the region `regionFn`.
function shadeIn(ctx, shapeFn, color, regionFn) {
  ctx.save();
  ctx.beginPath(); shapeFn(); ctx.clip();
  ctx.beginPath(); regionFn();
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

// Soft crescent shadow on a round shape: everything outside a circle nudged
// toward the light (upper right) gets the shadow color.
function crescent(ctx, shapeFn, color, cx, cy, r, dx = 2.5, dy = -2.5) {
  ctx.save();
  ctx.beginPath(); shapeFn(); ctx.clip();
  ctx.beginPath();
  ctx.rect(cx - r * 3, cy - r * 3, r * 6, r * 6);
  ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2, true);
  ctx.fillStyle = color; ctx.fill('evenodd');
  ctx.restore();
}

// Thick outlined limb through a list of points.
function limb(ctx, color, pts, w) {
  for (const [c, lw] of [[INK, w + 2.4], [color, w]]) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.stroke();
  }
}

const rr = (ctx, x, y, w, h, r) => () => {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const poly = (ctx, pts) => () => {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
};

const circle = (ctx, x, y, r) => () => ctx.arc(x, y, r, 0, Math.PI * 2);
const oval = (ctx, x, y, rx, ry, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

// Anime eyes in 3/4 view (looking screen-right). mood: fierce | calm | gentle | sly | glow
function eyes(ctx, x, y, iris, { gap = 7.5, size = 1, mood = 'calm', lash = INK } = {}) {
  const pairs = [[x - gap / 2, 0.82], [x + gap / 2, 1]];
  for (const [ex, k] of pairs) {
    const w = 2.5 * size * k, h = 3.3 * size;
    if (mood === 'glow') {
      ctx.save();
      ctx.shadowColor = iris; ctx.shadowBlur = 6;
      fill(ctx, iris, poly(ctx, [[ex - w, y], [ex + w, y - h * 0.5], [ex + w * 0.8, y + h * 0.15]]), 0.8);
      ctx.restore();
      continue;
    }
    const squint = mood === 'sly' ? 0.7 : 1;
    fill(ctx, '#fff', oval(ctx, ex, y, w, h * squint), 0.9);
    const g = ctx.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, shade(iris, -0.35)); g.addColorStop(1, shade(iris, 0.15));
    fill(ctx, g, oval(ctx, ex + 0.5 * k, y + 0.4, w * 0.72, h * 0.8 * squint), null);
    fill(ctx, INK, oval(ctx, ex + 0.6 * k, y + 0.5, w * 0.32, h * 0.38 * squint), null);
    fill(ctx, '#fff', circle(ctx, ex - 0.2, y - h * 0.35, 0.75 * size), null);
    fill(ctx, 'rgba(255,255,255,0.7)', circle(ctx, ex + 1 * k, y + h * 0.35, 0.4 * size), null);
    // upper lash line
    line(ctx, lash, 1.4, () => { ctx.moveTo(ex - w - 0.4, y - h * 0.55 * squint); ctx.quadraticCurveTo(ex, y - h * 1.05 * squint, ex + w + 0.6, y - h * 0.7 * squint); });
    // brows
    const by = y - h - 2.2;
    line(ctx, lash, 1.1, () => {
      if (mood === 'fierce') { ctx.moveTo(ex - w, by - 1); ctx.lineTo(ex + w, by + 1.2 * (k === 1 ? 1 : -0.2)); }
      else if (mood === 'gentle') { ctx.moveTo(ex - w, by + 0.5); ctx.quadraticCurveTo(ex, by - 1.2, ex + w, by + 0.3); }
      else { ctx.moveTo(ex - w, by); ctx.lineTo(ex + w, by - 0.4); }
    });
  }
}

function mouth(ctx, x, y, type) {
  switch (type) {
    case 'grin':
      fill(ctx, '#7a1d22', () => { ctx.moveTo(x - 2.5, y - 0.6); ctx.quadraticCurveTo(x, y + 3, x + 3, y - 1); ctx.closePath(); }, 0.9);
      fill(ctx, '#fff', poly(ctx, [[x + 1.4, y - 0.7], [x + 2.2, y - 0.8], [x + 1.8, y + 0.6]]), null);
      break;
    case 'smile': line(ctx, '#7a3b33', 1, () => { ctx.moveTo(x - 1.6, y); ctx.quadraticCurveTo(x, y + 1.3, x + 1.8, y - 0.3); }); break;
    case 'smirk': line(ctx, '#7a3b33', 1, () => { ctx.moveTo(x - 1.2, y + 0.3); ctx.lineTo(x + 1, y + 0.3); ctx.quadraticCurveTo(x + 2, y, x + 2.3, y - 0.8); }); break;
    default: line(ctx, '#7a3b33', 1, () => { ctx.moveTo(x - 1.2, y); ctx.lineTo(x + 1.4, y); });
  }
}

function head(ctx, skin, x, y, r = 11.5) {
  fill(ctx, skin, () => {
    ctx.moveTo(x - r, y - 1);
    ctx.arc(x, y - 1, r, Math.PI, 0);
    ctx.quadraticCurveTo(x + r, y + r * 0.75, x + 2, y + r * 0.95);
    ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.85, x - r, y - 1);
  });
  crescent(ctx, () => ctx.arc(x, y, r + 1, 0, Math.PI * 2), shade(skin, -0.1), x, y, r);
  // blush
  fill(ctx, 'rgba(255,110,110,0.25)', oval(ctx, x + 5.5, y + 3.5, 2.2, 1.1), null);
}

function ear(ctx, skin, x, y) {
  fill(ctx, skin, oval(ctx, x, y, 2.4, 3.2));
  line(ctx, shade(skin, -0.25), 0.8, () => { ctx.moveTo(x - 0.6, y - 1.4); ctx.quadraticCurveTo(x + 0.8, y, x - 0.4, y + 1.4); });
}

function boot(ctx, color, x, y, sole = '#f2efe6') {
  fill(ctx, color, () => { ctx.moveTo(x - 3.2, y - 4.5); ctx.lineTo(x + 2.4, y - 4.5); ctx.quadraticCurveTo(x + 5.5, y - 2.5, x + 5.2, y); ctx.lineTo(x - 3.6, y); ctx.closePath(); });
  line(ctx, sole, 1.2, () => { ctx.moveTo(x - 3.4, y - 0.4); ctx.lineTo(x + 5, y - 0.4); });
}

// ============================================================== HEROES

function kai(ctx, L, back, t) {
  const sway = Math.sin(t / 260) * 1.8;
  const hy = -39;
  // headband tails (behind the head in front view)
  const tails = () => {
    fill(ctx, L.accent, () => { ctx.moveTo(-8, hy - 4); ctx.quadraticCurveTo(-16, hy - 6 + sway, -22, hy - 2 + sway); ctx.lineTo(-19, hy + 1 + sway); ctx.quadraticCurveTo(-14, hy - 1, -8, hy - 1); ctx.closePath(); }, 1);
    fill(ctx, shade(L.accent, -0.1), () => { ctx.moveTo(-8, hy - 2); ctx.quadraticCurveTo(-14, hy + 2 + sway, -18, hy + 6 + sway); ctx.lineTo(-15, hy + 7 + sway); ctx.quadraticCurveTo(-12, hy + 2, -8, hy); ctx.closePath(); }, 1);
  };
  if (!back) tails();
  // back arm
  limb(ctx, L.outfit, [[-8, -27], [-11, -21]], 5);
  limb(ctx, L.skin, [[-11, -21], [-10, -16]], 4);
  // legs: baggy pants + sneakers
  fill(ctx, '#3a3f57', poly(ctx, [[-8, -15], [-1, -15], [-2, -4], [-8, -4]]));
  fill(ctx, '#3a3f57', poly(ctx, [[0, -15], [7, -15], [8, -4], [2, -4]]));
  shadeIn(ctx, poly(ctx, [[-8, -15], [-1, -15], [-2, -4], [-8, -4]]), '#2b2f45', () => ctx.rect(-8, -15, 3, 12));
  boot(ctx, '#e0342b', -5, 0);
  boot(ctx, '#e0342b', 5, 0);
  // torso
  if (back) {
    fill(ctx, L.outfit, rr(ctx, -10, -30, 20, 17, 5));
    // flame emblem on the jacket back
    fill(ctx, L.accent, () => { ctx.moveTo(0, -27); ctx.quadraticCurveTo(5, -22, 2, -17); ctx.quadraticCurveTo(0, -19, -2, -17); ctx.quadraticCurveTo(-5, -22, 0, -27); }, 0.9);
    fill(ctx, '#ffd23f', () => { ctx.moveTo(0, -23); ctx.quadraticCurveTo(2, -20, 0.6, -18); ctx.quadraticCurveTo(-1.6, -20, 0, -23); }, null);
  } else {
    fill(ctx, '#f4f1ea', rr(ctx, -6, -29, 12, 15, 3));
    line(ctx, '#d8d2c4', 0.8, () => { ctx.moveTo(-3, -24); ctx.lineTo(3, -24); });
    // open jacket panels
    fill(ctx, L.outfit, () => { ctx.moveTo(-10, -29); ctx.lineTo(-2, -29); ctx.lineTo(-3, -13); ctx.lineTo(-11, -13); ctx.closePath(); });
    fill(ctx, L.outfit, () => { ctx.moveTo(2, -29); ctx.lineTo(10, -29); ctx.lineTo(11, -13); ctx.lineTo(4, -13); ctx.closePath(); });
    shadeIn(ctx, poly(ctx, [[-10, -29], [-2, -29], [-3, -13], [-11, -13]]), shade(L.outfit, -0.08), () => ctx.rect(-11, -29, 4, 16));
    // collar
    fill(ctx, shade(L.outfit, 0.12), poly(ctx, [[-6, -30], [-2, -30], [-3, -25]]), 0.9);
    fill(ctx, shade(L.outfit, 0.12), poly(ctx, [[2, -30], [6, -30], [3, -25]]), 0.9);
  }
  // flame trim along the jacket hem
  fill(ctx, L.accent, () => {
    ctx.moveTo(-11, -13);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-11 + i * 3.7, -13 - (i % 2 ? 3.5 : 0.5));
    ctx.lineTo(11, -12); ctx.lineTo(-11, -12); ctx.closePath();
  }, 0.9);
  fill(ctx, '#ffb347', rr(ctx, -8, -15.5, 16, 2.2, 1), 0.8);
  // front arm in a guard stance, bandaged forearm, burning fist
  limb(ctx, L.outfit, [[8, -27], [12, -22]], 5);
  limb(ctx, '#f4f1ea', [[12, -22], [13, -25]], 4);
  line(ctx, '#cfc7b5', 0.7, () => { ctx.moveTo(11.3, -22.6); ctx.lineTo(13.6, -23); ctx.moveTo(11.6, -24); ctx.lineTo(13.8, -24.5); });
  fill(ctx, L.skin, circle(ctx, 13.4, -27, 3.1));
  line(ctx, '#e0342b', 1.2, () => { ctx.moveTo(11.5, -28.5); ctx.lineTo(15, -28.5); });
  const fl = Math.sin(t / 90) * 0.9;
  ctx.save();
  ctx.shadowColor = '#ff8a3d'; ctx.shadowBlur = 6;
  fill(ctx, '#ff8a3d', () => { ctx.moveTo(10.5, -29.5); ctx.quadraticCurveTo(10 + fl, -35, 13 + fl, -38); ctx.quadraticCurveTo(14, -34, 16, -35 - fl); ctx.quadraticCurveTo(17.5, -31, 16.3, -29); ctx.closePath(); }, null);
  fill(ctx, '#ffe066', () => { ctx.moveTo(12, -29.5); ctx.quadraticCurveTo(12.5 - fl, -33.5, 14, -35); ctx.quadraticCurveTo(15.5, -32, 15, -29.5); ctx.closePath(); }, null);
  ctx.restore();

  // head
  head(ctx, L.skin, 0, hy);
  if (!back) {
    ear(ctx, L.skin, -8.5, hy + 1);
    eyes(ctx, 3, hy + 1, '#ff7a29', { mood: 'fierce' });
    mouth(ctx, 4.5, hy + 7, 'grin');
    line(ctx, shade(L.skin, -0.25), 0.8, () => { ctx.moveTo(7.8, hy + 3); ctx.lineTo(8.4, hy + 4.2); });
  }
  // headband
  fill(ctx, '#2b2f45', () => { ctx.moveTo(-11.3, hy - 3); ctx.quadraticCurveTo(0, hy - 7, 11.3, hy - 4); ctx.lineTo(11.4, hy - 1.2); ctx.quadraticCurveTo(0, hy - 4.5, -11.4, hy); ctx.closePath(); }, 1);
  if (!back) fill(ctx, '#c9ccd8', rr(ctx, 3, hy - 5.5, 6, 3, 1), 0.8);
  // spiky hair
  const H = L.hair, HL = '#ffb347';
  fill(ctx, H, () => {
    ctx.moveTo(-12, hy - 1);
    ctx.lineTo(-17, hy - 7); ctx.lineTo(-11, hy - 9);
    ctx.lineTo(-15, hy - 17); ctx.lineTo(-7, hy - 13);
    ctx.lineTo(-6, hy - 22); ctx.lineTo(0, hy - 15);
    ctx.lineTo(5, hy - 23); ctx.lineTo(7, hy - 14);
    ctx.lineTo(14, hy - 18); ctx.lineTo(12, hy - 10);
    ctx.lineTo(17, hy - 8); ctx.lineTo(12, hy - 4);
    if (back) { ctx.lineTo(13, hy + 6); ctx.lineTo(4, hy + 9); ctx.lineTo(-4, hy + 9); ctx.lineTo(-13, hy + 5); }
    else { ctx.lineTo(10, hy - 4.5); ctx.lineTo(8, hy - 1); ctx.lineTo(5, hy - 5); ctx.lineTo(2, hy - 0.5); ctx.lineTo(-1, hy - 5); ctx.lineTo(-4, hy - 1); ctx.lineTo(-6, hy - 5); ctx.lineTo(-9, hy + 2); }
    ctx.closePath();
  }, 1.4);
  line(ctx, HL, 1.3, () => { ctx.moveTo(-4, hy - 12); ctx.lineTo(-5, hy - 18); ctx.moveTo(3, hy - 13); ctx.lineTo(4.5, hy - 19); ctx.moveTo(9, hy - 9); ctx.lineTo(12, hy - 14); });
  if (back) { tails(); fill(ctx, '#2b2f45', circle(ctx, -1, hy - 2, 2.2), 0.9); }
}

function goro(ctx, L, back, t) {
  const hy = -42;
  const rock = '#8d8676', rockD = '#6b6558';
  const shield = () => {
    fill(ctx, rock, () => { ctx.moveTo(9, -34); ctx.quadraticCurveTo(20, -35, 21, -30); ctx.lineTo(21, -10); ctx.quadraticCurveTo(15, -2, 9, -8); ctx.closePath(); }, 1.5);
    shadeIn(ctx, () => { ctx.moveTo(9, -34); ctx.quadraticCurveTo(20, -35, 21, -30); ctx.lineTo(21, -10); ctx.quadraticCurveTo(15, -2, 9, -8); ctx.closePath(); }, rockD, () => ctx.rect(17, -36, 6, 34));
    // glowing rune
    const k = 0.6 + 0.4 * Math.sin(t / 400);
    ctx.save(); ctx.shadowColor = L.accent; ctx.shadowBlur = 5 * k;
    line(ctx, L.accent, 1.4, () => { ctx.moveTo(15, -28); ctx.lineTo(15, -15); ctx.moveTo(12, -24); ctx.lineTo(15, -21); ctx.lineTo(18, -24); ctx.moveTo(12.5, -17); ctx.lineTo(17.5, -17); });
    ctx.restore();
    line(ctx, rockD, 0.8, () => { ctx.moveTo(10, -12); ctx.lineTo(12, -9); ctx.moveTo(20, -31); ctx.lineTo(18, -29); });
  };
  if (back) {
    // shield strapped to his back is drawn last
  }
  // back arm
  limb(ctx, L.skin, [[-11, -30], [-14, -22], [-13, -16]], 6);
  // legs
  fill(ctx, '#4a3c2a', poly(ctx, [[-11, -16], [-1, -16], [-2, -5], [-11, -5]]));
  fill(ctx, '#4a3c2a', poly(ctx, [[1, -16], [11, -16], [11, -5], [2, -5]]));
  boot(ctx, '#3a2c20', -6.5, 0, '#6b5a3e'); boot(ctx, '#3a2c20', 6.5, 0, '#6b5a3e');
  fill(ctx, rock, rr(ctx, -10.5, -10, 7, 4, 1.5), 1);
  fill(ctx, rock, rr(ctx, 3, -10, 7, 4, 1.5), 1);
  // torso: leather vest with stone plates
  const body = rr(ctx, -13, -34, 26, 20, 7);
  fill(ctx, L.skin, body, 1.5);
  if (back) {
    fill(ctx, L.outfit, rr(ctx, -12, -33, 24, 18, 6));
  } else {
    fill(ctx, L.outfit, () => { ctx.moveTo(-12, -33); ctx.lineTo(-4, -33); ctx.lineTo(-1, -20); ctx.lineTo(-12, -16); ctx.closePath(); });
    fill(ctx, L.outfit, () => { ctx.moveTo(4, -33); ctx.lineTo(12, -33); ctx.lineTo(12, -16); ctx.lineTo(1, -20); ctx.closePath(); });
    line(ctx, shade(L.skin, -0.22), 0.9, () => { ctx.moveTo(-2, -30); ctx.quadraticCurveTo(0, -28, 2, -30); });
    fill(ctx, rock, poly(ctx, [[-11, -28], [-5, -29], [-5, -22], [-11, -21]]), 1);
  }
  fill(ctx, shade(L.outfit, -0.2), rr(ctx, -13, -17, 26, 4, 1.5), 1);
  fill(ctx, L.accent, circle(ctx, 0, -15, 2.6), 1);
  // stone pauldrons
  fill(ctx, rock, () => { ctx.moveTo(-17, -29); ctx.quadraticCurveTo(-16, -37, -8, -36); ctx.lineTo(-7, -31); ctx.quadraticCurveTo(-12, -30, -17, -29); ctx.closePath(); }, 1.3);
  fill(ctx, rock, () => { ctx.moveTo(17, -29); ctx.quadraticCurveTo(16, -37, 8, -36); ctx.lineTo(7, -31); ctx.quadraticCurveTo(12, -30, 17, -29); ctx.closePath(); }, 1.3);
  line(ctx, rockD, 0.8, () => { ctx.moveTo(-13, -34); ctx.lineTo(-11, -31.5); ctx.moveTo(12, -34); ctx.lineTo(14, -31); });
  // head: topknot, beard, calm eyes
  head(ctx, L.skin, 0, hy, 11);
  if (!back) {
    ear(ctx, L.skin, -8.5, hy + 1);
    fill(ctx, '#2c2018', () => { ctx.moveTo(-9, hy + 2); ctx.quadraticCurveTo(-8, hy + 11, 2, hy + 11); ctx.quadraticCurveTo(9, hy + 10, 10, hy + 3); ctx.quadraticCurveTo(8, hy + 7, 4, hy + 6.5); ctx.quadraticCurveTo(0, hy + 8, -4, hy + 6); ctx.closePath(); }, 0.9);
    eyes(ctx, 3, hy + 0.5, '#8a5a2b', { mood: 'calm', size: 0.85 });
    line(ctx, '#2c2018', 2, () => { ctx.moveTo(-1.5, hy - 4.5); ctx.lineTo(1.8, hy - 4); ctx.moveTo(5, hy - 4.2); ctx.lineTo(8.6, hy - 4.6); });
    mouth(ctx, 4, hy + 6, 'flat');
  }
  fill(ctx, L.hair, () => { ctx.moveTo(-11, hy + (back ? 6 : 0)); ctx.quadraticCurveTo(-12, hy - 12, 0, hy - 12); ctx.quadraticCurveTo(12, hy - 12, 11, hy + (back ? 6 : -2)); if (!back) { ctx.quadraticCurveTo(4, hy - 7, -4, hy - 6); ctx.quadraticCurveTo(-8, hy - 4, -9, hy + 1); } ctx.closePath(); }, 1.3);
  fill(ctx, L.hair, oval(ctx, -2, hy - 14, 4, 3.2), 1.2);
  fill(ctx, L.accent, rr(ctx, -4.5, hy - 12.5, 5, 2, 0.8), 0.8);
  // front arm: huge stone gauntlet holding the shield
  limb(ctx, L.skin, [[11, -30], [14, -24]], 6);
  if (!back) shield();
  fill(ctx, rock, rr(ctx, 9.5, -26, 8, 8, 2.5), 1.3);
  line(ctx, rockD, 0.8, () => { ctx.moveTo(11, -22); ctx.lineTo(16, -22); });
  if (back) {
    ctx.save(); ctx.translate(-15, 0);
    shield();
    ctx.restore();
  }
}

function rin(ctx, L, back, t) {
  const hy = -39;
  const sway = Math.sin(t / 700) * 1.2;
  const bob = Math.sin(t / 420) * 1.2;
  const staff = () => {
    line(ctx, INK, 3.2, () => { ctx.moveTo(14, -2); ctx.lineTo(14, -46); });
    line(ctx, '#8a5a3b', 1.8, () => { ctx.moveTo(14, -2); ctx.lineTo(14, -46); });
    fill(ctx, '#d9c48a', () => { ctx.moveTo(14, -45); ctx.quadraticCurveTo(8, -50, 10, -56); ctx.quadraticCurveTo(12, -51, 14, -50); ctx.quadraticCurveTo(16, -51, 18, -56); ctx.quadraticCurveTo(20, -50, 14, -45); }, 1);
    // floating water orb
    const g = ctx.createRadialGradient(13, -54 + bob, 0.5, 14, -53 + bob, 4.2);
    g.addColorStop(0, '#e6fbff'); g.addColorStop(0.5, '#6fd0ff'); g.addColorStop(1, '#1f78d1');
    ctx.save(); ctx.shadowColor = '#6fd0ff'; ctx.shadowBlur = 7;
    fill(ctx, g, circle(ctx, 14, -53 + bob, 4), 1);
    ctx.restore();
    fill(ctx, 'rgba(255,255,255,0.85)', oval(ctx, 12.6, -54.6 + bob, 1.2, 0.8), null);
  };
  // long hair behind
  fill(ctx, L.hair, () => { ctx.moveTo(-11, hy); ctx.quadraticCurveTo(-15 + sway, hy + 16, -10 + sway, hy + 26); ctx.lineTo(-2, hy + 22); ctx.lineTo(8, hy + 16); ctx.lineTo(11, hy); ctx.closePath(); }, 1.3);
  if (back) staff();
  // robe: wide sleeves, wave hem
  const robe = () => { ctx.moveTo(-7, -30); ctx.lineTo(7, -30); ctx.lineTo(11, -2); ctx.quadraticCurveTo(0, 1, -11, -2); ctx.closePath(); };
  fill(ctx, L.outfit, robe, 1.4);
  shadeIn(ctx, robe, '#cfdcf3', () => ctx.rect(-12, -30, 6, 30));
  // wave pattern on the hem
  ctx.save(); ctx.beginPath(); robe(); ctx.clip();
  fill(ctx, L.accent, () => { ctx.moveTo(-12, -6); for (let x = -12; x <= 12; x += 4) ctx.quadraticCurveTo(x + 1, -9, x + 2, -6.5), ctx.quadraticCurveTo(x + 3, -4.5, x + 4, -6); ctx.lineTo(12, 2); ctx.lineTo(-12, 2); ctx.closePath(); }, null);
  line(ctx, '#ffffff', 0.8, () => { for (let x = -10; x <= 10; x += 4) { ctx.moveTo(x, -4); ctx.quadraticCurveTo(x + 1, -5.5, x + 2, -4); } });
  ctx.restore();
  // kimono collar + sash
  if (!back) {
    line(ctx, L.accent, 1.4, () => { ctx.moveTo(-4, -30); ctx.lineTo(1, -22); ctx.moveTo(4, -30); ctx.lineTo(1, -22); });
  }
  fill(ctx, '#1d4f8f', rr(ctx, -8.5, -21, 17, 4, 1.5), 1);
  if (back) fill(ctx, '#1d4f8f', () => { ctx.moveTo(0, -19); ctx.lineTo(-6, -24); ctx.lineTo(-6, -15); ctx.closePath(); ctx.moveTo(0, -19); ctx.lineTo(6, -24); ctx.lineTo(6, -15); ctx.closePath(); }, 1);
  // sleeves
  fill(ctx, L.outfit, () => { ctx.moveTo(-6, -29); ctx.lineTo(-13, -16); ctx.lineTo(-7, -14); ctx.lineTo(-4, -24); ctx.closePath(); }, 1.2);
  fill(ctx, L.outfit, () => { ctx.moveTo(6, -29); ctx.lineTo(15, -20); ctx.lineTo(12, -15); ctx.lineTo(5, -22); ctx.closePath(); }, 1.2);
  line(ctx, L.accent, 1.2, () => { ctx.moveTo(-13, -16); ctx.lineTo(-7, -14); ctx.moveTo(15, -20); ctx.lineTo(12, -15); });
  if (!back) { staff(); fill(ctx, L.skin, circle(ctx, 14, -21, 2.4), 1); }
  // head
  head(ctx, L.skin, 0, hy);
  if (!back) {
    eyes(ctx, 3, hy + 1, '#2f8fe0', { mood: 'gentle', size: 1.05 });
    mouth(ctx, 4.5, hy + 6.8, 'smile');
  }
  // hair front: straight bangs + side locks
  fill(ctx, L.hair, () => {
    ctx.moveTo(-12, hy + (back ? 14 : 4));
    ctx.quadraticCurveTo(-13, hy - 13, 0, hy - 13);
    ctx.quadraticCurveTo(13, hy - 13, 12, hy + (back ? 14 : 2));
    if (back) { ctx.quadraticCurveTo(0, hy + 18, -12, hy + 14); }
    else { ctx.lineTo(10, hy + 9); ctx.lineTo(9, hy - 3); ctx.lineTo(6, hy - 2); ctx.lineTo(4, hy - 5); ctx.lineTo(1, hy - 2); ctx.lineTo(-2, hy - 5); ctx.lineTo(-5, hy - 2); ctx.lineTo(-8, hy + 8); }
    ctx.closePath();
  }, 1.4);
  line(ctx, 'rgba(255,255,255,0.55)', 1.2, () => { ctx.moveTo(-6, hy - 9); ctx.quadraticCurveTo(0, hy - 11.5, 6, hy - 9.5); });
  // shell hair ornament
  fill(ctx, '#ffe1ec', () => { ctx.moveTo(-9, hy - 6); ctx.arc(-9, hy - 6, 3, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); }, 1);
  line(ctx, '#e7a5bf', 0.6, () => { ctx.moveTo(-9, hy - 6); ctx.lineTo(-10.5, hy - 8.5); ctx.moveTo(-9, hy - 6); ctx.lineTo(-8, hy - 8.8); });
}

function sora(ctx, L, back, t) {
  const hy = -39;
  const sway = Math.sin(t / 300) * 2;
  const quiver = () => {
    fill(ctx, '#7a5233', rr(ctx, -12, -36, 6, 18, 2), 1.2);
    for (const [x, c] of [[-11, '#f4f1ea'], [-9, '#5fe0a8'], [-7.5, '#f4f1ea']]) {
      line(ctx, '#c9b48a', 0.9, () => { ctx.moveTo(x, -36); ctx.lineTo(x, -40); });
      fill(ctx, c, poly(ctx, [[x - 1.2, -40], [x + 1.2, -40], [x, -44]]), 0.7);
    }
  };
  const bow = () => {
    line(ctx, INK, 3.4, () => { ctx.moveTo(15, -42); ctx.quadraticCurveTo(24, -24, 15, -6); });
    line(ctx, '#8a5a3b', 2, () => { ctx.moveTo(15, -42); ctx.quadraticCurveTo(24, -24, 15, -6); });
    line(ctx, '#5fe0a8', 1.2, () => { ctx.moveTo(19.5, -30); ctx.lineTo(20.6, -26); ctx.moveTo(20.6, -22); ctx.lineTo(19.5, -18); });
    line(ctx, '#f4f1ea', 0.6, () => { ctx.moveTo(15, -42); ctx.lineTo(15, -6); });
  };
  if (!back) quiver();
  // scarf tail
  fill(ctx, L.accent, () => { ctx.moveTo(-4, -31); ctx.quadraticCurveTo(-14, -30 + sway, -21, -26 + sway); ctx.lineTo(-19, -23 + sway); ctx.quadraticCurveTo(-12, -26, -4, -28); ctx.closePath(); }, 1);
  // back arm
  limb(ctx, L.outfit, [[-7, -27], [-10, -21]], 4.5);
  limb(ctx, '#7a5233', [[-10, -21], [-9.5, -16]], 4);
  // legs: leggings + tall boots
  limb(ctx, '#2a3a32', [[-3.5, -15], [-4.5, -6]], 5);
  limb(ctx, '#2a3a32', [[3.5, -15], [4.5, -6]], 5);
  fill(ctx, '#7a5233', rr(ctx, -7.5, -9, 6, 6, 1.5), 1); fill(ctx, '#7a5233', rr(ctx, 1.5, -9, 6, 6, 1.5), 1);
  boot(ctx, '#5c3d24', -4.5, 0, '#3a2818'); boot(ctx, '#5c3d24', 4.5, 0, '#3a2818');
  // tunic with a lighter hood bunched at the neck
  const tunic = () => { ctx.moveTo(-8, -29); ctx.lineTo(8, -29); ctx.lineTo(9, -12); ctx.lineTo(4, -10); ctx.lineTo(0, -12); ctx.lineTo(-4, -10); ctx.lineTo(-9, -12); ctx.closePath(); };
  fill(ctx, L.outfit, tunic, 1.3);
  shadeIn(ctx, tunic, shade(L.outfit, -0.07), () => ctx.rect(-9, -29, 5, 20));
  if (!back) line(ctx, '#7a5233', 2, () => { ctx.moveTo(-7, -28); ctx.lineTo(7, -15); });
  fill(ctx, '#7a5233', rr(ctx, -9, -16, 18, 2.5, 1), 0.9);
  fill(ctx, L.accent, () => { ctx.moveTo(-7, -31); ctx.quadraticCurveTo(0, -27, 7, -31); ctx.lineTo(6, -27); ctx.quadraticCurveTo(0, -24, -6, -27); ctx.closePath(); }, 1);
  if (back) quiver();
  // front arm holding the bow
  limb(ctx, L.outfit, [[7, -27], [11, -23]], 4.5);
  limb(ctx, '#7a5233', [[11, -23], [15, -24]], 4);
  if (!back) bow();
  fill(ctx, L.skin, circle(ctx, 15.5, -24, 2.2), 1);
  // head
  head(ctx, L.skin, 0, hy);
  if (!back) {
    ear(ctx, L.skin, -8.5, hy + 1);
    eyes(ctx, 3, hy + 1, '#26b36b', { mood: 'calm' });
    mouth(ctx, 4.5, hy + 6.8, 'smirk');
    fill(ctx, '#f4e6cf', rr(ctx, 6, hy + 2.5, 3.6, 2, 0.6), 0.6); // cheek bandage
  }
  // ponytail with a feather
  fill(ctx, L.hair, () => { ctx.moveTo(-9, hy - 7); ctx.quadraticCurveTo(-22, hy - 6 + sway * 0.5, -19, hy + 12 + sway * 0.4); ctx.quadraticCurveTo(-15, hy + 2, -8, hy - 2); ctx.closePath(); }, 1.3);
  fill(ctx, '#f4f1ea', () => { ctx.moveTo(-9, hy - 9); ctx.quadraticCurveTo(-14, hy - 18, -11, hy - 22); ctx.quadraticCurveTo(-8, hy - 15, -9, hy - 9); }, 0.9);
  line(ctx, '#e0342b', 0.7, () => { ctx.moveTo(-10.5, hy - 19); ctx.lineTo(-10, hy - 16.5); });
  fill(ctx, L.hair, () => {
    ctx.moveTo(-12, hy + (back ? 6 : 2));
    ctx.quadraticCurveTo(-13, hy - 13, 1, hy - 12.5);
    ctx.quadraticCurveTo(13, hy - 12, 12, hy + (back ? 6 : 1));
    if (!back) { ctx.lineTo(9.5, hy - 2); ctx.lineTo(7, hy - 5.5); ctx.lineTo(5, hy - 1.5); ctx.lineTo(2, hy - 6); ctx.lineTo(-1, hy - 2.5); ctx.lineTo(-4, hy - 6); ctx.lineTo(-8, hy + 1); }
    ctx.closePath();
  }, 1.4);
  fill(ctx, L.accent, rr(ctx, -10.5, hy - 8.5, 3, 4, 1), 0.8);
}

function nyx(ctx, L, back, t) {
  const hy = -39;
  const sway = Math.sin(t / 350) * 1.5;
  // shadow wisps around the feet
  ctx.save(); ctx.globalAlpha *= 0.55;
  for (let i = 0; i < 3; i++) {
    const a = t / 600 + i * 2.1;
    fill(ctx, '#3b1d5c', oval(ctx, Math.cos(a) * 9, -1 + Math.sin(a * 1.3) * 1.5, 5, 2), null);
  }
  ctx.restore();
  // cloak back with tattered hem
  const cloak = () => {
    ctx.moveTo(-8, -32); ctx.lineTo(8, -32);
    ctx.lineTo(11, -6);
    for (let i = 0; i <= 6; i++) ctx.lineTo(11 - i * 3.6, -6 + (i % 2 ? 4 : 0) + (i === 3 ? sway : 0));
    ctx.lineTo(-12, -6); ctx.closePath();
  };
  fill(ctx, '#151225', cloak, 1.3);
  // back arm
  limb(ctx, L.outfit, [[-7, -27], [-10, -21], [-9, -16]], 4);
  // dagger in back hand (reverse grip)
  fill(ctx, '#b9a6e6', poly(ctx, [[-9.5, -16], [-8, -16], [-12, -7]]), 0.8);
  // legs
  limb(ctx, '#232036', [[-3, -15], [-4, -4]], 4.5);
  limb(ctx, '#232036', [[3, -15], [4.5, -4]], 4.5);
  boot(ctx, '#151225', -4, 0, '#3b1d5c'); boot(ctx, '#151225', 5, 0, '#3b1d5c');
  // body suit + straps
  const suit = rr(ctx, -7, -30, 14, 17, 4);
  fill(ctx, L.outfit, suit, 1.3);
  if (!back) line(ctx, L.accent, 1.1, () => { ctx.moveTo(-6, -29); ctx.lineTo(6, -17); ctx.moveTo(6, -29); ctx.lineTo(-6, -17); });
  fill(ctx, '#3b1d5c', rr(ctx, -8, -16, 16, 2.6, 1), 0.9);
  fill(ctx, '#55406f', rr(ctx, -7, -15, 3.5, 3, 0.8), 0.7);
  fill(ctx, '#55406f', rr(ctx, 3.5, -15, 3.5, 3, 0.8), 0.7);
  // scarf ends fluttering behind
  fill(ctx, '#2a1f45', () => { ctx.moveTo(-5, -30); ctx.quadraticCurveTo(-14, -30 + sway, -20, -24 + sway); ctx.lineTo(-17, -22 + sway); ctx.quadraticCurveTo(-11, -27, -5, -27); ctx.closePath(); }, 1);
  // front arm + dagger
  limb(ctx, L.outfit, [[7, -27], [11, -22], [13, -19]], 4);
  fill(ctx, '#d8cdf5', poly(ctx, [[12.5, -19], [14.5, -18.5], [21, -26]]), 0.8);
  ctx.save(); ctx.globalAlpha *= 0.5 + 0.3 * Math.sin(t / 200);
  line(ctx, L.accent, 1, () => { ctx.moveTo(14, -19); ctx.lineTo(20, -25.5); });
  ctx.restore();
  fill(ctx, '#232036', circle(ctx, 13, -19, 2.1), 1);
  // head
  head(ctx, L.skin, 0, hy);
  if (!back) {
    // white hair strands, mask over the lower face, glowing eyes
    fill(ctx, L.hair, () => { ctx.moveTo(-8, hy - 9); ctx.lineTo(-6, hy - 2); ctx.lineTo(-3, hy - 6); ctx.lineTo(0, hy - 3); ctx.lineTo(2, hy - 7); ctx.lineTo(4, hy - 4.5); ctx.lineTo(8, hy - 9.5); ctx.closePath(); }, 0.9);
    fill(ctx, '#2a1f45', () => { ctx.moveTo(-9, hy + 3); ctx.quadraticCurveTo(2, hy + 1, 11.5, hy + 2.5); ctx.quadraticCurveTo(10, hy + 11, 2, hy + 11.5); ctx.quadraticCurveTo(-8, hy + 10, -9, hy + 3); }, 1.1);
    line(ctx, '#3b1d5c', 0.7, () => { ctx.moveTo(-5, hy + 6); ctx.lineTo(9, hy + 5.5); });
    eyes(ctx, 3.5, hy, '#e2b8ff', { mood: 'glow', size: 1.15 });
  }
  // hood
  fill(ctx, '#1d1a2b', () => {
    ctx.moveTo(-14, hy + 9);
    ctx.quadraticCurveTo(-16, hy - 16, 1, hy - 16);
    ctx.quadraticCurveTo(10, hy - 16, 14, hy - 8);
    ctx.lineTo(18 - sway * 0.3, hy - 14);
    ctx.lineTo(14, hy + 1);
    if (back) { ctx.lineTo(13, hy + 10); ctx.lineTo(-14, hy + 9); }
    else { ctx.lineTo(10, hy + 2); ctx.quadraticCurveTo(10, hy - 11, 0, hy - 10); ctx.quadraticCurveTo(-9, hy - 9, -9, hy + 4); }
    ctx.closePath();
  }, 1.4);
  line(ctx, L.accent, 1, () => { ctx.moveTo(-12, hy + 5); ctx.quadraticCurveTo(-13, hy - 12, 1, hy - 14); });
}

// ============================================================== ENEMIES

function varg(ctx, L, back, t) {
  const hy = -42;
  const sway = Math.sin(t / 380) * 1.5;
  const fur = L.skin, mane = L.hair;
  // tattered cape + bushy tail
  fill(ctx, '#7a1424', () => { ctx.moveTo(-9, -34); ctx.lineTo(9, -34); ctx.lineTo(13, -5); ctx.lineTo(9, -8); ctx.lineTo(5, -3); ctx.lineTo(0, -7 + sway); ctx.lineTo(-5, -3); ctx.lineTo(-9, -8); ctx.lineTo(-14 + sway, -4); ctx.closePath(); }, 1.3);
  fill(ctx, fur, () => { ctx.moveTo(-6, -14); ctx.quadraticCurveTo(-20, -14 + sway, -21, -4); ctx.quadraticCurveTo(-16, -9, -8, -10); ctx.closePath(); }, 1.2);
  // back arm with claws
  limb(ctx, fur, [[-11, -31], [-15, -23], [-14, -17]], 6);
  fill(ctx, '#f4f1ea', poly(ctx, [[-16, -16], [-15, -12], [-14.5, -16]]), 0.6);
  // digitigrade legs
  limb(ctx, '#2a1420', [[-5, -15], [-7, -9], [-4, -3]], 6);
  limb(ctx, '#2a1420', [[5, -15], [6, -9], [5, -3]], 6);
  fill(ctx, fur, oval(ctx, -3.5, -1.5, 4.5, 2.4), 1.2); fill(ctx, fur, oval(ctx, 6, -1.5, 4.5, 2.4), 1.2);
  // armored torso
  const chest = () => { ctx.moveTo(-12, -35); ctx.lineTo(12, -35); ctx.lineTo(10, -15); ctx.quadraticCurveTo(0, -12, -10, -15); ctx.closePath(); };
  fill(ctx, L.outfit, chest, 1.5);
  shadeIn(ctx, chest, shade(L.outfit, 0.1), () => ctx.rect(2, -35, 12, 22));
  if (!back) {
    line(ctx, L.accent, 1.3, () => { ctx.moveTo(-10, -18); ctx.quadraticCurveTo(0, -15, 10, -18); });
    fill(ctx, L.accent, () => { ctx.moveTo(0, -30); ctx.lineTo(3, -25); ctx.lineTo(0, -21); ctx.lineTo(-3, -25); ctx.closePath(); }, 0.9);
  }
  fill(ctx, '#4a2030', rr(ctx, -11, -17, 22, 3.5, 1.2), 1);
  // spiked pauldron
  fill(ctx, '#3a1c28', () => { ctx.moveTo(6, -35); ctx.quadraticCurveTo(16, -38, 17, -28); ctx.lineTo(8, -28); ctx.closePath(); }, 1.3);
  for (const [x, y] of [[10, -36], [14, -34.5]]) fill(ctx, '#c9ccd8', poly(ctx, [[x - 1.5, y + 1], [x + 1.5, y + 1], [x + 0.5, y - 4]]), 0.8);
  // fur mane collar
  fill(ctx, mane, () => { ctx.moveTo(-13, -33); for (let i = 0; i <= 8; i++) ctx.lineTo(-13 + i * 3.25, -33 - (i % 2 ? 6 : 0)); ctx.lineTo(13, -30); ctx.quadraticCurveTo(0, -27, -13, -30); ctx.closePath(); }, 1.2);
  // front arm, raised claws
  limb(ctx, fur, [[11, -31], [15, -26], [17, -30]], 6);
  for (const dx of [0, 2.2, 4.4]) fill(ctx, '#f4f1ea', poly(ctx, [[15.5 + dx, -32], [17 + dx, -32], [17.5 + dx, -37]]), 0.6);
  // wolf head
  for (const s of [-1, 1]) fill(ctx, fur, poly(ctx, [[s * 3 - 1, hy - 8], [s * 9 - 1, hy - 20], [s * 11 - 1, hy - 5]]), 1.2);
  fill(ctx, '#3a0d18', poly(ctx, [[5, hy - 8], [8.6, hy - 16], [9.6, hy - 6]]), null);
  fill(ctx, fur, circle(ctx, 0, hy, 12), 1.4);
  crescent(ctx, circle(ctx, 0, hy, 12), shade(fur, -0.1), 0, hy, 12);
  fill(ctx, mane, () => { ctx.moveTo(-12, hy + 4); ctx.lineTo(-15, hy - 2); ctx.lineTo(-11, hy - 4); ctx.lineTo(-14, hy - 10); ctx.lineTo(-7, hy - 9); ctx.lineTo(-6, hy - 14); ctx.lineTo(0, hy - 10); ctx.quadraticCurveTo(-8, hy - 4, -9, hy + 4); ctx.closePath(); }, 1.1);
  if (!back) {
    // snout, nose, fangs
    fill(ctx, shade(fur, 0.25), () => { ctx.moveTo(1, hy + 1); ctx.quadraticCurveTo(14, hy, 15, hy + 5); ctx.quadraticCurveTo(12, hy + 10, 2, hy + 9); ctx.closePath(); }, 1.2);
    fill(ctx, INK, oval(ctx, 14, hy + 2.6, 2, 1.5), null);
    line(ctx, INK, 1, () => { ctx.moveTo(4, hy + 7); ctx.lineTo(13, hy + 6.5); });
    fill(ctx, '#fff', poly(ctx, [[7, hy + 6.8], [8.6, hy + 6.8], [7.8, hy + 9.4]]), 0.5);
    fill(ctx, '#fff', poly(ctx, [[10.5, hy + 6.6], [12, hy + 6.6], [11.2, hy + 8.8]]), 0.5);
    // fierce yellow eyes + scar
    for (const [x, k] of [[-0.5, 0.8], [5, 1]]) {
      fill(ctx, '#ffd23f', poly(ctx, [[x - 2.6 * k, hy - 2], [x + 2.6 * k, hy - 3.6], [x + 2 * k, hy - 0.4]]), 0.9);
      fill(ctx, INK, oval(ctx, x + 0.8 * k, hy - 1.9, 0.6, 1.2), null);
    }
    line(ctx, INK, 1.4, () => { ctx.moveTo(-3, hy - 5.5); ctx.lineTo(1.5, hy - 4); ctx.moveTo(3, hy - 4.5); ctx.lineTo(8, hy - 6.5); });
    line(ctx, '#ff8fa3', 1, () => { ctx.moveTo(3.5, hy - 8); ctx.lineTo(6.5, hy + 1); });
  }
}

function imp(ctx, L, back, t) {
  const flap = Math.sin(t / 120) * 3;
  ctx.save();
  ctx.scale(0.88, 0.88);
  // bat wings with membrane veins
  for (const s of [-1, 1]) {
    fill(ctx, '#7a1d1d', () => { ctx.moveTo(s * 4, -24); ctx.lineTo(s * 20, -38 - flap); ctx.quadraticCurveTo(s * 19, -30, s * 23, -26 - flap * 0.5); ctx.quadraticCurveTo(s * 17, -25, s * 18, -19); ctx.quadraticCurveTo(s * 12, -22, s * 5, -18); ctx.closePath(); }, 1.2);
    line(ctx, '#b33a2a', 0.7, () => { ctx.moveTo(s * 5, -22); ctx.lineTo(s * 19, -36 - flap); ctx.moveTo(s * 6, -21); ctx.lineTo(s * 21, -27 - flap * 0.5); ctx.moveTo(s * 6, -20); ctx.lineTo(s * 17, -20); });
  }
  // tail with a flame tip
  line(ctx, INK, 3.6, () => { ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-18, -4, -17, -17); });
  line(ctx, L.skin, 2, () => { ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-18, -4, -17, -17); });
  const fl = Math.sin(t / 80);
  fill(ctx, '#ffb347', () => { ctx.moveTo(-17, -16); ctx.quadraticCurveTo(-21, -21, -17 + fl, -26); ctx.quadraticCurveTo(-13, -21, -17, -16); }, 0.9);
  // legs + clawed feet
  limb(ctx, shade(L.skin, -0.1), [[-4, -9], [-5, -2]], 4);
  limb(ctx, shade(L.skin, -0.1), [[4, -9], [5, -2]], 4);
  fill(ctx, '#3a1410', poly(ctx, [[-8, 0], [-2, 0], [-5, -3]]), 0.8);
  fill(ctx, '#3a1410', poly(ctx, [[2, 0], [9, 0], [5, -3]]), 0.8);
  // pot belly body
  const body = () => ctx.ellipse(0, -15, 9.5, 10, 0, 0, Math.PI * 2);
  fill(ctx, L.skin, body, 1.4);
  shadeIn(ctx, body, shade(L.skin, -0.12), () => ctx.rect(-10, -15, 6, 12));
  if (!back) fill(ctx, '#ff9b6b', oval(ctx, 1.5, -12, 5, 5.5), null);
  fill(ctx, L.outfit, rr(ctx, -8, -9, 16, 3.5, 1.5), 1);
  // arm holding a fireball
  limb(ctx, L.skin, [[7, -19], [12, -21]], 3.5);
  const k = 1 + 0.12 * Math.sin(t / 100);
  ctx.save(); ctx.shadowColor = '#ff6a1f'; ctx.shadowBlur = 8;
  fill(ctx, '#ff6a1f', () => { ctx.moveTo(11, -24); ctx.quadraticCurveTo(12 + fl, -31, 15 + fl, -33 * k); ctx.quadraticCurveTo(17, -29, 19, -27); ctx.quadraticCurveTo(19, -21, 15, -20.5); ctx.quadraticCurveTo(11, -21, 11, -24); }, null);
  const g = ctx.createRadialGradient(15, -24.5, 0.5, 15, -24.5, 4 * k);
  g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#ff8a3d');
  fill(ctx, g, circle(ctx, 15, -24.5, 3.6 * k), null);
  ctx.restore();
  // head with horns and big ears
  const hy = -32;
  for (const s of [-1, 1]) fill(ctx, L.skin, poly(ctx, [[s * 8, hy - 1], [s * 16, hy - 6], [s * 9, hy + 4]]), 1.1);
  fill(ctx, L.skin, circle(ctx, 0, hy, 10), 1.4);
  crescent(ctx, circle(ctx, 0, hy, 10), shade(L.skin, -0.12), 0, hy, 10);
  for (const s of [-1, 1]) fill(ctx, '#f4e2c4', () => { ctx.moveTo(s * 3.5, hy - 8); ctx.quadraticCurveTo(s * 9, hy - 14, s * 7, hy - 20); ctx.quadraticCurveTo(s * 5.5, hy - 13, s * 1, hy - 9); ctx.closePath(); }, 1.1);
  if (!back) {
    for (const [x, kk] of [[-1, 0.85], [4.5, 1]]) {
      fill(ctx, '#ffe066', oval(ctx, x, hy, 2.4 * kk, 2.9), 0.9);
      fill(ctx, INK, oval(ctx, x + 0.6, hy + 0.3, 0.7, 1.9), null);
    }
    fill(ctx, '#5a1010', () => { ctx.moveTo(-2, hy + 4.5); ctx.quadraticCurveTo(2.5, hy + 9, 7.5, hy + 4); ctx.closePath(); }, 1);
    for (const x of [-0.5, 5.5]) fill(ctx, '#fff', poly(ctx, [[x - 0.8, hy + 4.7], [x + 0.8, hy + 4.5], [x, hy + 6.4]]), null);
  }
  ctx.restore();
}

function brute(ctx, L, back, t) {
  const squish = 1 + Math.sin(t / 450) * 0.025;
  ctx.save();
  ctx.scale(1 / squish, squish);
  const body = () => { ctx.moveTo(-19, 0); ctx.quadraticCurveTo(-24, -38, 0, -44); ctx.quadraticCurveTo(24, -38, 19, 0); ctx.quadraticCurveTo(0, 3, -19, 0); ctx.closePath(); };
  // arms (behind)
  fill(ctx, shade(L.skin, -0.1), rr(ctx, -26, -26, 10, 22, 5), 1.3);
  fill(ctx, L.skin, body, 1.6);
  shadeIn(ctx, body, shade(L.skin, -0.12), () => ctx.rect(-24, -44, 12, 48));
  shadeIn(ctx, body, shade(L.skin, 0.1), () => ctx.ellipse(6, -30, 9, 10, 0, 0, Math.PI * 2));
  // mud bubbles + drips
  for (let i = 0; i < 3; i++) {
    const p = ((t / 900 + i / 3) % 1);
    ctx.save(); ctx.globalAlpha *= 1 - p;
    fill(ctx, shade(L.skin, 0.25), circle(ctx, -8 + i * 8, -10 - p * 22, 1.3 + i * 0.3), 0.6);
    ctx.restore();
  }
  for (const [x, len] of [[-12, 4], [4, 6], [13, 3]]) fill(ctx, shade(L.skin, -0.05), () => { ctx.moveTo(x - 2, -2); ctx.quadraticCurveTo(x, -2 + len + 2, x + 2, -2); ctx.closePath(); }, 0.8);
  // mossy top with a lily pad + flower, cattails
  fill(ctx, L.hair, () => { ctx.moveTo(-17, -30); ctx.quadraticCurveTo(-14, -44, 0, -44.5); ctx.quadraticCurveTo(14, -44, 17, -30); ctx.quadraticCurveTo(12, -34, 8, -31); ctx.quadraticCurveTo(3, -36, -2, -32); ctx.quadraticCurveTo(-8, -35, -11, -31); ctx.quadraticCurveTo(-14, -33, -17, -30); }, 1.3);
  line(ctx, '#4a6b2a', 1.4, () => { ctx.moveTo(-9, -42); ctx.lineTo(-11, -54); ctx.moveTo(-6, -43); ctx.lineTo(-5, -52); });
  fill(ctx, '#6b3d1f', rr(ctx, -12.5, -57, 3, 6, 1.5), 0.8);
  fill(ctx, '#6b3d1f', rr(ctx, -6.4, -55, 3, 6, 1.5), 0.8);
  fill(ctx, '#4fa35a', () => { ctx.moveTo(6, -44); ctx.arc(6, -44, 6, 0.3, Math.PI * 2 - 0.3); ctx.closePath(); }, 1);
  fill(ctx, '#ffd1e3', () => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; ctx.moveTo(6, -46); ctx.ellipse(6 + Math.cos(a) * 1.8, -46 + Math.sin(a) * 1.2, 1.4, 0.9, a, 0, Math.PI * 2); } }, 0.6);
  fill(ctx, '#ffe066', circle(ctx, 6, -46, 0.9), null);
  if (!back) {
    // glowing eyes + wide mouth
    ctx.save(); ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 6;
    fill(ctx, '#ffe066', oval(ctx, 0, -27, 2.8, 3.6), 1);
    fill(ctx, '#ffe066', oval(ctx, 9, -27, 3.2, 4), 1);
    ctx.restore();
    fill(ctx, INK, oval(ctx, 0.8, -26.5, 1, 1.9), null);
    fill(ctx, INK, oval(ctx, 10, -26.5, 1.1, 2.1), null);
    fill(ctx, '#1b2f2a', () => { ctx.moveTo(-5, -17); ctx.quadraticCurveTo(5, -10, 15, -18); ctx.quadraticCurveTo(5, -15, -5, -17); }, 1.1);
    fill(ctx, '#e8e2c8', poly(ctx, [[1, -15.6], [3, -15.4], [2, -13.5]]), 0.5);
  }
  // front arm
  fill(ctx, L.skin, rr(ctx, 16, -26, 11, 23, 5.5), 1.4);
  shadeIn(ctx, rr(ctx, 16, -26, 11, 23, 5.5), shade(L.skin, -0.1), () => ctx.rect(16, -12, 11, 10));
  fill(ctx, L.accent, oval(ctx, 0, -1, 17, 3), null);
  ctx.restore();
}

function gargoyle(ctx, L, back, t) {
  const hy = -38;
  const flap = Math.sin(t / 500) * 2;
  const stone = L.skin, dark = shade(L.skin, -0.18), crack = shade(L.skin, -0.32);
  // stone wings
  for (const s of [-1, 1]) {
    fill(ctx, dark, () => { ctx.moveTo(s * 6, -32); ctx.lineTo(s * 26, -48 - flap); ctx.lineTo(s * 25, -40); ctx.lineTo(s * 30, -34 - flap * 0.5); ctx.lineTo(s * 25, -30); ctx.lineTo(s * 28, -22); ctx.quadraticCurveTo(s * 16, -24, s * 9, -18); ctx.closePath(); }, 1.3);
    line(ctx, crack, 0.8, () => { ctx.moveTo(s * 8, -30); ctx.lineTo(s * 25, -46 - flap); ctx.moveTo(s * 9, -27); ctx.lineTo(s * 28, -34 - flap * 0.5); ctx.moveTo(s * 9, -24); ctx.lineTo(s * 26, -24); });
  }
  // spade tail
  line(ctx, INK, 4, () => { ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-20, -6, -19, -16); });
  line(ctx, stone, 2.4, () => { ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-20, -6, -19, -16); });
  fill(ctx, stone, poly(ctx, [[-19, -22], [-22, -16], [-19, -14], [-16, -16]]), 1);
  // crouched legs
  limb(ctx, dark, [[-6, -15], [-10, -8], [-6, -2]], 6);
  limb(ctx, dark, [[6, -15], [10, -8], [7, -2]], 6);
  for (const x of [-6, 7]) for (const dx of [-2.5, 0, 2.5]) fill(ctx, '#e8e2d0', poly(ctx, [[x + dx - 0.8, -1], [x + dx + 0.8, -1], [x + dx + 1.4, 0.8]]), 0.4);
  // hunched torso
  const torso = () => { ctx.moveTo(-10, -32); ctx.quadraticCurveTo(0, -36, 10, -32); ctx.lineTo(9, -14); ctx.quadraticCurveTo(0, -11, -9, -14); ctx.closePath(); };
  fill(ctx, stone, torso, 1.5);
  shadeIn(ctx, torso, dark, () => ctx.rect(-11, -34, 6, 24));
  line(ctx, crack, 0.8, () => { ctx.moveTo(2, -30); ctx.lineTo(4, -25); ctx.lineTo(2, -21); ctx.moveTo(-5, -20); ctx.lineTo(-3, -17); });
  fill(ctx, '#5e8a4a', oval(ctx, 5, -16, 3, 1.4), null); // moss
  // arms with claws
  limb(ctx, stone, [[-9, -30], [-13, -22], [-11, -15]], 5);
  limb(ctx, stone, [[9, -30], [13, -23], [15, -17]], 5);
  for (const dx of [-1.6, 0.4, 2.4]) fill(ctx, '#e8e2d0', poly(ctx, [[14 + dx, -16], [15.4 + dx, -16], [15.5 + dx, -12.5]]), 0.5);
  // head: curled horns, heavy brow, glowing red eyes
  fill(ctx, stone, () => { ctx.moveTo(-9, hy + 2); ctx.quadraticCurveTo(-10, hy - 10, 0, hy - 10); ctx.quadraticCurveTo(10, hy - 10, 10, hy + 1); ctx.quadraticCurveTo(12, hy + 8, 3, hy + 9); ctx.quadraticCurveTo(-8, hy + 9, -9, hy + 2); }, 1.4);
  crescent(ctx, () => { ctx.moveTo(-9, hy + 2); ctx.quadraticCurveTo(-10, hy - 10, 0, hy - 10); ctx.quadraticCurveTo(10, hy - 10, 10, hy + 1); ctx.quadraticCurveTo(12, hy + 8, 3, hy + 9); ctx.quadraticCurveTo(-8, hy + 9, -9, hy + 2); }, dark, 1, hy, 10);
  for (const s of [-1, 1]) fill(ctx, L.accent, () => { ctx.moveTo(s * 4, hy - 8); ctx.quadraticCurveTo(s * 15, hy - 12, s * 13, hy - 21); ctx.quadraticCurveTo(s * 10, hy - 15, s * 2, hy - 10); ctx.closePath(); }, 1.1);
  if (!back) {
    fill(ctx, dark, poly(ctx, [[-4, hy - 3.5], [10, hy - 4.5], [9, hy - 2], [-3, hy - 1.5]]), 0.9);
    ctx.save(); ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 6;
    fill(ctx, '#ff4d6d', oval(ctx, 0, hy, 1.9, 1.3), 0.6);
    fill(ctx, '#ff4d6d', oval(ctx, 6.5, hy - 0.2, 2.2, 1.4), 0.6);
    ctx.restore();
    line(ctx, INK, 1, () => { ctx.moveTo(-1, hy + 5.5); ctx.lineTo(9, hy + 5); });
    for (const x of [1.5, 6]) fill(ctx, '#e8e2d0', poly(ctx, [[x - 0.7, hy + 5.3], [x + 0.7, hy + 5.2], [x, hy + 7]]), null);
  }
  line(ctx, crack, 0.8, () => { ctx.moveTo(-6, hy - 6); ctx.lineTo(-4, hy - 3); });
}

const ART = { kai, goro, rin, sora, nyx, varg, imp, brute, gargoyle };

// Draw a unit with its feet at (0,0) of the current transform.
// facing: grid direction; south/east face the camera, north/west show the back.
export function drawCharacter(ctx, look, facing, t = 0) {
  const back = facing.dr < 0 || facing.dc < 0;
  const flip = facing.dr > 0 || facing.dc < 0 ? -1 : 1; // screen-left facings
  const breathe = 1 + Math.sin(t / 520) * 0.012;
  ctx.save();
  ctx.scale(flip, breathe);
  ctx.lineJoin = 'round';
  (ART[look.art] ?? kai)(ctx, look, back, t);
  ctx.restore();
}

export function drawShadow(ctx, w = 14) {
  ctx.beginPath();
  ctx.ellipse(0, 0, w, w * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
}

// Render a portrait into a canvas (unit card, dialog, ultimate cut-in, profiles).
// focus: 'body' shows the whole character, 'bust' zooms on head and shoulders.
export function renderPortrait(canvas, look, { zoom = 3, bg = null, focus = 'body', t = 0 } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
  if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  // Characters span roughly y = -62..0; a bust centres on the head (~y -40).
  if (focus === 'bust') ctx.translate(w / 2 - zoom, h * 0.5 + 40 * zoom);
  else ctx.translate(w / 2, h * 0.5 + 30 * zoom);
  ctx.scale(zoom, zoom);
  drawCharacter(ctx, look, { dr: 1, dc: 0 }, t);
}
