"""Mix narration.wav + procedural SFX cues (events.json from render.mjs events) -> mix.wav
usage: mix_ko.py BUILDDIR
"""
import json, os, sys, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sfx import BANK, GAIN, SR

build = sys.argv[1]
with wave.open(os.path.join(build, 'narration.wav')) as w:
    nar = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
events = json.load(open(os.path.join(build, 'events.json')))
sfx = np.zeros(len(nar) + SR * 3, np.float32)
# avoid machine-gun pops: drop a cue of the same type within 0.12 s of the previous one
last = {}
n_used = 0
for typ, t0 in sorted(events, key=lambda e: e[1]):
    if typ not in BANK:
        continue
    if t0 - last.get(typ, -9) < 0.12:
        continue
    last[typ] = t0
    x = BANK[typ] * GAIN[typ]
    i = int(t0 * SR)
    if i >= len(sfx):
        continue
    x = x[:len(sfx) - i]
    sfx[i:i + len(x)] += x
    n_used += 1
sfx = sfx[:len(nar)]
# duck SFX slightly while narration is loud
win = int(SR * 0.05)
env = np.convolve(np.abs(nar), np.ones(win) / win, mode='same')
duck = 1 - 0.35 * np.clip(env / 0.08, 0, 1)
mix = nar + sfx * duck
peak = np.max(np.abs(mix))
if peak > 0.98:
    mix = mix / peak * 0.98
with wave.open(os.path.join(build, 'mix.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f'{n_used} cues mixed, peak {20*np.log10(peak+1e-9):.1f} dB')
