# Submission notes

## What I built

I read the service first and added isolated unit tests plus HTTP tests using Supertest. The pagination off-by-one was the primary bug fix. I also added small regression fixes for status filtering, query parsing, completion state, protected task metadata and date validation; each is explained in [BUG_REPORT.md](BUG_REPORT.md). The requested `PATCH /tasks/:id/assign` is implemented and tested.

For assignment, I trim a non-empty string name; invalid or blank input returns 400 and an unknown task returns 404. Assigning someone else replaces the old assignee, while repeating the same name leaves the task unchanged. There is no user database here, so a name is a string, not a verified identity. Assignment is separate from the general update path so a caller cannot accidentally overwrite it via PUT.

Run from `task-api/`:

```bash
npm ci
npm test -- --runInBand
npm run coverage -- --runInBand
npm start
```

The tests reset the in-memory store before each case and fix the clock for overdue/completion checks. Final local run: 42 tests passing across 3 suites, 97.1% statements, 97.5% branches, 93.75% functions, 96.77% lines (`npm run coverage -- --runInBand`).

## Next and production questions

I would next run concurrent-request checks and add contract tests against agreed API docs, especially status names, exact ISO date policy, and what a "full update" should do. The surprising part was that seemingly small operations silently changed unrelated task fields: `complete` reset priority and `PUT` could replace IDs. Before production I would ask whether assignments should reference real user IDs, what persistence and access control are required, and whether reassignments should be audited. This demo stores tasks only in memory, so a restart or redeploy loses them. No extra UI or database was added because it would distract from tests and reasoning, which the take-home emphasizes.

For a reviewer opening the hosted URL, `/` now shows a concise API guide instead of a blank page. The demo deployment sets `SEED_DEMO=1` for three labelled sample tasks; tests/local runs remain empty by default. This display polish does not add persistence or change the API contract. The deployed demo is public and writable, so its sample data may change until the service restarts.
