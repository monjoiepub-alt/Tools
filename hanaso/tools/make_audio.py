# Usage: python3 make_audio.py items.json out_dir
import sys, json, pyopenjtalk, numpy as np, subprocess, base64, os, re, collections, imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
SRC = sys.argv[1] if len(sys.argv) > 1 else 'items.json'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'audio'
items = json.load(open(SRC))
os.makedirs(OUT, exist_ok=True)
bundles = collections.defaultdict(dict)
report = {'kanji': 0, 'kana': 0, 'failed': []}
mismatch = []
E_ROW = 'エケセテネヘメレゲゼデベペ'
O_ROW = 'オコソトノホモヨロゴゾドボポョ'
U_ROW = 'ウクスツヌフムユルグズブプュ'
def kat(x): return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in x)
def norm(k):  # compare pronunciations: katakana, long vowels written one way, no punctuation
    k = re.sub(r'[、。？！\s]', '', kat(k)).replace('ヅ', 'ズ').replace('ヂ', 'ジ')
    k = re.sub('([%s])イ' % E_ROW, r'\1ー', k)
    k = re.sub('([%s])ウ' % O_ROW, r'\1ー', k)
    k = re.sub('([%s])ウ' % U_ROW, r'\1ー', k)
    return k
def synth(text):
    x, sr = pyopenjtalk.tts(text)
    return x, sr
done = {}
for it in items:
    key = it['text']
    if key in bundles[it['bundle']]: continue
    if key in done: bundles[it['bundle']][key] = done[key]; continue
    use = key
    try:
        if it['bundle'] in ('hira', 'kata'):
            # Single letters: katakana so は/へ are read "ha"/"he", not as particles.
            use = kat(key)
            x, sr = synth(use)
            raise StopIteration
        want = norm(it['ours'])
        a = norm(pyopenjtalk.g2p(key, kana=True))
        if a != want:
            use = it['spoken']
            b = norm(pyopenjtalk.g2p(use, kana=True))
            mismatch.append(f"{key}: engine {a} → fallback {b}" + ('' if b == want else f"   !! still differs from {want}"))
        x, sr = synth(use)
    except StopIteration:
        pass
    except Exception as e:
        report['failed'].append(f"{key} ({e})"); continue
    try:
        if len(x) < sr * 0.15: raise Exception('too short')
        pcm = np.clip(x, -32768, 32767).astype(np.int16).tobytes()
        mp3 = subprocess.run([FF, '-loglevel', 'error', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-', '-ar', '24000', '-b:a', '32k', '-f', 'mp3', '-'],
                             input=pcm, capture_output=True, check=True).stdout
        b64 = base64.b64encode(mp3).decode()
        bundles[it['bundle']][key] = b64; done[key] = b64
        report['kana' if use != key else 'kanji'] += 1
    except Exception as e:
        report['failed'].append(f"{key} ({e})")
total = 0
for name, d in bundles.items():
    data = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    open(f'{OUT}/{name}.json', 'w').write(data); total += len(data)
print(report['kanji'], 'from kanji,', report['kana'], 'from our kana reading; failed:', report['failed'])
print('bundles', len(bundles), 'total MB', round(total / 1e6, 2))
print('\n'.join(mismatch))
