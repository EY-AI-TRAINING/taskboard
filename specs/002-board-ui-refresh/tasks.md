# Tasks: Board UI Refresh

**Input**: Design documents from `/specs/002-board-ui-refresh/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required for this feature. Plan section "Tests This Feature Must Land" and the constitution quality gate both require Vitest + Testing Library coverage before done. Run `cd frontend && npm test -- --run`.

**Organization**: Setup (shared visual language) → Foundational (request-stamped board state) → one phase per user story in priority order → Polish. Frontend only: `frontend/src/**` and frontend tests. No backend, schema, API, drag-and-drop, theme switch, new data, or new endpoints. No edits to `frontend/src/services/`, `frontend/src/constants.js`, or `frontend/package.json`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths in every description
- Tasks that both edit `frontend/src/index.css`, `BoardPage.jsx`, `TaskList.jsx`, `TaskCard.jsx`, or `TaskForm.jsx` are sequential (never both marked `[P]`)

## Path Conventions

- Web app frontend: `frontend/src/`
- Component tests: `frontend/src/components/__tests__/`
- Page tests: `frontend/src/pages/__tests__/`

---

## Phase 1: Setup (Shared Visual Language)

**Purpose**: Define the one shared token set (FR-016) so later story CSS references tokens, never raw values

- [x] T001 Declare all design tokens on `:root` in `frontend/src/index.css` per `contracts/design-tokens.md`: colour (light), type roles, spacing `--space-1`–`--space-6`, radii `--radius-sm` / `--radius-lg`, shadows, `--motion-duration: 180ms`, `--motion-ease`, `color-scheme: light dark`, and document the 900 px board breakpoint
- [x] T002 Re-point only colour tokens (including column accents) inside one `@media (prefers-color-scheme: dark)` block in `frontend/src/index.css` using the dark values from `contracts/design-tokens.md` (no theme switch, no JS)
- [x] T003 Add `.visually-hidden` (clip-based, stays in accessible tree) and `.skeleton` (inert `--surface-muted` card-proportion block, `aria-hidden`, no shimmer/pulse) utilities in `frontend/src/index.css`

**Checkpoint**: Token palette and utilities exist; components still behave as today

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Replace four independent list state values with one request-stamped `board` object and live-state reads so every story sees coherent filter/phase/tasks/error. Motion intents wait until US5.

**⚠️ CRITICAL**: No user story work begins until this phase is complete

- [x] T004 Write failing request-sequencing and live-filter tests in `frontend/src/pages/__tests__/BoardPage.test.jsx` using deferred `taskService` mocks: load A then switch to B and resolve A after B (B wins, A writes nothing); error from A after B succeeded surfaces nothing; fail filter A then switch to B with no intermediate render of B in the failed state; after any `await`, handlers must not refresh a stale closure filter
- [x] T005 Refactor list state in `frontend/src/pages/BoardPage.jsx` to a single `board` object `{ requestId, filter, phase, tasks, error }` with `phase` ∈ `loading` | `ready` | `failed`, a synchronous `commit(next)` that assigns `boardRef.current` before `setBoard`, and `beginLoad(nextFilter?)` that mints a monotonic id, atomically replaces the whole object (carry `tasks` only when re-querying the same filter; otherwise `[]`), and returns the minted id
- [x] T006 Guard every list completion in `frontend/src/pages/BoardPage.jsx` so success/failure write nothing unless `boardRef.current.requestId` still matches; after every `await` read `boardRef.current` only (never closure `board`); comment-count patches map over `boardRef.current.tasks` and leave `requestId` / `filter` / `phase` untouched; do not change `frontend/src/services/`
- [x] T007 Update `frontend/src/components/TaskList.jsx` to accept required props `tasks`, `filter`, `phase`, `requestId` (replace any prior loading/error booleans) and compute the visible column set once as `filter === 'all' ? STATUSES : [filter]` from `frontend/src/constants.js` — keep existing card rendering working for the filtered set
- [x] T008 Wire `frontend/src/pages/BoardPage.jsx` so `StatusFilter` value is `board.filter`, Refresh / filter change / post-mutation re-fetch all go through `beginLoad`, `TaskList` always receives `tasks` / `filter` / `phase` / `requestId` from the same `board` render, and the existing error paragraph still renders when `board.error` is set

**Checkpoint**: Foundation ready — overlapping loads cannot clobber the live filter; user stories can start

---

## Phase 3: User Story 1 — See where work is piling up (Priority: P1) 🎯 MVP

**Goal**: Always-visible To Do / In Progress / Done columns with live counts, distinct header accents, responsive side-by-side vs stacked layout, and header toolbar grouping filter with Refresh

**Independent Test**: Open the board with tasks in more than one status on a wide window and again on a narrow window. Confirm three labelled columns, live counts, distinct accents, header product name + context + filter grouped with Refresh, and that moving a task updates the two affected counts without a manual refresh

### Tests for User Story 1

- [x] T009 [P] [US1] Add column/count/filter tests in `frontend/src/components/__tests__/TaskList.test.jsx`: three columns in `STATUSES` order with counts for `filter === 'all'`; exactly one column when filtered with its own correct count; count equals rendered real cards; no board-level empty message
- [x] T010 [P] [US1] Extend `frontend/src/pages/__tests__/BoardPage.test.jsx` so the header exposes accessible name `Engineering Task Board`, `Filter by status`, and `Refresh`, and a status change after move/create/delete refreshes counts via the existing re-fetch (mock service)

### Implementation for User Story 1

- [x] T011 [US1] Render one `<section className="column" data-status={status}>` per visible status in `frontend/src/components/TaskList.jsx` with `aria-label` from `STATUS_LABELS`, an `h2` whose accessible name includes the label and live count (e.g. `To Do (3)`), and cards filtered by that status — never hard-code `todo` / `in-progress` / `done` or labels as string literals in this file
- [x] T012 [US1] Style the Kanban board in `frontend/src/index.css`: `.board` as equal three-column grid with `gap: var(--space-4)`; stack to one column at `@media (max-width: 899px)`; per-status accents via `[data-status="…"]` using accent tokens (3 px bar + tinted header; header text stays `--text`); sticky column headers; `.column { min-width: 0 }`; card title `overflow-wrap: anywhere`
- [x] T013 [US1] Group the `h1` "Engineering Task Board", existing one-line context, and toolbar (`StatusFilter` + Refresh) inside the page header in `frontend/src/pages/BoardPage.jsx` with filter and Refresh in one `toolbar` container — do not change `frontend/src/components/StatusFilter.jsx` behaviour
- [x] T014 [US1] Apply token-based page/header/toolbar/column surface rules in `frontend/src/index.css` (background `--bg`, surfaces, borders, type roles for title and column heading, focus ring `outline: 2px solid var(--focus); outline-offset: 2px` on `:focus-visible`) so US1 layout reads as one visual language

**Checkpoint**: US1 independently deliverable — glanceable columns and counts work; MVP

---

## Phase 4: User Story 2 — Scan a card without a wall of controls (Priority: P2)

**Goal**: Initials chip + accessible assignee text, muted relative created line, quiet Move/Delete (colour not opacity) that stay keyboard- and touch-operable; comments unchanged

**Independent Test**: Open a column with an assigned and an unassigned task. Confirm initials, relative created time, Move/Delete subdued until hover or focus (Delete secondary), and complete move/delete from the keyboard

### Tests for User Story 2

- [x] T015 [US2] Add/extend unit and render tests in `frontend/src/components/__tests__/TaskCard.test.jsx` for `initialsOf`: one word → first letter; two words → first letters of first two; three or more → first two words only; extra spaces ignored; empty/missing → `''`; uppercase; and that `getByText('Assigned to Priya')` / `getByText('Unassigned')` still pass with the chip `aria-hidden`
- [x] T016 [US2] Add created-line tests in `frontend/src/components/__tests__/TaskCard.test.jsx` with injectable `now`: under 1 min and future → `Created just now`; 1 minute / N minutes; 1 hour / N hours; 1 day / N days; older than 30 days → `Created` + `en-GB` calendar date (e.g. `Created 12 Aug 2026`); missing/invalid → no `<time>` rendered; accept both `created_at` and `createdAt`; leave `formatApproximateTime` comment assertions unchanged

### Implementation for User Story 2

- [x] T017 [US2] Export `initialsOf` and a separate created-line formatter (do not change `formatApproximateTime`) from `frontend/src/components/TaskCard.jsx` implementing the Edge Cases / data-model rules verbatim; read created timestamp via a helper that accepts `created_at` or `createdAt`
- [x] T018 [US2] Update card markup in `frontend/src/components/TaskCard.jsx`: `aria-hidden` initials chip + visually hidden `Assigned to {name}` / `Unassigned`; muted `<time dateTime={iso}>` only when the formatter returns non-empty; keep Move / Delete / comment toggle always in the DOM and tab order with existing accessible names; never hide actions with `display: none`, `visibility: hidden`, or `aria-hidden`
- [x] T019 [US2] Style card chrome and quiet actions in `frontend/src/index.css`: chip as `--radius-sm` rounded square (not circle); card `--radius-lg`, `--shadow-card` / `--shadow-card-raised` on hover/`:focus-within`; quiet Move (`--text-muted`, weight 600, 1 px `--border`) and quiet Delete (`--text-muted`, weight 400, no border); active states on card `:hover`, `:focus-within`, and `@media (hover: none)` — Move `--text` on `--surface-muted` fill, Delete `--danger`; **no `opacity` de-emphasis** on enabled resting controls (entrance keyframe and `button:disabled` remain the only allowed opacity uses)

**Checkpoint**: US1 + US2 independently testable — cards are scannable without a control wall

---

## Phase 5: User Story 3 — Add a task without the form taking over (Priority: P2)

**Goal**: Create form in a collapsed-by-default `<details>` panel; draft survives collapse within the visit; cleared after successful create; not persisted across reloads

**Independent Test**: Open the board — panel collapsed, columns primary. Expand, create a valid task, confirm new card and cleared fields. Reload — panel collapsed again, draft gone

### Tests for User Story 3

- [x] T020 [US3] Update `frontend/src/components/__tests__/TaskForm.test.jsx` for the collapsible panel: starts collapsed (no `open`); expands to Title / Description / Assignee; partial draft survives collapse/expand in the same render tree; successful create clears fields; summary accessible name `Add a task`; existing submit disabled-until-title behaviour still passes

### Implementation for User Story 3

- [x] T021 [US3] Wrap the existing form in `<details className="panel">` with `<summary>` "Add a task" in `frontend/src/components/TaskForm.jsx` — no `open` attribute on mount, no `sessionStorage` / `localStorage`, do not unmount fields when collapsed, do not auto-collapse on success, do not animate the disclosure; keep props and draft `useState` behaviour
- [x] T022 [US3] Style `.panel` / summary / fields with tokens in `frontend/src/index.css` (`--radius-lg`, `--space-4` padding, type roles) so the collapsed panel leaves columns as the primary page content

**Checkpoint**: US3 independently testable — board stays primary; create still works

---

## Phase 6: User Story 4 — Read the board in light or dark, including empty and loading moments (Priority: P3)

**Goal**: OS light/dark via tokens already defined; distinguishable loading / refreshing / empty / failed column states; shared type and spacing across header, form, columns, and cards; no theme switch

**Independent Test**: View light and dark appearance while loading, with every column empty, and with a mix of cards. Confirm WCAG AA contrast intent, loading placeholder (not a false empty board), `No tasks yet` only for successfully empty columns, and consistent tokens

### Tests for User Story 4

- [x] T023 [P] [US4] Extend `frontend/src/components/__tests__/TaskList.test.jsx` board-state coverage under both `all` and a single-status filter: skeleton only when `phase === 'loading'` and `tasks` empty; cards stay mounted when loading with tasks present; `Tasks unavailable` with counts suppressed when `phase === 'failed'` and `tasks` empty; `No tasks yet` only in `phase === 'ready'` empty columns — never in the failed state; filtered board never renders three columns while loading or failed
- [x] T024 [P] [US4] Extend `frontend/src/pages/__tests__/BoardPage.test.jsx` to assert static `Refreshing…` appears when `phase === 'loading'` and cards are on screen, and that first-load failure still shows the existing error text plus unavailable columns (not a successful empty board)

### Implementation for User Story 4

- [x] T025 [US4] Implement the four board-state renderings in `frontend/src/components/TaskList.jsx` per `contracts/component-contract.md`: (1) failed + empty → column shells with `Tasks unavailable`, counts suppressed; (2) loading + empty → skeleton blocks, `aria-busy="true"`, visually hidden `Loading tasks…`; (3) loading + tasks → keep cards, `aria-busy="true"`; (4) ready → cards and `No tasks yet` for empty columns — same visible column set in every state
- [x] T026 [US4] When `board.phase === 'loading'` and tasks are present, render a static `Refreshing…` label in the toolbar of `frontend/src/pages/BoardPage.jsx` (text only — no spinner, no animation)
- [x] T027 [US4] Finish cross-cutting token application in `frontend/src/index.css` so every visible colour resolves to a token (no raw hex outside `:root` / dark block), native controls inherit via `color-scheme`, empty/unavailable/muted copy uses `--font-size-muted`, and resting enabled controls never use opacity de-emphasis — confirming light and dark both follow `prefers-color-scheme` with no theme control

**Checkpoint**: US4 independently testable — finished empty/loading/dark moments without behavioural change

---

## Phase 7: User Story 5 — Motion stays quiet (Priority: P3)

**Goal**: Intent-driven entrance and column-height motion only (≤ 180 ms from consumption); reduced motion disables animation in CSS alone; no other decorative motion

**Independent Test**: Add a card and move a card with motion allowed; repeat with `prefers-reduced-motion: reduce`. Confirm only those two motions, each under 300 ms, and instant updates when reduced motion is requested

### Tests for User Story 5

- [x] T028 [P] [US5] Extend `frontend/src/pages/__tests__/BoardPage.test.jsx` for motion intents with deferred mocks and fake timers: create arms `pendingCreates` from returned task id and `beginLoad()` id; move raises `pendingMoves` keyed `move:{id}:{from}` synchronously before `await`; Refresh during in-flight update must not consume the move intent; deferred create/move across a filter change refreshes the live filter and retains/settles intents correctly; rejected mutation removes its intent; `onMotionSettled` drops entries
- [x] T029 [P] [US5] Extend `frontend/src/components/__tests__/TaskList.test.jsx` for intent consumption: entrance only for ids in `pendingCreates` (not refresh-discovered ids); slow refresh still animates when data lands; move with `filter === 'all'` grows destination and leaves a ghost in source; move under single-status filter still ghosts the selected column when the card is absent; two concurrent moves each keep measured height; same card moved twice keeps first collapse running; nothing-to-play settles immediately; ghost has no `data-testid` / button / heading and is excluded from count; delete, filter change, and plain refresh produce no motion class

### Implementation for User Story 5

- [x] T030 [US5] Add `pendingCreates` and `pendingMoves` state in `frontend/src/pages/BoardPage.jsx` per contract: create intent after `createTask` resolves using returned id; move intent synchronously at top of `handleAdvance` with `{ task, from, to, revealedByRequestId: null }`; arm `revealedByRequestId` with the id returned from `beginLoad()` after the mutation; remove intent if mutation rejects; pass lists and `onMotionSettled` to `TaskList`; delete records no intent
- [x] T031 [US5] Wrap each card in `.card-slot` in `frontend/src/components/TaskList.jsx`; measure departing slot `offsetHeight` in a layout effect when a move key first appears (per key); consume intents only when `phase !== 'loading'` and `revealedByRequestId != null` and `requestId >= revealedByRequestId`; apply `card-slot--entering` / `card-slot--growing` / empty `aria-hidden` `.card-ghost` with inline `--ghost-height` only (sole permitted inline style); call `onMotionSettled(key)` once when animation ends or immediately when nothing to play; card spacing via slot `margin-bottom`, not column `gap`
- [x] T032 [US5] Add the three `@keyframes` animations (180 ms) and reduced-motion overrides in `frontend/src/index.css` per `contracts/design-tokens.md`: `.card-slot--entering`, `.card-slot--growing`, `.card-ghost`; `@media (prefers-reduced-motion: reduce)` sets `animation: none` on entering/growing and `animation: none; display: none` on `.card-ghost`; **no other** `transition` or `animation` declarations anywhere in the stylesheet (including details, comments, skeletons, filter)

**Checkpoint**: All five stories independently functional; motion is quiet and intent-correct

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Regression lock, scope check, and quickstart alignment

- [x] T033 Update any remaining markup assertions in `frontend/src/components/__tests__/TaskCard.test.jsx`, `frontend/src/components/__tests__/TaskForm.test.jsx`, and `frontend/src/components/__tests__/StatusFilter.test.jsx` that must move with the refresh — keep behaviour assertions (`Assigned to Priya`, `Unassigned`, `Delete`, `Move to In Progress`, `💬` toggle) passing unmodified where the contract requires it
- [x] T034 Confirm `frontend/src/index.css` declares `transition`/`animation` only in the three motion rules, uses `opacity` only in the entrance keyframe and pre-existing `button:disabled`, and that no raw presentational hex appears outside token declarations
- [x] T035 Run `npm test -- --run` and `npm run lint` in `frontend/` and fix any failures caused by this feature; diff must not include `frontend/src/services/`, `frontend/src/constants.js`, backends, `database/`, or `frontend/package.json`
- [x] T036 Walk Gates 2–8 in `specs/002-board-ui-refresh/quickstart.md` against the running board (wide/narrow, cards, panel, light/dark, loading/empty/error, motion, behaviour unchanged) and resolve any gaps found in the five edited source files only

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **US1 (Phase 3)**: Depends on Foundational — MVP
- **US2 (Phase 4)**: Depends on Foundational; benefits from US1 column chrome but is independently testable at the card
- **US3 (Phase 5)**: Depends on Foundational; independently testable at the form panel
- **US4 (Phase 6)**: Depends on Foundational + US1 column shells (states render inside columns); tokens from Setup
- **US5 (Phase 7)**: Depends on Foundational + US1 card list structure; ideally after US2/US4 so measured ghosts include final card chrome
- **Polish (Phase 8)**: Depends on all stories intended for delivery

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependency on US2–US5
- **US2 (P2)**: After Foundational — independently testable via `TaskCard` tests
- **US3 (P2)**: After Foundational — independently testable via `TaskForm` tests
- **US4 (P3)**: After Foundational and US1 column structure
- **US5 (P3)**: After Foundational and US1 list/cards; sequential with other editors of `TaskList.jsx` / `BoardPage.jsx` / `index.css`

### Within Each User Story

- Tests written first and failing before implementation where listed
- Story implementation before moving to the next priority when staffing is single-threaded
- Shared files (`index.css`, `BoardPage.jsx`, `TaskList.jsx`, `TaskCard.jsx`, `TaskForm.jsx`) stay sequential

### Parallel Opportunities

- Phase 1: T001 → T002 → T003 are sequential (same `index.css`)
- Phase 2: T004 tests can start first; T005–T008 sequential on `BoardPage.jsx` / `TaskList.jsx`
- US1: T009 and T010 are `[P]` (different test files); T011–T014 sequential on shared implementation files
- US2: T015 → T016 → T017–T019 sequential (shared `TaskCard` test and source files)
- US3: T020 → T021 → T022 sequential
- US4: T023 and T024 are `[P]`; T025–T027 sequential
- US5: T028 and T029 are `[P]`; T030–T032 sequential
- After Foundational, US2 card work and US3 form work can proceed in parallel (different files: `TaskCard.jsx` vs `TaskForm.jsx`) if US1 has landed enough shared CSS that they do not both edit `index.css` at once — otherwise serialize CSS edits

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests in parallel (different files):
Task: "Add column/count/filter tests in frontend/src/components/__tests__/TaskList.test.jsx"
Task: "Extend header/count refresh tests in frontend/src/pages/__tests__/BoardPage.test.jsx"

# Implementation stays sequential (shared TaskList / index.css / BoardPage):
Task: "Render data-status columns with live counts in frontend/src/components/TaskList.jsx"
Task: "Style Kanban grid and accents in frontend/src/index.css"
Task: "Group header toolbar in frontend/src/pages/BoardPage.jsx"
```

## Parallel Example: User Stories 2 and 3 (after Foundational + US1 CSS baseline)

```bash
# Different components — safe in parallel if index.css ownership is assigned to one story at a time:
Task: "Export initialsOf + created formatter and chip markup in frontend/src/components/TaskCard.jsx"
Task: "Wrap create form in details/summary in frontend/src/components/TaskForm.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (tokens)
2. Complete Phase 2: Foundational (request-stamped board) — critical
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: wide/narrow columns, counts, accents, header grouping (`npm test -- --run` + quickstart Gate 2)
5. Demo MVP glanceable board

### Incremental Delivery

1. Setup + Foundational → coherent loads
2. US1 → MVP columns
3. US2 → scannable cards
4. US3 → collapsed create panel
5. US4 → dark/empty/loading polish
6. US5 → quiet motion
7. Polish → full quickstart Gates 1–8

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Then:
   - Developer A: US1 (then US4/US5 on `TaskList` / `BoardPage`)
   - Developer B: US2 (`TaskCard` + card CSS when `index.css` is free)
   - Developer C: US3 (`TaskForm` + panel CSS when `index.css` is free)
3. Serialize all `index.css` edits; never parallel-edit the five shared implementation files

---

## Notes

- `[P]` only when files differ and neither task edits `index.css` / `BoardPage.jsx` / `TaskList.jsx` / `TaskCard.jsx` / `TaskForm.jsx` in conflict
- Status strings and labels come only from `frontend/src/constants.js` or prop values; literals allowed only in `index.css` attribute selectors
- Constitution: components → pages → services layering; no `fetch`/axios outside `services/`
- Out of scope: drag-and-drop, theme switch, new endpoints, schema, backends, new npm dependencies
- Commit after each task or logical group when the implementer is asked to commit

---

## Phase 9: Convergence

**Purpose**: Close gaps found after verification against spec, plan, and contracts

- [x] T037 [US5] Fix reduced-motion intent settlement in `frontend/src/components/TaskList.jsx` per FR-018 / plan decision 17 / `contracts/component-contract.md` (partial): when `prefers-reduced-motion: reduce` applies `animation: none` (and `display: none` on `.card-ghost`), `animationend` never fires, so consumed create/move intents never call `onMotionSettled`, `pendingCreates`/`pendingMoves` accumulate, and `card-slot--entering` / `card-slot--growing` stay forever (clipping resting card shadows via `overflow: hidden`). After applying entering/growing/ghost, settle immediately when the computed animation will not run — e.g. `getComputedStyle` `animationName === 'none'` or ghost not displayed — without reading `matchMedia`. Clear local motion state the same way a normal `animationend` would. Extend `frontend/src/components/__tests__/TaskList.test.jsx` to cover create and move under forced `animation: none` / hidden ghost: `onMotionSettled` fires once per intent and motion classes/ghosts do not linger
