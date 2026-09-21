# Feature Specification: Task Comments

**Feature Branch**: `001-task-comments`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Engineers want to discuss a task without leaving the board. Add a lightweight comment thread to each task: comment count on the card, inline thread (oldest first), author + comment form, delete a comment, cascade delete with the task. Out of scope: editing, replies, reactions, mentions, rich text, auth, notifications."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See discussion on a task (Priority: P1)

An engineer scanning the board wants to know which tasks have discussion and to read that discussion in place. Each task card shows a small comment count when the task has at least one comment. The count is not shown when there are none. Clicking the comment control expands an inline thread under the card: existing comments, oldest at the top, each showing who wrote it and roughly when it was written. A composer (author, comment text, Post) sits below the thread so the engineer can add to the conversation without leaving the board.

**Why this priority**: Awareness and reading are the reason the thread exists. Without a visible count and readable history, posting has nowhere to land for the rest of the team.

**Independent Test**: Seed or create a task that already has comments. Confirm the count appears only on that card, the thread expands in place, comments appear oldest-first with author and relative time, and a card with zero comments does not show a count but still offers a way to open the composer.

**Acceptance Scenarios**:

1. **Given** a task with three comments, **When** the engineer views the board, **Then** that card shows a comment count of 3 and cards with no comments do not show a count.
2. **Given** a task with comments, **When** the engineer clicks the comment control, **Then** an inline thread appears under the card with comments in oldest-first order, each showing author and an approximate time.
3. **Given** a task with no comments, **When** the engineer opens the comment control, **Then** the thread area is empty and the composer is visible so they can post the first comment.
4. **Given** an expanded thread, **When** the engineer clicks the comment control again, **Then** the thread collapses and the card returns to its compact form.

---

### User Story 2 - Post a comment (Priority: P2)

An engineer wants to leave a short plain-text note on a task. They open the thread, type their name as author, type a sentence or two, and press Post. The new comment appears at the bottom of the thread and the card count increases by one. They never leave the board.

**Why this priority**: Writing is the action that creates discussion. It depends on being able to open a thread (P1) but delivers the core product value.

**Independent Test**: Open a task thread, submit a valid author and body, and confirm the new comment appears oldest-last in that thread, the count increments, and a second engineer (or a refresh) still sees it.

**Acceptance Scenarios**:

1. **Given** an open thread and a filled author and comment, **When** the engineer presses Post, **Then** the comment is saved, appears at the bottom of the thread with author and time, the composer clears, and the card count increases by one.
2. **Given** an open thread with author or comment missing (or only whitespace), **When** the engineer presses Post, **Then** no comment is created, the thread is unchanged, and the engineer is told both fields are required.
3. **Given** a comment that was just posted, **When** the engineer refreshes the board, **Then** the comment and updated count are still present.

---

### User Story 3 - Remove a comment (Priority: P3)

An engineer posted something they no longer want (typo, outdated note). They delete that comment from the thread. Anyone may delete any comment; this app has no signed-in identity yet. After delete, the comment is gone, the count decreases, and if it was the last comment the count disappears from the card.

**Why this priority**: Cleanup is needed for a usable thread but the board still works without it. Editing is out of scope, so delete is the only correction path.

**Independent Test**: With at least one comment on a task, delete it from the thread and confirm it disappears, the count updates, and a refresh does not bring it back.

**Acceptance Scenarios**:

1. **Given** an expanded thread with a comment, **When** the engineer deletes that comment, **Then** it is removed immediately, the count decreases by one, and a refresh does not restore it.
2. **Given** a task whose only comment is deleted, **When** the thread and card update, **Then** the count is hidden and the composer remains available.
3. **Given** a comment that was already removed (or the task no longer exists), **When** the engineer tries to delete it, **Then** they are told the comment or task is no longer there and the board reflects current data.

---

### Edge Cases

- Engineer posts against a task that was deleted by someone else: no comment is created; they are told the task is gone; the card disappears or the board refreshes to current tasks.
- Engineer deletes a comment that was already deleted: they are told it is gone; the thread shows current comments.
- Author or body is only spaces or line breaks: treated as missing; posting is rejected.
- Author or body exceeds the length limit: posting is rejected; nothing is saved; the engineer is told the text is too long.
- Task is deleted from the board: every comment on that task is removed with it. A later task with a new identity does not inherit old comments.
- A task has many comments: the thread remains readable (scroll inside the thread if needed) without breaking column layout.
- Two people post at nearly the same time: both comments persist; after refresh the thread shows both, oldest first.
- Empty author/body on Post while the other field is filled: reject the whole post; do not save a partial comment.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to see a comment count on each task card that has at least one comment, and MUST NOT see a count when the task has zero comments.
- **FR-002**: Users MUST be able to expand and collapse an inline comment thread on a task card without leaving the board.
- **FR-003**: When a thread is open, the system MUST show that task's comments oldest first, each with author name and an approximate time of posting.
- **FR-004**: Users MUST be able to post a new comment on a task by providing an author name and plain-text body.
- **FR-005**: The system MUST reject a post when author or body is missing or only whitespace, and MUST NOT save that comment.
- **FR-006**: The system MUST reject a post when author exceeds 100 characters or body exceeds 500 characters, and MUST NOT save that comment.
- **FR-007**: After a successful post, the new comment MUST appear at the end of that task's thread and the card count MUST increase by one.
- **FR-008**: Users MUST be able to delete any comment on a task. The app has no signed-in user; the system MUST NOT restrict delete by author.
- **FR-009**: After a successful delete, that comment MUST disappear from the thread and the card count MUST decrease by one (and hide when it reaches zero).
- **FR-010**: When a user requests comments or tries to post on a task that does not exist, the system MUST treat it as not found (not as an empty thread).
- **FR-011**: When a user tries to delete a comment that does not exist, the system MUST treat it as not found.
- **FR-012**: Deleting a task MUST also remove all of its comments. Comments MUST NOT remain reachable after the task is gone.
- **FR-013**: Comments MUST be plain text only. The system MUST store and display the text as typed, without rendering markup, attachments, or rich formatting.
- **FR-014**: Comment time MUST be assigned by the system at creation. Users MUST NOT supply or edit created time.
- **FR-015**: There is no maximum number of comments per task in this version. The system MUST accept further comments as long as each comment itself is valid.
- **FR-016**: Comment threads MUST NOT support editing a comment, replies, nested threading, reactions, mentions, or notifications.

### Key Entities

- **Task**: Existing work item on the board. A task owns zero or more comments. Removing the task removes its comments.
- **Comment**: A short plain-text note on exactly one task. Attributes: author name (required, max 100 characters), body (required, max 500 characters), system-assigned created time. A comment is not edited after posting; it can only be deleted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An engineer can open a task's thread and post a valid comment in under 30 seconds without navigating away from the board.
- **SC-002**: After posting or deleting, 100% of engineers see the updated thread and count on that card without a full-page reload of the board (the card updates in place).
- **SC-003**: 100% of posts missing author or body are rejected and leave the stored comment list unchanged.
- **SC-004**: After a task is deleted, 0 comments from that task remain visible or recoverable on the board.
- **SC-005**: For every task on the board, the displayed count equals the number of comments in its thread, including hiding the count at zero.
- **SC-006**: A thread of at least 20 comments on one task remains readable (all comments reachable in oldest-first order) without preventing the engineer from using the rest of the board.

## Assumptions

- The comment control stays available on every card so an engineer can start the first comment; only the numeric count is hidden when the count is zero (empty bubble / control, not a missing control).
- "Short" means a hard limit of 500 characters on the comment body (a sentence or two). Author name follows the same 100-character ceiling already used for a task assignee.
- Approximate time means a relative phrase for recent comments (for example "just now" or "5 minutes ago") and a short date once the comment is older than a day.
- No cap on comments per task for this version (simplicity). Very long threads scroll inside the thread.
- Posting returns the engineer to an updated thread that includes the new comment, not a separate confirmation page.
- Delete is immediate, with no extra confirmation step, matching the lightweight board.
- Anyone can delete any comment because there is no authentication; this is accepted risk for this version.
- Existing task create/update/filter behaviour is unchanged except that deleting a task also removes its comments.
- The same comment behaviour is available no matter which of the three interchangeable backends is running.
- Invalid input is rejected with the board's existing "bad request" treatment; missing task or comment is rejected with the existing "not found" treatment. No new error categories.

## Out of Scope

- Editing a comment after posting
- Replies, nested threading, reactions, or @-mentions
- Rich text, attachments, or Markdown rendering
- Authentication, identity, or "comments I wrote" vs "comments others wrote"
- Notifications
- A maximum number of comments per task
- Changing how tasks themselves are created, moved, or listed (except cascade delete of comments)
