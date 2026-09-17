# Premium dark portal redesign

## What will change

- Restyle the entire internal portal in a charcoal-black interface with ember-orange highlights, using Inter throughout.
- Replace the light card-heavy presentation with wide, full-width work areas, compact uppercase labels, layered dark surfaces, stronger hierarchy and restrained orange glow states inspired by the supplied portal references.
- Refresh the shared sidebar, top bar, navigation, controls, tables, cards, forms, tabs and empty/loading states so every internal page feels like one coherent premium operating system.

## Client workspace

- Change each client card/profile action from opening a modal to opening a dedicated client page in a new browser tab.
- Make the roadmap the first and dominant view on that page.
- Present all six phases as a horizontal left-to-right timeline with an active phase marker and overall progress.
- Split each phase around a central journey line: client-owned/visible tasks above, internal team tasks below.
- Let each task expand toward its own side to show status, owner, expected/completed dates, notes, visibility and actions without leaving the roadmap.
- Keep the existing client information, strategy, issues, approvals, requests, documents, calls, results, ads and drafts available in expandable full-width sections beneath the roadmap.

## Behaviour preserved

- Keep existing data, permissions, autosave, notifications, audit logging, task status changes, phase changes and client portal visibility rules intact.
- Preserve mobile access with horizontally scrollable roadmap stages and stacked details where needed.
- Use subtle transitions for expanding tasks and active states, with reduced-motion support.

## Technical details

- Add a typed authenticated route for the dedicated client workspace and update client links to use it.
- Rework shared visual tokens and shell styling in the existing design system; orange replaces blue as the primary action colour.
- Refactor the current modal content into reusable page sections where practical rather than duplicating business logic.
- Verify the client list, dedicated journey page, task expansion and mobile/desktop layouts in the live preview.
