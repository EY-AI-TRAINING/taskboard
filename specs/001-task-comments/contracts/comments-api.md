# Contract: Task Comments API

Shared by Python, .NET, and Java. Timestamp key casing MAY differ
(`created_at` / `task_id` / `comment_count` vs `createdAt` / `taskId` /
`commentCount`). No other JSON shape divergence.

Error contract (unchanged):

- `404` — missing task or missing comment (including comment id not on that task)
- `422` — missing/blank author or body, or length exceeded

## Task representation (extended)

Existing task objects from `GET /api/tasks` and `GET /api/tasks/{id}` MUST
include a comment count. All other task fields stay as they are.

```jsonc
{
  "id": 3,
  "title": "Build the React board UI",
  "description": "Three columns…",
  "status": "in-progress",
  "assignee": "Ana",
  "commentCount": 2,
  "createdAt": "2026-08-31T10:15:00",
  "updatedAt": "2026-08-31T10:15:00"
}
```

`commentCount` is `0` when the task has no comments. List and get MUST NOT
embed the comment array.

## Comment representation

```jsonc
{
  "id": 1,
  "taskId": 3,
  "author": "Ana",
  "body": "Schema change is in review.",
  "createdAt": "2026-09-21T09:00:00"
}
```

POST body (create): `{ "author": string, "body": string }` only.

## Endpoints

| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| GET | `/api/tasks/{taskId}/comments` | – | `200` array, oldest first | `404` task missing |
| POST | `/api/tasks/{taskId}/comments` | `{author, body}` | `201` created comment | `404` task missing; `422` blank/too-long author or body |
| DELETE | `/api/tasks/{taskId}/comments/{commentId}` | – | `204` no content | `404` task or comment missing |

Existing task endpoints keep their current status codes. `DELETE /api/tasks/{id}`
remains `204`; comments for that task are gone afterward (`GET .../comments`
then returns `404` because the task is gone).

### GET `/api/tasks/{taskId}/comments`

- Task exists, no comments → `200` `[]` (not `404`).
- Task missing → `404`.
- Order: `created_at ASC`, `id ASC`.

### POST `/api/tasks/{taskId}/comments`

- Persist trimmed author/body; ignore extra fields.
- Do not accept client `id` or `createdAt`.
- Response is the created comment, not the full thread.

### DELETE `/api/tasks/{taskId}/comments/{commentId}`

- Comment must exist **and** belong to `taskId`; otherwise `404`.
- No author check (no auth).

## Example

```
curl -X POST http://localhost:8000/api/tasks/3/comments \
  -H "Content-Type: application/json" \
  -d "{\"author\":\"Ana\",\"body\":\"Need a second look at the filter.\"}"
```

```jsonc
// 201 Created
{
  "id": 1,
  "taskId": 3,
  "author": "Ana",
  "body": "Need a second look at the filter.",
  "createdAt": "2026-09-21T09:00:00"
}
```
