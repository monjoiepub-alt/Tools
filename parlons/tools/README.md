# Rebuilding the pronunciation help and the audio

Every card has recorded audio in `audio/<deck>.json` (base64 MP3, keyed by the French
text) and an easy pronunciation help ("bohn-ZHOOR") stored inside `index.html`
between `/*PRON*/` and `/*END PRON*/`. Both are made offline.

```sh
sudo apt-get install libttspico-utils espeak-ng ffmpeg   # SVOX Pico voice, eSpeak NG, ffmpeg
node tools/dump_items.js index.html items.json          # list every French text
python3 tools/make_pron.py items.json index.html        # pronunciation help (from eSpeak NG's IPA)
python3 tools/make_audio.py items.json audio            # recorded audio (SVOX Pico, fr-FR)
```

`make_audio.py` checks every clip (not missing, not silent, not suspiciously long).
`make_pron.py` stops if eSpeak switches to English for a word; add that word to
`AS_FRENCH` with a French-style spelling.

If a phrase has no recorded audio, the app falls back to the phone's own voice.
