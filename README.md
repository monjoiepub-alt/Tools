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

## Dream Life Calculator (`dream-life/index.html`)

A 10-year (2027–2036) cost plan for a "dream life": Hilux + camper cell, a cabin
with land on a mortgage, dogs, chickens, a horse, motorbikes, a sports car,
a Makita workshop, buy-once-for-life kit and outdoor gear.

- **Short answer:** one-off cost of everything, yearly cost once everything is
  owned, the gross income that needs, the lowest savings point and a "€1,000 test".
- **Chart and year table:** savings at the end of each year against an emergency buffer.
- **Steps:** tick, pick a version (e.g. used diesel vs new hybrid Hilux) and a year.
  "Find the earliest year I can afford each step" plans them in priority order.
- **Country presets:** France (Vercors), Finland (rural), Norway (rural).
- **Shopping lists:** the tool, buy-once and gear spreadsheets, converted to euros
  for Europe, with problems in the original lists marked.
- **Reality checks:** mortgage limits, the French CO₂ malus on double-cab pick-ups,
  teaching rules for non-EU nationals, licences, animal needs, insurance.

All amounts are rough September 2026 estimates in today's euros. Changes are
saved in the browser (localStorage). Edit the data at the top of the `<script>`.
