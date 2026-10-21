"""Generate the v2 oil paintings with fal.ai openai/gpt-image-2 (medium), cached on disk."""
import json, os, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paintings

OUT = sys.argv[1]
IDS = sys.argv[2:] or [p[0] for p in paintings.P]
EP = 'https://queue.fal.run/openai/gpt-image-2'
HDR = {'Authorization': 'Key ' + os.environ['FAL_KEY'].strip(), 'Content-Type': 'application/json'}


def call(url, body=None, method=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=HDR, method=method)
    return json.load(urllib.request.urlopen(req, timeout=120))


os.makedirs(OUT, exist_ok=True)
log = open(os.path.join(OUT, 'gen_log.jsonl'), 'a')
for pid in IDS:
    dst = os.path.join(OUT, pid + '.png')
    if os.path.exists(dst):
        continue
    body = {'prompt': paintings.prompt(pid), 'quality': 'medium',
            'image_size': {'width': 1536, 'height': 864}, 'output_format': 'png', 'num_images': 1}
    q = call(EP, body)
    for _ in range(180):
        st = call(q['status_url'])
        if st['status'] == 'COMPLETED':
            break
        time.sleep(3)
    r = call(q['response_url'])
    if 'images' not in r:
        print(pid, 'FAILED', json.dumps(r)[:300], flush=True)
        log.write(json.dumps({'id': pid, 'error': r}) + '\n'); log.flush()
        continue
    urllib.request.urlretrieve(r['images'][0]['url'], dst)
    log.write(json.dumps({'id': pid, 'request_id': q['request_id']}) + '\n'); log.flush()
    print(pid, 'ok', flush=True)
