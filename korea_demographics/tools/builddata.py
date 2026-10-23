"""Build the narration track and data.js (paragraph times, per-character times, subtitles) from the ElevenLabs clips.

usage: builddata.py AUDIODIR OUTDIR
"""
import difflib, json, os, re, subprocess, sys, wave
import numpy as np

SR = 44100
GAP, GAP_CHAPTER, LEAD, TAIL = 0.55, 0.9, 0.6, 2.5
CHAPTER_STARTS = set(map(int, os.environ.get('CHAPTER_STARTS', '2,4,6,8,9,14,16,21,22').split(',')))  # paragraphs that open a new section get a longer pause before them
MAX_SUB = 24


def decode(mp3):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp3, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16)


def trim(pcm, thr=400, pad=0.08):
    idx = np.where(np.abs(pcm) > thr)[0]
    if not len(idx):
        return pcm, 0
    a = max(0, idx[0] - int(pad * SR)); b = min(len(pcm), idx[-1] + int(pad * SR))
    return pcm[a:b], a / SR


def char_times(orig, spoken, al):
    """Times for every character of the original text, mapped from the spoken (say-as) text via difflib."""
    sp = ''.join(al['characters']); st = al['character_start_times_seconds']; en = al['character_end_times_seconds']
    # alignment characters may differ slightly from `spoken`; map spoken→alignment first
    m1 = {i: j for a, b, n in difflib.SequenceMatcher(None, spoken, sp, autojunk=False).get_matching_blocks() for i, j in zip(range(a, a + n), range(b, b + n))}
    m2 = {i: j for a, b, n in difflib.SequenceMatcher(None, orig, spoken, autojunk=False).get_matching_blocks() for i, j in zip(range(a, a + n), range(b, b + n))}
    t = [None] * len(orig); te = [None] * len(orig)
    for i in range(len(orig)):
        j = m2.get(i); k = m1.get(j) if j is not None else None
        if k is not None:
            t[i], te[i] = st[k], en[k]
    # interpolate gaps
    known = [i for i, v in enumerate(t) if v is not None]
    if not known:
        raise SystemExit('no alignment')
    for i in range(len(orig)):
        if t[i] is None:
            prev = max([k for k in known if k < i], default=None); nxt = min([k for k in known if k > i], default=None)
            if prev is None:
                t[i], te[i] = t[nxt], t[nxt]
            elif nxt is None:
                t[i], te[i] = te[prev], te[prev]
            else:
                f = (i - prev) / (nxt - prev); t[i] = te[prev] + (t[nxt] - te[prev]) * f; te[i] = t[i]
    return t, te


def chunks(text):
    """Subtitle chunks ≤ MAX_SUB chars, cut at sentence ends, then commas, then spaces."""
    out = []
    for sent in re.split(r'(?<=[.?!])\s+', text):
        sent = sent.strip()
        if not sent:
            continue
        parts = [sent]
        while any(len(p) > MAX_SUB for p in parts):
            new = []
            for p in parts:
                if len(p) <= MAX_SUB:
                    new.append(p); continue
                cands = [m.end() for m in re.finditer(r'[,،]\s|\s', p) if 6 <= m.end() <= len(p) - 4]
                if not cands:
                    new.append(p); continue
                cut = min(cands, key=lambda c: abs(c - len(p) / 2))
                new += [p[:cut].rstrip(), p[cut:].lstrip()]
            if new == parts:
                break
            parts = new
        out += parts
    return out


def main(audio, out):
    paras = json.load(open(os.path.join(audio, 'paragraphs.json'), encoding='utf-8'))
    pcm = [np.zeros(int(LEAD * SR), np.int16)]
    t = LEAD
    ptimes, ctimes, subs, texts = [], [], [], []
    for i, p in enumerate(paras):
        js = json.load(open(os.path.join(audio, p['id'] + '.json'), encoding='utf-8'))
        a, off = trim(decode(os.path.join(audio, p['id'] + '.mp3')))
        if i and i in CHAPTER_STARTS:
            pcm.append(np.zeros(int((GAP_CHAPTER - GAP) * SR), np.int16)); t += GAP_CHAPTER - GAP
        cs, ce = char_times(p['text'], p['spoken'], js['alignment'])
        cs = [t + max(0, x - off) for x in cs]; ce = [t + max(0, x - off) for x in ce]
        dur = len(a) / SR
        ptimes.append([t, t + dur]); ctimes.append([round(x, 3) for x in cs]); texts.append(p['text'])
        # subtitles
        pos = 0
        for ch in chunks(p['text']):
            k = p['text'].find(ch, pos)
            if k < 0:
                k = pos
            s0, s1 = cs[k], ce[min(len(ce) - 1, k + len(ch) - 1)]
            subs.append({'p': i, 'text': ch, 'start': round(s0, 3), 'end': round(s1 + 0.25, 3)})
            pos = k + len(ch)
        pcm.append(a); pcm.append(np.zeros(int(GAP * SR), np.int16))
        t += dur + GAP
    pcm.append(np.zeros(int((TAIL - GAP) * SR), np.int16)); t += TAIL - GAP
    for k in range(len(subs) - 1):
        if subs[k]['end'] > subs[k + 1]['start'] - 0.03:
            subs[k]['end'] = round(subs[k + 1]['start'] - 0.03, 3)
    audio_all = np.concatenate(pcm)
    os.makedirs(out, exist_ok=True)
    with wave.open(os.path.join(out, 'narration.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(audio_all.tobytes())
    data = {'paras': texts, 'ptimes': [[round(a, 3), round(b, 3)] for a, b in ptimes], 'ctimes': ctimes, 'subs': subs, 'total': round(t, 3)}
    with open(os.path.join(out, 'data.js'), 'w', encoding='utf-8') as f:
        f.write('const DATA=' + json.dumps(data, ensure_ascii=False) + ';\nconst MAP={countries:[],labels:{}};\n')
    def ts(x):
        ms = int(round(x * 1000)); return f'{ms//3600000:02d}:{ms%3600000//60000:02d}:{ms%60000//1000:02d},{ms%1000:03d}'
    with open(os.path.join(out, 'subtitles.srt'), 'w', encoding='utf-8') as f:
        for n, s in enumerate(subs, 1):
            f.write(f"{n}\n{ts(s['start'])} --> {ts(s['end'])}\n{s['text']}\n\n")
    print(f'total {t:.1f}s ({t/60:.1f} min), {len(subs)} subtitles')
    for i, (a, b) in enumerate(ptimes):
        print(i, round(a, 1), round(b, 1), texts[i][:30])


main(sys.argv[1], sys.argv[2])
