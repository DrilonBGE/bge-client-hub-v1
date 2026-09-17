# Dashboard clean-up, client types and standard tasks

Three changes from your walkthrough, starting at the dashboard.

## 1. Show 3, then "Show more" — everywhere

Long lists are cut to the first 3 rows with a "Show 12 more" button that expands
in place and collapses again. Applied as a shared pattern so every list follows it:

- Dashboard: the "Where everyone is right now" phase columns and the sheet approvals inbox
- To-do list groups
- Client workspace panels (documents, calls, issues, requests, approvals, ads, drafts)
- Renewals, upsells, ex-clients, important links

Counts stay visible on the collapsed header, so nothing feels hidden.

## 2. Clients who left the sheet

Any client whose name is no longer on the active client sheet is moved to the
ex-clients archive instead of sitting on the current board. They stay
restorable there, and manually added clients are never touched.

Right now the nightly sync only flags them; this makes the move happen once you
confirm, with a one-click "Archive all missing" in the sheet inbox and an
automatic archive for names that have been missing for more than one sync.

I'll also check the current board against the sheet and archive the leftovers
from the old HTML file (Brigitte and anyone else in the same position).

## 3. Client types — exactly five

The only options become:

- Done for you (DFY)
- Done with you (DWY)
- Done for you / Done with you (DFY/DWY)
- Done by you (DBY)
- Done with you / Done by you (DWY/DBY)

The old "DFY/DWY/DBY" and "DWY/DFY" values are removed and existing clients are
mapped onto the five above. Board filters stay All / DFY / DWY / DBY, and a
combination client shows under each of its tiers.

## 4. To-do list: standard tasks alongside assigned tasks

The to-do page gets two tabs:

- **Assigned tasks** — what it does today: custom tasks people set for each other
- **Standard tasks** — the phase work that comes from where each client sits

Standard tasks are pulled live from every active client's current phase, so if
Aaron Norris is in Phase 1 and a Phase 1 job belongs to you, it appears here
with the client name, phase, priority and the expected date. Same
Mine / Teammate / Everyone switch as the assigned list, and overdue items show
in red at the top.

## Technical notes

- New shared `Collapsible list` helper (show 3, expand/collapse, remaining count) used by list surfaces.
- `PROGRAMS` in `src/lib/bge.ts` reduced to the five values; `programKind` keeps
  defaulting a combination to its first tier; a data update rewrites existing
  program values.
- Board filter matching switches to tier containment so `DFY/DWY` matches both filters.
- Archiving missing clients: reuse `useResolveMissingClient` ("move to ex-clients")
  and add a bulk action; sheet-origin only, `origin = 'manual'` excluded.
- Standard tasks tab reads `client_tasks` joined to each client's current phase via
  the existing `useTasks`/journey queries, filtered by owner, with no new tables.
