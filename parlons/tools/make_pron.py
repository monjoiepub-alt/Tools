# Usage: python3 make_pron.py items.json ../index.html
# Makes the easy pronunciation help ("bohn-ZHOOR") for every French text and writes it
# into index.html between /*PRON*/ and /*END PRON*/.
# eSpeak NG gives the exact sounds (IPA); this script turns them into an easy spelling:
# syllables joined with -, the stressed last syllable in CAPS, ⁿ after a nasal vowel.
import sys, json, re, subprocess

SRC = sys.argv[1] if len(sys.argv) > 1 else 'items.json'
PAGE = sys.argv[2] if len(sys.argv) > 2 else 'index.html'

VOWELS = {'a': 'a', 'ɑ': 'a', 'e': 'ay', 'ɛ': 'eh', 'ə': 'uh', 'i': 'ee', 'o': 'oh', 'ɔ': 'o', 'u': 'oo', 'y': 'ü', 'ø': 'ö', 'œ': 'ö',
          'ɑ̃': 'ahⁿ', 'ɔ̃': 'ohⁿ', 'ɛ̃': 'ehⁿ', 'œ̃': 'uhⁿ', 'ã': 'ahⁿ', 'õ': 'ohⁿ', 'ẽ': 'ehⁿ'}
CONS = {'ʁ': 'r', 'r': 'r', 'ʒ': 'zh', 'ʃ': 'sh', 'ɲ': 'ny', 'ŋ': 'ng', 'j': 'y', 'w': 'w', 'ɥ': 'w', 'x': 'kh', 'ɡ': 'g'}
GLIDES = set('jwɥ')
OBSTRUENT = set('pbtdkgɡfv')
LIQUID = set('ʁl')

# eSpeak reads a few words as English. It gets a French-style spelling instead (the card text stays the same).
AS_FRENCH = {'dos': 'dau', 'hypothermie': 'ipotermie', 'week-end': 'ouikènde', 'mamy': 'mami', 'papy': 'papi',
             'speculoos': 'spékuloss', 'pull': 'pule', 'parking': 'parkinng', 'wallonie': 'walonie',
             'matteo': 'mattéo', 'aya': 'aïa'}

def espeak(text):
    text = re.sub(r"[\w-]+", lambda m: AS_FRENCH.get(m.group(0).lower(), m.group(0)), text)
    out = subprocess.run(['espeak-ng', '-v', 'fr', '-q', '--ipa', text], capture_output=True, text=True, check=True).stdout
    assert '(' not in out, 'eSpeak switched language in: ' + text + ' → ' + out
    return ' '.join(out.split())

def phonemes(ipa):
    """Split IPA into phonemes; ' ' marks a word boundary."""
    ipa = re.sub(r'[ˈˌːˑ‿]', '', ipa).replace('-', '')
    out = []
    for ch in ipa:
        if ch == '̃' and out: out[-1] += ch; continue
        if ch.isspace():
            if out and out[-1] != ' ': out.append(' ')
            continue
        out.append(ch)
    while out and out[-1] == ' ': out.pop()
    # eSpeak writes the glide in "huit" as y; before a vowel it is ɥ.
    for i, p in enumerate(out):
        nxt = next((q for q in out[i + 1:] if q != ' '), None)
        if p == 'y' and nxt in VOWELS and (i + 1 < len(out) and out[i + 1] != ' '): out[i] = 'ɥ'
    return out

def ok_onset(cl):
    if len(cl) <= 1: return True
    if len(cl) == 2: return (cl[0] in OBSTRUENT and cl[1] in LIQUID) or (cl[1] in GLIDES and cl[0] not in GLIDES)
    if len(cl) == 3: return cl[0] in OBSTRUENT and cl[1] in LIQUID and cl[2] in GLIDES
    return False

def syllables(ph):
    """Returns a list of (syllable phonemes, starts_new_word)."""
    seq, wb = [], set()          # wb: index in seq where a new word starts
    for p in ph:
        if p == ' ': wb.add(len(seq)); continue
        seq.append(p)
    vpos = [i for i, p in enumerate(seq) if p in VOWELS]
    if not vpos: return [(seq, False)] if seq else []
    cuts = [0]
    for a, b in zip(vpos, vpos[1:]):
        cl = seq[a + 1:b]
        k = 0
        while not ok_onset(cl[k:]): k += 1
        # s + consonant can start a word (ski, stage): keep it together when a new word starts with it.
        for w in wb:
            if a < w < a + 1 + k and seq[w] == 's' and seq[w + 1] not in VOWELS and ok_onset(seq[w + 1:b]):
                k = w - a - 1
        cuts.append(a + 1 + k)
    cuts.append(len(seq))
    out = []
    for n in range(len(cuts) - 1):
        s, e = cuts[n], cuts[n + 1]
        # A new word starts at this syllable if a word boundary falls between the previous vowel and this one.
        prev_v = vpos[n - 1] if n > 0 else -1
        new_word = n > 0 and any(prev_v < w <= (vpos[n] if n < len(vpos) else e) for w in wb)
        out.append((seq[s:e], new_word))
    return out

def spell(syl):
    s, i = '', 0
    while i < len(syl):
        p = syl[i]
        if p in VOWELS:
            v = VOWELS[p]
            if v == 'a' and i + 1 < len(syl) and syl[i + 1] == 'j': v = 'ah'   # travail = tra-VAHY
            s += v
        else: s += CONS.get(p, p)
        i += 1
    return s

def respell(text):
    parts = re.split(r'([,;:!?.…]+)', text)
    out = []
    for chunk in parts:
        if not chunk.strip(): continue
        if re.fullmatch(r'[,;:!?.…]+', chunk):
            if '?' in chunk: out.append('?')
            elif '!' in chunk: out.append('!')
            elif ',' in chunk or ';' in chunk: out.append(',')
            continue
        syl = syllables(phonemes(espeak(chunk)))
        if not syl: continue
        words = ''
        for n, (ph, new_word) in enumerate(syl):
            piece = spell(ph)
            if n == len(syl) - 1: piece = piece.upper()
            words += (' ' if new_word else '-') + piece if n else piece
        out.append(words)
    s = ''
    for x in out:
        s += x if x in '?!,' else (' ' if s else '') + x
    return s.replace(' ?', '?').replace(' !', '!')

if __name__ == '__main__':
    items = json.load(open(SRC))
    pron = {}
    for it in items:
        t = it['text']
        if t not in pron: pron[t] = respell(t)
    page = open(PAGE, encoding='utf-8').read()
    data = json.dumps(pron, ensure_ascii=False, separators=(',', ':'))
    page, n = re.subn(r'/\*PRON\*/.*?/\*END PRON\*/', lambda m: '/*PRON*/' + data + '/*END PRON*/', page, flags=re.S)
    assert n == 1, 'PRON markers not found'
    open(PAGE, 'w', encoding='utf-8').write(page)
    print(len(pron), 'texts,', len(data) // 1000, 'kB')
