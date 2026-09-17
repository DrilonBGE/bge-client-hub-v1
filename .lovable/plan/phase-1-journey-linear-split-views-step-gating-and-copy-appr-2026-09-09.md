# Phase 1 journey: linear/split views, step gating and copy approvals

## What you'll get

**A view toggle on every phase card.** Top right of the opened phase card: **Linear** or **Split**.
- Split — exactly what's there today: client work on the left, BGE team on the right.
- Linear — every step in order, one under the other, Step 1 → Step 6, no lanes.
The choice is remembered per person, so it stays as you left it.

**Opening a phase fills the screen.** Clicking a phase on the roadmap expands it into a full card, the board eases back so the whole card fits, and you can still zoom and drag from there. Escape or a close button returns to the roadmap.

**Step gating.**
- For the client: the step they're on has full colour. Every step after it is greyed. They can still click a greyed step and read what's coming, but the buttons, upload boxes and attachments are locked and the panel says "Not required yet".
- For the team: nothing is greyed, everything opens and is editable.
- A step unlocks once every step before it is ticked complete.

**Three status buttons per step**, replacing the single cycling dot: tick (complete), progress circle (in progress, the default) and a greyed right arrow (not required yet). Who may press them is set per step — client-controlled, team-controlled, or either.

**Phase 1 rebuilt as the six steps you wrote**, in order:
1. Onboarding files and documents — client — "confirmation you have officially onboarded and understood all files".
2. Client Blueprint Document — client — instructions, the attached BGE Blueprint template to download, and a box to insert the completed version (link or file).
3. Podia Video Course — client — watch the first 10 videos.
4. Onboarding call with William — client/William — request it in the WhatsApp group.
5. Client Information document — client — instructions, attached BGE Information template, box for the completed version.
6. Copywriting — William or Waleed (whoever the overview says writes copy) plus Drilon — expected timeline 7 days, with eight named draft slots: VSL, Ads, TY page video, 9 FAQ videos, pre-call emails, cancellation emails, no-show emails, post-call no-close emails.

**Step 5 fires internal notifications.** The moment the client ticks the Information document complete, three in-app notifications appear:
- to William or Waleed (whichever the overview names): "Copy for VSL / Ads — {client}", linking to their profile page.
- to Drilon: "Copy for TY Page Videos & Email Sequences — {client}", linking to their profile page.

**Step 6 copywriting approval loop.** Our team fills the eight draft slots. The client then either:
- **Approve** — their feedback boxes grey out and become read-only, or
- **Edit final version** — a matching set of eight boxes opens for a link, file or typed text they send back.
Once final approval is ticked by either side, Phase 1 shows as complete and the client moves into Phase 2.

**Phase 1 attachments.** The Blueprint and Information document templates need real files from you — until you send them, those buttons show "Template coming soon" rather than a broken download. Everything else works now.

## Technical notes

- Extend `client_tasks` with `step_key`, `step_kind` (`client` | `team` | `either`), `instructions`, `template_url`, `submission_url`, `submission_note`, `gate_order`, plus a `client_step_payload` jsonb for the eight copy slots and the client's response set with an `approval` mode (`approved` | `edited`). Migration adds columns with defaults + GRANTs unchanged on the existing table.
- Rewrite `src/lib/task-templates.ts` Phase 1 to the six-step spec, keyed by `step_key` with owner resolved from `client.vsl_writer`; keep phases 2–6 as they are for now. Seeding backfills existing clients on next open without duplicating (match on `step_key`).
- New `src/components/bge/StepCard.tsx` handles the three-state control, instructions, template link, submission box and the copy-slot grid; `JourneyTimeline.tsx` gains `view: "linear" | "split"` state (persisted in localStorage) and a full-screen expanded phase layer with the existing zoom/pan retained.
- Gating helper in `src/lib/journey.ts`: `stepLocked(task, tasks, readOnly)` — true only when `readOnly` and an earlier `gate_order` step is unticked. Locked steps render read-only, never hidden.
- Notifications inserted into `notifications` on the Step 5 status mutation, audience `team`, with the client link in the body; no emails, in-app only.
