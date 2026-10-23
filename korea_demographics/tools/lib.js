// ---------- core helpers (all rendering is a pure function of t) ----------
const W = 1920, H = 1080;
const C = {
  bg0: '#060a13', bg1: '#0d1424', grid: 'rgba(120,150,200,0.06)',
  red: '#ff3b47', redD: '#a3121d', amber: '#ffb547', cyan: '#3fd0ff', green: '#39d98a',
  white: '#f2f5fa', muted: '#7d8ba6', dim: '#3a4660', panel: 'rgba(16,24,42,0.86)', line: 'rgba(160,185,230,0.18)'
};
const FONT = 'Pretendard';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  out: k => 1 - Math.pow(1 - clamp(k), 3),
  in: k => Math.pow(clamp(k), 3),
  io: k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: k => { k = clamp(k); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  elastic: k => { k = clamp(k); if (k === 0 || k === 1) return k; return Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1; },
};
const P = (t, t0, d) => clamp((t - t0) / d);           // progress
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

// visibility of a phase [a,b) with fades
function vis(t, a, b, fi = 0.45, fo = 0.35) {
  if (t < a || t > b) return 0;
  return Math.min(E.out((t - a) / fi), b === Infinity ? 1 : clamp((b - t) / fo));
}

let ctx;
function setCtx(c) { ctx = c; }

function font(size, weight = 700) { ctx.font = `${weight} ${size}px ${FONT}`; }
function text(str, x, y, size, opt = {}) {
  const { w = 700, color = C.white, align = 'center', base = 'middle', alpha = 1, ls = 0, shadow = 0, maxW } = opt;
  if (alpha <= 0) return 0;
  ctx.save();
  ctx.globalAlpha *= alpha;
  font(size, w);
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (ls) ctx.letterSpacing = ls + 'px';
  if (shadow) { ctx.shadowColor = typeof shadow === 'string' ? shadow : 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; }
  if (maxW) ctx.fillText(str, x, y, maxW); else ctx.fillText(str, x, y);
  const m = ctx.measureText(str).width;
  ctx.restore();
  return m;
}
function measure(str, size, w = 700) { ctx.save(); font(size, w); const m = ctx.measureText(str).width; ctx.restore(); return m; }
function rrect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function panel(x, y, w, h, opt = {}) {
  const { r = 18, fill = C.panel, stroke = C.line, alpha = 1, lw = 2, glow } = opt;
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 40; }
  rrect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  ctx.shadowBlur = 0;
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  ctx.restore();
}
function circle(x, y, r, fill, alpha = 1) { if (alpha <= 0 || r <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }
function ring(x, y, r, color, lw = 3, alpha = 1) { if (alpha <= 0 || r <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke(); ctx.restore(); }
function line(x1, y1, x2, y2, color, lw = 3, alpha = 1, dash) {
  if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function arrow(x1, y1, x2, y2, color, lw = 6, k = 1, alpha = 1, head = 22) {
  if (k <= 0 || alpha <= 0) return;
  const x = lerp(x1, x2, k), y = lerp(y1, y2, k);
  line(x1, y1, x, y, color, lw, alpha);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x + Math.cos(a) * head * .4, y + Math.sin(a) * head * .4);
  ctx.lineTo(x - Math.cos(a - .5) * head, y - Math.sin(a - .5) * head);
  ctx.lineTo(x - Math.cos(a + .5) * head, y - Math.sin(a + .5) * head);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function curveArrow(x1, y1, x2, y2, bend, color, lw, k, alpha = 1) {
  if (k <= 0) return;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - bend;
  const pt = u => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2];
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i <= 40; i++) { const [x, y] = pt(k * i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke(); ctx.restore();
  return pt;
}
// up/down triangle marker
function tri(x, y, s, up, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
  if (up) { ctx.moveTo(x, y - s); ctx.lineTo(x + s * .9, y + s * .6); ctx.lineTo(x - s * .9, y + s * .6); }
  else { ctx.moveTo(x, y + s); ctx.lineTo(x + s * .9, y - s * .6); ctx.lineTo(x - s * .9, y - s * .6); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function withT(x, y, s, rot, alpha, fn) {
  if (alpha <= 0 || s <= 0) return;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (s !== 1) ctx.scale(s, s); ctx.globalAlpha *= alpha; fn(); ctx.restore();
}
// pop-in: scale with back easing
function pop(t, t0, d = 0.5) { return E.back(P(t, t0, d)); }

// chip label: rounded pill with text
function chip(str, x, y, size, opt = {}) {
  const { color = C.white, bg = C.red, alpha = 1, w = 800, pad = 0.55, stroke = null } = opt;
  if (alpha <= 0) return;
  const m = measure(str, size, w);
  const pw = m + size * pad * 2, ph = size * 1.6;
  panel(x - pw / 2, y - ph / 2, pw, ph, { r: ph / 2, fill: bg, stroke, lw: 3, alpha });
  text(str, x, y + size * 0.04, size, { w, color, alpha });
}
// big stamp (rotated rectangle text)
function stamp(str, x, y, size, t, t0, color = C.red, rot = -0.12) {
  const k = P(t, t0, 0.35); if (k <= 0) return;
  const s = lerp(2.2, 1, E.out(k));
  withT(x, y, s, rot, k, () => {
    const m = measure(str, size, 900); const pw = m + size * 0.9, ph = size * 1.5;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = size * 0.09; rrect(-pw / 2, -ph / 2, pw, ph, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(6,10,19,0.55)'; ctx.fill(); ctx.restore();
    text(str, 0, size * 0.04, size, { w: 900, color });
  });
}
// counter number
function counter(v0, v1, t, t0, d) { return Math.round(lerp(v0, v1, E.out(P(t, t0, d)))); }

// ---------- icons (drawn centered at 0,0, unit ~100px) ----------
const I = {
  house(c = C.white, lw = 7) {
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-50, -5); ctx.lineTo(0, -48); ctx.lineTo(50, -5); ctx.stroke();
    ctx.strokeRect(-36, -12, 72, 58); ctx.fillStyle = c; ctx.fillRect(-10, 16, 20, 30); ctx.restore();
  },
  factory(c = C.white) {
    ctx.save(); ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(-55, 45); ctx.lineTo(-55, -10); ctx.lineTo(-25, 8); ctx.lineTo(-25, -10); ctx.lineTo(5, 8); ctx.lineTo(5, -10);
    ctx.lineTo(35, 8); ctx.lineTo(35, -50); ctx.lineTo(55, -50); ctx.lineTo(55, 45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.bg0; for (let i = 0; i < 3; i++) ctx.fillRect(-45 + i * 30, 20, 14, 12); ctx.restore();
  },
  coin(c = C.amber, sym = '$') {
    circle(0, 0, 44, c); ring(0, 0, 34, 'rgba(0,0,0,.25)', 4);
    text(sym, 0, 3, 44, { w: 900, color: 'rgba(0,0,0,.55)' });
  },
  person(c = C.white) {
    circle(0, -32, 17, c);
    ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 30, 34, Math.PI, 0); ctx.lineTo(34, 40); ctx.lineTo(-34, 40); ctx.closePath(); ctx.fill(); ctx.restore();
  },
  bank(c = C.white) {
    ctx.save(); ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(-58, -20); ctx.lineTo(0, -55); ctx.lineTo(58, -20); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 4; i++) ctx.fillRect(-46 + i * 28, -12, 13, 46);
    ctx.fillRect(-60, 38, 120, 12); ctx.restore();
  },
  gear(r = 60, teeth = 10, c = C.white, ang = 0) {
    ctx.save(); ctx.rotate(ang); ctx.fillStyle = c; ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = i * Math.PI / teeth, rr = i % 2 ? r * 0.8 : r;
      ctx.lineTo(Math.cos(a0 - .12) * rr, Math.sin(a0 - .12) * rr); ctx.lineTo(Math.cos(a0 + .12) * rr, Math.sin(a0 + .12) * rr);
    }
    ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  },
  chip(c = C.cyan) {
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 5;
    for (let i = -2; i <= 2; i++) { line(i * 14, -46, i * 14, -34, c, 5); line(i * 14, 34, i * 14, 46, c, 5); line(-46, i * 14, -34, i * 14, c, 5); line(34, i * 14, 46, i * 14, c, 5); }
    rrect(-34, -34, 68, 68, 8); ctx.fillStyle = 'rgba(63,208,255,.15)'; ctx.fill(); ctx.stroke();
    text('GPU', 0, 2, 20, { w: 900, color: c }); ctx.restore();
  },
  tower(c = C.white) { // cooling tower
    ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-40, 50); ctx.quadraticCurveTo(-18, 0, -30, -45); ctx.lineTo(30, -45);
    ctx.quadraticCurveTo(18, 0, 40, 50); ctx.closePath(); ctx.fill(); ctx.restore();
  },
  capitol(c = C.white) {
    ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -22, 30, Math.PI, 0); ctx.fill();
    ctx.fillRect(-3, -66, 6, 16); ctx.fillRect(-44, -24, 88, 10);
    for (let i = 0; i < 5; i++) ctx.fillRect(-40 + i * 18, -12, 9, 44); ctx.fillRect(-56, 32, 112, 12); ctx.restore();
  },
  shop(c = C.white) {
    ctx.save(); ctx.fillStyle = c; ctx.fillRect(-45, -10, 90, 55);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-36 + i * 18, -14, 9, 0, Math.PI); ctx.fill(); }
    ctx.fillRect(-50, -40, 100, 26); ctx.fillStyle = C.bg0; ctx.fillRect(-12, 12, 24, 33); ctx.restore();
  },
  rocket(c = C.white) {
    ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -55); ctx.quadraticCurveTo(26, -25, 18, 25); ctx.lineTo(-18, 25);
    ctx.quadraticCurveTo(-26, -25, 0, -55); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, 5); ctx.lineTo(-34, 35); ctx.lineTo(-16, 28); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18, 5); ctx.lineTo(34, 35); ctx.lineTo(16, 28); ctx.fill();
    circle(0, -15, 9, C.bg0); ctx.restore();
  },
  doc(c = C.white) { ctx.save(); ctx.fillStyle = c; rrect(-38, -50, 76, 100, 8); ctx.fill(); for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-26, -32 + i * 15, i === 4 ? 30 : 52, 6); } ctx.restore(); },
  flag(c = C.white, wave = 0) {
    line(-30, -60, -30, 60, '#c9d2e3', 6);
    ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-30, -58);
    for (let i = 0; i <= 10; i++) ctx.lineTo(-30 + i * 7, -58 + Math.sin(wave + i * .6) * 6);
    for (let i = 10; i >= 0; i--) ctx.lineTo(-30 + i * 7, -10 + Math.sin(wave + i * .6) * 6);
    ctx.closePath(); ctx.fill(); ctx.restore();
  },
};

// ---------- map ----------
let MAPP = null;
function initMap() {
  MAPP = MAP.countries.map(c => ({ id: c.id, ez: c.ez, p: new Path2D(c.d) }));
}
const MAPID = { NZ: ['554'], AU: ['036'], US: ['840'], JP: ['392'], ZA: ['710'], NO: ['578'] };
function mapIds(code) { return code === 'EU' ? MAPP.filter(c => c.ez).map(c => c.id) : MAPID[code]; }
// hl: {code: {color, a}} ; cam: {x,y,z} center on map coords
function drawMap(alpha, hl = {}, cam = { x: W / 2, y: H / 2, z: 1 }, base = '#18233a') {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  const idc = {};
  for (const code in hl) for (const id of mapIds(code)) idc[id] = hl[code];
  ctx.lineWidth = 1.2 / cam.z; ctx.strokeStyle = 'rgba(120,150,200,.22)';
  for (const c of MAPP) {
    ctx.fillStyle = base; ctx.fill(c.p); ctx.stroke(c.p);
    const h = idc[c.id];
    if (h && h.a > 0) { ctx.save(); ctx.globalAlpha *= h.a; ctx.fillStyle = h.color; ctx.shadowColor = h.color; ctx.shadowBlur = 25 / cam.z; ctx.fill(c.p); ctx.restore(); }
  }
  ctx.restore();
}
function mapToScreen(x, y, cam) { return [(x - cam.x) * cam.z + W / 2, (y - cam.y) * cam.z + H / 2]; }
const LBL = () => MAP.labels;

// ---------- background ----------
function background(t) {
  const g = ctx.createRadialGradient(W * .5, H * .42, 100, W * .5, H * .5, W * .75);
  g.addColorStop(0, C.bg1); g.addColorStop(1, C.bg0);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // drifting grid
  ctx.save(); ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  const off = (t * 6) % 80;
  ctx.beginPath();
  for (let x = -80 + off; x < W + 80; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = -80 + off * .5; y < H + 80; y += 80) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke(); ctx.restore();
  // floating dust
  for (let i = 0; i < 40; i++) {
    const x = (hash(i) * W + t * (8 + hash(i + 9) * 18)) % W, y = (hash(i + 3) * H - t * (4 + hash(i + 5) * 10) % H + H) % H;
    circle(x, y, 1 + hash(i + 7) * 2, 'rgba(160,190,255,.25)');
  }
}
