"""Generate the AI video clips (fal.ai Kling 2.5 turbo pro, text-to-video, 5 s, 16:9), cached on disk.
usage: gen_kling.py OUTDIR [ids...]"""
import json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kling_plan import CLIPS
OUT = sys.argv[1]; IDS = set(sys.argv[2:])
EP = 'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/text-to-video'
HDR = {'Authorization': 'Key ' + os.environ['FAL_KEY'].strip(), 'Content-Type': 'application/json'}
NEG = 'text, letters, subtitles, watermark, logo, close-up face, distorted faces, blurry, low quality'
def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=HDR)
    return json.load(urllib.request.urlopen(req, timeout=120))
def gen(c):
    cid, _, prompt = c
    dst = os.path.join(OUT, cid + '.mp4')
    if os.path.exists(dst): return cid + ' cached'
    try:
        q = call(EP, {'prompt': prompt, 'duration': '5', 'aspect_ratio': '16:9', 'negative_prompt': NEG, 'cfg_scale': 0.5})
        for _ in range(400):
            st = call(q['status_url'])
            if st['status'] == 'COMPLETED': break
            time.sleep(5)
        r = call(q['response_url'])
        urllib.request.urlretrieve(r['video']['url'], dst)
        return cid + ' ok'
    except Exception as e:
        body = getattr(e, 'read', lambda: b'')()
        return f'{cid} FAILED {e} {body[:300]!r}'
os.makedirs(OUT, exist_ok=True)
todo = [c for c in CLIPS if not IDS or c[0] in IDS]
with ThreadPoolExecutor(5) as ex:
    for msg in ex.map(gen, todo): print(msg, flush=True)
