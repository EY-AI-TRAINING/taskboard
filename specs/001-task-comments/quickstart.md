# Quickstart: Task Comments

Validate the feature end-to-end against [data-model.md](./data-model.md) and
[contracts/comments-api.md](./contracts/comments-api.md). Use one backend at a
time.

## Prerequisites

- PostgreSQL with database `taskboard`
- One backend running (Python `:8000`, .NET `:5088`, or Java `:8080`)
- Frontend at `http://localhost:5173` pointed at that backend via
  `frontend/.env.example` (copy locally; do not commit secrets)

## 1. Schema

Re-apply the single schema file, then seed (seed truncates tasks **and**
comments via cascade):

```bash
psql "postgresql://postgres:postgres@localhost:5432/taskboard" -f database/schema.sql
psql "postgresql://postgres:postgres@localhost:5432/taskboard" -f database/seed.sql
```

Expect `comments` to exist and at least one seeded task to have comments.

## 2. Automated suites

From each folder, after tests for the new endpoints exist:

```bash
cd backend-dotnet && dotnet test
cd backend-python && pytest
cd backend-java && ./mvnw -B test
cd frontend && npm test -- --run
```

Each comments endpoint test MUST cover: happy path, `404` missing task/comment,
`422` missing or too-long author/body. Suites MUST NOT use a real database.

## 3. HTTP checks (replace host/port for the backend you started)

```bash
# Count on the board payload
curl -s http://localhost:8000/api/tasks

# Empty or existing thread (use a real seeded id)
curl -s http://localhost:8000/api/tasks/1/comments

# Missing task → 404, not []
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/tasks/999/comments

# Create
curl -s -X POST http://localhost:8000/api/tasks/1/comments \
  -H "Content-Type: application/json" \
  -d '{"author":"Ana","body":"Looks good to merge."}'

# Reject blank body → 422
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/api/tasks/1/comments \
  -H "Content-Type: application/json" \
  -d '{"author":"Ana","body":"   "}'

# Delete the comment you created (substitute ids)
curl -s -o /dev/null -w "%{http_code}\n" \
  -X DELETE http://localhost:8000/api/tasks/1/comments/1
```

Expect: list includes `commentCount` / `comment_count`; GET comments is oldest
first; POST returns `201` with `author`, `body`, system `createdAt`; delete
returns `204`.

## 4. Board UI

1. Open the board. Cards with comments show a numeric count; cards with none
   hide the number but still show the comment control.
2. Expand a thread: oldest comment at the top, author + approximate time.
3. Post with author + body → comment appears at the bottom, count increments,
   stay on the board.
4. Post with either field empty → error, thread unchanged.
5. Delete a comment → it disappears, count decreases; last comment hides the
   number.
6. Delete a task → that task and its comments are gone; a new task does not
   inherit them.

## Expected outcomes

- [ ] Schema + seed load on a clean database
- [ ] All four test suites pass
- [ ] Curl contract checks match `contracts/comments-api.md`
- [ ] UI scenarios above succeed against a live backend
