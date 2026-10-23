// ---------- timing helpers ----------
const D = DATA;
function KW(pi, kw, n = 0) {
  const p = D.paras[pi]; let idx = -1, from = 0;
  for (let i = 0; i <= n; i++) { idx = p.indexOf(kw, from); if (idx < 0) break; from = idx + 1; }
  if (idx < 0) throw new Error(`keyword not found p${pi}: ${kw}`);
  return D.ctimes[pi][idx];
}
const FULLCAM = { x: W / 2, y: H / 2 + 40, z: 1 };
function camLerp(a, b, k) { return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) }; }
function camOn(code, z) { const l = LBL()[code]; return { x: l[0], y: l[1], z }; }

// red pulse marker + label chip at map coordinate
function mapMarker(code, t, t0, cam, label, alpha = 1, sub) {
  const k = P(t, t0, .5); if (k <= 0 || alpha <= 0) return;
  const [x, y] = mapToScreen(...LBL()[code], cam);
  for (let i = 0; i < 2; i++) { const ph = ((t - t0) * .8 + i * .5) % 1; ring(x, y, 10 + ph * 70, C.red, 3, (1 - ph) * alpha * k); }
  circle(x, y, 9 * E.back(k), C.red, alpha);
  if (label) {
    const ly = y - 52;
    withT(x, ly, E.back(k), 0, alpha, () => {
      chip(label, 0, 0, 26, { bg: C.red });
      tri(measure(label, 26, 800) / 2 + 30, 0, 0, true, C.white, 0);
    });
    if (sub) text(sub, x, ly - 42, 22, { w: 600, color: C.amber, alpha: alpha * k });
  }
}
function title(str, y, size, t, t0, opt = {}) {
  const k = P(t, t0, .6); if (k <= 0) return;
  const { color = C.white, w = 900, alpha = 1, x = W / 2, align = 'center' } = opt;
  ctx.save();
  const yy = y + (1 - E.out(k)) * 40;
  text(str, x, yy, size, { w, color, alpha: alpha * E.out(k), align, shadow: true });
  ctx.restore();
}
function underline(x, y, w, t, t0, color = C.red) { const k = E.out(P(t, t0, .6)); if (k > 0) line(x - w / 2, y, x - w / 2 + w * k, y, color, 6); }
function note(str, alpha = 1) { text(str, W - 60, 860, 18, { w: 500, color: C.muted, align: 'right', alpha }); }
function chapterCard(num, label, sub, t, t0, t1) {
  const a = vis(t, t0, t1, .4, .4); if (a <= 0) return;
  const k = E.out(P(t, t0, .7));
  ctx.save(); ctx.globalAlpha *= a;
  const bw = 1100 * k;
  panel(W / 2 - bw / 2, 330, bw, 300, { fill: 'rgba(12,18,32,.92)', stroke: C.red, lw: 3, r: 22 });
  if (k > .5) {
    const a2 = E.out((k - .5) * 2);
    text(num, W / 2, 400, 34, { w: 800, color: C.red, alpha: a2, ls: 8 });
    text(label, W / 2, 480, 76, { w: 900, alpha: a2 });
    if (sub) text(sub, W / 2, 568, 30, { w: 500, color: C.muted, alpha: a2 });
  }
  ctx.restore();
}
// bar with label
function bar(x, base, w, h, color, label, val, alpha = 1, lsize = 26) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  const g = ctx.createLinearGradient(0, base - h, 0, base); g.addColorStop(0, color); g.addColorStop(1, color + '55');
  ctx.fillStyle = g; rrect(x - w / 2, base - h, w, Math.max(h, 1), 8); ctx.fill();
  ctx.restore();
  if (label) text(label, x, base + 32, lsize, { w: 700, color: C.white, alpha });
  if (val) text(val, x, base - h - 30, 30, { w: 900, color, alpha });
}
// particles flowing along a quadratic bezier
function flow(x1, y1, x2, y2, bend, t, n, color, speed = .5, alpha = 1, size = 6) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - bend;
  for (let i = 0; i < n; i++) {
    const u = ((t * speed + i / n + hash(i) * .05) % 1);
    const x = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, y = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2;
    circle(x, y, size * (0.6 + hash(i + 4) * .6), color, alpha * Math.sin(u * Math.PI));
  }
}
function qmark(x, y, size, t, t0) { const k = pop(t, t0, .6); withT(x, y, k, Math.sin(t * 2) * .05, k > 0 ? 1 : 0, () => text('?', 0, 0, size, { w: 900, color: C.amber, shadow: 'rgba(255,181,71,.6)' })); }
function xmark(x, y, s, t, t0, color = C.red) {
  const k = P(t, t0, .4); if (k <= 0) return;
  line(x - s, y - s, lerp(x - s, x + s, E.out(clamp(k * 2))), lerp(y - s, y + s, E.out(clamp(k * 2))), color, s * .22);
  if (k > .5) line(x + s, y - s, lerp(x + s, x - s, E.out((k - .5) * 2)), lerp(y - s, y + s, E.out((k - .5) * 2)), color, s * .22);
}
function lineChart(pts, x0, y0, w, h, k, color, lw = 6, alpha = 1) {
  // pts: array of [u(0..1), v(0..1)], v up
  if (k <= 0 || alpha <= 0) return null;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.beginPath();
  const total = pts.length - 1, lim = k * total; let last;
  for (let i = 0; i <= total; i++) {
    if (i > lim) { const f = lim - (i - 1); const a = pts[i - 1], b = pts[i]; last = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]; ctx.lineTo(x0 + last[0] * w, y0 - last[1] * h); break; }
    last = pts[i]; const X = x0 + pts[i][0] * w, Y = y0 - pts[i][1] * h; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.stroke(); ctx.restore();
  return [x0 + last[0] * w, y0 - last[1] * h];
}
function axes(x0, y0, w, h, alpha, labelX, labelY) {
  line(x0, y0, x0 + w, y0, C.dim, 3, alpha); line(x0, y0, x0, y0 - h, C.dim, 3, alpha);
  if (labelX) text(labelX, x0 + w, y0 + 30, 22, { w: 600, color: C.muted, align: 'right', alpha });
  if (labelY) text(labelY, x0 + 10, y0 - h - 20, 22, { w: 600, color: C.muted, align: 'left', alpha });
}
// card with icon + label
function iconCard(x, y, w, h, iconFn, label, t, t0, opt = {}) {
  const k = pop(t, t0, .55); if (k <= 0) return;
  const { color = C.white, sub, alpha = 1, stroke = C.line, iconY = -30, iconS = 1 } = opt;
  withT(x, y, k, 0, alpha, () => {
    panel(-w / 2, -h / 2, w, h, { stroke });
    withT(0, iconY, iconS, 0, 1, iconFn);
    text(label, 0, h / 2 - (sub ? 70 : 42), 34, { w: 800, color });
    if (sub) text(sub, 0, h / 2 - 32, 22, { w: 500, color: C.muted });
  });
}
// water/liquidity tank
function tank(x, y, w, h, level, color, alpha, t) {
  ctx.save(); ctx.globalAlpha *= alpha;
  rrect(x - w / 2, y - h / 2, w, h, 20); ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.stroke(); ctx.clip();
  const top = y + h / 2 - h * level;
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - w / 2, y + h / 2);
  for (let i = 0; i <= 30; i++) ctx.lineTo(x - w / 2 + w * i / 30, top + Math.sin(t * 3 + i * .5) * 6);
  ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

