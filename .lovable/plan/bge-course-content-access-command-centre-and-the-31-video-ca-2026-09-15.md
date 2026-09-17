# BGE course content, access command centre and the 31-video call prompt

## What gets built

### 1. The course library
Your whole outline becomes a real course inside the portal: 9 categories, 65 modules, 239 items.

- Every item is created as a **video placeholder** for now, with an empty link.
- Each item has a small tick box marked "needed" so that later, when an item turns out to be a PDF or a document rather than a video, it can be switched to a file and ticked off as done.
- Team members can edit any item: title, type (video or file), the link, and the order.
- When you send a document of links, they get pasted straight into the matching items — no rebuild needed.

Client view of a category:
```text
CORE BUSINESS FOUNDATIONS
  CEO Daily Workflow
    - Video/Resource            [ Watch ]   (o) done
  Achieving Calendar Optimality
    - Main Module               [ Watch ]   ( ) done
    - Survey Questions and Why  [ coming soon ]
```
Items with no link yet show "Coming soon" and cannot be opened.

### 2. Progress and the call with William
- Clients tick items off as they watch or read them; progress is saved per client.
- For Done for you and Done with you clients, once **31 videos** are ticked, an orange panel appears: they have finished the required course content and should book their onboarding call with William. A notification goes to William at the same time, and the matching onboarding step on their roadmap is flagged as ready.
- Counting follows the course order, so "the first 31 videos" and "31 videos ticked" mean the same thing in practice.

### 3. Command centre
A new team-only page, **Command centre**, listing every client and every portal user side by side.

For each client you can toggle:
- which portal sections they see (dashboard, task manager, roadmap, weekly calls, course, key links, support, settings)
- which course categories and modules they get access to

Defaults: everything on, so nothing changes for existing clients until you switch something off. The portal reads these toggles, so a hidden section disappears from their menu entirely, and hidden course categories do not appear in their course list.

## Technical notes

- New tables: `course_sections`, `course_modules`, `course_items` (kind `video` | `file`, `url`, `needed`), `course_progress` (`client_id`, `item_id`, `done_at`), `client_access` (`client_id`, `tabs jsonb`, `course jsonb`).
- Grants + RLS: team full access via `is_team(auth.uid())`; clients read course rows and read/write only their own `course_progress`; `client_access` readable by the owning client via `my_client_id()`.
- Seeding: one migration with literal INSERTs generated from the uploaded outline, preserving category/module/item order.
- Portal: `ClientPortal.tsx` course tab replaced with a `CoursePanel` (category list → module accordions → items); tab list filtered through `client_access.tabs`.
- Command centre: `/_authenticated/command-centre` with `AppShell`, plus a link in the sidebar.
- The 31-video rule lives in one helper so the threshold can be changed in a single place.

## Not included
- Uploading videos or files (links only, as agreed).
- Per-team-member course access — this pass covers clients; team members always see everything.
