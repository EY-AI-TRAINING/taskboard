# Use Case — Engineering Task Board

## The scenario

A EY software engineering team runs its work on a lightweight Kanban
board: every piece of work is a **task** that moves through three columns —
**To Do → In Progress → Done**. The team wants a small internal tool instead of
a spreadsheet: a REST API plus a web board.

This is the running application for the whole programme. Each later module
layers a real engineering capability onto it (auth and reviews in Module 02,
search and analytics in Module 03, spec-driven sprint planning in Module 04),
so the codebase you build here is the one you keep evolving.

Module 01 deliberately keeps the domain trivial. The learning is not "how to
model a task board" — it is **how an AI Champion drives a full-stack feature
from empty folder to running, tested code**, and how to talk about that work
in the shared vocabulary the programme establishes: implementation cycle time,
quality and regression risk, review effort, and token/AI cost.

## Actors

| Actor | Interest |
|-------|----------|
| Engineer | Creates tasks, moves them across columns, deletes stale ones |
| Team lead | Scans the board by status to see where work is stuck |

## Data model

One table. It is defined once, in `database/schema.sql`, and all three backends map
onto it — no backend creates or migrates schema.

```sql
CREATE TABLE tasks (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(50) NOT NULL DEFAULT 'todo'
                CHECK (status IN ('todo', 'in-progress', 'done')),
    assignee    VARCHAR(100),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()   -- kept current by a trigger
);
```

| Field | Rules |
|-------|-------|
| `title` | Required, 1–255 chars |
| `description` | Optional free text |
| `status` | One of `todo`, `in-progress`, `done`; defaults to `todo` |
| `assignee` | Optional, ≤100 chars |
| `created_at` / `updated_at` | Set by the database, never by the client |

## API contract

Base path `/api/tasks`. JSON in, JSON out.

| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| GET | `/api/tasks` | – | `200` array of tasks (includes `commentCount`) | `422` unknown `?status=` |
| GET | `/api/tasks?status=todo` | – | `200` filtered array | `422` unknown status |
| GET | `/api/tasks/{id}` | – | `200` task | `404` not found |
| POST | `/api/tasks` | `{title, description?, status?, assignee?}` | `201` created task | `422` missing title / bad status |
| PUT | `/api/tasks/{id}` | `{title, description?, status, assignee?}` | `200` updated task | `404`, `422` |
| DELETE | `/api/tasks/{id}` | – | `204` no content (comments cascade) | `404` not found |
| GET | `/api/tasks/{id}/comments` | – | `200` array, oldest first | `404` task not found |
| POST | `/api/tasks/{id}/comments` | `{author, body}` | `201` created comment | `404` task not found; `422` blank/too-long author or body |
| DELETE | `/api/tasks/{id}/comments/{commentId}` | – | `204` no content | `404` task or comment not found |

Plus `GET /health` → `200 {"status":"ok"}` on every backend.

### Example

`curl` ships with macOS, current Linux, and Windows 10+. On one line it works
in bash, zsh, and PowerShell alike:

```
curl -X POST http://localhost:8000/api/tasks -H "Content-Type: application/json" -d "{\"title\":\"Wire up the board UI\",\"assignee\":\"Ana\"}"
```

```jsonc
// 201 Created
{
  "id": 7, "title": "Wire up the board UI", "description": null,
  "status": "todo", "assignee": "Ana",
  "createdAt": "2026-08-31T10:15:00", "updatedAt": "2026-08-31T10:15:00"
}
```

(The Python backend returns the timestamp keys as `created_at` / `updated_at`;
.NET and Java use `createdAt` / `updatedAt`. The board UI does not depend on
either.)

## Architecture

All three backends use the same three layers, so the shape transfers between
stacks:

```
HTTP  ─▶  Controller / Router   (translate HTTP <-> domain, map errors to codes)
      ─▶  Service               (validation, business rules)
      ─▶  Repository            (all database access lives here)
      ─▶  PostgreSQL (tasks)
```

The React app has its own thin layering: `components` (presentational) →
`pages` (state + data fetching) → `services` (all HTTP in one place).
