# Quickstart: Validating the Board UI Refresh

**Feature**: `specs/002-board-ui-refresh` | **Date**: 2026-09-22 | **Plan**: [plan.md](./plan.md)

How to prove the refresh is done. This is a validation guide — it contains no implementation code. Component structure and accessible names are fixed in [contracts/component-contract.md](./contracts/component-contract.md); colour, type, spacing, and motion values are in [contracts/design-tokens.md](./contracts/design-tokens.md).

Because this refresh is presentation-only, every check below is either "does it look and behave as specified" or "does the existing behaviour still work".

---

## Prerequisites

1. PostgreSQL running with `database/schema.sql` applied and `database/seed.sql` loaded, per the repository README.
2. One backend running — Python on `:8000`, .NET on `:5088`, or Java on `:8080`. Any of the three is fine; the frontend must not behave differently.
3. Frontend dependencies installed. **No new dependency should have appeared** — confirm `frontend/package.json` is unchanged in the diff.

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### What the seeded board can and cannot show

`database/seed.sql` gives you tasks in all three statuses, single-word assignees (`Priya`, `Marco`, `Ana`), and one unassigned task. Two further cases are worth knowing about before you start:

- **Multi-word assignees** are reachable through the UI — the assignee field is free text, so create a task assigned to `Priya Sharma` and another to `Ana Maria Costa` to see the two-letter initials rules in the browser.
- **Old created times are not reachable through the UI, by design.** `created_at` is set by the database and the API offers no way to backdate it, so a freshly seeded board can only ever show `Created just now` and, after waiting, the minutes range. Everything from one hour upward — including the 30-day handover to a calendar date — is verified by the Vitest suite in Gate 1 with an injected clock, not in the browser. Do not try to fabricate an old task for this pass.

  *Optional, not required:* if you want to see an old card rendered in a browser, backdate one row in your **local dev database** directly, e.g. `UPDATE tasks SET created_at = NOW() - INTERVAL '90 days' WHERE id = 1;`. This is local dev-data setup outside this feature's frontend scope; no gate depends on it.

For Gate 7 you will also want a **second browser tab** open on the same board, so you can create a task in one tab and refresh the other. That is how you check that a card discovered by a refresh does not animate.

---

## Gate 1 — Automated tests (must pass first)

```bash
cd frontend
npm test -- --run
```

Expected: all suites green, including the pre-existing `TaskCard`, `TaskForm`, and `StatusFilter` tests. The pre-existing assertions on `Assigned to Priya`, `Unassigned`, `Delete`, `Move to In Progress`, and the `💬` toggle must still pass unmodified — that is the main guard that accessibility and behaviour did not regress.

New coverage that must be present (see "Tests This Feature Must Land" in [plan.md](./plan.md)), including the cases the browser cannot reach:

- **Created line, every boundary**, driven by an injected `now`: just now, 1 minute, N minutes, 1 hour, N hours, 1 day, N days, and a 90-day-old fixture rendering as calendar text. Plus missing/invalid (no line rendered) and a future timestamp.
- **Initials**: one word, two words, three or more words, extra whitespace, and no assignee.
- **Board states, checked under a single-status filter as well as `all`**: skeleton only when loading with nothing to show; cards left mounted when re-querying the same filter; `Tasks unavailable` with counts suppressed when the request failed with nothing to show; `No tasks yet` never rendered in the failed state; and exactly one column rendered in every state when a status filter is selected.
- **Request sequencing**, using deferred service mocks so completions can be resolved out of order: a load for filter A resolved *after* a load for filter B must change nothing — not the cards, not the columns, not the error; an error from A arriving after B succeeded must not surface; and switching away from a failed filter must never render the new filter's column in the failed state.
- **Motion by intent**: the entrance plays for an id in `pendingCreates` and **does not play** for an id that merely appears in a refreshed list; with a deliberately slow refresh the intent survives until the data lands and the animation still plays; a move with `filter === 'all'` grows the destination and leaves a ghost in the source column; a move under a **single-status filter**, where the moved task is absent from the refreshed list, still leaves a ghost in the selected column; two different cards moved before either refresh completes each get their own ghost at their own measured height; the same card moved twice keeps the first collapse running; an intent that resolves to nothing settles immediately and leaves no pending entry; the ghost has no `data-testid`, no button, no heading, and is excluded from the count; a delete, a filter change, and an unchanged refresh produce nothing.
- **Deferred mutation across a filter change**, the case a closure-captured filter gets wrong: hold the create request, switch filters while it is in flight, then resolve it. The follow-up refresh must ask the service for the **newly selected** filter, the `<select>` must still read that filter once everything settles, and the create intent must be **retained** — with the new task inside the new filter's results its entrance animation still plays. Repeat for a move, and add a Refresh pressed *during* a move's update request: that unrelated load must not consume the move intent, and the ghost must still play when the move's own refresh lands. A mutation that rejects must leave no pending intent behind.
- **Create panel**: starts collapsed, keeps a partial draft across collapse/expand, clears after a successful create.

Also run the linter:

```bash
npm run lint
```

No backend suite needs to run for this feature, because no backend file changes. If any backend file appears in the diff, stop — that is a scope violation.

---

## Gate 2 — Columns, wide and narrow (FR-001 to FR-006, SC-001)

Open `http://localhost:5173` with the filter on **All**.

**Wide (window ≥ 900 px)**

- [ ] Three columns side by side, left to right: To Do, In Progress, Done.
- [ ] Each header shows the status label as text plus a count equal to the cards below it.
- [ ] Each header has its own accent; the three are easy to tell apart at a glance.
- [ ] The page header shows "Engineering Task Board", the one-line context, and the status filter sitting with Refresh as one group.

**Narrow (resize below 900 px)**

- [ ] The same three columns stack in the same order with a clear gap between them.
- [ ] Labels and counts are still shown.
- [ ] Nothing overflows horizontally; no sideways scrollbar appears.

**Live counts**

- [ ] Note the counts, move a card from To Do to In Progress, and confirm the source count drops by one and the destination rises by one without pressing Refresh.
- [ ] Delete a card and confirm its column count drops by one.

**Filter**

- [ ] Choosing a single status shows only that column, with its own correct count.
- [ ] Returning to All shows all three columns again, including any empty one.
- [ ] Filtering changes only which columns are visible — no task is created or removed.
- [ ] While a filter change is loading, you never see cards from the *previous* filter sitting under the new column heading.
- [ ] With DevTools network throttling on (Slow 3G), submit a new task and immediately change the filter. When everything settles, the `<select>` still shows the filter **you chose second**, and the board shows that filter's columns — the create must not drag the board back to the filter that was selected when you pressed Add.

---

## Gate 3 — Cards (FR-007 to FR-009, SC-002, SC-004)

Create a task assigned to `Priya Sharma` and one assigned to `Ana Maria Costa` first, so the multi-word rules are on screen.

- [ ] A two-word name shows a two-letter chip (`Priya Sharma` → `PS`); a one-word name shows one letter (`Priya` → `P`); a three-word name uses the first two words (`Ana Maria Costa` → `AM`). Letters are uppercase.
- [ ] A task with no assignee shows an empty chip.
- [ ] Each card shows a muted `Created …` line. On seeded and freshly created tasks this reads `Created just now`, and moves into the minutes range as time passes. The hour, day, and 30-day forms are covered in Gate 1.
- [ ] A very long title wraps inside its card. The column does not get wider and does not overlap its neighbour.

**Screen reader / accessibility tree** (the browser dev tools accessibility pane is enough)

- [ ] The assignee is announced as `Assigned to {full name}`, or `Unassigned` when there is none. The initials themselves are not announced.
- [ ] Headings read `h1` page title → `h2` column heading → `h3` card title, with no level skipped.

**Quiet actions — including their contrast**

- [ ] With the pointer away from a card, Move and Delete are visually subdued, and Delete is clearly less prominent than Move.
- [ ] **Sample the quiet Move and quiet Delete labels with a contrast checker in both light and dark appearance. Both must clear 4.5:1.** They are quietened with a muted colour, not transparency, so the measured value should match the token table.
- [ ] Inspect the actions in dev tools with the board at rest: no enabled control has a computed `opacity` below 1. (The disabled submit button in the create panel is the only exception and is exempt.)
- [ ] Hovering the card makes both fully legible; Move gains a fill, Delete turns to the danger colour.
- [ ] Tabbing to Move or Delete with the keyboard makes them fully legible, with a clearly visible focus indicator.
- [ ] Complete a move and a delete entirely from the keyboard.
- [ ] Emulate a touch device (dev tools device mode, so `hover: none` applies) and confirm both actions are legible and usable without hovering.

**Comments unchanged**

- [ ] Open a card's thread: the count badge, oldest-first order, posting, and deleting a comment all behave exactly as before, and comment timestamps keep their existing wording (no `Created` prefix).

---

## Gate 4 — Create panel (FR-011, FR-012, SC-003)

- [ ] On a freshly loaded board, the create panel is collapsed and the columns are the main content on the page.
- [ ] Expand it: the same three fields appear — Title, Description, Assignee — with the submit control disabled until a title is typed.
- [ ] Type a partial draft, collapse the panel, expand it again: **the draft is still there**.
- [ ] Submit a valid task: the card appears in To Do, that column's count rises by one, and the three fields are cleared.
- [ ] Leave the panel expanded, reload the page: the panel is collapsed again and the previous draft is gone.
- [ ] Expand and collapse using only the keyboard (Tab to the summary, Enter or Space).
- [ ] A familiar engineer can expand the panel and add a task in under 30 seconds.

---

## Gate 5 — Light and dark appearance (FR-013, FR-016, SC-004)

Switch the operating system (or the browser's emulated `prefers-color-scheme`) between light and dark. In **each** appearance:

- [ ] Page background, card surfaces, column bodies, text, chips, buttons, and column accents are all readable.
- [ ] Sample text contrast with a contrast checker: page title, column heading, card title, body text, the muted created line, the quiet Move and Delete labels, and the active Delete label all meet WCAG AA (4.5:1 for normal text).
- [ ] The status filter dropdown, text inputs, and textarea are painted for the current appearance, not left light-on-dark.
- [ ] Every control shows a visible focus indicator when tabbed to.
- [ ] **There is no theme control anywhere on the page.**

Shared visual language:

- [ ] Compare two cards, the three column headers, and the create panel: same type size for the same role, same spacing rhythm, same corner roundness for the same kind of surface, colours from one palette.
- [ ] Cards have a resting shadow, and a visibly stronger one when hovered or focused. The resting shadow is not clipped.

---

## Gate 6 — Loading, refreshing, empty, and error states (FR-006, FR-014, FR-015, SC-007)

These states must be impossible to confuse, and they must respect the filter. Check each one on **All** and then repeat the loading and error checks with a **single status selected**.

**First load** — throttle the network in dev tools (or stop and restart the backend) and reload:

- [ ] Within a second, the page is clearly busy: column-shaped placeholders appear, not a bare spinner on a blank page and not a board that looks loaded and empty.
- [ ] With a single status selected, the busy board shows **exactly one column**, not three.
- [ ] The layout does not jump when the real cards arrive.
- [ ] The placeholders do not shimmer, pulse, or otherwise animate.

**Refresh with cards already on screen** — with throttling still on, press Refresh and move a card:

- [ ] **The existing cards stay on screen throughout.** The board does not blank out to skeletons on an ordinary refresh.
- [ ] A static `Refreshing…` label appears beside Refresh while the request is in flight, and the board is marked busy in the accessibility tree.
- [ ] No card re-animates while this happens.

**Filter change** — with throttling on, switch the filter:

- [ ] The previous filter's cards are not shown under the new column heading at any point. A brief placeholder is expected and correct.

**Overlapping requests** — this is the check that catches a late reply overwriting the current one. Throttle heavily (a few seconds per request) so two loads can be in flight at once:

- [ ] Select one status, and **before its request finishes** select a different status. When both requests have completed, the board shows the **second** status: one column, its own cards, its own count. Nothing from the first request appears, and no card list flickers in and out afterwards.
- [ ] Repeat with the backend stopped for the first request only (stop it, switch filter, restart it immediately, switch filter again). The first request's failure must not produce an error message or `Tasks unavailable` on the board that is now showing the second filter.
- [ ] With the backend stopped, let a filter fail so `Tasks unavailable` is showing, then switch to another filter. The new column must go straight to its loading placeholder — it must never appear in the failed state before its own request has run.

**Empty columns**

- [ ] Any column with no cards reads `No tasks yet`.
- [ ] Delete every task: the board is three columns each reading `No tasks yet`, with **no** extra board-level empty message.
- [ ] Filter to a status with no tasks: that single column still reads `No tasks yet`.

**Failed load** — stop the backend, then reload so the very first request fails:

- [ ] The existing error message appears, with its existing wording.
- [ ] The columns read **`Tasks unavailable`**, not `No tasks yet`, and show no counts. Nothing on the page suggests the board successfully loaded and is empty.
- [ ] With a single status selected, the failed board shows **exactly one column**, and it reads `Tasks unavailable`.
- [ ] **The stale-filter case**: with the backend running, view All, then stop the backend and switch the filter to a single status. The selected column must read `Tasks unavailable` — it must not claim `No tasks yet`, and it must not show leftover cards from the previous filter.
- [ ] Restart the backend and press Refresh: the columns and cards come back normally.

**Failed refresh** — with cards on screen, stop the backend and press Refresh:

- [ ] The cards stay on screen and the error message is added above them. No column changes to `Tasks unavailable` or `No tasks yet`.

---

## Gate 7 — Motion (FR-017, FR-018, SC-006)

Check this gate in at least two different engines (for example Chrome and Firefox, or Chrome and Safari). The mechanism is supported in all current evergreen browsers, so the behaviour must be the same in each — if one of them jumps, the gate fails.

With motion allowed, on the **All** filter:

- [ ] A newly created card fades and slides into its column and settles well under 300 ms.
- [ ] Moving a card to another status makes **both** columns change height smoothly: the destination eases open as the card unfolds, and the source eases closed rather than snapping shut.
- [ ] The moved card itself does not fade or slide — the fade-and-rise is only for newly created cards.
- [ ] **Open a card's comment thread, then move that card.** The source column must ease down from the card's *full* height. If it drops abruptly at the start of the collapse, the ghost is not preserving the card's height and the gate fails.
- [ ] No card appears twice during a move, and no leftover placeholder remains once the animation ends.

With a **single status selected** (the case a list diff cannot see):

- [ ] Move a card out of the selected status. The card leaves the board, and the selected column **eases down** instead of snapping.
- [ ] Counts and layout settle correctly afterwards.

**On a slow connection** — throttle so each request takes a couple of seconds, then repeat the two checks above:

- [ ] A created card still fades and slides in when it finally arrives. The animation must not be lost just because the round trip took longer than the animation itself.
- [ ] A moved card's source column still eases down when the refreshed list lands, rather than snapping.
- [ ] Move a card and press **Refresh** before the move has finished. That refresh must not swallow the animation: when the move's own reload lands, the source column still eases down.
- [ ] Submit a new task and change the filter before it lands. The board settles on the filter you chose second, and if the new task belongs there, it still fades and slides in — the animation is kept, not traded away.

**Concurrent moves** — still throttled, so several moves can be in flight at once:

- [ ] Move two **different** cards in quick succession. Each source column eases down from its own card's full height; neither collapse is cut short, and neither ends with a leftover gap.
- [ ] Move the **same** card twice in quick succession (To Do → In Progress → Done). The first collapse runs to completion; the board settles with the card in Done and every count correct.

**A card discovered by a refresh must not animate** — this is what separates a real create from any other new id:

- [ ] Open a second tab on the same board. Create a task in tab A, then press Refresh in tab B. In tab B the new card must simply appear, with **no** fade or slide. In tab A, the tab that created it, it animates.

**Nothing else moves** — check each individually and confirm the board updates with no motion at all:

- [ ] changing the filter
- [ ] pressing Refresh
- [ ] deleting a card
- [ ] expanding and collapsing the create panel
- [ ] opening and closing a comment thread
- [ ] plain page load

With reduced motion requested (OS setting, or dev tools emulation of `prefers-reduced-motion: reduce`):

- [ ] Creating and moving a card update the board instantly, with no animation at all.
- [ ] After a move, the source column resizes immediately — there is no pause followed by a late jump, and no empty placeholder is visible at any point.
- [ ] Combine reduced motion with dark appearance: both rules apply together.

---

## Gate 8 — Behaviour is unchanged (FR-010, SC-005)

Run through the existing flows once more and confirm the outcomes match pre-refresh behaviour exactly:

- [ ] Create a task (title only, and title + description + assignee).
- [ ] Move a task through To Do → In Progress → Done; confirm the Move control disappears on Done.
- [ ] Delete a task.
- [ ] Filter by each status and back to All.
- [ ] Press Refresh.
- [ ] Post and delete a comment.
- [ ] Rapidly move several cards in succession: counts and column heights end on the correct cards; nothing is duplicated or lost.

Diff review:

- [ ] Only `frontend/src/` files changed: `components/TaskList.jsx`, `components/TaskCard.jsx`, `components/TaskForm.jsx`, `pages/BoardPage.jsx`, `index.css`, and tests.
- [ ] `database/schema.sql`, `database/seed.sql`, all three backends, and `src/constants.js` are untouched.
- [ ] `src/services/taskService.js` and `src/services/api.js` are untouched — the overlapping-request fix is in the page layer, not in the service signatures the three backends share.
- [ ] `frontend/package.json` is untouched — no component library, CSS framework, or animation library was added.
- [ ] `index.css` declares `transition` or `animation` only in the three motion rules, and uses `opacity` only in the card-entrance keyframe and the pre-existing `button:disabled`.
- [ ] The only inline style in the components is the ghost's measured height custom property.
