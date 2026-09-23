# UI Contract: Board Components

**Feature**: `specs/002-board-ui-refresh` | **Date**: 2026-09-22 | **Plan**: [../plan.md](../plan.md)

This is a **UI contract**, not an HTTP API. No endpoint is added or changed by this feature, and `src/services/` is not edited. What follows fixes the state ownership, props, rendered structure, and accessible names the refreshed board must expose, so tests and the UI verification pass have something exact to check.

Layering rule that applies throughout: `components/` receive data and callbacks as props and own no server state. Only `pages/BoardPage.jsx` holds server state and calls `services/`. No component calls `fetch` or axios. Local UI state derived from props — the existing `TaskForm` draft, `TaskList`'s in-flight ghosts — is permitted and is the pattern already used in this repo.

---

## `pages/BoardPage.jsx` (container — state, data, and intent)

**Unchanged responsibilities**: it is the only component that calls `taskService`, for list, create, update, delete, and all comment operations, and it re-fetches after each mutation.

### 1. The board state object

All list-related state is one value. There are no separate `filter`, `tasks`, `loading`, or `error` state variables.

```text
board = {
  requestId,   // integer, from a monotonic counter
  filter,      // 'all' | Status — the filter these fields describe
  phase,       // 'loading' | 'ready' | 'failed'
  tasks,       // Task[]
  error,       // string or null; non-null only when phase === 'failed'
}
```

`filter` lives inside the object, so the value shown in `StatusFilter` and the filter the tasks belong to are the same field and cannot disagree.

### 2. Starting a load

Every load — first mount, filter change, Refresh, and the re-fetch after create/move/delete — mints the next `requestId` and replaces **the whole object in one update**:

| Field | Value |
|---|---|
| `requestId` | the newly minted id |
| `filter` | the filter being requested |
| `phase` | `'loading'` |
| `error` | `null` |
| `tasks` | the previous `tasks` **if and only if** the previous `filter` is the filter now being requested; otherwise `[]` |

This single atomic update is normative. A filter change must not be expressible as two updates, because any intermediate render would pair the new filter with the previous filter's error or cards. The carry-over rule preserves the invariant **`board.tasks` always belongs to `board.filter`**, which is what lets `TaskList` trust the two props together.

### 3. Live state: the one write path and the one read path

`board` is written through a single helper, which updates a ref **synchronously** before queuing the render:

```text
commit(next)   →   boardRef.current = next ;  setBoard(next)
```

| Rule | Normative statement |
|---|---|
| R1 | Every write to `board` goes through `commit`. There is no other `setBoard` call site. |
| R2 | **Any code that runs after an `await` reads `boardRef.current`, never the `board` value captured in its closure.** This covers the filter to re-fetch, the id to arm an intent with, and the task list to patch a comment count into. |
| R3 | Rendering reads `board` from state. The ref is not read during render. |
| R4 | `beginLoad()` called with no filter argument resolves the filter from `boardRef.current.filter` *at the moment it is called*, mints the next id, `commit`s the §2 state, and **returns the minted id** to its caller. `beginLoad(nextFilter)` is used only by the filter `<select>`. |

R2 is the whole defence against stale-snapshot handlers, and it is reviewable by inspection: after any `await` in `BoardPage`, the identifier `board` must not appear.

### 4. Applying a completion

Success and failure both **write nothing unless `boardRef.current.requestId` still equals the id this completion belongs to**:

| Outcome | Applied state (only when the live `requestId` matches) |
|---|---|
| success | `{ ...live, phase: 'ready', tasks: fetched, error: null }` |
| failure | `{ ...live, phase: 'failed', error: <the existing message>, tasks: live.tasks }` |

Consequences that must hold:

- A superseded request can write **nothing** — not `tasks`, not `error`, not `phase`. When two filter loads overlap, the later-started one always wins regardless of which replies first.
- A double-invoked mount effect is harmless for the same reason.
- The guard reads the ref rather than the closure, so it is correct however long the reply took and however many renders have happened since.
- Cancellation is deliberately **not** used: adding an `AbortController` or cancel token would change `taskService` signatures, and that module is the shared seam in front of three interchangeable backends.

Comment-count updates map over `boardRef.current.tasks` and leave `requestId`, `filter`, and `phase` untouched, so they can never be mistaken for a load completing. If the task is no longer in the list, the map matches nothing and the board is unchanged.

### 5. Mutation handlers

Each handler keeps today's sequence — call the service, then re-fetch — and adds intent bookkeeping around it. **No handler passes a filter or a request id captured before its `await`.**

| Handler | Sequence |
|---|---|
| `handleCreate` | `await createTask(draft)` → raise a create intent for the returned task's id → `const id = beginLoad()` → arm the intent with `id` → run the load. |
| `handleAdvance` | Raise a move intent **synchronously, before any await** → `await updateTask(...)` → `const id = beginLoad()` → arm the intent with `id` → run the load. If `updateTask` rejects, **remove the intent** and let the rejection propagate exactly as it does today. |
| `handleDelete` | `await deleteTask(task.id)` → `beginLoad()` → run the load. No intent; deletes do not animate. |

Because `beginLoad()` takes no filter argument, all three re-fetch **the filter selected at the moment the mutation finished** (R4). A create begun under `todo` that resolves after the user has selected `done` therefore re-queries `done`, and `StatusFilter` stays on `done`.

### 6. Motion intents

`BoardPage` records what the user did. Both collections are keyed, so entries cannot overwrite one another.

| Collection | Entry | Key | Raised |
|---|---|---|---|
| `pendingCreates` | `{ key, taskId, revealedByRequestId }` | `create:{taskId}` | after `taskService.createTask` resolves, using the id of the task it returns |
| `pendingMoves` | `{ key, task, from, to, revealedByRequestId }` | `move:{taskId}:{from}` | **synchronously at the top of `handleAdvance`, before awaiting the update request** |

- `revealedByRequestId` starts as `null` and is set **once**, to the id `beginLoad()` returns for that handler's own follow-up load. It is never derived from a closure-captured `board`.
- An intent with `revealedByRequestId === null` is **inert**: `TaskList` may measure it (see below) but must not consume it. This is what stops an unrelated Refresh or filter change, landing while the mutation is still in flight, from consuming the intent against pre-mutation data.
- Keying moves by source status lets several different cards be mid-move at once, and lets the same card be moved twice in quick succession, without either intent clobbering the other.
- Raising the move intent **before** any `await` is required: `TaskList` measures the departing card on the render that first sees the intent, and the card must still be mounted then.
- Entries are removed **only** when `TaskList` calls `onMotionSettled(key)`, or when the handler's own mutation rejects before arming. Never on a timer started at signalling time, and never when an unrelated request completes.

### 7. Other changes

| Change | Detail |
|---|---|
| Header grouping | The `h1` "Engineering Task Board", the existing one-line context, and the toolbar (`StatusFilter` + Refresh) render inside the page header region. The filter and Refresh stay in one `toolbar` group. |
| State hand-off | `TaskList` is rendered unconditionally and receives `tasks`, `filter`, and `phase` — all read from the same `board` object in the same render, so they always describe one request. |
| Refresh signal | When `phase === 'loading'` **and** cards are on screen, a static `Refreshing…` label renders in the toolbar. Text only — no spinner, no animation. |
| Error | The existing error paragraph, with its existing text, renders above the board whenever `board.error` is set. |

**Must not change**: any `taskService` call or signature, the refresh-after-mutation behaviour, the error message text, or the comment state shape.

**Guaranteed output**:

- Exactly one `h1`, with the accessible name `Engineering Task Board`.
- A control with the accessible name `Refresh` that re-queries the current filter.
- A `<select>` with the accessible name `Filter by status`, whose value is `board.filter`.
- When `board.error` is set, the existing error text is present.

---

## `components/TaskList.jsx` (columns, board states, motion)

**Props**:

| Prop | Type | Required | Meaning |
|---|---|---|---|
| `tasks` | `Task[]` | yes | `board.tasks`. |
| `filter` | `'all' \| Status` | yes | `board.filter` — the filter `tasks` belongs to. |
| `phase` | `'loading' \| 'ready' \| 'failed'` | yes | **New.** Replaces the old `loading`/`error` booleans; impossible combinations are unrepresentable. |
| `requestId` | integer | yes | **New.** `board.requestId`, used to decide when an intent may be consumed. |
| `pendingCreates` | intent list | no (default empty) | **New.** The only trigger for the card-entrance animation. |
| `pendingMoves` | intent list | no (default empty) | **New.** The only trigger for column height motion. |
| `onMotionSettled` | `(key) => void` | no | **New.** Called once per intent, when its animation ends or immediately when there is nothing to play. |
| `onAdvance` | `(task, nextStatus) => void` | yes | Passed straight to each card. |
| `onDelete` | `(task) => void` | yes | Passed straight to each card. |
| `commentsByTask`, `expandedTaskId`, `onToggleComments`, `onPostComment`, `onDeleteComment`, `commentError` | as today | yes | Unchanged pass-through. |

### Visible columns

Computed once per render: `filter === 'all' ? STATUSES : [filter]`. **The same set is used in every state below.** A filtered board renders exactly one column while loading, while failed, and when ready — it never flashes three.

### Board state resolution

Exactly one state renders per pass. Because `tasks` is non-empty during a load only when it is a re-query of the same filter (see `BoardPage` §2), "nothing to show" is always a statement about the current request.

| # | Condition | Rendering |
|---|---|---|
| 1 | `phase === 'failed'` and `tasks` empty | Visible column shells. Each body reads **`Tasks unavailable`**. Counts **suppressed** — the heading shows the label only. No card, no skeleton, and **never** `No tasks yet`. |
| 2 | `phase === 'loading'` and `tasks` empty | Visible column shells with inert skeleton blocks (`aria-hidden`). Board carries `aria-busy="true"` and an accessible `Loading tasks…`. |
| 3 | `phase === 'loading'` and `tasks` present | The existing cards stay mounted and in place. Board carries `aria-busy="true"`. No skeleton, no unmount. |
| 4 | `phase === 'ready'` | Columns with cards; `No tasks yet` in any column that loaded and is empty. |

`phase === 'failed'` with cards present renders like row 4, plus `BoardPage`'s error paragraph. `No tasks yet` means "this column loaded and has nothing in it" and may never appear while state 1 applies.

### Guaranteed output

1. A board container with class `board`. `aria-busy="true"` in states 2 and 3; absent or `"false"` otherwise.
2. One `<section className="column" data-status={status}>` per visible status, in `STATUSES` order, each with `aria-label` equal to its `STATUS_LABELS` value. Column shells render in every state.
3. In states 3 and 4, each column contains exactly one `h2` whose accessible name includes the status label and the column's card count, e.g. `To Do (3)`. The count always equals the number of real cards rendered in that column — ghosts are never counted. Under a single-status filter the selected column still shows its own correct count.
4. A column with no cards in state 4 renders the text `No tasks yet`.
5. No board-level empty message exists. An empty board is three columns each reading `No tasks yet`.
6. `todo`, `in-progress`, and `done` never appear as string literals in this file — statuses and labels come from `src/constants.js` or arrive as prop values, and accents are selected downstream from `data-status`.

### Motion: when an intent may be consumed

Each card renders inside a `<div className="card-slot">` wrapper. **All motion comes from the two intent lists. `TaskList` never infers motion by comparing successive task lists.**

An intent is consumed on the first render where **all three** hold:

- `phase !== 'loading'` (the board has settled),
- `intent.revealedByRequestId !== null` (the action's own follow-up load has started), and
- `requestId >= intent.revealedByRequestId` (this data is from that load, or from one that superseded it).

All three are required. The first stops an intent being judged mid-flight. The second and third stop it being judged against data that predates the action — including data from an *unrelated* load, such as a Refresh pressed while the mutation was still in flight, which would otherwise look "newer" and consume the intent early. Together they mean an intent **waits indefinitely for a slow request**; nothing is ever dropped because time passed.

Measurement is separate from consumption: a move's height is read on the render where its key first appears, armed or not, because that is the last render on which the departing card is guaranteed to be mounted.

At consumption:

| Intent | Condition | Result |
|---|---|---|
| create | `taskId` is present in `tasks` | `card-slot--entering` on that slot |
| create | `taskId` absent (filtered out, or the load failed) | nothing to play → settle immediately |
| move | column `to` is visible and holds the card | `card-slot--growing` on that slot |
| move | column `from` is visible and no real card with that id remains in it | a ghost in column `from` |
| move | column `from` not visible, `phase === 'failed'`, or the card is still in `from` | nothing to play → settle immediately |

`onMotionSettled(key)` is called exactly once per intent: when its animation ends, or in an effect on the consumption render when there was nothing to play. It is never called during render.

| Class | Animates |
|---|---|
| `card-slot--entering` | fade, 4 px rise, `grid-template-rows 0fr → 1fr`, `margin-bottom 0 → --space-2` |
| `card-slot--growing` | `grid-template-rows 0fr → 1fr`, `margin-bottom 0 → --space-2` (no fade or rise — those stay exclusive to newly created cards) |

Consequences that must hold:

- A task that appears only because a refresh discovered it — created by someone else, or newly matching the filter — has no intent and **does not animate**.
- A filter change, a plain refresh, a delete, a comment toggle, and a panel expand record no intent and therefore produce no motion at all.
- An animation's 180 ms lifetime starts **at consumption**, not when the intent was raised.

### The leaving ghost

| Requirement | Detail |
|---|---|
| Height | Exactly the height the departing card had. `TaskList` reads `offsetHeight` from that card's slot in a **layout effect on the render where the move's key first appears in `pendingMoves`** — the card is still mounted then — and stores it **per move key**, so concurrent pending moves each keep their own measurement. |
| Delivery | The stored value is passed to the ghost as an inline CSS custom property. This is the one permitted inline style: a stylesheet cannot hold a runtime measurement. |
| Content | **None.** No `data-testid`, no `<button>`, no heading, no text. It is an empty block. |
| Semantics | `aria-hidden="true"` and non-interactive (`inert` or equivalent). Excluded from the column's card count. |
| Ownership | Once running, a ghost belongs to `TaskList` and finishes independently of `pendingMoves`. A later move of the same card starts a second ghost under its own key and **cannot truncate one already in progress**. |
| Animation | `height` from the measured value to 0, and `margin-bottom` to 0, so the column eases down with no residual gap. |
| Lifetime | Unmounted when its 180 ms cycle ends, at which point `onMotionSettled` fires for that key. Timers are cleared on unmount. |

Why it has no content: the real card may be mounted in the destination column at the same moment, so a content-bearing clone would duplicate `task-{id}`, the `Delete` button, and the card heading, breaking `getByTestId`/`getByRole` and confusing assistive technology. Why it is measured rather than rebuilt: a static rebuild is shorter than a card whose comment thread was open, and the column would jump by that difference the instant the ghost appeared.

**Filtered boards**: under a single-status filter the API returns only that status, so a moved card vanishes from the response entirely — indistinguishable from a delete by inspection of the data. The intent names `from` outright, so the ghost still renders and the selected column still eases down. The destination column is not visible in that case, so no `card-slot--growing` is applied.

---

## `components/TaskCard.jsx` (card)

**Props**: unchanged from today (`task`, `onAdvance`, `onDelete`, `comments`, `commentsOpen`, `onToggleComments`, `onPostComment`, `onDeleteComment`, `commentError`). No prop is added, removed, or renamed.

**New exported helpers** (exported so they can be unit-tested directly):

| Export | Signature | Contract |
|---|---|---|
| `initialsOf` | `(name) => string` | `''` for null/undefined/blank; first letter for one word; first letters of the first two words for two or more; always uppercase; whitespace runs collapsed. |
| *created-line formatter* | `(iso, now = new Date()) => string` | Returns `''` for missing or unparseable input. Otherwise the exact strings in [../data-model.md](../data-model.md): `Created just now`, `Created 1 minute ago`, `Created N minutes ago`, `Created 1 hour ago`, `Created N hours ago`, `Created 1 day ago`, `Created N days ago`, or `Created 12 Aug 2026` beyond 30 days. A future timestamp returns `Created just now`. `now` is injectable so every boundary is testable. |

**`formatApproximateTime` is unchanged** and remains the formatter for comment timestamps. The new formatter is never applied to comments.

**Guaranteed output**:

1. An `<article className="card">` keeping the existing `data-testid={`task-${id}`}`.
2. Exactly one `h3` containing the title. Long titles wrap; the title is never truncated.
3. The description paragraph renders only when `description` is set, as today.
4. Assignee: a chip element containing the initials, marked `aria-hidden="true"`, paired with a visually hidden element whose text is `Assigned to {assignee}` or `Unassigned`. **`getByText('Assigned to Priya')` and `getByText('Unassigned')` must keep working** — this is the regression guard for FR-007.
5. Created line: when the formatter returns a non-empty string, a muted `<time dateTime={iso}>` containing exactly that string. When it returns `''`, no element is rendered at all.
6. Actions, with these accessible names unchanged: `Move to {next label}` (absent for `done`), `Delete`, and the comment toggle `💬` or `💬 {count}` with `aria-expanded`.
7. Move and Delete are **always in the DOM and always in the tab order**, in every state — never `display: none`, never `visibility: hidden`, never `aria-hidden`, never `disabled`.
8. The quiet state is produced by colour, **not by `opacity`**. Both actions use `--text-muted` when the card is at rest, and resolve to `--text` (Move, on a `--surface-muted` fill) and `--danger` (Delete) on `:hover`, `:focus-within`, and under `@media (hover: none)`. Every one of those resting states clears 4.5:1 against the card surface in both appearances.
9. Delete is visually secondary to Move in both states — lower weight, no border, no fill — while remaining a real button with the same accessible name.
10. The comment thread — toggle, count, oldest-first order, post, delete, and error text — behaves exactly as it does today, with no animation on open or close.

---

## `components/TaskForm.jsx` (collapsible create panel)

**Props**: unchanged (`onCreate`). Internal draft state and submit logic are unchanged.

**Guaranteed output**:

1. The form is wrapped in a native `<details className="panel">` with a `<summary>` whose accessible name is `Add a task`.
2. The `<details>` has no `open` attribute at mount, so every visit starts collapsed.
3. Expanding reveals the same three fields with the same labels as today: `Title`, `Description`, `Assignee`, plus the submit control (`Add task`, `Adding…` while submitting, disabled until the title has a non-blank value).
4. Collapsing and re-expanding within the same visit preserves a partially typed draft, because `<details>` keeps its content mounted and the component is not unmounted.
5. A successful create clears all three fields (existing `setForm(EMPTY)` behaviour).
6. Nothing about the open state or the draft is written to `sessionStorage`, `localStorage`, a cookie, or the URL.
7. The panel does not auto-collapse on success, and the disclosure itself is not animated.
8. The `<summary>` is a disclosure control, not a heading, so the page heading order stays `h1` → `h2` → `h3`.

---

## `components/StatusFilter.jsx`

Unchanged in every respect: same props, same `aria-label` (`Filter by status`), same `All` plus `STATUS_LABELS` options. Its `value` is now `board.filter` and its `onChange` starts a new load; both are invisible to this component.

---

## Cross-cutting contract

| Concern | Contract |
|---|---|
| State coherence | `tasks`, `filter`, `phase`, `error`, and `requestId` are fields of one object and are always read together in one render. No render can pair one request's data with another's filter, error, or phase. |
| Headings | Exactly one `h1` (page title), one `h2` per visible column, one `h3` per real card. Ghosts contribute no heading, because they contribute no content. No level is skipped. |
| Focus | Every interactive control shows a visible focus indicator on `:focus-visible` using the focus token. No rule sets `outline: none` without an equivalent replacement. |
| Contrast | Every enabled text/control **resting** state clears 4.5:1 against its own background in both appearances, as a composited value. |
| `opacity` | Must not be used to de-emphasise any enabled control or text at rest. Two uses are permitted and expected: the card-entrance keyframe animating `0 → 1` within 180 ms, and the pre-existing `button:disabled` rule. Testable form: once animation has settled, no enabled control or text has a computed opacity below 1. |
| Colour | Every visible colour resolves to a token from [design-tokens.md](./design-tokens.md). No raw hex or named colour appears outside the token declarations in `index.css`. |
| Appearance | Light and dark come solely from `prefers-color-scheme`. No control anywhere on the page selects a theme. |
| Motion | Only the three animations above exist, each 180 ms measured from consumption, each applied to an individual element by class and never to `.card` or `.card-slot` generally. Nothing else in `index.css` declares `transition` or `animation`. |
| Reduced motion | One `@media (prefers-reduced-motion: reduce)` block sets `animation: none` on the entering and growing slots and `animation: none; display: none` on the ghost, so the ghost never appears instead of lingering and then jumping. Intents still settle normally. No JavaScript reads `matchMedia`. |
| Inline styles | Permitted for exactly one thing: the ghost's measured height, passed as a CSS custom property. No presentational constant may be inlined. |
| Status strings | `todo`, `in-progress`, `done` and their labels appear in components only via `src/constants.js` or as prop values passed through. Literals are permitted only in `index.css` attribute selectors. |
| Styling location | All CSS lives in `frontend/src/index.css`. No CSS module, no CSS framework or styling library, no new dependency. |
