# Tools

## Career Compass (`career-compass/index.html`)

A single-page tool that shows what you need for different jobs in
Finland, Sweden, Norway, France and Japan, and compares each requirement
with the certificates two people (Aya and Max) already have.

- **Start screen:** pick Aya or Max; the whole tool then shows only that person's
  toolbox, jobs and numbers ("Show all jobs" shows the other person's jobs too).
- **Toolbox:** tap certificates and languages to mark them as have / in progress.
- **Who fits best:** the top job + country matches for each person.
- **Overview table:** readiness, cost left, or break-even time for each job in each country.
- **Money:** rough course fees still to pay, time to get ready, typical pay, and when the
  training (or a business investment) pays for itself. A slider sets how much of your
  take-home pay goes to paying it back.
- **Job cards:** checklist, whether the job is regulated by law, time needed,
  right-to-work notes and official links.

Your changes are saved in the browser (localStorage). Information was checked
in September 2026; always confirm on the official sites.

To edit the job data, change the `DATA` object inside the `<script>` in
`career-compass/index.html`.

## Parlons (`parlons/index.html`)

French flashcards and a daily 20-minute lesson for Aya, to talk with her Belgian
husband, his family in Wallonia and strangers. Built like Hanasō.

- **Daily lesson (30-day plan, review every 7th day, then automatic lessons by priority):**
  sounds of the day (reading and listening, with a quiz) → topic and one grammar point →
  cards → tonight's conversation with him (starter sentences, his part, "We talked! +30 XP").
- **Decks:** first steps, with him (tu), with his family (tu), at the table, about me,
  out and about (vous), Belgian French, outdoors and guiding, my story, home and couple life,
  ~800 core words in topics, and grammar patterns. Belgian vs France differences are marked.
- **Cards:** understand (FR → EN) and speak (EN → FR, unlocks later), three buttons, ★ priority,
  spaced repetition. An easy pronunciation help fades once you know all the sounds in a card.
- **Audio:** recorded offline for every card (SVOX Pico), phone voice only as a backup.
  See `parlons/tools/README.md` to rebuild it.
- **Progress** is saved privately in your Claude account (db capability) and on the phone; the newer
  save wins when the app opens. Settings shows where it is saved and has a backup code.
- **Game:** XP and levels, sound stickers (hidden until collected), badges, a card album, a bonus chest
  after each lesson, and a reward shop where XP buys real rewards from Max (plus your own rewards).
