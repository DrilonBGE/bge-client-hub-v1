# Task deep-links, teammate task views, and the new onboarding pipeline

## Part 1 — Click a task and land on it

Right now the dashboard and to-do list only let you jump to a client's page; you then have to hunt for the task.

- Every task row (assigned tasks, standard phase tasks, "For you" items) gets a clear **Open task** action.
- Opening a task takes you to that client's page, opens the Details drawer on the right tab, jumps to the right phase, and highlights that exact task card so it is obvious.
- The notification bell items behave the same way when they refer to a task.
- Task links are proper web links, so you can middle-click to open a client's task in a new tab.

## Part 2 — Whose tasks am I looking at

- The to-do list keeps Mine / Teammate / Everyone, but gains a **team overview**: one row per team member (Drilon, William, Alfie, Victor, Waleed, Lisa) with how many tasks are open, how many are late, and their next deadline.
- Clicking a person shows just their list — assigned tasks and standard phase tasks together, sorted by deadline.
- The same person switch is added to the dashboard task widget so you can check Alfie or William without leaving the dashboard.
- "For you" on the dashboard becomes the notification bell only, as you asked, and the dashboard shows the task list in its place.

## Part 3 — The new onboarding pipeline

The onboarding documents describe: call with closer → paid → tagged in Amalor (DFY/DWY/DBY - Paid) → 3 emails (next steps, agreement, portal login) → onboarding continues in the portal. Emails and the signing form stay in Amalor/GHL. The portal handles everything after "paid".

### An onboarding board (new page)

A single board showing every person between "paid" and "on the roadmap", in stages:

```text
Paid  →  Agreement sent  →  Agreement signed  →  Portal invited  →  Portal active  →  On roadmap
```

Each card shows the name, program (DFY / DWY / DBY), who closed them, WhatsApp group created yes/no, and how long they have been sat at that stage. Anything stuck longer than a couple of days is flagged so nobody falls through.

### Two ways a person lands on the board

1. **Manual** — the closer or Alfie adds the client with name, email, program and value. Takes seconds.
2. **Automatic** — a private web address Amalor/GHL automation can call when the "Paid" tag or "agreement signed" event fires. It creates or advances the card by itself. You check with Amalor whether it can send this; the manual route works regardless.

### Custom agreements

The board records which agreement went out (template or a custom one Alfie edited) and when it was signed, with a note field for what was changed. Signing itself stays in Amalor.

### Portal invite

Once the agreement is signed, one button creates the client's profile and their portal invite, so the login link email in Amalor lands on a working account. Program choice decides which roadmap they get, as today.

### Active Client Sheet becomes the double-check

The sheet stops being the way clients get created and becomes verification instead:

- New client profiles are created here, at onboarding.
- The nightly and manual sheet sync still reads the sheet. A new sheet name that matches an onboarded client who has no sheet link yet is offered as **"Link to [name]"** — one click ties them together.
- The Active Client Sheet panel gains a **Signed clients not yet on the sheet** list, so you can see who is onboarded in the portal but still missing from the money sheet.
- Money and status fields (value, payment, renewal, leaving) keep flowing from the sheet as they do now.
- Sheet names matching nobody still appear as "New client" for approval, so nothing is lost.

## Technical notes

- New tables: `onboarding_cases` (client link, name, email, program, stage, closer, whatsapp flag, agreement kind/custom note, timestamps per stage) and an append-only `onboarding_events` log. Team-only RLS plus GRANTs.
- Webhook at `src/routes/api/public/onboarding-hook.ts`, guarded by a shared secret header; validates payload with Zod and matches on email, otherwise creates a new case.
- Task deep-links: search params `?tab=tasks&task=<id>` (and `phase=`) on `/clients/$clientId`, read by `ClientWorkspace`/`DetailsPanel` to preselect tab and scroll/highlight the task. Rows in `TaskBoard`, `StandardTaskBoard`, `AssignedTasks` and `ForYouPanel` become `<Link>`s.
- Team overview derives from existing `global_todos` and `client_tasks` queries; no new data needed.
- Sheet linking extends `sheet-sync.server.ts` matching to consider onboarded-but-unlinked clients, and `SheetInbox` gains the new list.
- Email copy from the uploaded document is stored as reference text in the portal (view/copy) since Amalor sends them.

## Not in this plan

- Sending emails from the portal, and Podia access automation.
- The simplified DBY roadmap you said you would design.
