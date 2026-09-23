# Feature Specification: Board UI Refresh

**Feature Branch**: `002-board-ui-refresh`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Jira EYTB-1 — Refresh the task board UI: Kanban layout, design system, dark mode. As an engineer using the task board, I want a clean Kanban layout with always-visible status columns and a consistent visual design so that I can see at a glance where work sits and where it is piling up, without the board feeling like a prototype. Presentation only; what the board does stays the same."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See where work is piling up (Priority: P1)

An engineer opens the board and immediately sees three status columns — To Do, In Progress, and Done — in that order. On a wide window they sit side by side. On a narrow window they stack, with a clear gap between them. Each column shows its name and a live count of the cards in it, and each header has its own accent colour so the columns are easy to tell apart without reading every title. The page header shows the product name, a one-line context, and groups the status filter with Refresh.

**Why this priority**: The reason for this refresh is glanceable workload. Without always-visible columns and counts, the rest of the visual polish does not solve the problem.

**Independent Test**: Open the board with tasks in more than one status, on a wide window and again on a narrow window. Confirm three labelled columns, live counts, distinct header accents, and that changing a task's status updates the two affected counts straight away.

**Acceptance Scenarios**:

1. **Given** tasks in To Do, In Progress, and Done, **When** an engineer views the board on a wide window, **Then** the three columns appear side by side, left to right in that order, each with its label and a count equal to the cards in that column.
2. **Given** the same board, **When** the window is narrow, **Then** the columns stack in the same order, visibly separated, and each still shows its label and count.
3. **Given** a column with four cards, **When** one card is moved to another column, **Then** the source count drops by one and the destination count rises by one without a manual refresh.
4. **Given** the board, **When** the engineer looks at the column headers, **Then** each status has a distinct accent, the status name is still readable text, and header text meets WCAG AA contrast against its background.
5. **Given** the board, **When** the engineer looks at the top of the page, **Then** they see the product name "Engineering Task Board", the existing one-line context, and the status filter grouped with Refresh.

---

### User Story 2 - Scan a card without a wall of controls (Priority: P2)

An engineer scanning a column can read a card's title, see who it is assigned to as a small initials chip, and see roughly when it was created as a muted line. Move and Delete stay visually quiet until the card is hovered or focused. Delete looks secondary to Move. Comment discussion on the card still works as it does today.

**Why this priority**: Cards are what people scan after the columns. Quieter actions and clearer identity make the board readable, but the column layout already delivers the main value.

**Independent Test**: Open a column that contains an assigned task and an unassigned task. Confirm initials, relative created time, and that Move and Delete are subdued until hover or keyboard focus, with Delete visually secondary. Complete a move and a delete from the keyboard.

**Acceptance Scenarios**:

1. **Given** a task assigned to "Priya Sharma", **When** the card is shown, **Then** the assignee appears as an initials chip "PS" and assistive technology still announces the full name.
2. **Given** a task with no assignee, **When** the card is shown, **Then** the chip has no letters and is announced as "Unassigned".
3. **Given** a task created 3 days ago, **When** the card is shown, **Then** a muted line reads "Created 3 days ago".
4. **Given** a card that is not hovered or focused, **When** the engineer looks at it, **Then** Move and Delete are visually quiet, and Delete is less prominent than Move.
5. **Given** keyboard focus on a card or one of its actions, **When** the engineer tabs through, **Then** Move and Delete are visible and can be operated, and focus is clearly visible.
6. **Given** a device that cannot hover, **When** the engineer views a card, **Then** Move and Delete remain available without requiring hover.

---

### User Story 3 - Add a task without the form taking over (Priority: P2)

The new-task form lives in a panel that starts collapsed, so the board is the main thing on the page. The engineer expands it to add a task, submits as they do today, and can collapse it again. The draft is kept while the page stays open, and is cleared after a successful create. The next visit starts collapsed again.

**Why this priority**: The form is useful but should not compete with the board. Creating tasks already works; this story only changes how much of the page the form occupies.

**Independent Test**: Open the board and confirm the form is collapsed and the columns are the primary content. Expand it, create a valid task, and confirm the new card appears and the form resets. Reload and confirm the panel is collapsed again.

**Acceptance Scenarios**:

1. **Given** a freshly opened board, **When** the page finishes showing tasks, **Then** the new-task panel is collapsed and the columns are the primary content.
2. **Given** a collapsed panel, **When** the engineer expands it, **Then** the same fields as today are available (title, description, assignee) and a task can be created.
3. **Given** a partially filled form, **When** the engineer collapses the panel and expands it again in the same visit, **Then** the draft is still there.
4. **Given** a successful create, **When** the form updates, **Then** the fields are cleared, the new card appears in To Do, and that column's count increases by one.
5. **Given** a panel the engineer left expanded, **When** they leave and open the board again, **Then** the panel starts collapsed and the previous draft is gone.

---

### User Story 4 - Read the board in light or dark, including empty and loading moments (Priority: P3)

The board follows the operating system's light or dark appearance. There is no theme switch on the page. Loading does not look like an empty board. Each empty column explains that it has no tasks. Type, spacing, colour, corner roundness, and shadow come from one shared visual language so the page does not look assembled from unrelated pieces.

**Why this priority**: Dark mode, empty states, and a shared look make the board feel finished. The board is already usable without them once columns and cards are in place.

**Independent Test**: View the board in light appearance and in dark appearance, once while loading, once with every column empty, and once with a mix of cards. Confirm readable contrast, a loading placeholder, "No tasks yet" in empty columns, and consistent type and spacing across header, form, columns, and cards.

**Acceptance Scenarios**:

1. **Given** the operating system is set to dark, **When** the engineer opens the board, **Then** backgrounds, text, chips, buttons, and column accents are all readable and text contrast meets WCAG AA, with no control on the page to pick a theme.
2. **Given** the operating system is set to light, **When** the engineer opens the board, **Then** the same elements meet WCAG AA contrast in the light palette.
3. **Given** tasks are still loading, **When** the engineer looks at the page, **Then** they see a column-like placeholder or a clear busy indicator, not a board that looks as if there is no work.
4. **Given** a column with no cards, **When** it is shown, **Then** it reads "No tasks yet".
5. **Given** the board has no tasks at all, **When** it is shown with all statuses visible, **Then** it is three empty columns each saying "No tasks yet", with no extra empty-board message.
6. **Given** any two cards, the column headers, and the new-task panel, **When** they are compared, **Then** they share the same type sizes for the same roles, the same spacing rhythm, the same corner roundness for the same kinds of surfaces, and colours from one palette.

---

### User Story 5 - Motion stays quiet (Priority: P3)

A new card eases into place. When a card changes column, the columns change height smoothly instead of jumping. Nothing else animates. If the person has asked the system to reduce motion, those changes are instant.

**Why this priority**: Motion supports the layout; it is not required to understand the board.

**Independent Test**: Add a card and move a card with motion allowed, and repeat with reduced motion requested. Confirm only those two motions, each finishing in under 300 milliseconds, and that reduced motion shows no animation.

**Acceptance Scenarios**:

1. **Given** motion is allowed, **When** a task is created, **Then** the new card fades and slides into its column and settles in under 300 milliseconds.
2. **Given** motion is allowed, **When** a card moves to another status, **Then** the columns adjust height smoothly in under 300 milliseconds instead of jumping.
3. **Given** the person has requested reduced motion, **When** a card is added or moved, **Then** the board updates immediately with no animation.
4. **Given** any other interaction (filtering, expanding the form, opening comments, deleting), **When** it completes, **Then** no extra decorative motion plays.

---

### Edge Cases

- Status filter is "All": all three columns show, including empty ones. Status filter is a single status: only that column shows, with its live count. An empty filtered column still says "No tasks yet".
- Assignee is one word ("Priya" → "P"). Two or more words use the first letter of the first two words ("Sam Lee" → "SL", "Ana Maria Costa" → "AM"). Letters are uppercase. Extra spaces are ignored.
- Created time is missing or invalid: the created line is omitted. A future time is shown as "Created just now".
- Relative time boundaries: under 1 minute → "Created just now"; 1 minute → "Created 1 minute ago"; 2–59 minutes → "Created N minutes ago"; 1 hour → "Created 1 hour ago"; 2–23 hours → "Created N hours ago"; 1 day → "Created 1 day ago"; 2–30 days → "Created N days ago"; older than 30 days → "Created" plus a calendar date (for example "Created 12 Aug 2026").
- A very long title wraps inside the card and does not widen the column or overlap the next column.
- A column with many cards stays usable: the page or the column can be scrolled, and the column label remains readable.
- Loading fails: the existing error message is shown; the page does not pretend the board is empty of tasks.
- Rapid moves: counts and column heights end on the correct cards; no card is duplicated or lost.
- Reduced motion and dark appearance can be on at the same time; both rules apply.
- Comment count, thread, posting, and deleting a comment keep today's behaviour inside the refreshed card.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The board MUST show the statuses To Do, In Progress, and Done as columns in that order.
- **FR-002**: On a wide window, the three columns MUST sit side by side. On a narrow window, they MUST stack in the same order with a visible separation between columns.
- **FR-003**: Each visible column MUST show its status name and a live count of the cards in that column. Counts MUST update when a card is created, moved, or deleted.
- **FR-004**: Each column header MUST use a distinct accent colour. Status MUST remain identifiable by its text label, not by colour alone. Header text MUST meet WCAG AA contrast against the header background in both light and dark appearance.
- **FR-005**: The page header MUST show "Engineering Task Board", the existing one-line context, and MUST group the status filter with Refresh.
- **FR-006**: The existing status filter MUST remain. "All" shows every column. A single status shows only that column. Filtering MUST NOT change which tasks exist, only which columns are shown.
- **FR-007**: Each card MUST show the assignee as an initials chip using the rules in Edge Cases, and MUST expose the full assignee name (or "Unassigned") to assistive technology.
- **FR-008**: Each card with a valid created time MUST show a muted relative created line using the phrasing in Edge Cases.
- **FR-009**: Move and Delete MUST stay visually quiet until the card is hovered or focused. Delete MUST look secondary to Move. Both MUST be keyboard-operable with a visible focus style, and both MUST be available without hover.
- **FR-010**: Creating, moving, deleting, filtering, refreshing, and discussing a task MUST keep today's outcomes. This refresh MUST NOT add, remove, or reshape stored task information.
- **FR-011**: The new-task form MUST sit in a collapsible panel that starts collapsed on every visit. Expanding and collapsing MUST NOT discard an in-progress draft during the same visit. A successful create MUST clear the draft. Leaving the page MUST NOT remember the open state or the draft.
- **FR-012**: While the panel is collapsed, the columns MUST be the primary content on the page.
- **FR-013**: The board MUST follow the operating system's light or dark appearance and MUST NOT offer a theme switch. Text and essential controls MUST meet WCAG AA contrast in both appearances.
- **FR-014**: While tasks are loading, the board MUST show a column-like placeholder or a clear busy indicator. It MUST NOT look like a successfully loaded board with no tasks. A load failure MUST still show the current error message.
- **FR-015**: Each empty visible column MUST show the message "No tasks yet". A board with no tasks MUST be three such columns when all statuses are visible, with no separate board-level empty message.
- **FR-016**: The page MUST use one shared visual language: one set of type roles (page title, column heading, card title, body, muted text), one spacing rhythm, one colour palette (page background, card surface, primary text, muted text, divider, three column accents, and a quiet danger treatment for Delete), one corner roundness for chips and controls, one corner roundness for cards and panels, a resting shadow for cards, and a slightly stronger shadow when a card is hovered or focused. Visible colours MUST come from that palette.
- **FR-017**: A newly created card MUST fade and slide into place in under 300 milliseconds. A status change MUST adjust column height smoothly in under 300 milliseconds instead of jumping. No other interaction MUST add decorative motion.
- **FR-018**: When reduced motion is requested, card appearance and column height changes MUST be instant, with no animation.
- **FR-019**: Interactive controls MUST have a visible focus style. Column and page headings MUST be real headings in a sensible order.

### Key Entities *(include if feature involves data)*

- **Task**: Existing work item shown on a card. This feature displays title, status, assignee, and created time. It does not add fields.
- **Column**: A status lane (To Do, In Progress, or Done) with a label, accent, and live card count. Not stored separately from task status.
- **New-task panel**: A collapsible view of the existing create form. Open state and draft exist only for the current visit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a wide window, an engineer can see all three status columns and each column's card count without opening a task. On a narrow window, the same columns are stacked and still separated.
- **SC-002**: An engineer can name a card's assignee initials and approximate age from the card alone, without opening it, for every task that has an assignee and a created time.
- **SC-003**: With the new-task panel collapsed, the columns occupy the main view. A familiar engineer can expand the panel and add a task in under 30 seconds.
- **SC-004**: In both light and dark system appearance, text and column-header accents meet WCAG AA contrast, and every control shows a visible focus style.
- **SC-005**: Create, filter, move, delete, refresh, and comment actions all complete with the same results as before this refresh, verified across the existing task flows with no new stored information.
- **SC-006**: With motion allowed, a new card and a column height change each settle in under 300 milliseconds. With reduced motion requested, those updates are instant and no other decorative motion plays.
- **SC-007**: During loading, the page is recognisable as busy within one second of opening. Every empty column shows "No tasks yet".

## Assumptions

- Source is Jira EYTB-1 and the product brief for a presentation-only board refresh. Behaviour of tasks and comments stays as it is today.
- Wide layout means a window about 900 pixels wide or wider. Narrower than that, columns stack. This boundary is a layout rule, not a separate mobile product.
- The status filter stays. Removing it would change how people narrow the board, and this refresh does not change behaviour.
- Card counts appear in the column header only. There is no separate board-wide total.
- The new-task panel starts collapsed and is not remembered between visits, so the board stays primary. The draft survives only while the page stays open.
- Relative created time uses the viewer's local clock and the phrasing in Edge Cases. Older than 30 days uses a calendar date, not a vague "months ago".
- Empty columns always say "No tasks yet", including when the whole board is empty. There is no extra empty-board illustration or message.
- Motion is limited to new-card entrance and smooth column height change, each under 300 milliseconds. Duration and easing stay inside that budget; no other motion is added.
- Initials are derived only from the assignee name already on the task. No photos, directory, or user accounts are introduced.
- Column accents are distinct and meet contrast rules; exact hues are chosen during planning as long as the three statuses stay visually distinct and labels remain.
- The shared visual language is defined once and reused. One-off colours and spacing are out of scope for the finished page.
- Out of scope: dragging cards between columns (Move stays a control), a theme switch, real avatars, adding or renaming or reordering columns, new task fields, and a separate mobile layout beyond stacking columns.
- Accessibility must not get worse: heading structure, visible focus, WCAG AA contrast, and reduced-motion support are part of done.
- A familiar engineer checking light and dark appearance at wide and narrow widths can confirm the layout without a new product walkthrough. Screenshot evidence belongs with the story, not in this specification.
