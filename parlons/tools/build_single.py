# Usage: python3 build_single.py [../index.html] [../audio] [../dist/parlons.html]
# Builds ONE self-contained HTML file: the page plus every recording (audio/*.json) inside it,
# so nothing else has to be published or downloaded next to it.
import sys, json, os, glob

PAGE = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
AUDIO = sys.argv[2] if len(sys.argv) > 2 else 'audio'
OUT = sys.argv[3] if len(sys.argv) > 3 else 'dist/parlons.html'

page = open(PAGE, encoding='utf-8').read()
bundles = {os.path.basename(f)[:-5]: json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(AUDIO, '*.json')))}
data = json.dumps(bundles, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
at = page.index('<script>')   # the embedded audio must exist before the app script runs
out = page[:at] + '<script>const AUDIO_EMBED = ' + data + ';</script>\n' + page[at:]
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(out)
clips = sum(len(b) for b in bundles.values())
size = len(out.encode('utf-8'))
print(f'{OUT}: {len(bundles)} bundles, {clips} clips, {size / 1e6:.2f} MB')
assert size < 16e6, 'too big for one artifact page (16 MB)'
