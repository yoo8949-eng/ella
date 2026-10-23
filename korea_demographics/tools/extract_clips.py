"""Extract 24 fps JPEG frames from the generated clips into tools/clips/<name>/ and write clips/info.js.
usage: extract_clips.py RAWDIR [OUTDIR (default: tools/clips)]"""
import glob, json, os, subprocess, sys
raw = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'clips')
info = {}
for mp4 in sorted(glob.glob(os.path.join(raw, '*.mp4'))):
    name = os.path.basename(mp4)[:-4]; d = os.path.join(out, name)
    if not os.path.isdir(d) or not os.listdir(d):
        os.makedirs(d, exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', 'fps=24,scale=1920:1080', '-q:v', '3', os.path.join(d, '%04d.jpg')], check=True)
    info[name] = len(os.listdir(d))
open(os.path.join(out, 'info.js'), 'w').write('window.CLIPINFO=' + json.dumps(info) + ';\n')
print(info)
