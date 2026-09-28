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

An investment forecast for one account split into two "mental buckets",
updated each January with real results so it gets more accurate every year.

- **Bucket 1 · Project fund:** van and house down payment in 5 years. Only safe assets
  (high-yield savings, money market fund, short-term government bonds). Shows whether the
  goals are funded and the minimum split (or extra money) needed to fund them.
- **Bucket 2 · Retirement fund:** starts at 70% global stocks / 22% crypto / 8% gold, then
  follows a glide path in three phases: trim crypto, scale stocks down (part into dividend
  value stocks), then re-evaluate gold. Everything sold moves into high-quality bonds.
- **Split:** new money goes 60/40 into the buckets (editable); after the project, all new
  money (and optionally the leftover) goes to retirement.
- **My real results:** per bucket, what was added / taken out and the return % or 31 Dec value.
  The forecast restarts from the real values; real returns adjust future guesses by
  credibility (fast for cash, slow for stocks).
- **January rebalance helper:** current value per fund → this year's target, full-rebalance
  buy/sell amounts and a "new money only" plan.
- **Stress test:** 2,000 random futures (fat tails) for each bucket and the total: chance the
  goals are paid, chance the money lasts, and the highest safe yearly spending.

The plan is saved in the published page's own database (`plan3/settings` and
`plan3/actuals`), with the browser as a fallback; "Backup and reset" saves a file or copies the plan as text.
