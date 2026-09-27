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

A four-country budget for one specific "dream life": France (Vercors), Sweden
(Jämtland/Åre), Finland (Kuusamo/Lapland) and Norway (Hallingdal/Valdres), side by side.
Income and income tax are left out on purpose (handled in a separate calculator).

- **The answer:** buying cost, yearly cost and a long-term total per country, ranked,
  with the biggest differences against the country you compare with.
- **Line by line:** house, transfer tax, renovation, property tax, insurance, energy,
  upkeep, mortgage interest after tax relief, food (price level), everyday costs,
  healthcare (typical year + worst-case caps), vehicles, animals, passes, travel,
  investment tax and what the company carries. Every cell is editable per country.
- **Investments:** tax while holding and when selling, depending on the amount
  (French PEA 18.6% / 31.4%, Swedish ISK 1.065% above SEK 300,000 each, Finnish
  30%/34% + equity savings account, Norwegian ASK + wealth tax).
- **Company:** choose the company type per country; objects can go under the company
  with a business share, giving VAT back plus tax saved.
- **Objects:** vehicles, animals, Makita workshop, kitchen, clothes and outdoor gear,
  each selectable, grouped by category.

Numbers are September 2026 estimates in euros (SEK 11.0, NOK 11.7). Changes are
saved in the browser (localStorage). Edit `ROWS` and `OBJ` in the `<script>`.
