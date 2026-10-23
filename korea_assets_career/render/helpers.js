const SC = [];
const EVENTS = [];                       // SFX cues collected while rendering: [type, t0]
const _cued = new Set();
function cue(type, t0) { const key = type + '@' + t0.toFixed(2); if (!_cued.has(key)) { _cued.add(key); EVENTS.push([type, +t0.toFixed(2)]); } }
function at(pi, kw, n = 0) { try { return KW(pi, kw, n); } catch (e) { throw e; } }

// ---------- bigger on-screen text (user asked for larger text) ----------
const TS = 1.15;
{ const _t = title; title = (str, y, size, t, t0, opt) => _t(str, y, size * TS, t, t0, opt); }
{ const _c = chip; chip = (str, x, y, size, opt) => _c(str, x, y, size * 1.12, opt); }
// ---------- extra helpers ----------
function bigNum(str, x, y, size, t, t0, color = C.white, d = .5) {
  const k = pop(t, t0, d); if (k <= 0) return;
  cue('pop', t0);
  withT(x, y, k, 0, 1, () => text(str, 0, 0, size, { w: 900, color, shadow: color === C.white ? 'rgba(0,0,0,.6)' : color }));
}
function label(str, x, y, size, t, t0, opt = {}) {
  const k = E.out(P(t, t0, .4)); if (k <= 0) return;
  text(str, x, y + (1 - k) * 18, size * TS, { w: opt.w || 600, color: opt.color || C.muted, align: opt.align || 'center', alpha: k });
}
function fmt(n) { return n.toLocaleString('en-US'); }
// bar chart with per-bar reveal times. items: [{label, val, color, t0, text}]
function barChart(items, x0, base, w, h, vmax, t, opt = {}) {
  const { gap = 40, alpha = 1, lsize = 28, vsize = 34 } = opt; const LS = lsize * 1.2, VS = vsize * 1.2;
  const bw = (w - gap * (items.length - 1)) / items.length;
  line(x0 - 20, base, x0 + w + 20, base, C.dim, 3, alpha);
  items.forEach((it, i) => {
    const k = E.out(P(t, it.t0, .7)); if (k <= 0) return;
    if (k < .05) cue('pop', it.t0);
    const x = x0 + bw / 2 + i * (bw + gap), hh = h * it.val / vmax * k;
    bar(x, base, bw, hh, it.color || C.cyan, it.label, null, alpha, LS);
    text(it.text || fmt(it.val), x, base - hh - 34, VS, { w: 900, color: it.color || C.cyan, alpha: alpha * k });
  });
}
// cliff: a line that stays flat then drops; k = progress
function cliff(x0, y0, w, h, k, color = C.red, alpha = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.shadowColor = color; ctx.shadowBlur = 20;
  ctx.beginPath();
  const n = 60;
  for (let i = 0; i <= n * k; i++) {
    const u = i / n; const yv = u < .45 ? u * .18 : u < .7 ? .08 + (u - .45) * 2.6 : .73 + (u - .7) * .5;
    const X = x0 + u * w, Y = y0 + yv * h; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.stroke(); ctx.restore();
}
// small person icon
function person(x, y, s, color, alpha = 1) { withT(x, y, s, 0, alpha, () => I.person(color)); }
// subscribe / like / bell row
function subscribeRow(x, y, t, t0, opt = {}) {
  const items = [['구독', C.red], ['좋아요', C.white], ['알림 설정', C.amber]];
  const show = opt.bell === false ? items.slice(0, 2) : items;
  const total = show.length * 300 + (show.length - 1) * 40;
  show.forEach(([s, col], i) => {
    const tt = t0 + i * .3, k = pop(t, tt, .5); if (k <= 0) return;
    if (k < .05) cue('pop', tt);
    const cx = x - total / 2 + 150 + i * 340;
    withT(cx, y, k, 0, 1, () => {
      panel(-150, -44, 300, 88, { r: 44, fill: i === 0 ? C.red : 'rgba(16,24,42,.9)', stroke: i === 0 ? null : col, lw: 3 });
      if (i === 1) { ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-98, -2); ctx.lineTo(-84, -26); ctx.lineTo(-70, -8); ctx.lineTo(-62, -8); ctx.lineTo(-62, 20); ctx.lineTo(-98, 20); ctx.closePath(); ctx.fill(); ctx.restore(); }
      if (i === 2) { circle(-96, -6, 14, col); ctx.save(); ctx.fillStyle = col; ctx.fillRect(-110, -6, 28, 16); ctx.restore(); circle(-96, 16, 6, col); }
      text(s, i ? 14 : 0, 2, 38, { w: 800, color: i === 0 ? C.white : col });
    });
  });
}
function clipBG() { /* clips are drawn as full-scene backgrounds in main_ko.js (CLIPMAP) */ }
function quoteBox(str, y, size, t, t0, color = C.white) {
  const k = E.out(P(t, t0, .5)); if (k <= 0) return;
  size *= 1.12; const m = measure(str, size, 800);
  panel(W / 2 - m / 2 - 50, y - size * .9, m + 100, size * 1.8, { r: 20, fill: 'rgba(12,18,32,.9)', stroke: C.amber, lw: 3, alpha: k });
  text(str, W / 2, y, size, { w: 800, color, alpha: k });
}
function hashtag(x, y, t, t0) { const k = E.out(P(t, t0, .4)); if (k > 0) text('#노후준비 #지식파노라마', x, y, 26, { w: 600, color: C.muted, alpha: k }); }
