# BGE CLIENT PORTAL
# BUILD VERIFICATION CHECKLIST

**Source:** Client Flow Diagnostic Workbook (435 completed questions, 30 sections)
**Purpose:** Sequential build and verification protocol
**Format:** Work through every item in order. One at a time.

---

# HOW TO USE THIS DOCUMENT

## Read this section before doing anything else.

This document contains **187 discrete build items**, each derived from a specific answer in a completed operations workbook. Every item has a requirement, a source reference, and an acceptance test.

### Your operating protocol

For each item, in strict numerical order:

1. **Check the current build.** Does this requirement already exist and work?
2. **Report status** using exactly one of these three words:
   - `COMPLETE`: built, working, passes the acceptance test
   - `PARTIAL`: some of it exists but it fails the acceptance test
   - `MISSING`: does not exist
3. **If PARTIAL or MISSING, build it now.** Do not defer. Do not batch. Do not say "I will do this later."
4. **Re-run the acceptance test** and confirm it now passes.
5. **Move to the next item.**

### Rules

- **Do not skip items.** If an item depends on something not yet built, build the dependency first and say so.
- **Do not summarise a whole module and claim it is done.** Every item gets its own status line.
- **Do not ask which items to prioritise.** The order in this document is the priority order.
- **Do not stop after the foundation modules.** Continue until Module 18.
- **If an item is genuinely ambiguous, build the most defensible interpretation and flag it** in a note at the end of that module. Do not halt and wait.
- **Work in batches of one module at a time.** Complete every item in a module, then report the module summary, then continue to the next module without being asked.

### Status report format

After each module, output exactly this:

```
MODULE [n] COMPLETE
Items: [x] complete, [y] built this session, [z] flagged
Flagged items: [list IDs and one-line reason]
Proceeding to Module [n+1].
```

---

# CONTEXT: WHAT THIS PRODUCT IS

Build, Grow & Exit (BGE) is a marketing agency serving online education businesses. It sells three service tiers:

- **DFY** (Done For You)
- **DWY** (Done With You)
- **DIY** (Do It Yourself)

BGE serves **40 to 50 active clients at a time**. Average relationship length is **3 months**. Engagements are monthly payment based, ranging from one month to over a year.

The core problem this portal solves, stated directly by the head of operations:

> "The biggest operational frustration in serving clients today is just knowing where they're at right now in terms of the timeline, what needs to be done, and what's already been submitted by the client."

And:

> "With every single client we don't know how that call has gone."

And:

> "Right now whenever there's a new client, I have to manually add that client in, which is a big issue so we want to avoid that."

### The standard the product is measured against

> A client should always know where they are, what is happening, what happens next, who owns it, and whether things are on track.

### The team

| Person | Role | Owns |
|---|---|---|
| **William** | Head of company | Onboarding calls, strategy, oversight, VSL and ads copy, approves refunds and timeline extensions, sets renewal pricing |
| **Drilon** | Head of operations | Funnel build, project management, email sequences, FAQ scripts, thank you video script, funnel optimisation, content strategy |
| **Waleed** | Copywriter | VSL and ads copy alongside William, DWY live copy calls |
| **Victor** | Media buyer | Meta ads account setup, ads review |
| **Alfie** | Head of sales | Sales script, pitch deck, sales call reviews, renewals |
| **Lisa** | Amalor support | GoHighLevel / Amalor onboarding and support |

**Amalor** is BGE's white-labelled GoHighLevel instance. Clients purchase it and it hosts their funnel.
**Podia** is the course platform. Clients must watch the first 10 videos before their onboarding call.
**Fathom** records one to one calls.
**WhatsApp** is the client communication channel and stays that way. The portal is the central base for work, not chat.

---

# MODULE 0: FOUNDATION

## ITEM 0.1: Supabase project connected
**Requirement:** The app is wired to a Supabase project with a live connection.
**Acceptance test:** A query from the client returns data without error.
**Status:** ___

## ITEM 0.2: Two distinct user types exist
**Requirement:** The system distinguishes **internal team users** from **client users**. These are not the same account type and do not see the same interface.
**Source:** Q120, Q397, Q398
**Acceptance test:** Logging in as a client lands on a different interface to logging in as a team member.
**Status:** ___

## ITEM 0.3: Team members have full access to everything
**Requirement:** All internal team members see the same data and can edit the same things. There is no manager-only tier.
**Source:** Q399: "Everything that all task members can see. If every task member can see the same thing and they can edit the same thing because we've got trust within the company."
**Acceptance test:** Two different team accounts see identical data on the same client.
**Status:** ___

## ITEM 0.4: Client users only see their own record
**Requirement:** A client user can only access their own client record. No client can see any other client's data.
**Acceptance test:** Row Level Security prevents a client user from querying another client's row. Attempt it and confirm it fails.
**Status:** ___

## ITEM 0.5: Team accounts seeded
**Requirement:** Accounts exist for William, Drilon, Waleed, Victor, Alfie, Lisa.
**Acceptance test:** All six can log in and appear in owner assignment dropdowns.
**Status:** ___

## ITEM 0.6: Session persistence
**Requirement:** Login survives a browser refresh.
**Acceptance test:** Log in, refresh, still logged in.
**Status:** ___

## ITEM 0.7: Sign out
**Requirement:** Sign out clears the session and returns to login.
**Acceptance test:** Sign out, refresh, still logged out.
**Status:** ___

---

# MODULE 1: THE CLIENT RECORD

## ITEM 1.1: Core client fields exist
**Requirement:** Every client record holds: name, phone number, email, date joined, contract value, renewal date, leaving date, program type (DFY / DWY / DIY), payment method.
**Source:** Q102: "Name, Number, Email, Date that they joined, How much they joined for, When their renewal is coming up"
**Acceptance test:** Open a client record. All nine fields are present and editable.
**Status:** ___

## ITEM 1.2: Phase status field
**Requirement:** Each client has a current phase field. This is the primary status field.
**Source:** Q379: "Basically what phase they're in right now is going to be the key thing."
**Acceptance test:** Changing a client's phase updates their position on the board and their roadmap.
**Status:** ___

## ITEM 1.3: Business context section (internal only)
**Requirement:** A team-facing section on each client record capturing: niche, offer, price point, deliverables, where the client is right now, what they have been doing. This is written by William during or after the onboarding call.
**Source:** Q128: "on the call with William, inside the client portal, I want him to be able to write up an entire section that can be viewed by the internal team"
**Acceptance test:** The section exists, is editable by team, and is invisible to the client user.
**Status:** ___

## ITEM 1.4: Social media handles field
**Requirement:** Fields for the client's social media handles.
**Source:** Q387, Q107
**Acceptance test:** Handles can be stored and are visible on the client record.
**Status:** ___

## ITEM 1.5: Funnel website link field
**Requirement:** A field for the client's live funnel URL, so nobody has to log into Amalor and navigate subaccounts to find it.
**Source:** Q24: "It would be easiest if I can just have their domain and the links available. I could literally just click on their funnel page"
**Acceptance test:** The funnel URL is stored and opens in one click from the client record.
**Status:** ___

## ITEM 1.6: Amalor subscription status
**Requirement:** A field tracking whether the client has purchased Amalor.
**Source:** Q279: "at some point they have to sign up for our CRM, Amalo"
**Acceptance test:** Status is set per client and surfaces in the upsell view.
**Status:** ___

## ITEM 1.7: Timeline extension field
**Requirement:** A field recording any free extension granted (for example "2 week extension granted, approved by William, 14 May"). This is internal only.
**Source:** Q348: "sometimes he gives extensions on everything but that update needs to be put into the active client sheet"
**Acceptance test:** Extension is recorded, visible to team, invisible to client, and adjusts the expected timeline.
**Status:** ___

## ITEM 1.8: Autosave on all fields
**Requirement:** Every editable field saves on change. There is no save button for individual fields.
**Acceptance test:** Edit a field, navigate away, return. The change persisted.
**Status:** ___

---

# MODULE 2: GOOGLE SHEETS SYNC AND APPROVAL INBOX

This module solves the single most explicitly stated pain point in the workbook.

## ITEM 2.1: Active Client Sheet connection
**Requirement:** The portal connects to BGE's Active Client Google Sheet and reads it. The sheet is private and must stay private.
**Source:** Q376, Q377: "The ultimate source of truth has to be the Google Drive, the folder for each client, and then also the active client sheet."
**Acceptance test:** The portal reads rows from the sheet without the sheet being made public.
**Implementation note:** Use a Google service account with a Supabase Edge Function holding the credentials server side. Do not put the key in client-side code.
**Status:** ___

## ITEM 2.2: Pending Approvals inbox exists
**Requirement:** A dedicated view listing new rows detected in the sheet that do not yet exist as clients in the portal.
**Source:** Q23: "I want to be able to approve that manually. It gets added in there whenever a new client is added"
**Acceptance test:** Add a test row to the sheet. It appears in Pending Approvals within the sync window.
**Status:** ___

## ITEM 2.3: Approve creates the client profile
**Requirement:** Clicking Approve on a pending row creates a full client profile with all mapped fields populated, sets them to Phase 1, and seeds their phase task checklist.
**Source:** Q394, Q395
**Acceptance test:** Approve a pending row. A complete client record exists with tasks pre-loaded.
**Status:** ___

## ITEM 2.4: Dismiss removes from inbox
**Requirement:** Dismiss removes the row from Pending Approvals without creating a client, and does not resurface it on the next sync.
**Acceptance test:** Dismiss a row. It does not reappear.
**Status:** ___

## ITEM 2.5: Removal detection
**Requirement:** When a client that exists in the portal disappears from the Active Client Sheet, the system detects the mismatch and flags it.
**Source:** Q377: "it identifies that mismatch: 'Oh look, they're in the client portal but they're not on the active client sheet.'"
**Acceptance test:** Remove a test client from the sheet. A flag appears on their profile after sync.
**Status:** ___

## ITEM 2.6: Removal prompt on the profile
**Requirement:** The flag presents a direct question on the client profile: **"This client is no longer on the Active Client Sheet. Keep as active client, or move to ex-client?"** with two buttons.
**Source:** Q377: "there's something next to their profile which asks: 'Are they still an active client or do you want to take them into an ex-client?'"
**Acceptance test:** The prompt appears with both options and both work.
**Status:** ___

## ITEM 2.7: Field update detection
**Requirement:** When an existing client's data changes in the sheet, the change appears in Pending Approvals as an update to review, not an automatic overwrite.
**Source:** Q23: "If there's any sort of update I want to see that as an input in there and I want to be able to approve that manually."
**Acceptance test:** Change a value in the sheet for an existing client. A pending update appears showing old value and new value.
**Status:** ___

## ITEM 2.8: Sync status indicator
**Requirement:** A visible indicator showing last sync time and connection health.
**Acceptance test:** Indicator shows a timestamp and updates after a sync.
**Status:** ___

## ITEM 2.9: Ad Performance Sheet connection
**Requirement:** A second Google Sheets connection for the client ad performance tracker, per client.
**Source:** Q393: "the ad performance tracker, which is going to be on Google Sheet"
**Acceptance test:** A client record can hold an ad tracker sheet reference.
**Status:** ___

---

# MODULE 3: PHASES AND THE VISUAL ROADMAP

## ITEM 3.1: Six phases defined
**Requirement:** The programme has six sequential phases.

| # | Phase | Timing |
|---|---|---|
| 1 | Onboarding | Week 1 to 2 |
| 2 | Funnel Build | Week 2 to 4 |
| 3 | Pre-Launch | Week 4 to 5 |
| 4 | Launch | Week 5 to 6 |
| 5 | Optimisation | Week 6 to 8 |
| 6 | Scaling | Week 8 onward |

**Source:** Q55, Q56
**Flag:** The workbook describes five delivery phases (Onboarding, Funnel Build, Pre-Launch, Launch, Optimisation). The sixth, Scaling, comes from the existing internal board. Build all six and confirm.
**Acceptance test:** All six phases render in order.
**Status:** ___

## ITEM 3.2: Phases are strictly sequential
**Requirement:** A client cannot be in two phases. Phases advance in order.
**Source:** Q56: "Phases are definitely sequential"
**Acceptance test:** Setting a phase clears the previous active phase.
**Status:** ___

## ITEM 3.3: Tasks within a phase run in parallel
**Requirement:** Multiple tasks inside one phase can be in progress simultaneously with different owners.
**Source:** Q57: "the tasks inside them do run in parallel. For example when William and Waleed are writing up the ad copy and the VSL copy, Drilon is going to be writing up the email sequences"
**Acceptance test:** Two tasks in the same phase can both show as in progress with different owners.
**Status:** ___

## ITEM 3.4: Visual roadmap component exists
**Requirement:** A visual roadmap showing the full six-phase journey, the client's current position, and what is coming.
**Source:** Q118, Q137, Q212, Q276
**Acceptance test:** The roadmap renders and correctly highlights the current phase.
**Status:** ___

## ITEM 3.5: Future phases are visible but locked for clients
**Requirement:** In the client view, future phases are visible but greyed out, blurred, and not clickable.
**Source:** Q119: "They can see what's coming up in phases two, three, four, etc. but that's going to be blurred out so they actually can't click on it."
**Source:** Q397: "in the earlier phases they can see what's coming up in the next phases but they can't yet actually be involved in it. It's all greyed out for them."
**Acceptance test:** Log in as a client in Phase 1. Phases 2 to 6 are visibly present, greyed, and unclickable.
**Status:** ___

## ITEM 3.6: Team sees all phases unlocked
**Requirement:** Internal team users see every phase fully, with no greying or locking.
**Source:** Q120: "The internal team can see everything inside the checklist"
**Acceptance test:** Log in as team. All six phases are fully accessible.
**Status:** ___

## ITEM 3.7: Milestone hover detail
**Requirement:** Hovering a milestone on the roadmap reveals what that milestone is about.
**Source:** Q268: "there should be a flag or something where they hover over it and it shows what that milestone is about"
**Acceptance test:** Hover a roadmap milestone. A tooltip explains it.
**Status:** ___

## ITEM 3.8: Phase entry generates the right notifications
**Requirement:** When a client enters a phase, the team member who owns work in that phase is notified in-app.
**Source:** Q389: "if somebody now is ready, the funnel is ready and everything, and they've moved on into the pre-launch stage, obviously Victor knows that he's going to be getting on a call with them. That will be coming up on the client portal for him as a notification."
**Acceptance test:** Move a client to Pre-Launch. Victor gets an in-app notification.
**Status:** ___

---

# MODULE 4: THE DUAL TIMELINE

This is a distinctive requirement stated clearly and repeatedly. Do not simplify it into a single progress bar.

## ITEM 4.1: Expected timeline exists
**Requirement:** Each phase and each major task has an expected duration and therefore an expected completion date.
**Source:** Q293
**Acceptance test:** Each phase shows an expected date.
**Status:** ___

## ITEM 4.2: Actual timeline exists alongside expected
**Requirement:** A second timeline runs beneath the expected timeline showing what actually happened.
**Source:** Q293: "We can actually show them the expected timeline and the actual timeline, which is below that as well. I want two timelines to be involved."
**Acceptance test:** Both timelines render, visually distinct, aligned to the same phases.
**Status:** ___

## ITEM 4.3: Days saved by the team are shown
**Requirement:** When the team completes work faster than expected, the roadmap shows the time saved.
**Source:** Q293: "if we get things done even quicker, I also want it to be shown like we've saved them time"
**Acceptance test:** Complete a task early. The roadmap displays days saved.
**Status:** ___

## ITEM 4.4: Client-caused delay adds visible days
**Requirement:** When a client causes a delay, the roadmap shows a positive day count against that segment, for example "+5 days".
**Source:** Q199: "Let's say they delayed the process by 5 days. It needs to show +5 days on the visual roadmap to explain that they delayed the entire process."
**Acceptance test:** Record a 5 day client delay. The roadmap shows +5 days.
**Status:** ___

## ITEM 4.5: Delay attribution is separated
**Requirement:** The system distinguishes team-caused delay from client-caused delay.
**Source:** Q294
**Acceptance test:** A delay record has an attribution field with at least "team" and "client" options.
**Status:** ___

## ITEM 4.6: Client-caused delay detail is internal only
**Requirement:** The detailed documentation of a client-caused delay is visible to team only. The client sees the timeline impact but not the internal commentary.
**Source:** Q294: "this one is going to be for the internal team so we can see, but the client can't see. That is for our notice just so in the future they don't come back to us with problems."
**Acceptance test:** Log in as client. Delay commentary is not visible. Timeline shift is visible.
**Status:** ___

## ITEM 4.7: Manual time extension control
**Requirement:** A team member can add extra time to any stage, which updates the roadmap and triggers a client notification.
**Source:** Q265: "We should be able, at every stage, to add on, let's say, an extra however much time. In the visual roadmap it actually adds on some time"
**Acceptance test:** Add 3 days to a stage. The roadmap updates and a notification fires.
**Status:** ___

---

# MODULE 5: TASK SYSTEM

## ITEM 5.1: Phase tasks are pre-loaded per phase
**Requirement:** Every client automatically receives the standard task checklist for each phase.

**Phase 1: Onboarding**
| Task | Owner |
|---|---|
| Complete Blueprint document | Client |
| Watch first 10 Podia course videos and upload screenshot | Client |
| Confirm joined WhatsApp group | Client |
| Onboarding call with William | William |
| Complete Information document | Client |
| Write VSL copy | William / Waleed |
| Write ads copy (5 to 10 ads with hooks and bodies) | William / Waleed |
| Write email sequences | Drilon |
| Write 9 FAQ video scripts | Drilon |
| Write thank you and next steps video script | Drilon |

**Phase 2: Funnel Build**
| Task | Owner |
|---|---|
| Purchase Amalor | Client |
| Amalor onboarding call | Lisa |
| Record VSL, ads, thank you video, 9 FAQ videos | Client |
| Edit and upload recordings | Client |
| Implement assets into funnel | Drilon |
| Optimise and check funnel | Drilon |

**Phase 3: Pre-Launch**
| Task | Owner |
|---|---|
| Live call to set up Meta Ads account | Victor |
| Build sales process, script and pitch deck | Alfie |
| Content strategy | Drilon |

**Phase 4: Launch**
| Task | Owner |
|---|---|
| Launch ads and content | Client |
| Sales calls begin populating calendar | Client |

**Phase 5: Optimisation**
| Task | Owner |
|---|---|
| Review sales calls | Alfie |
| Review ads | Victor |
| Funnel changes and optimisations | Drilon |
| Copywriting support if needed | William / Waleed |

**Phase 6: Scaling**
| Task | Owner |
|---|---|
| Scaling | Client |

**Source:** Q55, Q181, Q187, Q201, Q351
**Acceptance test:** Create a new client. All tasks above exist against the correct phases with correct owners.
**Status:** ___

## ITEM 5.2: Six status labels exist
**Requirement:** Tasks use exactly these statuses:

| Status | Meaning | Visual |
|---|---|---|
| **Yet to come** | Not started, not yet reachable | Greyed out completely |
| **In progress** | Being worked on now | Active colour |
| **Needs approval from client** | Waiting on client sign-off | Amber, client-actionable |
| **Needs approval from team** | Waiting on internal sign-off | Amber, team-actionable |
| **Done** | Complete | Green |
| **Other** | Exception state | Neutral, with a required note underneath |

**Source:** Q256, Q257
**Acceptance test:** All six statuses are selectable and render distinctly. Selecting "Other" requires a note.
**Status:** ___

## ITEM 5.3: Every task has an owner
**Requirement:** Each task carries a named owner, changeable at any time.
**Source:** Q217: "We know exactly what team member is assigned to something and by the way that can change so you can manually change that to another member if needed."
**Acceptance test:** Reassign a task owner. It saves and displays.
**Status:** ___

## ITEM 5.4: Countdown per task
**Requirement:** Each task shows how many days remain until its deadline.
**Source:** Q207: "with every single task there should be a countdown of how many days are left until this task can be completed"
**Acceptance test:** A task with a deadline displays a live day countdown.
**Status:** ___

## ITEM 5.5: Priority levels
**Requirement:** Tasks carry high, medium or low priority.
**Source:** Q208
**Acceptance test:** Priority is settable and displayed.
**Status:** ___

## ITEM 5.6: Priority auto-escalates near deadline
**Requirement:** Priority rises automatically as the deadline approaches, and can be manually overridden.
**Source:** Q208: "The closer it gets to time, it can become high priority but then we can also override it."
**Acceptance test:** A task nearing deadline escalates. A manual override sticks.
**Status:** ___

## ITEM 5.7: Custom tasks
**Requirement:** Team members can create custom tasks on a client profile or in the task manager, and assign them to themselves or anyone else.
**Source:** Q427: "we can create custom tasks and then assign them to a certain custom or whatever. We can do that inside their client profile or we can do it just in the task manager."
**Acceptance test:** Create a custom task from both locations. Assign to another user. It appears in their list.
**Status:** ___

## ITEM 5.8: Custom tasks have a client visibility toggle
**Requirement:** When creating a custom task or note, the creator chooses whether the client can see it.
**Source:** Q207: "We can also edit whether we want the client to see that note or whether we just want to keep it internal."
**Source:** Q266: "we also need to be able to have the option: should we let the client know or should it just be internal in the team?"
**Acceptance test:** Create an internal task. Log in as client. It is not visible.
**Status:** ___

## ITEM 5.9: Custom tasks can join the timeline
**Requirement:** A custom task can be given a deadline and appear on the visual roadmap.
**Source:** Q207: "if there are any custom notes or custom tasks that we add on, we can add that into the timeline"
**Acceptance test:** Add a dated custom task. It appears on the roadmap.
**Status:** ___

## ITEM 5.10: Closed tasks go to a 30-day archive
**Requirement:** Completed tasks move to a Closed section, remain restorable for 30 days, then delete automatically.
**Source:** Q427: "once it's closed it's not put into a bin and just completely removed. It's going to be put in a 30-day closed task section where it can be brought back if needed but afterwards it's just deleted."
**Acceptance test:** Complete a task. It appears in Closed with a restore option and a countdown to deletion.
**Status:** ___

## ITEM 5.11: Task dashboard with member toggle
**Requirement:** A task dashboard where a user can toggle between their own tasks, any single other team member's tasks, and all team members combined.
**Source:** Q210: "we can have a toggle feature which shows where the person or the team member has their specific task and then also you can toggle anyone else's task. I can see what our leads are working on, I can see what William's working on, and I can see the entire thing together."
**Acceptance test:** Toggle through: my tasks, William's tasks, all tasks. Each filters correctly.
**Status:** ___

## ITEM 5.12: Assign tasks to others from the dashboard
**Requirement:** From the task dashboard, a team member can issue a task to another team member with priority and deadline.
**Source:** Q210: "Drilon can issue Victor a task of checking in on ads. I can see how high the priority is, when the deadline is"
**Acceptance test:** Assign a task to another user from the dashboard. It appears on their view and on the client card.
**Status:** ___

## ITEM 5.13: Assigned tasks appear on the internal client card
**Requirement:** Tasks assigned to team members show in the internal team view of the relevant client card.
**Source:** Q210
**Acceptance test:** An assigned task appears on the client's internal card.
**Status:** ___

## ITEM 5.14: Personal to-do on login
**Requirement:** When a team member logs in, the main dashboard immediately shows their personal to-do list.
**Source:** Q206: "When I personally get into the app, for example, I want to see exactly what's on my to-do list."
**Acceptance test:** Log in. Own outstanding tasks are visible without navigation.
**Status:** ___

## ITEM 5.15: At-risk deadlines are visible instantly
**Requirement:** Deadline risk surfaces immediately, not at the point of breach.
**Source:** Q211: "Instantly, it doesn't have to be a thing at the end. We want you to instantly see that."
**Acceptance test:** A task approaching its deadline is visually flagged before breaching.
**Status:** ___

---

# MODULE 6: SLAs, ALERTS AND ESCALATION

## ITEM 6.1: Copy SLA is 7 days
**Requirement:** VSL, ads, email sequences, thank you page, next steps and FAQ copy carry a 7 day turnaround.
**Source:** Q187, Q289
**Acceptance test:** These tasks default to a 7 day deadline.
**Status:** ___

## ITEM 6.2: Amalor build SLA is 3 days
**Requirement:** After the client submits their recorded videos, the Amalor funnel build by Drilon carries a 3 day SLA.
**Source:** Q289: "once the videos are done and they're set up on Amalor, it's going to be 3 days for the Amalor build by Drilon into the CRM"
**Acceptance test:** This task defaults to 3 days from video submission.
**Status:** ___

## ITEM 6.3: Approval request SLA is 2 days
**Requirement:** An outstanding approval request has a maximum acceptable age of 2 days.
**Source:** Q291
**Acceptance test:** An approval pending beyond 2 days is flagged.
**Status:** ___

## ITEM 6.4: Internal alerts at 3 days and 1 day
**Requirement:** For a client task, the internal team receives an alert at 3 days remaining and again at 1 day remaining.
**Source:** Q286: "we should have an internal alert if, for example, we're getting close to uploading a document. Let's do a 3-day deadline and then a 1-day deadline for our task for the client."
**Acceptance test:** Both alerts fire at the correct thresholds.
**Status:** ___

## ITEM 6.5: Overdue client input alert
**Requirement:** When a client document is overdue, the team sees a notification stating how many days overdue it is.
**Source:** Q113: "if the information document is overdue by 3 days, then we get a notification inside: 'This client has not sent in this yet.'"
**Acceptance test:** An overdue document produces an in-app team notification with day count.
**Status:** ___

## ITEM 6.6: Escalation to William and Drilon
**Requirement:** A waiting state that passes its deadline escalates specifically to William and Drilon as heads of client management.
**Source:** Q288: "It will be sent specifically to William and to Drilon, who are going to be the head of client management."
**Acceptance test:** A breached deadline notifies both.
**Status:** ___

## ITEM 6.7: Team alerts are in-app only, never email
**Requirement:** Team members receive in-app and website notifications. They do **not** receive email notifications.
**Source:** Q111: "Inside the app we don't want to get constant emails. For the client yes, they should get the emails about it, but we shouldn't because it will just block up all our emails."
**Acceptance test:** Trigger a team alert. No email is sent to any team member.
**Status:** ___

## ITEM 6.8: Blocked milestone rule
**Requirement:** A blocked milestone escalates immediately rather than after a waiting period.
**Source:** Q292: "It should happen straight away. That's the maximum acceptable age."
**Acceptance test:** Marking a milestone blocked fires an immediate alert.
**Status:** ___

---

# MODULE 7: ONBOARDING GATE

The onboarding sequence has hard gates. Do not allow a client to skip them.

## ITEM 7.1: Instant portal access on payment
**Requirement:** As soon as payment clears, a single button sends the client their portal access email.
**Source:** Q121: "I want the sales closers to be able to have the client portal and literally just send over the email with one click of a button as soon as the payment goes through."
**Acceptance test:** One click sends the access email and provisions the client login.
**Status:** ___

## ITEM 7.2: Three gate requirements before the William call
**Requirement:** The client must complete all three of the following before they can book the onboarding call:

1. **Blueprint document** uploaded to the portal
2. **Screenshot** proving they have watched the first 10 Podia course videos, uploaded to the portal
3. **Tick confirming** they have joined the WhatsApp group

**Source:** Q124: "The blueprint document is done so that needs to be uploaded. A screenshot that they've completed the first 10 videos of the Podia course needs to be uploaded there as well. A little tick to confirm that they're in the WhatsApp group as well."
**Acceptance test:** All three items appear as a client checklist. The call booking prompt is locked until all three are complete.
**Status:** ___

## ITEM 7.3: Gate completion unlocks the booking prompt
**Requirement:** Once all three gate items are complete, the client is prompted to message the WhatsApp group to arrange the call with William.
**Source:** Q124: "once all those ticks are done and they've uploaded everything, they will then get prompted to message inside the group for a call with William now and he will arrange it personally."
**Acceptance test:** Complete all three. The prompt appears.
**Status:** ___

## ITEM 7.4: Call booking stays human
**Requirement:** Call booking is not automated. The client asks in WhatsApp and William arranges it.
**Source:** Q117: "it's booking the calls that should be kept human because we don't want to overload the calls all the time"
**Acceptance test:** No automated calendar booking exists in the onboarding flow.
**Status:** ___

## ITEM 7.5: William's post-call trigger button
**Requirement:** After the onboarding call, William clicks a button in the portal that sends the client an email prompting them to complete the Information document.
**Source:** Q111: "after William's call, there could be a button that he clicks, which reminds them to do the blueprint to complete the information document and that sends an email to them."
**Source:** Q126: "William will prompt them to do the information document, which he clicks inside the client portal to send them a notification with."
**Acceptance test:** The button exists on the client record, sends the email, and logs the action.
**Status:** ___

## ITEM 7.6: Information document upload notifies the team
**Requirement:** When the client uploads the Information document, the team is notified in-app.
**Source:** Q111: "Once that email is done and they've uploaded it, we then, as comp users, get a notification that it's done."
**Acceptance test:** Upload triggers a team notification.
**Status:** ___

## ITEM 7.7: Upload auto-validates the task
**Requirement:** Uploading a required document automatically ticks that task complete and triggers the next step notification.
**Source:** Q115: "as soon as they upload the required document into the portal, then that step is complete. There's a tick next to that task and we get notified for the next step."
**Acceptance test:** Upload a document. The task ticks itself. The next notification fires.
**Status:** ___

## ITEM 7.8: Setup completion evidence checklist
**Requirement:** A checklist confirming setup is complete: profile created on portal, information present, WhatsApp group created, Podia access given, Will's Brain AI access given.
**Source:** Q123
**Acceptance test:** All five items exist as checkable evidence.
**Status:** ___

## ITEM 7.9: Work cannot start without both documents
**Requirement:** The system prevents or clearly warns that delivery work cannot begin until both the Blueprint and Information documents are complete.
**Source:** Q114: "the team can never start without the information document and the blueprint document done because we actually use that information document within our AI to be able to write up all the email sequences"
**Acceptance test:** Attempting to progress past onboarding without both documents produces a block or warning.
**Status:** ___

## ITEM 7.10: Onboarding explainer video slot
**Requirement:** A place in the portal to host the video explaining how to use the client portal, recorded by the head of operations.
**Source:** Q125: "The head of operations, who is myself, will record and explain to them exactly how to use the client portal."
**Acceptance test:** The video renders in the client onboarding view.
**Status:** ___

---

# MODULE 8: DOCUMENTS AND GOOGLE DRIVE

## ITEM 8.1: Blueprint and Information documents have dedicated slots
**Requirement:** These two documents have named, permanent, easy-to-find locations on every client record. They are the two most frequently hunted for items in the business.
**Source:** Q24: "what's usually missing on our client sides is when we're trying to locate their blueprint document... These two information documents are usually quite key to find."
**Acceptance test:** Both documents are visible on the client record without navigating into a general file list.
**Status:** ___

## ITEM 8.2: Google Drive folder per client
**Requirement:** Every client maps to a folder in BGE's client Google Drive.
**Source:** Q101
**Acceptance test:** The client record stores and links to their Drive folder.
**Status:** ___

## ITEM 8.3: Portal uploads mirror to Google Drive
**Requirement:** Anything uploaded to the client portal also lands in that client's Google Drive folder.
**Source:** Q101: "any time something is uploaded to the client portal, I also want that to correspond to that Google Drive right there so it's interactive"
**Acceptance test:** Upload a file to the portal. It appears in the mapped Drive folder.
**Status:** ___

## ITEM 8.4: Fathom recordings mirror to Google Drive
**Requirement:** Fathom recordings logged in the portal are also sent into the client's Drive folder.
**Source:** Q101: "Whenever there's a Fathom recording from the client portal, that should also be sent in as a document and/or as a recording into the Google Drive."
**Acceptance test:** Log a Fathom recording. It reaches Drive.
**Status:** ___

## ITEM 8.5: Client notes section
**Requirement:** A notes section on each client, first written by William at the start of the journey.
**Source:** Q25: "A notes section on the client, produced first of all by William at the start of his entire journey"
**Acceptance test:** The notes section exists and is attributed.
**Status:** ___

## ITEM 8.6: Client can upload their own resources
**Requirement:** Clients can add their own materials: social media links, brand colours, brand assets, their own Google Drive links, and any supporting content.
**Source:** Q272: "Let's say the client adds in their brand colours and they've got a whole Google Drive associated with it. We want them to be able to add as many resources and as much content into the portal so we can obviously benefit from it."
**Acceptance test:** A client user can upload links and files to their own record.
**Status:** ___

## ITEM 8.7: Booking links are findable
**Requirement:** Team booking links (Calendly and similar) are stored in one obvious place so nobody has to hunt for them.
**Source:** Q24: "when a client asks for our booking links, we have to go in and find that a bit further"
**Acceptance test:** All team booking links are on one page, one click to copy.
**Status:** ___

## ITEM 8.8: SOP and framework links are findable
**Requirement:** A clearly marked location holding SOP sheets and client frameworks.
**Source:** Q24: "just making that very blatantly clear, where the SOP sheets are and where the frameworks are for the client"
**Acceptance test:** A resources area exists containing these links.
**Status:** ___

---

# MODULE 9: APPROVAL WORKFLOW

This replaces WhatsApp script approval. It is a named requirement with a specific mechanic.

## ITEM 9.1: Scripts upload to the portal, not WhatsApp
**Requirement:** Copy and scripts are uploaded into the portal and the client is notified there.
**Source:** Q58: "Right now the client is sent the scripts so they can approve them inside WhatsApp but what we want to do is have a notification. We upload the scripts inside the portal and they get a notification that the scripts have now been uploaded."
**Acceptance test:** Uploading a script fires a client notification pointing at the portal.
**Status:** ___

## ITEM 9.2: Google Doc review link
**Requirement:** The client reviews the script via an embedded or linked Google Doc.
**Source:** Q58: "They go in there and review it, let's say via a Google Doc or something like that."
**Acceptance test:** The review opens the document.
**Status:** ___

## ITEM 9.3: Two-option approval control
**Requirement:** The client approves with exactly two options:
- **Tick mark: no improvements needed, all good**
- **Tick mark: editing needed** (greyed styling, with a comments field)

**Source:** Q143: "A tick mark to say 'no improvements needed, all good'. A tick mark to say 'editing needed' and that could be grey. Just these two options."
**Acceptance test:** Both options exist. "Editing needed" captures the client's comments.
**Status:** ___

## ITEM 9.4: Edit request loops back to the team
**Requirement:** An "editing needed" response returns the item to the responsible team member with the client's comments attached.
**Source:** Q58: "We will then edit that if needed and make sure that it's done and it's ready to upload."
**Acceptance test:** Request an edit. The task returns to the owner with comments.
**Status:** ___

## ITEM 9.5: Master "all copy ready" button
**Requirement:** Once every piece of copy is ready, one final button marks the whole set ready for client approval.
**Source:** Q189: "Once all of the copies are ready to go, there will be one final button which will say, 'All of the copy is ready now. It's time for the client to approve it,' so they'll go through everything."
**Acceptance test:** The button exists, changes state of all copy items, and notifies the client once.
**Status:** ___

## ITEM 9.6: Recording task list after approval
**Requirement:** After copy approval, the client receives a recording task list containing exactly four items:

1. VSL
2. Ads
3. Thank you and next steps video
4. Nine FAQ videos

**Source:** Q58: "it's going to be the job of the client to record: the VSL, the ads, the thank you next steps video, the 9 frequently asked videos as well"
**Acceptance test:** All four appear as client tasks after copy approval.
**Status:** ___

## ITEM 9.7: Recording upload accepts external links
**Requirement:** The client uploads recordings as a Google Drive or Dropbox link.
**Source:** Q58: "They will send it as a Google Drive link or as a Dropbox or something like that."
**Acceptance test:** A link submission is accepted and stored against the task.
**Status:** ___

## ITEM 9.8: Drilon approve or re-record loop
**Requirement:** Drilon reviews uploaded recordings and either approves them or requests a re-record. The loop repeats until approved, then he uploads into the funnel.
**Source:** Q58: "Drilon will then approve it or ask them to re-record something. Eventually once they send them the new recordings if needed, Drilon will then approve it again and upload it into the funnel for a final time."
**Acceptance test:** Both outcomes work and the loop can repeat.
**Status:** ___

## ITEM 9.9: Nothing ships without client review
**Requirement:** No deliverable is marked complete without client review.
**Source:** Q195: "In terms of being delivered without review, nothing. We get everything to be reviewed by the client first."
**Acceptance test:** No path exists to complete a deliverable that skips client approval.
**Status:** ___

---

# MODULE 10: DWY VARIANT

Done With You clients follow a different copy path. This is the only significant deviation.

## ITEM 10.1: Program type drives task variation
**Requirement:** The task set adapts based on whether the client is DFY, DWY or DIY.
**Source:** Q201
**Acceptance test:** A DWY client receives a different Phase 1 copy task than a DFY client.
**Status:** ___

## ITEM 10.2: DWY does not receive written VSL and ads
**Requirement:** For DWY clients, BGE does not write the VSL and ads copy.
**Source:** Q201: "For done-with-you the VSL on the ads is not something that we write up for them."
**Acceptance test:** A DWY client's task list omits "Write VSL copy" and "Write ads copy" as team-owned tasks.
**Status:** ___

## ITEM 10.3: DWY VSL and ads task prompts a Waleed call
**Requirement:** When a DWY client opens the VSL and ads item, they are prompted to book a call with Waleed in the WhatsApp group.
**Source:** Q201: "when the client clicks on the VSL on the ads bit, they're going to be prompted to book in a call with Waleed in the WhatsApp group"
**Acceptance test:** Clicking the item shows the prompt.
**Status:** ___

## ITEM 10.4: DWY client uploads their own copy for approval
**Requirement:** After the call, the DWY client uploads their finished copy. Waleed reviews and approves.
**Source:** Q201: "Once that's done and they have a final model or whatever, they can upload it into the relevant section. Waleed will obviously go in and check on that and approve it"
**Acceptance test:** Upload and approval path works for DWY.
**Status:** ___

## ITEM 10.5: DWY still receives auto-written supporting assets
**Requirement:** DWY clients still receive the thank you video script, 9 FAQ scripts and email sequences written by Drilon.
**Source:** Q201: "In terms of the thank-you next-steps video, frequently asked question videos, and email sequences, that's actually automatically written up by Drilon."
**Acceptance test:** These three remain on the DWY task list.
**Status:** ___

## ITEM 10.6: DWY Amalor is a paid add-on
**Requirement:** For DWY clients, the Amalor onboarding call is an optional paid extra of approximately 300 dollars.
**Source:** Q55: "If it's done with you, they can choose to pay for that for an extra $300 I believe."
**Acceptance test:** The DWY record reflects this as an optional purchase.
**Status:** ___

---

# MODULE 11: CLIENT-INITIATED REQUESTS

## ITEM 11.1: Client can raise a request in the portal
**Requirement:** A client can create a request directly in the portal rather than only in WhatsApp.
**Source:** Q280: "I want the client to be able to go into the client portal and add in unique requests"
**Acceptance test:** A client user can submit a request.
**Status:** ___

## ITEM 11.2: Client assigns the request to a team member
**Requirement:** When raising a request, the client selects which team member they believe should handle it.
**Source:** Q280: "assign them to the member that they think is going to be suitable"
**Acceptance test:** The request form includes a team member selector.
**Status:** ___

## ITEM 11.3: Request accepts a Loom video
**Requirement:** The request form accepts a Loom video link.
**Source:** Q280: "I want them to be able to upload a Loom video in there as well"
**Acceptance test:** A Loom link is accepted and renders.
**Status:** ___

## ITEM 11.4: Request accepts bullet point description
**Requirement:** A text field for bullet point description of the issue.
**Source:** Q280: "a piece of text which tells in bullet points what the exact issue is"
**Acceptance test:** Text is captured and displayed.
**Status:** ___

## ITEM 11.5: Request accepts supporting documents
**Requirement:** Supporting documents can be attached to a request.
**Source:** Q280: "if there are any other supporting documents that can help with all of this"
**Acceptance test:** Attachments upload and are viewable by the team.
**Status:** ___

## ITEM 11.6: Requests become tasks
**Requirement:** A submitted client request appears as a task for the assigned team member.
**Acceptance test:** Submit a request. It lands in the assignee's task list.
**Status:** ___

---

# MODULE 12: NOTIFICATIONS

## ITEM 12.1: Clients receive email notifications
**Requirement:** Clients are notified by email when something needs their attention or work has been delivered.
**Source:** Q111, Q214, Q190
**Acceptance test:** A client-facing event sends an email.
**Status:** ___

## ITEM 12.2: Clients also receive in-portal notifications
**Requirement:** The same events also produce a notification inside the portal.
**Source:** Q190: "They get an email notification about it and a website notification"
**Acceptance test:** Both fire for the same event.
**Status:** ___

## ITEM 12.3: No noise notifications
**Requirement:** Clients are not notified when nothing significant has happened.
**Source:** Q262: "No updates when nothing significant has happened. We don't want them checking in and seeing no work or no progress."
**Acceptance test:** No scheduled or periodic "nothing to report" notification exists.
**Status:** ___

## ITEM 12.4: Notification triggers are limited to real events
**Requirement:** Client notifications fire only when work is completed or a task needs their attention.
**Source:** Q263: "Only when actual work has been done and completed or there's a task that needs their attention"
**Acceptance test:** Review all notification triggers. Every one maps to completion or client action required.
**Status:** ___

## ITEM 12.5: Progress summary contents
**Requirement:** Every progress summary sent to a client contains all five of:
1. What phase they are in
2. What task has been set
3. Who set the task
4. The expected timeline
5. Details of the task

**Source:** Q264
**Acceptance test:** A generated summary contains all five elements.
**Status:** ___

## ITEM 12.6: Team message composer with delivery choice
**Requirement:** A team member can compose a message, note or task for a client and choose the delivery method: email only, dashboard only, both, or neither.
**Source:** Q261: "I want a feature or a tab to be allowed where the team can input a message, a note, or a task for the client that can be sent via email. We can send it either via email or just in their dashboard section. We can choose both, just one of each, just one of them, or nothing at all."
**Acceptance test:** All four delivery options exist and behave correctly.
**Status:** ___

## ITEM 12.7: Single reminder, not a sequence
**Requirement:** Reminders are kept minimal. One email notification, plus the portal to-do list showing what is outstanding.
**Source:** Q112: "To keep this simple, literally just send one email notification to them and then obviously inside the client portal it shows them their to-do list and what they need to upload."
**Acceptance test:** No repeating reminder cadence exists.
**Status:** ___

---

# MODULE 13: CALLS AND FATHOM

This module addresses a named, unresolved frustration. Treat it as high value.

## ITEM 13.1: Every one to one call is logged
**Requirement:** A call log exists on every client record. This currently does not happen anywhere and is a stated failure.
**Source:** Q25: "when somebody completes a one-to-one call with the client, the Fathom is not even sent in anywhere. We've got no idea. With every single client we don't know how that call has gone."
**Acceptance test:** A call can be logged against a client and is visible to the whole team.
**Status:** ___

## ITEM 13.2: Call record structure
**Requirement:** Each call record captures, at minimum:
- Call type
- Date
- Who attended
- Fathom recording link
- Google Drive link
- Overall notes
- **Tasks for the client**
- **Next steps**
- **Other notes**

**Source:** Q271: "tasks for the client, next, other notes or something like that. This is going to be the breakdown that we actually want for every single one."
**Acceptance test:** All nine fields exist on the call record form.
**Status:** ___

## ITEM 13.3: Fathom link field
**Requirement:** A dedicated field for the Fathom recording URL.
**Source:** Q25, Q101
**Acceptance test:** The link is stored and opens.
**Status:** ___

## ITEM 13.4: AI summarises Fathom recordings
**Requirement:** An AI assistant can summarise and highlight the contents of a Fathom recording.
**Source:** Q400: "The AI assistant should be able to pretty much highlight everything inside the Fathom recordings with the one-to-one calls. That should be completely fine."
**Acceptance test:** Given a transcript, the AI produces a structured summary that populates the notes, client tasks and next steps fields as editable drafts.
**Status:** ___

## ITEM 13.5: AI output stays editable
**Requirement:** AI-generated call summaries are drafts a human can edit. They never overwrite human-entered notes.
**Acceptance test:** Edit an AI summary. The edit persists and is marked as human-edited.
**Status:** ___

## ITEM 13.6: Call overview across all clients
**Requirement:** A view showing recent calls across all clients so the team can see what has been happening.
**Source:** Q25: "I want to see a Fathom overview sheet of the entire call."
**Acceptance test:** A cross-client call feed exists.
**Status:** ___

---

# MODULE 14: PERFORMANCE AND HEALTH

## ITEM 14.1: Ad tracker embedded per client
**Requirement:** Each client profile has a tab containing their ad performance Google Sheet, live, embedded in the dashboard.
**Source:** Q270: "for every client's profile there's going to be a tab on there which has the ad tracker integrated inside. It's got to be the Google Sheet inside the actual dashboard that clients can see."
**Acceptance test:** The sheet renders inside the client profile and reflects live data.
**Status:** ___

## ITEM 14.2: Ad tracker is client-visible
**Requirement:** Clients can see their own ad tracker.
**Source:** Q270: "In terms of performance data yes, the clients should be able to look at it."
**Acceptance test:** A client user sees their ad tracker.
**Status:** ___

## ITEM 14.3: Expand to full sheet
**Requirement:** A link expands the embedded tracker into the full Google Sheet in a new browser tab.
**Source:** Q270: "There is going to be an option where it's a link and it expands to the actual sheet on Google Chrome"
**Acceptance test:** The expand link opens the sheet.
**Status:** ___

## ITEM 14.4: Amalor account view
**Requirement:** A section per client linking through to their Amalor account, using Drilon's admin login, rendered as an embedded page view inside the dashboard.
**Source:** Q405: "I also want to be able to have an admin look into their Amalor account. That Amalor account in particular will actually be Drilon's login. It's going to be a link to a Google Chrome page, which is the Amalor, and then it just sends it inside the dashboard."
**Flag:** GoHighLevel may block iframe embedding. If so, implement as a deep link that opens the correct subaccount funnel directly, and flag this.
**Acceptance test:** One click reaches the client's funnel in Amalor without manual subaccount navigation.
**Status:** ___

## ITEM 14.5: Core health metrics
**Requirement:** Track these metrics per client:
1. **Speed of process** (is everything being delivered on time)
2. **Number of calls and interactions** (internal only)
3. **Ad performance**
4. **Money produced, total ad spend, investment recouped**

**Source:** Q296
**Acceptance test:** All four are captured and displayed.
**Status:** ___

## ITEM 14.6: Call count metric is internal only
**Requirement:** The number of calls and interactions is not shown to the client.
**Source:** Q296: "By the way this is for our internal metrics. It's not for the actual client to be able to see."
**Acceptance test:** A client user cannot see the interaction count.
**Status:** ___

## ITEM 14.7: Leading versus lagging indicators
**Requirement:** Metrics are labelled as leading (time and speed) or lagging (ad performance and revenue).
**Source:** Q297, Q298
**Acceptance test:** Each metric carries a leading or lagging label.
**Status:** ___

## ITEM 14.8: Extensible KPI schema
**Requirement:** The metrics schema accommodates additional KPIs to be defined later: close rate, show rate, click through rate, bookings, no-shows, cost per booked call.
**Source:** Q384, Q299: "all of the ad performance key metrics, like the KPIs, can be filled out at another point by William and some of the other key members"
**Acceptance test:** New metrics can be added without a schema migration.
**Flag:** These KPIs are pending definition by William and the team. Build the container, leave values empty.
**Status:** ___

## ITEM 14.9: Negative ad performance triggers attention
**Requirement:** A client with negative ad return is flagged for attention.
**Source:** Q300
**Acceptance test:** A negative return flags the client.
**Status:** ___

## ITEM 14.10: Delivery log with timestamps
**Requirement:** A feed logging exactly what was sent to the client and when, marked on time or late.
**Source:** Q215: "There could be a log feed or something to show exactly what dates things have been sent over and we can make that client-facing as well, and also team-facing. The next one can say if it's been on time, if it was late, whatever."
**Acceptance test:** The log exists, shows dates, marks on-time status, and has a client-facing view.
**Status:** ___

---

# MODULE 15: AI LAYER

## ITEM 15.1: Information document triggers AI copy generation
**Requirement:** When the Information document is uploaded, the system triggers AI generation of the email sequences, 9 FAQ scripts and thank you video script.
**Source:** Q181: "As soon as that is done the rest of it can be written, like the email automations (the 4 email automations), the frequently asked questions, and the thank you video, because it's all written by AI."
**Source:** Q218: "the email sequences made by AI are going to have an integration to Claude. I want that recurring task to be generated via API"
**Acceptance test:** Uploading the Information document produces draft copy for all three asset types.
**Status:** ___

## ITEM 15.2: Drilon approval gate on AI output
**Requirement:** AI-generated copy requires Drilon's review and approval before it reaches the client. He can edit it first.
**Source:** Q181: "All it needs is Drilon's approval. Drilon can actually go into the Google Doc and basically just improve it and approve it."
**Acceptance test:** AI output sits in a review state until approved.
**Status:** ___

## ITEM 15.3: AI generation is invisible to the client
**Requirement:** The client must never see that copy was generated instantly by AI. Generation timing and method are internal only.
**Source:** Q183: "the client can't see that. We don't want the client to think that the work was done instantly just using AI."
**Acceptance test:** No client-facing surface shows AI generation, generation timestamps, or draft states.
**Status:** ___

## ITEM 15.4: AI summary report generator
**Requirement:** A team member can generate an AI summary report for any client at any time, covering:
- Exact times and dates things were submitted
- Whether each item was on time
- Current funnel status
- Next steps

**Source:** Q426: "I want us as a team to be able to use AI to create a summary report of everything that's been going on. That can be done at any time."
**Acceptance test:** Generate a report. All four content areas are present and accurate.
**Status:** ___

## ITEM 15.5: Report includes the visual roadmap
**Requirement:** The report includes the visual roadmap and timeline.
**Source:** Q426: "let's have a nice feature where the visual roadmap is in the timeline"
**Acceptance test:** The report renders the roadmap.
**Status:** ___

## ITEM 15.6: Report downloads as PDF
**Requirement:** The report can be downloaded as a PDF.
**Source:** Q426
**Acceptance test:** Download produces a correctly formatted PDF.
**Status:** ___

## ITEM 15.7: Report can be emailed to the client
**Requirement:** The report can be sent directly to the client's email.
**Source:** Q426: "can the PDF just be downloaded or can it actually be sent straight to the client's email?"
**Acceptance test:** Send delivers the report by email.
**Status:** ___

## ITEM 15.8: Never automate relationship communication
**Requirement:** WhatsApp conversation and one to one calls are never automated or AI-generated.
**Source:** Q401: "the WhatsApp chats, they can't be automated, even the one-to-one calls as well"
**Acceptance test:** No feature auto-sends WhatsApp messages or auto-conducts calls.
**Status:** ___

---

# MODULE 16: RENEWALS, UPSELLS AND CANCELLATION

## ITEM 16.1: Renewal alert at two weeks
**Requirement:** The team is alerted two weeks before a client's leaving date.
**Source:** Q406: "renewal conversations are actually manual. Nothing can be automated and that usually happens about two weeks before they're about to leave."
**Acceptance test:** An alert fires at 14 days out.
**Status:** ___

## ITEM 16.2: Renewal tab per client
**Requirement:** A dedicated renewal view per client showing:
1. How far away they are from renewing
2. What phase they are in
3. Whether they have launched
4. Ideas for how to renew them
5. The best renewal argument
6. KPIs to present on the call

**Source:** Q412
**Acceptance test:** All six elements are present.
**Status:** ___

## ITEM 16.3: Renewal data review pack
**Requirement:** Before a renewal call, the team can see internal metrics, timeline position, total ad spend, leads generated, and all presentable KPIs in one view.
**Source:** Q407
**Acceptance test:** One view contains all of it.
**Status:** ___

## ITEM 16.4: Renewal owner assignment
**Requirement:** Renewals are assignable, defaulting to Alfie, with the ability to reassign to Drilon.
**Source:** Q408: "At the moment it's Alfie, the head of sales, but this potentially may be delegated to Drilon"
**Acceptance test:** Renewal owner is set and changeable.
**Status:** ___

## ITEM 16.5: Cancellation reasons capture
**Requirement:** A section within renewals recording why a client did not renew, capturing the person's name and the main reason.
**Source:** Q420: "we should have a section within client renewals, which is 'Reasons for them not renewing,' and then we can have examples: choosing the name of the person, the main reason"
**Acceptance test:** Both fields exist and save.
**Status:** ___

## ITEM 16.6: Mastermind upsell tracking
**Requirement:** Track mastermind as the current upsell offer alongside renewals.
**Source:** Q411: "we've got masterminds. Nothing else in terms of upsells right now."
**Acceptance test:** Mastermind status is trackable per client.
**Status:** ___

## ITEM 16.7: Case study eligibility flag
**Requirement:** Clients with strong results can be flagged as case study candidates.
**Source:** Q431: "many times people come in at 20k per month and we get them to 100k per month"
**Acceptance test:** The flag exists and is filterable.
**Status:** ___

---

# MODULE 17: OFFBOARDING AND EX CLIENTS

## ITEM 17.1: Move to ex-client
**Requirement:** A client can be moved to ex-client status.
**Source:** Q435
**Acceptance test:** The action works and removes them from the active board.
**Status:** ___

## ITEM 17.2: Ex-clients are never deleted
**Requirement:** Ex-client records and their folders are retained permanently, not deleted.
**Source:** Q435: "That is not deleted at all, by the way, but that's just kept there."
**Source:** Q377: "even with our ex-clients, there's going to be a folder for them."
**Acceptance test:** No delete path exists for ex-clients in normal use. Data persists.
**Status:** ___

## ITEM 17.3: Restore an ex-client
**Requirement:** An ex-client can be restored to active status at any time with all history intact.
**Source:** Q435: "if we want to restore them we can also restore them back"
**Source:** Q377: "I still want them to be accessible and we can add them back at any time."
**Acceptance test:** Restore returns them to the board with all data present.
**Status:** ___

## ITEM 17.4: Client keeps portal access after offboarding
**Requirement:** After offboarding, the client retains access to their portal, frozen at their final state.
**Source:** Q434: "the client portal: they should still have access to it if they ever want to use it in the future."
**Source:** Q432: "They should still have access to their client dashboard but it's just going to remain like the last point that they had at the end."
**Acceptance test:** An offboarded client can log in and see their final state, read only.
**Status:** ___

## ITEM 17.5: Podia access is revoked
**Requirement:** Podia course access is removed at offboarding. This is separate from portal access.
**Source:** Q434: "They will not keep access to their Podia accounts at all and that will be removed from them."
**Acceptance test:** Offboarding flags Podia revocation as a required action.
**Status:** ___

---

# MODULE 18: DASHBOARDS

## ITEM 18.1: Client home screen shows status first
**Requirement:** The first thing a client sees on login is their current status: where they are, what is happening, what is next.
**Source:** Q403: "First thing on the screen should always be the dashboard with an update on what's going on for the client."
**Acceptance test:** Client login lands on a status-first dashboard.
**Status:** ___

## ITEM 18.2: Client dashboard answers the ten questions
**Requirement:** At any moment, a client can answer all ten of these from the portal without asking anyone:

1. Where am I?
2. What is happening now?
3. What happens next?
4. Who owns the next step?
5. When should it be done?
6. Is anything blocked?
7. Do you need anything from me?
8. What progress has been made?
9. Are we on track toward the outcome?
10. What is coming up later?

**Source:** Q247 to Q255, Q268
**Acceptance test:** Walk through all ten as a client user. Each is answerable from the dashboard.
**Note:** The workbook answers "that's completely fine in the WhatsApp chat" to most of these. The explicit intent of this build is to move that certainty into the portal so it does not depend on someone replying in chat.
**Status:** ___

## ITEM 18.3: Client sees who is doing the work
**Requirement:** When work is in progress, the client sees which named team member is doing it and how many days remain.
**Source:** Q285: "it's going to put the 'in progress' sign, being dealt with by a certain team member for example. If it's the copy for the VSL ads, it will be William."
**Source:** Q212: "they can actually see what's in progress and how many days are left until expected sending"
**Acceptance test:** An in-progress item shows an owner name and a day countdown to the client.
**Status:** ___

## ITEM 18.4: Client sees their own outstanding responsibilities
**Requirement:** The client sees exactly what they owe, with a rough time estimate for each.
**Source:** Q269: "there are going to be certain tasks that they can get on with. It's going to show them a rough timeline of how long that should take them as well."
**Acceptance test:** Client tasks display with estimated duration.
**Status:** ___

## ITEM 18.5: Client sees a checklist of what is missing
**Requirement:** The client can see a clear checklist of outstanding items.
**Source:** Q119: "Yes I want the client to see a checklist of what exactly is missing."
**Acceptance test:** The missing-items checklist renders.
**Status:** ___

## ITEM 18.6: Internal dashboard shows weekly progression
**Requirement:** The team dashboard shows who has progressed this week and into which phase.
**Source:** Q389: "on our client dashboard, maybe we can see who's progressed this entire week and, in particular, who's progressed into their own tasks"
**Acceptance test:** A weekly progression view exists.
**Status:** ___

## ITEM 18.7: Internal dashboard shows heaviest workload
**Requirement:** The team dashboard surfaces where the heaviest task load sits.
**Source:** Q403: "The tasks and the team are able to get reviews on what's going on at the moment, what the heaviest tasks are"
**Acceptance test:** Workload distribution is visible.
**Status:** ___

## ITEM 18.8: Internal dashboard shows who is falling behind
**Requirement:** The team can see across the whole system who is behind schedule.
**Source:** Q210: "we can also manually drill in, especially, or have a look over the entire system and see who's falling behind"
**Acceptance test:** A behind-schedule view exists across clients and owners.
**Status:** ___

## ITEM 18.9: Client roster board
**Requirement:** A board view of all active clients organised by phase.
**Acceptance test:** All clients render in phase columns.
**Status:** ___

## ITEM 18.10: Everything is logged
**Requirement:** An internal activity log records feedback given, items added, items removed, decisions, and changes.
**Source:** Q388: "I think everything should be logged, to be honest, because the log is not going to be opened up too much. Plus it's all internal but it's just so we know exactly what's happened."
**Acceptance test:** A log captures actions with actor, timestamp and detail.
**Status:** ___

---

# MODULE 19: FINAL AUDIT

Run every check below and report pass or fail for each.

## Visibility boundary audit
- [ ] Log in as a client. Confirm you cannot see: internal notes, client-caused delay commentary, interaction counts, other clients, AI generation states, William's business context section.
- [ ] Log in as a team member. Confirm you can see everything on every client.
- [ ] Confirm future phases render greyed and unclickable for the client and fully accessible for the team.

## Data integrity audit
- [ ] Confirm no client data is lost when moving to ex-client and restoring.
- [ ] Confirm the Google Sheet sync never silently overwrites a portal field without appearing in Pending Approvals.
- [ ] Confirm RLS blocks cross-client access. Attempt it and show the failure.

## Workflow audit
- [ ] Walk a test client end to end: payment, portal access, three gate items, William call, information document, AI copy generation, Drilon approval, client copy approval, recording upload, Drilon approval, funnel build, Victor ads call, Alfie sales build, launch, optimisation.
- [ ] Confirm every phase transition fires the correct notification to the correct person.
- [ ] Confirm no step can be skipped.

## Timeline audit
- [ ] Confirm both timelines render.
- [ ] Confirm a client delay produces a positive day count on the roadmap.
- [ ] Confirm early team delivery produces a days saved indicator.

## Notification audit
- [ ] Confirm no team member receives email notifications.
- [ ] Confirm clients receive both email and in-portal notifications.
- [ ] Confirm no notification fires when nothing significant has happened.

## Dead ends audit
- [ ] Confirm no navigation item leads to an empty or broken page.
- [ ] Confirm every empty state has meaningful content, not a blank panel.
- [ ] Confirm no console errors on any route.

---

# OPEN ITEMS

These were explicitly left undecided in the workbook. Build a sensible default, flag it clearly in the interface as provisional, and do not block on them.

| ID | Item | Workbook says | Default to build |
|---|---|---|---|
| **OI-1** | What happens if onboarding prerequisites are incomplete | Q110: "Not sure. We'll come back to this at the end of the document. Just make a note that this is undiscovered yet." | Block progression, show the client what is outstanding, alert the team at 3 days overdue |
| **OI-2** | Escalation threshold for poor client health | Q301: "We'll have to sort this out later with the other team members." | Flag at negative ad ROI, leave threshold configurable in settings |
| **OI-3** | Full performance KPI set | Q384: "for this I'm going to be getting on a call with the rest of the team" | Build an extensible metrics table, seed with close rate, show rate, CTR, bookings, no-shows, cost per booked call, all empty |
| **OI-4** | Retention actions after a cancellation request | Q421: "Not sure." | Log the request, notify William and Alfie, no automated save sequence |
| **OI-5** | William's business context note format | Q128: "I will send you a few examples of what William actually writes up inside that document because he's got a specific way." | Free text section with suggested headings: where they are now, what they have been doing, the offer, the price point, the deliverables |
| **OI-6** | Sign-up and terms document software | Q103: "I'm not sure exactly what software is used for that" | Store as an uploaded document reference on the client record |

---

# THINGS THE WORKBOOK SAYS NOT TO BUILD

Do not build these. They were explicitly ruled out.

- **Do not automate WhatsApp.** WhatsApp stays human and stays the communication channel. Q401, Q222.
- **Do not automate one to one calls.** Q401.
- **Do not build automated call booking.** Q117: booking stays human so calls do not get overloaded.
- **Do not send team members email notifications.** Q111.
- **Do not send clients periodic updates when nothing has happened.** Q262.
- **Do not build a manager-only permission tier.** Q399: all team members see and edit the same things.
- **Do not integrate Slack.** Q393: "We do have Slack but we only use Slack for internal use and that's not going to be of use over here."
- **Do not show clients that copy was AI-generated.** Q183.
- **Do not build automated retention or save sequences on cancellation.** Q419: "we just leave them be and just wish them the best in the WhatsApp chat."

---

# BEGIN

Start at ITEM 0.1. Work in order. Report status on every item. Do not stop until Module 19 is complete.
