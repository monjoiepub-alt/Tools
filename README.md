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

What the "dream life" costs to buy and to keep every year, in France (Vercors),
Finland or Norway, and how much a company can carry.

- **Country:** switches prices, VAT, property fees and running costs.
- **Company type:** e.g. French EI au réel / EURL vs micro-entrepreneur, Finnish
  toiminimi with or without VAT, Norwegian ENK. Shows VAT recovered plus tax and
  social charges saved, for the business share (%) of each object only.
- **Objects by category:** home & land, vehicles (Hilux Extra Cab + camper cell),
  animals, Makita workshop, kitchen, clothes, outdoor gear, yearly lifestyle.
  Tick each object on or off, type your own buy price or yearly cost, and choose
  what goes under the company.
- **Country comparison:** the same choices priced in all three countries.
- **Checks:** company rules, the Extra Cab's utility status, French guiding diplomas,
  and fixes made to the original tool, buy-once and gear spreadsheets.

Prices are realistic September 2026 estimates in euros incl. VAT. Choices are saved
in the browser (localStorage). Edit the objects in the `CATS` list in the `<script>`.
