"""Helen Keller v4, JFK-style: continuous cut (v3) + on-screen words popping in as Bill says them,
photo cards on the left with words on the right, archival film clips, background music, film grain.

usage: render4.py plan | segment N | count | music | mux OUT
"""
import json, math, os, re, subprocess, sys, wave
import numpy as np
import cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render2 import (W, H, FPS, SR, WORK, MOVES, WHITE, DARK, GOLD, CREAM, load_srt, sub_spr, src_path, load_rgb,
                     kb, vignette, put, photo_card, blur_bg, T, serif, lower3, where, quote_over, stamp, jolt,
                     lin, ease_out, back, fade, text_spr)
from render3 import XF, word_time
from labels import L as LABELS

F_BIG = '/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf'
F_MID = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
CLIPS = os.path.join(WORK, 'footage', 'clips')
COL_X, COL_W = 1450, 840          # words column (right side)
CARD_X = 640                      # photo card x when words are on screen

# music sections by paragraph (default 'main')
MOOD = {**{p: 'somber' for p in ('P08', 'P09', 'P17', 'P58', 'P59', 'P60', 'P65', 'P66', 'P67', 'P71', 'P72', 'P73')},
        **{p: 'tension' for p in ('P11', 'P22', 'P35', 'P50', 'P57')}}
MUSIC = {
    'main': "Instrumental only, absolutely no vocals. Warm nostalgic early-20th-century American documentary underscore, "
            "gentle solo piano with soft string pad, about 72 bpm, reflective and hopeful. Steady with no big build-ups or hits, "
            "unobtrusive background under narration, seamless loop",
    'tension': "Instrumental only, absolutely no vocals. Restrained tension documentary underscore, low pulsing cellos and "
               "muted timpani, sparse high string tremolo, about 80 bpm, suspenseful but restrained, no big hits, "
               "unobtrusive background under narration, seamless loop",
    'somber': "Instrumental only, absolutely no vocals. Very quiet somber elegy, sparse slow solo piano notes with a soft "
              "distant string drone, about 56 bpm, grieving and dignified, lots of space. No build-ups, no hits, seamless loop",
}
GAIN_DB = {'main': -19, 'tension': -19, 'somber': -21}  # 3 dB louder than the JFK mix, at the user's request

EXTRA_PHOTOS = {  # paragraph: [(photo, name bar or None)]
    'P04': [('c00_eisenhower-with-helen-1953.jpg', ('Dwight D. Eisenhower', '1890 – 1969')),
            ('c00_kennedy-meets-helen-1961.jpg', ('John F. Kennedy', '1917 – 1963'))],
    'P38': [('c09_twain-hutton-helen-anne-1902.jpg', None)],
    'P46': [('c11_helen-and-luther-burbank-1925.jpg', ('Luther Burbank', '1849 – 1926'))],
    'P63': [('c16_helen-with-akita-kenzan-go.jpg', None)],
    'P67': [('c17_japan-visit-1948.jpg', None), ('c17_tel-aviv-deaf-club-1952.jpg', None), ('c17_japan-visit-1955.jpg', None)],
    'P71': [('c17_eleanor-roosevelt-and-helen-marthas-vineyard.jpg', ('Eleanor Roosevelt', '1884 – 1962'))],
    'P69': [('c18_miracle-worker-broadway-1960-a.jpg', None)],
    'P70': [('c18_miracle-worker-broadway-1960-b.jpg', None)],
    'P74': [('c19_alabama-quarter-2003.jpg', None)],
}


# ------------------------------------------------------------------ plan
def load_clips():
    path = os.path.join(CLIPS, 'manifest.json')
    if not os.path.exists(path):
        return []
    out = []
    for m in json.load(open(path)):
        f = os.path.join(CLIPS, m['file'])
        if os.path.exists(f) and m.get('duration', 0) >= 3.0:
            out.append(m)
    return out


def plan4():
    p3 = json.load(open(os.path.join(WORK, 'plan3.json')))
    tl = json.load(open(os.path.join(WORK, 'plan.json')))['timeline']
    paras = {e['id']: e for e in tl if e['type'] == 'para'}
    cuts = p3['cuts']
    # archival film: per paragraph, replace painting cuts, then context photos, then split long cuts, until its clips are used
    clips = load_clips()
    subs = load_srt()
    used = set()
    def fit(c, cand):
        need = c['t1'] - c['t0']
        ok = [m for m in cand if m['duration'] >= min(need * 0.6, 6.0)]
        return min(ok, key=lambda m: (not m.get('has_helen'), abs(m['duration'] - need))) if ok else None
    for pid in sorted({c.get('pid') for c in cuts if c.get('pid')}):
        cand = lambda: [m for m in clips if m['file'] not in used and pid in m.get('paragraphs', [])]
        mine = lambda: [c for c in cuts if c.get('pid') == pid and 'stack' not in c and not c.get('clip')]
        order = sorted(mine(), key=lambda c: (not c['v'].startswith('pt'), 'helen' in c['v']))
        for c in order:
            if 'helen' in c['v'] and not c['v'].startswith('pt'):
                continue  # keep real photos of Helen
            if c.get('card') == 'open':
                continue  # the film opens on the colour painting of the pump
            m = fit(c, cand())
            if m:
                used.add(m['file']); c['clip'] = m['file']; c['clip_dur'] = m['duration']
        while cand():
            longest = max(mine() + [c for c in cuts if c.get('pid') == pid and c.get('clip')], key=lambda c: c['t1'] - c['t0'], default=None)
            if not longest or longest['t1'] - longest['t0'] < 7.5:
                break
            mid = (longest['t0'] + longest.get('lead', 0) + longest['t1']) / 2
            starts = [a_ for a_, b_, _ in subs if longest['t0'] + longest.get('lead', 0) + 2.5 < a_ < longest['t1'] - 2.5]
            if not starts:
                break
            cutp = min(starts, key=lambda a_: abs(a_ - mid))
            new_c = {'t0': cutp, 't1': longest['t1'], 'v': longest['v'], 'pid': pid, 'calm': longest.get('calm', False)}
            if longest.get('end_at') is not None:
                new_c['end_at'] = longest.pop('end_at')
            longest['t1'] = cutp
            m = fit(new_c, cand())
            if not m:
                longest['t1'] = new_c['t1']
                if 'end_at' in new_c: longest['end_at'] = new_c['end_at']
                break
            used.add(m['file']); new_c['clip'] = m['file']; new_c['clip_dur'] = m['duration']
            cuts.insert(cuts.index(longest) + 1, new_c)
    # photos the user supplied from Wikimedia Commons: take a painting cut, else split the paragraph's longest cut
    for pid, files in EXTRA_PHOTOS.items():
        for f, bar in files:
            st = next((c for c in cuts if c.get('pid') == pid and 'stack' in c), None)
            if st:
                st['stack'][-1] = [f, st['stack'][-1][1]]
                continue
            mine = [c for c in cuts if c.get('pid') == pid and 'stack' not in c and not c.get('card') and not c.get('extra')]
            spot = next((c for c in mine if c['v'].startswith('pt') and not c.get('clip')), None)
            if spot is None:  # a context photo, then a film clip that does not show Helen
                spot = next((c for c in mine if not c.get('clip') and 'helen' not in c['v']), None)
            if spot is None:
                spot = next((c for c in mine if c.get('clip') and 'helen' not in c['clip'] and 'talk1930' not in c['clip']), None)
            if spot is None and 'helen' in f:  # a photo of Helen may take the place of another photo of her
                spot = next((c for c in mine if not c.get('clip')), None)
            if spot is None:
                longest = max(mine, key=lambda c: c['t1'] - c['t0'], default=None)
                starts = [a_ for a_, b_, _ in subs if longest and longest['t0'] + 2.5 < a_ < longest['t1'] - 2.5]
                if not starts:
                    continue
                mid = (longest['t0'] + longest['t1']) / 2
                cutp = min(starts, key=lambda a_: abs(a_ - mid))
                spot = {'t0': cutp, 't1': longest['t1'], 'pid': pid, 'calm': longest.get('calm', False)}
                if longest.get('end_at') is not None:
                    spot['end_at'] = longest.pop('end_at')
                longest['t1'] = cutp
                cuts.insert(cuts.index(longest) + 1, spot)
            spot['v'] = f; spot['extra'] = True
            spot.pop('clip', None); spot.pop('clip_dur', None)
            if bar:
                spot['lower3'] = bar
    for i, c in enumerate(cuts):
        c['i'] = i
    # every para-level cut that is not a photo also gets a free film clip if one is left for its chapter
    # words: absolute times
    words = []
    for pid, items in LABELS.items():
        ev = paras[pid]
        for txt, phrase, style in items:
            t = word_time(pid, ev['start'], phrase)
            if t is not None:
                words.append({'pid': pid, 't': round(t, 3), 'txt': txt, 'style': style})
    words.sort(key=lambda w: w['t'])
    # assign each word to the cut that is showing; words in one cut stack, max 3 visible
    for w in words:
        i = max(k for k, c in enumerate(cuts) if c['t0'] <= w['t'])
        w['cut'] = i
        cuts[i].setdefault('words', 0)
        cuts[i]['words'] += 1
    for c in cuts:
        c.pop('stamp', None); c.pop('stamp_t', None)  # the JFK cut has no stamps
        if c.get('words'):
            c.pop('quote', None)  # words take the place of the centre quote
    # music sections
    secs, cur = [], None
    for e in tl:
        mood = MOOD.get(e.get('id'), 'main') if e['type'] == 'para' else (cur[0] if cur else 'main')
        if cur and cur[0] == mood:
            cur[2] = e['end']
        else:
            if cur: secs.append(cur)
            cur = [mood, e['start'], e['end']]
    secs.append(cur)
    json.dump({'duration': p3['duration'], 'cuts': cuts, 'words': words, 'music': secs},
              open(os.path.join(WORK, 'plan4.json'), 'w'), indent=1)
    print(len(cuts), 'cuts,', sum(1 for c in cuts if c.get('clip')), 'film clips,', len(words), 'words,', len(secs), 'music sections')


# ------------------------------------------------------------------ film clips
_CAP = {}


def clip_frame(name, t_rel, cut_len, clip_dur):
    """Frame of an archival clip at cut-relative time; slows down (≥0.6x) to fill the cut, then ping-pongs."""
    rate = min(1.0, max(0.6, clip_dur / max(cut_len + XF, 0.1)))
    ct = t_rel * rate
    period = clip_dur - 0.05
    if ct > period:  # ping-pong
        k = int(ct // period); r = ct - k * period
        ct = r if k % 2 == 0 else period - r
    cap = _CAP.get(name)
    if cap is None:
        for k in list(_CAP):
            _CAP.pop(k)[0].release()
        cap = [cv2.VideoCapture(os.path.join(CLIPS, name)), -1, None]
        _CAP[name] = cap
    want = int(ct * FPS)
    if want < cap[1] or want > cap[1] + 15:
        cap[0].set(cv2.CAP_PROP_POS_FRAMES, want); cap[1] = want - 1
    while cap[1] < want:
        ok, fr = cap[0].read()
        if not ok:
            break
        cap[1] += 1; cap[2] = fr
    return cap[2]


_BOX = {}


def content_box(name, fr):
    if name not in _BOX:
        g = fr.max(axis=2)
        cols = np.where(g.max(axis=0) > 24)[0]; rows = np.where(g.max(axis=1) > 24)[0]
        _BOX[name] = (int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1) if len(cols) and len(rows) else (0, 0, W, H)
    return _BOX[name]


def draw_clip(c, u, k, words_on=False):
    fr = clip_frame(c['clip'], u, c['t1'] - c['t0'], c['clip_dur'])
    if fr is None:
        return np.zeros((H, W, 3), np.float32)
    x0, y0, x1, y1 = content_box(c['clip'], fr)
    content = fr[y0:y1, x0:x1]
    ch, cw = content.shape[:2]
    if cw / ch > 1.6 and not words_on:  # already widescreen: fill with a slow push-in
        return kb(content, k, (0.5, 0.5, 1.0), (0.5, 0.5, 1.08))
    small = cv2.resize(content, (max(8, cw // 8), max(8, ch // 8)), interpolation=cv2.INTER_AREA)
    s = max(W / small.shape[1], H / small.shape[0])
    bg = cv2.resize(small, (int(small.shape[1] * s) + 2, int(small.shape[0] * s) + 2), interpolation=cv2.INTER_LINEAR)
    bg = cv2.GaussianBlur(bg, (0, 0), 6)[:H, :W].astype(np.float32) * 0.4
    C = np.zeros((H, W, 3), np.float32)
    C[:bg.shape[0], :bg.shape[1]] = bg
    z = 1.0 + 0.06 * k
    sc = H / ch * z * (min(0.82, 1180 / (cw * H / ch)) if words_on else 1.0)
    fw, fh = int(cw * sc), int(ch * sc)
    big = cv2.resize(content, (fw, fh), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    xa = (W - fw) // 2 if not words_on else int(CARD_X - fw / 2); ya = (H - fh) // 2
    sx0, sy0 = max(0, -xa), max(0, -ya)
    dx0, dy0 = max(0, xa), max(0, ya)
    w_, h_ = min(fw - sx0, W - dx0), min(fh - sy0, H - dy0)
    C[dy0:dy0 + h_, dx0:dx0 + w_] = big[sy0:sy0 + h_, sx0:sx0 + w_]
    return C


# ------------------------------------------------------------------ words
_FIT = {}


def word_sprite(txt, style):
    key = (txt, style)
    if key not in _FIT:
        if style == 'sub':
            size, font, color = 60, F_MID, GOLD
        else:
            size, font, color = 104, F_BIG, WHITE
        lines = [txt]
        spr = text_spr(txt, size, color, DARK, max(4, int(size * 0.09)), font, 0.7)
        if spr.shape[1] > COL_W and ' ' in txt and style != 'sub':
            words_ = txt.split(' ')
            best = min(range(1, len(words_)), key=lambda i: abs(len(' '.join(words_[:i])) - len(' '.join(words_[i:]))))
            lines = [' '.join(words_[:best]), ' '.join(words_[best:])]
        sprs = []
        for ln in lines:
            s_ = size
            while True:
                sp = text_spr(ln, s_, color, DARK, max(4, int(s_ * 0.09)), font, 0.7)
                if sp.shape[1] <= COL_W or s_ <= 40:
                    break
                s_ = int(s_ * 0.92)
            sprs.append(sp)
        _FIT[key] = sprs
    return _FIT[key]


def num_text(txt, frac):
    m = re.search(r'\d+', txt)
    if not m:
        return txt
    v = int(m.group())
    return txt[:m.start()] + str(int(round(v * ease_out(frac)))) + txt[m.end():]


def draw_words(C, t, cuts, words, i):
    """Words of the current cut stack in the right-hand column, popping in; at most 3 at a time."""
    mine = [w for w in words if w['cut'] == i and w['t'] <= t]
    if not mine:
        return
    c = cuts[i]
    end = c['t1'] - 0.15
    page = mine[(len(mine) - 1) // 3 * 3:]  # pages of up to 3 words
    y = 250 if not c.get('where') else 300
    for w in page:
        sprs = word_sprite(w['txt'], w['style'])
        a = min(1.0, (t - w['t']) / 0.15) * (1 - lin(t, end - 0.25, end))
        if w['style'] == 'num' and t - w['t'] < 1.2:
            sprs = word_sprite(num_text(w['txt'], (t - w['t']) / 1.2), 'num')
        pop = 0.5 + 0.5 * back(lin(t, w['t'], w['t'] + 0.32))
        for sp in sprs:
            h = sp.shape[0]
            put(C, sp, COL_X, y + h / 2, pop, a)
            y += h * 0.82
        y += 26


# ------------------------------------------------------------------ frame
def draw_cut(c, t, words_on):
    u = t - c['t0']
    lead = c.get('lead', 0.0)
    d = max(3.0, c['t1'] - c['t0'] + XF)
    k = lin(u, 0, d)
    v = c['v']
    if c.get('clip'):
        C = draw_clip(c, u, k, words_on)
        vignette(C, 0.35)
    elif 'stack' in c:
        C = kb(blur_bg(v).clip(0, 255).astype(np.uint8), k, (0.5, 0.5, 1.0), (0.5, 0.5, 1.06))
        vignette(C, 0.4)
        n = len(c['stack'])
        xs = ({1: [640], 2: [420, 900], 3: [300, 690, 1080]} if words_on else {1: [960], 2: [640, 1280], 3: [400, 960, 1520]})[n]
        rots = [-3, 2, -2]
        for j, (f, at) in enumerate(c['stack']):
            if u < at:
                continue
            card = photo_card(f, maxh=560 if n == 3 else 640, maxw=(440 if words_on else 520) if n == 3 else 760)
            r = ease_out(lin(u, at, at + 0.7))
            hh, ww = card.shape[:2]
            M = cv2.getRotationMatrix2D((ww / 2, hh / 2), rots[j], 1.0)
            card = cv2.warpAffine(card, M, (ww, hh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
            pop = 0.55 + 0.45 * back(lin(u, at, at + 0.45))
            put(C, card, xs[j], 520 + 120 * (1 - r), pop * (1.0 + 0.03 * lin(u, at, at + 12)), min(1, (u - at) / 0.3))
    elif v.startswith('pt'):
        C = kb(load_rgb(src_path(v)), k, *MOVES[c['i'] % 6])
        vignette(C, 0.3)
    else:
        zin = c['i'] % 2 == 0
        bg = blur_bg(v)
        s = (1.0 + 0.08 * k) if zin else (1.08 - 0.08 * k)
        hh, ww = bg.shape[:2]
        M = np.float32([[s, 0, W / 2 - s * ww / 2], [0, s, H / 2 - s * hh / 2]])
        C = cv2.warpAffine(bg, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        vignette(C, 0.4)
        sc = (1.0 + 0.12 * k) if zin else (1.12 - 0.12 * k)
        if words_on:
            card = photo_card(v, maxh=760, maxw=1000)
            put(C, card, CARD_X, 520 + 30 * (1 - ease_out(lin(u, 0, 0.9))), sc * 0.94, 1.0)
        else:
            put(C, photo_card(v), 960, 515 + 30 * (1 - ease_out(lin(u, 0, 0.9))), sc, 1.0)
    if c.get('card') == 'open':
        C *= 1 - 0.55 * (1 - lin(u, 4.6, 5.8))
        T(C, 'THE LIFE OF', 960, 390, u, 0.4, 58, GOLD, DARK, 4.8, serif('Cinzel.ttf'), bounce=False)
        T(C, 'Helen Keller', 960, 520, u, 0.7, 150, WHITE, DARK, 4.8, serif('Playfair.ttf'), bounce=True, glow=0.9)
        T(C, '1880 – 1968', 960, 650, u, 1.1, 54, CREAM, DARK, 4.8, serif('EBGaramond.ttf'), bounce=False)
    elif c.get('card') == 'chapter':
        C *= 1 - 0.55 * (lin(u, 0, 0.6) * (1 - lin(u, lead - 0.6, lead + 0.4)))
        T(C, f'CHAPTER {c["num"]}', 960, 420, u, 0.4, 58, GOLD, DARK, lead - 0.5, serif('Cinzel.ttf'), bounce=False, glow=0.5)
        tsize = 118 if len(c['title']) <= 20 else max(80, int(118 * 20 / len(c['title'])))
        T(C, c['title'], 960, 540, u, 0.65, tsize, WHITE, DARK, lead - 0.5, serif('Playfair.ttf'), bounce=True, glow=0.8)
    if c.get('end_at') is not None and t >= c['end_at']:
        e = t - c['end_at']
        C *= 1 - 0.5 * lin(e, 0, 0.8)
        T(C, 'Helen Adams Keller', 960, 470, e, 0.3, 110, WHITE, DARK, None, serif('Playfair.ttf'), bounce=False, glow=0.9)
        T(C, 'June 27, 1880  –  June 1, 1968', 960, 590, e, 0.6, 52, CREAM, DARK, None, serif('EBGaramond.ttf'), bounce=False)
    pu = u - lead
    span = c['t1'] - c['t0'] - lead
    if c.get('lower3'):
        lower3(C, pu, *c['lower3'], t0=0.6, out_t=min(span, 6.0) - 0.5)
    if c.get('where') and not words_on:
        where(C, pu, c['where'], 0.5, min(span, 7.0) - 0.5)
    if c.get('quote'):
        quote_over(C, pu, c['quote'], 0.6, span - 0.7)
    if c.get('stamp'):
        stamp(C, t - c['stamp_t'], c['stamp'], 0.0)
    return C


_SUB = {}


def sub_dark(text):
    """Subtitle: white text on a black box."""
    if text not in _SUB:
        from PIL import Image, ImageDraw, ImageFont
        f = ImageFont.truetype(F_MID, 52)
        lines = text.split('\n')
        d0 = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
        rb = d0.textbbox((0, 0), 'Hg', font=f)
        lh = rb[3] - rb[1] + 14
        tw = max(d0.textlength(l, font=f) for l in lines)
        w_, h_ = int(tw) + 52, lh * len(lines) + 24
        im = Image.new('RGBA', (w_, h_), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, w_ - 1, h_ - 1), fill=(0, 0, 0, 225))
        for i, l in enumerate(lines):
            d.text(((w_ - d.textlength(l, font=f)) / 2, 12 + i * lh - rb[1] + 4), l, font=f, fill=(255, 255, 255, 255))
        _SUB[text] = np.asarray(im).astype(np.float32)
    return _SUB[text]


_GRAIN = None


def finish(C, n):
    """JFK finish: light film grain and a faint flicker."""
    global _GRAIN
    if _GRAIN is None:
        rng = np.random.default_rng(3)
        _GRAIN = [rng.normal(0, 1.6 * 2.2, (H // 2, W // 2)).astype(np.float32) for _ in range(6)]
    g = cv2.resize(_GRAIN[n % 6], (W, H), interpolation=cv2.INTER_NEAREST)
    C += g[..., None]
    C *= 1.0 + 0.006 * math.sin(n * 2.1)
    return C


def frame(cuts, words, subs, i, t, dur, n):
    c = cuts[i]
    won = any(w['cut'] == i for w in words)
    C = draw_cut(c, t, won)
    if i > 0 and t < c['t0'] + XF:
        a = lin(t, c['t0'], c['t0'] + XF)
        pw = any(w['cut'] == i - 1 for w in words)
        C = C * a + draw_cut(cuts[i - 1], t, pw) * (1 - a)
        draw_words(C, t, cuts, words, i - 1) if a < 0.5 else None
    if c.get('stamp'):
        C = jolt(C, t, c['stamp_t'] + 0.22, 8)
    draw_words(C, t, cuts, words, i)
    C = finish(C, n)
    C *= lin(t, 0, 1.0) * (1 - lin(t, dur - 2.5, dur))
    for a_, b_, s_ in subs:
        if a_ <= t < b_:
            put(C, sub_dark(s_), 960, 1010, 1.0, 1.0, (0.5, 1.0))
            break
    return C


def segments(cuts):
    segs, cur = [], []
    for c in cuts:
        if c.get('card') == 'chapter' and cur:
            segs.append(cur); cur = []
        cur.append(c)
    segs.append(cur)
    return segs


def render_segment(idx):
    p = json.load(open(os.path.join(WORK, 'plan4.json')))
    cuts, words, subs, dur = p['cuts'], p['words'], load_srt(), p['duration']
    seg = segments(cuts)[idx]
    first = seg[0]['i']
    n0, n1 = round(seg[0]['t0'] * FPS), round(seg[-1]['t1'] * FPS)
    os.makedirs(os.path.join(WORK, 'seg4'), exist_ok=True)
    out = os.path.join(WORK, 'seg4', f'seg{idx:03d}.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS),
                           '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '2', out],
                          stdin=subprocess.PIPE)
    k = 0
    for n in range(n0, n1):
        t = n / FPS
        while k + 1 < len(seg) and t >= seg[k + 1]['t0']:
            k += 1
        C = frame(cuts, words, subs, first + k, t, dur, n)
        ff.stdin.write(np.clip(C, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    print('segment', idx, 'frames', n1 - n0, 'done', flush=True)


# ------------------------------------------------------------------ music (ElevenLabs Music through fal.ai)
def gen_music():
    import urllib.request, time
    hdr = {'Authorization': 'Key ' + os.environ['FAL_KEY'].strip(), 'Content-Type': 'application/json'}
    out = os.path.join(WORK, 'music'); os.makedirs(out, exist_ok=True)
    for name, prompt in MUSIC.items():
        dst = os.path.join(out, f'music_{name}.mp3')
        if os.path.exists(dst):
            continue
        body = {'prompt': prompt, 'music_length_ms': 120000, 'force_instrumental': True}
        q = json.load(urllib.request.urlopen(urllib.request.Request('https://queue.fal.run/fal-ai/elevenlabs/music',
                                                                    json.dumps(body).encode(), hdr), timeout=120))
        for _ in range(200):
            st = json.load(urllib.request.urlopen(urllib.request.Request(q['status_url'], headers=hdr), timeout=60))
            if st['status'] == 'COMPLETED':
                break
            time.sleep(4)
        r = json.load(urllib.request.urlopen(urllib.request.Request(q['response_url'], headers=hdr), timeout=60))
        url = r.get('audio', {}).get('url') or r.get('audio_file', {}).get('url')
        if not url:
            print(name, 'FAILED', json.dumps(r)[:300]); continue
        urllib.request.urlretrieve(url, dst)
        print(name, 'ok', flush=True)


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def mix(out_wav):
    p = json.load(open(os.path.join(WORK, 'plan4.json')))
    with wave.open(os.path.join(WORK, 'narration.wav')) as w_:
        nar = np.frombuffer(w_.readframes(w_.getnframes()), np.int16).astype(np.float32) / 32768
    speech = nar[np.abs(nar) > 0.01]
    ref = float(np.sqrt((speech ** 2).mean()))
    total = np.zeros_like(nar)
    tracks = {k: decode(os.path.join(WORK, 'music', f'music_{k}.mp3')) for k in MUSIC}
    for mood, a, b in p['music']:
        a_, b_ = int(a * SR), min(len(nar), int((b + 1.5) * SR))
        n = b_ - a_
        src = tracks[mood]
        xf = int(3 * SR)
        buf = np.zeros(n + xf, np.float32); pos = 0
        while pos < n:  # loop with 3 s crossfades
            seg = src.copy()
            if pos:
                seg[:xf] *= np.linspace(0, 1, xf); buf[pos:pos + xf] *= np.linspace(1, 0, xf)
            m = min(len(seg), len(buf) - pos)
            buf[pos:pos + m] += seg[:m]; pos += len(src) - xf
        buf = buf[:n]
        rms = float(np.sqrt((buf ** 2).mean())) or 1.0
        buf *= ref * 10 ** (GAIN_DB[mood] / 20) / rms
        fi, fo = int(2.5 * SR), int(3.0 * SR)
        buf[:fi] *= np.linspace(0, 1, min(fi, n))[:len(buf[:fi])]
        buf[-fo:] *= np.linspace(1, 0, min(fo, n))
        total[a_:b_] += buf
    m = nar + total
    peak = np.abs(m).max()
    if peak > 0.97:
        m *= 0.97 / peak
    with wave.open(out_wav, 'wb') as w_:
        w_.setnchannels(1); w_.setsampwidth(2); w_.setframerate(SR)
        w_.writeframes((m * 32767).astype(np.int16).tobytes())


def mux(out):
    p = json.load(open(os.path.join(WORK, 'plan4.json')))
    n = len(segments(p['cuts']))
    lst = os.path.join(WORK, 'seg4', 'list.txt')
    with open(lst, 'w') as f:
        for i in range(n):
            f.write(f"file 'seg{i:03d}.mp4'\n")
    wav = os.path.join(WORK, 'mix4.wav')
    mix(wav)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', wav,
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
                    '-movflags', '+faststart', '-shortest', out], check=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'plan':
        plan4()
    elif cmd == 'segment':
        render_segment(int(sys.argv[2]))
    elif cmd == 'count':
        print(len(segments(json.load(open(os.path.join(WORK, 'plan4.json')))['cuts'])))
    elif cmd == 'music':
        gen_music()
    elif cmd == 'mux':
        mux(sys.argv[2])
