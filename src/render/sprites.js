// Procedural chibi-style character art. Everything is drawn with canvas paths so
// we have no image assets yet; swap for real sprite sheets later.

const INK = '#1a1426';

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + 255 * amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

function shape(ctx, fill, draw, stroke = INK, lw = 1.6) {
  ctx.beginPath();
  draw();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function eyes(ctx, x, y, iris, gap = 4.2, size = 1) {
  for (const ex of [x - gap, x + gap]) {
    shape(ctx, '#fff', () => ctx.ellipse(ex, y, 2.3 * size, 3.2 * size, 0, 0, Math.PI * 2), INK, 1.1);
    shape(ctx, iris, () => ctx.ellipse(ex + 0.4, y + 0.6, 1.5 * size, 2.3 * size, 0, 0, Math.PI * 2), null);
    shape(ctx, '#fff', () => ctx.arc(ex - 0.4, y - 1, 0.7 * size, 0, Math.PI * 2), null);
  }
}

function humanoid(ctx, look, back, big) {
  const w = big ? 24 : 18;
  const legC = shade(look.outfit, -0.12);
  // legs
  shape(ctx, legC, () => roundRect(ctx, -w / 2 + 2, -13, 6, 13, 2));
  shape(ctx, legC, () => roundRect(ctx, w / 2 - 8, -13, 6, 13, 2));
  // arms
  shape(ctx, look.skin, () => roundRect(ctx, -w / 2 - 5, -26, 6, 13, 3));
  shape(ctx, look.skin, () => roundRect(ctx, w / 2 - 1, -26, 6, 13, 3));
  // torso
  shape(ctx, look.outfit, () => roundRect(ctx, -w / 2, -29, w, 18, 5));
  shape(ctx, look.accent, () => ctx.rect(-w / 2 + 1, -17, w - 2, 3), null);
  if (!back) shape(ctx, look.accent, () => { ctx.moveTo(-4, -29); ctx.lineTo(0, -23); ctx.lineTo(4, -29); ctx.closePath(); }, null);
}

function hair(ctx, look, back, hy) {
  const h = look.hair;
  switch (look.hairStyle) {
    case 'spiky':
      shape(ctx, h, () => {
        ctx.moveTo(-12, hy + 1);
        ctx.lineTo(-15, hy - 9); ctx.lineTo(-8, hy - 8);
        ctx.lineTo(-9, hy - 17); ctx.lineTo(-2, hy - 11);
        ctx.lineTo(1, hy - 19); ctx.lineTo(5, hy - 11);
        ctx.lineTo(12, hy - 15); ctx.lineTo(10, hy - 6);
        ctx.lineTo(16, hy - 4); ctx.lineTo(12, hy + 2);
        if (back) { ctx.lineTo(12, hy + 8); ctx.lineTo(-12, hy + 8); }
        else { ctx.lineTo(6, hy - 4); ctx.lineTo(1, hy - 1); ctx.lineTo(-4, hy - 5); ctx.lineTo(-9, hy - 1); }
        ctx.closePath();
      });
      break;
    case 'long':
      shape(ctx, h, () => {
        ctx.moveTo(-12, hy + 14);
        ctx.quadraticCurveTo(-15, hy - 12, 0, hy - 13);
        ctx.quadraticCurveTo(15, hy - 12, 12, hy + 14);
        if (back) ctx.lineTo(-12, hy + 14);
        else { ctx.lineTo(8, hy + 12); ctx.lineTo(9, hy - 3); ctx.quadraticCurveTo(0, hy - 7, -9, hy - 3); ctx.lineTo(-8, hy + 12); }
        ctx.closePath();
      });
      break;
    case 'ponytail':
      shape(ctx, h, () => {
        ctx.moveTo(-12, hy + 3);
        ctx.quadraticCurveTo(-13, hy - 13, 1, hy - 12);
        ctx.quadraticCurveTo(14, hy - 11, 12, hy + 3);
        if (back) ctx.lineTo(-12, hy + 6);
        else { ctx.lineTo(9, hy - 3); ctx.lineTo(3, hy - 6); ctx.lineTo(-2, hy - 3); ctx.lineTo(-9, hy - 4); }
        ctx.closePath();
      });
      shape(ctx, h, () => {
        ctx.moveTo(-10, hy - 6);
        ctx.quadraticCurveTo(-24, hy - 2, -19, hy + 16);
        ctx.quadraticCurveTo(-15, hy + 4, -9, hy + 1);
        ctx.closePath();
      });
      break;
    case 'hood':
      shape(ctx, look.outfit, () => {
        ctx.moveTo(-14, hy + 9);
        ctx.quadraticCurveTo(-15, hy - 15, 0, hy - 15);
        ctx.quadraticCurveTo(15, hy - 15, 14, hy + 9);
        if (back) ctx.lineTo(-14, hy + 9);
        else { ctx.lineTo(9, hy + 4); ctx.quadraticCurveTo(10, hy - 8, 0, hy - 9); ctx.quadraticCurveTo(-10, hy - 8, -9, hy + 4); }
        ctx.closePath();
      });
      if (!back) shape(ctx, h, () => { ctx.moveTo(-8, hy - 3); ctx.lineTo(-2, hy - 9); ctx.lineTo(1, hy - 2); ctx.lineTo(5, hy - 8); ctx.lineTo(8, hy - 2); ctx.lineTo(7, hy - 7); ctx.quadraticCurveTo(0, hy - 11, -7, hy - 7); ctx.closePath(); }, null);
      break;
    default: // short
      shape(ctx, h, () => {
        ctx.moveTo(-12, hy + 1);
        ctx.quadraticCurveTo(-13, hy - 13, 0, hy - 12);
        ctx.quadraticCurveTo(13, hy - 13, 12, hy + 1);
        if (back) { ctx.lineTo(11, hy + 6); ctx.lineTo(-11, hy + 6); }
        else { ctx.lineTo(7, hy - 4); ctx.lineTo(-7, hy - 4); }
        ctx.closePath();
      });
  }
}

function drawHuman(ctx, look, back) {
  const big = look.body === 'big';
  humanoid(ctx, look, back, big);
  const hy = -38;
  if (look.hairStyle === 'ponytail' && back) hair(ctx, look, back, hy);
  shape(ctx, look.skin, () => ctx.arc(0, hy, 11, 0, Math.PI * 2));
  if (!back) {
    eyes(ctx, 2, hy + 2, look.accent);
    shape(ctx, shade(look.skin, -0.25), () => { ctx.moveTo(1, hy + 7.5); ctx.lineTo(4, hy + 7.5); }, shade(look.skin, -0.35), 1);
  }
  if (!(look.hairStyle === 'ponytail' && back)) hair(ctx, look, back, hy);
  else shape(ctx, look.hair, () => ctx.arc(0, hy - 1, 11, 0, Math.PI * 2));
}

function drawWolf(ctx, look, back) {
  humanoid(ctx, { ...look, skin: shade(look.skin, 0.05) }, back, true);
  const hy = -38;
  // ears
  for (const s of [-1, 1]) shape(ctx, look.skin, () => { ctx.moveTo(s * 4, hy - 8); ctx.lineTo(s * 11, hy - 20); ctx.lineTo(s * 12, hy - 4); ctx.closePath(); });
  shape(ctx, look.skin, () => ctx.arc(0, hy, 12, 0, Math.PI * 2));
  shape(ctx, look.hair, () => { ctx.moveTo(-12, hy + 2); ctx.quadraticCurveTo(-8, hy - 15, 0, hy - 12); ctx.quadraticCurveTo(8, hy - 15, 12, hy + 2); ctx.lineTo(6, hy - 4); ctx.lineTo(0, hy - 1); ctx.lineTo(-6, hy - 4); ctx.closePath(); });
  if (!back) {
    shape(ctx, shade(look.skin, 0.2), () => ctx.ellipse(5, hy + 6, 7, 5, 0, 0, Math.PI * 2));
    shape(ctx, INK, () => ctx.arc(10, hy + 4, 1.8, 0, Math.PI * 2), null);
    shape(ctx, '#ffd23f', () => { ctx.moveTo(-3, hy - 1); ctx.lineTo(3, hy - 3); ctx.lineTo(3, hy + 1); ctx.closePath(); }, INK, 1);
    shape(ctx, '#ffd23f', () => { ctx.moveTo(-9, hy - 1); ctx.lineTo(-4, hy - 3); ctx.lineTo(-4, hy + 1); ctx.closePath(); }, INK, 1);
  }
}

function drawImp(ctx, look, back) {
  ctx.save();
  ctx.scale(0.85, 0.85);
  // wings
  for (const s of [-1, 1]) shape(ctx, shade(look.skin, -0.25), () => { ctx.moveTo(s * 6, -26); ctx.lineTo(s * 22, -36); ctx.lineTo(s * 18, -24); ctx.lineTo(s * 22, -18); ctx.closePath(); });
  // tail
  shape(ctx, look.skin, () => { ctx.moveTo(-4, -10); ctx.quadraticCurveTo(-20, -6, -18, -18); ctx.lineTo(-15, -16); ctx.quadraticCurveTo(-16, -9, -4, -13); ctx.closePath(); });
  shape(ctx, look.skin, () => roundRect(ctx, -9, -27, 18, 22, 8));
  shape(ctx, shade(look.skin, -0.1), () => roundRect(ctx, -7, -8, 5, 8, 2));
  shape(ctx, shade(look.skin, -0.1), () => roundRect(ctx, 2, -8, 5, 8, 2));
  const hy = -34;
  shape(ctx, look.skin, () => ctx.arc(0, hy, 11, 0, Math.PI * 2));
  for (const s of [-1, 1]) shape(ctx, look.hair, () => { ctx.moveTo(s * 4, hy - 9); ctx.lineTo(s * 10, hy - 20); ctx.lineTo(s * 10, hy - 6); ctx.closePath(); });
  if (!back) {
    eyes(ctx, 1, hy + 1, look.hair, 4.4, 1.1);
    shape(ctx, INK, () => { ctx.moveTo(-3, hy + 6); ctx.quadraticCurveTo(1, hy + 9, 5, hy + 6); }, INK, 1.2);
  }
  // little flame on the hand
  shape(ctx, '#ffd23f', () => { ctx.moveTo(14, -20); ctx.quadraticCurveTo(19, -26, 15, -33); ctx.quadraticCurveTo(11, -26, 14, -20); }, '#ff6a3d', 1);
  ctx.restore();
}

function drawBlob(ctx, look, back) {
  shape(ctx, look.skin, () => { ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-22, -36, 0, -42); ctx.quadraticCurveTo(22, -36, 18, 0); ctx.closePath(); });
  shape(ctx, shade(look.skin, 0.12), () => ctx.ellipse(-6, -28, 5, 8, -0.3, 0, Math.PI * 2), null);
  for (const s of [-1, 1]) shape(ctx, look.skin, () => roundRect(ctx, s * 18 - 5, -24, 10, 18, 5));
  if (!back) {
    eyes(ctx, 3, -27, '#ffe066', 5, 1.2);
    shape(ctx, shade(look.skin, -0.4), () => { ctx.moveTo(-3, -17); ctx.quadraticCurveTo(3, -13, 9, -17); ctx.closePath(); });
  }
  shape(ctx, look.accent, () => { ctx.ellipse(0, -1, 16, 3, 0, 0, Math.PI * 2); }, null);
}

function drawGargoyle(ctx, look, back) {
  for (const s of [-1, 1]) shape(ctx, shade(look.skin, -0.2), () => { ctx.moveTo(s * 8, -30); ctx.lineTo(s * 28, -44); ctx.lineTo(s * 24, -30); ctx.lineTo(s * 30, -22); ctx.lineTo(s * 12, -18); ctx.closePath(); });
  humanoid(ctx, { ...look, skin: look.skin }, back, false);
  const hy = -37;
  shape(ctx, look.skin, () => ctx.arc(0, hy, 10, 0, Math.PI * 2));
  for (const s of [-1, 1]) shape(ctx, look.accent, () => { ctx.moveTo(s * 5, hy - 7); ctx.quadraticCurveTo(s * 14, hy - 12, s * 12, hy - 20); ctx.quadraticCurveTo(s * 9, hy - 12, s * 2, hy - 9); ctx.closePath(); });
  if (!back) {
    shape(ctx, '#ff4d6d', () => ctx.ellipse(-2, hy + 1, 2.2, 1.6, 0, 0, Math.PI * 2), INK, 1);
    shape(ctx, '#ff4d6d', () => ctx.ellipse(6, hy + 1, 2.2, 1.6, 0, 0, Math.PI * 2), INK, 1);
    shape(ctx, INK, () => { ctx.moveTo(-1, hy + 6); ctx.lineTo(7, hy + 6); }, INK, 1.2);
  }
}

const BODIES = { human: drawHuman, big: drawHuman, wolf: drawWolf, imp: drawImp, blob: drawBlob, gargoyle: drawGargoyle };

// Draw a unit with its feet at (0,0) of the current transform.
// dir: grid facing; south/east = facing the camera.
export function drawCharacter(ctx, look, facing) {
  const back = facing.dr < 0 || facing.dc < 0;
  const flip = facing.dr > 0 || facing.dc < 0 ? -1 : 1; // screen-left facings
  ctx.save();
  ctx.scale(flip, 1);
  (BODIES[look.body] ?? drawHuman)(ctx, look, back);
  ctx.restore();
}

export function drawShadow(ctx, w = 14) {
  ctx.beginPath();
  ctx.ellipse(0, 0, w, w * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
}

// Render a big portrait into a canvas (used by the unit card + ultimate cut-in).
export function renderPortrait(canvas, look, { zoom = 3, bg = null } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.translate(w / 2, h * 0.5 + 38 * zoom * 0.5);
  ctx.scale(zoom, zoom);
  ctx.lineJoin = 'round';
  drawCharacter(ctx, look, { dr: 1, dc: 0 });
}
