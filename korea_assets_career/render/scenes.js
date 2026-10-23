// =================== 노후·커리어 7가지 전략: scenes (one per paragraph) ===================
// Pure functions of t. at(pi,'키워드') = the second the narrator says that word (helpers.js).
const k_ = pi => (w, n = 0) => at(pi, w, n);
const R = 0.86;  // rough "content area" bottom (subtitles live below ~920px)

function strategyChip(n, t, s) { chip('전략 0' + n, 300, 150, 30, { bg: C.red, alpha: E.out(P(t, s, .4)) }); }
function donut(x, y, r, frac, k, color, lw = 30) {
  ring(x, y, r, 'rgba(255,255,255,.1)', lw);
  if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.shadowColor = color; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac * E.out(k)); ctx.stroke(); ctx.restore();
}
function heart(x, y, s, color) {
  withT(x, y, s, 0, 1, () => { ctx.save(); ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.beginPath();
    ctx.moveTo(0, 30); ctx.bezierCurveTo(-60, -10, -40, -60, 0, -30); ctx.bezierCurveTo(40, -60, 60, -10, 0, 30); ctx.fill(); ctx.restore(); });
}
function check(x, y, s, t, t0, color = C.green) {
  const k = E.out(P(t, t0, .4)); if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  const p = [[-s, 0], [-s * .3, s * .7], [s, -s * .7]]; ctx.moveTo(x + p[0][0], y + p[0][1]);
  if (k < .4) { const f = k / .4; ctx.lineTo(x + lerp(p[0][0], p[1][0], f), y + lerp(p[0][1], p[1][1], f)); }
  else { ctx.lineTo(x + p[1][0], y + p[1][1]); const f = (k - .4) / .6; ctx.lineTo(x + lerp(p[1][0], p[2][0], f), y + lerp(p[1][1], p[2][1], f)); }
  ctx.stroke(); ctx.restore();
}
function popChip(str, x, y, size, t, t0, opt = {}) {
  const kk = pop(t, t0, .5); if (kk <= 0) return; if (kk < .05) cue('pop', t0);
  withT(x, y, kk, 0, 1, () => chip(str, 0, 0, size, opt));
}
const DARKCHIP = col => ({ bg: 'rgba(16,24,42,.95)', stroke: col, color: col });
function stampC(str, x, y, size, t, t0, color = C.red, rot = -.08) { stamp(str, x, y, size, t, t0, color, rot); if (t >= t0) cue('stamp', t0); }
// savings curve: 30만 원/월, 연 r, value after y years
const FV = (y, r = .05) => 300000 * (Math.pow(1 + r / 12, 12 * y) - 1) / (r / 12);

SC[0] = (t, s, e) => {
  const k = k_(0);
  const a = vis(t, s, k('지금 30대'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('월급이 끝나는 날, 연금은 아직', 230, 56, t, s + .1);
    const X = age => 260 + (age - 55) / 30 * 1400, y = 600;
    line(X(55), y, X(85), y, C.dim, 4);
    [55, 60, 65, 70, 75, 80, 85].forEach(ag => text(ag + '', X(ag), y + 46, 26, { w: 600, color: C.muted }));
    const kg = E.out(P(t, k('그 사이'), .8));
    if (kg > 0) { panel(X(60), y - 190, (X(65) - X(60)) * kg, 190, { r: 6, fill: 'rgba(255,59,71,.28)', stroke: C.red, lw: 2 }); }
    const mk = (ag, tt, lab, col, up = 1) => { const kk = pop(t, tt, .5); if (kk <= 0) return; if (kk < .05) cue('pop', tt); withT(X(ag), y, kk, 0, 1, () => { circle(0, 0, 16, col); text(lab, 0, -230 * up + (up < 0 ? 0 : 0), 34, { w: 800, color: col }); }); };
    mk(60, k('60세'), '60세 퇴직', C.white);
    mk(65, k('65세'), '65세 연금', C.cyan);
    stampC('소득 절벽 5년', (X(60) + X(65)) / 2, y - 95, 40, t, k('소득 절벽'));
    mk(83, k('83세'), '기대수명 83세', C.amber);
    const kl = E.out(P(t, k('83세'), 1.0)); if (kl > 0) line(X(65), y, X(65) + (X(83) - X(65)) * kl, y, C.amber, 8);
    ctx.restore();
  }
  const b = vis(t, k('지금 30대'), k('오늘'), .4, .4);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('지금 30대가 은퇴할 즈음', 250, 56, t, k('지금 30대'));
    const kp = pop(t, k('일하는 사람'), .6);
    if (kp > 0) { cue('pop', k('일하는 사람')); withT(620, 560, kp * 2.6, 0, 1, () => I.person(C.cyan)); label('일하는 사람 1명', 620, 760, 40, t, k('일하는 사람'), { color: C.cyan, w: 800 }); }
    const ko = pop(t, k('노인'), .6);
    if (ko > 0) { cue('pop', k('노인')); withT(1300, 560, ko * 2.6, 0, 1, () => I.person(C.amber)); label('노인 약 1명', 1300, 760, 40, t, k('노인'), { color: C.amber, w: 800 }); }
    if (t > k('먹여')) text('↔', 960, 560, 110, { w: 900, color: C.white, alpha: E.out(P(t, k('먹여'), .4)) });
    ctx.restore();
  }
  const c = vis(t, k('오늘'), e, .4, .3);
  if (c > 0) {
    ctx.save(); ctx.globalAlpha *= c;
    title('숫자로 보는 7가지 전략', 360, 72, t, k('오늘'));
    for (let i = 0; i < 7; i++) { const tt = k('일곱') + i * .12, kk = pop(t, tt, .5); if (kk <= 0) continue; if (kk < .05) cue('pop', tt);
      withT(390 + i * 190, 580, kk, 0, 1, () => { circle(0, 0, 66, i < 4 ? C.cyan : C.amber); text(String(i + 1), 0, 4, 64, { w: 900, color: C.bg0 }); }); }
    label('자산 4가지  ·  커리어 3가지', W / 2, 730, 40, t, k('일곱') + 1, { color: C.white, w: 700 });
    ctx.restore();
  }
};
SC[1] = (t, s, e) => {
  const k = k_(1);
  circle(W / 2, 330, 110 * E.back(P(t, s, .6)), C.red, .9);
  text('지식', W / 2, 310, 58, { w: 900, alpha: E.out(P(t, s + .2, .5)) });
  text('파노라마', W / 2, 365, 40, { w: 700, alpha: E.out(P(t, s + .3, .5)) });
  title('안녕하세요, 지식파노라마입니다', 530, 56, t, s + .2);
  const aq = 1 - E.out(P(t, k('어디서'), .4));
  if (aq > 0) { ctx.save(); ctx.globalAlpha *= aq; quoteBox('"그래서 나는 뭘 해야 하나?"', 680, 50, t, k('그래서'), C.amber); ctx.restore(); }
  const tq = k('어디서');
  if (t > tq) { cue('pop', tq); const kk = pop(t, tq, .5); withT(W / 2, 680, kk, 0, 1, () => { panel(-560, -60, 1120, 120, { r: 24, stroke: C.amber, lw: 3 }); text('지금 어디서 보고 계신가요?  댓글로 남겨 주세요', 0, 2, 40, { w: 800, color: C.amber }); }); }
};
SC[2] = (t, s, e) => {
  const k = k_(2);
  const a = vis(t, s, k('국민연금'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('냉정한 현실 ① 노인빈곤율', 230, 54, t, s + .1);
    bigNum('약 40%', 560, 520, 170, t, k('40%'), C.red);
    for (let i = 0; i < 10; i++) { const tt = k('열 명') + i * .08; const kk = pop(t, tt, .4); if (kk <= 0) continue;
      const red = i < 4 && t > k('네 명'); person(1060 + (i % 5) * 120, 430 + Math.floor(i / 5) * 180, .95 * kk, red ? C.red : 'rgba(160,190,255,.7)'); }
    label('노인 10명 중 4명이 가난하다', 1300, 720, 38, t, k('네 명'), { color: C.white, w: 700 });
    stampC('OECD 1위', 560, 730, 56, t, k('가장 높습니다'));
    ctx.restore();
  }
  const b = vis(t, k('국민연금'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('한 달에 받는 돈 vs 필요한 돈 (만 원)', 220, 50, t, k('국민연금'));
    barChart([{ label: '국민연금 평균 수령액', val: 65, t0: k('60만'), color: C.cyan, text: '60만 원대' },
              { label: '적정 노후생활비 (부부)', val: 300, t0: k('300만'), color: C.amber, text: '약 300만 원' }], 520, 800, 880, 440, 320, t, { gap: 240, lsize: 30, vsize: 42 });
    stampC('턱없이 부족', 1500, 420, 60, t, k('턱없이'));
    ctx.restore();
  }
};
SC[3] = (t, s, e) => {
  const k = k_(3);
  title('2025년 연금개혁', 220, 60, t, s + .1);
  const row = (y, lab, from, to, tt, col) => {
    const kk = E.out(P(t, tt, .6)); if (kk <= 0) return; if (kk < .05) cue('pop', tt);
    ctx.save(); ctx.globalAlpha *= kk;
    panel(330, y - 60, 1260, 120, { r: 20, fill: 'rgba(12,18,32,.88)', stroke: C.line });
    text(lab, 380, y, 40, { w: 800, align: 'left', color: C.white });
    if (from) text(from, 1040, y, 52, { w: 900, color: C.muted });
    arrow(1110, y, 1240, y, col, 6, E.out(P(t, tt + .3, .5)));
    text(to, 1400, y, 60, { w: 900, color: col, alpha: E.out(P(t, tt + .5, .4)) });
    ctx.restore();
  };
  row(380, '보험료율 (내는 돈)', '9%', '13%', k('보험료율'), C.red);
  row(530, '소득대체율 (받는 돈)', '', '43%', k('소득대체율'), C.cyan);
  row(680, '기금 고갈 시점', '2056년', '2064년', k('기금'), C.amber);
  quoteBox('결론: 국민연금 하나로는 노후가 안 된다', 850, 44, t, k('하나로는'), C.white);
};
SC[4] = (t, s, e) => {
  const k = k_(4);
  chapterCard('STRATEGY 01', '연금 3층 탑', '자산 편', t, s, k('1층')); if (t >= s) cue('impact', s);
  const b = vis(t, k('1층'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    strategyChip(1, t, k('1층'));
    const floors = [['1층  국민연금', C.cyan, k('1층')], ['2층  퇴직연금', C.amber, k('2층')], ['3층  개인연금', C.green, k('3층', 1)]];
    floors.forEach(([lab, col, tt], i) => { const kk = E.back(P(t, tt, .5)); if (kk <= 0) return; if (kk < .05) cue('stamp', tt);
      const y = 760 - i * 150 - (1 - Math.min(1, kk)) * 200;
      panel(260, y - 62, 640, 124, { r: 14, fill: col, stroke: null, alpha: Math.min(1, kk) });
      text(lab, 580, y, 44, { w: 900, color: C.bg0, alpha: Math.min(1, kk) }); });
    popChip('연금저축 + IRP', 1380, 300, 40, t, k('연금저축'), { bg: C.green, color: C.bg0 });
    label('세액공제 한도 (1년)', 1380, 410, 34, t, k('900만'), { color: C.muted });
    bigNum('900만 원', 1380, 480, 80, t, k('900만'), C.white);
    label('최대 환급', 1380, 590, 34, t, k('148만'), { color: C.muted });
    bigNum('148만 5천 원', 1380, 665, 84, t, k('148만'), C.green);
    stampC('나라가 주는 확정 수익', 1380, 800, 44, t, k('확정'), C.amber);
    ctx.restore();
  }
};
SC[5] = (t, s, e) => {
  const k = k_(5);
  strategyChip(2, t, s);
  const a = vis(t, s, k('수수료'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('매달 30만 원, 연 5%로 굴리면', 230, 54, t, s + .2);
    const x0 = 400, y0 = 820, w = 1100, h = 480, vmax = 2.6e8;
    axes(x0, y0, w, h, 1, '', '');
    [0, 10, 20, 30].forEach(yr => text(yr + '년', x0 + yr / 30 * w, y0 + 34, 26, { w: 600, color: C.muted }));
    const A = [], B = [];
    for (let y = 0; y <= 30; y++) A.push([y / 30, FV(y) / vmax]);
    for (let y = 10; y <= 30; y++) B.push([y / 30, FV(y - 10) / vmax]);
    const ea = lineChart(A, x0, y0, w, h, E.io(P(t, k('30년'), 1.6)), C.green, 8);
    if (ea) circle(ea[0], ea[1], 12, C.green);
    if (t > k('2억')) { cue('pop', k('2억')); text('약 2억 5천만 원', x0 + w - 10, y0 - h * FV(30) / vmax - 44, 44, { w: 900, color: C.green, align: 'right', alpha: E.out(P(t, k('2억'), .4)) }); }
    const eb = lineChart(B, x0, y0, w, h, E.io(P(t, k('10년'), 1.4)), C.red, 8);
    if (eb) circle(eb[0], eb[1], 12, C.red);
    if (t > k('1억')) { cue('pop', k('1억')); text('10년 늦으면 약 1억 2천만 원', x0 + w - 10, y0 - h * FV(20) / vmax + 54, 40, { w: 900, color: C.red, align: 'right', alpha: E.out(P(t, k('1억'), .4)) }); }
    stampC('절반', 760, 420, 90, t, k('절반'));
    ctx.restore();
  }
  const b = vis(t, k('수수료'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('수익률 1% 차이, 30년 뒤', 230, 54, t, k('수수료'));
    barChart([{ label: '연 5%', val: FV(30) / 1e6, t0: k('수수료') + .4, color: C.green, text: '약 2억 5천만 원' },
              { label: '연 4%', val: FV(30, .04) / 1e6, t0: k('1%'), color: C.amber, text: '약 2억 1천만 원' }], 420, 780, 760, 420, 260, t, { gap: 200, lsize: 32, vsize: 40 });
    stampC('4천만 원+ 차이', 1530, 560, 56, t, k('4천만'));
    quoteBox('가장 비싼 것: 늦게 시작하기 + 새는 돈 모르기', 880, 40, t, k('가장 비싼'), C.white);
    ctx.restore();
  }
};
SC[6] = (t, s, e) => {
  const k = k_(6);
  strategyChip(3, t, s);
  const a = vis(t, s, k('일본에는'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('집 한 채에 모든 걸 걸지 마세요', 230, 60, t, s + .2);
    donut(W / 2, 580, 190, .7, P(t, k('70%'), 1.2), C.amber);
    if (t > k('70%')) { cue('pop', k('70%')); text('70%+', W / 2, 560, 100, { w: 900, color: C.amber }); text('가계 자산 중 부동산', W / 2, 640, 34, { w: 700, color: C.white }); }
    ctx.restore();
  }
  const b = vis(t, k('일본에는'), k('앞으로는'), .4, .4);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('빈집', 230, 60, t, k('일본에는'));
    barChart([{ label: '일본 (2023)', val: 900, t0: k('900만'), color: C.red, text: '900만 채' },
              { label: '한국 (2023)', val: 153, t0: k('150만'), color: C.amber, text: '150만 채+' }], 560, 800, 800, 460, 950, t, { gap: 220, lsize: 32, vsize: 44 });
    ctx.restore();
  }
  const c = vis(t, k('앞으로는'), e, .4, .3);
  if (c > 0) {
    ctx.save(); ctx.globalAlpha *= c;
    title("'양극화의 시대'", 230, 64, t, k('양극화'), { color: C.amber });
    const x0 = 460, y0 = 600, w = 1000, kk = E.io(P(t, k('앞으로는'), 1.6));
    const up = lineChart([[0, .2], [.4, .26], [.7, .42], [1, .62]], x0, y0, w, 500, kk, C.green, 8);
    const dn = lineChart([[0, .2], [.4, .18], [.7, .08], [1, -.06]], x0, y0, w, 500, kk, C.red, 8);
    if (up && kk > .9) text('오르는 곳', up[0] + 20, up[1], 36, { w: 800, color: C.green, align: 'left' });
    if (dn && kk > .9) text('떠나는 곳', dn[0] + 20, dn[1], 36, { w: 800, color: C.red, align: 'left' });
    ['일자리', '병원', '교통'].forEach((s2, i) => popChip(s2, 660 + i * 300, 820, 38, t, at(6, s2), { bg: C.green, color: C.bg0 }));
    ctx.restore();
  }
};
SC[7] = (t, s, e) => {
  const k = k_(7);
  strategyChip(4, t, s);
  const a = vis(t, s, k('세계로'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('한 나라에만 걸지 마세요', 230, 60, t, s + .2);
    [['월급', '월급도', I.coin], ['집', '집도', I.house], ['연금', '연금도', I.bank]].forEach(([lab, kw, ic], i) => {
      const tt = k(kw), kk = pop(t, tt, .5); if (kk <= 0) return; if (kk < .05) cue('pop', tt);
      withT(560 + i * 400, 460, kk, 0, 1, () => iconCard(0, 0, 300, 190, () => ic(C.white), lab, t, tt - 1));
      arrow(560 + i * 400, 570, 960, 700, C.red, 4, E.out(P(t, tt + .2, .5)));
    });
    const kb = pop(t, k('한국 경제'), .5);
    if (kb > 0) withT(960, 760, kb, 0, 1, () => chip('모두 한국 경제에', 0, 0, 40, { bg: C.red }));
    ctx.restore();
  }
  const b = vis(t, k('세계로'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title("원칙은 '분산'", 230, 64, t, k('세계로'), { color: C.cyan });
    const cols = [C.red, C.cyan, C.amber, C.green], kk = E.io(P(t, k('세계로'), 1.2));
    cols.forEach((col, i) => { if (kk * 4 <= i) return; const f = Math.min(1, kk * 4 - i);
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 60; ctx.beginPath(); ctx.arc(W / 2, 560, 200, -Math.PI / 2 + i * Math.PI / 2 + .04, -Math.PI / 2 + (i + f) * Math.PI / 2 - .04); ctx.stroke(); ctx.restore(); });
    [['한국', 1260, 400], ['미국', 1260, 720], ['유럽', 660, 720], ['아시아', 660, 400]].forEach(([lab, x, y], i) => label(lab, x, y, 40, t, k('세계로') + .3 * (i + 1), { color: cols[i], w: 800 }));
    label('※ 특정 상품 추천이 아닙니다', W / 2, 860, 30, t, k('특정 상품'), { color: C.muted });
    ctx.restore();
  }
};
SC[8] = (t, s, e) => {
  const k = k_(8);
  const a = vis(t, s, k('이제'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('잠깐만요!', 320, 80, t, s + .1, { color: C.amber });
    subscribeRow(W / 2, 540, t, k('구독'), { bell: false });
    label('지식파노라마가 숫자 이야기를 계속 만드는 힘', W / 2, 700, 38, t, k('힘'), { color: C.white });
    ctx.restore();
  }
  const b = vis(t, k('이제'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    popChip('자산 편', 640, 540, 52, t, k('이제'), DARKCHIP(C.muted));
    arrow(800, 540, 1100, 540, C.amber, 8, E.out(P(t, k('커리어') - .3, .5)));
    popChip('커리어 편', 1300, 540, 60, t, k('커리어'), { bg: C.red });
    ctx.restore();
  }
};
SC[9] = (t, s, e) => {
  const k = k_(9);
  chapterCard('STRATEGY 05', '사람이 귀해진다', '커리어 편', t, s, k('2032년')); if (t >= s) cue('impact', s);
  const b = vis(t, k('2032년'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    strategyChip(5, t, k('2032년'));
    const n = counter(0, 89, t, k('89만'), 1.2);
    bigNum(n + '만 명', W / 2, 330, 150, t, k('89만'), C.amber);
    label('2032년까지 더 필요한 노동력', W / 2, 460, 40, t, k('2032년'), { color: C.white });
    ['돌봄', '의료', '기술직'].forEach((s2, i) => popChip(s2, 660 + i * 300, 580, 40, t, at(9, s2), DARKCHIP(C.cyan)));
    const tm = k('몸값'); if (t > tm) { cue('whoosh', tm); arrow(1500, 640, 1500, 480, C.green, 10, E.out(P(t, tm, .5))); label('몸값 ↑', 1500, 690, 40, t, tm, { color: C.green, w: 900 }); }
    ['요양', '간호', '전기와 설비'].forEach((s2, i) => popChip(s2.replace('와 ', '·'), 660 + i * 300, 780, 40, t, at(9, s2), { bg: C.green, color: C.bg0 }));
    ctx.restore();
  }
};
SC[10] = (t, s, e) => {
  const k = k_(10);
  strategyChip(6, t, s);
  title('늙어가는 시장에 올라타세요', 230, 60, t, s + .2);
  barChart([{ label: '2020년', val: 72, t0: k('72조'), color: C.cyan, text: '72조 원' },
            { label: '2030년 (전망)', val: 168, t0: k('168조'), color: C.green, text: '168조 원' }], 360, 760, 640, 400, 180, t, { gap: 160, lsize: 30, vsize: 44 });
  label('고령친화산업 시장 규모', 680, 830, 32, t, k('72조'), { color: C.muted });
  stampC('2.3배', 1080, 600, 64, t, k('커질'), C.green);
  ['헬스케어', '돌봄 기술', '시니어 금융', '여행·교육'].forEach((s2, i) => popChip(s2, 1450, 350 + i * 120, 40, t, at(10, s2.replace('·교육', '과')), DARKCHIP(C.green)));
};
SC[11] = (t, s, e) => {
  const k = k_(11);
  strategyChip(7, t, s);
  const a = vis(t, s, k('엑셀'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('AI와 경쟁하지 말고, AI를 부리세요', 230, 58, t, s + .2);
    const tr = k('로봇'); if (t > tr) { cue('pop', tr); withT(W / 2, 470, pop(t, tr, .5), 0, 1, () => { withT(-170, 0, 1.3, 0, 1, () => I.gear(60, 10, C.amber, t * .8)); withT(170, 0, 1.4, 0, 1, () => I.chip(C.cyan)); }); }
    const tl = k('살아남는');
    popChip('AI보다 잘하는 사람', 620, 690, 40, t, tl, DARKCHIP(C.muted)); if (t > tl + .6) xmark(620, 690, 50, t, tl + .6);
    popChip('AI를 가장 잘 쓰는 사람', 1300, 690, 40, t, k('가장 잘 쓰는'), { bg: C.green, color: C.bg0 }); check(1300, 600, 34, t, k('가장 잘 쓰는') + .3);
    ctx.restore();
  }
  const b = vis(t, k('엑셀'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('도구가 바뀌면, 사람이 바뀐다', 260, 56, t, k('엑셀'));
    [['주판', k('주판')], ['엑셀', k('엑셀')], ['AI', k('이제는')]].forEach(([lab, tt], i) => {
      popChip(lab, 520 + i * 440, 560, 60, t, tt, i === 2 ? { bg: C.cyan, color: C.bg0 } : DARKCHIP(C.white));
      if (i) arrow(520 + (i - 1) * 440 + 120, 560, 520 + i * 440 - 130, 560, C.amber, 7, E.out(P(t, tt, .5)));
    });
    ctx.restore();
  }
};
SC[12] = (t, s, e) => {
  const k = k_(12);
  title('평생직장 → 평생 직업', 230, 64, t, s + .1);
  popChip('평생직장', 620, 420, 54, t, k('평생직장'), DARKCHIP(C.muted)); if (t > k('없습니다')) xmark(620, 420, 60, t, k('없습니다'));
  popChip('평생 직업', 1300, 420, 58, t, k('평생 직업'), { bg: C.green, color: C.bg0 });
  const X = ag => 360 + (ag - 40) / 45 * 1200, y = 700;
  const kl = E.out(P(t, k('정년'), 1.2)); if (kl > 0) line(X(40), y, X(40) + (X(85) - X(40)) * kl, y, C.dim, 5);
  const mk = (ag, tt, lab, col) => { const kk = pop(t, tt, .5); if (kk <= 0) return; if (kk < .05) cue('pop', tt); withT(X(ag), y, kk, 0, 1, () => { circle(0, 0, 16, col); text(lab, 0, -60, 36, { w: 800, color: col }); }); };
  mk(60, k('정년'), '60세 정년', C.white);
  const k20 = E.out(P(t, k('20년'), .8)); if (k20 > 0) { line(X(60), y, X(60) + (X(82) - X(60)) * k20, y, C.amber, 10); label('20년 넘게 더', (X(60) + X(82)) / 2, y + 60, 36, t, k('20년'), { color: C.amber, w: 800 }); }
  mk(40, k('40대'), '40대: 두 번째 커리어 준비', C.green);
};
SC[13] = (t, s, e) => {
  const k = k_(13);
  const a = vis(t, s, k('반대로'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title("다시, '소득 절벽' 5년", 230, 58, t, s + .1, { color: C.red });
    const tp = k('300만'); popChip('월 300만 원', 520, 420, 44, t, tp, DARKCHIP(C.white));
    if (t > tp + .3) text('×', 760, 420, 70, { w: 900, color: C.muted, alpha: E.out(P(t, tp + .3, .3)) });
    popChip('60개월', 960, 420, 44, t, tp + .5, DARKCHIP(C.white));
    if (t > k('1억')) text('=', 1150, 420, 70, { w: 900, color: C.muted });
    bigNum('1억 8천만 원', 1450, 420, 72, t, k('1억'), C.red);
    [['개인연금', C.green], ['퇴직연금', C.amber], ['일하는 소득', C.cyan]].forEach(([lab, col], i) => {
      const tt = at(13, lab), kk = E.back(P(t, tt, .5)); if (kk <= 0) return; if (kk < .05) cue('stamp', tt);
      panel(460 + i * 340, 640 - (1 - Math.min(1, kk)) * 120, 320, 140, { r: 14, fill: col, stroke: null, alpha: Math.min(1, kk) });
      text(lab, 620 + i * 340, 710 - (1 - Math.min(1, kk)) * 120, 40, { w: 900, color: C.bg0, alpha: Math.min(1, kk) });
    });
    label('5년의 빈칸을 미리 메운다', W / 2, 850, 36, t, k('메워'), { color: C.white });
    ctx.restore();
  }
  const b = vis(t, k('반대로'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('국민연금, 늦게 받으면 (연기연금)', 230, 54, t, k('반대로'));
    const items = [0, 1, 2, 3, 4, 5].map(n => ({ label: (65 + n) + '세', val: 100 + 7.2 * n, t0: k('1년 늦게') + n * .35, color: n === 5 ? C.green : C.cyan, text: n ? '+' + (7.2 * n).toFixed(1).replace('.0', '') + '%' : '100%' }));
    barChart(items, 360, 800, 1200, 440, 140, t, { gap: 50, lsize: 30, vsize: 36 });
    stampC('최대 +36%', 1500, 300, 56, t, k('36%'), C.green);
    quoteBox('일할 수 있다면, 늦게 받는 것도 전략', 880, 40, t, k('늦게 받는 것도'), C.white);
    ctx.restore();
  }
};
SC[14] = (t, s, e) => {
  const k = k_(14);
  title('건강도 자산입니다', 240, 64, t, s + .1);
  const kh = pop(t, k('건강도'), .6); if (kh > 0) heart(560, 540, 2.6 * kh * (1 + .05 * Math.sin(t * 6)), C.red);
  label('65세 이상 1인당 진료비 (1년)', 1260, 420, 36, t, k('500만'), { color: C.muted });
  bigNum('500만 원+', 1260, 520, 110, t, k('500만'), C.amber);
  label('오래 일하려면, 오래 건강해야', 1260, 650, 40, t, k('오래 일하려면'), { color: C.white, w: 700 });
  quoteBox('운동 = 수익률이 가장 높은 투자', 830, 46, t, k('운동은'), C.green);
};
SC[15] = (t, s, e) => {
  const k = k_(15);
  title('연령대별 체크리스트', 210, 60, t, s + .1);
  const cols = [['20·30대', C.cyan, k('20대와'), [['연금계좌 지금 열기', '연금계좌'], ['몸값 올릴 기술', '기술에']]],
                ['40대', C.amber, k('40대는'), [['두 번째 커리어 설계', '두 번째'], ['부동산 비중 점검', '부동산']]],
                ['50대', C.red, k('50대는'), [['소득 절벽 5년 대비', '소득 절벽'], ['연금 받을 시기 설계', '연금 받을']]]];
  cols.forEach(([head, col, tt, items], i) => {
    const kk = E.out(P(t, tt, .6)); if (kk <= 0) return; if (kk < .05) cue('swoosh', tt);
    const x = 360 + i * 600;
    ctx.save(); ctx.globalAlpha *= kk;
    panel(x - 270, 300 - (1 - kk) * 40, 540, 540, { r: 22, fill: 'rgba(12,18,32,.9)', stroke: col, lw: 3 });
    text(head, x, 370, 60, { w: 900, color: col });
    items.forEach(([lab, kw], j) => { const tj = at(15, kw); const kj = E.out(P(t, tj, .4)); if (kj <= 0) return;
      check(x - 200, 500 + j * 150, 22, t, tj, col); text(lab, x - 160, 500 + j * 150, 36, { w: 800, align: 'left', alpha: kj }); });
    ctx.restore();
  });
};
SC[16] = (t, s, e) => {
  const k = k_(16);
  title('오늘의 7가지 전략', 190, 60, t, s + .1);
  const L = [['연금 3층 탑', '연금 3층'], ['시간과 복리', '시간과'], ['집 한 채 올인 금지', '집 한 채'], ['세계로 분산', '세계로'], ['귀해지는 일', '귀해지는'], ['커지는 시니어 시장', '커지는'], ['AI를 부리는 사람', 'AI를']];
  L.forEach(([lab, kw], i) => { const tt = at(16, kw), kk = E.out(P(t, tt, .4)); if (kk <= 0) return; if (kk < .05) cue('pop', tt);
    const col = i < 4 ? C.cyan : C.amber, x = i < 4 ? 300 : 1060, y = 330 + (i < 4 ? i : i - 4) * 135;
    ctx.save(); ctx.globalAlpha *= kk;
    circle(x + 40, y, 44, col); text(String(i + 1), x + 40, y + 3, 48, { w: 900, color: C.bg0 });
    text(lab, x + 110 + (1 - kk) * 40, y, 46, { w: 800, align: 'left' });
    ctx.restore(); });
};
SC[17] = (t, s, e) => {
  const k = k_(17);
  const a = vis(t, s, k('벼랑'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('인구는 한 사람이 바꿀 수 없지만', 400, 58, t, s + .1, { color: C.muted });
    title('내 준비는 오늘부터 바꿀 수 있다', 540, 72, t, k('하지만'), { color: C.amber });
    ctx.restore();
  }
  const b = vis(t, k('벼랑'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    cliff(300, 420, 700, 360, E.out(P(t, k('벼랑'), 1.2)), C.red);
    const kb = E.out(P(t, k('다리를'), 1.2));
    if (kb > 0) { line(1000, 480, 1000 + 620 * kb, 480, C.green, 10); for (let i = 0; i <= 6; i++) if (i / 6 <= kb) line(1000 + i * 100, 480, 1000 + i * 100, 780, C.green, 4, .8); cue('whoosh', k('다리를')); }
    label('미리 다리를 놓는 사람', 1310, 860, 50, t, k('다리를'), { color: C.green, w: 900 });
    ctx.restore();
  }
};
SC[18] = (t, s, e) => {
  const k = k_(18);
  const a = vis(t, s, k('이 영상이'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('7가지 중, 이미 하고 있는 건 몇 개?', 280, 58, t, s + .1);
    for (let i = 0; i <= 7; i++) popChip(String(i), 470 + i * 140, 470, 50, t, s + .6 + i * .1, i === 7 ? { bg: C.green, color: C.bg0 } : DARKCHIP(C.white));
    quoteBox('댓글로 숫자를 남겨 주세요', 680, 50, t, k('댓글로'), C.amber);
    ctx.restore();
  }
  const b = vis(t, k('이 영상이'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    subscribeRow(W / 2, 400, t, k('구독과'));
    circle(W / 2, 640, 80 * E.back(P(t, k('감사합니다'), .6)), C.red, .9);
    text('지식파노라마', W / 2, 640, 40, { w: 900, alpha: E.out(P(t, k('지식파노라마'), .5)) });
    label('끝까지 시청해 주셔서 감사합니다', W / 2, 800, 40, t, k('감사합니다'), { color: C.white });
    ctx.restore();
  }
};
