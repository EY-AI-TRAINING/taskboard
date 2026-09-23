# Implementation Plan: Board UI Refresh

**Branch**: `feat/board-ui-refresh` (feature directory `002-board-ui-refresh`) | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-board-ui-refresh/spec.md`

## Summary

Refresh the presentation of the existing task board so three status columns (To Do, In Progress, Done) are always visible with live counts and distinct header accents, cards read cleanly (initials chip, relative created line, quiet Move/Delete), the create form moves into a collapsed panel, and the page follows the operating system's light or dark appearance. Behaviour is unchanged: no new stored fields, no API change, no backend change.

Technical approach: edit the four existing React components plus `frontend/src/index.css`. All colour, type, spacing, radius, and shadow values become CSS custom properties defined once on `:root` and re-pointed inside a single `@media (prefers-color-scheme: dark)` block, so dark mode needs no state, no switch, and no JavaScript. The collapsible create panel uses a native `<details>`/`<summary>` element, which keeps `TaskForm`'s draft mounted while collapsed. Column accents are selected in CSS via a `data-status` attribute so no status string is hard-coded in a component.

Two pieces of the design are about correctness under a slow or racing network rather than about looks, and they share one mechanism — a **request sequence number**. The board's filter, phase, tasks, and error move into a single state object stamped with the id of the request that produced them, so a late reply from a superseded request can never overwrite the current one, and switching filters establishes the new pending state in one atomic update. Motion is then driven by **intents** that `BoardPage` records for the create and move the user actually performed; each intent names the follow-up request that will reveal its change and waits, however long that request takes, for a render that can consume it. Both mechanisms depend on a third rule: asynchronous code in `BoardPage` reads the board through a ref that the single write path keeps current, never through the value its closure captured, so a mutation that finishes after the user has changed filters refreshes the filter now selected rather than the one that was selected when it started.

## Technical Context

**Language/Version**: JavaScript (ES2022), React 19, JSX. No TypeScript in this project.

**Primary Dependencies**: react 19, react-dom 19, react-router-dom 7, axios (already used only inside `services/`). Vite 8 build. **No new dependency is added by this feature** — in particular no component library, CSS framework, CSS-in-JS library, animation library, or data-fetching library.

**Storage**: N/A for this feature. Task and comment data continue to come from the existing REST API; `database/schema.sql` is not touched. The new state is all local and transient: the create panel's open flag and the existing form draft in `TaskForm`; in `BoardPage` a single request-stamped `board` object, a ref mirroring it for asynchronous reads, a request counter, and two keyed maps of pending motion intents; in `TaskList` the in-flight ghosts, their measured heights, and the timers that end them. None of it is persisted and none of it outlives the current visit.

**Testing**: Vitest + Testing Library (`cd frontend && npm test -- --run`), jsdom environment, existing `src/setupTests.js`. Race and timing behaviour is covered with deferred service mocks and fake timers.

**Target Platform**: Modern evergreen desktop browsers rendering the Vite dev/preview build — current Chrome, Edge, Firefox, and Safari. Layout must hold from roughly 360 px wide upward. Every motion mechanism chosen here is supported across all four (see [research.md](./research.md) R-008); nothing depends on a Chromium-only capability.

**Project Type**: Web application; this feature touches the frontend only.

**Performance Goals**: Each permitted animation runs for 180 ms, inside the 300 ms limit, and that clock starts when the animation starts — never when the intent was raised. Loading must be recognisable as busy within one second of opening. The only layout measurement in the feature is one `offsetHeight` read per move.

**Constraints**:

- Presentation only. No new stored fields, no new or changed endpoints, no backend edit, no `database/schema.sql` edit, and **no change to `src/services/`** — the race fix is implemented in the page layer, not by adding cancellation to the service API.
- All styling stays in plain CSS in `frontend/src/index.css` (constitution: Simplicity; Frontend styling). The one permitted inline style is a measured pixel value that cannot exist in a stylesheet.
- Frontend layering holds: `components/` presentational → `pages/` state and fetching → `services/` HTTP. No component or page calls `fetch` or axios.
- Status values and column labels come from `src/constants.js`; components must not hard-code `todo` / `in-progress` / `done` or their labels.
- WCAG AA text contrast in both light and dark appearance, in **every** resting state including the quiet card actions; visible focus on every interactive control; heading order `h1` → `h2` → `h3`.
- `prefers-reduced-motion: reduce` removes all animation, with no delayed jump left behind.
- Out of scope: drag-and-drop, a theme switch, real avatars, adding/renaming/reordering columns.

**Scale/Scope**: One page, five files edited (`pages/BoardPage.jsx`, `components/TaskList.jsx`, `components/TaskCard.jsx`, `components/TaskForm.jsx`, `index.css`), three columns, tens of cards per column in normal use. No new source files are required; test files are added or updated under the existing `__tests__` directories.

No unresolved clarifications remain. Every open question from the spec was answered in [research.md](./research.md).

## Constitution Check

*GATE: evaluated before Phase 0 research and re-evaluated after Phase 1 design.*

| Principle | Gate for this feature | Verdict |
|---|---|---|
| I. Layered Architecture (NON-NEGOTIABLE) | `BoardPage` keeps all server state and every `taskService` call; `services/` keeps all HTTP; no component or page calls `fetch` or axios. Request sequencing, live-state reads, and motion intents are facts about requests and actions `BoardPage` itself owns, so they live in the page layer and travel downward as props; the ref mirroring `board` is ordinary page-local state and is never handed to a component. Components stay presentational in the constitution's sense: they receive data and callbacks and own no server state. The local UI state they hold — the existing `TaskForm` draft, `TaskList`'s in-flight ghosts and their measured heights — is derived from props and follows the pattern `TaskForm` already establishes. `TaskList` reports back through one ordinary callback prop. | PASS |
| II. Shared REST Contract | No request or response shape changes, and `src/services/` is not edited. `handleCreate` starts using the created task that `taskService.createTask` already returns and today discards — a consumption change, not a contract change. Stale replies are discarded in the page rather than by adding abort signals to the service API, so the service surface stays identical for all three backends. The card reads the created timestamp through a helper accepting both `created_at` and `createdAt`. `VITE_API_BASE_URL` is untouched. | PASS |
| III. Test-First Endpoints (NON-NEGOTIABLE) | No endpoint is added or changed, so the endpoint-test rule has nothing to trigger on. The frontend gate still applies: every behaviour added here gets a Vitest + Testing Library test before the change is considered done, using existing fixtures and a mocked service — no real database, no real HTTP. | PASS |
| IV. Single Schema Ownership | `database/schema.sql` is not edited. No migration tooling, no `create_all`, no `ddl-auto`. No client-set timestamps: the created line only reads the value the database already set. | PASS |
| V. Simplicity | No new source file is created — the four existing components and `index.css` are edited in place, in their existing style, without reformatting untouched lines. No CSS framework, styling library, or data-fetching library. No new statuses, no new status codes, no features beyond the spec. The sequence number is one integer and replaces what would otherwise be several interacting flags. | PASS |
| Error Contract & Domain Constraints | `STATUSES` and `STATUS_LABELS` remain the only source of status strings and labels in components; accents are chosen by a `data-status` attribute, and status values reach components only as prop values, so the literals appear only in `index.css` selectors. The existing error text and the 404/422 contract are untouched. No `.env*` file, environment variable, or secret is read. | PASS |
| Quality Gates | `cd frontend && npm test -- --run` must pass. Test stack stays Vitest + Testing Library. | PASS |

**Post-design re-check**: re-evaluated after [data-model.md](./data-model.md), [contracts/](./contracts/), and [quickstart.md](./quickstart.md) were written. No design decision introduces a layer skip, a schema edit, a contract change, a new dependency, or a hard-coded status string. All gates still PASS, so the Complexity Tracking table stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-board-ui-refresh/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── component-contract.md
│   └── design-tokens.md
├── checklists/
│   └── requirements.md  # Existing spec-quality checklist
├── spec.md
└── tasks.md             # Created later by /speckit-tasks, not by this command
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── StatusFilter.jsx       # unchanged behaviour; restyled via index.css
│   │   ├── TaskCard.jsx           # EDIT: initials chip, created line, quiet actions
│   │   ├── TaskForm.jsx           # EDIT: wrap in a collapsible <details> panel
│   │   ├── TaskList.jsx           # EDIT: counts, board states, intent-driven motion
│   │   └── __tests__/             # EDIT/ADD: TaskCard, TaskForm, TaskList tests
│   ├── pages/
│   │   └── BoardPage.jsx          # EDIT: request-stamped board state, motion intents, header
│   ├── services/                  # UNCHANGED
│   ├── constants.js               # UNCHANGED — still the only source of status strings
│   └── index.css                  # EDIT: design tokens, layout, dark mode, motion
└── (vite config, package.json)    # UNCHANGED — no new dependency

backend-dotnet/, backend-python/, backend-java/, database/   # UNTOUCHED
```

**Structure Decision**: Existing web-application layout, frontend only. The feature is presentation-only, so it stays inside `frontend/src/` and respects the `components/` → `pages/` → `services/` layering already in place. No new component file is introduced: `TaskList.jsx` already owns the column loop, `TaskCard.jsx` already owns the card, and `TaskForm.jsx` already owns the create form and its draft state, so each new responsibility lands in the file that already holds the neighbouring concern. `BoardPage.jsx` remains the only component that talks to `services/`.

## Design Decisions Carried into Implementation

These are the decisions the tasks phase must not re-open. Full reasoning and alternatives are in [research.md](./research.md).

1. **Tokens first.** Define every colour, type size, space step, radius, and shadow as a CSS custom property on `:root` in `index.css`, then re-point only the colour tokens inside one `@media (prefers-color-scheme: dark)` block. Component rules reference tokens, never raw values.
2. **No theme switch.** Dark mode is `prefers-color-scheme` plus `color-scheme: light dark` on `:root` so native form controls and scrollbars follow too. No toggle, no stored preference, no JavaScript.
3. **Accents by attribute.** `TaskList` renders each column with `data-status={status}` taken from `STATUSES`. `index.css` maps `[data-status="todo"]` and siblings to accent tokens. Status remains identifiable by its text label; colour is never the only signal.
4. **Counts are derived.** The count is `columnTasks.length`, computed where the column is rendered, so it is correct by construction after any create, move, or delete refresh. No separate count state, and leaving ghosts never count.
5. **Accessible name preserved.** The initials chip is `aria-hidden`, paired with a visually hidden span carrying `Assigned to {name}` or `Unassigned`. This keeps the existing accessible text (and the existing `TaskCard` assertion) intact while the visible element becomes a chip.
6. **Two time formatters, not one.** `formatApproximateTime` stays exactly as it is for comment timestamps. A new exported helper formats the card's created line with the spec's phrasing and boundaries, taking `now` as an injectable parameter. Comment behaviour is untouched.
7. **Native disclosure.** The create panel is `<details class="panel">` + `<summary>` inside `TaskForm.jsx`. The form stays mounted while collapsed, so the draft survives collapse/expand; nothing is persisted, so a reload starts collapsed and empty. The disclosure is not animated.

### The board's state is one object, stamped with the request that produced it

8. **`BoardPage` holds a single `board` object — `{ requestId, filter, phase, tasks, error }` — and nothing else about the list.** `phase` is `loading`, `ready`, or `failed`. `filter` lives inside it, so the filter shown in the `<select>` and the filter the tasks belong to are the same value and cannot disagree. Every transition replaces the whole object in one update, which is what makes a filter switch atomic: the new filter, the cleared tasks, the cleared error, and `phase: 'loading'` all land together, so there is no render in which the previous filter's error is still set while the new filter is displayed.
9. **A monotonic request id makes stale replies inert.** Starting a load mints the next id and stamps it onto the pending state. Every completion — success or failure — writes **nothing** unless the live `requestId` still equals the id that completion belongs to. A superseded request therefore cannot touch `tasks`, `error`, or `phase`, so the older of two overlapping filter loads can never win, and a double-invoked effect is harmless. This replaces cancellation: `src/services/` keeps its current signatures, which matters because the service surface is shared by three backends.
10. **Only a re-query of the same filter keeps its cards.** When a load starts, the pending state keeps the existing `tasks` if and only if the previous state's filter is the one now being requested; otherwise it starts empty. Since tasks are only ever written by a completion for that same filter, this preserves the invariant that `board.tasks` always belongs to `board.filter`. It produces all four board states without any further flags, and it makes "nothing to show" always a statement about the current request.
11. **After an `await`, state is read from a ref — never from the closure.** Sequencing fixes late *replies*; it does nothing for late *handlers*. A mutation handler that resumes after its request holds the `board` value from the render that ran the click, which may be several requests old. So `board` gets one write path, `commit(next)`, which assigns `boardRef.current = next` **synchronously** before calling `setBoard`, and one read path for asynchronous code: `boardRef.current`. Rendering still reads `board` from state. The rule is short enough to review by inspection — *after any `await` in `BoardPage`, the identifier `board` must not appear* — and it closes three separate holes:
    - **the post-mutation refresh targets the live filter.** `beginLoad()` takes no filter argument and resolves it from `boardRef.current.filter` at the moment it is called. A create begun under To Do that lands after the user has selected Done re-queries **Done**, and the `<select>` stays on Done. Sequencing alone could not fix this, because that request is genuinely the newest and its reply is legitimately accepted — the defect was choosing the wrong filter, not accepting the wrong reply.
    - **a motion intent is armed with the live id.** `beginLoad()` returns the id it minted, and that value — not a captured one — arms the intent, so the create started under one filter still animates in under the filter the user has since chosen, instead of being armed against a request that has already settled and discarded on sight.
    - **a comment count patches the live list**, so a count arriving after a filter change cannot resurrect the previous filter's cards; if the task is gone, the map matches nothing.

### Motion is intent-driven, and each intent waits for the render that can consume it

12. **Motion comes from recorded intents, never from a list diff.** A diff cannot tell a created task from one a refresh happened to discover, and under a single-status filter a moved task simply disappears from the response, which is indistinguishable from a deletion. `BoardPage` therefore records what the user did:
    - `pendingCreates` — keyed by task id, added after `taskService.createTask` resolves, using the id of the task it returns (today discarded).
    - `pendingMoves` — keyed by `(task id, from)`, added **synchronously at the top of `handleAdvance`**, before the request, carrying `{ task, from, to }`. Keying by source status means several different cards, and the same card moved twice in quick succession, can all be pending at once without overwriting one another.
13. **An intent waits for its own refresh, not merely for a newer one.** Each intent carries `revealedByRequestId`, `null` until the handler's own follow-up load starts and then set to that load's minted id (decision 11). `TaskList` consumes an intent on the first render where `phase` is settled (`ready` or `failed`), the intent is armed, and `board.requestId` is **at least** that id. Waiting on the raise-time id instead would break on an ordinary sequence: press Refresh while a move's `PUT` is in flight, and that unrelated load settles first with the card still in its source column, so the intent resolves to "nothing to play" and the collapse is lost. An armed intent simply waits, however long the request takes, and can never be judged against data that predates the action. If the mutation itself rejects, its handler removes the intent before the error propagates, so nothing is left unarmed. Consumption either starts an animation or resolves to nothing:
    - a create whose id is present → entrance animation; absent (filtered out, or the load failed) → nothing to play;
    - a move whose source column is visible and whose card has gone from it → ghost; source column not visible, load failed, or the card still there → nothing to play.

    `TaskList` reports each consumed intent back through one `onMotionSettled(key)` callback, and `BoardPage` drops it then — when the animation ends, or immediately when there was nothing to play. No intent is ever discarded on a timer started at signalling time, and none can accumulate.
14. **An animation's 180 ms lifetime starts at consumption.** Once a ghost is running it belongs to `TaskList` and finishes independently of the intent map, so a later move of the same card cannot cut short a collapse already in progress.
15. **The ghost preserves the departing card's exact height, per pending move.** When a new key appears in `pendingMoves`, `TaskList` reads `offsetHeight` from that card's slot in a **layout effect on that same render**, whether or not the intent is armed yet — the card is still mounted, because the intent was raised synchronously before any await — and stores the value under that move's key. Measurement is deliberately earlier than consumption: the first needs the card present, the second needs the refreshed data. Concurrent pending moves therefore each keep their own measurement. The ghost itself is an empty `aria-hidden`, non-interactive block of exactly that height: no `data-testid`, no buttons, no heading. A ghost rebuilt from static markup would be shorter than a card whose comment thread was open, and the column would jump by that difference. The measured value travels as an inline CSS custom property, the single permitted inline style, because a stylesheet cannot hold a runtime measurement.
16. **Card spacing lives on the slot, not on the column's `gap`.** A zero-height ghost inside a `gap`-spaced column would still occupy one gap and leave a residual jump when it unmounts. Each slot carries its own `margin-bottom`, which every keyframe animates alongside the height. The `gap` between *columns* on `.board` is unaffected.
17. **Reduced motion is handled in CSS alone.** One `@media (prefers-reduced-motion: reduce)` block sets `animation: none` on the entering and growing slots and `animation: none; display: none` on the ghost, so the ghost never appears rather than lingering at full height and jumping when its timer expires. Intents still settle normally, so nothing accumulates. No JavaScript reads `matchMedia`.

### Presentation

18. **The visible column set is computed once from the filter and used by every state.** `all` gives three columns, any other value gives exactly one, and loading and failed states use that same set — a filtered board never flashes three columns.
19. **A failed load never renders as an empty board.** In the failed state with nothing to show, the visible column shells read `Tasks unavailable` with counts suppressed; `No tasks yet` is reserved for a column that genuinely loaded empty. The existing error paragraph still appears, unchanged. A failed refresh with cards on screen keeps the cards and only adds the message.
20. **Quiet, never faded.** Move and Delete are quietened with an explicit colour token, not with `opacity`, so the stated contrast ratios are the composited ratios. At rest both use `--text-muted` on the card surface (6.3:1 light, 6.6:1 dark) and are told apart by weight and border; on hover, `:focus-within`, and under `@media (hover: none)`, Move resolves to `--text` on a subtle fill and Delete to `--danger`. The buttons stay in the DOM and in the tab order in every state. **The rule is about de-emphasis, not about the property**: `opacity` may not dim any enabled control or text at rest, but the card-entrance keyframe legitimately animates `opacity` from 0 to 1 within 180 ms, and the pre-existing `button:disabled { opacity: .5 }` stays (WCAG exempts disabled controls).

## Tests This Feature Must Land

Added or updated under `frontend/src/components/__tests__/` before the change is done. Race and timing cases use deferred service mocks (a promise the test resolves by hand) and fake timers.

- **Initials**: one word, two words, three or more words, extra spaces, empty/missing assignee; and that `Assigned to {full name}` / `Unassigned` is still reachable by accessible text.
- **Created line**: each boundary (just now, 1 minute, N minutes, 1 hour, N hours, 1 day, N days, older than 30 days as a calendar date), plus missing/invalid and a future timestamp, all with an injected `now` — the only practical way to reach the hour, day, and 30-day boundaries.
- **Columns and counts**: three columns in order with counts for `all`; exactly one column when filtered, with its own correct count; `No tasks yet` in a column that loaded empty; no board-level empty message.
- **Board states**, asserted against the filtered column set as well as `all`: skeleton only when loading with nothing to show; cards left mounted when re-querying the same filter; `Tasks unavailable` with counts suppressed when the request failed with nothing to show; `No tasks yet` never rendered in the failed state.
- **Request sequencing**:
  - start a load for filter A, switch to filter B, then resolve A **after** B — the board must still show B's data and B's single column, and A's reply must change nothing;
  - resolve A with an error after B has already succeeded — no error message and no `Tasks unavailable` appears;
  - fail a load for filter A, then switch to filter B — there must be no render in which B's column shows A's error state; the board goes straight to B's pending state.
- **Deferred mutation across a filter change** (the closure-snapshot case, decision 11) — start a create while filter A is selected, hold the create promise, switch to filter B and let B's load settle, then resolve the create:
  - the refresh the handler issues asks `taskService` for **B**, never A;
  - the `<select>` still reads B and the board still shows B's single column when everything has settled;
  - the create intent is **retained, not discarded**: with the new task inside B's refreshed results, the entrance animation still plays on its card;
  - the same test with the new task outside B's results settles the intent with no animation and leaves no pending entry;
  - the move equivalent: begin a move under A, switch to B, resolve the update — the refresh targets B and the ghost logic runs against B's data.
  - press Refresh while a move's update request is still in flight — that unrelated load must **not** consume the intent, and the ghost still plays when the move's own refresh lands.
  - a mutation that rejects removes its own intent and leaves nothing pending, and the rejection still surfaces as it does today.
- **Motion by intent**:
  - the entrance plays for an id in `pendingCreates` and **does not** play for an id that merely appears in a refreshed list;
  - with a deliberately slow refresh, the intent survives until the new data lands and the animation still plays — nothing is dropped by elapsed time alone;
  - a move with `filter === 'all'` grows the destination and leaves a ghost in the source column;
  - a move under a **single-status filter**, where the moved task is absent from the refreshed list, still leaves a ghost in the selected column;
  - two different cards moved before either refresh completes each get their own ghost at their own measured height;
  - the same card moved twice in quick succession keeps the first collapse running to completion;
  - an intent that resolves to nothing (create filtered out, source column not visible, load failed) settles immediately and is dropped, leaving no pending entry and no ghost;
  - the ghost has no `data-testid`, no button, and no heading, and is excluded from the column count;
  - a delete, a filter change, and an unchanged refresh produce no motion class and no ghost.
- **Create panel**: starts collapsed, expands to the same three fields, keeps a partial draft across collapse/expand, clears after a successful create.
- Existing `TaskCard`, `TaskForm`, and `StatusFilter` tests continue to pass; any assertion that must change is updated in the same change, not deleted.

## Complexity Tracking

> No constitution violations. This table is intentionally empty.
