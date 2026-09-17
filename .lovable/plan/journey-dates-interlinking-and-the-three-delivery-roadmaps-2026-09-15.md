# Journey dates, interlinking, and the three delivery roadmaps

This is a big set of changes, so it is split into four stages. Each stage is
finished and checkable before the next one starts.

## Stage 1 — Fixes to what already exists

**Journey start date drives everything**
- Changing "Journey start" on the overview recalculates every phase window and
  every step's expected date, straight away and for the whole funnel.
- Windows are counted in exact days from the start date: Onboarding day 0-14,
  Funnel build day 14-28, Pre-launch day 28-35, Launch day 35-42, Optimisation
  day 42-56, Scaling day 56-84. So a 20 September start puts Onboarding on
  20 Sep - 4 Oct, Funnel build 4 Oct - 18 Oct, and so on.
- The week labels and the countdown at the top read from the same calculation,
  so they can never disagree.

**Manually changing any date**
- On the Timeline tab every step gets an editable expected date and a
  "why it moved" note, team only. Changing one leaves the rest alone, so a
  single slipped step no longer needs a delay entry.
- A "Reset to the standard schedule" button puts the whole list back onto the
  dates calculated from the journey start.

**Strategy call date**
- No date is filled in automatically any more. William picks the date of the
  call himself.
- The strategy session counts as a call: it appears in Client & team calls
  automatically, numbered like the rest.

**Call log**
- When the call type is "Onboarding call with William", the extra detail boxes
  are hidden and the entry reads "For details, see the Strategy tab".

**Renewal and phase interlinking**
- Moving a client to another phase on the top banner immediately updates the
  renewal panel, the renewals page, the dashboard and the overview. One source
  of truth for phase, launched state and health.

**Launched or not launched**
- A clear launched / not launched control in the team banner, mirrored on the
  overview, the renewal panel and the renewals page.

**Social pages**
- The Content plan tab shows the same individual rows as Key links &
  documents (YouTube, Instagram, Facebook, LinkedIn, X, website). Typing in
  either place fills in the other. Both the team and the client can edit.

**Saving**
- Every link and note box saves on its own as soon as you finish typing, with
  a Save button beside it and a short "Saved" confirmation, everywhere in the
  portal.

**Sign-up answers**
- An X on any sign-up answer (Amalor, Commas, SpeakScript Scale) clears it so
  the client can answer again.

**Zoom**
- The zoom-out that breaks the board is removed. The board pans and scrolls
  and always fits the screen.

## Stage 2 — Notifications that reach the right person

- Anything actioned on the roadmap, any copy or video feedback, any submitted
  document or sign-up creates a notification aimed at the team member who owns
  the next move, and it lands on their dashboard.
- A per-person "For you" list on the dashboard, so nothing gets missed.

## Stage 3 — Three roadmaps: Done for you, Done with you, Done by you

Mixed clients take the highest tier: "Done for you / Done with you" gets the
Done for you roadmap.

**Done with you** — same as Done for you except:
- Onboarding gains "Copywriting call with Waleed" after the client information
  document, then "Copywriting assistance with Waleed" (VSL copy and ads copy,
  which the client may write first, with the same back and forth), then
  "Copywriting done by Drilon" (pre-call, cancellation, no-show and post-call
  no-close email sequences, thank you page video copy, 9 FAQ video copy).
- Funnel build: the Amalor onboarding call becomes optional and paid, with a
  link to their site and a note that they can onboard themselves as long as
  they watch the Amalor videos in the BGE course. Then Sign up to Commas, then
  a new step "Complete your funnel build inside your CRM (e.g. Amalor)" with
  the wording about templates and frameworks.
- Pre-launch: Ads account setup, Sales process setup, then "Confirm where you
  built your funnel" — Amalor or their own CRM. Amalor notifies Drilon and
  leads to the normal funnel review. Their own CRM asks the client for their
  funnel page links and gives Drilon one Loom video to submit at the top of a
  "Funnel review completed (separate CRM)" step.
- SpeakScript Scale wording rewritten as you dictated, with a link to the
  software, a Loom walkthrough link, and the "I have signed up / I am not
  using it" answer.
- Launch, Optimisation and Scaling unchanged.

**Done by you** — no roadmap at all. One panel: weekly group calls with the
times, the joining link and the host, plus access to the BGE course content and
key links.

**Settings** gains a Weekly group calls tab: day and time, joining link, host,
and a note for a specific week (for example "no call this week"), shown to
every client who has access.

## Stage 4 — The client's own portal navigation

Left-hand tabs for clients, opening on the dashboard every time they log in:
Dashboard, Task manager, Client roadmap, Weekly group calls, BGE course
content, Key links, Support & FAQs, and Settings at the bottom.

## Technical notes

- Phase windows move from fixed week constants to a day-offset schedule
  derived from `journey_start`, with one shared helper used by the roadmap,
  countdown, timeline and task seeding.
- Expected dates become editable per step (`expected_date` plus a note
  column), with a resync action that recomputes from the schedule.
- Client program tier resolves to `dfy` / `dwy` / `dby` and selects the step
  script; step keys stay stable so existing clients keep their submissions.
- Launched state and phase live on the client record only, so every panel
  reads the same value.
- New settings table for the weekly group calls.
- Link and note inputs move to a shared autosave field component.
