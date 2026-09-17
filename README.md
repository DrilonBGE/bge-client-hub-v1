# Client Navigator

MASTER REBUILD PROMPT — BGE CLIENT MANAGEMENT SYSTEM

For use in Lovable (lovable.dev)

PART 1: RECONSTRUCTION NOTES

Product: BGE Client Journey Board — an internal client management system for Build, Grow & Exit (BGE), a done-with-you and done-for-you marketing agency.

ICP: BGE's internal team (Diamant, Drilon, William, Waleed, Victor, Alfie, Lisa) and eventually BGE's paying clients.

Core outcome: Every client is trackable through a structured 6-phase onboarding and delivery programme. The team can see instantly what phase each client is in, what tasks are outstanding, who owns each task, and what is coming up (renewals, upsells, missing subscriptions).

Core mechanism: A kanban board with 6 phases. Each client has a card. Clicking a card opens a full client profile with tabs for tasks, info, documents, call reviews, results tracking, and a visual journey roadmap.

Primary workflow: Client added → assigned to Phase 1 → team works through pre-loaded checklist tasks per phase → client moves through phases → renewals and upsell alerts surface automatically → client eventually becomes ex-client.

Main screens:

Dashboard (stats, to-do count, renewals, upsell opportunities)

Current Clients (6-column kanban board)

Current To-Do List (all incomplete tasks across all clients, grouped by phase)

Renewals (clients leaving within 30 days with team assignment)

Upsells / Subscriptions (Amalor, SSS, Fanbasis uptake per client)

Ex Clients (archived clients, restorable)

Important Links (team contact info, Calendly links, social links, funnel links)

Settings (team members/credentials, phase task editor, Google Sheets connection, Firebase config, mass phase change)

Audit Log (admin only — every action timestamped with user)

Proprietary concepts preserved:

6-phase BGE programme (Week 1-2 Launch, Week 2-4 Funnel Build, Week 4-5 Pre-Launch, Week 5-6 Launch, Week 6-8 Optimisation, Week 8+ Scaling)

Pre-loaded tasks per phase with specific team member owners

Upsell tracking: Amalor (£297/mo), SSS (£47/mo), Fanbasis (affiliate)

Programs: DFY (Done For You), DWY (Done With You), DIY (Do It Yourself)

Visual Journey Board — a client-facing roadmap view

Features intentionally excluded from V1 of this rebuild:

Google Sheets auto-sync with pending approval inbox (scoped but not yet built)

Client portal / login for clients themselves

Podia course integration

Contradictions resolved:

Latest file has 6 phases; earlier versions had 5. 6 is correct.

Phase task ownership uses the current BGE team (William, Waleed, Lisa, Victor, Alfie, Drilon). Earlier versions used different names. Current names are correct.

PART 2: MASTER LOVABLE PROMPT

Build a production-quality internal client management system for Build, Grow & Exit (BGE), a done-with-you / done-for-you marketing agency. This is a team-facing web application deployed at a public URL (Vercel). It must feel polished, fast, and professional — not like a generic SaaS template.

---

## PRODUCT CONTEXT

Build, Grow & Exit (BGE) takes coaching and consulting clients through a structured 6-phase marketing programme. Each client pays between £4,000 and £50,000. The team needs to track every client through the programme, see what tasks are outstanding, get alerted on renewals and upsells, log calls, store documents, and track results.

The app is internal-only for now. Clients cannot log in yet. The team logs in with username/password.

---

## TECH STACK

- React + TypeScript + Tailwind + shadcn/ui where appropriate
- Supabase (PostgreSQL + Auth + Realtime)
- No Next.js — plain Vite React app is fine
- Single-page app with sidebar navigation

---

## DESIGN SYSTEM

### Palette


--orange: #E8381A (primary accent, CTAs, active states) --orange-dark: #c42e13 --orange-light: #fff0ec --black: #1A1A1A (text, sidebar background) --cream: #F5F0E8 (page background) --cream-dark: #EDE6D8 --card-bg: #FDFAF4 --border: #D9D0BF --muted: #8A7F6E --light-text: #5C5244 --white: #ffffff

Phase colours: Phase 1 (Week 1-2): #1DB954 (green) Phase 2 (Week 2-4): #E8381A (orange/red) Phase 3 (Week 4-5): #2563EB (blue) Phase 4 (Week 5-6): #7C3AED (purple) Phase 5 (Week 6-8): #D97706 (amber) Phase 6 (Week 8+): #0891B2 (teal)

Program badge colours: DFY: green background (#e8f8ee), green text (#1a6b3a) DWY: orange-light background (#fff0ec), orange-dark text (#b83210) DIY: blue-light background (#edf3ff), blue text (#2653a8) DWY/DFY or mixed: purple-light (#f5f0ff), purple text (#5a3bb0)


### Typography
- Font: DM Sans (body, UI), DM Mono (numbers, codes, IDs)
- Import from Google Fonts
- Base size: 14px, line-height: 1.5

### Layout
- Fixed left sidebar: 240px wide, collapsible to 56px
- Main content fills remaining width
- Sticky top bar inside main content showing page title + sync indicator + BGE logo

### Components style
- Cards: subtle shadow, 10px border-radius, cream/white background
- Buttons: orange primary, outline secondary
- No gradient overload, no glassmorphism, no bubbly SaaS cards
- Tables: clean, light grey header, thin row borders

---

## AUTHENTICATION

Use Supabase Auth (email + password).

Team members are stored in a `team_members` table:
- id, email, display_name, role ('admin' | 'member'), colour (hex), initials, created_at

On login, load the user's profile and role.

Admin role: full access to everything including audit log, settings, all clients.
Member role: same access for now (can be restricted later).

Session persists across browser refresh.

Sidebar shows logged-in user's initials, name, and sign out button.

---

## DATABASE SCHEMA (Supabase/PostgreSQL)

### clients
```sql
id            uuid primary key default gen_random_uuid()
created_at    timestamptz default now()
name          text not null
program       text   -- 'DFY' | 'DWY' | 'DIY' | 'DWY/DFY'
phase         int default 1   -- 1 through 6
active        text   -- contract value e.g. '£16,000'
renewal       text   -- day of month e.g. '9th'
leaving       text   -- e.g. '9th June'
payment       text   -- 'Bank Transfer' | 'Stripe' | 'Bank Transfer/Stripe'
notes         text   -- background notes (free text)
amalor        text   -- 'Yes' | 'No' | ''
sss           text   -- 'Yes' | 'No' | ''
fanbasis      text   -- 'Yes' | 'No' | ''
vsl_writer    text   -- 'William' | 'Waleed' | 'Drilon' | 'Alfie' | 'Victor' | ''
phone         text
email         text
why_signed_up text
last_touchpoint text
niche         text
ex_client     boolean default false
ex_client_date text
renewal_team_member text
renewal_talked text   -- 'Yes' | 'No' | ''
_last_updated bigint
tasks         jsonb default '{}'  -- key: "phase_taskIndex", value: boolean
results       jsonb default '{}'  -- free-form results fields
docs          jsonb default '[]'  -- array of document objects
fathom_links  jsonb default '[]'
web_links     jsonb default '[]'
call_reviews  jsonb default '[]'
custom_tasks  jsonb default '[]'


global_todos

id          uuid primary key default gen_random_uuid()
created_at  timestamptz default now()
text        text not null
client_id   uuid references clients(id)
client_name text
owner       text
due_date    text
done        boolean default false
done_at     timestamptz
done_by     text
_todo_id    text


team_links

id        uuid primary key default gen_random_uuid()
name      text
role      text
phone     text
email     text
link      text   -- Calendly or other link
sort_order int


audit_log

id          uuid primary key default gen_random_uuid()
created_at  timestamptz default now()
user_name   text
action      text
client_name text
detail      text


phase_tasks (global config — one row per phase)

phase_id  int primary key
tasks     jsonb   -- array of {t: title, o: owner, n: notes}


app_config (key-value store for settings)

key   text primary key
value text


Enable RLS on all tables. All reads/writes require authentication.

INITIAL DATA — PHASES

Seed these 6 phases into the phase_tasks table:

Phase 1 — Week 1-2: Launch

Onboarding call with William | Owner: William | Notes: Launch call to kick off the programme and set direction

Blueprint document filled out | Owner: Client | Notes: Client completes the Blueprint document in full

Copy written for VSL & Ads | Owner: William / Waleed | Notes: VSL script, ad copy and all funnel page copy written and delivered to client

Phase 2 — Week 2-4: Funnel Build

Funnel built out with email sequences | Owner: Lisa | Notes: Full Cold To Client funnel installed in Amalor with all email sequences live

VSL / Ads filmed & edited | Owner: Client | Notes: Client films VSL and ad creatives, edits and delivers final versions

Phase 3 — Week 4-5: Pre-Launch

Ads set up | Owner: Victor | Notes: All paid ad campaigns set up and ready to launch

Sales script & pitch deck built | Owner: Alfie | Notes: Full sales script and pitch deck built and delivered to client

Content strategy built | Owner: Drilon | Notes: Competitor research completed, platforms chosen, content formats and scriptwriting approach confirmed

Phase 4 — Week 5-6: Launch

Launch | Owner: Client | Notes: Content and ad campaigns go live. Sales calls begin populating onto client calendar

Phase 5 — Week 6-8: Optimisation

Funnel optimised | Owner: Drilon | Notes: Funnel data reviewed and improvements implemented

Sales calls reviewed | Owner: Alfie | Notes: Live call data reviewed and sales approach optimised

Ads reviewed | Owner: Victor | Notes: Ad performance reviewed and changes implemented

Phase 6 — Week 8+: Scaling

Scaling | Owner: (none) | Notes: Client acquisition is dialled in — scaling begins now

INITIAL DATA — TEAM LINKS

Seed this data into team_links:

William | Launch Call / VSL & Copy | +44 7856 019455 | Link: https://calendly.com/william-buildgrowandexit

Drilon | Funnel & Content Strategy | (Amalor link) | Link: (TBC)

Lisa | Email Sequences & Amalor | - | Link: -

Waleed | Ad Copy & VSL Scripts | - | Link: -

Victor | Media Buyer / Ads | 55 85 9613-6248 | Link: https://calendly.com/victorpontes/victor-buildgrowandexit

Alfie | Sales | 1 (216) 618-6872 | Link: https://calendly.com/alfie-buildgrowandexit/sales1on1

INITIAL DATA — CLIENTS

Seed these 42 clients into the clients table. All start at phase 1 with empty tasks:

Jimmy Barlow | DWY | $35,000 | 1st | 1st June | Bank Transfer Sam Moore | DWY | £16,000 | 2nd | 2nd July | Bank Transfer Ryan Arthur | DWY | $12,000 | 3rd | 3rd May | Bank Transfer Cheryl Kingston | DFY | £24,000 | 4th | 4th July | Bank Transfer Kyle McKenna | DIY | £8,000 | 6th | 6th August | Bank Transfer Jack Rayner | DWY | £16,000 | 9th | 9th June | Bank Transfer Ollie Cole | DWY | £16,000 | 9th | 9th June | Stripe William Coucher | DIY | £999 | 9th | 9th June | Stripe Michael Hansen | DWY | £24,000 | 9th | 9th September | Bank Transfer Chad Laurich | DFY | £36,000 | 9th | 9th September | Bank Transfer Brad German | DWY | £16,000 | 11th | 11th August | Bank Transfer | notes: Paid £8K 11.05.26 paying another £8K in 2 weeks Blaine Nicholls | DWY | £16,000 | 12th | 12th September | Bank Transfer George Lewer | DWY | £22,300 | 13th | 25th August | Bank Transfer Gregg Knight | DWY/DFY | £24,000 | 14th | 14th June | Bank Transfer/Stripe Cal Doggett | DWY | £50,000 | 14th | 14th April 27 | Bank Transfer Tom Elette | DWY | £30,000 | 15th | 15th November | Bank Transfer Ryan Fowler | DIY | £8,000 | 15th | 15th August | Bank Transfer Hannah James | DWY | £16,000 | 16th | 16th August | Bank Transfer Louis Barril | DFY | £36,000 | 17th | 17th September | Bank Transfer | notes: Final half due on 17th Aiisha Query | DWY | £8,000 | 18th | 18th June | Bank Transfer Brigette Van Acoleyen | DFY | £36,000 | 19th | 19th September | Bank Transfer | notes: £17K due on 19th Debbie Robinson | DWY | £8,000 | 20th | 20th July | Bank Transfer | notes: £2K due on 21st, then £8K due on 21st Heather Wilson | DIY | £6,802 | 20th | 20th July | Bank Transfer Kyle Froonjian | DFY | £28,200 | 22nd | 22nd August | Bank Transfer Dylan Gillespie | DWY/DFY | £24,000 | 22nd | 22nd June | Bank Transfer | notes: £8K due on 22nd, then £8K due on 22nd Gavin Quin | DFY | £36,000 | 22nd | 22nd September | Bank Transfer | notes: £22K paid, remaining on Fri 22nd Ross Wade | DFY | £36,000 | 23rd | 23rd September | Bank Transfer Taylor Rust | DWY | £24,000 | 24th | 24th June | Bank Transfer/Stripe Loren Lockman | DFY | £12,000 | 25th | 25th June | Bank Transfer Evan Hansen | DFY | £20,700 | 25th | 25th August | Bank Transfer Michael Noicos | DFY | £28,000 | 25th | 25th August | Bank Transfer Justin Wright | DWY | £16,000 | 26th | 26th June | Bank Transfer | notes: $7K on 26th Brian Begin | DFY | £38,000 | 27th | 27th August | Bank Transfer Jack Edge | DFY | £28,000 | 27th | 27th August | Bank Transfer Patrick Brennan | DFY | £12,000 | 27th | 27th May | Bank Transfer Noelle Russel | DWY/DFY | £20,000 | 28th | 28th July | Bank Transfer Roshan Grewal | DIY | £4,000 | 28th | 28th June | Bank Transfer Lane Murphy | DFY | £36,000 | 29th | 25th September | Bank Transfer Bill Harper | DFY | £37,166 | 29th | 28th November | Bank Transfer Avril Walters | DFY | $45,000 | 30th | 30th May | Bank Transfer Dustin Neff | DIY | £4,000 | 30th | 30th May | Stripe Alex Courtenay | DIY | $10,000 | 30th | 30th May | Bank Transfer

APPLICATION STRUCTURE

Sidebar Navigation (left, fixed, collapsible)

Items (in order):

Dashboard (grid icon)

Current Clients (people icon)

Current To-Do List (checklist icon)

Renewals (warning triangle icon)

Upsells / Subscriptions (£ icon)

Ex Clients (folder icon)

Important Links (link icon)

Settings (cog icon)

Audit Log (admin only — clock/history icon)

Sidebar footer: logged-in user's avatar circle (coloured), display name, Sign out button.

Sidebar collapses to icon-only mode. Toggle button at top of sidebar.

PAGE SPECIFICATIONS

PAGE 1: DASHBOARD

Route: /dashboard (default after login)

Top row stat cards (horizontal scroll on mobile):

Active clients (total count)

Week 1-2 — Launch (count)

Week 2-4 — Funnel Build (count)

Week 4-5 — Pre-Launch (count)

Week 5-6 — Launch (count)

Week 6-8 — Optimisation (count)

Week 8+ — Scaling (count)

Upsell potential /mo (£ value — calculated as: clients without Amalor × £297 + clients without SSS × £47)

Renewals in 30 days (count, red if > 0)

Below stats: section "Current To-Do List" — renders the global to-do list inline (same as the To-Do List page).

Below todos: section "Renewals expiring in 30 days" — mini table (client name, program badge, value, leaving date, days left chip).

Below renewals: section "Upsell opportunities at a glance" — 3 mini cards showing count without Amalor, count without SSS, count without Fanbasis.

PAGE 2: CURRENT CLIENTS

Route: /clients

Header: "Current Clients" title + subtext "Track every client through the 6-phase journey"

Top right: search input, program filter pills (All / DFY / DWY / DIY), + Add client button

Below header: stats row showing total count + per-phase counts (coloured by phase colour)

Main content: 6-column kanban board. Each column = one phase.

Column header: coloured dot + "Week X-Y: PhaseName" + client count chip

CLIENT CARD (inside each column):

Client name (bold)

Niche (italic, small, if set)

Contract value (e.g. £16,000)

Program badge (colour-coded: DFY green, DWY orange, DIY blue, mixed purple)

Progress bar (tasks done / total for this phase, coloured by phase)

"Leaving [date]" — shows in orange/red with warning icon if leaving within 45 days

Clicking a card opens the Client Detail Modal.

CLIENT DETAIL MODAL

Full-height overlay modal. Two sections: header + tabbed body.

Modal header:

Client name (large)

Phase badge (e.g. "Week 1-2: Launch")

"Visual Board" button (orange, opens Visual Journey Board fullscreen)

Close button (X)

Subtitle line: contract value · Renews [date] · Leaving [date in orange if soon]

Tabs (inside modal):

Tab 1: Overview

Phase selector: 6 phase buttons (coloured dots), clicking changes client phase

Leaving date chip (coloured if soon)

Quick info grid (read-only summary: value, renewal, payment, program)

Progress ring or bar showing overall programme completion %

Tab 2: All Tasks

Shows all 6 phase sections. Each section has:

Phase label header (coloured)

Task count (done/total)

Each task as a row: checkbox, task title (editable inline), owner (right-aligned, small grey), notes (below title, small grey)

Checking a task marks it done globally

"Custom Tasks" section at bottom with + Add custom task button

Tab 3: Info

Two-column grid of editable fields:

Renewal Date (text input)

Leaving Date (text input)

Payment Method (select: Bank Transfer / Stripe / Bank Transfer/Stripe)

Why Did They Sign Up? (text input)

Last Touchpoint (text input)

Phone / WhatsApp (text input)

Email (text input)

Amalor (select: Not set / Yes / No)

SSS (select: Not set / Yes / No)

Fanbasis (select: Not set / Yes / No)

VSL Writer (select: Not set / William / Waleed / Drilon / Alfie / Victor)

Below grid:

Background Notes (large textarea)

Key Website Links section with + Add button (stores label + URL pairs)

All fields autosave on change.

Tab 4: Documents

List of attached documents. Each item shows: icon (type-coloured), name, meta info, Open button, Delete button.

Document types: Link (blue), PDF (red), Sheet (green), Doc (purple), Other (grey)

Add document button opens inline panel:

Type pills (Link / PDF / Sheet / Doc / Other)

Name input

URL input

Save button

Suggested documents shown below (pre-populated list of BGE standard docs):

Blueprint Document

Information Document

VSL Script

Ad Scripts

Email Sequences

Funnel Link

Call Recording

Tab 5: 1-to-1 Calls

List of logged call reviews. Each shows: call type, date, who with, Google Drive link button, Fathom link button, notes preview.

Add call review button opens inline form:

Type of call (select: Onboarding call / Weekly check-in / Strategy call / Review call / Sales call / Ad review / Funnel review / Other)

Date (text)

Who with (text)

Google Drive link (optional)

Fathom recording link (optional)

Overall notes (textarea)

Tasks for client (textarea)

Tasks for executive team (textarea)

Save button

Tab 6: Results

Results tracker with editable rows:

Monthly revenue generated

Leads generated

Sales calls booked

Conversion rate

Cost per lead

Ads spend

ROAS

Email open rate

Amalor active

SSS active

Key wins this month

Below tracker:

Monthly notes / highlights (large textarea)

Evidence section: list of screenshots/documents with + Add screenshot or document button (supports URL link or file upload)

Modal footer:

"Ex Client" button (moves client to ex-clients archive)

Close button

Right: "Changes save automatically" note

VISUAL JOURNEY BOARD (fullscreen overlay)

Triggered by "Visual Board" button in client detail modal.

Full-screen takeover (position fixed, inset 0, cream background).

Top bar: Back button, client name, "Visual Journey Board", current phase badge.

Layout: horizontal flow

Left column (260px wide): stacked panels with their own tab switcher

Overview tab: client info card (name, value, program, renewal, leaving, phase status) + summary cards (total tasks done, phases complete, overall %)

Documents tab: list of attached docs

1-to-1 Calls tab: list of call reviews

Results tab: results tracker summary

Right area: vertical list of 6 phase nodes, connected by lines

Each phase node (200px wide card):

Coloured top bar (phase colour)

Phase label (e.g. "WEEK 1-2") in phase colour

Phase name (e.g. "Launch")

Progress bar (tasks done %)

Count (e.g. "2/3 tasks") and percentage

Status badge: "Active" (orange) / "Complete" (green) / "Upcoming" (grey)

Clicking a phase node expands a task panel to the right connected by an arrow line

Task panel (appears to the right of clicked phase node):

Phase colour border

List of tasks with circular tick dots (ticking them saves progress)

Task title + owner (right-aligned small text)

Done tasks show strikethrough text and green filled dot

Bottom: summary row with cards showing: tasks complete, tasks remaining, phases complete, overall % progress arc (SVG donut)

PAGE 3: CURRENT TO-DO LIST

Route: /todos

Header: "Current To-Do List" + "Custom tasks for the team — linked to clients" + + Add task button

Two sections:

Active tasks Grouped by phase (coloured phase headers). Each group shows a table: Task | Client (clickable orange link → opens client modal) | Owner | Action (Done button, green)

Any incomplete phase tasks across all active clients appear here automatically.

Below phase tasks: custom global to-do items (added manually via + Add task).

Completed tasks (below a divider) Greyed out, auto-removed after 7 days.

PAGE 4: RENEWALS

Route: /renewals

Header: "Renewals" + "Clients expiring in the next 30 days"

Table of clients whose leaving date is within 30 days: Columns: Client (clickable) | Program | Value | Leaving | Days left chip (red ≤10 days, amber ≤30) | Phone/WhatsApp | Email | Team member (assign dropdown: William / Drilon / Alfie) | Renewal talked? (Yes/No select)

Hide/show toggle on the table.

Empty state: "No renewals in the next 30 days ✓"

PAGE 5: UPSELLS / SUBSCRIPTIONS

Route: /upsells

Header: "Upsell / Subscription Opportunities"

Three sections:

1. Amalor (£297/mo) Table of clients without Amalor. Shows potential monthly revenue = count × £297. Columns: Client | Program | Value | Current Amalor status (toggle chip Yes/No) | Potential /mo

2. SSS (£47/mo) Same structure. Potential = count × £47.

3. Fanbasis Same structure. Shows affiliate commission note.

Each chip (Yes/No) is clickable to toggle the status and save.

PAGE 6: EX CLIENTS

Route: /exclients

Header with count of ex clients.

Table: Name | Program | Value | Last phase | Moved on date | Actions (View / Restore / Delete permanently)

Clicking name opens client modal. Restore moves client back to active board. Delete permanently removes from database (with confirmation dialog).

Empty state: friendly message with folder emoji.

PAGE 7: IMPORTANT LINKS

Route: /links

Three sections:

Team Members Editable table: Name | Role | Phone | Email | Booking Link (with ↗ open link)

Add row button.

Social Links Grid of social media platform links (YouTube, Instagram, Facebook, LinkedIn, TikTok, X/Twitter). Each shows platform name, icon, editable URL, Open button.

Key Links Two sub-sections: "Funnel links" and "Other links" Each is a list of label+URL pairs with + Add link button and delete button.

All data saves to Supabase in real-time.

PAGE 8: SETTINGS

Route: /settings

Four tabs:

Tab 1: Team Members Table of all team members: Display name | Username/email | Password (visible text — internal tool) | Role (Admin/Member) | Colour picker

Add new team member form below (name, email, password, role, colour) Note: "Credential changes take effect on next login."

Tab 2: Phase Tasks Phase selector buttons (Week 1-2 / Week 2-4 / etc.) For the selected phase, show editable task list:

Task title (editable input)

Owner (editable input, right-aligned)

Notes (editable textarea)

Delete task button (red ✕)

Add task to this phase button at bottom.

Changes save immediately to Supabase.

Tab 3: Google Sheets Connection Step-by-step instructions for connecting a private Google Sheet via the Sheets API:

Get the Spreadsheet ID from the URL

Create Google Cloud project, enable Sheets API, create API key

Share the sheet with "anyone with the link" view only

Paste credentials below

Input fields: Spreadsheet ID, API Key, Sheet tab name (default: "All Clients") "Connect & sync" button.

Also shows the Google Apps Script code for optional two-way write-back:

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('All Clients');
  var data = JSON.parse(e.postData.contents);
  var rows = sheet.getDataRange().getValues();
  for (var i = 2; i < rows.length; i++) {
    if (rows[i][2] === data.name) {
      sheet.getRange(i+1, 1).setValue(data.phase_label);
      sheet.getRange(i+1, 2).setValue(data.notes);
      sheet.getRange(i+1, 10).setValue(data.amalor);
      sheet.getRange(i+1, 11).setValue(data.sss);
      return ContentService.createTextOutput('ok');
    }
  }
  return ContentService.createTextOutput('not found');
}


Tab 4: Mass Phase Change "From phase" select + "To phase" select + "Move all clients" button. Confirmation dialog before executing.

PAGE 9: AUDIT LOG (admin only)

Route: /audit

Header: "Audit Log" + "Every change made to the board — who did it and when" + Clear log button

Table: Time | Team member | Action (badge) | Client | Detail

Actions logged:

phase_change

task_complete

ex_client

restore_client

client_added

field_updated

Stored in Supabase audit_log table.

KEY BUSINESS LOGIC

Leaving date parsing

Parse text like "9th June", "25th August", "14th April 27" into a real date. Extract month name and day number. If year not specified, use current year (or next year if date has passed).

Renewals alert

A client is "expiring" if their leaving date is within 30 days from today and is not an ex-client. Days chip is red if ≤10 days, amber if ≤30 days.

Leaving soon on kanban card

A client's card shows the leaving date in orange with ⚠ icon if leaving within 45 days.

Phase task progress

Each client has a tasks JSON object. Keys are "phase_taskIndex" (e.g. "1_0", "1_1", "2_0"). Value is boolean. Progress % for a phase = tasks done in that phase / total tasks defined for that phase × 100. This drives the progress bar on each kanban card and the phase node in the visual board.

Upsell calculations

Amalor potential = count of active non-ex clients without Amalor × £297

SSS potential = count × £47

Fanbasis = affiliate commission (variable, display count only)

Programs

DFY = Done For You

DWY = Done With You

DIY = Do It Yourself

DWY/DFY = mixed programme

Team members

Core BGE team: William (launch calls / copy), Waleed (VSL / ad scripts), Victor (Meta ads / media buying), Drilon (funnel build / content), Alfie (sales), Lisa (email sequences / Amalor onboarding)

REAL-TIME SYNC

Use Supabase Realtime to subscribe to changes on the clients table. When any team member makes a change, all other logged-in team members see it within seconds without page reload.

Show a sync indicator in the top bar:

Green "● live sync" when connected

Amber "● connecting" when reconnecting

Red "● sync error" on failure

TOAST NOTIFICATIONS

Show bottom-right toast notifications for:

Success (green ✓): client added, task complete, phase changed, doc added

Error (red ✕): validation failures, sync errors

Info (blue ↻): sync in progress, informational messages

Auto-dismiss after 3 seconds.

MODAL SYSTEM

One global modal overlay (semi-transparent black backdrop). Clicking backdrop closes modal.

Used for:

Client detail (large, full-height)

Add client form

Add to-do task form

Google Sheets setup

ADD CLIENT FORM

Fields:

Full name (text input, required)

Program (select: DFY / DWY / DIY)

Starting phase (select: all 6 phases)

Active value (text, e.g. £16,000)

Renewal date (text, e.g. 1st)

Leaving date (text, e.g. 1st June)

Payment method (select: Bank Transfer / Stripe / Bank Transfer/Stripe)

On submit: create client in Supabase, add to board, show toast.

ADD GLOBAL TO-DO FORM

Fields:

Task text (required)

Link to client (optional dropdown of all active client names)

Owner (optional — team member name)

Due date (optional text)

On submit: create in global_todos table.

RESPONSIVE BEHAVIOUR

Desktop (≥1200px): full sidebar + main content, 6-column kanban board. Tablet (768-1199px): sidebar collapses to icons by default, kanban scrolls horizontally. Mobile (<768px): sidebar hidden (hamburger opens it as drawer), kanban scrolls horizontally, modal is full screen.

EMPTY STATES

No clients in a kanban column: "No clients in this phase" (muted, centred)

No renewals in 30 days: "No renewals in the next 30 days ✓" (green check)

No ex clients: folder emoji + explanation text

To-do list empty: ✅ emoji + "All tasks complete! No outstanding tasks across any active client."

Audit log empty: "No activity logged yet."

IMPLEMENTATION PHASES

Phase 1: Foundation

Vite + React + TypeScript + Tailwind project setup

Supabase project creation

Database schema creation with all tables

RLS policies

Auth (email/password login + persistent session)

Sidebar layout + navigation shell

Top bar with sync indicator

Phase 2: Client data + board

Seed all 42 clients into Supabase

Seed phase tasks

Seed team links

Kanban board render (6 columns, client cards)

Client detail modal (all 6 tabs, all fields)

Add client form

Filter + search

Phase 3: Task system + progress

Phase task rendering and checkbox toggle

Progress bars on kanban cards and in visual board

Custom task add/remove per client

Global to-do list page with completion

Phase 4: Alerts + dashboard

Leaving date parser

Renewals page

Upsells page

Dashboard with all stat cards + mini tables

Phase 5: Visual Journey Board

Full-screen journey board overlay

Phase nodes with progress

Task panel expansion

Summary row with donut arc

Phase 6: Supporting pages

Important Links page (team table, social links, custom links)

Ex Clients page with restore + delete

Audit log page

Phase 7: Settings

Team member management

Phase task editor

Google Sheets connection UI + fetch logic

Mass phase change

Phase 8: Real-time sync + polish

Supabase Realtime subscription

Sync indicator

Toast system

Loading/skeleton states

Mobile/tablet responsive pass

QA ACCEPTANCE CRITERIA

[ ] Login screen appears when not authenticated

[ ] Incorrect credentials show error message

[ ] Correct credentials log in and persist across refresh

[ ] Sign out returns to login screen

[ ] Sidebar shows all 8 navigation items (9 for admin)

[ ] Sidebar collapses to icon-only mode and expands again

[ ] Dashboard shows correct counts from Supabase data

[ ] Dashboard renewals table shows clients leaving within 30 days

[ ] Dashboard upsell section shows correct counts

[ ] Kanban board shows all 6 columns

[ ] All 42 clients appear on the board (in phase 1 initially)

[ ] Program filter (All / DFY / DWY / DIY) filters the board correctly

[ ] Search filters by client name in real-time

[ ] Clicking a client card opens the client detail modal

[ ] All 6 tabs in the client modal render without errors

[ ] Phase change buttons (Overview tab) change the client's phase and move them to the correct column

[ ] Task checkboxes save state and update progress bar

[ ] Progress bar on kanban card updates when tasks are completed

[ ] Info tab fields all save on change (autosave, not a save button)

[ ] Documents tab: adding a link saves and appears in list

[ ] Call reviews tab: adding a review saves and appears in list

[ ] Results tab: editing a field saves

[ ] Visual Board button opens full-screen journey overlay

[ ] Visual board shows all 6 phase nodes with correct progress

[ ] Clicking a phase node in visual board shows its task panel

[ ] Ticking a task in visual board updates progress in real-time

[ ] Back button in visual board returns to client modal

[ ] "Ex Client" button moves client off active board

[ ] Ex Clients page shows moved clients

[ ] Restore button returns client to active board

[ ] To-Do List page shows all incomplete tasks across all clients

[ ] Completing a task from To-Do List removes it from the list

[ ] + Add task button on To-Do List creates a global task

[ ] Renewals page shows clients leaving within 30 days

[ ] Upsells page shows clients without Amalor, SSS, Fanbasis

[ ] Toggling Amalor/SSS/Fanbasis status saves and updates upsell counts

[ ] Important Links page shows team table (editable)

[ ] Settings → Team Members: add and remove team members

[ ] Settings → Phase Tasks: edit task titles and owners, add/remove tasks

[ ] Settings → Google Sheets: enter credentials and click Connect & Sync

[ ] Audit log records phase changes, task completions, ex-client moves

[ ] Audit log page is only visible to admin users

[ ] Supabase Realtime: changes made on one browser tab appear on another within 5 seconds

[ ] Sync indicator turns green when connected

[ ] Toast notifications appear for key actions and auto-dismiss

[ ] Modal closes when clicking backdrop

[ ] Mobile: app is usable with sidebar as drawer

[ ] Mobile: kanban board scrolls horizontally

[ ] No console errors on any page

[ ] RLS: a user cannot read data from a different Supabase project/tenant

IMPORTANT NOTES

Do NOT stop after building the login shell. Implement the full application and wire every screen to Supabase.

The kanban board must handle 42+ clients across 6 columns without performance issues. Use virtualisation if needed.

All editable fields in the client modal autosave — there is no "Save" button for individual fields. Use debounced Supabase updates (300-600ms after last keystroke).

The visual journey board is a key differentiator. Build it properly with the client info panels, phase nodes, connecting lines/arrows, and task panels. It is not a simple table — it is a designed flow diagram.

The leaving date field is a text field (not a date picker). The app parses it using month name matching (e.g. "25th August", "9th June"). Do not require ISO format dates.

Image uploads in the results tab are stored as base64 in the database (or Supabase Storage). Keep base64 images out of the main client record if possible — use Supabase Storage and store the URL reference.

The app brand: Build, Grow & Exit. Brand colours: orange #E8381A, cream #F5F0E8, black #1A1A1A. The logo mark is a small orange square with "B" in white.

Team member passwords are stored in plaintext in this version (internal tool, not public). Use Supabase Auth for the actual session management and store the plain-text password only as a display reference in settings if needed. Ideally, use Supabase Auth entirely and remove plaintext password storage.

The Google Sheets sync feature reads from a private Google Sheet using the Sheets API (requires API key + sheet made viewable). Build the UI and connection logic. Show step-by-step instructions inside the settings panel.

The pending approvals inbox for Google Sheets (new rows appear in the sheet → admin approves before adding to board) is a FUTURE feature. For V1, the sync simply fetches and updates existing matching clients by name.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://project-57adf0.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4d3c81d3-e4f5-434d-93c5-a4c4a7e46e0d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
