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

## Ridgeline life planner (`life-planner/index.html`)

A single-page planner for two people doing seasonal outdoor work. Pick a job
for each person in winter and summer, choose country, company, work zone,
status, home and work rhythm, and see what it means for money over 15 years.

- **Jobs by season:** pay, hours/week, months and start month are editable per job.
  Pay is scaled to the chosen country's pay level. Warns when a person's winter and
  summer jobs overlap.
- **Money settings:** living costs, social charges + income tax (follow the country and
  status until you change them), house price / mortgage / owner costs / value growth,
  training loan interest, pay while training, starting savings, a "bad season every
  N years" test and an emergency fund target.
- **Results:** training debt, loan payment, costs, savings per year, safety cushion,
  and when savings get back above zero.
- **Month by month:** who earns what each month and which months are in minus,
  plus the buffer needed to get through them.
- **Chart:** savings (and wealth, when buying) over 15 years with a training →
  working timeline; hover, tap or use arrow keys; table view included.
- **Scenarios:** save, compare two (table + chart), export/import as JSON, or copy a
  share link that opens the exact setup.
- **Sources & estimates:** every number, marked as sourced or "estimate — check".

Settings and scenarios are saved in the browser (localStorage). Scenarios from the
first (French) version are brought over automatically when opened inside Claude.
To edit the job or country data, change `ACTS` / `COUNTRIES` inside the `<script>`.
