# Usage: python3 make_audio.py items.json ../audio
# Makes a recorded French audio clip for every text, with SVOX Pico (offline), and bundles
# them per deck as audio/<deck>.json = {"french text": "<base64 mp3>"}.
# Each clip is checked: not missing, not silent, and not suspiciously short or long.
import sys, json, os, re, subprocess, base64, collections, tempfile, wave, array, math

SRC = sys.argv[1] if len(sys.argv) > 1 else 'items.json'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'audio'
SPEED = 92          # Pico speed in %: a little slower than normal, easier for learners

items = json.load(open(SRC))
os.makedirs(OUT, exist_ok=True)
bundles, done, problems = collections.defaultdict(dict), {}, []
tmp = tempfile.mkdtemp()

# Names the voice would read wrongly get a French-style spelling (the key stays the card text).
SAY_AS = {'Matteo': 'Mattéo', 'Aya': 'Aïa'}

def clip(text):
    wav = os.path.join(tmp, 'x.wav')
    said = re.sub(r'\w+', lambda m: SAY_AS.get(m.group(0), m.group(0)), text)
    subprocess.run(['pico2wave', '-l', 'fr-FR', '-w', wav, f'<speed level="{SPEED}">{said}</speed>'], check=True, capture_output=True)
    with wave.open(wav) as w:
        sr, frames = w.getframerate(), w.readframes(w.getnframes())
    pcm = array.array('h', frames)
    secs = len(pcm) / sr
    rms = math.sqrt(sum(x * x for x in pcm[::20]) / max(1, len(pcm[::20])))
    letters = sum(c.isalpha() for c in text)
    if secs < 0.3 or rms < 300: problems.append(f'{text}: silent or too short ({secs:.2f}s, rms {rms:.0f})')
    elif secs > 1.2 + letters * 0.16: problems.append(f'{text}: suspiciously long ({secs:.1f}s for {letters} letters)')
    mp3 = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '16000', '-b:a', '32k', '-f', 'mp3', '-'],
                         capture_output=True, check=True).stdout
    return base64.b64encode(mp3).decode()

for it in items:
    key = it['text']
    if key not in done:
        try: done[key] = clip(key)
        except Exception as e: problems.append(f'{key}: failed ({e})'); continue
    bundles[it['bundle']][key] = done[key]

total = 0
for name, d in bundles.items():
    data = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    open(f'{OUT}/{name}.json', 'w', encoding='utf-8').write(data); total += len(data)
missing = [it['text'] for it in items if it['text'] not in bundles[it['bundle']]]
print(len(done), 'clips,', len(bundles), 'bundles,', round(total / 1e6, 2), 'MB; missing:', len(missing))
print('\n'.join(problems) if problems else 'all clips checked: OK')
