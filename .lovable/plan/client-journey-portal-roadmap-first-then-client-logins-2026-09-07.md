# Client Journey Portal — roadmap first, then client logins

The board today is a good internal client list. The workbook asks for something bigger: one place where the team always knows where every client is, and where the client can log in and see the same journey from their side. This plan builds that in four stages, roadmap first.

Decisions taken: clients get their own login; the first release kills "we don't know where this client is"; no outgoing emails or AI drafting yet — everything happens inside the app; team is Drilon, William, Alfie, Victor, Waleed and Lisa.

## Stage 1 — Give every task a date, an owner and a status

Right now a task is just a tick. That can't show a timeline, so this is the foundation.

Each client gets their own copy of the six-phase journey, and every task on it carries:

- Status: To come (greyed out) / In progress / Waiting on client / Waiting on team / Done / Other with a note
- Owner (Drilon, William, Alfie, Victor, Waleed, Lisa or Client) — changeable at any time
- Expected date and actual completed date
- Priority: high / medium / low, with high set automatically as the date closes in and overridable by hand
- A days-remaining countdown, and an overdue count once the date passes
- A "client can see this" switch — on for journey tasks, off for internal notes

Existing tick data for all 42 clients is carried across, so nothing is lost. Extra one-off tasks can be added to any client's roadmap, internal or client-visible.

## Stage 2 — The roadmap (the main new screen)

A visual journey for each client, expected timeline against actual:

- Six phases left to right, with each task inside showing status, owner, date and countdown
- A delay marker: when a client is slow filming or approving, the team logs "+5 days" with a reason, and the roadmap shifts and shows the slip. Each delay is marked client-visible or internal-only
- Days saved or lost, split by "us" and "them"
- Click any point on the roadmap to see what happened there: the log of what was sent and when, on time or late, plus the documents and approvals attached to that point
- Milestone flags with their dates and a hover description
- Traffic light health (green / amber / red) set by hand by anyone on the team, plus the difficulty and "general feel" note — all internal
- A per-client Issues & Solutions area: log the problem, who fixed it, how

Alongside it, the team dashboard grows a "nothing gets forgotten" panel: my tasks, or toggle to anyone's tasks or everyone's, sorted by what's due next, with 3-day and 1-day warnings and an overdue list. Anyone can assign a task to anyone.

## Stage 3 — The client side

Clients get their own login and see only their own journey:

- Their roadmap: current stage, what's happening now, what's next, who owns it, expected date and days remaining
- Future phases visible but blurred and not clickable until they're reached
- Their own to-do list: blueprint document, information document, filming, approvals — each with what's needed and by when
- Documents: they paste Google Doc / Drive links (the format the team already prefers), and ticking a document off moves the roadmap on automatically
- Copy approval: once all copy is uploaded, the team presses "All of the copy is ready now" and the client reviews with two ticks — all good, or editing needed with a note
- Requests: the client can raise a request, suggest which team member it's for, write bullet points and paste a Loom link
- Their delivery log: what was sent, when, and whether it was on time
- Never shown: internal notes, health traffic light, delay blame, call count, the internal business overview

The team keeps full access to everything, no blurring.

## Stage 4 — Notification centre

An in-app bell for the team, no emails: new client added, document uploaded, copy awaiting approval, task 3 days out, task 1 day out, task overdue (escalating to William and Drilon), client request raised, health changed to amber or red. Clients get their own in-app list of what's new on their journey. Email sending stays switched off until you ask for it.

## Also folded in

- Team list corrected to Drilon (ops / funnel / AI copy), William (strategy, VSL & ads), Alfie (sales), Victor (ads), Waleed (copy), Lisa (Amalor build)
- Strategy section on each client with version history: the current strategy plus a button to create the next version, showing what changed and who changed it
- Call notes structured the way you asked: what was discussed, tasks for the team, tasks for the client, next steps, other notes — internal only
- Standard SLAs pre-loaded on the journey template: 7 days for VSL and ads copy, 3 days for the Amalor build, 2 days for an approval to sit unanswered
- Done-with-you clients: the VSL and ads step becomes "book a call with Waleed, then upload the final version" instead of "copy written for you"

## Not in this build

Automatic welcome emails and Podia access, AI-generated FAQ / thank-you / email-sequence drafts, the live ads performance tracker, and Google Drive folder creation. Each is a natural follow-on once the roadmap and the client side are proven — the ads tracker slots in as a tab on the client card when you have the sheet ready.

## Technical notes

- New tables: `client_tasks` (per-client task instances with status, owner, expected/actual dates, priority, visibility, sort order), `client_delays`, `strategy_versions`, `client_requests`, `notifications`, `client_issues`. `phase_tasks` stays as the template that seeds a new client.
- Migration backfills `client_tasks` from the existing `clients.tasks` JSONB for all 42 clients, keeping current ticks and phases.
- Access: `user_roles` gains a `client` role; `clients.portal_user_id` links a client login to its record. Team policies stay as they are; client policies scope every read and write to their own client row via a security-definer helper, and client-visible columns only.
- Routes: internal pages stay under `_authenticated`; the client side gets its own `_portal` layout so a client can never land on a team screen.
- Countdowns, priority escalation and health stay in-app; no scheduled jobs or outgoing mail in this build.
