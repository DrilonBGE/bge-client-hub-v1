# Active Client Sheet check moves into Onboarding

The sheet becomes the double-check that lives beside onboarding, with a clear decision on every row rather than a plain approve/dismiss.

## Where it lives

The Active Client Sheet panel moves out of the dashboard and onto the Onboarding page, under the onboarding stages, as one "Active Client Sheet check" section with the Sync sheet button. The dashboard keeps a small one-line summary ("4 sheet items waiting — open Onboarding") so nothing gets lost.

## Someone looks like they have left

A name that was on the sheet and is now gone shows up here with three choices:

- **Fix the Active Client Sheet** — we believe they are still a client and the sheet is wrong. Clears the flag, keeps them active, and leaves a note so the same row does not nag again next sync.
- **Remove client (send to ex-clients)** — moves them to the ex-client archive with today's date, as today.
- **Unclear right now** — parks the row. It stays visible in a "Waiting on an answer" group with how long it has been sitting, and it reappears at the top after a few days instead of disappearing.

## A new name appears on the sheet

Two paths, decided by whether we already know the person:

- **Link to a profile we already have** — when the sheet name matches a client or an onboarding case, the row shows "Looks like [name] — link them" as the first, suggested action. One click ties the sheet row to that profile, merges the money and status fields in, and keeps all their history.
- **On the sheet but not onboarded yet** — for a name with no profile, the row offers "Chase their onboarding". That creates an onboarding case at the Paid stage (name plus anything the sheet gives us), so they appear in the stage board with a "waiting on onboarding documents" note and a WhatsApp/email reminder task for whoever closed them.
- **Add straight to the board** — still available for a name that genuinely is a fresh client with no onboarding to chase.
- **Not a client** — dismiss, as today.

Changed values on an existing client (value, payment, renewal, leaving, notes) keep the current behaviour: shown old → new, applied on Apply.

## What the panel shows

Grouped so the eye goes to the decisions: **Left the sheet** → **New on the sheet** → **Changed on the sheet** → **Waiting on an answer** → **Signed here, not on the sheet yet**. Each row shows the sheet row number and how long it has been waiting; three days without a decision flags it.

## Technical notes

- `sheet_pending` gains `status` value `parked` plus `parked_until` (date) for "Unclear right now"; the sync skips re-filing a parked row until that date passes.
- Clients gain `sheet_ok_override` (boolean) plus `sheet_override_note`, set by "Fix the Active Client Sheet", so `runSheetSync` stops re-flagging `missing_from_sheet` for them until they appear again.
- Missing-client handling moves from the current inline buttons into the same pending-row model so all three choices are recorded in `audit_log` and `onboarding_events` where a case exists.
- New-name matching in `sheet-sync.server.ts` also checks `onboarding_cases` by name/email so the suggested link can point at an onboarding case, not just a client.
- "Chase their onboarding" inserts an `onboarding_cases` row (`stage: paid`, `source: sheet`) plus a `global_todos` reminder for the closer, and a team notification.
- `SheetInbox` is refactored into grouped sections and rendered from `_authenticated.onboarding.tsx`; the dashboard `sheet_inbox` widget becomes the summary line linking to Onboarding.
- One migration for the two new columns and the parked status; grants and team-only policies follow the existing pattern.
