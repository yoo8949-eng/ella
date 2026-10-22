const TOTAL = 603.0;
const CHAP = [[0, '프롤로그 · 7개국 동시 금리 인상'], [7, '충격 01 · 통화 붕괴와 환율 전쟁'], [10, '충격 02 · 부동산·실물자산 폭락'], [12, '충격 03 · 기업 연쇄 도산'], [14, '진짜 이유는 무엇인가'], [16, '괴물 01 · 빅테크'], [18, '괴물 02 · 각국 정부'], [20, '중앙은행의 낡은 플레이북'], [23, '에필로그']];
const HL = /(\d+%포인트|\d+%|\d+배|\d+주|\d+개국|\d+개|\d+대|금리 인상|금리|AI|빅테크|정부|충격|괴물)/g;
function sceneIndex(t) { let pi = 0; for (let i = 0; i < D.ptimes.length; i++) if (t >= D.ptimes[i][0] - 0.02) pi = i; return pi; }
function sceneStart(i) { return i === 0 ? 0 : D.ptimes[i][0]; }
function sceneEnd(i) { return i + 1 < D.ptimes.length ? D.ptimes[i + 1][0] : TOTAL; }
function drawSubtitle(t) {
  const sub = D.subs.find(s => t >= s.start && t < s.end);
  if (!sub) return;
  const a = Math.min(clamp((t - sub.start) / .12), clamp((sub.end - t) / .1));
  const size = 50;
  const parts = sub.text.split(HL).filter(x => x !== '');
  const tw = parts.reduce((w, p) => w + measure(p, size, 700), 0);
  const y = 975;
  panel(W / 2 - tw / 2 - 34, y - 46, tw + 68, 92, { r: 14, fill: 'rgba(0,0,0,.72)', stroke: null, alpha: a });
  let x = W / 2 - tw / 2;
  parts.forEach(p => { const hl = HL.test(p); HL.lastIndex = 0; const w = text(p, x, y + 2, size, { w: 700, align: 'left', color: hl ? '#ffd166' : C.white, alpha: a }); x += w; });
}
function drawChrome(t, pi) {
  // top-left brand
  circle(78, 62, 9, C.red, .6 + .4 * Math.sin(t * 4));
  text('지식의 파노라마', 100, 64, 28, { w: 800, align: 'left', color: C.white, alpha: .9 });
  // chapter label top-right
  let ch = CHAP[0][1]; for (const c of CHAP) if (pi >= c[0]) ch = c[1];
  const m = measure(ch, 24, 700);
  panel(W - 60 - m - 40, 40, m + 40, 46, { r: 23, fill: 'rgba(16,24,42,.8)', stroke: C.line });
  text(ch, W - 60 - m / 2 - 20, 64, 24, { w: 700, color: C.muted });
  // progress
  ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = C.red; ctx.fillRect(0, H - 6, W * clamp(t / TOTAL), 6);
}
let sceneErr = null;
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  background(t);
  const pi = sceneIndex(t);
  const draw = (i, alpha) => {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha;
    try { SC[i](t, sceneStart(i), sceneEnd(i)); } catch (err) { sceneErr = `scene ${i} @${t.toFixed(2)}: ${err.message}`; throw err; }
    ctx.restore();
  };
  // previous scene fades out during first .35s of new scene
  if (pi > 0 && t < sceneStart(pi) + .35) draw(pi - 1, 1 - (t - sceneStart(pi)) / .35);
  draw(pi, 1);
  // transition streak
  const dt = t - sceneStart(pi);
  if (pi > 0 && dt < .5) { const k = dt / .5; ctx.save(); ctx.globalAlpha = (1 - k) * .5; const x = lerp(-300, W + 300, E.out(k)); const g = ctx.createLinearGradient(x - 300, 0, x + 300, 0); g.addColorStop(0, 'rgba(255,59,71,0)'); g.addColorStop(.5, 'rgba(255,59,71,.8)'); g.addColorStop(1, 'rgba(255,59,71,0)'); ctx.fillStyle = g; ctx.fillRect(x - 300, 0, 600, H); ctx.restore(); }
  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  drawChrome(t, pi);
  drawSubtitle(t);
}
window.render = render;
window.TOTAL = TOTAL;