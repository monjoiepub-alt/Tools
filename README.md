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

An investment forecast from age 25, built from the "Plan investment" spreadsheet,
that gets more accurate every year as real results are added.

- **My real results:** once a year, type what you added, took out, and either the
  return % or the account value on 31 December (plus real inflation if you want).
  The forecast then starts again from the real value. Real returns can also move the
  future return guess slowly (credibility weighting: about 24% after 10 years).
- **Three mixes (Safe / Moderate / Aggressive):** weighted returns, fund fees (TER),
  volatility with correlations, and a "1 in 20 bad year".
- **Lowering risk over time:** the mix slides a little each year from Aggressive through
  Moderate to Safe (or jumps by age or savings size, like the spreadsheet).
- **Life plan:** money added per period, big moments, retirement spending, state pension,
  inflation, tax on profit only (Finland, Belgium 2026, Japan or custom), buying costs.
- **Stress test:** 2,000 random futures with fat-tailed returns show the chance the money
  lasts, a good/middle/bad range, and the highest safe yearly spending.

The plan is saved in the published page's own database (`plan/settings` and
`plan/actuals`), with the browser as a fallback; "Backup and reset" saves a file or copies the plan as text.
