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

## Dream Life Calculator (`dream-life/`)

Two connected pages for choosing where to settle: one scores how well each place fits,
the other prices the full "dream life" there.

### Settlement Score (`dream-life/settlement.html`)
14 places scored 1–10 on 12 criteria (property, green mountains, outdoor sports,
paperwork, language, guiding tourism, business potential, van life, healthcare…),
with editable weights, sorting, citizenship years and dual-citizenship rules.
Places with a € badge also have full cost data in the calculator.

### Cost calculator (`dream-life/index.html`)
France (Vercors), Sweden (Jämtland/Åre), Finland (Äkäslompolo/Ylläs), Norway
(Hallingdal/Valdres) and Japan (rural Nagano akiya), side by side. Income and income
tax are left out on purpose (handled in a separate calculator).

- **The answer:** buying cost, yearly cost, long-term total and the fit score from the
  Settlement Score (using the same weights), ranked against any chosen country.
- **Line by line:** a cheap house to renovate, fees, renovation paid from savings,
  deposit / amount borrowed / cash needed on buying day, property tax, insurance,
  energy, upkeep, mortgage interest after tax relief, food, everyday costs, healthcare,
  vehicles, animals, passes, travel, professional insurance, investment tax and what
  the company carries. Every cell is editable per country.
- **Investments:** tax while holding and when selling by amount (French PEA, Swedish
  ISK, Finnish equity savings account, Norwegian ASK + wealth tax, Japanese NISA).
- **Objects:** vehicles, animals, Makita workshop, kitchen, clothes and outdoor gear,
  each selectable, with a company toggle and business share.

Both pages read `dream-life/settlement-data.js` (scores and weights). Numbers are
September 2026 estimates in euros (SEK 11.0, NOK 11.7, JPY 170). Changes are saved
in the browser (localStorage).
