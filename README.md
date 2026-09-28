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

## Aya & Max Money Plan (`money-plan/index.html`)

A rebuild of the "Plan investment" spreadsheet (budget, three investment mixes,
capital build-up from age 25) that is more realistic:

- **Household budget:** net pay, basic costs, saving %, emergency fund goal in months,
  and where each month's pay goes (Joint Wise → Belfius → Interactive Brokers → fun money).
- **Three mixes (Safe / Moderate / Aggressive):** weighted returns (the sheet used a
  plain AVERAGE), fund fees (TER), volatility with correlations, and a "1 in 20 bad year".
- **Life plan:** money added per period, big moments (van life, house), places,
  retirement spending, state pension, and the switch rule between mixes.
- **Realism:** everything in today's euros with inflation, tax only on the profit part
  (Finland, Belgium 2026, Japan or custom), buying costs, half-year timing for new money.
- **Stress test:** 2,000 random futures with fat-tailed returns show the chance the money
  lasts, a good/middle/bad range, and the highest safe yearly spending.
- **Check against the sheet:** the sheet's own rules are re-run side by side
  (they give the same €689,836 at age 99 as the spreadsheet).

Changes are saved in the browser (localStorage); "Save or move your plan" copies the plan as text.
