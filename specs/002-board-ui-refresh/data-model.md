# Phase 1 Data Model: Board UI Refresh

**Feature**: `specs/002-board-ui-refresh` | **Date**: 2026-09-22 | **Plan**: [plan.md](./plan.md)

This feature stores nothing new. There is no table to add, no column to add, and no edit to `database/schema.sql`. What follows describes the data the board **already receives** and how the refreshed presentation reads it. Anything marked *derived* is computed at render time and never stored, never sent to the API, and never held in page state.

---

## Entity: Task (existing)

Source: `GET /api/tasks` (optionally `?status=`), unchanged by this feature. Backed by the `tasks` table in `database/schema.sql`, which this feature does not touch.

| Field | Type | Used by the refreshed card | Notes |
|---|---|---|---|
| `id` | integer | React key, `data-testid` | Unchanged. |
| `title` | string | Card title (`h3`) | Wraps inside the card; never truncated. |
| `description` | string or null | Card body paragraph | Rendered only when present, as today. |
| `status` | `todo` \| `in-progress` \| `done` | Chooses the column, and the column's accent via `data-status` | Values come from `STATUSES` in `src/constants.js`. Not rendered as raw text. |
| `assignee` | string or null | Source of the initials chip and its accessible text | Not reshaped or split for storage — only for display. |
| `created_at` / `createdAt` | ISO timestamp | Muted "Created …" line | Set by the database. Read through a helper that accepts either casing, per the shared REST contract. |
| `commentCount` / `comment_count` | integer | Existing comment toggle badge | Unchanged behaviour. |

**No field is added, removed, renamed, or given a new meaning.** The refresh only changes how `assignee` and the created timestamp are *drawn*.

### Derived values (render-time only)

| Derived value | Input | Rule | Requirement |
|---|---|---|---|
| Initials | `assignee` | Trim; split on whitespace runs; no words → empty; one word → first letter; two or more → first letters of the first two words; uppercase. `"Priya"` → `P`, `"Sam Lee"` → `SL`, `"Ana Maria Costa"` → `AM`. | FR-007 |
| Assignee accessible text | `assignee` | `Assigned to {assignee}` when present, otherwise `Unassigned`. Visually hidden; the chip itself is `aria-hidden`. | FR-007 |
| Created label | created timestamp | Floor-based ladder: under 1 min or in the future → `Created just now`; 1–59 min → `Created N minute(s) ago`; 1–23 h → `Created N hour(s) ago`; 1–30 days → `Created N day(s) ago`; over 30 days → `Created 12 Aug 2026`. Missing or unparseable → empty string, and the line is not rendered. | FR-008 |
| Column card count | the task list | `tasks.filter(t => t.status === status).length`, evaluated where the column renders. | FR-003 |

---

## Entity: Column (presentation only)

A column is not stored and has no identity of its own. It is the rendering of one status value.

| Property | Source | Notes |
|---|---|---|
| Status value | `STATUSES` in `src/constants.js` | Order `todo`, `in-progress`, `done` is the display order (FR-001). |
| Label | `STATUS_LABELS` in `src/constants.js` | "To Do", "In Progress", "Done". Always rendered as text, so status is never carried by colour alone (FR-004). |
| Count | derived, see above | Correct by construction after every create, move, and delete refresh. |
| Accent | CSS, selected by `data-status` | Defined in `index.css`; see [contracts/design-tokens.md](./contracts/design-tokens.md). |
| Visibility | current filter | `all` → all three columns; a single status → only that column (FR-006). |
| Empty message | derived | `No tasks yet` whenever a column that **loaded successfully** has a count of zero, including when the whole board is empty (FR-015). |
| Unavailable message | derived | `Tasks unavailable` when the list request failed and there is nothing to show. Distinct from `No tasks yet` so a failed load can never read as a successfully empty board (FR-014). Counts are suppressed in this state. |

**State transitions**: unchanged. A card moves `todo` → `in-progress` → `done` through the existing Move control, which calls the existing update endpoint. This feature adds no transition, removes none, and does not allow skipping one. Drag-and-drop is out of scope.

---

## Motion bookkeeping (transient, not data)

Animation is driven by **intents** that `BoardPage` records for actions the user actually performed: `pendingCreates` (from the task `taskService.createTask` already returns) and `pendingMoves` (`{ task, from, to }`, captured before the update request). Both are keyed — moves by task id *and* source status — so several cards can be mid-move at once without overwriting one another, and each records the sequence number of the follow-up request that will reveal its change, filled in when that request starts. `TaskList` consumes an intent only once the board has settled on that request or a later one, then animates the matching card or places an empty, inert ghost in the source column, sized from one `offsetHeight` reading taken per pending move while the departing card was still mounted.

None of this is data. It is never sent anywhere, never persisted, and never counts towards a column's card count. Two properties are worth stating because the obvious shortcuts break them: an intent is **not** discarded on a timer started when the user clicked, so a slow refresh cannot lose an animation; and it is **not** derived by comparing task lists, because a diff cannot tell a created task from one a refresh happened to discover, and under a single-status filter a moved task simply vanishes from the response, which is indistinguishable from a deletion. Details are in [contracts/component-contract.md](./contracts/component-contract.md).

## Entity: New-task panel (session-scoped UI state)

Not stored anywhere and not sent to the API. It exists only while the page is open.

| Property | Where it lives | Lifetime |
|---|---|---|
| Open / collapsed | The native `<details>` element's own state, inside `TaskForm.jsx` | Collapsed on every mount. Never written to `sessionStorage` or `localStorage`, so a reload starts collapsed (FR-011). |
| Draft (`title`, `description`, `assignee`) | The existing `useState` in `TaskForm.jsx` | Survives collapse and re-expand because `<details>` keeps its content mounted. Cleared on successful create. Gone on reload (FR-011). |

---

## Entity: Comment (existing, untouched)

Comments keep today's shape and today's behaviour inside the refreshed card: the toggle, the count badge, the oldest-first thread, posting, and deleting all work exactly as before. The comment timestamp keeps using the existing `formatApproximateTime` helper — the new created-line formatter is separate and is not applied to comments (FR-010).

---

## Explicit non-changes

- `database/schema.sql`: not edited.
- REST request/response shapes: not changed; no endpoint added or removed.
- `src/services/taskService.js` and `src/services/api.js`: not changed.
- `src/constants.js`: not changed; it remains the only source of status values and labels for components.
- No client-set timestamps. The created line only reads what the database already set.
