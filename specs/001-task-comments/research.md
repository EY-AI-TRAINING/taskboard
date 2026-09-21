# Research: Task Comments

## 1. Resource shape and URL layout

**Decision**: Nested comments under the existing task resource.

| Method | Path | Success |
|--------|------|---------|
| GET | `/api/tasks/{taskId}/comments` | `200` array, oldest first |
| POST | `/api/tasks/{taskId}/comments` | `201` created comment |
| DELETE | `/api/tasks/{taskId}/comments/{commentId}` | `204` no content |

**Rationale**: Comments belong to a task. Nesting matches the domain, reuses
`/api/tasks` (edit existing routers/controllers), and avoids a second top-level
collection. POST returns the created comment, same as `POST /api/tasks`.

**Alternatives considered**:

- Top-level `/api/comments?taskId=` — extra resource root, weaker locality.
- Embed full comments on `GET /api/tasks` — list payload grows with every
  comment; board only needs a count until a thread is opened.

## 2. Comment count on the board

**Decision**: Add `commentCount` (Python: `comment_count`) to each task in
`GET /api/tasks` and `GET /api/tasks/{id}`. Do not embed the comment list on
those responses.

**Rationale**: Cards must show a count without N+1 fetches (SC-005, SC-001).
A single aggregated field is the smallest contract change. Thread contents load
only when the engineer opens a card.

**Alternatives considered**:

- Per-card `GET .../comments` on board load — N+1, too chatty.
- Separate count endpoint per task — still N+1.
- Omit count from the API and count client-side — impossible without loading
  every comment.

## 3. Missing task vs empty thread

**Decision**: `GET`/`POST` `/api/tasks/{taskId}/comments` returns `404` when
the task does not exist. A real task with zero comments returns `200 []`.

**Rationale**: Spec FR-010 and the constitution error contract (`404` missing
id). An empty array would hide a deleted task.

**Alternatives considered**: `200 []` for a missing task — rejected by the spec.

## 4. Cascade delete

**Decision**: `task_id` foreign key `REFERENCES tasks(id) ON DELETE CASCADE` in
`database/schema.sql`. Application code keeps today's task-delete path; the
database removes comments.

**Rationale**: Single schema ownership; all three ORMs inherit cascade without
custom delete loops. Fake in-memory test repos MUST still drop comments when a
task is deleted so tests prove FR-012.

**Alternatives considered**: Application-level delete of comments first —
duplicates logic across three backends and can leave orphans if skipped.

## 5. Layering and files

**Decision**: New Comment entity + Comment repository + Comment service on each
backend. HTTP handlers live on the existing task controller/router (nested
paths). Frontend HTTP helpers are added to `frontend/src/services/taskService.js`.
Comment UI stays presentational in `TaskCard` (or a small child used by it);
`BoardPage` owns expand state and fetching.

**Rationale**: Constitution I (no layer-skipping) and V (prefer editing existing
files for HTTP and frontend service). A dedicated Comment service/repository is
justified because comments are a second entity with their own validation; stuffing
them into TaskService would mix rules.

**Alternatives considered**:

- New `commentService.js` — extra file when `taskService.js` already owns
  `/api/tasks`.
- TaskCard calling Axios — forbidden by constitution.

## 6. Validation and error codes

**Decision**: Trim author and body, then require non-empty. Author max 100,
body max 500. Failures → `422`. Missing task or comment (including a comment id
that does not belong to that task) → `404`. No new status codes. No update
endpoint.

**Rationale**: Mirrors missing title / unknown status. Whitespace-only is
missing (spec edge case). Wrong-task comment id must not leak the comment.

**Alternatives considered**: `400` for validation — would invent a code the
constitution forbids. `403` on delete — no auth in this app (FR-008).

## 7. Timestamps and display order

**Decision**: `created_at` is database-default only; clients MUST NOT send it.
List `ORDER BY created_at ASC, id ASC`. Relative labels ("just now", "5 minutes
ago", short date after a day) are computed in the frontend. Python keeps
snake_case timestamp keys; .NET/Java keep camelCase — same exception as tasks.

**Rationale**: Constitution IV (DB owns timestamps). Stable id tie-break avoids
reorder when two comments share a timestamp. No new date library.

**Alternatives considered**: Backend-formatted relative strings — couples API
to UI locale. `updated_at` on comments — unused because comments are immutable.

## 8. Schema change process

**Decision**: Edit `database/schema.sql` and `database/seed.sql` only. Do not
add EF/Flyway/Alembic migrations or a new file under `database/migrations/`.

**Rationale**: Constitution IV. The existing `database/migrations/001_create_tasks.sql`
is historical; new tables go in `schema.sql`.

## 9. Frontend interaction

**Decision**: Every card shows a comment control; the numeric count is hidden
at zero. Click toggles an inline thread. Opening a thread fetches comments for
that task. Post/delete update local thread + `commentCount` on that card
without a full board reload. Delete comment has no confirm dialog. Plain CSS
in `index.css` only.

**Rationale**: Spec assumptions and SC-002. Keep TaskCard presentational via
callbacks from BoardPage.

**Alternatives considered**: Fetch comments for all tasks up front — unnecessary
payload. CSS framework — forbidden.
