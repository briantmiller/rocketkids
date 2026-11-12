#!/usr/bin/env python3
"""Turns voice/lines.json into voice/<id>.mp3 clips with the Kokoro neural voice.

Setup (once):  pip install kokoro-onnx soundfile numpy   and install ffmpeg
Download kokoro-v1.0.onnx and voices-v1.0.bin from
https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
Run from the project folder:
    node tools/lines.mjs
    python3 tools/build_voice.py /path/to/model/folder [voice] [speed]
Try other voices: af_heart (default), af_bella, af_nova, am_puck, bf_emma ...
"""
import json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

model_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
VOICE = sys.argv[2] if len(sys.argv) > 2 else 'af_heart'
SPEED = float(sys.argv[3]) if len(sys.argv) > 3 else 0.95
FORCE = '--force' in sys.argv

def clip_id(text):
    h = 0x811c9dc5
    for b in ' '.join(text.split()).encode('utf-8'):
        h ^= b; h = (h * 0x01000193) & 0xffffffff
    return f'{h:08x}'

# Spellings that help the voice say things the way a person would.
SAY_AS = {
    'Ka-boom!': 'Kaboom!', 'Whee!': 'Wheeee!', 'Hot hot hot!': 'Hot, hot, hot!',
    'Zoom zoom!': 'Zoom, zoom!', 'Bonk, bonk, bonk!': 'Bonk! Bonk! Bonk!', 'Tap, tap!': 'Tap! Tap!',
}
def spoken(text):
    for a, b in SAY_AS.items(): text = text.replace(a, b)
    return text

lines = json.load(open('voice/lines.json'))
kok = Kokoro(os.path.join(model_dir, 'kokoro-v1.0.onnx'), os.path.join(model_dir, 'voices-v1.0.bin'))
ids, made = [], 0
for text in lines:
    cid = clip_id(text); ids.append(cid)
    out = f'voice/{cid}.mp3'
    if os.path.exists(out) and not FORCE: continue
    s, sr = kok.create(spoken(text), voice=VOICE, speed=SPEED, lang='en-us')
    s = np.asarray(s, dtype=np.float32)
    loud = np.where(np.abs(s) > 0.003)[0]   # keep soft starts like "h" and "f"
    if len(loud): s = s[max(0, loud[0] - int(sr * 0.06)): loud[-1] + int(sr * 0.15)]
    rms = float(np.sqrt(np.mean(s ** 2))) or 1e-6
    s = s * min(0.95 / (float(np.abs(s).max()) or 1), 0.16 / rms)
    n = int(sr * 0.01); s[:n] *= np.linspace(0, 1, n); s[-n:] *= np.linspace(1, 0, n)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp: wav = tmp.name
    sf.write(wav, s, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '24000', '-b:a', '48k', out], check=True)
    os.unlink(wav); made += 1
keep = set(ids)
for f in os.listdir('voice'):
    if f.endswith('.mp3') and f[:-4] not in keep: os.unlink(os.path.join('voice', f))
json.dump(sorted(keep), open('voice/index.json', 'w'))
print(f'{len(keep)} clips ({made} new)')
