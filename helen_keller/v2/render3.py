"""Helen Keller v3: continuous cut of the v2 material — no sound effects or punch zooms, long crossfades
everywhere (chapter titles sit on the running picture instead of a cut to black), keyword labels that rise
one by one as they are spoken, and a few paragraphs where photos rise onto the screen one after another.

usage: render3.py plan | segment N | count | mux OUT
"""
import json, os, subprocess, sys
import numpy as np
import cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render2 import (W, H, FPS, WORK, XF as _XF, PAINTS, PEOPLE, STAMPS, MOVES, WHITE, DARK, GOLD, CREAM, F_SANS,
                     parse_shotlist, load_srt, sub_spr, src_path, load_rgb, kb, vignette, put, photo_card, blur_bg,
                     T, serif, lower3, where, quote_over, stamp, jolt, lin, ease_out, fade, text_spr)

XF = 0.9
LABELS = {
    'P04': [('5 LANGUAGES', 'five languages'), ('RADCLIFFE', 'best colleges'), ('12+ BOOKS', 'dozen books'), ('40 COUNTRIES', 'forty countries')],
    'P10': [('PUSH = GO', 'push'), ('PULL = COME', 'pull'), ('SHIVER = COLD', 'Shivering'), ('60 SIGNS', 'sixty signs')],
    'P25': [('W', 'spelled the word'), ('A', None), ('T', None), ('E', None), ('R', None)],
    'P26': [('TEACHER', 'teacher')],
    'P27': [('30 NEW WORDS', 'thirty new words')],
    'P29': [('FRENCH', 'French'), ('LATIN', 'Latin'), ('GREEK', 'Greek')],
    'P32': [('11 LESSONS', 'eleven lessons')],
    'P45': [('WOOD', 'wood'), ('PAINT', 'paint'), ('METAL', 'metal')],
    'P46': [('SWIM', 'swam'), ('ROW', 'rowed'), ('CYCLE', 'bicycle'), ('CHESS', 'chess')],
    'P49': [('WORKERS', 'workers'), ('VOTES FOR WOMEN', 'votes for women'), ('NO CHILD LABOR', 'child labor'), ('ACLU', 'American Civil Liberties Union')],
    'P53': [('DELIVERANCE · 1919', 'Deliverance'), ('VAUDEVILLE', 'vaudeville')],
    'P55': [('40+ YEARS', 'more than forty years'), ('MILLIONS RAISED', 'millions of dollars')],
    'P61': [('3 MONTHS', 'three months'), ('~100 SPEECHES', 'hundred speeches')],
    'P62': [('BUSAN', 'Busan'), ('DAEGU', 'Daegu'), ('SEOUL', 'Seoul'), ('PYONGYANG', 'Pyongyang')],
    'P67': [('35 COUNTRIES', 'thirty-five countries'), ('5 CONTINENTS', 'five continents')],
    'P74': [('2003', '2003'), ('2009', '2009')],
}
STACKS = {
    'P38': ['c09_mark-twain-c1900.jpg', 'c09_mark-twain-1902-reading.jpg', 'c09_rogers-and-twain.jpg'],
    'P60': ['c15_helen-holding-annes-hand-1909.jpg', 'c07_helen-and-anne-c1893.jpg', 'c15_eleanor-roosevelt-helen-polly-1936.jpg'],
    'P75': ['c12_helen-portrait-1913.jpg', 'c13_helen-portrait-1920s.jpg', 'c12_helen-suffrage-congressional-union.jpg'],
}


def word_time(pid, start, phrase):
    js = json.load(open(os.path.join(WORK, 'audio', pid + '.json')))
    al = js['alignment']
    text = ''.join(al['characters'])
    i = text.lower().find(phrase.lower())
    return None if i < 0 else start + al['character_start_times_seconds'][i]


def plan3():
    p = json.load(open(os.path.join(WORK, 'plan2.json')))
    tl = json.load(open(os.path.join(WORK, 'plan.json')))['timeline']
    paras = {e['id']: e for e in tl if e['type'] == 'para'}
    cards = [e for e in tl if e['type'] in ('open', 'chapter', 'end')]
    shots = parse_shotlist()
    cuts = []
    for c in p['cuts']:
        if 'card' in c:
            continue
        c = dict(c)
        cuts.append(c)
    # stack paragraphs replace their cuts with one long cut
    for pid, photos in STACKS.items():
        ev = paras[pid]
        idx = [i for i, c in enumerate(cuts) if c['pid'] == pid]
        texts = shots[pid]['texts']
        span = ev['end'] - ev['start']
        st = {'t0': ev['start'], 't1': ev['end'], 'v': photos[0], 'pid': pid, 'calm': pid in ('P60',),
              'stack': [(f, 0.4 + k * min(3.2, span / 3.5)) for k, f in enumerate(photos)]}
        if texts:
            st['where'] = texts[0]
        cuts[idx[0]:idx[-1] + 1] = [st]
    # make the cuts contiguous: chapter gaps go to the previous cut, chapter cards to the next one
    cuts.sort(key=lambda c: c['t0'])
    for card in cards:
        if card['type'] == 'open':
            cuts[0]['lead'] = card['end'] - card['start']; cuts[0]['t0'] = 0.0; cuts[0]['card'] = 'open'
        elif card['type'] == 'chapter':
            nxt = next(c for c in cuts if c['t0'] >= card['end'] - 1e-6)
            prv = cuts[cuts.index(nxt) - 1]
            prv['t1'] = card['start']
            nxt['lead'] = nxt['t0'] - card['start']; nxt['t0'] = card['start']
            nxt['card'] = 'chapter'; nxt['num'] = card['num']; nxt['title'] = card['title']
        else:
            cuts[-1]['t1'] = card['end']; cuts[-1]['end_at'] = card['start']
    for i in range(1, len(cuts)):
        cuts[i - 1]['t1'] = cuts[i]['t0']
    # stamps by absolute time, keyword labels by paragraph
    labels = []
    for c in cuts:
        if c.get('stamp'):
            c['stamp_t'] = c['t0'] + c.pop('stamp_at') + c.get('lead', 0)
    for pid, items in LABELS.items():
        ev = paras[pid]
        prev_t, out = None, []
        for txt, phrase in items:
            t = word_time(pid, ev['start'], phrase) if phrase else None
            t = (prev_t + 0.38) if t is None else t
            out.append((txt, t)); prev_t = t
        labels.append({'pid': pid, 'items': out, 'end': ev['end'] - 0.3, 'letters': pid == 'P25'})
    for i, c in enumerate(cuts):
        c['i'] = i
    dur = p['duration']
    json.dump({'duration': dur, 'cuts': cuts, 'labels': labels}, open(os.path.join(WORK, 'plan3.json'), 'w'), indent=1)
    print(len(cuts), 'cuts,', sum(len(l['items']) for l in labels), 'labels,', len(STACKS), 'photo stacks')


def draw_cut(c, t):
    u = t - c['t0']
    lead = c.get('lead', 0.0)
    d = max(3.0, c['t1'] - c['t0'] + XF)
    k = lin(u, 0, d)
    v = c['v']
    if 'stack' in c:
        C = kb(blur_bg(v).clip(0, 255).astype(np.uint8), k, (0.5, 0.5, 1.0), (0.5, 0.5, 1.06))
        vignette(C, 0.4)
        n = len(c['stack'])
        xs = {1: [960], 2: [640, 1280], 3: [400, 960, 1520]}[n]
        rots = [-3, 2, -2]
        for j, (f, at) in enumerate(c['stack']):
            if u < at:
                continue
            card = photo_card(f, maxh=560 if n == 3 else 640, maxw=520 if n == 3 else 760)
            r = ease_out(lin(u, at, at + 0.7))
            if rots[j]:
                hh, ww = card.shape[:2]
                M = cv2.getRotationMatrix2D((ww / 2, hh / 2), rots[j], 1.0)
                card = cv2.warpAffine(card, M, (ww, hh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
            put(C, card, xs[j], 520 + 140 * (1 - r), 1.0 + 0.03 * lin(u, at, at + 12), min(1, (u - at) / 0.35))
    elif v.startswith('pt'):
        C = kb(load_rgb(src_path(v)), k, *MOVES[c['i'] % 6])
        vignette(C, 0.3)
    else:
        zin = c['i'] % 2 == 0
        zb, zc = 1.08, 1.12
        bg = blur_bg(v)
        s = (1.0 + (zb - 1) * k) if zin else (zb - (zb - 1) * k)
        hh, ww = bg.shape[:2]
        M = np.float32([[s, 0, W / 2 - s * ww / 2], [0, s, H / 2 - s * hh / 2]])
        C = cv2.warpAffine(bg, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        vignette(C, 0.4)
        sc = (1.0 + (zc - 1) * k) if zin else (zc - (zc - 1) * k)
        put(C, photo_card(v), 960, 515 + 30 * (1 - ease_out(lin(u, 0, 0.9))), sc, 1.0)
    # titles sitting on the running picture
    if c.get('card') == 'open':
        C *= 1 - 0.55 * (1 - lin(u, 4.6, 5.8))
        T(C, 'THE LIFE OF', 960, 390, u, 0.4, 58, GOLD, DARK, 4.8, serif('Cinzel.ttf'), bounce=False)
        T(C, 'Helen Keller', 960, 520, u, 0.7, 150, WHITE, DARK, 4.8, serif('Playfair.ttf'), bounce=False, glow=0.9)
        T(C, '1880 – 1968', 960, 650, u, 1.1, 54, CREAM, DARK, 4.8, serif('EBGaramond.ttf'), bounce=False)
    elif c.get('card') == 'chapter':
        C *= 1 - 0.55 * (lin(u, 0, 0.6) * (1 - lin(u, lead - 0.6, lead + 0.4)))
        T(C, f'CHAPTER {c["num"]}', 960, 420, u, 0.4, 58, GOLD, DARK, lead - 0.5, serif('Cinzel.ttf'), bounce=False, glow=0.5)
        tsize = 118 if len(c['title']) <= 20 else max(80, int(118 * 20 / len(c['title'])))
        T(C, c['title'], 960, 540, u, 0.65, tsize, WHITE, DARK, lead - 0.5, serif('Playfair.ttf'), bounce=False, glow=0.8)
    if c.get('end_at') is not None and t >= c['end_at']:
        e = t - c['end_at']
        C *= 1 - 0.5 * lin(e, 0, 0.8)
        T(C, 'Helen Adams Keller', 960, 470, e, 0.3, 110, WHITE, DARK, None, serif('Playfair.ttf'), bounce=False, glow=0.9)
        T(C, 'June 27, 1880  –  June 1, 1968', 960, 590, e, 0.6, 52, CREAM, DARK, None, serif('EBGaramond.ttf'), bounce=False)
    pu = u - lead
    span = c['t1'] - c['t0'] - lead
    if c.get('lower3'):
        lower3(C, pu, *c['lower3'], t0=0.6, out_t=min(span, 6.0) - 0.5)
    if c.get('where'):
        where(C, pu, c['where'], 0.5, min(span, 7.0) - 0.5)
    if c.get('quote'):
        quote_over(C, pu, c['quote'], 0.6, span - 0.7)
    if c.get('stamp'):
        stamp(C, t - c['stamp_t'], c['stamp'], 0.0)
    return C


def rising_labels(C, t, lab):
    items = [(s, a) for s, a in lab['items'] if t >= a]
    if not items or t > lab['end'] + 0.4:
        return
    out_a = 1 - lin(t, lab['end'], lab['end'] + 0.4)
    letters = lab['letters']
    size = 150 if letters else (78 if len(lab['items']) > 2 else 92)
    sprs = [text_spr(s, size, WHITE, DARK, max(3, int(size * 0.08)), F_SANS, 0.7) for s, _ in lab['items']]
    gap = 26 if letters else 40
    if letters or sum(sp.shape[1] for sp in sprs) + gap * (len(sprs) - 1) < 1700:  # one row
        total = sum(sp.shape[1] for sp in sprs) + gap * (len(sprs) - 1)
        x = 960 - total / 2
        pos = []
        for sp in sprs:
            pos.append((x + sp.shape[1] / 2, 250)); x += sp.shape[1] + gap
    else:  # two rows
        half = (len(sprs) + 1) // 2
        pos = []
        for row, grp in enumerate((sprs[:half], sprs[half:])):
            total = sum(sp.shape[1] for sp in grp) + gap * (len(grp) - 1)
            x = 960 - total / 2
            for sp in grp:
                pos.append((x + sp.shape[1] / 2, 210 + row * 120)); x += sp.shape[1] + gap
    for j, (s, a) in enumerate(lab['items']):
        if t < a:
            continue
        r = ease_out(lin(t, a, a + 0.45))
        put(C, sprs[j], pos[j][0], pos[j][1] + 70 * (1 - r), 1.0, min(1, (t - a) / 0.3) * out_a)


def frame(cuts, labels, subs, i, t, dur):
    c = cuts[i]
    C = draw_cut(c, t)
    if i > 0 and t < c['t0'] + XF:
        a = lin(t, c['t0'], c['t0'] + XF)
        C = C * a + draw_cut(cuts[i - 1], t) * (1 - a)
    if c.get('stamp'):
        C = jolt(C, t, c['stamp_t'] + 0.22, 8)
    for lab in labels:
        if lab['items'][0][1] <= t <= lab['end'] + 0.4:
            rising_labels(C, t, lab)
    C *= lin(t, 0, 1.0) * (1 - lin(t, dur - 2.5, dur))
    for a_, b_, s_ in subs:
        if a_ <= t < b_:
            put(C, sub_spr(s_), 960, 1000, 1.0, 1.0, (0.5, 1.0))
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
    p = json.load(open(os.path.join(WORK, 'plan3.json')))
    cuts, labels, subs, dur = p['cuts'], p['labels'], load_srt(), p['duration']
    seg = segments(cuts)[idx]
    first = seg[0]['i']
    n0, n1 = round(seg[0]['t0'] * FPS), round(seg[-1]['t1'] * FPS)
    os.makedirs(os.path.join(WORK, 'seg3'), exist_ok=True)
    out = os.path.join(WORK, 'seg3', f'seg{idx:03d}.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS),
                           '-i', '-', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-threads', '2', out],
                          stdin=subprocess.PIPE)
    k = 0
    for n in range(n0, n1):
        t = n / FPS
        while k + 1 < len(seg) and t >= seg[k + 1]['t0']:
            k += 1
        C = frame(cuts, labels, subs, first + k, t, dur)
        ff.stdin.write(np.clip(C, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    print('segment', idx, 'frames', n1 - n0, 'done', flush=True)


def mux(out):
    p = json.load(open(os.path.join(WORK, 'plan3.json')))
    n = len(segments(p['cuts']))
    lst = os.path.join(WORK, 'seg3', 'list.txt')
    with open(lst, 'w') as f:
        for i in range(n):
            f.write(f"file 'seg{i:03d}.mp4'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-i', os.path.join(WORK, 'narration.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-shortest', out], check=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'plan':
        plan3()
    elif cmd == 'segment':
        render_segment(int(sys.argv[2]))
    elif cmd == 'count':
        print(len(segments(json.load(open(os.path.join(WORK, 'plan3.json')))['cuts'])))
    elif cmd == 'mux':
        mux(sys.argv[2])
