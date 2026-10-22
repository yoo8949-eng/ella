"""Helen Keller v2: series-style render (colour oil paintings + real photo cards, big zooms, pops, SFX, burned-in subtitles).

Reuses the v1 narration timeline (WORK/plan.json, WORK/narration.wav, ../Helen_Keller_English.srt).

usage: render2.py plan | segment N | count | mux OUT
"""
import json, math, os, re, subprocess, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # helen_keller/
WORK = os.environ.get('HK_WORK', '/home/user/work')
PAINT = os.path.join(WORK, 'paint')
PHOTOS = os.path.join(ROOT, 'photos')
FONTS = os.path.join(ROOT, 'tools', 'fonts')
F_SANS = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
F_SUB = '/usr/share/fonts/opentype/inter/Inter-Medium.otf'
W, H, FPS, SR = 1920, 1080, 30, 44100
XF = 0.45

WHITE, DARK, GOLD, CREAM = (255, 255, 255), (18, 16, 16), (226, 178, 78), (246, 236, 214)

# ------------------------------------------------------------------ picture plan
PAINTS = {
    'P01': ['pt01', 'pt02'], 'P02': ['pt03'], 'P03': ['pt01'], 'P05': ['pt04'], 'P06': ['pt05'], 'P07': ['pt06'],
    'P08': ['pt07'], 'P09': ['pt08'], 'P10': ['pt09'], 'P11': ['pt10'], 'P12': ['pt11'], 'P13': ['pt12'],
    'P15': ['pt13'], 'P16': ['pt14'], 'P17': ['pt15'], 'P18': ['pt16'], 'P19': ['pt17'], 'P20': ['pt18'],
    'P21': ['pt19'], 'P22': ['pt20'], 'P23': ['pt21'], 'P24': ['pt22'], 'P25': ['pt01', 'pt02'], 'P26': ['pt23'],
    'P27': ['pt24'], 'P28': ['pt25'], 'P29': ['pt26'], 'P31': ['pt27'], 'P33': ['pt28'], 'P34': ['pt29'],
    'P35': ['pt30'], 'P36': ['pt31'], 'P37': ['pt32'], 'P39': ['pt33'], 'P40': ['pt34', 'pt35'], 'P41': ['pt36'],
    'P42': ['pt37'], 'P43': ['pt38'], 'P45': ['pt39'], 'P46': ['pt40'], 'P47': ['pt41'], 'P48': ['pt42'],
    'P49': ['pt43'], 'P50': ['pt44'], 'P51': ['pt45'], 'P52': ['pt46'], 'P53': ['pt47'], 'P54': ['pt48'],
    'P55': ['pt49'], 'P56': ['pt50'], 'P57': ['pt51'], 'P58': ['pt52'], 'P59': ['pt53'], 'P61': ['pt54', 'pt55'],
    'P62': ['pt56'], 'P63': ['pt57', 'pt58'], 'P64': ['pt59'], 'P65': ['pt60'], 'P66': ['pt61'], 'P67': ['pt62'],
    'P68': ['pt63'], 'P69': ['pt64'], 'P70': ['pt65'], 'P71': ['pt66'], 'P72': ['pt67'], 'P73': ['pt68'],
    'P76': ['pt01'],
}
CALM = {'P08', 'P17', 'P54', 'P57', 'P58', 'P59', 'P60', 'P65', 'P66', 'P67', 'P71', 'P73'}
STAMPS = {'P09': ('BLIND AND DEAF', 'completely deaf'), 'P42': ('CUM LAUDE', 'with honors'), 'P72': ('MEDAL OF FREEDOM', 'Medal of Freedom')}
PEOPLE = [  # (filename substring, name, dates) — name bar on the first appearance
    ('helen-c1888-profile', 'Helen Keller', '1880 – 1968'), ('arthur-h-keller', 'Captain Arthur Keller', '1836 – 1896'),
    ('kate-adams-keller', 'Kate Adams Keller', '1856 – 1921'), ('alexander-graham-bell', 'Alexander Graham Bell', '1847 – 1922'),
    ('charles-dickens', 'Charles Dickens', '1812 – 1870'), ('laura-bridgman', 'Laura Bridgman', '1829 – 1889'),
    ('michael-anagnos', 'Michael Anagnos', '1837 – 1906'), ('anne-sullivan', 'Anne Sullivan', '1866 – 1936'),
    ('mark-twain', 'Mark Twain', '1835 – 1910'), ('rogers-and-twain', 'Henry H. Rogers', '1840 – 1909'),
    ('helen-anne-and-polly', 'Polly Thomson', '1885 – 1960'), ('eugene-debs', 'Eugene V. Debs', '1855 – 1926'),
    ('lyndon-johnson', 'Lyndon B. Johnson', '1908 – 1973'), ('grover-cleveland', 'Grover Cleveland', '1837 – 1908'),
]


def parse_shotlist():
    shots, cur = {}, None
    for line in open(os.path.join(ROOT, 'shotlist.md'), encoding='utf-8'):
        line = line.rstrip()
        if line.startswith('## Optional'):
            break
        m = re.match(r'\*\*(P\d\d)\*\*', line)
        if m:
            cur = m.group(1); shots[cur] = {'photos': [], 'texts': []}; continue
        if not cur:
            continue
        m = re.match(r'- `([^`]+)`(.*)', line)
        if m:
            shots[cur]['photos'].append((m.group(1), '[R]' in m.group(2))); continue
        m = re.match(r'- \*\*TITLE CARD\*\*:\s*(.*)|- \*\(overlay\)\*\s*(.*)', line)
        if m:
            t = (m.group(1) or m.group(2)).strip()
            t = re.sub(r'\s*— no photo of Peter Fagan in PD sources', '', t)
            t = re.sub(r'\s*\((no PD photo|no public-domain)[^)]*\)', '', t).replace(' → ', ' · ')
            shots[cur]['texts'].append(t)
    return shots


# ------------------------------------------------------------------ helpers
def lin(t, a, b):
    return 0.0 if t <= a else 1.0 if t >= b else (t - a) / (b - a)


def ease_out(x):
    return 1 - (1 - x) ** 3


def back(x, s=1.70158):
    x -= 1
    return x * x * ((s + 1) * x + s) + 1


def fade(t, t0, d_in, t_out=None, d_out=0.25):
    a = lin(t, t0, t0 + d_in)
    if t_out is not None:
        a *= 1 - lin(t, t_out, t_out + d_out)
    return a


_IMG = {}


def load_rgb(path, max_side=2600):
    if path not in _IMG:
        im = Image.open(path).convert('RGB')
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        _IMG[path] = np.asarray(im)[:, :, ::-1].copy()  # BGR
        if len(_IMG) > 24:
            _IMG.pop(next(iter(_IMG)))
    return _IMG[path]


def src_path(v):
    return os.path.join(PAINT, v + '.png') if v.startswith('pt') else os.path.join(PHOTOS, v)


_VIG = {}


def vignette(C, amt):
    if amt not in _VIG:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2))
        a = np.clip((r - 0.55) / 0.75, 0, 1) ** 1.6
        _VIG[amt] = (1 - amt * a)[..., None].astype(np.float32)
    C *= _VIG[amt]


def zoom_center(C, z):
    M = np.float32([[z, 0, (1 - z) * W / 2], [0, z, (1 - z) * H / 2]])
    return cv2.warpAffine(C, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


MOVES_BIG = [((0.5, 0.52, 1.0), (0.5, 0.44, 1.34)), ((0.5, 0.44, 1.36), (0.5, 0.52, 1.02)), ((0.30, 0.5, 1.24), (0.70, 0.46, 1.30)),
             ((0.46, 0.54, 1.02), (0.62, 0.40, 1.36)), ((0.60, 0.40, 1.38), (0.46, 0.54, 1.04)), ((0.70, 0.5, 1.24), (0.30, 0.46, 1.30))]
MOVES = [((0.5, 0.52, 1.0), (0.5, 0.46, 1.20)), ((0.5, 0.46, 1.22), (0.5, 0.52, 1.02)), ((0.36, 0.5, 1.16), (0.64, 0.48, 1.20)),
         ((0.48, 0.52, 1.02), (0.58, 0.44, 1.22)), ((0.56, 0.44, 1.24), (0.48, 0.52, 1.04)), ((0.64, 0.5, 1.16), (0.36, 0.48, 1.20))]


def kb(img, k, a, b):
    """Full-screen picture with camera (x, y, zoom) interpolated a→b; clamped to the picture edges."""
    h, w = img.shape[:2]
    base = max(W / w, H / h)
    z = base * (a[2] + (b[2] - a[2]) * k)
    hw, hh = W / 2 / z, H / 2 / z
    cx = min(max((a[0] + (b[0] - a[0]) * k) * w, hw), w - hw)
    cy = min(max((a[1] + (b[1] - a[1]) * k) * h, hh), h - hh)
    M = np.float32([[z, 0, W / 2 - z * cx], [0, z, H / 2 - z * cy]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT).astype(np.float32)


# ------------------------------------------------------------------ sprites (RGBA float, premultiplied-free)
_SPR = {}


def shadowed(rgba, off=10, blur=18, strength=0.5):
    a = rgba[..., 3:4] / 255.0
    pad = blur * 2 + off
    h, w = rgba.shape[:2]
    out = np.zeros((h + pad * 2, w + pad * 2, 4), np.float32)
    sh = np.zeros(out.shape[:2], np.float32)
    sh[pad + off:pad + off + h, pad + off // 2:pad + off // 2 + w] = a[..., 0]
    out[..., 3] = np.clip(cv2.GaussianBlur(sh, (0, 0), blur * 0.6) * strength, 0, 1) * 255
    r = out[pad:pad + h, pad:pad + w]
    r[..., :3] = rgba[..., :3] * a + r[..., :3] * (1 - a)
    r[..., 3:4] = (a + r[..., 3:4] / 255.0 * (1 - a)) * 255
    return out


def put(C, spr, x, y, scale=1.0, alpha=1.0, anchor=(0.5, 0.5)):
    if alpha <= 0.003:
        return
    if abs(scale - 1.0) > 1e-3:
        h, w = spr.shape[:2]
        nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
        spr = cv2.resize(spr, (nw, nh), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR)
    h, w = spr.shape[:2]
    x0, y0 = int(round(x - w * anchor[0])), int(round(y - h * anchor[1]))
    xa, ya, xb, yb = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if xa >= xb or ya >= yb:
        return
    s = spr[ya - y0:yb - y0, xa - x0:xb - x0]
    a = s[..., 3:4] / 255.0 * alpha
    roi = C[ya:yb, xa:xb]
    roi *= 1 - a
    roi += s[..., :3] * a


def photo_card(name, maxh=740, maxw=1500):
    key = ('card', name, maxh, maxw)
    if key not in _SPR:
        im = load_rgb(src_path(name))
        h, w = im.shape[:2]
        s = min(maxh / h, maxw / w)
        im = cv2.resize(im, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
        rgba = np.dstack([im.astype(np.float32), np.full(im.shape[:2], 255, np.float32)])
        _SPR[key] = shadowed(rgba, 12, 22, 0.55)
    return _SPR[key]


def blur_bg(name):
    key = ('blur', name)
    if key not in _SPR:
        a = load_rgb(src_path(name))
        h, w = a.shape[:2]
        m = int(min(h, w) * 0.05)
        a = a[m:h - m, m:w - m]
        h, w = a.shape[:2]
        s = max(W * 1.25 / w, H * 1.25 / h)
        b = cv2.resize(a, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_LINEAR)
        _SPR[key] = cv2.GaussianBlur(b, (0, 0), 28).astype(np.float32) * 0.42 + np.array([8, 9, 10], np.float32)
    return _SPR[key]


def text_spr(txt, size, color, edge, stroke, font, glow=0.6):
    key = ('txt', txt, size, color, edge, stroke, font, glow)
    if key not in _SPR:
        f = ImageFont.truetype(font, size)
        d0 = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
        bb = d0.textbbox((0, 0), txt, font=f, stroke_width=stroke)
        pad = stroke + 4
        im = Image.new('RGBA', (bb[2] - bb[0] + pad * 2, bb[3] - bb[1] + pad * 2), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((pad - bb[0], pad - bb[1]), txt, font=f, fill=color[::-1] + (255,),
                                stroke_width=stroke, stroke_fill=edge[::-1] + (255,))
        arr = np.asarray(im).astype(np.float32)
        _SPR[key] = shadowed(arr, 4, max(6, int(size * 0.14)), glow * 1.8) if glow else arr
    return _SPR[key]


def T(C, txt, x, y, t, t0, size=72, color=WHITE, edge=DARK, out_t=None, font=F_SANS, bounce=True, anchor=(0.5, 0.5), glow=0.6):
    a = fade(t, t0, 0.15 if bounce else 0.25, out_t, 0.25)
    if a <= 0:
        return
    spr = text_spr(txt, size, color, edge, max(3, int(size * 0.08)), font, glow)
    s = 0.5 + 0.5 * back(lin(t, t0, t0 + 0.32)) if bounce else 1.0
    put(C, spr, x, y, s, a, anchor)


def serif(name):
    return os.path.join(FONTS, name)


def lower3(C, t, name, dates, t0=0.4, out_t=None, y=790):
    a = fade(t, t0, 0.35, out_t, 0.4)
    if a <= 0:
        return
    k = ease_out(lin(t, t0, t0 + 0.5))
    ns = text_spr(name, 66, WHITE, (10, 30, 22), 2, serif('Playfair.ttf'), 0)
    ds = text_spr(dates, 40, (236, 224, 196), (10, 30, 22), 1, serif('EBGaramond.ttf'), 0)
    bw = max(ns.shape[1], ds.shape[1]) + 120
    x1 = int(-bw * (1 - k) + bw)
    C[y - 64:y + 66, 0:max(0, x1)] = C[y - 64:y + 66, 0:max(0, x1)] * (1 - 0.86 * a) + np.array([34, 46, 16], np.float32) * 0.86 * a
    C[y - 66:y - 62, 0:max(0, x1)] = C[y - 66:y - 62, 0:max(0, x1)] * (1 - a) + np.array([90, 160, 196], np.float32) * a
    put(C, ns, x1 - bw + 50, y - 14, 1, a, (0, 0.5))
    put(C, ds, x1 - bw + 52, y + 38, 1, a, (0, 0.5))


def where(C, t, txt, t0=0.4, out_t=None):
    f = ImageFont.truetype(serif('Playfair.ttf'), 52)
    size = 52 if f.getlength(txt) < 1700 else int(52 * 1700 / f.getlength(txt))
    T(C, txt, 960, 92, t, t0, size, CREAM, DARK, out_t, serif('Playfair.ttf'), bounce=False, glow=0.8)


def quote_over(C, t, txt, t0=0.4, out_t=None):
    k = lin(t, t0 - 0.3, t0 + 0.3) * (1 - lin(t, out_t, out_t + 0.4) if out_t else 1)
    C *= 1 - 0.5 * k
    f = ImageFont.truetype(serif('PlayfairItalic.ttf' if txt.startswith('“') else 'Playfair.ttf'), 76)
    lines, cur = [], ''
    d0 = ImageDraw.Draw(Image.new('RGB', (8, 8)))
    for w_ in txt.split():
        if d0.textlength((cur + ' ' + w_).strip(), font=f) > 1350:
            lines.append(cur); cur = w_
        else:
            cur = (cur + ' ' + w_).strip()
    lines.append(cur)
    y0 = 500 - (len(lines) - 1) * 50
    for i, ln in enumerate(lines):
        T(C, ln, 960, y0 + i * 100, t, t0 + 0.1 * i, 76, WHITE, DARK, out_t, serif('PlayfairItalic.ttf' if txt.startswith('“') else 'Playfair.ttf'), bounce=False, glow=0.9)


def stamp(C, t, txt, t0):
    if t < t0:
        return
    key = ('stamp', txt)
    if key not in _SPR:
        f = ImageFont.truetype(serif('Cinzel.ttf'), 104)
        d0 = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
        bb = d0.textbbox((0, 0), txt, font=f)
        w_, h_ = bb[2] - bb[0] + 90, bb[3] - bb[1] + 70
        im = Image.new('RGBA', (w_, h_), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        red = (38, 34, 196, 235)
        d.rectangle((6, 6, w_ - 7, h_ - 7), outline=red, width=9)
        d.rectangle((18, 18, w_ - 19, h_ - 19), outline=red, width=3)
        d.text((45 - bb[0], 35 - bb[1]), txt, font=f, fill=red)
        im = im.rotate(8, expand=True, resample=Image.BICUBIC)
        _SPR[key] = np.asarray(im).astype(np.float32)
    v = t - t0
    s = 1.0 + 0.9 * (1 - ease_out(lin(v, 0, 0.22)))
    put(C, _SPR[key], 960, 470, s, min(1, v / 0.12))


# ------------------------------------------------------------------ subtitles
def load_srt():
    out = []
    for blk in open(os.path.join(ROOT, 'Helen_Keller_English.srt'), encoding='utf-8').read().strip().split('\n\n'):
        ls = blk.split('\n')
        a, b = ls[1].split(' --> ')
        ts = lambda s: int(s[:2]) * 3600 + int(s[3:5]) * 60 + int(s[6:8]) + int(s[9:]) / 1000
        out.append((ts(a), ts(b), '\n'.join(ls[2:])))
    return out


def sub_spr(text):
    key = ('sub', text)
    if key not in _SPR:
        f = ImageFont.truetype(F_SUB, 44)
        lines = text.split('\n')
        d0 = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
        rb = d0.textbbox((0, 0), 'Hg', font=f)
        lh = rb[3] - rb[1] + 12
        tw = max(d0.textlength(l, font=f) for l in lines)
        w_, h_ = int(tw) + 44, lh * len(lines) + 20
        im = Image.new('RGBA', (w_, h_), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, w_ - 1, h_ - 1), fill=(255, 255, 255, 255), outline=(12, 12, 12, 255), width=3)
        for i, l in enumerate(lines):
            d.text(((w_ - d.textlength(l, font=f)) / 2, 10 + i * lh - rb[1] + 4), l, font=f, fill=(12, 12, 12, 255))
        _SPR[key] = np.asarray(im).astype(np.float32)
    return _SPR[key]


# ------------------------------------------------------------------ plan: cuts
def plan2():
    p = json.load(open(os.path.join(WORK, 'plan.json')))
    shots = parse_shotlist()
    subs = load_srt()
    cuts, sfx, named = [], [], set()
    tl = p['timeline']
    for ei, ev in enumerate(tl):
        if ev['type'] in ('open', 'chapter', 'end'):
            # card overlays the first picture of the following paragraph (or the last one for 'end')
            nxt = next((e for e in tl[ei + 1:] if e['type'] == 'para'), None)
            pic = (PAINTS.get(nxt['id'], [None])[0] if nxt else 'pt01') or 'pt04'
            if ev['type'] == 'end':
                pic = 'pt01'
            cuts.append({'t0': ev['start'], 't1': ev['end'], 'v': pic, 'card': ev['type'],
                         'num': ev.get('num'), 'title': ev.get('title'), 'calm': True})
            continue
        pid, ch = ev['id'], ev['chapter']
        calm = pid in CALM
        photos = [f for f, r in shots[pid]['photos'] if not r or ch.startswith('Chapter 18')]
        paints = PAINTS.get(pid, [])
        vis = []
        for i in range(max(len(photos), len(paints))):
            if i < len(paints): vis.append(paints[i])
            if i < len(photos): vis.append(photos[i])
        span = ev['end'] - ev['start']
        n = max(1, min(6, round(span / 6.0)))
        if not vis:
            vis = ['pt01']
        # cut points snapped to subtitle starts
        starts = [a for a, b, s in subs if ev['start'] + 1.5 < a < ev['end'] - 2.5]
        bounds = [ev['start']]
        for k in range(1, n):
            target = ev['start'] + span * k / n
            if starts:
                c = min(starts, key=lambda a: abs(a - target))
                if c - bounds[-1] > 2.6:
                    bounds.append(c)
        bounds.append(ev['end'])
        texts = list(shots[pid]['texts'])
        for k in range(len(bounds) - 1):
            v = vis[k % len(vis)]
            cut = {'t0': bounds[k], 't1': bounds[k + 1], 'v': v, 'calm': calm, 'pid': pid}
            if not v.startswith('pt'):
                for sub_, name, dates in PEOPLE:
                    if sub_ in v and name not in named:
                        named.add(name); cut['lower3'] = (name, dates); break
            if texts and (v.startswith('pt') or k == 0):
                txt = texts.pop(0)
                cut['quote' if txt.startswith('“') else 'where'] = txt
            cuts.append(cut)
        if pid in STAMPS:  # stamp lands on the cut that is showing when the keyword is spoken
            txt, word = STAMPS[pid]
            ts = next(a + 0.4 for a, b, s_ in subs if ev['start'] <= a < ev['end'] and word in s_.replace('\n', ' '))
            c = next(c for c in cuts if c.get('pid') == pid and c['t0'] <= ts < c['t1'])
            c['stamp'], c['stamp_at'] = txt, ts - c['t0']
    for i, c in enumerate(cuts):
        c['i'] = i
        if not c['calm'] and 'card' not in c:
            if i:
                sfx.append((c['t0'], 'whoosh'))
            sfx.append((c['t0'] + 0.32, 'pop'))
        if c.get('stamp'):
            sfx.append((c['t0'] + c['stamp_at'] + 0.2, 'thud'))
        if c.get('lower3'):
            sfx.append((c['t0'] + 0.5, 'ding'))
    json.dump({'duration': p['duration'], 'cuts': cuts, 'sfx': sorted(sfx)}, open(os.path.join(WORK, 'plan2.json'), 'w'), indent=1)
    print(len(cuts), 'cuts', len(sfx), 'sfx')


# ------------------------------------------------------------------ frame
def draw_cut(c, t):
    u = t - c['t0']
    d = max(3.0, c['t1'] - c['t0'] + XF + 0.3)
    k = lin(u, 0, d)
    v = c['v']
    if v.startswith('pt'):
        mv = (MOVES if c['calm'] else MOVES_BIG)[c['i'] % 6]
        C = kb(load_rgb(src_path(v)), k, *mv)
        vignette(C, 0.3)
    else:
        zin = c['i'] % 2 == 0
        zb, zc = (1.06, 1.08) if c['calm'] else (1.14, 1.20)
        bg = blur_bg(v)
        s = (1.0 + (zb - 1) * k) if zin else (zb - (zb - 1) * k)
        hh, ww = bg.shape[:2]
        M = np.float32([[s, 0, W / 2 - s * ww / 2], [0, s, H / 2 - s * hh / 2]])
        C = cv2.warpAffine(bg, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        vignette(C, 0.4)
        card = photo_card(v)
        sc = (1.0 + (zc - 1) * k) if zin else (zc - (zc - 1) * k)
        if not c['calm']:
            sc *= 0.55 + 0.45 * back(lin(u, 0.05, 0.55))
        a = fade(u, 0.0, 0.2 if not c['calm'] else 0.35)
        put(C, card, 960, 515 + 20 * (1 - ease_out(lin(u, 0, 0.6))), sc, a)
    # overlays
    if c.get('card') == 'open':
        C *= 1 - 0.55 * (1 - lin(u, 4.6, 5.6))
        T(C, 'THE LIFE OF', 960, 390, u, 0.4, 58, GOLD, DARK, 4.8, serif('Cinzel.ttf'), bounce=False)
        T(C, 'Helen Keller', 960, 520, u, 0.7, 150, WHITE, DARK, 4.8, serif('Playfair.ttf'), bounce=True, glow=0.9)
        T(C, '1880 – 1968', 960, 650, u, 1.1, 54, CREAM, DARK, 4.8, serif('EBGaramond.ttf'), bounce=False)
    elif c.get('card') == 'chapter':
        C *= 1 - 0.62 * (1 - lin(u, 2.9, 3.6))
        T(C, f'CHAPTER {c["num"]}', 960, 420, u, 0.2, 58, GOLD, DARK, 2.9, serif('Cinzel.ttf'), bounce=False, glow=0.5)
        tsize = 118 if len(c['title']) <= 20 else max(80, int(118 * 20 / len(c['title'])))
        T(C, c['title'], 960, 540, u, 0.45, tsize, WHITE, DARK, 2.9, serif('Playfair.ttf'), bounce=False, glow=0.8)
    elif c.get('card') == 'end':
        C *= 0.45
        T(C, 'Helen Adams Keller', 960, 470, u, 0.3, 110, WHITE, DARK, None, serif('Playfair.ttf'), bounce=False, glow=0.9)
        T(C, 'June 27, 1880  –  June 1, 1968', 960, 590, u, 0.6, 52, CREAM, DARK, None, serif('EBGaramond.ttf'), bounce=False)
    if c.get('lower3'):
        lower3(C, u, *c['lower3'], t0=0.5, out_t=min(c['t1'] - c['t0'], 6.0) - 0.4)
    if c.get('where'):
        where(C, u, c['where'], 0.4, min(c['t1'] - c['t0'], 7.0) - 0.4)
    if c.get('quote'):
        quote_over(C, u, c['quote'], 0.5, c['t1'] - c['t0'] - 0.6)
    if c.get('stamp'):
        stamp(C, u, c['stamp'], c['stamp_at'])
    return C


def pops(C, t, sfx):
    z = 1.0
    for t0, name in sfx:
        v = t - t0
        if name == 'whoosh' and 0 <= v < 0.55:
            z *= 1.0 + 0.09 * (1 - ease_out(v / 0.55))
        elif name in ('pop', 'ding', 'thud') and 0 <= v < 0.4:
            amt = 0.035 if name == 'pop' else 0.06
            z *= 1.0 + amt * math.sin(math.pi * v / 0.4) ** 2 * (1 - v / 0.4 * 0.3)
    return zoom_center(C, z) if z > 1.0005 else C


def jolt(C, t, t0, amp=12):
    v = t - t0
    if 0 <= v < 0.5:
        k = (1 - v / 0.5) ** 2
        dx, dy = amp * k * math.sin(v * 71), amp * k * math.cos(v * 59) * 0.8
        z = 1.0 + (abs(dx) + abs(dy)) / 700
        M = np.float32([[z, 0, (1 - z) * W / 2 + dx], [0, z, (1 - z) * H / 2 + dy]])
        return cv2.warpAffine(C, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return C


def frame(cuts, sfx, subs, i, t):
    c = cuts[i]
    C = draw_cut(c, t)
    if i > 0 and t < c['t0'] + XF and 'card' not in c and 'card' not in cuts[i - 1]:
        a = lin(t, c['t0'], c['t0'] + XF)
        C = C * a + draw_cut(cuts[i - 1], t) * (1 - a)
    if not c['calm']:
        C = pops(C, t, [s for s in sfx if abs(s[0] - t) < 1.0])
    if c.get('stamp'):
        C = jolt(C, t, c['t0'] + c['stamp_at'] + 0.22)
    # edge fades around cards
    if 'card' in c:
        C *= min(1, lin(t, c['t0'], c['t0'] + 0.4) if c['card'] != 'open' else lin(t, 0, 0.8))
        if c['card'] == 'end':
            C *= 1 - lin(t, c['t1'] - 2.0, c['t1'])
    elif i + 1 < len(cuts) and 'card' in cuts[i + 1] and cuts[i + 1]['card'] != 'open':
        C *= 1 - lin(t, cuts[i + 1]['t0'] - 0.5, cuts[i + 1]['t0'])
    for a_, b_, s_ in subs:
        if a_ <= t < b_:
            put(C, sub_spr(s_), 960, 1000, 1.0, 1.0, (0.5, 1.0))
            break
    return C


def segments(cuts):
    segs, cur = [], []
    for c in cuts:
        if c.get('card') in ('chapter', 'end') and cur:
            segs.append(cur); cur = []
        cur.append(c)
    segs.append(cur)
    return segs


def render_segment(idx):
    p = json.load(open(os.path.join(WORK, 'plan2.json')))
    cuts, sfx, subs = p['cuts'], [tuple(s) for s in p['sfx']], load_srt()
    seg = segments(cuts)[idx]
    first = seg[0]['i']
    n0, n1 = round(seg[0]['t0'] * FPS), round(seg[-1]['t1'] * FPS)
    os.makedirs(os.path.join(WORK, 'seg2'), exist_ok=True)
    out = os.path.join(WORK, 'seg2', f'seg{idx:03d}.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS),
                           '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '2', out],
                          stdin=subprocess.PIPE)
    k = 0
    for n in range(n0, n1):
        t = n / FPS
        while k + 1 < len(seg) and t >= seg[k + 1]['t0']:
            k += 1
        C = frame(cuts, sfx, subs, first + k, t)
        ff.stdin.write(np.clip(C, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    print('segment', idx, 'frames', n1 - n0, 'done', flush=True)


# ------------------------------------------------------------------ audio: narration + synthesized SFX
def synth(name):
    rng = np.random.default_rng(7)
    if name == 'whoosh':
        n = int(0.55 * SR); x = rng.normal(0, 1, n)
        t = np.arange(n) / SR
        env = np.sin(np.pi * np.clip(t / 0.55, 0, 1)) ** 1.5
        y = np.zeros(n); lp = 0.0
        for i in range(n):  # sweeping one-pole low-pass
            a = 0.02 + 0.25 * (i / n)
            lp += a * (x[i] - lp); y[i] = lp
        return y * env * 0.9
    t = np.arange(int({'pop': 0.12, 'ding': 1.4, 'thud': 0.45}[name] * SR)) / SR
    if name == 'pop':
        f = 900 * np.exp(-t * 28) + 260
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38) * 0.8
    if name == 'ding':
        return sum(np.sin(2 * np.pi * f * t) * g for f, g in ((1318, 0.5), (2637, 0.25), (3951, 0.12))) * np.exp(-t * 3.5) * 0.7
    f = 95 * np.exp(-t * 6) + 45
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + rng.normal(0, 0.15, len(t)) * np.exp(-t * 30)) * 0.9


def mix_audio(out_wav):
    import wave
    p = json.load(open(os.path.join(WORK, 'plan2.json')))
    with wave.open(os.path.join(WORK, 'narration.wav')) as w_:
        nar = np.frombuffer(w_.readframes(w_.getnframes()), np.int16).astype(np.float32) / 32768
    mix = nar.copy()
    gains = {'whoosh': 0.10, 'pop': 0.12, 'ding': 0.10, 'thud': 0.22}
    cache = {k: synth(k) for k in gains}
    for t0, name in p['sfx']:
        s = cache[name] * gains[name]
        i = int(t0 * SR)
        j = min(len(mix), i + len(s))
        if i < len(mix):
            mix[i:j] += s[:j - i]
    mix = np.clip(mix, -1, 1)
    with wave.open(out_wav, 'wb') as w_:
        w_.setnchannels(1); w_.setsampwidth(2); w_.setframerate(SR)
        w_.writeframes((mix * 32767).astype(np.int16).tobytes())


def mux(out):
    p = json.load(open(os.path.join(WORK, 'plan2.json')))
    segs = segments(p['cuts'])
    lst = os.path.join(WORK, 'seg2', 'list.txt')
    prev = None
    with open(lst, 'w') as f:
        for i, s in enumerate(segs):
            n0 = round(s[0]['t0'] * FPS)
            if prev is not None and n0 > prev:
                gap = os.path.join(WORK, 'seg2', f'gap{n0 - prev}.mp4')
                if not os.path.exists(gap):
                    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=black:s={W}x{H}:r={FPS}',
                                    '-frames:v', str(n0 - prev), '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
                                    '-pix_fmt', 'yuv420p', gap], check=True)
                f.write(f"file '{os.path.basename(gap)}'\n")
            f.write(f"file 'seg{i:03d}.mp4'\n")
            prev = round(s[-1]['t1'] * FPS)
    wav = os.path.join(WORK, 'mix2.wav')
    mix_audio(wav)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-i', wav,
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
                    '-movflags', '+faststart', '-shortest', out], check=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'plan':
        plan2()
    elif cmd == 'segment':
        render_segment(int(sys.argv[2]))
    elif cmd == 'count':
        print(len(segments(json.load(open(os.path.join(WORK, 'plan2.json')))['cuts'])))
    elif cmd == 'mux':
        mux(sys.argv[2])
