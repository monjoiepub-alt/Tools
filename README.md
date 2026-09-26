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

- **Decks:** First steps, With Aya's family (casual), At the table (casual),
  About me, With Aya (casual), Out and about, Family words, Everyday words,
  Numbers and money, Driving and road signs, Food and menus (with Aomori
  specialities), Ski rental shop, Mountain hut on Fuji, Shikoku henro,
  Aomori dialect, Hiragana and Katakana.
- **Signs and menus** start in kanji with furigana, because that is how
  you see them in real life.
- **Writing grows with each card:** romaji → kana (after 1 week) →
  kanji with furigana (after 3 weeks) → kanji only (after 2 months).
- **Spaced repetition:** Again / Hard / Good / Easy, like Anki.
- **Two directions:** understand (JP → EN) and speak (EN → JP).
- **Audio** with the phone's Japanese voice, a searchable **phrasebook**,
  and a "show big" mode to show a sentence to someone.

Progress is saved in the browser (localStorage). Use Settings → Backup to
copy a backup code.

To add sentences, edit the `DECKS` list inside the `<script>`. Write
`{漢字|かな}` for kanji with its reading, add `'read'` as the 4th field for
signs and menu words (kanji first), put spaces between words (for the
romaji), and write `^は` for the particle は (read "wa").
