# Feature Brief — Board UI Refresh (Layout & Look-and-Feel)

## The ask (as a product owner would phrase it)

The board works, but it looks like a prototype. Everything is stacked in a
single centred column, the three statuses only become visible columns on a wide
screen, and there is no visual difference between a card that's blocked, in
progress, or done. Engineers scanning the board can't tell at a glance where
work is piling up.

Give the board a proper **look and feel** and a **layout that reads like a real
Kanban board**, without changing what the app *does*.

- The three status columns — **To Do / In Progress / Done** — are always
  side by side on desktop, each with a clear heading and a **count** of the
  cards in it. On a narrow screen they stack, but stay clearly separated.
- Each column has a subtle visual identity (e.g. an accent colour on the
  header) so the eye lands on the right one quickly.
- Cards look tidier: consistent spacing, clearer title, the assignee shown as
  a small **avatar chip** (initials are fine — no photos), and a muted
  "created X days ago" line.
- Card actions (Move / Delete) are quieter until you hover or focus the card,
  so the board isn't a wall of buttons. Delete is visually secondary to Move.
- The **new-task form** moves into a panel that can collapse, so the board is
  the main thing on the page.
- The header gets a light polish: product name, a one-line context, and the
  refresh control grouped sensibly.
- A consistent design language: one type scale, one spacing scale, a small
  colour palette, defined once (CSS variables) and reused. Support the OS
  **dark-mode** setting.
- Loading and empty states look intentional — a skeleton or spinner for
  loading, a friendly "No tasks yet" message per empty column.
- Basic motion: cards fade/slide in when added, columns don't jump when a card
  moves. Keep it fast and subtle.

## Out of scope (for this feature)

- Drag-and-drop between columns. (Move stays a button for now.)
- Any new data, fields, or API changes — this is presentation only.
- A user-selectable theme switcher (we only follow the OS dark-mode setting).
- Real avatars, profile pictures, or a user directory.
- Board customisation (adding/renaming/reordering columns).
- Mobile-app-grade gestures or a separate mobile layout beyond "columns stack".

## Notes the team already knows (constraints the spec must honour)

- Frontend only. React app under `frontend/`, layers stay as they are:
  `components` (presentational) → `pages` (state + fetching) → `services`
  (HTTP). No backend or schema change.
- No new UI framework or component library. Plain CSS (or CSS Modules) using
  the existing `frontend/src/index.css` conventions; CSS variables for the
  design tokens.
- Keep the current component boundaries (`BoardPage`, `TaskList`, `TaskCard`,
  `TaskForm`, `StatusFilter`). Refactor markup and styles, not the data flow.
- Accessibility must not regress: semantic headings, focus-visible states,
  colour contrast AA, respects `prefers-reduced-motion`.
- Existing component tests must still pass; visible text and `data-testid`
  hooks that tests rely on stay stable (or tests are updated in the same
  change).
- No measurable bundle-size or render-performance regression.

## Open questions the spec should resolve (don't answer them here)

- Does the status **filter** stay, given the columns are now always visible?
- What exactly are the design tokens — the type scale, spacing steps, palette,
  radius, shadow levels?
- Where do the counts live — in the column header only, or also a board total?
- What's the collapsed/expanded default for the new-task panel, and is that
  remembered between visits?
- How is "created X days ago" phrased for <1 day and >30 days?
- What is the empty-column copy, and does a fully empty board look different
  from three empty columns?
- Which interactions get motion, and what's the exact duration/easing budget?

---

## Draft JIRA user story

> Paste into JIRA once refined. Keep the brief above as the linked description.

**Summary:** Refresh the task board UI — Kanban layout, design system, dark mode

**Type:** Story  **Epic:** Task Board UX  **Components:** frontend

**Story**

> **As an** engineer using the task board
> **I want** a clean Kanban layout with always-visible status columns and a
> consistent visual design
> **so that** I can see at a glance where work sits and where it's piling up,
> without the board feeling like a prototype.

**Acceptance criteria**

1. **Columns** — To Do / In Progress / Done render side by side on desktop
   (≥ ~900px) and stack, clearly separated, below that. Each column shows its
   label and a live card count.
2. **Column identity** — each column header carries a distinct accent colour;
   contrast meets WCAG AA.
3. **Cards** — uniform spacing and type; assignee shown as an initials avatar
   chip; a muted relative "created …" line; Move/Delete actions are visually
   quiet until card hover/focus, with Delete secondary to Move.
4. **New-task form** — lives in a collapsible panel; board content is the
   primary element on the page.
5. **Design tokens** — type scale, spacing scale, palette, radius and shadow
   defined once as CSS variables and used throughout; no hard-coded ad-hoc
   colours left in components.
6. **Dark mode** — the board is fully usable and AA-contrast under
   `prefers-color-scheme: dark`.
7. **States** — loading shows a skeleton/spinner; each empty column shows a
   friendly empty message.
8. **Motion** — new cards animate in; column heights don't jump on status
   change; all motion is disabled under `prefers-reduced-motion`.
9. **No behaviour change** — no API, data-model, or component-data-flow
   changes; all existing frontend tests pass (updated in this change only if
   markup they assert on moved).
10. **No regression** — Lighthouse/axe accessibility score does not drop;
    bundle size increase is negligible.

**Out of scope:** drag-and-drop, theme switcher UI, real avatars, column
customisation, API/schema changes.

**Definition of done:** AC met; component tests green; manual check in light
and dark mode at desktop and narrow widths; screenshots attached to the ticket;
brief linked as description.
