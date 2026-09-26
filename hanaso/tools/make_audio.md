# Rebuilding the audio

Every card has recorded audio in `audio/<deck>.json` (base64 MP3, keyed by the
Japanese text). It is made with OpenJTalk, which runs offline.

```sh
pip install pyopenjtalk-plus imageio-ffmpeg numpy
node tools/dump_items.js ../index.html items.json   # list every phrase
python3 tools/make_audio.py items.json ../audio     # synthesize + check readings
```

`make_audio.py` compares the engine's reading of the kanji with the reading in
the card. If they differ (for example 明日 read as あけび), it speaks our own
reading instead. Single kana letters are spoken as katakana, so は/へ sound
"ha"/"he" and not like particles.

If a phrase has no recorded audio, the app falls back to the phone's own voice.
