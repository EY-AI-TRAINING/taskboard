# Implementation Plan: Task Comments

**Branch**: `feat/task-comments` (`001-task-comments`) | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-task-comments/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Engineers discuss a task on the board: comment count on each card, inline
oldest-first thread, post (author + body), delete any comment, cascade delete
with the task.

Technical approach: add a `comments` table in `database/schema.sql` with
`ON DELETE CASCADE`; expose nested REST
`/api/tasks/{taskId}/comments` on all three backends (Controller → Service →
Repository); include `commentCount` on task list/get; extend the React board
(presentational card + `BoardPage` state + `taskService.js`) with plain CSS.

## Technical Context

**Language/Version**: Python 3.11+, .NET 8, Java 21, JavaScript (React 19 / Vite)

**Primary Dependencies**: FastAPI + SQLAlchemy (async); ASP.NET Core + EF Core
(Npgsql); Spring Boot + Spring Data JPA; React 19, React Router, Axios, Vitest

**Storage**: PostgreSQL 15+; schema owned by `database/schema.sql` only

**Testing**: pytest + httpx; xUnit + WebApplicationFactory; JUnit 5 + MockMvc;
Vitest + Testing Library. In-memory / fakes only — no real database in tests.

**Target Platform**: Local web app (frontend :5173, one backend :8000 / :5088 /
:8080)

**Project Type**: Web application (React SPA + three interchangeable REST
backends)

**Performance Goals**: Open thread and post in under 30 seconds (SC-001); card
updates in place (SC-002); thread of ≥20 comments remains readable (SC-006)

**Constraints**: Layered architecture; identical REST contract across backends
(timestamp key casing excepted); error codes only `404` / `422` for these
cases; no CSS framework; no auth; no comment edit/replies; DB sets
`created_at`

**Scale/Scope**: Training Kanban (seed-scale tasks); unbounded comments per
task in v1; one new table; three backends + frontend + schema/seed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | How this plan complies |
|------|--------|------------------------|
| I. Layered Architecture | PASS | Comment SQL only in repositories. Validation in services. Controllers map `TaskNotFound` / validation errors to 404/422. Frontend: `TaskCard` presentational; `BoardPage` fetches; HTTP only in `taskService.js`. |
| II. Shared REST Contract | PASS | Same paths, status codes, and JSON fields on Python/.NET/Java. Only allowed drift: snake_case vs camelCase keys. |
| III. Test-First Endpoints | PASS | New comment routes are not done until tests cover happy path, 404 missing task/comment, 422 blank or over-length author/body. Fakes/fixtures only. |
| IV. Single Schema Ownership | PASS | New `comments` table and FK cascade only in `database/schema.sql`. No EF migrations, `create_all()`, or `ddl-auto` other than `none`. `created_at` is DB default. |
| V. Simplicity | PASS | Nested under existing `/api/tasks`; extend `taskService.js` and `index.css`; no new error codes, frameworks, or out-of-scope features (edit, replies, auth). New Comment service/repository files are the existing entity pattern, not extra architecture. |
| Error contract | PASS | 404 missing resource; 422 bad body. No 400/403/409. |
| Quality gates | PASS | `dotnet test`, `pytest`, `./mvnw -B test`, `npm test -- --run` must pass. |

Post-design re-check: still PASS. Contracts, data model, and quickstart do not
skip layers, fork the JSON shape, or move schema out of `schema.sql`.

## Project Structure

### Documentation (this feature)

```text
specs/001-task-comments/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── comments-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
database/
├── schema.sql           # ADD comments table + FK ON DELETE CASCADE + index
└── seed.sql             # ADD sample comments; TRUNCATE already CASCADE

backend-python/
├── models/              # ADD comment mapping
├── schemas/             # ADD comment request/response; EXTEND task read with comment_count
├── repositories/        # ADD comment repository; EXTEND task list/get with counts
├── services/            # ADD comment service (validate author/body; 404 missing task)
├── routers/tasks.py     # EXTEND nested /{task_id}/comments
└── tests/               # ADD comment API + service tests; EXTEND fake repo

backend-dotnet/src/TaskBoard.Api/
├── Models/              # ADD CommentItem + DTOs; EXTEND TaskResponse.CommentCount
├── Data/TaskBoardContext.cs
├── Repositories/        # ADD comment repository
├── Services/            # ADD comment service
└── Controllers/TasksController.cs   # nested comments actions
backend-dotnet/tests/TaskBoard.Api.Tests/

backend-java/src/main/java/com/honeywell/taskboard/
├── model/               # ADD CommentItem
├── dto/                 # ADD comment DTOs; EXTEND TaskResponse
├── repository/
├── service/
└── web/TaskController.java
backend-java/src/test/java/com/honeywell/taskboard/

frontend/src/
├── services/taskService.js          # ADD list/create/delete comments
├── pages/BoardPage.jsx              # expand state, fetch, post, delete, counts
├── components/TaskCard.jsx          # count control, thread, composer (presentational)
├── components/TaskList.jsx          # pass comment callbacks
├── index.css                        # thread + count styles
└── **/__tests__/                    # card, service, and page behaviour
```

**Structure Decision**: Existing web-app layout (three backends + `frontend/` +
`database/`). No new top-level projects. Comments nest under current task HTTP
modules; persistence gets a Comment repository/service pair per stack so SQL
and validation stay in the right layers.

## Complexity Tracking

> No constitution violations. Table left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
