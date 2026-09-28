# Tools

## Career Compass (`career-compass/index.html`)

A single-page tool that shows what you need for different jobs in
Finland, Sweden, Norway, France and Japan, and compares each requirement
with the certificates you already have.

- **Toolbox:** tap certificates and languages to mark them as have / in progress.
- **Overview table:** how ready you are for each job in each country.
- **Job cards:** checklist, whether the job is regulated by law, time needed,
  right-to-work notes and official links.

Your changes are saved in the browser (localStorage). Information was checked
in September 2026; always confirm on the official sites.

To edit the job data, change the `DATA` object inside the `<script>` in
`career-compass/index.html`.

## Hanasō 話そう (`hanaso/index.html`)

A flashcard app for learning Japanese on a phone, made for talking with
Aya's family, with strangers, and with Aya.

- **A daily ~20-minute lesson:** open the app, tap *Start today's lesson*:
  0. Letters of the day: 3 new letters, one at a time (sound, memory trick,
     a word he is learning), then a short quiz with older letters. Reading
     only. Order: hiragana → ゛ ゜ っ ゃ → katakana → ー.
  1. Topic of the day + one grammar pattern with examples and audio.
  2. Cards: the day's new words mixed with reviews (~40 cards).
  3. Tonight's conversation: a mission to do with Aya, with starter
     sentences for him and a part for Aya. Tap *We talked!* when done.
- **A 30-day plan** (greetings → family → food → time → verbs → places →
  driving → weather → shopping → Aomori food → health → ski shop → dreams),
  with a review day every 7th day. After day 30, lessons are picked by
  priority, one deck at a time.
- **Game:** XP (1 per card, 20 per lesson, 30 per conversation), levels
  from たまご (egg) to ふじ (Mt Fuji), a streak, badges, and a calendar
  where conversation days get a 話 stamp.
- **About 950 phrases and words, plus the kana.** 176 sentences and 774 single
  words, in four groups:
  - *Everyday conversation:* First steps, With Aya's family (casual), At the
    table (casual), About me, With Aya (casual), Out and about.
  - *Core vocabulary (~800 words):* time, people and body, food, home, places,
    nature, verbs, describing words, colours, little words, work and money,
    family words, everyday words, numbers.
  - *Your trip:* driving and road signs, food and menus (Aomori), ski rental
    shop (Niseko), mountain hut on Fuji, Shikoku henro, Aomori dialect.
  - *Letters:* hiragana and katakana.
- **Both directions:** every phrase has an understand card (JP → EN) and a
  speaking card (EN → JP). In a lesson, each new word comes both ways:
  first JP → EN, later in the same lesson EN → JP.
- **Random order** every session. **Fixed lesson size:** each card gets one
  second try; if it is still hard, it comes back tomorrow.
- **Three buttons:** See again / I know the meaning (but not the writing:
  the card comes back without romaji, and stays without romaji) / I know it.
- **Priority stars (★★★ / ★★ / ★):** new cards come in order of importance,
  and ★★★ cards come back more often. Tap the stars on a card to change them.
- **Letter hunt:** letters he can already read light up in green.
- **Writing grows with each card:** romaji with the letters he already
  learned shown in kana (ohayoう…) → all kana (as soon as he knows all
  of the card's letters) →
  kanji with furigana (after 3 weeks) → kanji only (after 2 months).
  Signs and menu words start in kanji with furigana.
- **Recorded audio for every card** (`audio/`, made offline with OpenJTalk; see
  `tools/make_audio.md`). The phone's own voice is only a backup, a searchable **phrasebook**,
  and a "show big" mode to show a sentence to someone.

- **Reward shop 🏮:** spend XP on real-life rewards from Aya (chocolate,
  massage, bouquet, dinner…). Buying gives a coupon; Aya taps *Given* when
  it is done. Aya can add her own rewards. Spending never lowers the level.
- **Collections 🎴:** letters, kanji and reward stickers stay hidden (？)
  until collected. A kanji is collected when a card that uses it is
  answered with *I know it*.
- **Sakura theme** with emoji for every deck and tab, and a night-sky dark mode.

Progress is saved in the browser (localStorage). The app asks the browser to
keep it permanently and shows a warning if this browser cannot save. Use Settings → Backup to
copy a backup code.

To change the daily course, edit `LESSONS` (cards are linked as
`'deckId:kanji text'`). To add sentences, edit the `DECKS` list inside the `<script>`. A number
inside a deck's list (3, 2 or 1) sets the priority of the cards after it. Write
`{漢字|かな}` for kanji with its reading, add `'read'` as the 4th field for
signs and menu words (kanji first), put spaces between words (for the
romaji), and write `^は` for the particle は (read "wa").
