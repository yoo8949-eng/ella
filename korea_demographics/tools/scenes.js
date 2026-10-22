// ---------- timing helpers ----------
const D = DATA;
function KW(pi, kw, n = 0) {
  const p = D.paras[pi]; let idx = -1, from = 0;
  for (let i = 0; i <= n; i++) { idx = p.indexOf(kw, from); if (idx < 0) break; from = idx + 1; }
  if (idx < 0) throw new Error(`keyword not found p${pi}: ${kw}`);
  return D.ctimes[pi][idx];
}
const C7 = [
  { code: 'NZ', ko: '뉴질랜드', en: 'NEW ZEALAND' }, { code: 'EU', ko: '유럽', en: 'EUROZONE' },
  { code: 'US', ko: '미국', en: 'UNITED STATES' }, { code: 'JP', ko: '일본', en: 'JAPAN' },
  { code: 'ZA', ko: '남아공', en: 'SOUTH AFRICA' }, { code: 'NO', ko: '노르웨이', en: 'NORWAY' },
  { code: 'AU', ko: '호주', en: 'AUSTRALIA' },
];
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

// =================== SCENES ===================
const SC = [];

// 0: hook — 7 economies, 4 weeks
SC[0] = (t, s, e) => {
  const k = (w, n) => KW(0, w, n);
  const tA = k('불과'), tC = k('뉴질랜드'), tD = k('이 7개'), tE = k('여러분');
  // background map always (dim)
  const mapA = lerp(.35, 1, E.out(P(t, tC - .6, 1)));
  const hl = {};
  C7.forEach((c, i) => { const ti = c.code === 'ZA' ? k('남아프리카') : c.code === 'EU' ? k('유럽') : k(c.ko === '남아공' ? '남아프리카' : c.ko); hl[c.code] = { color: C.red, a: E.out(P(t, ti, .4)) * .9 }; });
  drawMap(mapA * (t > tE ? lerp(1, .45, P(t, tE, .6)) : 1), hl, FULLCAM);
  // A: headline
  let a = vis(t, s, tA, .5, .4);
  if (a > 0) {
    text('지금, 세계 경제 한복판에서', W / 2, 380, 52, { w: 600, color: C.muted, alpha: a * E.out(P(t, s + .1, .6)) });
    const g = P(t, k('기괴한'), .4);
    const jx = g > 0 && g < 1 ? (hash(Math.floor(t * 30)) - .5) * 18 : 0;
    title('벌어지는 기괴한 일', 500, 128, t, k('기괴한'), { color: C.red, x: W / 2 + jx, alpha: a });
  }
  // B: 4 weeks / 7 economies counters
  a = vis(t, tA, tC, .5, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    panel(270, 250, 620, 440, { fill: 'rgba(10,16,30,.9)' }); panel(1030, 250, 620, 440, { fill: 'rgba(10,16,30,.9)' });
    const d = counter(1, 28, t, k('4주'), 1.6);
    text('기간', 580, 310, 30, { w: 600, color: C.muted });
    text(`${Math.ceil(d / 7)}주`, 580, 470, 170, { w: 900, color: C.amber });
    text(`DAY ${String(d).padStart(2, '0')} / 28`, 580, 610, 34, { w: 700, color: C.white, ls: 3 });
    const n = counter(0, 7, t, k('7개'), 1.2);
    text('주요 경제권', 1340, 310, 30, { w: 600, color: C.muted });
    text(`${n}개`, 1340, 470, 170, { w: 900, color: C.red });
    if (t > k('금리 인상')) { chip('일제히 금리 인상 ▲', 1340, 610, 32, { alpha: E.out(P(t, k('금리 인상'), .4)) }); }
    ctx.restore();
  }
  // C: country markers
  a = vis(t, tC, e, .3, .4);
  if (a > 0) {
    C7.forEach(c => {
      const ti = c.code === 'ZA' ? k('남아프리카') : c.code === 'EU' ? k('유럽') : k(c.ko);
      mapMarker(c.code, t, ti, FULLCAM, c.ko + ' ▲', a * (t > tE ? .5 : 1));
    });
    const kk = P(t, tD, .6);
    if (kk > 0 && t < tE + .5) {
      // connect lines between markers
      const pts = C7.map(c => mapToScreen(...LBL()[c.code], FULLCAM));
      ctx.save(); ctx.globalAlpha *= kk * vis(t, tD, tE + .5, .5, .5);
      for (let i = 0; i < pts.length; i++) { const p1 = pts[i], p2 = pts[(i + 1) % pts.length]; line(p1[0], p1[1], lerp(p1[0], p2[0], E.out(kk)), lerp(p1[1], p2[1], E.out(kk)), C.amber, 2, .7, [8, 8]); }
      ctx.restore();
      chip('약속이라도 한 듯 — 동시 인상', W / 2, 150, 36, { bg: C.amber, color: '#1a1205', alpha: E.out(kk) * vis(t, tD, tE + .5) });
    }
  }
  // D: question
  a = vis(t, tE, e + 1, .4, .3);
  if (a > 0) {
    title('단순한 숫자의 장난?', 470, 110, t, tE + .3, { alpha: a });
    qmark(W / 2 + 560, 470, 160, t, k('보이시나요'));
  }
};

// 1: textbook vs reality
SC[1] = (t, s, e) => {
  const k = w => KW(1, w);
  const tB = k('하지만'), tC = k('이 거대한'), tD = k('지구촌');
  let a = vis(t, s, tC, .5, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    text('교과서 속 긴축 공식', W / 2, 190, 40, { w: 700, color: C.muted, alpha: E.out(P(t, s, .5)) });
    const steps = [['물가 ▲', '물가', C.red], ['기준금리 ▲', '중앙은행', C.amber], ['유동성 ▼', '메마르면서', C.cyan], ['자산시장 진정', '부동산이든', C.green]];
    const broken = P(t, tB, .5);
    steps.forEach((st, i) => {
      const x = 330 + i * 420, ti = k(st[1]);
      const col = broken > 0 ? C.dim : st[2];
      iconCard(x, 470, 330, 240, () => {
        if (i === 0) { tri(0, 0, 40, true, col); }
        if (i === 1) { withT(0, 0, .8, 0, 1, () => I.bank(col)); }
        if (i === 2) { tank(0, 0, 90, 90, lerp(.85, .25, E.io(P(t, ti, 2))), col, 1, t); }
        if (i === 3) { lineChart([[0, .3], [.25, .9], [.5, .6], [.75, .45], [1, .5]], -55, 30, 110, 70, E.out(P(t, ti, 1.2)), col, 5); }
      }, st[0], t, ti, { color: broken > 0 ? C.muted : C.white, iconY: -25 });
      if (i < 3) arrow(x + 175, 470, x + 245, 470, C.muted, 5, E.out(P(t, steps[i + 1] ? k(steps[i + 1][1]) - .3 : 0, .4)));
    });
    if (t > k('교과서')) {
      chip('100년 동안 가르친 공식', W / 2, 680, 32, { bg: '#26324d', alpha: E.out(P(t, k('교과서'), .4)) });
    }
    stamp('평범한 긴축이 아니다', W / 2, 470, 80, t, k('평범한'));
    ctx.restore();
  }
  // C: capital faucet shut
  a = vis(t, tC, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const shut = E.io(P(t, k('틀어막아'), .8));
    // faucet
    ctx.save(); ctx.translate(W / 2 - 120, 330);
    ctx.fillStyle = '#9aa7c2'; rrect(-260, -40, 300, 80, 20); ctx.fill(); rrect(10, -40, 90, 200, 20); ctx.fill();
    ctx.fillStyle = C.red; ctx.save(); ctx.translate(-120, -60); ctx.rotate(shut * Math.PI / 2); rrect(-90, -14, 180, 28, 14); ctx.fill(); ctx.restore();
    circle(-120, -60, 22, C.red);
    ctx.restore();
    const flowW = 70 * (1 - shut);
    if (flowW > 1) {
      ctx.save(); const g = ctx.createLinearGradient(0, 490, 0, 820); g.addColorStop(0, C.cyan); g.addColorStop(1, 'rgba(63,208,255,0)');
      ctx.fillStyle = g; ctx.fillRect(W / 2 - 120 + 55 - flowW / 2, 490, flowW, 330); ctx.restore();
    }
    text('전 세계 자본의 수도꼭지', W / 2 + 330, 330, 54, { w: 900, align: 'left', alpha: E.out(P(t, k('수도꼭지') - .4, .5)) });
    text(shut > .5 ? '7개국 동시 차단' : '', W / 2 + 330, 410, 40, { w: 800, color: C.red, align: 'left', alpha: shut });
    ctx.restore();
  }
  // D: shockwave across map
  a = vis(t, tD, e + 1, .5, .3);
  if (a > 0) {
    const hl = {}; C7.forEach(c => hl[c.code] = { color: C.red, a: .85 });
    drawMap(a, hl, FULLCAM);
    C7.forEach((c, i) => {
      const [x, y] = mapToScreen(...LBL()[c.code], FULLCAM);
      for (let j = 0; j < 3; j++) { const ph = ((t - tD) * .45 + j / 3 + i * .07) % 1; ring(x, y, ph * 380, C.red, 3, a * (1 - ph) * .7); }
    });
    title('거대한 충격파', 170, 84, t, k('충격파') - .3, { color: C.white, alpha: a });
  }
};

// 2: why? bill + title card
SC[2] = (t, s, e) => {
  const k = w => KW(2, w);
  const tB = k('그리고'), tC = k('오늘');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // cliff
    ctx.fillStyle = '#1b2640'; ctx.beginPath(); ctx.moveTo(0, 640); ctx.lineTo(1400, 640); ctx.lineTo(1460, 1080); ctx.lineTo(0, 1080); ctx.fill();
    line(0, 640, 1400, 640, C.line, 3);
    C7.forEach((c, i) => {
      const kk = pop(t, s + .2 + i * .15, .5);
      const x = 420 + i * 140 + E.io(P(t, k('앞다퉈'), 1.2)) * 120;
      withT(x, 580, kk, 0, 1, () => { I.person(i % 2 ? C.white : '#cfd8ea'); });
      text(c.ko, x, 680, 24, { w: 700, color: C.muted, alpha: kk });
      tri(x, 480, 18, true, C.red, E.out(P(t, k('금리를') + i * .08, .3)));
    });
    text('왜?', W / 2 + 560, 360, 220, { w: 900, color: C.amber, alpha: E.out(P(t, s, .5)), shadow: true });
    text('벼랑 끝의 금리 인상', 520, 230, 60, { w: 900, alpha: E.out(P(t, k('벼랑'), .5)) });
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const items = [['지갑', '지갑과', () => { ctx.fillStyle = C.amber; rrect(-55, -35, 110, 75, 12); ctx.fill(); circle(30, 3, 10, C.bg0); }],
      ['일자리', '일자리', () => I.person(C.cyan)], ['세계 시장', '전 세계', () => lineChart([[0, .2], [.3, .7], [.6, .4], [1, .9]], -55, 35, 110, 80, 1, C.green, 6)]];
    items.forEach((it, i) => iconCard(380 + i * 380, 480, 300, 280, it[2], it[0], t, k(it[1])));
    // receipt
    const rk = E.out(P(t, k('청구서') - .3, .9));
    if (rk > 0) {
      const y = lerp(-500, 470, rk);
      withT(1500, y, 1, .06, 1, () => {
        ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.moveTo(-150, -260);
        ctx.lineTo(150, -260); ctx.lineTo(150, 240);
        for (let i = 0; i < 10; i++) { ctx.lineTo(150 - i * 30 - 15, 255); ctx.lineTo(150 - i * 30 - 30, 240); }
        ctx.closePath(); ctx.fill();
        text('청 구 서', 0, -200, 46, { w: 900, color: '#1a1a1a' });
        line(-120, -160, 120, -160, '#1a1a1a', 2, 1, [6, 6]);
        ['지갑', '일자리', '자산'].forEach((r, i) => { text(r, -110, -100 + i * 60, 30, { w: 600, color: '#333', align: 'left' }); text('???', 110, -100 + i * 60, 30, { w: 800, color: C.redD, align: 'right' }); });
        line(-120, 90, 120, 90, '#1a1a1a', 2);
        text('TOTAL', -110, 140, 30, { w: 900, color: '#111', align: 'left' }); text('₩ ∞', 110, 140, 40, { w: 900, color: C.redD, align: 'right' });
      });
    }
    ctx.restore();
  }
  a = vis(t, tC, e + 1, .5, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const kk = E.out(P(t, tC, .8));
    for (let i = 0; i < 18; i++) { const ang = i / 18 * Math.PI * 2 + t * .1; line(W / 2 + Math.cos(ang) * 200, 460 + Math.sin(ang) * 200, W / 2 + Math.cos(ang) * (200 + 500 * kk), 460 + Math.sin(ang) * (200 + 500 * kk), 'rgba(255,59,71,.12)', 3); }
    text('지식의 파노라마', W / 2, 330, 40, { w: 700, color: C.amber, ls: 10, alpha: kk });
    text('금리 전쟁', W / 2, 460, 150, { w: 900, alpha: kk, shadow: true });
    underline(W / 2, 560, 640, t, tC + .3);
    text('숨겨진 이면과 충격의 실체', W / 2, 630, 46, { w: 600, color: C.white, alpha: E.out(P(t, k('숨겨진'), .6)) });
    ctx.restore();
  }
};

// 3: seven wheels stop / capital flows used to rebalance
SC[3] = (t, s, e) => {
  const k = w => KW(3, w);
  const tB = k('보통'), tC = k('그런데');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const tStop = k('멈춰'), t0 = s;
    // angle integral: speed 1.6 until tStop-1.5, then decelerate linearly to 0 by tStop+.6
    const ds = tStop - 1.5, de = tStop + .6;
    const ang = tt => tt < ds ? (tt - t0) * 1.6 : tt < de ? (ds - t0) * 1.6 + 1.6 * ((tt - ds) - (tt - ds) ** 2 / (2 * (de - ds))) : (ds - t0) * 1.6 + 1.6 * (de - ds) / 2;
    const A = ang(t);
    C7.forEach((c, i) => {
      const x = 250 + i * 237, y = 470 + (i % 2 ? 60 : -40), dir = i % 2 ? -1 : 1;
      const kk = pop(t, k('바퀴') - .5 + i * .08, .5);
      const stopped = t > tStop;
      const jit = t > ds && t < de ? (hash(Math.floor(t * 40) + i) - .5) * 4 : 0;
      withT(x + jit, y, kk, 0, 1, () => { I.gear(100, 11, stopped ? '#5a6a8a' : '#c9d4ea', A * dir + i * .3); text(c.code, 0, 2, 30, { w: 900, color: C.bg0 }); });
      text(c.ko, x, y + 135, 26, { w: 700, color: C.muted, alpha: kk });
    });
    title('세계 경제의 7개 바퀴', 170, 62, t, s + .2);
    if (t > tStop) chip('동시 정지', W / 2, 820, 40, { alpha: E.out(P(t, tStop, .4)) });
    ctx.restore();
  }
  a = vis(t, tB, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('평소엔: 한쪽이 조이면, 다른 쪽이 숨통', 170, 50, t, tB);
    const blocked = P(t, tC, .4);
    const pairs = [['미국', '금리 인상', '신흥국', '버팀목', k('미국이')], ['유럽', '숨 고르기', '아시아', '받쳐줌', k('유럽이')]];
    pairs.forEach((p, i) => {
      const y = 380 + i * 250, ta = Math.min(p[4], tB + 2.5 + i * 2);
      const kk = pop(t, ta, .5);
      withT(0, 0, 1, 0, kk > 0 ? 1 : 0, () => {
        panel(300, y - 80, 420, 160, { stroke: C.amber }); text(p[0], 510, y - 20, 52, { w: 900 }); text(p[1], 510, y + 40, 26, { w: 600, color: C.amber });
        panel(1200, y - 80, 420, 160, { stroke: C.cyan }); text(p[2], 1410, y - 20, 52, { w: 900 }); text(p[3], 1410, y + 40, 26, { w: 600, color: C.cyan });
        flow(740, y, 1180, y, 40, t, 14, blocked > 0 ? C.dim : C.green, .45, 1, 7);
        arrow(740, y, 1180, y, blocked > 0 ? C.dim : 'rgba(57,217,138,.5)', 4, E.out(P(t, ta + .3, .6)));
        if (blocked > 0) xmark(960, y - 20, 50, t, tC + i * .2);
      });
    });
    if (blocked > 0) title('이번엔 완전히 달랐다', 860, 64, t, tC + .4, { color: C.red });
    ctx.restore();
  }
};

// 4: world tour of the seven
SC[4] = (t, s, e) => {
  const k = (w, n) => KW(4, w, n);
  const stops = [
    { code: 'NZ', also: 'AU', t: k('남반구'), lbl: '뉴질랜드 · 호주', sub: '남반구', z: 2.2, cx: 'mid' },
    { code: 'EU', t: k('유로존'), lbl: '유럽', sub: '유로존 전체', z: 2.4 },
    { code: 'US', t: k('세계 경제의'), lbl: '미국', sub: '세계 경제의 심장', z: 2.0 },
    { code: 'JP', t: k('수십 년간'), lbl: '일본', sub: '마이너스 금리의 늪', z: 2.6 },
    { code: 'ZA', t: k('아프리카'), lbl: '남아프리카공화국', sub: '아프리카 경제 맹주', z: 2.4 },
    { code: 'NO', t: k('막대한'), lbl: '노르웨이', sub: '오일머니 부국', z: 2.6 },
  ];
  const tEnd = k('동서남북');
  const hl = {};
  let cam = FULLCAM;
  const camOf = st => { if (st.cx === 'mid') { const a = LBL().NZ, b = LBL().AU; return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: st.z }; } return camOn(st.code, st.z); };
  for (let i = 0; i < stops.length; i++) {
    const st = stops[i];
    if (t >= st.t - .6) { cam = camLerp(i ? camOf(stops[i - 1]) : FULLCAM, camOf(st), E.io(P(t, st.t - .6, 1.0))); }
  }
  if (t > tEnd - .4) cam = camLerp(camOf(stops[stops.length - 1]), FULLCAM, E.io(P(t, tEnd - .4, 1.2)));
  stops.forEach(st => { hl[st.code] = { color: C.red, a: .9 * E.out(P(t, st.t - .2, .5)) }; if (st.also) hl[st.also] = hl[st.code]; });
  const a = vis(t, s, e + 1, .4, .3);
  drawMap(a, hl, cam);
  stops.forEach((st, i) => {
    const active = t >= st.t - .2 && (i === stops.length - 1 ? t < tEnd : t < stops[i + 1].t - .3);
    const la = active ? 1 : (t > tEnd ? .9 : 0);
    if (la <= 0) return;
    const codes = st.also ? [st.code, st.also] : [st.code];
    codes.forEach(cd => {
      const [x, y] = mapToScreen(...LBL()[cd], cam);
      for (let j = 0; j < 2; j++) { const ph = ((t - st.t) * .8 + j * .5) % 1; ring(x, y, 10 + ph * 80, C.red, 3, (1 - ph) * a); }
      circle(x, y, 10, C.red, a);
      if (t > tEnd) chip(cd === 'EU' ? '유럽' : C7.find(c => c.code === cd).ko + ' ▲', x, y - 50, 24, { alpha: a * E.out(P(t, tEnd + .6, .4)) });
    });
    if (active) {
      // lower-third info panel
      const kk = E.out(P(t, st.t - .2, .5));
      panel(110, 640 - 20 * (1 - kk), 640, 170, { alpha: kk * a, stroke: C.red });
      text(st.sub, 150, 690, 30, { w: 700, color: C.amber, align: 'left', alpha: kk * a });
      text(st.lbl, 150, 760, 62, { w: 900, align: 'left', alpha: kk * a });
      chip('금리 인상 ▲', 620, 760, 26, { alpha: kk * a });
    }
  });
  if (t > tEnd) {
    title('동서남북 · 핵심 7개 축 · 단 4주', 150, 60, t, tEnd + .5, { alpha: a });
  }
};

// 5: liquidity drought / panic
SC[5] = (t, s, e) => {
  const k = w => KW(5, w);
  const tB = k('금리가 오른다'), tC = k('그런데');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const lvl = lerp(.9, .08, E.io(P(t, k('대탈출') - .5, 3)));
    tank(620, 470, 380, 460, lvl, 'rgba(63,208,255,.75)', 1, t);
    text('글로벌 유동성', 620, 200, 40, { w: 800, color: C.cyan });
    text(`${Math.round(lvl * 100)}%`, 620, 470, 90, { w: 900, alpha: .9 });
    // cracks on ground
    const ck = E.out(P(t, k('가뭄'), 1));
    if (ck > 0) {
      ctx.save(); ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 4; ctx.globalAlpha *= ck;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); let x = 1060 + i * 80, y = 760; ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (hash(i * 7 + j) - .5) * 70; y -= 40 * ck; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.restore();
    }
    title('유동성 대탈출', 1380, 360, 90, t, k('대탈출') - .2, { color: C.white });
    title('자본의 가뭄', 1380, 500, 90, t, k('가뭄') - .2, { color: C.amber });
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    text('금리', 560, 470, 130, { w: 900, color: C.red, alpha: E.out(P(t, tB, .5)) });
    text('=', 860, 470, 130, { w: 900, color: C.muted, alpha: E.out(P(t, k('돈의 가격') - .3, .5)) });
    title('돈의 가격', 1250, 470, 130, t, k('돈의 가격'), { color: C.amber });
    title('돈을 빌리는 비용 ▲', W / 2, 680, 52, t, k('빌리는'), { color: C.white });
    ctx.restore();
  }
  a = vis(t, tC, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // 7 price tags rising
    C7.forEach((c, i) => {
      const x = 260 + i * 160, rise = E.out(P(t, k('돈값') - .3 + i * .1, .7));
      withT(x, 560 - rise * 120, pop(t, tC + i * .08, .4), 0, 1, () => {
        ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(-50, -30); ctx.lineTo(30, -30); ctx.lineTo(55, 0); ctx.lineTo(30, 30); ctx.lineTo(-50, 30); ctx.closePath(); ctx.fill();
        circle(32, 0, 7, C.bg0); text(c.code, -12, 2, 26, { w: 900, color: '#241500' });
        tri(0, -70, 18, true, C.red, rise);
      });
    });
    text('7개국 동시 "돈값" 인상', 740, 270, 48, { w: 900, alpha: E.out(P(t, k('돈값'), .5)) });
    // panic gauge
    const g = E.io(P(t, k('스탈린그라드'), 3.5));
    const cx = 1550, cy = 600, R = 220;
    ctx.save(); ctx.lineWidth = 34; ctx.lineCap = 'butt';
    const segs = [C.green, C.amber, C.red];
    segs.forEach((col, i) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI + i * Math.PI / 3 + .02, Math.PI + (i + 1) * Math.PI / 3 - .02); ctx.stroke(); });
    ctx.restore();
    const na = Math.PI + lerp(.3, 2.95, g) + (g > .9 ? Math.sin(t * 30) * .03 : 0);
    line(cx, cy, cx + Math.cos(na) * (R - 30), cy + Math.sin(na) * (R - 30), C.white, 8);
    circle(cx, cy, 18, C.white);
    text('시장 공포 지수', cx, cy + 70, 32, { w: 700, color: C.muted });
    if (g > .85) text('PANIC', cx, cy - 90, 64, { w: 900, color: C.red, alpha: .6 + .4 * Math.sin(t * 10) });
    ctx.restore();
  }
};

// 6: the real shocks
SC[6] = (t, s, e) => {
  const k = w => KW(6, w);
  const a = vis(t, s, e + 1, .4, .3);
  ctx.save(); ctx.globalAlpha *= a;
  title('진짜 파괴적인 충격은?', W / 2, 220, 76, t, s + .1);
  const cards = [['01', '통화 붕괴', '환율 전쟁'], ['02', '자산 폭락', '부동산·실물'], ['03', '기업 도산', '일자리 증발']];
  cards.forEach((c, i) => {
    const x = 460 + i * 500, kk = pop(t, k('진짜') + .4 + i * .5, .6);
    withT(x, 520, kk, 0, 1, () => {
      panel(-200, -150, 400, 300, { stroke: C.red, glow: 'rgba(255,59,71,.25)' });
      text(c[0], 0, -80, 64, { w: 900, color: C.red });
      text(c[1], 0, 10, 54, { w: 900 }); text(c[2], 0, 80, 28, { w: 600, color: C.muted });
    });
  });
  if (t > k('본 게임')) stamp('이제부터 본 게임', W / 2, 800, 50, t, k('본 게임'), C.amber, -.04);
  ctx.restore();
};

// 7: currency war
SC[7] = (t, s, e) => {
  const k = w => KW(7, w);
  const tB = k('금리가 올라가면'), tC = k('하지만'), tD = k('다른 나라들');
  chapterCard('SHOCK 01', '통화 붕괴와 환율 전쟁', '첫 번째 충격', t, s, tB);
  let a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // magnet pulling coins
    withT(1350, 480, pop(t, tB, .5), 0, 1, () => {
      ctx.lineWidth = 60; ctx.strokeStyle = C.red; ctx.beginPath(); ctx.arc(0, 0, 110, Math.PI / 2, Math.PI * 1.5); ctx.stroke();
      ctx.fillStyle = '#c9d2e3'; ctx.fillRect(-10, -140, 80, 60); ctx.fillRect(-10, 80, 80, 60);
      text('고금리 통화', 30, 230, 34, { w: 800, color: C.amber });
    });
    for (let i = 0; i < 16; i++) {
      const u = ((t - tB) * .35 + i / 16) % 1; const y0 = 250 + hash(i) * 460;
      const x = lerp(250, 1180, E.in(u)), y = lerp(y0, 480, E.in(u));
      withT(x, y, .45, 0, Math.sin(u * Math.PI), () => I.coin(C.amber, '$'));
    }
    title('자본이 빨려 들어간다', 560, 180, 56, t, k('빨려'));
    ctx.restore();
  }
  a = vis(t, tC, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    axes(260, 800, 1400, 560, 1, '', '');
    const up = E.out(P(t, k('무지막지'), 1.4)), dn = E.out(P(t, k('벌어질'), 1.4));
    const bars = [['미국', C.red, 120 + up * 360, '금리 ▲'], ['유럽', C.red, 110 + up * 330, '금리 ▲'],
      ['엔화', C.cyan, 320 - dn * 220, '가치 ▼'], ['신흥국 통화', C.cyan, 300 - dn * 210, '가치 ▼'], ['랜드화', C.cyan, 290 - dn * 200, '가치 ▼']];
    bars.forEach((b, i) => bar(420 + i * 260, 800, 150, b[2] * pop(t, tC + i * .1, .5), b[1], b[0], b[3], 1, 30));
    title('거인들의 금리 폭주', 760, 150, 56, t, tC + .2);
    note('※ 개념 이해를 위한 예시 그래픽', 1);
    ctx.restore();
  }
  a = vis(t, tD, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const cr = E.io(P(t, k('휴지'), 1.2));
    withT(W / 2, 480, 1 - cr * .35, cr * .6, 1, () => {
      ctx.fillStyle = cr > .3 ? '#8b8f84' : '#5f9e6e'; ctx.save(); ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const ang = i / 24 * Math.PI * 2; const r = 1 + cr * (hash(i) - .5) * .5; ctx.lineTo(Math.cos(ang) * 420 * r * (Math.abs(Math.cos(ang)) > .7 ? 1 : 1), Math.sin(ang) * 200 * r); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 4; ctx.strokeRect(-330, -140, 660, 280); ctx.restore();
      text('자국 화폐', 0, -20, 70, { w: 900, color: 'rgba(0,0,0,.6)' });
      text('VALUE ▼▼▼', 0, 60, 40, { w: 900, color: 'rgba(0,0,0,.5)' });
    });
    title('휴지 조각이 되는 화폐', W / 2, 820, 60, t, k('휴지'), { color: C.red });
    ctx.restore();
  }
};

// 8: Japan
SC[8] = (t, s, e) => {
  const k = (w, n) => KW(8, w, n);
  const tB = k('일본은 지난'), tC = k('왜냐하면'), tD = k('하지만'), tE = k('수입');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const kk = E.out(P(t, s, .8));
    circle(W / 2, 450, 190 * kk, '#e8364a');
    text('대표적 희생양', W / 2, 720, 40, { w: 700, color: C.muted, alpha: kk });
    text('일본', W / 2, 800, 90, { w: 900, alpha: kk });
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const x0 = 300, y0 = 520, w = 1300, h = 260;
    line(x0, y0, x0 + w, y0, C.muted, 2, 1, [10, 10]); text('0%', x0 - 20, y0, 26, { w: 700, color: C.muted, align: 'right' });
    axes(x0, y0 + 220, w, h + 220, .6);
    lineChart([[0, .55], [.15, .25], [.3, .05], [.5, .02], [.65, 0], [.75, -.15], [1, -.15]], x0, y0, w, h, E.io(P(t, tB + .3, k('마이너스') - tB + .4)), C.cyan, 7);
    text('일본 기준금리 (개념도)', x0, 200, 34, { w: 700, color: C.cyan, align: 'left' });
    if (t > k('제로')) chip('제로 금리', x0 + w * .5, y0 - 50, 28, { bg: '#1d4a66', alpha: E.out(P(t, k('제로'), .4)) });
    if (t > k('마이너스')) chip('마이너스 금리', x0 + w * .87, y0 + 90, 28, { bg: C.redD, alpha: E.out(P(t, k('마이너스'), .4)) });
    text('수십 년', x0 + w * .5, 760, 40, { w: 900, color: C.white, alpha: E.out(P(t, k('수십 년'), .5)) });
    ctx.restore();
  }
  a = vis(t, tC, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const dk = E.out(P(t, k('국가 부채'), 1));
    // debt tower of blocks
    for (let i = 0; i < 12; i++) { const bk = clamp(dk * 12 - i); if (bk <= 0) break; panel(380, 800 - (i + 1) * 50, 300, 44, { r: 6, fill: i % 2 ? '#7a1d27' : '#9b2430', stroke: null, alpha: bk }); }
    text('국가 부채', 530, 150, 44, { w: 900, color: C.red, alpha: dk });
    // rate tick → interest explodes
    const rk = P(t, k('찔끔'), .5);
    text(rk > 0 ? '금리 +0.1%p' : '', 1000, 320, 44, { w: 900, color: C.amber, alpha: rk });
    arrow(860, 500, 1060, 500, C.muted, 6, E.out(P(t, k('찔끔') + .3, .4)));
    const ik = E.out(P(t, k('천문학'), 1.2));
    circle(1400, 500, 60 + ik * 230, 'rgba(255,59,71,.25)', ik);
    circle(1400, 500, 40 + ik * 150, C.red, ik);
    text('이자 부담', 1400, 500, 46 + ik * 20, { w: 900, alpha: ik });
    ctx.restore();
  }
  a = vis(t, tD, tE, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // ground and basement
    ctx.fillStyle = '#121a2c'; ctx.fillRect(0, 600, W, 480); line(0, 600, W, 600, C.muted, 3);
    text('지상', 140, 570, 26, { w: 700, color: C.muted, align: 'left' }); text('지하실', 140, 650, 26, { w: 700, color: C.red, align: 'left' });
    const p = lineChart([[0, .9], [.2, .8], [.4, .65], [.55, .45], [.7, .2], [.85, -.2], [1, -.55]], 260, 600, 1400, 400, E.io(P(t, k('엔화') - .2, 2.6)), C.red, 9);
    if (p) { withT(p[0], p[1], .7, 0, 1, () => I.coin('#d9d9d9', '¥')); }
    text('엔화 가치', 260, 160, 54, { w: 900, color: C.white, align: 'left', alpha: E.out(P(t, k('엔화'), .4)) });
    title('지하실로 추락', 1450, 180, 60, t, k('지하실'), { color: C.red });
    note('※ 개념 이해를 위한 예시 그래픽');
    ctx.restore();
  }
  a = vis(t, tE, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ['수입 물가 ▲', '생활고 ▲'].forEach((str, i) => chip(str, 420, 330 + i * 120, 40, { bg: i ? C.redD : C.red, alpha: E.out(P(t, (i ? k('삶이') : tE), .4)) }));
    const fk = pop(t, k('백기'), .6);
    withT(1100, 480, fk * 2.2, 0, 1, () => I.flag('#ffffff', t * 6));
    text('일본은행 BOJ', 1100, 230, 44, { w: 900, alpha: fk });
    const rk = E.out(P(t, k('합류'), .6));
    if (rk > 0) { chip('금리 인상 대열 합류 ▲', 1100, 790, 40, { alpha: rk }); }
    ctx.restore();
  }
};

// 9: South Africa
SC[9] = (t, s, e) => {
  const k = w => KW(9, w);
  const tB = k('외국인'), tC = k('자본 유출');
  const camZA = camOn('ZA', 2.2), camW = { x: 900, y: 520, z: 1.25 };
  const cam = camLerp(camZA, camW, E.io(P(t, tB - .5, 1.4)));
  const a = vis(t, s, e + 1, .4, .3);
  drawMap(a, { ZA: { color: C.red, a: .9 }, US: { color: C.cyan, a: .7 * E.out(P(t, tB, .6)) }, EU: { color: C.cyan, a: .7 * E.out(P(t, tB, .6)) } }, cam);
  ctx.save(); ctx.globalAlpha *= a;
  const [zx, zy] = mapToScreen(...LBL().ZA, cam);
  if (t < tB) {
    panel(110, 160, 720, 200, { stroke: C.red, alpha: E.out(P(t, s, .5)) });
    text('남아프리카공화국', 150, 225, 58, { w: 900, align: 'left', alpha: E.out(P(t, s, .5)) });
    text('신흥국에게 선진국 금리 인상 = ', 150, 305, 30, { w: 600, color: C.muted, align: 'left', alpha: E.out(P(t, k('신흥국'), .5)) });
    stamp('사형 선고', 640, 305, 40, t, k('사형'), C.red, -.05);
  } else {
    const [ux, uy] = mapToScreen(...LBL().US, cam), [ex, ey] = mapToScreen(...LBL().EU, cam);
    flow(zx, zy, ux, uy, 260, t, 26, C.amber, .45, E.out(P(t, tB, .5)), 7);
    flow(zx, zy, ex, ey, 140, t + .3, 22, C.amber, .55, E.out(P(t, tB, .5)), 7);
    curveArrow(zx, zy, ux, uy, 260, 'rgba(255,181,71,.35)', 3, E.out(P(t, tB, 1)));
    curveArrow(zx, zy, ex, ey, 140, 'rgba(255,181,71,.35)', 3, E.out(P(t, tB, 1)));
    chip('고금리 국채로 도망', (zx + ux) / 2, Math.min(zy, uy) - 220, 30, { bg: C.amber, color: '#201300', alpha: E.out(P(t, k('국채'), .5)) });
    const out = E.out(P(t, tC, 2));
    if (out > 0) {
      panel(110, 140, 600, 180, { stroke: C.red, alpha: out });
      text('자본 유출', 150, 200, 40, { w: 800, color: C.muted, align: 'left', alpha: out });
      text(`-${counter(0, 100, t, tC, 2)}%`, 150, 268, 64, { w: 900, color: C.red, align: 'left', alpha: out });
      text('→ 국가 부도 위험', 420, 268, 34, { w: 800, align: 'left', alpha: E.out(P(t, k('부도'), .4)) });
    }
    if (t > k('피눈물')) {
      chip('억지 금리 인상 ▲', zx, zy + 90, 34, { alpha: E.out(P(t, k('억지로'), .4)) });
    }
  }
  circle(zx, zy, 10, C.red);
  ctx.restore();
};

// 10: real estate — AU/NZ
SC[10] = (t, s, e) => {
  const k = w => KW(10, w);
  const tB = k('호주와'), tC = k('이 두'), tD = k('서울');
  chapterCard('SHOCK 02', '부동산·실물자산 대폭락', '두 번째 충격', t, s, tB);
  let a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    const cam = camLerp(FULLCAM, { x: 1700, y: 790, z: 2.6 }, E.io(P(t, tB - .2, 1.2)));
    drawMap(a, { AU: { color: C.red, a: .9 }, NZ: { color: C.red, a: .9 } }, cam);
    title('호주 · 뉴질랜드', W / 2, 160, 70, t, tB + .3, { alpha: a });
  }
  a = vis(t, tC, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('가계부채 비율 · 부동산 거품', W / 2, 170, 54, t, tC);
    axes(330, 780, 1260, 520, 1);
    const vals = [['호주', .92, C.red], ['뉴질랜드', .85, C.red], ['A국', .55, C.dim], ['B국', .48, C.dim], ['C국', .40, C.dim], ['D국', .33, C.dim]];
    vals.forEach((v, i) => bar(450 + i * 200, 780, 130, v[1] * 480 * E.out(P(t, tC + .3 + i * .1, .9)), v[2], v[0], i < 2 ? '최상위권' : '', 1, 30));
    note('※ 상대 비교 개념도 (수치 아님)');
    ctx.restore();
  }
  a = vis(t, tD, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const hit = k('해머');
    // houses skyline
    for (let i = 0; i < 7; i++) {
      const x = 380 + i * 190, sz = .9 + hash(i) * .5, y = 640;
      const sh = t > hit ? Math.max(0, 1 - (t - hit) * 2) * Math.sin((t - hit) * 60) * 8 : 0;
      const fall = t > hit ? E.in(P(t, hit + .1 + hash(i + 2) * .3, .8)) : 0;
      withT(x + sh, y + fall * 60, sz * 1.3, fall * (hash(i) - .5) * .5, 1 - fall * .4, () => I.house(fall > .1 ? '#c86b6b' : '#e9edf5', 6));
    }
    line(240, 720, 1680, 720, C.muted, 3);
    text('시드니', 560, 790, 36, { w: 800, color: C.muted }); text('오클랜드', 1360, 790, 36, { w: 800, color: C.muted });
    // hammer
    const hk = P(t, hit - .6, .6);
    if (hk > 0) {
      const ang = lerp(-1.2, .35, E.in(hk));
      withT(1080, 150, 1, ang, 1, () => {
        ctx.fillStyle = '#8a5a35'; ctx.fillRect(-14, 0, 28, 330); ctx.fillStyle = '#aab3c5'; rrect(-110, 300, 220, 110, 14); ctx.fill();
        text('금리 인상', 0, 355, 40, { w: 900, color: C.bg0 });
      });
    }
    if (t > hit) { for (let i = 0; i < 3; i++) { const ph = clamp((t - hit) * 1.2 - i * .15); ring(960, 620, ph * 600, C.red, 6, 1 - ph); } }
    title('폭등했던 집값에 거대한 해머', W / 2, 140, 54, t, tD + .2);
    ctx.restore();
  }
};

// 11: mortgage pain
SC[11] = (t, s, e) => {
  const k = w => KW(11, w);
  const tB = k('한 달'), tC = k('월급의'), tD = k('집을');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    iconCard(620, 480, 420, 420, () => withT(0, 0, 1.4, 0, 1, () => I.doc('#e9edf5')), '주택담보대출', t, s + .2, { iconY: -40 });
    title('대부분 변동금리', 1280, 420, 76, t, k('변동금리'), { color: C.amber });
    text('금리 오르면 이자도 바로 오른다', 1280, 520, 34, { w: 600, color: C.muted, alpha: E.out(P(t, k('변동금리') + .6, .5)) });
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('매달 갚아야 하는 이자', W / 2, 170, 58, t, tB);
    axes(420, 800, 1080, 540, 1);
    const xs = [['이전', 1, s], ['2배', 2, k('2배')], ['3배', 3, k('3배')]];
    xs.forEach((x, i) => bar(620 + i * 340, 800, 200, x[1] * 160 * E.out(P(t, x[2] - .2, .8)), i ? C.red : C.cyan, x[0], `×${x[1]}`, E.out(P(t, i ? x[2] - .3 : tB, .4)), 34));
    ctx.restore();
  }
  a = vis(t, tC, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const pk = E.io(P(t, tC + .3, 1.5));
    const cx = 700, cy = 500, R = 230;
    circle(cx, cy, R, '#24314d');
    ctx.save(); ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .58 * pk); ctx.closePath(); ctx.fill(); ctx.restore();
    circle(cx, cy, R * .55, C.bg1);
    text(`${Math.round(58 * pk)}%+`, cx, cy, 70, { w: 900 });
    text('월급', cx, cy - R - 40, 36, { w: 800, color: C.muted });
    title('월급의 절반 이상이 은행 이자로', 1340, 440, 52, t, tC + .4);
    title('지옥이 펼쳐졌다', 1340, 540, 70, t, k('지옥'), { color: C.red });
    note('※ 개념 이해를 위한 예시 그래픽');
    ctx.restore();
  }
  a = vis(t, tD, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    axes(300, 780, 1320, 520, 1, '시간', '집값');
    lineChart([[0, .6], [.2, .8], [.35, .95], [.5, .8], [.65, .55], [.8, .35], [1, .12]], 300, 780, 1320, 520, E.io(P(t, tD, 3.5)), C.red, 8);
    ['급매', '급매', '급매', '급매', '급매'].forEach((g, i) => {
      const ti = k('급매물') + i * .25; const kk = pop(t, ti, .4);
      withT(780 + i * 170, 330 + (i % 2) * 90, kk, -.08 + i * .04, 1, () => { panel(-70, -34, 140, 68, { fill: C.amber, stroke: null, r: 8 }); text(g, 0, 2, 34, { w: 900, color: '#201300' }); });
    });
    title('사려는 사람은 씨가 말랐다', W / 2, 160, 54, t, tD + .2);
    note('※ 개념 이해를 위한 예시 그래픽');
    ctx.restore();
  }
};

// 12: SHOCK 03 — European firms (narration for intro was dropped by TTS; visuals carry the chapter)
SC[12] = (t, s, e) => {
  const k = w => KW(12, w);
  const tB = k('유럽 기업들은'), tC = k('그런데');
  // chapter card plays during the first part of this scene (the narration jumps straight to "유럽 기업들은")
  chapterCard('SHOCK 03', '기업 연쇄 도산 · 일자리 증발', '세 번째 충격', t, s - .2, tB + 1.6);
  let a = vis(t, tB + 1.6, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    axes(300, 780, 900, 480, 1, '', '에너지 비용');
    lineChart([[0, .15], [.3, .2], [.45, .25], [.55, .8], [.7, .95], [.85, .85], [1, .9]], 300, 780, 900, 480, E.io(P(t, k('에너지') - .5, 1.8)), C.amber, 8);
    text('우크라이나 전쟁', 300 + 900 * .5, 820, 26, { w: 700, color: C.muted, alpha: E.out(P(t, k('우크라이나'), .5)) });
    line(300 + 900 * .5, 300, 300 + 900 * .5, 780, C.muted, 2, .5, [8, 8]);
    withT(1500, 480, pop(t, k('에너지'), .5) * 1.6, 0, 1, () => {
      ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(10, -80); ctx.lineTo(-40, 10); ctx.lineTo(0, 10); ctx.lineTo(-15, 80); ctx.lineTo(45, -15); ctx.lineTo(5, -15); ctx.closePath(); ctx.fill();
    });
    text('뼈를 깎는 고통', 1500, 700, 46, { w: 900, color: C.red, alpha: E.out(P(t, k('뼈를'), .5)) });
    ctx.restore();
  }
  a = vis(t, tC, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const hit = k('쐐기');
    const crack = E.out(P(t, hit, .6));
    withT(W / 2, 560, 2.6, 0, 1, () => I.factory(crack > 0 ? '#c9d2e3' : '#e9edf5'));
    if (crack > 0) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(W / 2, 420); let x = W / 2, y = 420; for (let i = 0; i < 6; i++) { x += (i % 2 ? 30 : -30); y += 45 * crack; ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
    const wk = E.in(P(t, hit - .5, .5));
    withT(W / 2, lerp(-100, 380, wk), 1, 0, 1, () => { ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(-70, -120); ctx.lineTo(70, -120); ctx.lineTo(0, 60); ctx.closePath(); ctx.fill(); text('추가 인상', 0, -70, 26, { w: 900 }); });
    title('4주 만의 추가 금리 인상 = 쐐기', W / 2, 170, 58, t, tC + .2);
    ctx.restore();
  }
};

// 13: credit crunch, dominoes, jobs
SC[13] = (t, s, e) => {
  const k = w => KW(13, w);
  const tB = k('은행들이'), tC = k('기업이'), tD = k('청년들');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    iconCard(640, 480, 460, 420, () => withT(0, 0, 1.5, 0, 1, () => I.doc('#e9edf5')), '만기 대출 연장', t, s + .2, { iconY: -40, sub: '신청서' });
    stamp('불가', 640, 440, 90, t, k('불가능'));
    title('사업 확장은커녕', 1350, 380, 60, t, s + .4, { color: C.muted });
    title('생존 자체가 위협', 1350, 480, 70, t, k('당장'), { color: C.white });
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const labels = ['제조', '물류', '제조', '물류', '부품', '유통', '건설', '서비스'];
    const t0 = k('줄줄이');
    labels.forEach((l, i) => {
      const fk = E.in(P(t, t0 + i * .22, .45));
      const x = 330 + i * 170;
      ctx.save(); ctx.translate(x + 30, 760); ctx.rotate(fk * 1.25); ctx.fillStyle = fk > .5 ? C.redD : '#d7deeb'; rrect(-30, -260, 60, 260, 8); ctx.fill(); ctx.restore();
      text(l, x, 810, 26, { w: 700, color: C.muted });
    });
    line(260, 760, 1700, 760, C.muted, 3);
    title('은행 문턱 ▲ · 대출 심사 강화', W / 2, 180, 52, t, tB);
    title('흑자 도산 도미노', W / 2, 290, 74, t, k('흑자'), { color: C.red });
    ctx.restore();
  }
  a = vis(t, tC, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    qmark(W / 2, 330, 140, t, tC);
    const fr = E.out(P(t, k('동결'), .6));
    // snowflake
    withT(620, 560, fr * 1.2, t * .2, 1, () => { for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); line(0, 0, 0, -90, C.cyan, 10); line(0, -55, -22, -75, C.cyan, 7); line(0, -55, 22, -75, C.cyan, 7); } });
    text('고용 동결', 620, 730, 56, { w: 900, alpha: fr });
    const rs = E.out(P(t, k('구조조정'), .6));
    withT(1300, 560, rs, 0, 1, () => { for (let i = 0; i < 5; i++) withT(-160 + i * 80, 0, .9, 0, i % 2 ? .3 : 1, () => I.person(i % 2 ? C.dim : C.white)); });
    text('구조조정', 1300, 730, 56, { w: 900, color: C.red, alpha: rs });
    ctx.restore();
  }
  a = vis(t, tD, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const tk = E.io(P(t, k('터널') - 1.5, 3));
    for (let i = 14; i >= 0; i--) {
      const r = (i / 14) * (700 + tk * 300) + 30; const sh = 1 - i / 14;
      ctx.save(); ctx.beginPath(); ctx.ellipse(W / 2, 470, r * 1.3, r * .75, 0, 0, Math.PI * 2); ctx.fillStyle = `rgba(${10 + i * 3},${14 + i * 4},${26 + i * 6},1)`; ctx.fill(); ctx.restore();
    }
    for (let i = 0; i < 6; i++) { const fd = E.out(P(t, tD + i * .2, .8)); withT(560 + i * 160, 520 + fd * 30, .8, 0, 1 - fd * .8, () => I.person(C.white)); }
    title('청년 일자리 · 소비 실종', W / 2, 200, 54, t, tD + .2);
    title('성장 엔진 OFF — 암흑의 터널', W / 2, 760, 58, t, k('엔진'), { color: C.red });
    ctx.restore();
  }
};

// 14: the sharp question
SC[14] = (t, s, e) => {
  const k = w => KW(14, w);
  const tB = k('도대체'), tC = k('정말');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) { ctx.save(); ctx.globalAlpha *= a; qmark(W / 2, 430, 360, t, s + .2); title('날카로운 질문 하나', W / 2, 760, 60, t, k('날카로운')); ctx.restore(); }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    C7.forEach((c, i) => { const x = 260 + i * 233; withT(x, 360, pop(t, k('중앙은행') - .6 + i * .07, .5) * .9, 0, 1, () => I.bank('#d7deeb')); text(c.code, x, 450, 26, { w: 800, color: C.muted, alpha: E.out(P(t, k('중앙은행'), .5)) }); });
    text('비명을 지르는 경제', W / 2, 190, 46, { w: 800, color: C.red, alpha: E.out(P(t, k('비명'), .5)) });
    // pedal
    const pk = (Math.sin((t - k('페달')) * 5) * .5 + .5) * E.out(P(t, k('페달'), .4));
    withT(W / 2, 680, 1, 0, E.out(P(t, k('페달') - .3, .4)), () => {
      ctx.save(); ctx.rotate(-.35 + pk * .3); ctx.fillStyle = '#aab3c5'; rrect(-140, -30, 280, 60, 14); ctx.fill(); ctx.restore();
      text('금리 인상 페달', 0, 110, 40, { w: 900, color: C.amber });
    });
    ctx.restore();
  }
  a = vis(t, tC, e + 1, .4, .3);
  if (a > 0) { ctx.save(); ctx.globalAlpha *= a; text('공식 설명', W / 2, 330, 40, { w: 600, color: C.muted, alpha: E.out(P(t, tC, .5)) }); title('“단순한 물가 불안 때문”', W / 2, 460, 90, t, k('물가')); qmark(W / 2 + 720, 450, 140, t, k('때문일까요')); ctx.restore(); }
};

// 15: the curtain — price-insensitive monsters
SC[15] = (t, s, e) => {
  const k = w => KW(15, w);
  const a = vis(t, s, e + 1, .4, .3);
  ctx.save(); ctx.globalAlpha *= a;
  const open = E.io(P(t, k('장막') + .3, 1.6));
  // monsters behind
  const rev = open;
  [[700, '빅테크'], [1220, '정부']].forEach(([x, l], i) => {
    ctx.save(); ctx.globalAlpha *= rev;
    ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.ellipse(x, 560, 230, 300, 0, Math.PI, 0); ctx.lineTo(x + 230, 860); ctx.lineTo(x - 230, 860); ctx.fill();
    const blink = (Math.sin(t * 2 + i) > .97) ? .1 : 1;
    ctx.save(); ctx.shadowColor = C.red; ctx.shadowBlur = 30; ctx.fillStyle = C.red;
    ctx.beginPath(); ctx.ellipse(x - 70, 440, 30, 16 * blink, -.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 70, 440, 30, 16 * blink, .2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    text(l, x, 640, 52, { w: 900, color: C.white, alpha: E.out(P(t, k('괴물'), .5)) });
    ctx.restore();
  });
  // curtains
  ctx.save();
  for (const side of [-1, 1]) {
    const cw = W / 2 * (1 - open * .85);
    const x0 = side < 0 ? 0 : W - cw;
    const g = ctx.createLinearGradient(x0, 0, x0 + cw, 0); g.addColorStop(0, '#5a0d14'); g.addColorStop(.5, '#8f1420'); g.addColorStop(1, '#5a0d14');
    ctx.fillStyle = g; ctx.fillRect(x0, 0, cw, H);
    for (let i = 1; i < 8; i++) line(x0 + cw * i / 8, 0, x0 + cw * i / 8, H, 'rgba(0,0,0,.25)', 4);
  }
  ctx.restore();
  if (open < .3) title('장막 뒤의 진실', W / 2, 470, 100, t, s + .2, { alpha: 1 - open * 3 });
  if (t > k('인플레이션')) {
    const ik = E.out(P(t, k('인플레이션'), .5));
    chip('인플레이션 기대 심리', W / 2, 160, 40, { bg: '#26324d', alpha: ik });
    if (t > k('아니라')) { line(W / 2 - 260, 160, lerp(W / 2 - 260, W / 2 + 260, E.out(P(t, k('아니라'), .4))), 160, C.red, 8); }
  }
  title('가격 따위 신경 쓰지 않는 괴물들', W / 2, 270, 56, t, k('가격'), { color: C.amber });
  ctx.restore();
};

// 16: Monster 1 — Big Tech AI infra
SC[16] = (t, s, e) => {
  const k = w => KW(16, w);
  const tB = k('마이크로소프트'), tC = k('이들은'), tD = k('지구 전체');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) chapterCard('MONSTER 01', '빅테크 AI 인프라 전쟁', '첫 번째 괴물', t, s, tB);
  a = vis(t, tB, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const names = [['MICROSOFT', '마이크로소프트'], ['GOOGLE', '구글'], ['AMAZON', '아마존'], ['META', '메타']];
    names.forEach((n, i) => {
      const x = 330 + i * 420, kk = pop(t, k(n[1]) - .2, .5);
      withT(x, 440, kk, 0, 1, () => { panel(-180, -120, 360, 240, { stroke: C.cyan, glow: 'rgba(63,208,255,.2)' }); text(n[0], 0, -20, 44, { w: 900, color: C.white }); text(n[1], 0, 50, 28, { w: 600, color: C.muted }); });
    });
    title('공룡들', W / 2, 190, 64, t, k('공룡'), { color: C.cyan });
    if (t > tC) stamp('단순한 소프트웨어가 아니다', W / 2, 740, 50, t, tC + .3, C.amber, -.03);
    ctx.restore();
  }
  a = vis(t, tD, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // GPU grid
    const gk = P(t, k('GPU') - 1, 2.5);
    const n = Math.floor(gk * 40);
    for (let i = 0; i < 40; i++) { if (i >= n) break; const cx = 160 + (i % 8) * 95, cy = 260 + Math.floor(i / 8) * 95; withT(cx, cy, .75, 0, 1, () => I.chip(C.cyan)); }
    text(`GPU ×${counter(0, 300000, t, k('수십만'), 2.5).toLocaleString()}`, 540, 800, 46, { w: 900, color: C.cyan, alpha: E.out(P(t, k('수십만'), .4)) });
    // data center
    const dk = E.out(P(t, k('축구장'), 1.2));
    for (let i = 0; i < 4; i++) { const h = 240 * clamp(dk * 4 - i); panel(1060 + i * 75, 640 - h, 64, h, { r: 6, fill: '#1c2a46', stroke: C.cyan, alpha: h > 0 ? 1 : 0 }); for (let j = 0; j < Math.floor(h / 30); j++) circle(1078 + i * 75, 630 - j * 30, 4, hash(i * 9 + j + Math.floor(t * 4)) > .5 ? C.green : C.cyan); }
    text('데이터센터', 1180, 700, 34, { w: 800, alpha: dk });
    const nk = pop(t, k('원자력'), .6);
    withT(1580, 520, nk * 1.6, 0, 1, () => { I.tower('#cfd8ea'); ctx.translate(70, 10); ctx.scale(.75, .75); I.tower('#aab6cc'); });
    for (let i = 0; i < 4; i++) { const ph = (t * .4 + i * .25) % 1; circle(1580 + Math.sin(i + t) * 10, 410 - ph * 120, 20 + ph * 30, 'rgba(220,230,245,.2)', nk * (1 - ph)); }
    text('전용 원자력 · 전력망', 1600, 700, 34, { w: 800, alpha: E.out(P(t, k('원자력'), .5)) });
    title('통째로 집어삼키는 중', W / 2, 150, 60, t, k('통째로'), { color: C.red });
    ctx.restore();
  }
};

// 17: price-insensitive + vacuum
SC[17] = (t, s, e) => {
  const k = w => KW(17, w);
  const tB = k('남들보다'), tC = k('주도권'), tD = k('그러니');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('빅테크가 정말 두려워하는 것은?', W / 2, 200, 56, t, s + .1);
    chip('대출 이자 몇 %', 600, 520, 44, { bg: '#26324d', alpha: E.out(P(t, k('퍼센트'), .4)) });
    if (t > k('아닙니다')) xmark(600, 520, 90, t, k('아닙니다'));
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    line(260, 520, 1660, 520, C.muted, 6);
    const ak = E.out(P(t, tB, 1.2)), bk = E.out(P(t, k('반년'), 1.6));
    circle(260 + 1000 * ak, 470, 22, C.green); text('경쟁사', 260 + 1000 * ak, 420, 30, { w: 800, color: C.green });
    circle(260 + 1000 * ak - 420 * bk, 570, 22, C.red); text('우리', 260 + 1000 * ak - 420 * bk, 620, 30, { w: 800, color: C.red });
    if (bk > .3) { chip('6개월 지연', 260 + 1000 * ak - 210 * bk, 680, 34, { alpha: bk }); }
    title('AI 패권 상실', W / 2, 250, 90, t, k('패권'), { color: C.red });
    ctx.restore();
  }
  a = vis(t, tC, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // scale balance
    const tilt = E.elastic(P(t, k('대출 금리'), 1.4)) * -.28;
    withT(W / 2, 430, 1, tilt, 1, () => {
      line(-500, 0, 500, 0, '#aab3c5', 12);
      line(-450, 0, -450, 120, '#aab3c5', 3); line(450, 0, 450, 120, '#aab3c5', 3);
      withT(-450, 160, 1, -tilt, 1, () => { panel(-180, -40, 360, 80, { fill: C.red, stroke: null }); text('수천조 원 증발', 0, 0, 34, { w: 900 }); });
      withT(450, 160, 1, -tilt, 1, () => { panel(-120, -40, 240, 80, { fill: '#26324d', stroke: null }); text('금리 5%든 7%든', 0, 0, 26, { w: 800 }); });
    });
    ctx.fillStyle = '#aab3c5'; ctx.beginPath(); ctx.moveTo(W / 2, 430); ctx.lineTo(W / 2 - 60, 800); ctx.lineTo(W / 2 + 60, 800); ctx.fill();
    title('그게 무슨 대수?', W / 2, 180, 70, t, k('대수'), { color: C.amber });
    ctx.restore();
  }
  a = vis(t, tD, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // vacuum nozzle at right sucking particles
    const vx = 1500, vy = 480;
    ctx.save(); ctx.fillStyle = '#aab3c5'; ctx.beginPath(); ctx.moveTo(vx - 40, vy - 110); ctx.lineTo(vx + 260, vy - 50); ctx.lineTo(vx + 260, vy + 50); ctx.lineTo(vx - 40, vy + 110); ctx.closePath(); ctx.fill(); ctx.restore();
    text('BIG TECH', vx + 120, vy, 34, { w: 900, color: C.bg0 });
    for (let i = 0; i < 70; i++) {
      const u = ((t - tD) * .5 + hash(i)) % 1; const x0 = 120 + hash(i + 1) * 900, y0 = 180 + hash(i + 2) * 640;
      const x = lerp(x0, vx - 30, E.in(u)), y = lerp(y0, vy + (hash(i + 3) - .5) * 120, E.in(u));
      circle(x, y, 6 + hash(i + 5) * 6, C.cyan, (1 - u) * .9);
    }
    // bonds stack
    const bk = P(t, k('회사채'), 2);
    for (let i = 0; i < Math.floor(bk * 10); i++) panel(1500 - 60, 820 - i * 22, 240, 18, { r: 3, fill: C.amber, stroke: null });
    text('회사채 무제한 발행', 1560, 870, 28, { w: 800, color: C.amber, alpha: E.out(P(t, k('회사채'), .5)) });
    title('유동성 진공청소기', 560, 150, 66, t, k('진공'), { color: C.cyan });
    ctx.restore();
  }
};

// 18: Monster 2 — governments
SC[18] = (t, s, e) => {
  const k = w => KW(18, w);
  const tB = k('미국을'), tC = k('팬데믹'), tD = k('정부 금고'), tE = k('결국');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) chapterCard('MONSTER 02', '각국 정부', '두 번째 괴물 · 끝판왕', t, s, tB);
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const mk = E.out(P(t, tB, 1.6));
    ctx.fillStyle = '#7a1d27'; ctx.beginPath(); ctx.moveTo(W / 2 - 700, 820); ctx.lineTo(W / 2, 820 - 520 * mk); ctx.lineTo(W / 2 + 700, 820); ctx.closePath(); ctx.fill();
    withT(W / 2, 820 - 520 * mk - 60, 1, 0, mk, () => I.capitol('#e9edf5'));
    title('정부의 빚더미', W / 2, 160, 70, t, k('빚더미'), { color: C.red });
    ctx.restore();
  }
  a = vis(t, tC, tD, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    for (let i = 0; i < 30; i++) { const u = ((t - tC) * .3 + hash(i)) % 1; withT(200 + hash(i + 7) * 700, 120 + u * 700, .45, u * 6, 1 - u, () => I.coin(C.green, '$')); }
    text('팬데믹 = 공짜 돈', 560, 860, 40, { w: 800, color: C.green, alpha: E.out(P(t, tC, .5)) });
    for (let i = 0; i < 6; i++) {
      const kk = pop(t, k('국채들') + i * .15, .4);
      withT(1250 + (i % 3) * 190, 380 + Math.floor(i / 3) * 220, kk, 0, 1, () => { panel(-80, -90, 160, 180, { fill: '#e9e4d6', stroke: null, r: 8 }); text('국채', 0, -30, 36, { w: 900, color: '#333' }); });
    }
    stamp('만기 도래', 1440, 490, 64, t, k('만기'));
    ctx.restore();
  }
  a = vis(t, tD, tE, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const ok = E.io(P(t, tD + .3, 1));
    panel(W / 2 - 260, 260, 520, 460, { fill: '#2a3550', stroke: '#8d9ab5', lw: 6 });
    ctx.save(); ctx.fillStyle = '#0a0f1b'; ctx.fillRect(W / 2 - 220, 300, 440, 380); ctx.restore();
    withT(W / 2 - 220, 490, 1, 0, 1, () => { ctx.save(); ctx.scale(1 - ok * 1.6, 1); ctx.fillStyle = '#56627e'; ctx.fillRect(0, -190, 440, 380); ctx.restore(); });
    text('텅 빈 금고', W / 2, 800, 60, { w: 900, color: C.red, alpha: E.out(P(t, k('없습니다'), .4)) });
    ctx.restore();
  }
  a = vis(t, tE, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const rot = (t - tE) * 1.2;
    ctx.save(); ctx.translate(W / 2, 500); ctx.rotate(rot);
    ctx.strokeStyle = C.amber; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, 0, 230, .3, Math.PI - .3); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 230, Math.PI + .3, -.3); ctx.stroke();
    tri(Math.cos(Math.PI - .3) * 230, Math.sin(Math.PI - .3) * 230, 22, false, C.amber); tri(Math.cos(-.3) * 230, Math.sin(-.3) * 230, 22, true, C.amber);
    ctx.restore();
    chip('옛 국채 (저금리)', W / 2 - 420, 500, 32, { bg: '#26324d', alpha: E.out(P(t, tE + .3, .4)) });
    chip('새 국채 (고금리)', W / 2 + 420, 500, 32, { bg: C.red, alpha: E.out(P(t, k('새로운'), .4)) });
    text('차환 발행', W / 2, 500, 64, { w: 900, alpha: E.out(P(t, k('차환'), .4)) });
    title('미친 듯이 쏟아내는 중', W / 2, 860, 50, t, k('미친'), { color: C.red });
    ctx.restore();
  }
};

// 19: two giants absorb liquidity → real rate up
SC[19] = (t, s, e) => {
  const k = w => KW(19, w);
  const tB = k('이렇게');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    withT(W / 2, 470, pop(t, s + .2, .6) * 2, 0, 1, () => I.capitol('#e9edf5'));
    title('가격 둔감 주체', W / 2, 220, 80, t, k('극단적인'), { color: C.amber });
    text('금리가 얼마든 무조건 빌린다', W / 2, 760, 44, { w: 700, alpha: E.out(P(t, k('무조건'), .5)) });
    ctx.restore();
  }
  a = vis(t, tB, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const g1 = [560, 470], g2 = [1360, 470];
    const grow = E.out(P(t, k('빨아들이고'), 3));
    circle(g1[0], g1[1], 120 + grow * 60, 'rgba(63,208,255,.18)'); circle(g1[0], g1[1], 110 + grow * 50, '#123248');
    circle(g2[0], g2[1], 120 + grow * 60, 'rgba(255,59,71,.18)'); circle(g2[0], g2[1], 110 + grow * 50, '#3a1219');
    text('빅테크', g1[0], g1[1], 54, { w: 900, color: C.cyan }); text('정부', g2[0], g2[1], 54, { w: 900, color: C.red });
    for (let i = 0; i < 80; i++) {
      const u = ((t - tB) * .35 + hash(i)) % 1; const tg = i % 2 ? g1 : g2;
      const ang = hash(i + 11) * Math.PI * 2, r0 = 700;
      const x = lerp(W / 2 + Math.cos(ang) * r0 * 1.2, tg[0], E.in(u)), y = lerp(470 + Math.sin(ang) * r0 * .6, tg[1], E.in(u));
      circle(x, y, 5, C.amber, 1 - u);
    }
    title('두 거인이 시장의 돈을 독식', W / 2, 160, 56, t, tB + .2);
    const rk = E.out(P(t, k('실질'), .6));
    if (rk > 0) { chip('실질 금리 ▲', W / 2, 800, 46, { alpha: rk }); }
    ctx.restore();
  }
};

// 20: central bank's old playbook
SC[20] = (t, s, e) => {
  const k = w => KW(20, w);
  const tB = k('중앙은행들은'), tC = k('하지만');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    withT(W / 2, 470, pop(t, s + .2, .6), -.05, 1, () => {
      ctx.fillStyle = '#5b4632'; rrect(-260, -320 / 1.1, 520, 560, 14); ctx.fill();
      ctx.fillStyle = '#e8dcc3'; rrect(-240, -270, 480, 520, 10); ctx.fill();
      text('중앙은행', 0, -170, 44, { w: 900, color: '#3b2c1c' }); text('PLAYBOOK', 0, -100, 64, { w: 900, color: '#3b2c1c' });
      line(-180, -40, 180, -40, '#3b2c1c', 3); text('물가 ▲ → 금리 ▲', 0, 30, 40, { w: 800, color: '#3b2c1c' }); text('(낡은 공식)', 0, 100, 32, { w: 600, color: '#6b5a44' });
    });
    for (let i = 0; i < 20; i++) { const u = (t * .1 + hash(i)) % 1; circle(W / 2 - 300 + hash(i + 2) * 600, 200 + u * 600, 2 + hash(i) * 3, 'rgba(220,200,160,.3)'); }
    stamp('비극', W / 2 + 380, 300, 70, t, k('비극'));
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const lk = E.io(P(t, k('기준금리를') - .3, 1));
    withT(W / 2, 700, 1, 0, 1, () => { panel(-160, -40, 320, 80, { fill: '#26324d' }); ctx.save(); ctx.rotate(-1.2 + lk * 1.4); ctx.fillStyle = '#aab3c5'; ctx.fillRect(-10, -320, 20, 320); circle(0, -320, 40, C.red); ctx.restore(); });
    title('차입 비용 ▲', 520, 300, 64, t, k('차입'), { color: C.amber });
    title('기준금리 더 세게 ▲', 1400, 300, 64, t, k('기준금리를'), { color: C.red });
    title('수요를 억누르려 한다', W / 2, 860, 44, t, k('억누르려'), { color: C.muted });
    ctx.restore();
  }
  a = vis(t, tC, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // podium
    ctx.fillStyle = '#1c2a46'; ctx.beginPath(); ctx.moveTo(W / 2 - 160, 820); ctx.lineTo(W / 2 - 120, 560); ctx.lineTo(W / 2 + 120, 560); ctx.lineTo(W / 2 + 160, 820); ctx.fill();
    withT(W / 2, 480, 1.3, 0, E.out(P(t, k('당신이'), .5)), () => I.person(C.amber));
    title('당신이 중앙은행 총재라면?', W / 2, 220, 74, t, k('당신이'));
    qmark(W / 2 + 330, 520, 140, t, k('통할'));
    ctx.restore();
  }
};

// 21: it doesn't work
SC[21] = (t, s, e) => {
  const k = (w, n) => KW(21, w, n);
  const a = vis(t, s, e + 1, .4, .3);
  ctx.save(); ctx.globalAlpha *= a;
  const t1 = k('금리를'), t2 = k('금리를', 1), t3 = k('돈을');
  if (t < t1 + .2) { stamp('전혀 통하지 않는다', W / 2, 470, 96, t, s + .1); }
  if (t > t1 - .2 && t < t3) {
    // rate slider
    const rk = E.out(P(t, k('1%'), .8));
    text('기준금리', 300, 200, 36, { w: 800, color: C.muted, align: 'left' });
    line(300, 260, 900, 260, '#26324d', 16); line(300, 260, 300 + 300 + rk * 200, 260, C.red, 16);
    circle(300 + 300 + rk * 200, 260, 22, C.white); text('+1%p', 300 + 300 + rk * 200, 320, 34, { w: 900, color: C.red, alpha: rk });
    // giants keep rising
    const bars = [['빅테크 AI 투자', k('빅테크'), C.cyan], ['정부 국채 발행', t2, C.amber]];
    bars.forEach((b, i) => {
      const kk = pop(t, b[1], .5); if (kk <= 0) return;
      const grow = 250 + (t - b[1]) * 22;
      bar(1180 + i * 330, 800, 200, Math.min(grow, 560) * kk, b[2], b[0], '▲ 계속', 1, 30);
    });
    axes(1040, 800, 680, 600, .8);
    stamp('천만의 말씀', 600, 560, 64, t, k('천만의'), C.amber, -.06);
    stamp('어림도 없다', 600, 720, 64, t, k('어림도'), C.red, .05);
  }
  if (t >= t3) {
    // pie of capital eaten by giants
    const pk = E.io(P(t, t3 + .3, 2));
    const cx = W / 2, cy = 480, R = 260;
    circle(cx, cy, R, '#26324d');
    ctx.save(); ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .9 * pk); ctx.closePath(); ctx.fill(); ctx.restore();
    text('거인들의 몫', cx - 60, cy + 40, 46, { w: 900 }); text('나머지', cx + 120, cy - 220, 28, { w: 700, color: C.muted, alpha: pk });
    title('자본 독식', W / 2, 160, 80, t, k('독식'), { color: C.red });
    note('※ 개념 이해를 위한 예시 그래픽');
  }
  ctx.restore();
};

// 22: the blade hits the weak + boiler metaphor
SC[22] = (t, s, e) => {
  const k = w => KW(22, w);
  const tB = k('가격에'), tC = k('고장');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // giants (untouched) left, small people right; blade swings low
    withT(480, 520, 2.6, 0, 1, () => I.person('#2c3a5a')); text('거인들', 480, 800, 40, { w: 900, color: C.muted });
    for (let i = 0; i < 6; i++) withT(1100 + i * 110, 640, .8, 0, 1, () => I.person(C.white));
    const sk = P(t, k('칼날'), 2.5);
    const ang = lerp(-2.2, 1.6, E.io(sk));
    withT(960, -200, 1, ang, sk > 0 ? 1 : 0, () => { ctx.fillStyle = '#d7deeb'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.lineTo(40, 860); ctx.lineTo(-60, 860); ctx.closePath(); ctx.fill(); text('금리 인상', 0, 600, 34, { w: 900, color: C.bg0 }); });
    title('정작 거인들의 목에는 닿지도 못한 칼날', W / 2, 160, 50, t, k('정작'));
    if (t > k('엉뚱한')) chip('엉뚱한 사람들의 숨통만', 1430, 470, 34, { alpha: E.out(P(t, k('엉뚱한'), .4)) });
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const vs = [['서민 가계', () => I.house(C.white, 7), k('서민')], ['골목상권 자영업자', () => I.shop(C.white), k('하루하루')], ['신생 스타트업', () => I.rocket(C.white), k('기술력')]];
    vs.forEach((v, i) => {
      const x = 400 + i * 560, kk = pop(t, v[2] - .2, .5);
      const fall = E.in(P(t, k('쓰러져') + i * .25, .7));
      withT(x, 470 + fall * 90, kk, fall * .5 * (i - 1 || 1), 1 - fall * .5, () => { panel(-200, -180, 400, 360, { stroke: fall > .3 ? C.red : C.line }); withT(0, -40, 1.5, 0, 1, v[1]); text(v[0], 0, 120, 36, { w: 800 }); });
    });
    title('가격에 민감하고 체력이 약한 사람들', W / 2, 160, 50, t, tB + .1);
    title('피눈물', W / 2, 820, 60, t, k('피눈물'), { color: C.red });
    ctx.restore();
  }
  a = vis(t, tC, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    // broken boiler
    panel(260, 300, 360, 460, { fill: '#2a3550', stroke: '#8d9ab5', lw: 5 });
    text('보일러', 440, 360, 40, { w: 900 }); text('= 진짜 원인', 440, 410, 26, { w: 700, color: C.amber });
    xmark(440, 560, 70, t, tC + .3);
    // coolant pouring
    const ck = E.out(P(t, k('냉각수'), .6));
    if (ck > 0) { ctx.save(); ctx.globalAlpha *= ck; ctx.fillStyle = '#9aa7c2'; ctx.save(); ctx.translate(980, 260); ctx.rotate(.7); rrect(-60, -90, 120, 180, 14); ctx.fill(); ctx.restore(); for (let i = 0; i < 25; i++) { const u = ((t - k('냉각수')) * 1.2 + i / 25) % 1; circle(1030 + Math.sin(i) * 20, 330 + u * 420, 8, C.cyan, 1 - u); } text('냉각수 = 금리 인상', 980, 160, 34, { w: 800, color: C.cyan }); ctx.restore(); }
    // thermometer
    const tk = E.io(P(t, k('저체온'), 1.5));
    panel(1480, 260, 70, 460, { r: 35, fill: '#1c2a46' });
    const lvl = lerp(.75, .1, tk);
    ctx.save(); ctx.fillStyle = tk > .5 ? C.cyan : C.red; rrect(1495, 260 + 440 * (1 - lvl), 40, 440 * lvl + 10, 20); ctx.fill(); ctx.restore();
    circle(1515, 740, 55, tk > .5 ? C.cyan : C.red);
    withT(1260, 640, 1, 0, E.out(P(t, k('아이들'), .5)), () => { I.person('#cfe8ff'); });
    if (tk > 0) for (let i = 0; i < 20; i++) { const u = (t * .25 + hash(i)) % 1; circle(1100 + hash(i + 3) * 340, 260 + u * 520, 4, '#e8f4ff', tk * (1 - u)); }
    title('약한 아이들부터 얼어붙는다', W / 2 + 200, 850, 46, t, k('아이들'), { color: C.cyan });
    ctx.restore();
  }
};

// 23: recap + wealth concentration
SC[23] = (t, s, e) => {
  const k = w => KW(23, w);
  const tB = k('뉴질랜드'), tC = k('이것은');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    for (let i = 0; i < 160; i++) {
      const r = 20 + i * 3.6, ang = i * .35 + t * (1.4 - i / 160);
      circle(W / 2 + Math.cos(ang) * r * 1.3, 470 + Math.sin(ang) * r * .7, 3 + i / 40, i % 3 ? C.cyan : C.red, .7 * E.out(P(t, s + i * .005, .5)));
    }
    title('기형적인 자본의 소용돌이', W / 2, 160, 66, t, k('기형적'));
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    const hl = {}; C7.forEach(c => hl[c.code] = { color: C.red, a: .9 });
    drawMap(a, hl, FULLCAM);
    ctx.save(); ctx.globalAlpha *= a;
    C7.forEach((c, i) => mapMarker(c.code, t, tB + i * .35, FULLCAM, c.ko, 1));
    const fk = P(t, k('신호탄') - 1, 1.2);
    if (fk > 0) {
      const y = lerp(900, 260, E.out(fk)); circle(W / 2, y, 12, C.amber); for (let i = 0; i < 10; i++) circle(W / 2 + (hash(i) - .5) * 10, y + i * 18, 6 - i * .5, C.amber, .6 - i * .05);
      if (fk >= 1) { const bk = P(t, k('신호탄') + .2, 1); for (let i = 0; i < 24; i++) { const ang = i / 24 * Math.PI * 2; circle(W / 2 + Math.cos(ang) * bk * 220, 260 + Math.sin(ang) * bk * 220 + bk * bk * 60, 7, i % 2 ? C.red : C.amber, 1 - bk); } }
    }
    title('7대 축의 동시 신호탄', W / 2, 150, 58, t, k('신호탄'), { color: C.amber });
    ctx.restore();
  }
  a = vis(t, tC, e + 1, .4, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const nodes = [[1460, 360, '거대 권력'], [1460, 640, '빅테크']];
    nodes.forEach(n => { circle(n[0], n[1], 120, 'rgba(255,59,71,.22)'); circle(n[0], n[1], 95, '#3a1219'); text(n[2], n[0], n[1], 40, { w: 900 }); });
    for (let i = 0; i < 24; i++) {
      const x = 220 + (i % 6) * 110, y = 300 + Math.floor(i / 6) * 120;
      withT(x, y, .55, 0, .8, () => I.person('#cfd8ea'));
    }
    for (let i = 0; i < 60; i++) {
      const u = ((t - tC) * .4 + hash(i)) % 1; const sx = 220 + (i % 6) * 110, sy = 300 + Math.floor((i % 24) / 6) * 120; const tg = nodes[i % 2];
      circle(lerp(sx, tg[0], E.io(u)), lerp(sy, tg[1], E.io(u)), 6, C.amber, Math.sin(u * Math.PI));
    }
    text('보통 사람들 — 극단적 긴축', 550, 820, 38, { w: 800, color: C.muted, alpha: E.out(P(t, k('보통'), .5)) });
    title('거대한 부의 재편', W / 2, 160, 74, t, k('재편'), { color: C.red });
    ctx.restore();
  }
};

// 24: outro
SC[24] = (t, s, e) => {
  const k = w => KW(24, w);
  const tB = k('그리고'), tC = k('오늘');
  let a = vis(t, s, tB, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const wk = E.out(P(t, s, 3));
    ctx.fillStyle = 'rgba(63,208,255,.35)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i <= 60; i++) { const x = i / 60 * W; ctx.lineTo(x, 900 - wk * 380 * (0.6 + .4 * Math.sin(i / 60 * Math.PI)) + Math.sin(t * 3 + i * .4) * 20); }
    ctx.lineTo(W, H); ctx.fill();
    title('금리의 쓰나미', W / 2, 220, 100, t, k('쓰나미') - .3, { color: C.cyan });
    title('당신의 자산과 일자리는 안녕하십니까?', W / 2, 360, 52, t, k('자산'));
    ctx.restore();
  }
  a = vis(t, tB, tC, .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    for (let i = 0; i < 18; i++) { const kk = pop(t, k('방파제') - .6 + i * .06, .4); withT(360 + (i % 9) * 150, 760 - Math.floor(i / 9) * 90, kk, 0, 1, () => panel(-70, -40, 140, 80, { r: 6, fill: '#5e6b86', stroke: '#8d9ab5' })); }
    title('어떤 방파제를 쌓아야 할까?', W / 2, 260, 70, t, tB + .3);
    ctx.restore();
  }
  a = vis(t, tC, Infinity, .6, .3);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    const kk = E.out(P(t, tC, 1));
    for (let i = 0; i < 24; i++) { const ang = i / 24 * Math.PI * 2 + t * .05; line(W / 2 + Math.cos(ang) * 230, 450 + Math.sin(ang) * 230, W / 2 + Math.cos(ang) * (230 + 600 * kk), 450 + Math.sin(ang) * (230 + 600 * kk), 'rgba(255,181,71,.10)', 3); }
    ring(W / 2, 450, 200 * kk, C.amber, 4);
    text('지식의', W / 2, 400, 54, { w: 700, color: C.amber, alpha: kk, ls: 12 });
    text('파노라마', W / 2, 490, 96, { w: 900, alpha: kk });
    text('시청해 주셔서 감사합니다', W / 2, 760, 46, { w: 700, color: C.white, alpha: E.out(P(t, k('지금까지'), .8)) });
    ctx.restore();
  }
};
