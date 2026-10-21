"""Render the Helen Keller documentary from narration clips, the shot list and the photo set.

usage: render.py plan            -> work/plan.json (timeline), work/narration.wav, SRT, timeline text
       render.py segment N       -> work/seg/segNNN.mp4 (one chapter segment, silent)
       render.py mux             -> final mp4
"""
import json, math, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # helen_keller/
WORK = os.environ.get('HK_WORK', '/home/user/work')
AUDIO = os.path.join(WORK, 'audio')
PHOTOS = os.path.join(ROOT, 'photos')
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fonts')
W, H, FPS = 1920, 1080, 30
SR = 44100

OPEN_DUR, CARD_DUR, END_HOLD = 6.0, 3.5, 4.0
PARA_GAP, CHAPTER_GAP, XFADE = 0.45, 0.9, 0.7
REENACT_OK_CHAPTER = 'Chapter 18'

GOLD = (222, 186, 120)
CREAM = (240, 228, 205)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def set_weight(f, wght):
    try:
        f.set_variation_by_axes([wght])
    except Exception:
        pass
    return f


# ---------------------------------------------------------------- shot list

def parse_shotlist():
    shots, cur = {}, None
    for line in open(os.path.join(ROOT, 'shotlist.md'), encoding='utf-8'):
        line = line.rstrip()
        if line.startswith('## Optional'):
            break
        m = re.match(r'\*\*(P\d\d)\*\*', line)
        if m:
            cur = m.group(1)
            shots[cur] = {'items': [], 'overlay': None}
            continue
        if not cur or not line.startswith('- '):
            continue
        m = re.match(r'- `([^`]+)`(.*)', line)
        if m:
            shots[cur]['items'].append({'kind': 'photo', 'file': m.group(1), 'reenact': '[R]' in m.group(2)})
            continue
        m = re.match(r'- \*\*TITLE CARD\*\*:\s*(.*)', line)
        if m:
            text = m.group(1).replace('— no photo of Peter Fagan in PD sources', '')
            text = re.sub(r'\s*\((no PD photo|no public-domain)[^)]*\)', '', text).strip()
            text = text.replace(' → ', ' · ')  # the serif fonts have no plain arrow
            shots[cur]['items'].append({'kind': 'card', 'text': text})
            continue
        m = re.match(r'- \*\(overlay\)\*\s*(.*)', line)
        if m:
            shots[cur]['overlay'] = m.group(1).strip()
    return shots


# ---------------------------------------------------------------- audio + plan

def decode(mp3):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp3, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16)


def plan():
    paras = json.load(open(os.path.join(AUDIO, 'paragraphs.json')))
    shots = parse_shotlist()
    t = OPEN_DUR
    timeline = [{'type': 'open', 'start': 0.0, 'end': OPEN_DUR}]
    audio_parts = [np.zeros(int(OPEN_DUR * SR), np.int16)]
    chapters, srt, prev_ch = [], [], None
    for i, p in enumerate(paras):
        ch = p['chapter']
        if ch != prev_ch:
            if prev_ch is not None:
                audio_parts.append(np.zeros(int(CHAPTER_GAP * SR), np.int16)); t += CHAPTER_GAP
            if ch.startswith('Chapter'):
                num, title = re.match(r'Chapter (\d+) (.*)', ch).groups()
                timeline.append({'type': 'chapter', 'start': t, 'end': t + CARD_DUR, 'num': int(num), 'title': title})
                chapters.append((t, f'Chapter {num} {title}'))
                audio_parts.append(np.zeros(int(CARD_DUR * SR), np.int16)); t += CARD_DUR
            else:
                chapters.append((0.0, 'Intro'))
            prev_ch = ch
        pcm = decode(os.path.join(AUDIO, p['id'] + '.mp3'))
        dur = len(pcm) / SR
        last_in_ch = i + 1 == len(paras) or paras[i + 1]['chapter'] != ch
        span = dur + (0 if last_in_ch else PARA_GAP)
        items = [it for it in shots[p['id']]['items']
                 if not (it.get('reenact') and not ch.startswith(REENACT_OK_CHAPTER))]
        if not items:
            items = shots[p['id']]['items'][:1]
        timeline.append({'type': 'para', 'id': p['id'], 'chapter': ch, 'start': t, 'end': t + span,
                         'items': items, 'overlay': shots[p['id']]['overlay']})
        srt += cues(json.load(open(os.path.join(AUDIO, p['id'] + '.json'))), t)
        audio_parts.append(pcm)
        if not last_in_ch:
            audio_parts.append(np.zeros(int(PARA_GAP * SR), np.int16))
        t += span
    timeline.append({'type': 'end', 'start': t, 'end': t + END_HOLD})
    audio_parts.append(np.zeros(int(END_HOLD * SR), np.int16))
    t += END_HOLD
    audio = np.concatenate(audio_parts)
    write_wav(os.path.join(WORK, 'narration.wav'), audio)
    json.dump({'duration': t, 'timeline': timeline}, open(os.path.join(WORK, 'plan.json'), 'w'), indent=1)
    write_srt(srt, os.path.join(ROOT, 'Helen_Keller_English.srt'))
    with open(os.path.join(WORK, 'timeline.txt'), 'w') as f:
        for s, name in chapters:
            f.write(f'{stamp(s, t)} {name}\n')
    print(f'duration {t:.1f}s ({t/60:.1f} min), {len(srt)} subtitle cues, audio {len(audio)/SR:.1f}s')


def write_wav(path, pcm):
    import wave
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def stamp(s, total):
    s = int(s)
    return f'{s//3600}:{s%3600//60:02d}:{s%60:02d}' if total >= 3600 else f'{s//60:02d}:{s%60:02d}'


# ---------------------------------------------------------------- subtitles

def cues(js, offset):
    al = js['alignment']
    chars, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    text = ''.join(chars)
    # sentence-ish chunks, then split long ones on commas/words to fit two 42-char lines
    out = []
    for m in re.finditer(r'[^.!?]+[.!?]+["”’)]*\s*|[^.!?]+$', text):
        a, b = m.start(), m.end()
        for ca, cb in split_chunk(text, a, b):
            seg = text[ca:cb].strip()
            if not seg:
                continue
            lead = len(text[ca:cb]) - len(text[ca:cb].lstrip())
            ca += lead
            cb = ca + len(seg)
            out.append([offset + st[ca], offset + en[cb - 1], seg])
    for k in range(len(out)):
        if out[k][1] - out[k][0] < 1.0:
            out[k][1] = out[k][0] + 1.0
        if k + 1 < len(out) and out[k][1] > out[k + 1][0] - 0.04:
            out[k][1] = max(out[k][0] + 0.5, out[k + 1][0] - 0.04)
    return out


def split_chunk(text, a, b, limit=84):
    seg = text[a:b]
    if len(seg.strip()) <= limit:
        return [(a, b)]
    # prefer a comma/semicolon near the middle, else a space
    mid = a + len(seg) // 2
    best = None
    for m in re.finditer(r'[,;:—]\s', seg):
        p = a + m.end()
        if best is None or abs(p - mid) < abs(best - mid):
            best = p
    if best is None or abs(best - mid) > len(seg) * 0.3:
        spaces = [a + m.end() for m in re.finditer(r'\s', seg)]
        best = min(spaces, key=lambda p: abs(p - mid))
    return split_chunk(text, a, best, limit) + split_chunk(text, best, b, limit)


def wrap2(s, n=42):
    if len(s) <= n:
        return s
    words, best = s.split(), None
    for k in range(1, len(s.split())):
        l1, l2 = ' '.join(words[:k]), ' '.join(words[k:])
        score = max(len(l1), len(l2))
        if best is None or score < best[0]:
            best = (score, l1 + '\n' + l2)
    return best[1]


def write_srt(cs, path):
    def ts(x):
        ms = int(round(x * 1000))
        return f'{ms//3600000:02d}:{ms%3600000//60000:02d}:{ms%60000//1000:02d},{ms%1000:03d}'
    with open(path, 'w', encoding='utf-8') as f:
        for i, (a, b, s) in enumerate(cs, 1):
            f.write(f'{i}\n{ts(a)} --> {ts(b)}\n{wrap2(s)}\n\n')


# ---------------------------------------------------------------- imagery

S = 1.14  # plate oversize for Ken Burns
PW, PH = int(W * S), int(H * S)
_vig = None


def vignette():
    global _vig
    if _vig is None:
        y, x = np.mgrid[0:H, 0:W]
        r = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
        v = np.clip(1.0 - 0.38 * np.clip(r - 0.55, 0, None) ** 1.6, 0.55, 1.0)
        _vig = Image.fromarray((v * 255).astype(np.uint8)).convert('RGB')
    return _vig


def sepia(im):
    g = ImageOps.autocontrast(im.convert('L'), cutoff=0.5)
    return ImageOps.colorize(g, black=(22, 15, 9), mid=(140, 108, 74), white=(246, 234, 212))


def photo_plate(fname):
    im = Image.open(os.path.join(PHOTOS, fname))
    im = sepia(im)
    iw, ih = im.size
    ar = iw / ih
    bg = ImageOps.fit(im, (PW // 4, PH // 4)).filter(ImageFilter.GaussianBlur(10)).resize((PW, PH))
    bg = Image.blend(Image.new('RGB', (PW, PH), (10, 7, 4)), bg, 0.35)
    if 1.45 <= ar <= 2.1 and iw >= 900:
        return ImageOps.fit(im, (PW, PH), Image.LANCZOS)
    # contain, never upscale more than 2.4x
    scale = min(PW * 0.94 / iw, PH * 0.94 / ih, 2.4)
    fw, fh = int(iw * scale), int(ih * scale)
    fg = im.resize((fw, fh), Image.LANCZOS)
    x, y = (PW - fw) // 2, (PH - fh) // 2
    shadow = Image.new('L', (PW, PH), 0)
    ImageDraw.Draw(shadow).rectangle((x + 8, y + 12, x + fw + 8, y + fh + 12), fill=170)
    bg = Image.composite(Image.new('RGB', (PW, PH), (0, 0, 0)), bg, shadow.filter(ImageFilter.GaussianBlur(18)))
    bg.paste(fg, (x, y))
    return bg


def textured_bg(seed=0):
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1, (PH // 6, PW // 6))
    n = Image.fromarray(np.uint8(np.clip(128 + noise * 40, 0, 255))).resize((PW, PH), Image.BICUBIC)
    n = n.filter(ImageFilter.GaussianBlur(3))
    base = ImageOps.colorize(n, black=(14, 10, 7), white=(52, 38, 26))
    y, x = np.mgrid[0:PH, 0:PW]
    r = np.sqrt(((x - PW / 2) / (PW / 2)) ** 2 + ((y - PH / 2) / (PH / 2)) ** 2)
    glow = Image.fromarray(np.uint8(np.clip(255 * (1 - r * 0.8), 0, 255)))
    return Image.composite(base, Image.new('RGB', (PW, PH), (8, 6, 4)), glow)


def draw_centered(d, y, text, f, fill, spacing=0):
    if spacing:
        widths = [d.textlength(c, font=f) for c in text]
        total = sum(widths) + spacing * (len(text) - 1)
        x = (PW - total) / 2
        for c, w in zip(text, widths):
            d.text((x, y), c, font=f, fill=fill)
            x += w + spacing
    else:
        d.text(((PW - d.textlength(text, font=f)) / 2, y), text, font=f, fill=fill)


def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines


def card_plate(kind, **kw):
    im = textured_bg(hash(str(kw)) % 1000)
    d = ImageDraw.Draw(im)
    cy = PH / 2
    if kind == 'open':
        draw_centered(d, cy - 170, 'THE LIFE OF', set_weight(font('Cinzel.ttf', 54), 500), GOLD, spacing=14)
        draw_centered(d, cy - 95, 'Helen Keller', set_weight(font('Playfair.ttf', 170), 600), CREAM)
        d.line((PW / 2 - 260, cy + 120, PW / 2 + 260, cy + 120), fill=GOLD, width=2)
        draw_centered(d, cy + 145, '1880  –  1968', set_weight(font('EBGaramond.ttf', 52), 500), GOLD)
    elif kind == 'chapter':
        draw_centered(d, cy - 120, f'CHAPTER {kw["num"]}', set_weight(font('Cinzel.ttf', 46), 500), GOLD, spacing=12)
        d.line((PW / 2 - 200, cy - 45, PW / 2 + 200, cy - 45), fill=GOLD, width=2)
        draw_centered(d, cy - 15, kw['title'], set_weight(font('Playfair.ttf', 120), 500), CREAM)
    elif kind == 'end':
        draw_centered(d, cy - 110, 'Helen Adams Keller', set_weight(font('Playfair.ttf', 120), 500), CREAM)
        draw_centered(d, cy + 50, 'June 27, 1880  –  June 1, 1968', set_weight(font('EBGaramond.ttf', 56), 500), GOLD)
    else:  # text card: optional "quote — attribution" or "heading: detail"
        text = kw['text']
        quote = text.startswith('“')
        main, sub = text, ''
        if ' — ' in text:
            main, sub = text.split(' — ', 1)
        f = set_weight(font('PlayfairItalic.ttf' if quote else 'Playfair.ttf', 92 if len(main) < 40 else 74), 500)
        lines = wrap(d, main, f, PW * 0.68)
        lh = f.size * 1.25
        y = cy - (len(lines) * lh + (90 if sub else 0)) / 2
        for ln in lines:
            draw_centered(d, y, ln, f, CREAM); y += lh
        if sub:
            d.line((PW / 2 - 120, y + 30, PW / 2 + 120, y + 30), fill=GOLD, width=2)
            fs = set_weight(font('EBGaramond.ttf', 50), 500)
            for ln in wrap(d, sub, fs, PW * 0.7):
                draw_centered(d, y + 55, ln, fs, GOLD); y += 62
    return im


def overlay_image(text):
    """Lower-third RGBA overlay (frame-sized)."""
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    quote = text.startswith('“')
    f = set_weight(font('PlayfairItalic.ttf' if quote else 'Playfair.ttf', 50), 500)
    lines = wrap(d, text, f, W * 0.62)
    lh = 64
    bh = len(lines) * lh + 56
    y0 = H - 120 - bh
    band = Image.new('L', (W, H), 0)
    bd = ImageDraw.Draw(band)
    for i in range(0, int(W * 0.78)):
        a = int(175 * min(1, (W * 0.78 - i) / 260))
        bd.line((i, y0, i, y0 + bh), fill=a)
    ov.putalpha(band)
    ov = Image.composite(Image.new('RGBA', (W, H), (12, 8, 5, 255)), ov, band)
    ov.putalpha(band)
    d = ImageDraw.Draw(ov)
    d.line((90, y0 + 22, 90, y0 + bh - 22), fill=GOLD + (255,), width=4)
    y = y0 + 28
    for ln in lines:
        d.text((120, y), ln, font=f, fill=CREAM + (255,)); y += lh
    return ov


# ---------------------------------------------------------------- motion

def kb_params(k):
    """Ken Burns path for shot k: (zoom0, zoom1, (cx0, cy0), (cx1, cy1)) in plate-relative units."""
    rng = np.random.default_rng(1000 + k)
    zin = k % 2 == 0
    z0, z1 = (1.0, 1.10) if zin else (1.10, 1.0)
    dx = rng.uniform(-0.035, 0.035); dy = rng.uniform(-0.025, 0.02)
    return z0, z1, (0.5 - dx / 2, 0.5 - dy / 2), (0.5 + dx / 2, 0.5 + dy / 2)


def frame_from(plate, u, params):
    z0, z1, c0, c1 = params
    e = u * u * (3 - 2 * u)  # smoothstep
    z = z0 + (z1 - z0) * e
    cx = c0[0] + (c1[0] - c0[0]) * e
    cy = c0[1] + (c1[1] - c0[1]) * e
    # crop window: at z=1 it covers ~96% of the plate, leaving room to pan
    cw, chh = PW / (z * 1.04), PH / (z * 1.04)
    # keep window inside the plate
    x0 = min(max(cx * PW - cw / 2, 0), PW - cw)
    y0 = min(max(cy * PH - chh / 2, 0), PH - chh)
    return plate.transform((W, H), Image.EXTENT, (x0, y0, x0 + cw, y0 + chh), Image.BILINEAR)


# ---------------------------------------------------------------- segments

def build_shots(timeline):
    """Flatten timeline into shots [(start, end, kind, payload, overlay_text_or_None, para_start)]."""
    shots = []
    for ev in timeline:
        if ev['type'] in ('open', 'chapter', 'end'):
            shots.append({'start': ev['start'], 'end': ev['end'], 'card': ev['type'], 'ev': ev})
            continue
        items = ev['items']
        span = ev['end'] - ev['start']
        n = max(1, min(len(items), int(span // 4.0)))
        items = items[:n]
        each = span / n
        for j, it in enumerate(items):
            shots.append({'start': ev['start'] + j * each, 'end': ev['start'] + (j + 1) * each, 'item': it,
                          'overlay': ev['overlay'] if j == 0 else None, 'para': ev['id']})
    for k, s in enumerate(shots):
        s['k'] = k
    return shots


def segments(shots):
    """Group shots into render segments that start at chapter cards (cut points)."""
    segs, cur = [], []
    for s in shots:
        if s.get('card') in ('chapter', 'end') and cur:
            segs.append(cur); cur = []
        cur.append(s)
    segs.append(cur)
    return segs


_plates = {}


def plate_for(s):
    key = s['k']
    if key not in _plates:
        if 'card' in s:
            ev = s['ev']
            _plates[key] = card_plate(s['card'], **({'num': ev['num'], 'title': ev['title']} if s['card'] == 'chapter' else {}))
        elif s['item']['kind'] == 'card':
            _plates[key] = card_plate('text', text=s['item']['text'])
        else:
            _plates[key] = photo_plate(s['item']['file'])
        if len(_plates) > 6:
            _plates.pop(next(iter(_plates)))
    return _plates[key]


_ovs = {}


def render_shot_frame(s, t):
    span = s['end'] - s['start']
    u = min(max((t - (s['start'] - XFADE / 2)) / (span + XFADE), 0), 1)
    params = kb_params(s['k'])
    if 'card' in s or s['item']['kind'] == 'card':
        params = (1.0, 1.035, (0.5, 0.5), (0.5, 0.5))
    fr = frame_from(plate_for(s), u, params)
    if s.get('overlay'):
        ot = t - s['start']
        a = min(1, max(0, (ot - 0.8) / 0.6)) * min(1, max(0, (min(span, 9.0) - ot) / 0.6))
        if a > 0:
            if s['k'] not in _ovs:
                _ovs[s['k']] = overlay_image(s['overlay'])
            ov = _ovs[s['k']]
            if a < 1:
                ov = ov.copy(); ov.putalpha(ov.getchannel('A').point(lambda v: int(v * a)))
            fr = Image.alpha_composite(fr.convert('RGBA'), ov).convert('RGB')
    return fr


def render_segment(idx):
    p = json.load(open(os.path.join(WORK, 'plan.json')))
    shots = build_shots(p['timeline'])
    seg = segments(shots)[idx]
    t0, t1 = seg[0]['start'], seg[-1]['end']
    n0, n1 = round(t0 * FPS), round(t1 * FPS)
    os.makedirs(os.path.join(WORK, 'seg'), exist_ok=True)
    out = os.path.join(WORK, 'seg', f'seg{idx:03d}.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                           '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19',
                           '-pix_fmt', 'yuv420p', '-threads', '2', out], stdin=subprocess.PIPE)
    vig = vignette()
    is_first, is_last = idx == 0, idx == len(segments(shots)) - 1
    for n in range(n0, n1):
        t = n / FPS
        k = next(i for i, s in enumerate(seg) if t < s['end'] or i == len(seg) - 1)
        s = seg[k]
        fr = render_shot_frame(s, t)
        # crossfade into the next shot inside this segment
        if k + 1 < len(seg) and t > s['end'] - XFADE / 2:
            nxt = render_shot_frame(seg[k + 1], t)
            a = (t - (s['end'] - XFADE / 2)) / XFADE
            fr = Image.blend(fr, nxt, a)
        elif k > 0 and t < s['start'] + XFADE / 2:
            prv = render_shot_frame(seg[k - 1], t)
            fr = Image.blend(prv, fr, (t - (s['start'] - XFADE / 2)) / XFADE)
        fr = ImageChops.multiply(fr, vig)
        # fades at segment edges (chapter cards / start / end)
        fade = 1.0
        if t - t0 < 0.5:
            fade = min(fade, (t - t0) / 0.5)
        if t1 - t < 0.5 and not (seg[-1].get('card') == 'open'):
            fade = min(fade, (t1 - t) / 0.5)
        if is_last and t1 - t < 2.5:
            fade = min(fade, (t1 - t) / 2.5)
        if fade < 1:
            fr = Image.blend(Image.new('RGB', (W, H)), fr, max(fade, 0))
        ff.stdin.write(fr.tobytes())
    ff.stdin.close()
    ff.wait()
    print('segment', idx, 'frames', n1 - n0, 'done', flush=True)


def count():
    p = json.load(open(os.path.join(WORK, 'plan.json')))
    print(len(segments(build_shots(p['timeline']))))


def mux(out):
    p = json.load(open(os.path.join(WORK, 'plan.json')))
    n = len(segments(build_shots(p['timeline'])))
    lst = os.path.join(WORK, 'seg', 'list.txt')
    with open(lst, 'w') as f:
        for i in range(n):
            f.write(f"file 'seg{i:03d}.mp4'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-i', os.path.join(WORK, 'narration.wav'), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
                    '-movflags', '+faststart', '-shortest', out], check=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'plan':
        plan()
    elif cmd == 'segment':
        render_segment(int(sys.argv[2]))
    elif cmd == 'count':
        count()
    elif cmd == 'mux':
        mux(sys.argv[2])
