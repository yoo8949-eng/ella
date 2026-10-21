"""Generate Bill narration per paragraph with ElevenLabs (with-timestamps), cached on disk."""
import base64, json, os, sys, time, urllib.request, urllib.error

VOICE = 'pqHfZKP75CvOlQylNhV4'  # Bill
MODEL = 'eleven_multilingual_v2'
SCRIPT = sys.argv[1]
OUT = sys.argv[2]


def key():
    k = os.environ['ELEVENLABS_API_KEY'].strip()
    return 's' + k[1:] if k.startswith('Sk_') else k


def paragraphs(path):
    """Return [(chapter_title, text)] for every spoken paragraph."""
    out, chapter, buf = [], None, []
    for line in open(path, encoding='utf-8').read().splitlines() + ['']:
        if line.startswith('#'):
            if line.startswith('# Intro') or line.startswith('# Chapter'):
                chapter = line[2:].strip()
            continue
        if line.strip():
            buf.append(line.strip())
        elif buf:
            out.append((chapter, ' '.join(buf)))
            buf = []
    return out


def api(path, body=None):
    req = urllib.request.Request('https://api.elevenlabs.io' + path,
                                 data=json.dumps(body).encode() if body else None,
                                 headers={'xi-api-key': key(), 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=300))


def main():
    os.makedirs(OUT, exist_ok=True)
    paras = paragraphs(SCRIPT)
    print('paragraphs', len(paras), 'chars', sum(len(t) for _, t in paras), flush=True)
    sub = api('/v1/user/subscription')
    print('before: character_count', sub.get('character_count'), 'limit', sub.get('character_limit'), flush=True)
    json.dump([{'id': f'P{i+1:02d}', 'chapter': c, 'text': t} for i, (c, t) in enumerate(paras)],
              open(os.path.join(OUT, 'paragraphs.json'), 'w'), indent=1)
    for i, (chapter, text) in enumerate(paras):
        pid = f'P{i+1:02d}'
        mp3, js = os.path.join(OUT, pid + '.mp3'), os.path.join(OUT, pid + '.json')
        if os.path.exists(mp3) and os.path.exists(js):
            continue
        body = {'text': text, 'model_id': MODEL,
                'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0, 'use_speaker_boost': True},
                'previous_text': paras[i-1][1] if i else None,
                'next_text': paras[i+1][1] if i + 1 < len(paras) else None}
        for attempt in range(4):
            try:
                r = api(f'/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128', body)
                break
            except urllib.error.HTTPError as e:
                msg = e.read().decode()[:300]
                print(pid, 'HTTP', e.code, msg, flush=True)
                if e.code in (401, 402, 403) or 'quota' in msg:
                    sys.exit(1)
                time.sleep(5 * (attempt + 1))
        else:
            sys.exit(1)
        open(mp3, 'wb').write(base64.b64decode(r['audio_base64']))
        json.dump({'id': pid, 'chapter': chapter, 'text': text, 'alignment': r.get('alignment'),
                   'normalized_alignment': r.get('normalized_alignment')}, open(js, 'w'))
        print(pid, 'ok', len(text), flush=True)
    sub = api('/v1/user/subscription')
    print('after: character_count', sub.get('character_count'), 'limit', sub.get('character_limit'), flush=True)


main()
