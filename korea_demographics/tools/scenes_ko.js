// =================== 인구절벽 scenes (one per paragraph) ===================
// Every scene is a pure function of t. KW(pi,'키워드') = the second the narrator says that word.
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
function hashtag(x, y, t, t0) { const k = E.out(P(t, t0, .4)); if (k > 0) text('#인구절벽 #지식파노라마', x, y, 26, { w: 600, color: C.muted, alpha: k }); }

// =================== scenes ===================
// 0 hook: 절반 → 연금 → 네 가지 탈출구
SC[0] = (t, s, e) => {
  const k = w => at(0, w);
  clipBG('v00_seoul-crowd', t, s, vis(t, s, k('오늘'), .6, .6));
  const a = vis(t, s, k('오늘'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('지금 이 영상을 보고 계신 분 중', 330, 52, t, s + .1, { color: C.muted, w: 600 });
    bigNum('절반', W / 2, 500, 200, t, k('절반'), C.red);
    label('은퇴할 때쯤, 연금을 제대로 못 받을 수도', W / 2, 660, 44, t, k('연금'), { w: 700, color: C.white });
    stamp('과장이 아닙니다', W / 2, 820, 64, t, k('아닙니다'), C.amber, .06); if (t >= k('아닙니다')) cue('stamp', k('아닙니다'));
    ctx.restore();
  }
  const b = vis(t, k('오늘'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('오늘, 숫자로 보여드립니다', 380, 72, t, k('오늘'));
    const t4 = k('네 가지');
    ['① 출산율', '② 정년 연장', '③ 이민', '④ 생산성'].forEach((s2, i) => { const tt = t4 + i * .18; const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(400 + i * 373, 560, kk, 0, 1, () => chip(s2, 0, 0, 34, { bg: 'rgba(16,24,42,.95)', stroke: C.amber, color: C.amber })); } });
    label('전문가들이 입을 모으는 네 가지 탈출구, 영상 끝에', W / 2, 690, 36, t, k('탈출구'), { w: 600, color: C.white });
    ctx.restore();
  }
};
// 1 greeting + comment prompt
SC[1] = (t, s, e) => {
  const k = w => at(1, w);
  circle(W / 2, 420, 110 * E.back(P(t, s, .6)), C.red, .9);
  text('지식', W / 2, 400, 58, { w: 900, alpha: E.out(P(t, s + .2, .5)) });
  text('파노라마', W / 2, 455, 40, { w: 700, alpha: E.out(P(t, s + .3, .5)) });
  title('안녕하세요, 지식파노라마입니다', 620, 56, t, k('안녕하세요'));
  const tq = k('어디서');
  if (t > tq) { cue('pop', tq); const kk = pop(t, tq, .5); withT(W / 2, 780, kk, 0, 1, () => { panel(-520, -60, 1040, 120, { r: 24, stroke: C.amber, lw: 3 }); text('지금 어디서 보고 계신가요?  댓글에 지역을 적어 주세요', 0, 2, 38, { w: 800, color: C.amber }); }); }
};
// 2 super-aged society: 20% ring + years-to-super-aged bar chart
SC[2] = (t, s, e) => {
  const k = w => at(2, w);
  clipBG('v02_elderly-park', t, s, vis(t, s, k('고령사회에서'), .6, .6), .5);
  const a = vis(t, s, k('고령사회에서'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    bigNum('2024.12.23', W / 2, 300, 96, t, s + .1, C.amber);
    const r = P(t, k('20'), 1.2); const pct = Math.round(20 * E.out(r));
    ring(W / 2, 600, 150, 'rgba(255,255,255,.1)', 28);
    if (r > 0) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 28; ctx.lineCap = 'round'; ctx.shadowColor = C.red; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(W / 2, 600, 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .2 * E.out(r)); ctx.stroke(); ctx.restore(); }
    text(pct + '%', W / 2, 600, 90, { w: 900, color: C.red, alpha: r > 0 ? 1 : 0 });
    label('65세 이상 인구', W / 2, 800, 36, t, k('65세'), { color: C.white });
    stamp('초고령사회', W / 2, 900, 64, t, k('초고령사회')); if (t >= k('초고령사회')) cue('stamp', k('초고령사회'));
    ctx.restore();
  }
  const b = vis(t, k('고령사회에서'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('고령사회 → 초고령사회, 몇 년 걸렸나', 230, 54, t, k('고령사회에서'));
    barChart([{ label: '일본', val: 10, t0: k('일본은'), text: '10년' }, { label: '독일', val: 37, t0: k('독일은'), text: '37년' }, { label: '프랑스', val: 40, t0: k('프랑스는'), text: '40년' }, { label: '한국', val: 7, t0: k('7년'), color: C.red, text: '7년' }],
      360, 800, 1200, 440, 44, t, { gap: 80 });
    stamp('7년 만에', W / 2 + 420, 420, 70, t, k('뛰어서'), C.red); if (t >= k('뛰어서')) cue('stamp', k('뛰어서'));
    ctx.restore();
  }
};
// 3 fertility 0.7 + questions
SC[3] = (t, s, e) => {
  const k = w => at(3, w);
  const a = vis(t, s, k('이 두'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    label('합계출산율', W / 2, 300, 44, t, s + .1, { color: C.muted });
    bigNum('0.7명', W / 2, 500, 220, t, k('0.7'), C.red);
    stamp('세계 최저', W / 2, 720, 72, t, k('가장 낮습니다')); if (t >= k('가장 낮습니다')) cue('stamp', k('가장 낮습니다'));
    ctx.restore();
  }
  const b = vis(t, k('이 두'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    bigNum('20%', 560, 380, 120, t, k('이 두'), C.red); bigNum('0.7', 1360, 380, 120, t, k('이 두') + .2, C.amber);
    qmark(W / 2, 390, 150, t, k('무슨 일'));
    const tq = k('인구절벽'); stamp('인구절벽', W / 2, 600, 86, t, tq); if (t >= tq) cue('stamp', tq);
    ['내 월급', '내 집값', '내 연금'].forEach((s2, i) => { const tt = at(3, s2); const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(560 + i * 400, 800, kk, 0, 1, () => iconCard(0, 0, 320, 150, () => [I.coin, I.house, I.doc][i](C.amber), s2, t, tt - 1)); } });
    ctx.restore();
  }
};
// 4 births 100만 → 23만, fertility line with 2.1 target
SC[4] = (t, s, e) => {
  const k = w => at(4, w);
  clipBG('v04_empty-playground', t, s, vis(t, s, k('출산율은'), .6, .6), .55);
  const a = vis(t, s, k('출산율은'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('한 해에 태어난 아이', 230, 54, t, s + .1);
    barChart([{ label: '1970년', val: 100, t0: k('100만'), text: '100만 명' }, { label: '2023년', val: 23, t0: k('23만'), color: C.red, text: '23만 명' }], 560, 820, 800, 460, 100, t, { gap: 200, lsize: 34, vsize: 44 });
    stamp('¼로', W / 2 + 500, 420, 90, t, k('4분의 1'), C.red); if (t >= k('4분의 1')) cue('stamp', k('4분의 1'));
    ctx.restore();
  }
  const b = vis(t, k('출산율은'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('합계출산율', 230, 54, t, k('출산율은'));
    const x0 = 360, y0 = 820, w = 1200, h = 480;
    axes(x0, y0, w, h, 1, '', '');
    ['2018', '2023', '2025'].forEach((yr, i) => text(yr, x0 + [0.25, 0.7, 0.95][i] * w, y0 + 34, 26, { w: 600, color: C.muted }));
    const ty = y0 - h * (2.1 / 2.4);
    line(x0, ty, x0 + w, ty, C.amber, 3, E.out(P(t, k('2.1명'), .5)), [14, 10]);
    text('인구 유지선 2.1명', x0 + w - 10, ty - 24, 28, { w: 700, color: C.amber, align: 'right', alpha: E.out(P(t, k('2.1명'), .5)) });
    const pts = [[0, 1.05 / 2.4], [.25, .98 / 2.4], [.5, .84 / 2.4], [.7, .72 / 2.4], [.85, .75 / 2.4], [.95, .79 / 2.4]];
    const kk = P(t, k('2023년'), 1.6) * .75 + P(t, k('반등'), .8) * .25;
    const end = lineChart(pts, x0, y0, w, h, kk, C.red, 7);
    if (end) { circle(end[0], end[1], 12, C.red); }
    if (t > k('0.72')) text('0.72', x0 + .7 * w, y0 - h * (.72 / 2.4) + 48, 40, { w: 900, color: C.red });
    if (t > k('0.8')) text('0.8', x0 + .95 * w, y0 - h * (.79 / 2.4) - 40, 36, { w: 900, color: C.white });
    quoteBox('반등이 아니라, 추락 속도가 조금 느려진 것', 930, 40, t, k('느려진'));
    ctx.restore();
  }
};
// 5 baby boom wave: 1,700만; 80만 vs 20만
SC[5] = (t, s, e) => {
  const k = w => at(5, w);
  clipBG('v05_retirement-wave', t, s, vis(t, s, k('들어오는'), .6, .6), .5);
  const a = vis(t, s, k('들어오는'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('베이비붐 세대 (1955 – 1974년생)', 300, 54, t, k('베이비붐'));
    const n = counter(0, 1700, t, k('1,700만'), 1.6);
    bigNum(fmt(n) + '만 명', W / 2, 470, 150, t, k('1,700만'), C.amber);
    label('매년 70만 ~ 90만 명씩 65세로', W / 2, 640, 46, t, k('70만'), { color: C.white, w: 700 });
    ctx.restore();
  }
  const b = vis(t, k('들어오는'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    barChart([{ label: '태어나는 아이', val: 20, t0: k('20만'), color: C.cyan, text: '20만 명대' }, { label: '65세가 되는 사람', val: 80, t0: k('80만'), color: C.red, text: '80만 명대' }], 560, 760, 800, 420, 90, t, { gap: 220, lsize: 34, vsize: 44 });
    label('매년 · 앞으로 15년', W / 2, 850, 36, t, k('15년'), { color: C.amber });
    quoteBox('진짜 문제는 지금부터입니다', 960, 44, t, k('진짜'), C.red);
    ctx.restore();
  }
};
// 6 working-age population line: 3,763만 → 2,900만 → 1,658만
SC[6] = (t, s, e) => {
  const k = w => at(6, w);
  const a = vis(t, s, k('한국의'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title("'생산연령인구'", 420, 110, t, k('생산연령인구'), { color: C.amber });
    label('15 ~ 64세 · 일하고, 소비하고, 세금을 내는 사람들', W / 2, 560, 42, t, k('15세'), { color: C.white, w: 600 });
    ['일하고', '소비하고', '세금'].forEach((w2, i) => { const tt = at(6, w2); const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(560 + i * 400, 760, kk, 0, 1, () => iconCard(0, 0, 320, 150, () => [I.factory, I.shop, I.bank][i](C.white), ['일한다', '소비한다', '세금을 낸다'][i], t, tt - 1)); } });
    ctx.restore();
  }
  const b = vis(t, k('한국의'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('생산연령인구 (만 명)', 220, 50, t, k('한국의'));
    const x0 = 360, y0 = 840, w = 1200, h = 520;
    axes(x0, y0, w, h, 1, '', '');
    const yrs = [['2019', 0.13], ['2040', 0.53], ['2072', 1.0]];
    yrs.forEach(([yr, u]) => text(yr, x0 + u * w, y0 + 34, 28, { w: 600, color: C.muted }));
    const v = n => n / 4000;
    const pts = [[0, v(3400)], [.13, v(3763)], [.53, v(2900)], [1, v(1658)]];
    const kk = P(t, k('3,763만'), .6) * .13 + P(t, k('2040년'), 1.0) * .4 + P(t, k('2072년'), 1.0) * .47;
    const end = lineChart(pts, x0, y0, w, h, kk, C.red, 8);
    if (end) circle(end[0], end[1], 12, C.red);
    if (t > k('3,763만')) text('3,763만', x0 + .13 * w, y0 - h * v(3763) - 40, 40, { w: 900, color: C.amber });
    if (t > k('2040년')) text('2,900만', x0 + .53 * w, y0 - h * v(2900) - 40, 40, { w: 900, color: C.white });
    if (t > k('2072년')) text('1,658만', x0 + 1 * w, y0 - h * v(1658) - 40, 40, { w: 900, color: C.red, align: 'right' });
    stamp('절반 이하', W / 2 + 300, 420, 72, t, k('절반')); if (t >= k('절반')) cue('stamp', k('절반'));
    ctx.restore();
  }
};
// 7 speed: 30만 vs 50만 per year; cliff
SC[7] = (t, s, e) => {
  const k = w => at(7, w);
  const a = vis(t, s, k('이것이'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('매년 사라지는 생산연령인구', 230, 54, t, s + .1);
    barChart([{ label: '2020년대', val: 30, t0: k('30만'), color: C.amber, text: '30만 명 / 년' }, { label: '2030년대', val: 50, t0: k('50만'), color: C.red, text: '50만 명 이상 / 년' }], 560, 760, 800, 400, 55, t, { gap: 220, lsize: 34, vsize: 40 });
    const tu = k('울산'); const kk = pop(t, tu, .5);
    if (kk > 0) { if (kk < .05) cue('pop', tu); withT(1560, 520, kk, 0, 1, () => { withT(0, -40, 1.3, 0, 1, () => I.factory(C.white)); text('= 울산 하나', 0, 70, 34, { w: 800, color: C.amber }); text('매년', 0, 110, 26, { w: 600, color: C.muted }); }); }
    ctx.restore();
  }
  const b = vis(t, k('이것이'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    clipBG('v07_cliff-edge', t, k('이것이'), b, .45);
    stamp('인구절벽', W / 2, 300, 96, t, k('인구절벽')); if (t >= k('인구절벽')) cue('stamp', k('인구절벽'));
    cliff(300, 480, 1320, 420, P(t, k('완만한'), 2.2));
    text('2020년대', 420, 950, 30, { w: 600, color: C.muted }); text('2030년대', 1140, 950, 30, { w: 600, color: C.red, alpha: E.out(P(t, k('2030년대'), .4)) });
    label('우리는 지금, 그 벼랑 끝에 서 있습니다', W / 2, 880, 40, t, k('벼랑 끝'), { color: C.white, w: 700 });
    ctx.restore();
  }
};
// 8 mid-roll subscribe + "다섯 번째가 가장 무섭습니다"
SC[8] = (t, s, e) => {
  const k = w => at(8, w);
  const a = vis(t, s, k('그리고'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    quoteBox('"이거 우리 집 얘기 아니야?"', 330, 56, t, s + .2, C.amber);
    subscribeRow(W / 2, 560, t, k('구독'), { bell: false });
    label('지식파노라마가 숫자 이야기를 계속 파고드는 힘', W / 2, 720, 36, t, k('힘'), { color: C.white });
    ctx.restore();
  }
  const b = vis(t, k('그리고'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('내 삶에 오는 다섯 가지 충격', 330, 64, t, k('다섯 가지'));
    for (let i = 0; i < 5; i++) { const tt = k('다섯 가지') + .3 + i * .15; const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(400 + i * 280, 560, kk, 0, 1, () => { circle(0, 0, 70, i === 4 ? C.red : 'rgba(16,24,42,.95)'); ring(0, 0, 70, i === 4 ? C.red : C.line, 3); text(String(i + 1), 0, 4, 60, { w: 900 }); }); } }
    stamp('5번째가 가장 무섭습니다', W / 2, 780, 60, t, k('다섯 번째'), C.red, -.05); if (t >= k('다섯 번째')) cue('stamp', k('다섯 번째'));
    ctx.restore();
  }
};
// 9 growth stops: potential growth line → 0% → minus
SC[9] = (t, s, e) => {
  const k = w => at(9, w);
  chapterCard('SHOCK 01', '성장이 멈춘다', '첫 번째 충격', t, s, k('경제 성장은')); if (t >= s) cue('impact', s);
  const b = vis(t, k('경제 성장은'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    text('경제 성장 = 일하는 사람 수 × 생산성', W / 2, 250, 44, { w: 800, color: C.amber, alpha: E.out(P(t, k('경제 성장은'), .5)) });
    const x0 = 360, y0 = 700, w = 1200, h = 400; // y0 is the 0% line
    line(x0, y0, x0 + w, y0, C.dim, 3); text('0%', x0 - 50, y0, 30, { w: 700, color: C.muted });
    text('잠재성장률', x0 + 10, y0 - h - 10, 26, { w: 600, color: C.muted, align: 'left' });
    [['2020년대', 0.1], ['2040년대', 0.55], ['2050년대', 0.95]].forEach(([yr, u]) => text(yr, x0 + u * w, y0 + 200, 28, { w: 600, color: C.muted }));
    const pts = [[0, .55], [.1, .5], [.3, .35], [.55, .05], [.75, 0], [.95, -.2]];
    const kk = P(t, k('한국은행'), .8) * .3 + P(t, k('0%'), .9) * .45 + P(t, k('마이너스'), .9) * .25;
    const end = lineChart(pts, x0, y0, w, h, kk, C.red, 8);
    if (end) circle(end[0], end[1], 12, C.red);
    if (t > k('0%')) text('0%대', x0 + .55 * w, y0 - 60, 40, { w: 900, color: C.amber });
    if (t > k('마이너스')) text('마이너스 성장', x0 + .95 * w, y0 + 110, 40, { w: 900, color: C.red, align: 'right' });
    quoteBox('성장이 당연했던 나라 → 성장이 예외인 나라', 960, 40, t, k('예외'));
    ctx.restore();
  }
};
// 10 consumption cools
SC[10] = (t, s, e) => {
  const k = w => at(10, w);
  chapterCard('SHOCK 02', '소비가 식는다', '두 번째 충격', t, s, k('집을'));
  if (t >= s) cue('impact', s);
  const b = vis(t, k('집을'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    [['집', '집을', I.house], ['차', '차를', I.rocket], ['교육', '교육', I.doc]].forEach(([lbl, kw, ic], i) => { const tt = k(kw); const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(560 + i * 400, 420, kk, 0, 1, () => iconCard(0, 0, 320, 200, () => ic(C.white), lbl, t, tt - 1)); } });
    const td = k('줄면'); if (t > td) { xmark(560, 420, 60, t, td); xmark(960, 420, 60, t, td + .15); xmark(1360, 420, 60, t, td + .3); cue('buzz', td); }
    label('30~40대가 줄면, 내수 시장이 쪼그라든다', W / 2, 640, 42, t, k('내수'), { color: C.white, w: 700 });
    const tb = k('부담'); if (t > tb) { withT(W / 2, 820, pop(t, tb, .5), 0, 1, () => { withT(-220, 0, 1.4, 0, 1, () => I.house(C.amber)); text('자산', -220, 90, 30, { w: 700, color: C.muted }); arrow(-110, 0, 110, 0, C.red, 8, E.out(P(t, tb, .5))); withT(220, 0, 1.4, 0, 1, () => I.house(C.red)); text('부담', 220, 90, 30, { w: 800, color: C.red }); }); cue('stamp', tb); }
    ctx.restore();
  }
};
// 11 no workers: 89만
SC[11] = (t, s, e) => {
  const k = w => at(11, w);
  chapterCard('SHOCK 03', '일할 사람이 없다', '세 번째 충격', t, s, k('지금의'));
  if (t >= s) cue('impact', s);
  const b = vis(t, k('지금의'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    clipBG('v11_shipyard', t, k('조선소'), E.out(P(t, k('조선소'), .6)) * b, .5);
    const n = counter(0, 89, t, k('89만'), 1.4);
    bigNum(n + '만 명', W / 2, 380, 150, t, k('89만'), C.amber);
    label('2032년까지 더 필요한 노동력', W / 2, 520, 40, t, k('2032년'), { color: C.white });
    ['조선소', '건설 현장', '농촌', '요양시설'].forEach((s2, i) => { const tt = at(11, s2); const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(420 + i * 360, 760, kk, 0, 1, () => chip(s2, 0, 0, 36, { bg: 'rgba(16,24,42,.95)', stroke: C.white, color: C.white })); } });
    label('이미 외국인 노동자 없이는 돌아가지 않는다', W / 2, 900, 38, t, k('외국인'), { color: C.red, w: 700 });
    ctx.restore();
  }
};
// 12 pensions: 100 workers support 24 → 104
SC[12] = (t, s, e) => {
  const k = w => at(12, w);
  chapterCard('SHOCK 04', '연금이 흔들린다', '네 번째 충격', t, s, k('2022년'));
  if (t >= s) cue('impact', s);
  const b = vis(t, k('2022년'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('생산연령인구 100명이 부양하는 노인', 220, 50, t, k('2022년'));
    const draw = (x, yr, n, tt, color) => {
      const kk = E.out(P(t, tt, 1.2)); if (kk <= 0) return;
      if (kk < .05) cue('pop', tt);
      text(yr, x, 330, 44, { w: 900, color });
      const shown = Math.round(n * kk);
      for (let i = 0; i < shown; i++) { const r = Math.floor(i / 13), c = i % 13; person(x - 240 + c * 40, 420 + r * 44, .32, color); }
      text(shown + '명', x, 820, 90, { w: 900, color });
    };
    draw(560, '2022년', 24, k('2022년'), C.cyan); draw(1360, '2072년', 104, k('2072년'), C.red);
    text('→', W / 2, 600, 90, { w: 900, color: C.muted, alpha: E.out(P(t, k('2072년'), .5)) });
    const tp = k('미룬'); const kp = E.out(P(t, tp, .5));
    if (kp > 0) { ctx.save(); ctx.globalAlpha *= kp; panel(260, 905, 1400, 120, { r: 20, stroke: C.amber }); text('연금 개혁(2025): 고갈 2050년대 중반 → 2060년대 — 미룬 것일 뿐, 해결은 아니다', W / 2, 965, 34, { w: 700, color: C.amber }); ctx.restore(); cue('stamp', tp); }
    ctx.restore();
  }
};
// 13 regions vanish: 229 dots, half red
SC[13] = (t, s, e) => {
  const k = w => at(13, w);
  chapterCard('SHOCK 05', '지방이 먼저 사라진다', '다섯 번째 충격', t, s, k('전국'));
  if (t >= s) cue('impact', s);
  const b = vis(t, k('전국'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    clipBG('v13_empty-school', t, k('학교가'), E.out(P(t, k('학교가'), .6)) * b * (1 - .5 * E.out(P(t, k('버스가'), .5))), .55);
    clipBG('v13b_shuttered-street', t, k('버스가'), E.out(P(t, k('버스가'), .6)) * b, .55);
    title('전국 229개 시군구', 230, 54, t, k('전국'));
    const kk = E.out(P(t, k('229개'), 1.0)), kr = E.out(P(t, k('절반'), 1.4));
    const cols = 23, n = 229, sz = 28, x0 = W / 2 - (cols - 1) * sz / 2, y0 = 330;
    for (let i = 0; i < Math.round(n * kk); i++) { const r = Math.floor(i / cols), c = i % cols; const red = hash(i * 3) < kr * .55 * 1.0 && i < n; circle(x0 + c * sz, y0 + r * sz, 9, red ? C.red : 'rgba(160,190,255,.55)'); }
    if (kr > 0) { stamp('절반 이상 소멸위험', W / 2, 700, 62, t, k('절반'), C.red, -.05); cue('stamp', k('절반')); }
    ['학교', '병원', '버스'].forEach((s2, i) => { const tt = at(13, s2 + (i === 1 ? '이' : '가')); if (t > tt) { const x = 560 + i * 400; withT(x, 800, pop(t, tt, .4), 0, 1, () => chip(s2, 0, 0, 36, { bg: 'rgba(16,24,42,.95)', stroke: C.white, color: C.white })); xmark(x + 90, 800, 26, t, tt + .2); if (t < tt + .05) cue('buzz', tt); } });
    label('아까 댓글에 적어 주신 그 지역은, 지금 어디쯤일까요?', W / 2, 880, 36, t, k('아까'), { color: C.amber, w: 600 });
    ctx.restore();
  }
};
// 14 already started: 36만→27만, 33만→13만
SC[14] = (t, s, e) => {
  const k = w => at(14, w);
  const a = vis(t, s, k('2024년'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    quoteBox('"그래도 아직 시간은 있지 않나요?"', 420, 56, t, s + .1, C.white);
    stamp('이미 시작됐습니다', W / 2, 640, 80, t, k('이미'), C.red); if (t >= k('이미')) cue('stamp', k('이미'));
    ctx.restore();
  }
  const b = vis(t, k('2024년'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    title('초등학교 1학년', 500, 230, 44, t, k('2024년'), { x: 560 }); title('20세 남성', 1360, 230, 44, t, k('2020년'), { x: 1360 });
    barChart([{ label: '2024', val: 36, t0: k('36만'), color: C.cyan, text: '36만' }, { label: '2027', val: 27, t0: k('27만'), color: C.red, text: '27만' }], 400, 760, 320, 380, 40, t, { gap: 60, lsize: 28, vsize: 36 });
    barChart([{ label: '2020', val: 33, t0: k('33만'), color: C.cyan, text: '33만' }, { label: '2040', val: 13, t0: k('13만'), color: C.red, text: '13만' }], 1200, 760, 320, 380, 40, t, { gap: 60, lsize: 28, vsize: 36 });
    stamp('-25%', 560, 300, 56, t, k('25%'), C.red); if (t >= k('25%')) cue('stamp', k('25%'));
    const tm = k('50만 병력'); if (t > tm) { chip('50만 병력 유지', 1360, 300, 34, { bg: 'rgba(16,24,42,.95)', stroke: C.white, color: C.white, alpha: E.out(P(t, tm, .4)) }); xmark(1360, 300, 44, t, tm + .3); cue('buzz', tm + .3); }
    ctx.restore();
  }
};
// 15 Japan 1.3–1.4 vs Korea 0.7
SC[15] = (t, s, e) => {
  const k = w => at(15, w);
  title('일본이 먼저 걸은 길 — 20년 전', 250, 54, t, s + .1);
  const x0 = 360, y0 = 820, w = 1200, h = 460; axes(x0, y0, w, h, 1, '', '');
  const v = n => n / 2.0;
  const kj = P(t, k('잃어버린'), 1.4), kk = P(t, k('우리는'), 1.2);
  const ej = lineChart([[0, v(1.4)], [.5, v(1.35)], [1, v(1.3)]], x0, y0, w, h, kj, C.amber, 7);
  if (t > k('1.3에서')) text('일본 1.3 ~ 1.4', x0 + 1 * w, y0 - h * v(1.35) - 40, 36, { w: 900, color: C.amber, align: 'right' });
  const ek = lineChart([[0, v(1.4)], [.3, v(1.0)], [.6, v(.72)], [1, v(.5)]], x0, y0, w, h, kk, C.red, 8);
  if (ek) circle(ek[0], ek[1], 12, C.red);
  if (t > k('0.7')) text('한국 0.7', x0 + .6 * w, y0 - h * v(.72) + 50, 40, { w: 900, color: C.red });
  text('잃어버린 30년', x0 + 10, y0 - h - 16, 28, { w: 700, color: C.muted, align: 'left', alpha: E.out(P(t, k('잃어버린'), .5)) });
  stamp('두 배 빠르게, 두 배 깊게', W / 2 + 200, 420, 60, t, k('두 배'), C.red, -.05); if (t >= k('두 배')) cue('stamp', k('두 배'));
};
// 16 solutions intro
SC[16] = (t, s, e) => {
  const k = w => at(16, w);
  const a = vis(t, s, k('그런데'), .4, .4);
  if (a > 0) { ctx.save(); ctx.globalAlpha *= a; title('여기서 끄시면, 절망만 남습니다', 520, 64, t, s + .1); ctx.restore(); }
  chapterCard('SOLUTIONS', '네 가지 해법', '전문가들이 입을 모으는', t, k('그런데'), e); if (t >= k('그런데')) cue('impact', k('그런데'));
  const t4 = k('네 가지');
  ['① 출산율 반등', '② 일하는 기간 연장', '③ 이민', '④ 생산성 혁명'].forEach((s2, i) => { const tt = t4 + .2 + i * .2; const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(380 + i * 387, 760, kk, 0, 1, () => chip(s2, 0, 0, 32, { bg: C.red })); } });
};
// 17 solution 1: birth rate
SC[17] = (t, s, e) => {
  const k = w => at(17, w);
  clipBG('v17_young-family', t, s, vis(t, s, e, .6, .3), .55);
  chip('해법 ①', 300, 150, 30, { bg: C.red, alpha: E.out(P(t, s, .4)) });
  title('출산율 반등', 290, 90, t, k('출산율'));
  const tm = k('돈만으로는'); if (t > tm) { chip('현금 지원', W / 2, 440, 40, { bg: 'rgba(16,24,42,.95)', stroke: C.white, color: C.white, alpha: E.out(P(t, tm, .4)) }); xmark(W / 2 + 150, 440, 36, t, tm + .3); cue('buzz', tm + .3); }
  ['집값', '사교육비', '장시간 노동', '경력 단절'].forEach((s2, i) => { const tt = at(17, s2); const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(400 + i * 373, 620, kk, 0, 1, () => chip(s2, 0, 0, 36, { bg: C.red })); } });
  quoteBox("'아이를 낳으면 인생이 무너진다'는 공식을 깨야", 820, 40, t, k('공식'), C.amber);
};
// 18 solution 2: working longer 60 → 65 → 70
SC[18] = (t, s, e) => {
  const k = w => at(18, w);
  clipBG('v18_older-worker', t, s, vis(t, s, e, .6, .3), .55);
  chip('해법 ②', 300, 150, 30, { bg: C.red, alpha: E.out(P(t, s, .4)) });
  title('일하는 기간을 늘리는 것', 290, 80, t, k('일하는'));
  const x0 = 460, y = 600; line(x0, y, x0 + 1000, y, C.dim, 6);
  [['60세', 0, s + .3, C.muted, '정년'], ['65세', .5, k('65세'), C.amber, '한국 연장'], ['70세', 1, k('70세'), C.green, '일본 고용 기회']].forEach(([lbl, u, tt, col, sub]) => { const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(x0 + u * 1000, y, kk, 0, 1, () => { circle(0, 0, 26, col); text(lbl, 0, -70, 54, { w: 900, color: col }); text(sub, 0, 70, 28, { w: 600, color: C.muted }); }); } });
  arrow(x0 + 30, y, x0 + 970, y, C.amber, 6, E.out(P(t, k('연장'), 1.0)));
};
// 19 solution 3: immigration
SC[19] = (t, s, e) => {
  const k = w => at(19, w);
  chip('해법 ③', 300, 150, 30, { bg: C.red, alpha: E.out(P(t, s, .4)) });
  title('이민', 290, 90, t, k('이민'));
  const kf = E.out(P(t, k('인구가'), 1.0));
  if (kf > 0) { for (let i = 0; i < 14; i++) { const tt = k('인구가') + i * .08; const kk = pop(t, tt, .5); if (kk > 0) person(300 + i * 100, 520, .9 * kk, i < 9 ? 'rgba(160,190,255,.8)' : C.green); } }
  flow(120, 520, 300, 520, 0, t, 10, C.green, .6, E.out(P(t, k('이민 없이'), .6)), 7);
  quoteBox('이민 없이 성장을 유지한 선진국은 없다', 700, 42, t, k('없습니다'), C.white);
  label("'받을 것인가'가 아니라 '어떻게 통합할 것인가'", W / 2, 860, 40, t, k('통합'), { color: C.amber, w: 700 });
};
// 20 solution 4: productivity
SC[20] = (t, s, e) => {
  const k = w => at(20, w);
  clipBG('v20_robot-factory', t, s, vis(t, s, e, .6, .3), .5);
  chip('해법 ④', 300, 150, 30, { bg: C.red, alpha: E.out(P(t, s, .4)) });
  title('생산성 혁명', 290, 90, t, k('생산성'));
  const tp = k('더 많이'); if (t > tp) { withT(W / 2, 560, pop(t, tp, .5), 0, 1, () => { person(-260, 0, 1.3, C.white); text('×', -100, 0, 80, { w: 900, color: C.muted }); withT(90, 0, 1.3, 0, 1, () => I.gear(60, 10, C.amber, t * .8)); withT(260, 0, 1.3, 0, 1, () => I.chip(C.cyan)); }); cue('pop', tp); }
  ['AI', '로봇', '자동화'].forEach((s2, i) => { const tt = k(i === 2 ? '로봇' : s2) + (i === 2 ? .3 : 0); const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(560 + i * 400, 760, kk, 0, 1, () => chip(s2, 0, 0, 40, { bg: 'rgba(16,24,42,.95)', stroke: C.cyan, color: C.cyan })); } });
  stamp('선택이 아니라 생존 조건', W / 2, 900, 56, t, k('생존'), C.red, -.05); if (t >= k('생존')) cue('stamp', k('생존'));
};
// 21 conclusion: 25 years, cliff or bridge
SC[21] = (t, s, e) => {
  const k = w => at(21, w);
  const a = vis(t, s, k('하지만'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('오늘 태어난 아이가 일터에 나오기까지', 330, 50, t, s + .1, { color: C.muted });
    const n = counter(0, 25, t, k('25년'), 1.4); bigNum(n + '년', W / 2, 500, 180, t, k('25년'), C.amber);
    label('지금 아무것도 하지 않으면, 2050년의 한국은 이미 정해진 것', W / 2, 700, 40, t, k('2050년'), { color: C.white, w: 700 });
    ctx.restore();
  }
  const b = vis(t, k('하지만'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    clipBG('v21_bridge', t, k('다리를'), E.out(P(t, k('다리를'), .8)) * b, .45);
    cliff(300, 420, 700, 360, E.out(P(t, k('하지만'), 1.2)), C.red);
    const kb = E.out(P(t, k('다리를'), 1.2));
    if (kb > 0) { line(1000, 480, 1000 + 620 * kb, 480, C.green, 10); for (let i = 0; i <= 6; i++) if (i / 6 <= kb) line(1000 + i * 100, 480, 1000 + i * 100, 780, C.green, 4, .8); cue('whoosh', k('다리를')); }
    label('떨어질 것인가', 560, 880, 56, t, k('떨어질'), { color: C.red, w: 900 });
    label('다리를 놓을 것인가', 1360, 880, 56, t, k('다리를'), { color: C.green, w: 900 });
    ctx.restore();
  }
};
// 22 outro: poll ①–④, comment, next video, subscribe/like/bell
SC[22] = (t, s, e) => {
  const k = w => at(22, w);
  const a = vis(t, s, k('다음 영상'), .4, .4);
  if (a > 0) {
    ctx.save(); ctx.globalAlpha *= a;
    title('네 가지 해법 중, 가장 현실적인 것은?', 250, 56, t, s + .1);
    ['① 출산율 반등', '② 정년 연장', '③ 이민', '④ 생산성 혁명'].forEach((s2, i) => { const tt = s + .5 + i * .15; const kk = pop(t, tt, .5); if (kk > 0) { if (kk < .05) cue('pop', tt); withT(380 + i * 387, 420, kk, 0, 1, () => chip(s2, 0, 0, 32, { bg: 'rgba(16,24,42,.95)', stroke: C.amber, color: C.amber })); } });
    quoteBox('댓글로 들려주세요 — 적어 주신 그 지역은 지금 어떤 모습인가요?', 620, 38, t, k('댓글로'), C.white);
    ctx.restore();
  }
  const b = vis(t, k('다음 영상'), e, .4, .3);
  if (b > 0) {
    ctx.save(); ctx.globalAlpha *= b;
    const kn = E.out(P(t, k('다음 영상'), .5));
    if (kn > 0) { panel(310, 230, 1300, 150, { r: 24, stroke: C.cyan, lw: 3, alpha: kn }); text('다음 영상', 960, 275, 30, { w: 700, color: C.cyan, alpha: kn }); text('인구 변화 속에서 개인의 자산과 커리어를 준비하는 법', 960, 335, 40, { w: 800, alpha: kn }); }
    subscribeRow(W / 2, 560, t, k('구독과'));
    circle(W / 2, 800, 70 * E.back(P(t, k('지금까지'), .6)), C.red, .9);
    text('지식파노라마', W / 2, 800, 40, { w: 900, alpha: E.out(P(t, k('지식파노라마'), .5)) });
    label('끝까지 시청해 주셔서 감사합니다', W / 2, 920, 36, t, k('감사합니다'), { color: C.muted });
    ctx.restore();
  }
};
