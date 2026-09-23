# Phase 0 Research: Board UI Refresh

**Feature**: `specs/002-board-ui-refresh` | **Date**: 2026-09-22 | **Plan**: [plan.md](./plan.md)

Purpose: resolve every open technical question raised by [spec.md](./spec.md) so the Technical Context in the plan carries no unresolved clarification. The spec left exact hues, exact markup, and exact mechanisms to planning; everything below closes one of those gaps.

---

## R-001: Dark appearance with no theme switch (FR-013)

**Decision**: Define all colour values as CSS custom properties on `:root` in `frontend/src/index.css`, then re-point only those properties inside a single `@media (prefers-color-scheme: dark)` block. Also set `color-scheme: light dark` on `:root`.

**Rationale**: The spec forbids a theme control, so the appearance is a pure media query and needs no state, no storage, and no JavaScript — which keeps `components/` presentational and adds nothing to `pages/`. Re-pointing tokens in one block means a rule written once (`color: var(--text)`) is correct in both appearances, so there is no second stylesheet to keep in sync. `color-scheme: light dark` makes the native `<select>` in `StatusFilter`, the `<input>`/`<textarea>` in the forms, scrollbars, and the default focus ring follow the system appearance too; without it those controls stay light-painted on a dark page and fail contrast in a way CSS colours alone cannot fix.

**Alternatives considered**:

- A `data-theme` attribute toggled in React — rejected: the spec explicitly forbids a theme switch, and it would push presentation state into a page component for no user-visible gain.
- A separate `dark.css` — rejected: duplicates every rule and violates Simplicity; styling must stay in the existing `index.css`.
- `light-dark()` colour function per declaration — rejected: it spreads the palette across every rule instead of concentrating it in one token block, which makes FR-016's "one palette" hard to verify.

---

## R-002: The palette, and proving WCAG AA (FR-004, FR-013, FR-016, SC-004)

**Decision**: Adopt this token set. Contrast ratios below are computed against the surface each token actually sits on, with **no `opacity` in the chain at rest** (see R-009), so the stated ratio is the composited ratio.

Light appearance:

| Token | Value | Sits on | Contrast |
|---|---|---|---|
| `--bg` | `#f4f5f7` | page | surface |
| `--surface` | `#ffffff` | cards, panel | surface |
| `--surface-muted` | `#ebecf0` | column body, quiet-control fill | surface |
| `--text` | `#172b4d` | `--surface` | 14.1:1 |
| `--text-muted` | `#52607a` | `--surface` / `--surface-muted` | 6.3:1 / 5.4:1 |
| `--border` | `#d5d9e0` | divider, control border | non-text |
| `--danger` | `#b3261e` | `--surface` | 6.5:1 |
| `--danger-surface` | `#ffebe6` | error message background | surface |
| `--focus` | `#0b5fd0` | ring colour | non-text, ≥3:1 |

Dark appearance:

| Token | Value | Sits on | Contrast |
|---|---|---|---|
| `--bg` | `#12151c` | page | surface |
| `--surface` | `#1b202b` | cards, panel | surface |
| `--surface-muted` | `#161b24` | column body, quiet-control fill | surface |
| `--text` | `#e6eaf2` | `--surface` | 13.3:1 |
| `--text-muted` | `#9aa6bd` | `--surface` | 6.6:1 |
| `--border` | `#2b3444` | divider, control border | non-text |
| `--danger` | `#ffa39e` | `--surface` | 8.4:1 |
| `--danger-surface` | `#2a1614` | error message background | surface |
| `--focus` | `#8ab4ff` | ring colour | non-text, ≥3:1 |

Column accents — the accent is carried by a tinted header background plus a 3 px accent bar, while the header **text** stays `--text`:

| Status | Light bar / header tint | Dark bar / header tint |
|---|---|---|
| To Do | `#4c6ef5` / `#eaefff` | `#7f9cff` / `#1d2440` |
| In Progress | `#b26a00` / `#fff4e0` | `#e0a458` / `#2b2113` |
| Done | `#17795e` / `#e4f5ee` | `#4fc3a1` / `#132b25` |

**Rationale**: Putting the hue in the background tint and the bar, and keeping header text at `--text`, is what makes FR-004 provable: `--text` on any of the three pale tints clears 12:1 in light, and on any of the three deep tints clears 11:1 in dark, so the ratio does not depend on which hue was picked. The bars only need the 3:1 non-text ratio, which all six clear against their own header background. Indigo / amber / green are distinguishable under the common forms of colour vision deficiency, and because the status label text is always present, colour is never the sole carrier of meaning.

**Alternatives considered**:

- Saturated accent as the full header background with white text — rejected: amber needs to go very dark to reach 4.5:1 with white, which destroys the "distinct accent" reading and makes the three columns look like three different components.
- Accent only as a thin top border with no tint — rejected: at a glance across a wide window the columns stop being distinguishable, which is the point of User Story 1.
- Generating tints with `color-mix()` — rejected: it hides the actual rendered colour from review, and the contrast numbers above could no longer be stated as facts.

---

## R-003: Type scale, spacing rhythm, radii, shadows (FR-016)

**Decision**: One scale, all as tokens:

- **Type roles**: page title `1.5rem/700`, column heading `0.8125rem/600` uppercase with `0.06em` tracking, card title `0.9375rem/600`, body `0.875rem/400`, muted `0.75rem/400`. Line height `1.25` for headings, `1.5` for body.
- **Spacing**: a 4 px rhythm exposed as `--space-1: 4px` through `--space-6: 32px`. Every margin, padding, and gap uses a step; no ad-hoc values.
- **Radii**: `--radius-sm: 6px` for chips and controls, `--radius-lg: 10px` for cards and panels. Two values total.
- **Shadows**: `--shadow-card` resting, `--shadow-card-raised` on hover/focus-within, each re-pointed in dark to a higher-alpha black so the lift is still visible on a dark surface.

**Rationale**: FR-016 asks for one type role per job, one spacing rhythm, one roundness for chips/controls and one for cards/panels. Stating the values as tokens makes "do these two cards share the same rhythm?" a grep, not a judgement call. A 4 px base matches what the current stylesheet already approximates in `rem`, so the visual jump is small and existing screenshots stay recognisable.

**Note on the initials chip**: FR-016 puts chips and controls on the *same* roundness, so the chip is a 6 px rounded square, not a circle. A circular chip would need a third radius and would contradict the requirement.

**Note on card spacing**: the vertical space between cards is a `margin-bottom` on each card slot, not a `gap` on the column. R-008 explains why.

**Alternatives considered**:

- A `rem`-only scale with no pixel base — rejected: the spec's 900 px layout boundary and the 3 px accent bar are already pixel facts; mixing units made the rhythm harder to check.
- Reusing the current ad-hoc values (`0.35rem`, `0.45rem`, `0.6rem`) — rejected: that is exactly the inconsistency FR-016 exists to remove.

---

## R-004: Column layout and the wide/narrow boundary (FR-002, SC-001)

**Decision**: Keep `.board { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }` and stack with `grid-template-columns: 1fr` below 900 px, i.e. `@media (max-width: 899px)`. When the filter selects a single status, that one column spans the full width of the grid.

**Rationale**: The spec's Assumptions fix "wide" at about 900 px; the current stylesheet breaks at 720 px, so the breakpoint moves. Grid (rather than flex) keeps the three columns equal width regardless of content, which is what stops a long title in one column from squeezing the others. `gap` provides the "visible separation" FR-002 asks for in the stacked case without extra margin rules.

**Alternatives considered**:

- Horizontal scroll on narrow windows (a common Kanban pattern) — rejected: the spec requires stacking, and a hidden third column defeats glanceability.
- A container query on `.board` — rejected: the board is always the full page width here, so it would add a concept without changing any outcome.

---

## R-005: Long titles and tall columns (Edge Cases)

**Decision**: `.card h3 { overflow-wrap: anywhere; }` and `min-width: 0` on the column so a long unbroken string wraps instead of widening the grid track. The column body scrolls with the page; the column header uses `position: sticky; top: 0` inside the column so the label and count stay readable while a long column is scrolled.

**Rationale**: Grid tracks sized `1fr` still respect an item's automatic minimum size, so without `min-width: 0` a single long word can push a column wider and overlap its neighbour — this is the specific failure the edge case names. Sticky headers satisfy "the column label remains readable" without introducing an inner scroll area, which would trap the keyboard and complicate the height animation in R-008.

**Alternatives considered**:

- Truncating the title with an ellipsis — rejected: the spec says the title wraps, and truncation hides information the card exists to show.
- A fixed-height, independently scrolling column body — rejected: adds a scroll container per column and conflicts with the smooth height change requirement.

---

## R-006: The assignee initials chip without losing the accessible name (FR-007)

**Decision**: Render the chip as `aria-hidden="true"` next to a visually hidden span that carries the existing wording:

```jsx
<span className="card__assignee">
  <span className="chip" aria-hidden="true">{initialsOf(task.assignee)}</span>
  <span className="visually-hidden">
    {task.assignee ? `Assigned to ${task.assignee}` : 'Unassigned'}
  </span>
</span>
```

Initials are derived by a small exported pure helper in `TaskCard.jsx`: trim, split on runs of whitespace, drop empties; no words → empty string; one word → its first letter; two or more → first letters of the first two words; uppercased.

**Rationale**: This is the option that changes the picture without changing the accessible text at all. The existing `TaskCard` test asserts `Assigned to Priya` and `Unassigned` as text, and Testing Library's `getByText` still finds a visually hidden span — so the refresh lands with that assertion untouched, which is the cheapest possible proof that accessibility did not regress. Exporting `initialsOf` lets the edge-case table ("Priya" → "P", "Sam Lee" → "SL", "Ana Maria Costa" → "AM", extra spaces ignored) be tested directly rather than through six renders.

**Alternatives considered**:

- `aria-label` on the chip — rejected: it replaces the accessible name rather than adding one, silently breaking the existing text assertions and making the name invisible to text-based checks.
- `title` attribute — rejected: inconsistent screen-reader support and no keyboard access to the tooltip.
- A `<abbr>` element — rejected: `title` again, plus browsers announce it inconsistently.

---

## R-007: The relative created line (FR-008, Edge Cases)

**Decision**: Add a **second** exported helper to `TaskCard.jsx` — leave `formatApproximateTime` exactly as it is for comment timestamps — that returns the card's created label from a floor-based ladder:

| Elapsed | Output |
|---|---|
| future, or under 60 s | `Created just now` |
| exactly 1 min, up to 59 min | `Created 1 minute ago` / `Created N minutes ago` |
| 1 h up to 23 h | `Created 1 hour ago` / `Created N hours ago` |
| 1 day up to 30 days | `Created 1 day ago` / `Created N days ago` |
| over 30 days | `Created 12 Aug 2026` |

Missing or unparseable timestamp → return empty and render no line at all. The calendar form uses `toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })`. The helper takes `now` as a second parameter defaulting to `new Date()`, so every boundary is testable. The timestamp is read through a helper that accepts `created_at` or `createdAt`, mirroring the existing comment helper, and the line is wrapped in `<time dateTime={iso}>`.

**Rationale**: Two formatters instead of one is the decision that matters here. The existing `formatApproximateTime` rounds (`Math.round`), has no "Created" prefix, falls back to `toLocaleDateString()` at 24 hours, and is already relied on by the comment thread and its tests. Bending it to the spec's floor-based day/30-day ladder would silently change comment timestamps, which FR-010 forbids. A separate helper keeps comment behaviour identical and makes the new boundaries testable in isolation. Flooring (not rounding) is what makes "2–59 minutes" and "2–30 days" behave as written; rounding would show "1 hour ago" at 31 minutes. A fixed `en-GB` locale for the calendar form makes the spec's own example ("12 Aug 2026") reproducible in a test instead of depending on the runner's locale. Injecting `now` is what makes the hour, day, and 30-day boundaries verifiable at all — see R-015.

**Alternatives considered**:

- `Intl.RelativeTimeFormat` — rejected: it produces "3 days ago" but cannot express the "Created" prefix or the 30-day handover without wrapping logic anyway, and its rounding is not under our control.
- Extending `formatApproximateTime` with an options argument — rejected: one function with two behaviours is harder to read than two named functions, and it still risks the comment path.
- A shared `utils/time.js` module — rejected: Simplicity prefers editing the existing file, and both helpers have exactly one consumer.

---

## R-008: Animating the board — what moves, what triggers it, and how long the trigger lives (FR-017, FR-018)

This is the hardest mechanism in the feature. It has four separate problems, and getting any one of them wrong produces a board that jumps, animates the wrong thing, or drops an animation entirely.

### Problem 1 — a column's height cannot be transitioned directly

Two obvious approaches fail outright:

- `transition: height` on the column does nothing. The column's height is `auto` before the change and `auto` after it. A transition needs two computed endpoints, and `auto → auto` gives the engine nothing to interpolate, so the column jumps.
- `interpolate-size: allow-keywords` does not rescue it. It only enables interpolation between a **length** and an intrinsic keyword, so it still needs one numeric endpoint a content-driven column does not have. The CSS Working Group also resolved to exclude grid track properties from it, and it is Chromium-only today, failing the stated target of current Chrome, Edge, Firefox, and Safari.

**Decision**: animate the **cards**, and let the column height follow. Every card is wrapped in a slot:

```text
<div class="card-slot">        display: grid; grid-template-rows: 1fr; margin-bottom: var(--space-2)
  <article class="card">       min-height: 0; overflow: hidden
```

`grid-template-rows` track sizes *are* interpolable, so a slot animating `0fr → 1fr` grows from zero to exactly its content height with no JavaScript measurement. Because the slot is a normal item in the column's flow, the column's own height changes continuously for the whole 180 ms. Support is Chrome/Edge 107+, Firefox 66+, Safari 16+ (~92% global) — every browser in the stated target. The `min-height: 0` on the grid item is load-bearing: without it the track refuses to shrink below the card's intrinsic height and the collapse silently does nothing.

**Card spacing must be a slot margin, not a column `gap`.** A `gap`-spaced column keeps one full gap for a zero-height slot, so the column would still jump by `--space-2` the moment the slot unmounts. Every keyframe therefore animates `margin-bottom` alongside the height. The `gap` between *columns* on `.board` is unrelated and stays.

### Problem 2 — a list diff cannot tell you what the user did

A diff of successive task lists is the tempting trigger, and it is wrong in two ways that matter:

- **It cannot recognise a create.** "This id was not in the previous list" is also true of a task someone else added, which arrives on an ordinary refresh. FR-017 grants the entrance animation to a *newly created* card, so a refresh-discovered card must not get it.
- **It cannot recognise a move under a filter.** `listTasks(status)` returns only the selected status, so when the board is filtered to To Do and a card moves to In Progress, the card **vanishes from the response**. To a diff that is byte-for-byte identical to a delete — and a delete must not animate, while a move must. The destination column is not even rendered, so the source column, the one the user is looking at, gets no collapse and jumps.

**Decision**: take the trigger from intent. `BoardPage` performs the create and the move, so it records what happened:

| Collection | Keyed by | Added | Contents |
|---|---|---|---|
| `pendingCreates` | task id | after `taskService.createTask` resolves | the id of the task the service returned — a value `handleCreate` currently discards |
| `pendingMoves` | `(task id, from)` | synchronously at the top of `handleAdvance`, before the request | `{ task, from, to }` |

Both carry a `revealedByRequestId`, left `null` at first and filled in when the handler starts the follow-up load that will make the change visible (Problem 3). Keying moves by source status — rather than by task id alone — is what lets several different cards be mid-move at once, and lets the same card be moved twice in quick succession, without one intent clobbering another. That is the rapid-moves edge case, and a single `movedTask` slot cannot satisfy it.

`TaskList` animates exactly what these name. A task that merely turns up in a refresh has no intent and never animates; a filter change, a delete, a comment toggle, and a panel expand record nothing, so they are silent by construction rather than by an exclusion list someone has to keep correct. Because `pendingMoves` names the source column outright, the filtered-board case works: the ghost collapses in the selected column even though the moved task is absent from the response.

### Problem 3 — an intent must outlive the request it is waiting for

The obvious lifetime — "clear the intent 180 ms after raising it" — is wrong, and the failure is common rather than exotic. `handleAdvance` raises its intent *before* the update request, and the card does not actually leave the source column until the follow-up list request comes back. On any connection where those two round trips take longer than 180 ms, the intent is already gone by the time the render that needs it arrives, and the column jumps. The same applies to a create on a slow link.

Equally, an intent must not be consumed too *early*. Between raising a move intent and the refreshed list arriving there are renders that still show the pre-move data. Consuming against those would decide "the card is still in its source column, nothing to animate" and throw the intent away.

"Newer than the moment the intent was raised" is the tempting rule, and it is subtly wrong. Between raising a move intent and its own refresh landing, *some other* load can start and finish — the user presses Refresh, or switches filter, while the `PUT` is still in flight. That load is newer than the raise, and it settles, so the rule fires against a list fetched before the move was applied: the card is still in its source column, the intent resolves to "nothing to play", and the real refresh then drops the card with no collapse. The intent must wait for **its own** request, not merely for a newer one.

**Decision**: an intent has two moments. It is **raised** when the user acts, which is early enough to measure the card that is about to leave. It is **armed** when the mutation resolves and the handler starts the follow-up load, recording that load's freshly minted id as `revealedByRequestId`. An unarmed intent is inert — `TaskList` measures it but will not act on it. Consumption is then the first render that is settled and at least as new as the arming load:

> `phase !== 'loading'` **and** `intent.revealedByRequestId !== null` **and** `board.requestId >= intent.revealedByRequestId`

The id is minted inside the arming call and used directly, never read back from a render closure (R-011), so it is the id of the request that will actually reveal the change. `>=` rather than `>` because this time the intent names the request it is waiting for; if that request is itself superseded by a later filter change, the later reply settles the intent instead, which is the right outcome — the user has moved on.

If the mutation *rejects*, its handler removes its own intent before the error propagates, so an unarmed entry can never be left behind. The rejection itself still surfaces exactly as it does today.

An intent therefore waits indefinitely for a slow request, and can never be evaluated against data that predates the action. Consumption either starts an animation or resolves to nothing:

| Intent | At consumption | Result |
|---|---|---|
| create | id present in `tasks` | entrance animation |
| create | id absent (filtered out, or the load failed) | nothing to play |
| move | source column visible and the card has gone from it | ghost |
| move | source column not visible, the load failed, or the card is still there | nothing to play |

`TaskList` reports every consumed intent back through a single `onMotionSettled(key)` callback — when its animation ends, or immediately when there was nothing to play — and `BoardPage` drops the entry then. Nothing is discarded on a timer started at signalling time, and nothing accumulates, because every intent is resolved by the next completed load one way or the other.

**The 180 ms lifetime starts at consumption, not at signalling.** Once a ghost is running it is owned by `TaskList` and finishes independently of the intent map, so a later move of the same card cannot truncate a collapse already in progress.

### Problem 4 — the ghost must be the right height without duplicating the card

An exit animation needs an element that still exists, so the source column keeps a stand-in for one cycle. Two properties are in tension: it has to be *exactly as tall as the card that left*, and it must not duplicate that card's identity, because the real card may be mounted in the destination column at the same moment. A faithful clone would briefly double `task-{id}`, the `Delete` button, and the card heading, breaking `getByTestId`/`getByRole` and confusing assistive technology.

**Decision**: the ghost has no content at all. When a new key appears in `pendingMoves`, `TaskList` reads `offsetHeight` from that card's slot in a **layout effect on that same render** — the card is still mounted, because the intent was raised synchronously before any await — and stores the value under that move's key. Per-key storage is what keeps concurrent moves honest: each pending move carries its own measurement, and a second move cannot overwrite the first one's height. At consumption the ghost renders as an empty `aria-hidden`, non-interactive block of exactly that height, animating height and bottom margin to zero.

Rebuilding the card's visible content in the ghost was considered and rejected: a static twin is shorter than a card whose comment thread was open, so the column would jump by that difference the instant the ghost appeared — precisely the failure FR-017 exists to prevent. This is also why the ghost cannot use the `0fr/1fr` trick: an empty element has no intrinsic height, so `1fr` would resolve to zero. A measured length is what makes its collapse meaningful.

The measured value travels as an inline CSS custom property. That is the one inline style the feature permits, and it is not a presentational constant — a stylesheet cannot hold a number that only exists at runtime.

### The three animations

| Class | Applied at consumption when | Animates |
|---|---|---|
| `card-slot--entering` | a create intent's id is present | `grid-template-rows 0fr → 1fr`, `margin-bottom 0 → --space-2`, `opacity 0 → 1`, `translateY(4px) → 0` |
| `card-slot--growing` | a move intent's `to` column is visible and holds the card | `grid-template-rows 0fr → 1fr`, `margin-bottom 0 → --space-2` |
| `card-ghost` | a move intent's `from` column is visible and the card has gone | `height var(--ghost-height) → 0`, `margin-bottom --space-2 → 0` |

All three are `@keyframes` animations of 180 ms rather than transitions, so nothing fires implicitly when an element mounts.

**Reduced motion** is handled entirely in CSS: `animation: none` on the entering and growing slots, and `animation: none; display: none` on the ghost, so the ghost never appears rather than sitting at full height and jumping when its timer expires. Intents still settle on their normal schedule, so nothing accumulates. No JavaScript reads `matchMedia`.

**Alternatives considered**:

- `transition: height` with `interpolate-size` — rejected for the reasons in Problem 1. It is the intuitive answer and it does not work here, so it is recorded explicitly to stop it being reached for again.
- Diffing successive task lists — rejected for the reasons in Problem 2; it silently mis-handles refresh-discovered tasks and every move on a filtered board.
- A fixed timeout on the intent — rejected for the reasons in Problem 3; it is a bet on network latency, and it loses on exactly the connections where smooth motion matters most.
- Consuming at the first settled render *newer than the raise* — rejected in Problem 3: an unrelated Refresh or filter change during the mutation's round trip settles first and consumes the intent against pre-mutation data, silently discarding the animation.
- Stamping the intent from the `board` value captured in the handler's closure — rejected for the reasons in R-011: after an `await` that value is a snapshot of a render that may be several requests old, so the intent would be armed on a request that has already settled and would be consumed immediately.
- A single `movedTask` slot instead of a keyed map — rejected: rapid moves of different cards overwrite one another, and the earlier card's measured height is lost with it.
- A full FLIP animation (`getBoundingClientRect` on every item, every commit) — rejected: far more layout reading than the single `offsetHeight` per move that this design needs, and it fights React 19 re-render timing.
- A content-bearing ghost — rejected in Problem 4: wrong height, and duplicate identity.
- `max-height` transition with a guessed ceiling — rejected: the easing is visibly wrong whenever the guess is off, and a too-small guess clips cards.
- `document.startViewTransition` — rejected: it animates the whole document by default, needs imperative DOM calls from a React component, and would animate filtering and deleting too, which FR-017 forbids.
- An animation library — rejected outright: Simplicity forbids adding a dependency for this.

---

## R-009: Quiet Move and Delete that stay above AA and keep working without hover (FR-009, FR-013, SC-004)

**Decision**: Quieten the actions with an explicit colour token, never with `opacity`.

| State | Move | Delete |
|---|---|---|
| Quiet (card at rest) | `--text-muted`, weight 600, 1 px `--border`, no fill | `--text-muted`, weight 400, no border, no fill |
| Active (`:hover` on the card, `:focus-within`, or `@media (hover: none)`) | `--text` on a `--surface-muted` fill | `--danger`, no fill |

Composited contrast, since no `opacity` is involved: quiet `--text-muted` on `--surface` is 6.3:1 light and 6.6:1 dark; active Move is 14.1:1 / 13.3:1; active Delete is 6.5:1 / 8.4:1. Every state clears 4.5:1. Delete reads as secondary in **both** states through weight and the absence of a border, not through reduced contrast. Focus stays `outline: 2px solid var(--focus); outline-offset: 2px` on `:focus-visible`.

**Rationale**: The intuitive approach — `opacity` around `0.55` on the action row, while quoting the full-strength token ratios — is wrong twice over. Opacity composites the text against whatever is behind it, so `--text` at 55% over `--surface` lands near 2.6:1 in light, a clear AA failure on an *enabled* control, which WCAG does not exempt. It also fades the button's border and focus ring along with the label. Using a real colour token means the ratio in the CSS is the ratio on screen and can be checked with a contrast tool directly, which is what SC-004 asks a reviewer to do.

"Visually quiet" must also never become "not there". `display: none` or `visibility: hidden` would remove the button from the accessible tree and the tab order, breaking FR-009's keyboard requirement and the existing `TaskCard` tests that click Delete directly. Colour-only quietening leaves the DOM, the accessible name, and the tab order untouched, so `getByRole('button', { name: 'Delete' })` works whether or not anything is hovered. `:focus-within` on the card covers the keyboard path and the `hover: none` query covers touch devices, which is the sixth acceptance scenario of User Story 2.

**Scope of the rule**: this bans `opacity` as a means of *de-emphasis*, not the property itself. Two uses remain legitimate and are explicitly permitted:

- the card-entrance keyframe animating `opacity` from 0 to 1, which FR-017 requires and which resolves to full opacity within 180 ms — it is motion, not a resting state, and it never leaves an enabled control dimmed;
- the pre-existing `button:disabled { opacity: 0.5 }` rule, since WCAG exempts disabled controls from contrast minimums and that rule predates this feature.

The testable form of the rule is therefore about resting states: no enabled control or text may have a computed opacity below 1 once animation has settled.

**Alternatives considered**:

- `opacity` with a higher value (0.8) — rejected: it still makes the delivered ratio a function of the backdrop, so the contrast claim cannot be stated as a fact, and it still dims the focus ring.
- Hover-only reveal with `display: none` — rejected: fails keyboard access, fails touch, and breaks existing tests.
- Moving the actions into an overflow menu — rejected: adds a component and an interaction the spec never asks for.
- Hiding actions behind `aria-hidden` when quiet — rejected: it would hide operable controls from assistive technology, which is a regression, not polish.

---

## R-010: The collapsible create panel and its draft (FR-011, FR-012, User Story 3)

**Decision**: Wrap the existing form in a native `<details className="panel">` with a `<summary>` reading "Add a task", inside `TaskForm.jsx`. No `open` attribute, so it starts collapsed. `TaskForm`'s existing `useState` draft is untouched and nothing is persisted. The disclosure itself is not animated, per FR-017.

**Rationale**: `<details>` gives keyboard operation, the correct expanded/collapsed announcement, and Enter/Space handling for free — reimplementing that with a button and `aria-expanded` is more code and more ways to get it wrong. Critically, browsers keep `<details>` content in the DOM when collapsed, so React never unmounts `TaskForm`'s state: a half-typed draft survives collapse and re-expand within the visit, which is acceptance scenario 3. Because nothing writes to `sessionStorage` or `localStorage`, a reload naturally starts collapsed with an empty draft, which is acceptance scenario 5 — the requirement is met by *not* adding persistence. Keeping the `<details>` inside `TaskForm.jsx` rather than `BoardPage.jsx` keeps the panel presentational and leaves the page component to state and fetching.

Success already clears the draft: `handleSubmit` resets to `EMPTY` after `onCreate` resolves. The panel deliberately does not auto-collapse on success — the spec does not ask for it, and closing under the user is a surprise.

**Alternatives considered**:

- A React-controlled `aria-expanded` button plus conditional render — rejected: conditional rendering unmounts the form and destroys the draft, directly failing acceptance scenario 3.
- Keeping it mounted but `hidden` with custom ARIA — rejected: this is what `<details>` already is, hand-rolled.
- Persisting the draft in `sessionStorage` — rejected: FR-011 says leaving the page must not remember the draft.

---

## R-011: Board state that always belongs to the current request (FR-006, FR-014, FR-015, SC-007)

### The trap: four independent pieces of state, and no idea which request they came from

Today `BoardPage` holds `filter`, `tasks`, `loading`, and `error` as four separate values, and `refresh` writes three of them when it resolves. Nothing ties any of them to the request that produced them, which breaks in four distinct ways:

- **A superseded reply overwrites the current one.** Switch from To Do to Done while the To Do request is still in flight, and whichever finishes last wins. If To Do finishes second, its tasks, its `loading: false`, and possibly its error all land on a board that is now showing Done. Clearing `tasks` at the moment the filter changes does nothing about this: the write happens later, from a closure that has no idea it has been superseded.
- **A stale error is briefly displayed under the new filter.** Setting the filter and clearing the tasks in one handler still leaves `error` from the previous filter set until the follow-up effect runs and clears it. For at least one render the board is "new filter, no tasks, old error" — which is the failed state, so the new column announces `Tasks unavailable` before its request has even started.
- **Stale cards answer the wrong question.** If the previous filter's tasks survive into the new filter's render, a column either shows cards that were never fetched for it or, when none of them match, reports `No tasks yet` — a successful-empty-load claim made on behalf of a request that has not returned.
- **An async handler refreshes the filter the user has already left.** Every mutation handler ends by re-fetching. The filter it re-fetches is whichever one its closure captured when the click happened, so a create started under To Do that resolves after the user selects Done issues a *brand-new* request for To Do. Request sequencing does not help here — that request is genuinely the newest, so its reply is accepted and the board reverts to To Do under a `<select>` the user has set to Done. This is the same closure-snapshot problem as the other three, arriving through the handler rather than through the reply.

### Decision: one state object, stamped with a monotonic request id

`BoardPage` holds a single value:

```text
board = { requestId, filter, phase, tasks, error }      phase: 'loading' | 'ready' | 'failed'
```

`filter` lives inside it, so the value in the `<select>` and the filter the tasks belong to are the same field and cannot drift apart. Starting a load mints the next id and replaces the **whole object in one update**:

- `requestId` = the new id, `filter` = the filter being requested, `phase` = `loading`, `error` = `null`;
- `tasks` = the previous tasks **only if** the previous state's filter is the one now being requested — a re-query keeps its cards; a new query starts empty.

Because tasks are only ever carried across a load when the filter is identical, and are only ever written by a completion for `prev.filter`, the invariant "`board.tasks` belongs to `board.filter`" holds by induction. That single update is also what makes a filter switch atomic: there is no intermediate render in which the new filter coexists with the old error or the old cards, because those fields are not separately writable.

Every completion is guarded — it **writes nothing unless the live `requestId` still equals the id that completion belongs to**:

- success → `{ ...live, phase: 'ready', tasks: fetched, error: null }`
- failure → `{ ...live, phase: 'failed', error: <existing message>, tasks: live.tasks }`

A superseded request therefore cannot write anything at all, and the same guard makes a double-invoked mount effect harmless.

Comment-count updates map over the live `tasks` and leave `requestId`, `filter`, and `phase` untouched, so they never look like a load completing. If the task has since been filtered away, the map simply matches nothing.

### The second trap: a handler that resumes after an `await` is reading the past

Sequencing fixes late *replies*. It does nothing for late *handlers*, because a handler that resumes after an `await` still holds the `board` value from the render that ran the click — and that render may be several requests old. Three reads are affected, and each fails differently:

- the **filter** used for the post-mutation refresh — issues a new, newest-wins request for a filter the user has left (the fourth bullet above);
- the **request id** stamped on a motion intent — arms it on a request that has already settled, so the intent is consumed immediately against data that predates the mutation and the animation is silently lost (R-008, Problem 3);
- the **task list** patched by a comment-count update — could otherwise write back a list belonging to a filter that is no longer displayed.

**Decision**: `board` has exactly one write path and one read path for asynchronous code.

```text
commit(next) { boardRef.current = next; setBoard(next) }
```

`boardRef` is assigned **synchronously inside `commit`**, so it is current the instant a write happens, regardless of when React re-renders. Every handler derives its next state from `boardRef.current`, never from the `board` value captured in its closure: `beginLoad()` with no argument resolves the filter from `boardRef.current.filter` *at the moment the mutation finished*, minting its id and returning it so the caller can arm its intent with that exact value. The rule is short enough to review mechanically: **after an `await`, read `boardRef.current`.** Rendering continues to use `board` from state, which is what makes the component re-render at all.

This makes the deferred-mutation race behave correctly rather than merely harmlessly. A create begun under To Do that lands after the user selects Done refreshes **Done**, leaves the `<select>` on Done, and arms its entrance intent against that Done request — so if the new card belongs to the visible set it still animates in, and if it does not, the intent settles with nothing to play. The user's latest choice wins, and the animation is not thrown away to achieve that.

Two writes in the same tick are safe because both go through `commit`, and the second reads the value the first stored. A `useEffect` that copies `board` into the ref after render was rejected: it re-introduces the very gap being closed, since a promise continuation can resume before React has re-rendered.

**Why sequencing rather than cancellation**: `AbortController` or an axios cancel token would also work, but both require changing `src/services/taskService.js` signatures. That module is the shared seam in front of three interchangeable backends, and a presentation-only refresh has no business reshaping it. A sequence number achieves the same guarantee entirely inside the page layer — and it is reused, at no extra cost, as the "is this reply newer than what the user did" clock for motion intents (R-008, Problem 3).

### The four board states, and the columns they render

The visible column set is computed once from `board.filter` — `all` gives three columns, any other value gives exactly one — and **every state uses that same set**. Rendering three shells while a filtered board loads or fails would contradict FR-006's promise that a single-status filter shows only that column.

| Condition | What renders |
|---|---|
| `phase === 'failed'` and `tasks` empty | Visible column shells; each body reads **`Tasks unavailable`**; counts suppressed. The existing error paragraph renders above, unchanged. |
| `phase === 'loading'` and `tasks` empty | Visible column shells with inert skeleton blocks; `aria-busy="true"`; a visually hidden `Loading tasks…`. |
| `phase === 'loading'` and `tasks` present | The existing cards stay exactly where they are; `aria-busy="true"`; a static `Refreshing…` label beside Refresh. |
| `phase === 'ready'` | Columns with cards, and `No tasks yet` in any column that genuinely loaded empty. |

(`phase === 'failed'` with cards present is the last row plus the error paragraph: a failed refresh keeps the cards and only adds the message.) Because `tasks` is non-empty during a load only when it is a re-query of the same filter, "nothing to show" is always a statement about the current request.

**Rationale — the error text**: a failed load previously rendered ordinary columns reading `No tasks yet`, a successful-empty-load message. The error paragraph above does not undo that, because the columns are the louder signal. `Tasks unavailable` is a different sentence for a different state, and suppressing the count stops a `(0)` from making the same false claim. Keeping the column shells means FR-001's columns still frame the page instead of the layout collapsing.

**Rationale — loading**: FR-014 offers "a column-like placeholder **or** a clear busy indicator", and using the second option for re-queries fixes a real defect. `BoardPage` re-fetches after every create, move, and delete, so a skeleton every time would unmount and re-mount every card, flashing the whole board on ordinary interactions. Keeping the cards mounted and adding `aria-busy` plus a static `Refreshing…` label is a clear busy signal that involves no motion, so it also stays inside FR-017. SC-007 only asks that the page be recognisably busy within a second **of opening**, which the first-load skeleton delivers.

One accepted consequence: changing the filter shows a brief skeleton rather than the previous filter's cards. That is both honest — the new query has no data yet — and closer to today's behaviour, since the board currently replaces itself with `Loading…` on every filter change. It costs nothing in motion terms, because animation is driven by intents and a re-mount alone can no longer animate anything.

Skeletons are `aria-hidden` decoration with the busy state announced once, rather than fake empty columns a screen reader would read as real.

**Alternatives considered**:

- Keeping four separate state values and clearing `tasks` on filter change — rejected: this is the defect above. It addresses only the stale *cards*, and not the late write, the stale error, or the mismatch between the selected filter and the data.
- Functional `setBoard` updaters as the only mechanism — rejected: the guard would be correct, but a handler that must *issue* a request needs to read the live filter, and a state updater may not have side effects. Something outside the updater has to hold the current value, so the ref is required either way; making it the single source for asynchronous reads is simpler than running two mechanisms that can disagree.
- Passing the filter down into each mutation handler as an argument — rejected: it captures the filter at click time, which is precisely the stale snapshot the fourth bullet describes.
- `AbortController` / axios cancel tokens — rejected: changes the shared service API for a presentation-only feature.
- A data-fetching library with built-in request keys — rejected outright: a new dependency, and Simplicity forbids it for a board this small.
- Rendering no columns at all on error — rejected: unambiguous, but the page collapses to a lone sentence and FR-001's columns disappear.
- A spinner during refresh — rejected: decorative motion on an interaction FR-017 says must not animate.
- Skeletons inside `BoardPage` — rejected: puts column presentation in the page layer.

---

## R-012: Live counts and the empty message (FR-003, FR-015, Edge Cases)

**Decision**: The count stays derived — `columnTasks.length` at the point the column renders — and the empty message text changes from `No tasks` to `No tasks yet`. `No tasks yet` is reserved for a column that loaded successfully and has no cards; the failed state uses `Tasks unavailable` and suppresses counts (R-011). Leaving ghosts are never counted. There is no board-level empty message: an empty board is simply three empty columns. Under a single-status filter, only that column renders, with its own live count.

**Rationale**: A derived count cannot drift. `BoardPage` already re-fetches after create, move, and delete, so the counts in the affected columns update on the next render with no extra state, satisfying acceptance scenario 3 of User Story 1. Adding a count to state would introduce exactly the duplication that makes counts go stale after a rapid sequence of moves, which the edge cases call out. Excluding ghosts matters because a ghost is a visual placeholder for a card that has already left; counting it would briefly contradict the column's own contents.

**Alternatives considered**:

- Counting in `BoardPage` and passing counts down — rejected: two sources of truth for the same number, and the page would need to know about column composition.
- An `aria-live` region announcing count changes — rejected: not requested, and it would chatter on every refresh.

---

## R-013: Keeping status strings out of components (Constitution — Error Contract and Domain Constraints)

**Decision**: `TaskList` renders each column as `<section data-status={status}>` where `status` comes from `STATUSES` in `src/constants.js`, and labels continue to come from `STATUS_LABELS`. The literal strings `todo`, `in-progress`, and `done` appear only in `index.css` attribute selectors.

**Rationale**: The constitution binds *components* — they must not hard-code status values or labels. A `data-status` attribute passes the value through without ever naming it in JSX, so per-status accents work with zero hard-coding. The CSS file is not a component, and a stylesheet has to name the states it styles somehow; an attribute selector is the narrowest way to do that, and it stays valid as long as `constants.js` and `schema.sql` agree — which they already must. The same rule covers the `from` and `to` values inside `pendingMoves`: they travel as prop values, so no component names one.

**Alternatives considered**:

- `className={`column column--${status}`}` — works equally well but produces a class name that does not exist anywhere in source, which is harder to grep than `[data-status="todo"]`.
- A status→colour map in JavaScript with inline styles — rejected: moves styling out of `index.css` and hard-codes status keys in a component.

---

## R-014: Header, toolbar, and heading order (FR-005, FR-019)

**Decision**: `BoardPage`'s header keeps the `h1` "Engineering Task Board" and the existing one-line context, and the toolbar (status filter + Refresh, plus the `Refreshing…` label from R-011) moves into the same header block, grouped in a `<div className="toolbar">` so filter and Refresh read as one control group. Heading order is `h1` page title → `h2` column heading → `h3` card title, which is what the components already emit. The `<summary>` of the create panel is a disclosure control, not a heading, so it does not disturb the order.

**Rationale**: FR-005 asks for the filter to be grouped with Refresh; moving the existing toolbar into the header achieves that by relocating markup, with no change to `StatusFilter` itself. The heading levels already satisfy FR-019, so the work here is to avoid breaking them — specifically, not to promote the column count into its own heading, not to turn the panel summary into an `h2`, and not to give the leaving ghost a heading of its own, which R-008 rules out anyway by giving it no content.

**Alternatives considered**:

- A `<nav>` or `role="toolbar"` wrapper — rejected: neither is a navigation landmark nor a true toolbar widget, and `role="toolbar"` brings arrow-key expectations that would then have to be implemented.
- Moving the filter into each column header — rejected: changes behaviour and contradicts FR-006.

---

## R-015: How the created-line cases are actually verified (FR-008, executable validation)

**Decision**: Cover the created-line ladder with Vitest, using an injected `now` and explicit task fixtures. The browser pass verifies only the cases the running board can actually produce, and [quickstart.md](./quickstart.md) says so rather than asking a tester to conjure old data.

**Rationale**: `created_at` is set by the database (constitution: Single Schema Ownership), the API exposes no way to backdate it, and `database/seed.sql` inserts every row at `NOW()` with no `created_at` column in the insert list. So a freshly seeded board can only ever show `Created just now` and, after a wait, the minutes range. Asking a reviewer to "add the missing cases through the board" is impossible for anything from one hour upward, and the 30-day calendar-date case is unreachable by any frontend action.

Because the formatter takes `now` as a parameter and the card takes a task object as a prop, both layers are directly testable: the helper is asserted at each boundary against a fixed `now`, and a component test renders a card whose created timestamp is 90 days before that same fixed `now` to prove the calendar form reaches the screen. This is executable, deterministic, and free of clock flake.

If someone wants to *see* an old card in a browser, the documented route is a one-line `UPDATE` against their local dev database. That is local dev-data setup, explicitly outside this feature's frontend scope, and the quickstart marks it optional so the validation pass never depends on it.

**Alternatives considered**:

- Adding a backdated row to `database/seed.sql` — rejected: it edits shared repository data for a frontend presentation feature, and `created_at` is meant to be database-set.
- Mocking the system clock in the browser via dev tools — rejected: fiddly, not reproducible, and it does not produce a reviewable artefact the way a test does.
- Accepting the case as unverified — rejected: FR-008 names the 30-day behaviour explicitly, so it needs real coverage.

---

## Summary of resolved unknowns

| Spec gap | Resolved by |
|---|---|
| Exact accent hues, "distinct and contrast-safe" | R-002 |
| Exact type/spacing/radius/shadow values behind FR-016 | R-003 |
| Wide/narrow boundary mechanism | R-004 |
| How initials keep the accessible name | R-006 |
| Created-line boundaries without touching comment timestamps | R-007 |
| A column height animation that works on all target browsers | R-008, Problem 1 |
| Telling a created card apart from a refresh-discovered one | R-008, Problem 2 |
| Animating a move when the filtered response simply drops the card | R-008, Problem 2 |
| Keeping an intent alive across a slow refresh, and rapid moves of several cards | R-008, Problem 3 |
| A leaving ghost that is the right height and duplicates nothing | R-008, Problem 4 |
| "Quiet" actions that stay above AA, and where `opacity` is still allowed | R-009 |
| Panel markup that keeps a draft but forgets it on reload | R-010 |
| Ignoring superseded replies and switching filters atomically | R-011 |
| Loading, refreshing, failed, and empty states kept distinguishable | R-011 |
| Per-status styling without hard-coding status strings | R-013 |
| How the unreachable created-time cases get verified | R-015 |

No `NEEDS CLARIFICATION` items remain.
