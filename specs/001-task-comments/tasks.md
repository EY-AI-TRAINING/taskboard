# Tasks: Task Comments

**Input**: Design documents from `/specs/001-task-comments/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included. Constitution III (test-first endpoints) and the plan require happy path, `404` missing id, and `422` bad body before an endpoint is done. Suites MUST use existing in-memory/fakes — no real database.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Schema: `database/`
- Python: `backend-python/`
- .NET: `backend-dotnet/src/TaskBoard.Api/` and `backend-dotnet/tests/TaskBoard.Api.Tests/`
- Java: `backend-java/src/main/java/com/honeywell/taskboard/` and `backend-java/src/test/java/com/honeywell/taskboard/`
- Frontend: `frontend/src/`

Constraints quoted from `data-model.md`: author is **Trimmed; length 1–100**; body is **Trimmed; length 1–500**; `created_at` is **`DEFAULT NOW()`; never set by the client**; `task_id` is **FK → `tasks.id`, `ON DELETE CASCADE`**; list order is **`created_at` ascending, then `id` ascending**.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema and seed so every stack maps onto the same table

- [x] T001 Add `comments` table to `database/schema.sql` with `id SERIAL PRIMARY KEY`, `task_id INTEGER NOT NULL` **FK → `tasks.id`, `ON DELETE CASCADE`**, `author VARCHAR(100) NOT NULL`, `body VARCHAR(500) NOT NULL`, `created_at TIMESTAMP NOT NULL DEFAULT NOW()` (**never set by the client**), and index on `task_id`. Do not add EF/Flyway/Alembic migrations or a new file under `database/migrations/`.
- [x] T002 Insert sample comments in `database/seed.sql` on at least one existing seeded task (enough to demo a count of 2+ and oldest-first order). Keep `TRUNCATE TABLE tasks RESTART IDENTITY CASCADE` so comments are cleared with tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Comment persistence, DTOs, fakes, and DI. No user story work until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create SQLAlchemy `Comment` mapping (not schema definition) in `backend-python/models/comment.py` with `id`, `task_id`, `author`, `body`, `created_at` server default; columns must match `database/schema.sql`.
- [x] T004 [P] Create `CommentItem` entity in `backend-dotnet/src/TaskBoard.Api/Models/CommentItem.cs` (`Id`, `TaskId`, `Author`, `Body`, `CreatedAt`).
- [x] T005 [P] Create JPA `CommentItem` in `backend-java/src/main/java/com/honeywell/taskboard/model/CommentItem.java` mapped to table `comments` with `created_at` insertable/updatable false and DB-generated on insert (same pattern as `TaskItem`).
- [x] T006 Map `DbSet<CommentItem>` and **FK → `tasks.id`, `ON DELETE CASCADE`** in `backend-dotnet/src/TaskBoard.Api/Data/TaskBoardContext.cs` (`created_at` ValueGeneratedOnAdd, column names snake_case). Do not enable EF migrations.
- [x] T007 [P] Add `CommentCreate` / `CommentRead` in `backend-python/schemas/comment.py`: author **Trimmed; length 1–100**, body **Trimmed; length 1–500**; do not accept client `id` or `created_at`.
- [x] T008 [P] Add `CreateCommentRequest` / `CommentResponse` in `backend-dotnet/src/TaskBoard.Api/Models/CommentDtos.cs`: author **Trimmed; length 1–100**, body **Trimmed; length 1–500**; `CommentResponse` fields `Id`, `TaskId`, `Author`, `Body`, `CreatedAt`.
- [x] T009 [P] Add `CreateCommentRequest` / `CommentResponse` in `backend-java/src/main/java/com/honeywell/taskboard/dto/CreateCommentRequest.java` and `CommentResponse.java`: author **Trimmed; length 1–100**, body **Trimmed; length 1–500**.
- [x] T010 [P] Add `comment_count: int` to `TaskRead` in `backend-python/schemas/task.py`.
- [x] T011 [P] Add `CommentCount` to `TaskResponse` in `backend-dotnet/src/TaskBoard.Api/Models/TaskDtos.cs` and update `From`.
- [x] T012 [P] Add `commentCount` to `TaskResponse` in `backend-java/src/main/java/com/honeywell/taskboard/dto/TaskResponse.java` and update `from`.
- [x] T013 [P] Implement `CommentRepository` in `backend-python/repositories/comment_repository.py`: list-by-task **`created_at` ascending, then `id` ascending**, get, add (flush/refresh so DB sets `created_at`), delete, count-by-task. SQL only here.
- [x] T014 Implement `ICommentRepository` / `CommentRepository` in `backend-dotnet/src/TaskBoard.Api/Repositories/ICommentRepository.cs` and `CommentRepository.cs` (same operations and order as T013); register both plus a comment service stub in `backend-dotnet/src/TaskBoard.Api/Program.cs`.
- [x] T015 [P] Implement `CommentRepository` in `backend-java/src/main/java/com/honeywell/taskboard/repository/CommentRepository.java` (`JpaRepository` + list-by-`taskId` ordered **`created_at` ascending, then `id` ascending**, count-by-task).
- [x] T016 Extend `FakeTaskRepository` in `backend-python/tests/conftest.py` so deleting a task also removes its comments (**`ON DELETE CASCADE`**), and add a list-backed `FakeCommentRepository` with the same async surface as T013 (in-memory `created_at` / ids; no PostgreSQL).
- [x] T017 Wire `get_comment_repository` / `get_comment_service` in `backend-python/dependencies.py` and allow test override the same way as tasks.
- [x] T018 [P] Add `CommentNotFound` in `backend-python/services/errors.py` (router will map to 404).
- [x] T019 [P] Add `CommentNotFoundException` in `backend-dotnet/src/TaskBoard.Api/Services/TaskExceptions.cs` (or a sibling exceptions file).
- [x] T020 [P] Add `CommentNotFoundException` in `backend-java/src/main/java/com/honeywell/taskboard/service/CommentNotFoundException.java` and map it to HTTP 404 in `backend-java/src/main/java/com/honeywell/taskboard/web/ApiExceptionHandler.java`. Do not add new status codes.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - See discussion on a task (Priority: P1) 🎯 MVP

**Goal**: Card comment count (hidden at zero, control still visible), expand/collapse inline thread, oldest-first comments with author and time, empty thread still shows the composer.

**Independent Test**: Seed or fake a task with three comments and one with zero. Board shows count 3 only on the first card; expand shows oldest-first author + time; empty task opens composer with no count; collapse returns the card to compact form. `GET /api/tasks/999/comments` is 404, not `[]`.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T021 [P] [US1] Add GET `/api/tasks/{taskId}/comments` tests in `backend-python/tests/test_comments_api.py`: 200 oldest-first, 200 `[]` when the task exists with no comments, 404 when the task is missing. Name tests for behaviour. Use `fake_repo` / fake comments — no real database.
- [x] T022 [P] [US1] Add the same GET cases in `backend-dotnet/tests/TaskBoard.Api.Tests/CommentsControllerTests.cs` (xUnit; mock service; happy, empty list, 404 missing task).
- [x] T023 [P] [US1] Add the same GET cases in `backend-java/src/test/java/com/honeywell/taskboard/web/TaskControllerTest.java` (or a new `Comment` controller test next to it) with MockMvc + `ApiExceptionHandler`.
- [x] T024 [P] [US1] Assert `GET /api/tasks` and `GET /api/tasks/{id}` include `comment_count` in `backend-python/tests/test_tasks_api.py`.
- [x] T025 [P] [US1] Assert `CommentCount` on list/get in `backend-dotnet/tests/TaskBoard.Api.Tests/TasksControllerTests.cs`.
- [x] T026 [P] [US1] Assert `commentCount` on list/get in `backend-java/src/test/java/com/honeywell/taskboard/web/TaskControllerTest.java`.
- [x] T027 [P] [US1] Extend `frontend/src/components/__tests__/TaskCard.test.jsx`: count hidden at 0 but comment control present; count 3 visible; expand shows oldest-first author/body; collapse hides the thread.

### Implementation for User Story 1

- [x] T028 [P] [US1] Implement list-comments in `backend-python/services/comment_service.py`: if task missing raise `TaskNotFound`; return comments **`created_at` ascending, then `id` ascending**. No SQL. Add service tests in `backend-python/tests/test_comment_service.py`.
- [x] T029 [P] [US1] Implement `ICommentService` / `CommentService` list in `backend-dotnet/src/TaskBoard.Api/Services/ICommentService.cs` and `CommentService.cs` (404 via `TaskNotFoundException`); add `backend-dotnet/tests/TaskBoard.Api.Tests/CommentServiceTests.cs`.
- [x] T030 [P] [US1] Implement `CommentService` / `CommentServiceImpl` list in `backend-java/src/main/java/com/honeywell/taskboard/service/CommentService.java` and `CommentServiceImpl.java`; add `backend-java/src/test/java/com/honeywell/taskboard/service/CommentServiceImplTest.java`.
- [x] T031 [US1] Add GET `/api/tasks/{task_id}/comments` on `backend-python/routers/tasks.py` (HTTP mapping only: 200 array, 404 `TaskNotFound`). Map `CommentRead` with `task_id` / `created_at` snake_case.
- [x] T032 [US1] Add GET `/api/tasks/{id}/comments` on `backend-dotnet/src/TaskBoard.Api/Controllers/TasksController.cs` (200 / 404 only).
- [x] T033 [US1] Add GET `/api/tasks/{id}/comments` on `backend-java/src/main/java/com/honeywell/taskboard/web/TaskController.java` (200 / 404 only).
- [x] T034 [P] [US1] Populate `comment_count` in Python task list/get via repository aggregation in `backend-python/repositories/task_repository.py` and `backend-python/services/task_service.py` / `backend-python/schemas/task.py` (keep SQL in the repository).
- [x] T035 [P] [US1] Populate `CommentCount` in `backend-dotnet/src/TaskBoard.Api/Repositories/TaskRepository.cs` and `backend-dotnet/src/TaskBoard.Api/Services/TaskService.cs` / `TaskDtos.cs`.
- [x] T036 [P] [US1] Populate `commentCount` in Java task list/get (`backend-java/src/main/java/com/honeywell/taskboard/repository/TaskRepository.java` and `backend-java/src/main/java/com/honeywell/taskboard/service/TaskServiceImpl.java`) without putting SQL in the controller.
- [x] T037 [P] [US1] Add `listComments(taskId)` in `frontend/src/services/taskService.js` calling `GET /api/tasks/{id}/comments` and cover it in `frontend/src/services/__tests__/taskService.test.js`.
- [x] T038 [US1] Add presentational comment control, optional numeric count, expand/collapse thread, and visible composer (no post wiring yet) in `frontend/src/components/TaskCard.jsx`. Read `commentCount` or `comment_count`. Do not call Axios from the card.
- [x] T039 [US1] Own expanded-task id and comments-by-task in `frontend/src/pages/BoardPage.jsx`; fetch on expand via `taskService.listComments`; pass data/callbacks through `frontend/src/components/TaskList.jsx`.
- [x] T040 [US1] Add count-control and scrollable thread styles (support ≥20 comments without breaking columns) in `frontend/src/index.css` only — no CSS framework.

**Checkpoint**: User Story 1 is fully functional and testable independently (seeded comments + GET + board thread)

---

## Phase 4: User Story 2 - Post a comment (Priority: P2)

**Goal**: Engineer posts author + body; new comment appears at the bottom; count increments; invalid posts are rejected and not saved.

**Independent Test**: Open a thread, post valid author/body → 201, comment last in thread, count +1, composer clears, refresh still shows it. Blank/whitespace or over-length fields → 422, thread unchanged. Missing task → 404.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T041 [P] [US2] Add POST tests in `backend-python/tests/test_comments_api.py`: 201 returns the created comment (not the full thread); 404 missing task; 422 when author or body is missing or only whitespace; 422 when author exceeds length 1–100 or body exceeds length 1–500; client `created_at` is ignored.
- [x] T042 [P] [US2] Add the same POST cases in `backend-dotnet/tests/TaskBoard.Api.Tests/CommentsControllerTests.cs` and `CommentServiceTests.cs`.
- [x] T043 [P] [US2] Add the same POST cases in `backend-java/src/test/java/com/honeywell/taskboard/web/TaskControllerTest.java` and `service/CommentServiceImplTest.java`.
- [x] T044 [P] [US2] Extend `frontend/src/components/__tests__/TaskCard.test.jsx`: Post with empty/whitespace fields does not call `onPost`; valid author+body calls `onPost` with trimmed values.

### Implementation for User Story 2

- [x] T045 [P] [US2] Implement create in `backend-python/services/comment_service.py`: trim then require author **length 1–100** and body **length 1–500**; missing task → `TaskNotFound`; never persist client `created_at` / `id`. Map validation failures to 422 in `backend-python/routers/tasks.py`.
- [x] T046 [P] [US2] Implement create in `backend-dotnet/src/TaskBoard.Api/Services/CommentService.cs` with the same trim/length/404 rules; controller maps bad body to 422.
- [x] T047 [P] [US2] Implement create in `backend-java/src/main/java/com/honeywell/taskboard/service/CommentServiceImpl.java` with the same rules; `@Valid` + handler already map to 422 — still trim whitespace in the service so spaces-only is rejected.
- [x] T048 [US2] Add POST `/api/tasks/{task_id}/comments` in `backend-python/routers/tasks.py` (`201` + `CommentRead`).
- [x] T049 [US2] Add POST `/api/tasks/{id}/comments` in `backend-dotnet/src/TaskBoard.Api/Controllers/TasksController.cs` (`201`).
- [x] T050 [US2] Add POST `/api/tasks/{id}/comments` in `backend-java/src/main/java/com/honeywell/taskboard/web/TaskController.java` (`201`).
- [x] T051 [US2] Add `createComment(taskId, {author, body})` in `frontend/src/services/taskService.js` and tests in `frontend/src/services/__tests__/taskService.test.js`.
- [x] T052 [US2] Wire composer Post in `frontend/src/pages/BoardPage.jsx` / `TaskCard.jsx`: append comment at end of that thread, increment that card’s count, clear the form, do not full-page-reload the board; show a required-fields error on reject.

**Checkpoint**: User Stories 1 AND 2 both work independently (read + post)

---

## Phase 5: User Story 3 - Remove a comment (Priority: P3)

**Goal**: Delete any comment; count decreases and hides at zero; missing comment/task is 404; deleting a task removes its comments.

**Independent Test**: Delete a comment → gone, count -1, refresh does not restore. Delete last comment → count hidden, composer remains. Delete unknown id → 404. Delete a task → `GET .../comments` is 404 (task gone), no orphan comments.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T053 [P] [US3] Add DELETE tests in `backend-python/tests/test_comments_api.py`: 204 success; 404 missing comment; 404 when `commentId` exists but not on that `taskId`; 404 missing task. Add a test that deleting a task via existing delete endpoint leaves no comments for that id (fake **`ON DELETE CASCADE`**).
- [x] T054 [P] [US3] Add the same DELETE / cascade cases in `backend-dotnet/tests/TaskBoard.Api.Tests/CommentsControllerTests.cs` and `CommentServiceTests.cs`.
- [x] T055 [P] [US3] Add the same DELETE / cascade cases in `backend-java/src/test/java/com/honeywell/taskboard/web/TaskControllerTest.java` and `service/CommentServiceImplTest.java`.
- [x] T056 [P] [US3] Extend `frontend/src/components/__tests__/TaskCard.test.jsx`: delete control calls `onDeleteComment` with the comment; no confirm dialog.

### Implementation for User Story 3

- [x] T057 [P] [US3] Implement delete in `backend-python/services/comment_service.py`: comment must exist **and** belong to `taskId`, else `CommentNotFound` or `TaskNotFound`; no author check.
- [x] T058 [P] [US3] Implement delete in `backend-dotnet/src/TaskBoard.Api/Services/CommentService.cs` with the same ownership rule.
- [x] T059 [P] [US3] Implement delete in `backend-java/src/main/java/com/honeywell/taskboard/service/CommentServiceImpl.java` with the same ownership rule.
- [x] T060 [US3] Add DELETE `/api/tasks/{task_id}/comments/{comment_id}` in `backend-python/routers/tasks.py` (`204` / `404`).
- [x] T061 [US3] Add DELETE `/api/tasks/{id}/comments/{commentId}` in `backend-dotnet/src/TaskBoard.Api/Controllers/TasksController.cs` (`204` / `404`).
- [x] T062 [US3] Add DELETE `/api/tasks/{id}/comments/{commentId}` in `backend-java/src/main/java/com/honeywell/taskboard/web/TaskController.java` (`204` / `404`).
- [x] T063 [US3] Add `deleteComment(taskId, commentId)` in `frontend/src/services/taskService.js` and tests in `frontend/src/services/__tests__/taskService.test.js`.
- [x] T064 [US3] Wire delete in `frontend/src/pages/BoardPage.jsx` / `TaskCard.jsx`: remove from thread immediately, decrement count, hide the number at zero, keep the comment control; no extra confirm step.
- [x] T065 [US3] Confirm existing `DELETE /api/tasks/{id}` still returns 204 and that Python fake + EF/JPA mappings honour **`ON DELETE CASCADE`** so comments are not reachable after task delete (`backend-python/tests/conftest.py`, `TaskBoardContext.cs`, `CommentItem.java`).

**Checkpoint**: All user stories independently functional (read, post, delete, cascade)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Display, docs, and full-suite validation

- [x] T066 [P] Format approximate times in `frontend/src/components/TaskCard.jsx` (relative “just now” / “5 minutes ago”; short date after a day). No new date library.
- [x] T067 [P] Document the nested comment endpoints and `commentCount` in `docs/usecase.md` (same table style as existing `/api/tasks`; note snake_case vs camelCase).
- [x] T068 [P] Mention comments in `README.md` API table only as needed for the shared contract — do not add unrelated docs.
- [x] T069 Run all four suites: `backend-dotnet` `dotnet test`, `backend-python` `pytest`, `backend-java` `./mvnw -B test`, `frontend` `npm test -- --run`, then walk `specs/001-task-comments/quickstart.md` HTTP checks against one live backend.
- [x] T070 Review against constitution: no layer-skipping, no new HTTP codes, schema only in `database/schema.sql`, frontend HTTP only in `taskService.js`, plain CSS only in `index.css`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 (table exists for mappings). BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - Sequential default: US1 → US2 → US3 (POST/DELETE sit on the same controllers as GET)
  - After Phase 2, the three backends can be staffed in parallel within a story (`[P]` tasks)
- **Polish (Phase 6)**: Depends on US1–US3 for T069; T066 can start after US1 UI (T038)

### User Story Dependencies

- **User Story 1 (P1)**: After Phase 2 only. MVP.
- **User Story 2 (P2)**: After Phase 2; reuses US1 thread UI and GET. Independently testable via POST API + form even if you skip polish.
- **User Story 3 (P3)**: After Phase 2; delete control on the US1 thread. Cascade is schema-level (T001) plus fake/mapping (T016/T065).

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Services before controllers (validation in service, HTTP mapping only in controller)
- Repository already in Phase 2 — stories must not add SQL in controllers/services
- Frontend: `taskService.js` before `BoardPage.jsx`; `TaskCard.jsx` stays presentational
- Story complete before moving to the next priority if a single implementer

### Parallel Opportunities

- T003–T005 (models), T007–T012 (DTOs), T013+T015 (Python/Java repos) after models exist
- T018–T020 (not-found types)
- T021–T027 (all US1 tests)
- T028–T030 (list services), T034–T036 (counts), T037 (frontend service)
- T041–T044 (US2 tests); T045–T047 (create services)
- T053–T056 (US3 tests); T057–T059 (delete services)
- T066–T068 (docs/time formatting)

---

## Parallel Example: User Story 1

```bash
# After Phase 2, launch US1 tests together:
Task: "GET comments tests in backend-python/tests/test_comments_api.py"
Task: "GET comments tests in backend-dotnet/tests/TaskBoard.Api.Tests/CommentsControllerTests.cs"
Task: "GET comments tests in backend-java/.../web/TaskControllerTest.java"
Task: "comment_count on list/get in backend-python/tests/test_tasks_api.py"
Task: "TaskCard count/expand tests in frontend/src/components/__tests__/TaskCard.test.jsx"

# Then list services in parallel:
Task: "CommentService list in backend-python/services/comment_service.py"
Task: "CommentService list in backend-dotnet/.../Services/CommentService.cs"
Task: "CommentService list in backend-java/.../service/CommentServiceImpl.java"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`schema.sql` + `seed.sql`)
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (GET comments + counts + board thread)
4. **STOP and VALIDATE**: Seeded comments, 404 missing task, count hidden at zero
5. Demo the board thread before building post/delete

### Incremental Delivery

1. Setup + Foundational → table and mappings ready
2. US1 → Test independently → Demo (MVP)
3. US2 → Test independently → Demo posting
4. US3 → Test independently → Demo delete + cascade
5. Polish → `quickstart.md` + four test suites

### Parallel Team Strategy

With multiple developers, after Phase 2:

- Developer A: Python US1→US3 (`backend-python/`)
- Developer B: .NET + Java US1→US3 (same contract)
- Developer C: Frontend US1→US3 (`frontend/src/`)

Integrate on the shared contract in `specs/001-task-comments/contracts/comments-api.md`.

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete work
- `[US1]` / `[US2]` / `[US3]` map to spec stories P1/P2/P3
- Controllers/routers MUST NOT contain SQL or author/body validation beyond HTTP mapping
- Timestamp keys: Python `created_at` / `task_id` / `comment_count`; .NET/Java camelCase — only allowed JSON drift
- Error codes remain `404` and `422` only for these cases
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently

---

## Phase 7: Convergence

- [ ] T071 Show a required-fields error (and do not reset the form) when Post is submitted with whitespace-only author or body in `frontend/src/components/TaskCard.jsx` per US2/AC2 (partial)
- [ ] T072 On delete-comment 404, refresh that task's thread from the API (or drop the missing comment) in `frontend/src/pages/BoardPage.jsx` so the board reflects current data per US3/AC3 (partial)
- [ ] T073 Distinguish a missing-task 404 from validation failure when posting in `frontend/src/pages/BoardPage.jsx`: tell the engineer the task is gone and refresh the board per Edge: post on deleted task (partial)
- [ ] T074 [P] Add task-delete cascade coverage (comments gone / GET comments is 404) in `backend-dotnet/tests/TaskBoard.Api.Tests/CommentsControllerTests.cs` and `CommentServiceTests.cs` per T054 / FR-012 (partial)
- [ ] T075 [P] Add the same cascade coverage in `backend-java/src/test/java/com/honeywell/taskboard/web/TaskControllerTest.java` and `service/CommentServiceImplTest.java` per T055 / FR-012 (partial)
- [ ] T076 Add BoardPage behaviour tests for in-place post/delete count updates (no full-page reload) in `frontend/src/pages/__tests__/BoardPage.test.jsx` per plan: frontend tests / SC-002 (missing)
