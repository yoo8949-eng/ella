"""Korean narration for 지식파노라마: one ElevenLabs request per paragraph (with character timestamps), cached on disk.

usage: tts_ko.py SCRIPT OUTDIR
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

VOICE = os.environ.get('KR_VOICE_ID', 'uyVNoMrnUku1dZyVEXwD')  # "Anna Kim" (professional, ko)
MODEL = 'eleven_multilingual_v2'
SETTINGS = {'stability': 0.45, 'similarity_boost': 0.75, 'style': 0.2, 'use_speaker_boost': True, 'speed': 1.08}
SAY_AS = [('30~40대', '삼사십 대'), ('~', '에서 '), ('%', '퍼센트'), ('AI', '에이아이'), ('0.72', '영점 칠이'), ('0.7명대', '영점 칠명대'),
          ('0.8', '영점 팔'), ('2.1명', '이점 일명'), ('1.3에서 1.4', '일점 삼에서 일점 사'), ('0%대', '영 퍼센트대')]


def key():
    k = (os.environ.get('ELEVENLABS_API_KEY') or os.environ.get('ELEVENLABS_API_KEy') or '').strip()
    return 's' + k[1:] if k.startswith('Sk_') else k


def paragraphs(path):
    return [p.strip() for p in open(path, encoding='utf-8').read().split('\n\n') if p.strip()]


def spoken(text):
    for a, b in SAY_AS:
        text = text.replace(a, b)
    return text


def api(path, body=None):
    req = urllib.request.Request('https://api.elevenlabs.io' + path, data=json.dumps(body).encode() if body else None,
                                 headers={'xi-api-key': key(), 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=300))


def main(script, out):
    os.makedirs(out, exist_ok=True)
    paras = paragraphs(script)
    print('paragraphs', len(paras), 'chars', sum(len(p) for p in paras), flush=True)
    sub = api('/v1/user/subscription')
    print('before:', sub.get('character_count'), '/', sub.get('character_limit'), flush=True)
    json.dump([{'id': f'P{i+1:02d}', 'text': p, 'spoken': spoken(p)} for i, p in enumerate(paras)],
              open(os.path.join(out, 'paragraphs.json'), 'w'), ensure_ascii=False, indent=1)
    for i, p in enumerate(paras):
        pid = f'P{i+1:02d}'
        mp3, js = os.path.join(out, pid + '.mp3'), os.path.join(out, pid + '.json')
        if os.path.exists(mp3) and os.path.exists(js):
            continue
        body = {'text': spoken(p), 'model_id': MODEL, 'voice_settings': SETTINGS,
                'previous_text': spoken(paras[i - 1]) if i else None,
                'next_text': spoken(paras[i + 1]) if i + 1 < len(paras) else None}
        for attempt in range(4):
            try:
                r = api(f'/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128', body)
                break
            except urllib.error.HTTPError as e:
                msg = e.read().decode()[:300]
                print(pid, 'HTTP', e.code, msg, flush=True)
                if e.code in (401, 402, 403):
                    sys.exit(1)
                time.sleep(5 * (attempt + 1))
        else:
            sys.exit(1)
        open(mp3, 'wb').write(base64.b64decode(r['audio_base64']))
        json.dump({'id': pid, 'text': p, 'spoken': spoken(p), 'alignment': r.get('alignment')}, open(js, 'w'), ensure_ascii=False)
        print(pid, 'ok', len(p), flush=True)
    sub = api('/v1/user/subscription')
    print('after:', sub.get('character_count'), '/', sub.get('character_limit'), flush=True)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
