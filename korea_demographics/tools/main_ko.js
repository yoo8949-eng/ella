const TOTAL = DATA.total;
const CHAP = [[0, '프롤로그 · 인구절벽'], [2, '초고령사회 · 출산율 0.7'], [6, '생산연령인구 · 벼랑'], [9, '충격 01 · 성장'], [10, '충격 02 · 소비'], [11, '충격 03 · 노동력'], [12, '충격 04 · 연금'], [13, '충격 05 · 지방 소멸'], [14, '이미 시작됐다'], [16, '네 가지 해법'], [21, '에필로그']];
const HL = /(\d[\d,.]*%|\d[\d,.]*만 명|\d[\d,.]*만|\d[\d,.]*년|\d[\d,.]*세|\d[\d,.]*명|\d[\d,.]*개|0\.7|0\.72|0\.8|2\.1|인구절벽|초고령사회|생산연령인구|연금|출산율|베이비붐|소멸위험|이민|AI|로봇)/g;
function sceneIndex(t) { let pi = 0; for (let i = 0; i < DATA.ptimes.length; i++) if (t >= DATA.ptimes[i][0] - 0.02) pi = i; return pi; }
function sceneStart(i) { return i === 0 ? 0 : DATA.ptimes[i][0]; }
function sceneEnd(i) { return i + 1 < DATA.ptimes.length ? DATA.ptimes[i + 1][0] : TOTAL; }
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
  const draw = (i, alpha) => { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha = alpha; SC[i](t, sceneStart(i), sceneEnd(i)); ctx.restore(); };
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
