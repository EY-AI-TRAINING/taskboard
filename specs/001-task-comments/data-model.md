# Data Model: Task Comments

## Entity: Comment

A short plain-text note attached to exactly one Task. Immutable after create
(no edit). Deleted independently or with its parent task.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | integer, identity | yes (system) | Primary key |
| `task_id` | integer | yes | FK → `tasks.id`, `ON DELETE CASCADE` |
| `author` | string | yes | Trimmed; length 1–100 |
| `body` | string | yes | Trimmed; length 1–500; stored and shown as plain text |
| `created_at` | timestamp | yes (system) | `DEFAULT NOW()`; never set by the client |

No `updated_at`. Comments are not edited.

## Entity: Task (existing, extended)

Unchanged columns. List/get API representation gains:

| Field | Type | Rules |
|-------|------|-------|
| `commentCount` / `comment_count` | integer ≥ 0 | Count of comments for this task; `0` when none |

Deleting a task removes all of its comments (database cascade). Recreating a
task gets a new id and therefore an empty thread.

## Relationships

```text
Task 1 ──< Comment
```

- A task has zero or more comments.
- A comment belongs to exactly one task.
- Orphan comments MUST NOT exist.

## Validation (service layer)

| Rule | Failure |
|------|---------|
| Task exists on GET/POST comments | not found |
| Task exists and comment belongs to that task on DELETE | not found |
| Author present after trim | bad request |
| Body present after trim | bad request |
| Author length ≤ 100 | bad request |
| Body length ≤ 500 | bad request |
| Client-supplied `created_at` / `id` | ignored (not accepted as input) |

## Ordering

Comments for a task are ordered `created_at` ascending, then `id` ascending
(oldest first; stable for identical timestamps).

## State transitions

Comments have no status field.

- **Created** → stored; appears at the end of that task's thread.
- **Deleted** → removed; not recoverable. No tombstone.

## Indexes

- Primary key on `comments.id`
- Index on `comments.task_id` (thread lookup and count aggregation)
