const TOTAL = DATA.total;
const CHAP = [[0, '프롤로그 · 인구절벽'], [2, '초고령사회 · 출산율 0.7'], [6, '생산연령인구 · 벼랑'], [9, '충격 01 · 성장'], [10, '충격 02 · 소비'], [11, '충격 03 · 노동력'], [12, '충격 04 · 연금'], [13, '충격 05 · 지방 소멸'], [14, '이미 시작됐다'], [16, '네 가지 해법'], [21, '에필로그']];
const HL = /(\d[\d,.]*%|\d[\d,.]*만 명|\d[\d,.]*만|\d[\d,.]*년|\d[\d,.]*세|\d[\d,.]*명|\d[\d,.]*개|0\.7|0\.72|0\.8|2\.1|인구절벽|초고령사회|생산연령인구|연금|출산율|베이비붐|소멸위험|이민|AI|로봇)/g;
function sceneIndex(t) { let pi = 0; for (let i = 0; i < DATA.ptimes.length; i++) if (t >= DATA.ptimes[i][0] - 0.02) pi = i; return pi; }
function sceneStart(i) { return i === 0 ? 0 : DATA.ptimes[i][0]; }
function sceneEnd(i) { return i + 1 < DATA.ptimes.length ? DATA.ptimes[i + 1][0] : TOTAL; }

// ---------- AI video clips as full-screen moving backgrounds ----------
// frames pre-extracted to clips/<name>/0001.jpg … (24 fps); CLIPINFO = {name: nframes} from clips/info.js
const CLIPINFO = window.CLIPINFO || {};
const CLIPMAP = {
  0: ['v00_seoul-crowd'], 2: ['v02_elderly-park'], 3: ['v03_nursery'], 4: ['v04_empty-playground'], 5: ['v05_retirement-wave'],
  6: ['v06_subway-commute'], 7: ['v07_cliff-edge'], 10: ['v10_empty-mall'], 11: ['v11_shipyard'], 12: ['v12_elderly-queue'],
  13: ['v13_empty-school', ['v13b_shuttered-street', '버스가']], 14: ['v14_small-classroom'], 15: ['v15_tokyo-street'],
  17: ['v17_young-family'], 18: ['v18_older-worker'], 19: ['v19_airport-arrivals'], 20: ['v20_robot-factory'],
  21: ['v21_bridge'], 22: ['v22_seoul-sunrise'],
};
const CLIP_RATE = 0.6, CLIP_XF = 0.8, CLIP_FPS = 24;
const FRAMES = new Map();
function frameImg(name, i) {
  const key = name + '/' + i; let e = FRAMES.get(key);
  if (!e) {
    const img = new Image(); e = { img, ok: false };
    e.p = new Promise(r => { img.onload = () => { e.ok = true; r(); }; img.onerror = () => r(); });
    img.src = `clips/${name}/${String(i + 1).padStart(4, '0')}.jpg`;
    FRAMES.set(key, e);
    if (FRAMES.size > 160) FRAMES.delete(FRAMES.keys().next().value);
  }
  return e;
}
// which clips a scene shows at t: [[name, u (clip-local seconds), alpha]]
function sceneClips(i, t) {
  const list = CLIPMAP[i]; if (!list) return [];
  const s = sceneStart(i), out = [];
  list.forEach(c => {
    const name = Array.isArray(c) ? c[0] : c; if (!CLIPINFO[name]) return;
    const t0 = Array.isArray(c) ? KW(i, c[1]) : s;
    const a = Array.isArray(c) ? E.out(P(t, t0 - .4, .8)) : 1;
    if (a > 0) out.push([name, Math.max(0, t - (Array.isArray(c) ? t0 - .4 : s)) * CLIP_RATE, a]);
  });
  return out;
}
// frame layers for a clip at local time u: forward play, crossfade back to the start at each loop, adjacent-frame blending
function clipLayers(name, u) {
  const n = CLIPINFO[name], d = (n - 1) / CLIP_FPS, L = d - CLIP_XF;
  const cyc = Math.floor(u / L), loc = u - cyc * L, out = [];
  const add = (tm, a) => { const f = tm * CLIP_FPS, i0 = Math.min(n - 1, Math.floor(f)), fr = f - i0; out.push([i0, a]); if (fr > .02 && i0 < n - 1) out.push([i0 + 1, a * fr]); };
  if (cyc > 0 && loc < CLIP_XF) { add(loc + L, 1); add(loc, loc / CLIP_XF); } else add(loc, 1);
  return out;
}
function scenesAt(t) { const pi = sceneIndex(t); return (pi > 0 && t < sceneStart(pi) + .35) ? [pi - 1, pi] : [pi]; }
window.preloadFrames = t => Promise.all(scenesAt(t).flatMap(i => sceneClips(i, t).flatMap(([name, u]) => clipLayers(name, u).map(([fi]) => frameImg(name, fi).p))));
function drawSceneClips(i, t) {
  const cl = sceneClips(i, t); if (!cl.length) return;
  const s = sceneStart(i), z = 1 + .06 * clamp((t - s) / Math.max(6, sceneEnd(i) - s));
  cl.forEach(([name, u, a]) => clipLayers(name, u).forEach(([fi, la]) => {
    const e = frameImg(name, fi); if (!e.ok) return;
    ctx.save(); ctx.globalAlpha *= a * la;
    const w = W * z, h = H * z; ctx.drawImage(e.img, (W - w) / 2, (H - h) / 2, w, h); ctx.restore();
  }));
  // darken so charts and text stay readable: lighter for the first second of the scene
  const dark = lerp(.3, .62, E.io(P(t, s + .9, 1.2)));
  ctx.save(); ctx.fillStyle = `rgba(6,10,19,${dark})`; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function drawSubtitle(t) {
  const sub = DATA.subs.find(s => t >= s.start && t < s.end);
  if (!sub) return;
  const a = Math.min(clamp((t - sub.start) / .12), clamp((sub.end - t) / .1));
  const size = 52;
  const parts = sub.text.split(HL).filter(x => x !== '');
  const tw = parts.reduce((w, p) => w + measure(p, size, 700), 0);
  const y = 985;
  panel(W / 2 - tw / 2 - 36, y - 48, tw + 72, 96, { r: 8, fill: 'rgba(0,0,0,.82)', stroke: null, alpha: a });
  let x = W / 2 - tw / 2;
  parts.forEach(p => { const hl = HL.test(p); HL.lastIndex = 0; const w = text(p, x, y + 2, size, { w: 700, align: 'left', color: hl ? '#ffd166' : C.white, alpha: a }); x += w; });
}
function drawChrome(t, pi) {
  circle(78, 62, 9, C.red, .6 + .4 * Math.sin(t * 4));
  text('지식파노라마', 100, 64, 28, { w: 800, align: 'left', color: C.white, alpha: .9 });
  let ch = CHAP[0][1]; for (const c of CHAP) if (pi >= c[0]) ch = c[1];
  const m = measure(ch, 24, 700);
  panel(W - 60 - m - 40, 40, m + 40, 46, { r: 23, fill: 'rgba(16,24,42,.8)', stroke: C.line });
  text(ch, W - 60 - m / 2 - 20, 64, 24, { w: 700, color: C.muted });
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = C.red; ctx.fillRect(0, H - 6, W * clamp(t / TOTAL), 6);
}
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  background(t);
  const pi = sceneIndex(t);
  const draw = (i, alpha) => { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha = alpha; drawSceneClips(i, t); SC[i](t, sceneStart(i), sceneEnd(i)); ctx.restore(); };
  if (pi > 0 && t < sceneStart(pi) + .35) draw(pi - 1, 1 - (t - sceneStart(pi)) / .35);
  draw(pi, 1);
  const dt = t - sceneStart(pi);
  if (pi > 0 && dt < .5) { const k = dt / .5; ctx.save(); ctx.globalAlpha = (1 - k) * .5; const x = lerp(-300, W + 300, E.out(k)); const g = ctx.createLinearGradient(x - 300, 0, x + 300, 0); g.addColorStop(0, 'rgba(255,59,71,0)'); g.addColorStop(.5, 'rgba(255,59,71,.8)'); g.addColorStop(1, 'rgba(255,59,71,0)'); ctx.fillStyle = g; ctx.fillRect(x - 300, 0, 600, H); ctx.restore(); if (dt < .05) cue('swoosh', sceneStart(pi)); }
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  drawChrome(t, pi);
  drawSubtitle(t);
  // fade in/out
  const f = Math.min(clamp(t / .8), clamp((TOTAL - t) / 1.5));
  if (f < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - f})`; ctx.fillRect(0, 0, W, H); }
}
window.render = render;
window.TOTAL = TOTAL;
window.EVENTS = EVENTS;
