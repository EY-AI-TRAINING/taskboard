# Engineering Task Board

A small, deliberately simple full-stack application used to demonstrate
disciplined, AI-assisted engineering: GitHub Copilot enterprise customization
and spec-driven development (SDD).

The domain is a Kanban-style task board. Every piece of work is a **task** that
moves through three columns — **To Do → In Progress → Done** — with full CRUD
and status filtering. Full domain detail, data model, and API contract live in
**[usecase.md](usecase.md)**.

## Architecture

One PostgreSQL database, one React frontend, and **one** backend chosen from
three interchangeable implementations that all satisfy the same REST contract:

| Component | Stack | Dev port | Interactive API docs |
|-----------|-------|----------|----------------------|
| `frontend/` | React 19 + Vite, React Router, Axios | 5173 | – |
| `backend-python/` | FastAPI + SQLAlchemy (async) | 8000 | `/docs` |
| `backend-dotnet/` | ASP.NET Core + EF Core (Npgsql) | 5088 | `/swagger` |
| `backend-java/` | Spring Boot + Spring Data JPA | 8080 | `/swagger-ui.html` |
| `database/` | PostgreSQL 15+ | 5432 | – |

Every backend uses the same three layers, so the shape transfers between stacks:

```
HTTP  ─▶  Controller / Router   (translate HTTP <-> domain, map errors to codes)
      ─▶  Service               (validation, business rules)
      ─▶  Repository            (all database access lives here)
      ─▶  PostgreSQL (tasks)
```

The React app layers the same way: `components/` (presentational) → `pages/`
(state + data fetching) → `services/` (all HTTP in one place).

The engineering rules that keep these layers honest are in
[`.github/copilot-instructions.md`](.github/copilot-instructions.md) and
[`AGENTS.md`](AGENTS.md).

## Repository layout

```
backend-dotnet/     ASP.NET Core backend  (src/ + tests/, TaskBoard.sln)
backend-java/       Spring Boot backend   (Maven wrapper included)
backend-python/     FastAPI backend       (requirements.txt, pytest.ini)
frontend/           React + Vite single-page board
database/           schema.sql (source of truth), seed.sql, migrations/
.github/            Copilot customization: instructions, prompts, agents, skills
usecase.md          Domain, data model, and full API contract
AGENTS.md           Quick engineering rules for AI agents
```

## Prerequisites

Install only what the pieces you plan to run need:

- **PostgreSQL 15+** (local install or Docker) — always
- **Node.js 20+** — for the frontend
- **Python 3.11+** — for `backend-python`
- **.NET SDK 8+** — for `backend-dotnet`
- **JDK 21+** — for `backend-java` (Maven is bundled via `./mvnw`)

> Command blocks are given for **macOS / Linux (bash/zsh)** and
> **Windows (PowerShell)**. Run the pair that matches your machine; WSL2 users
> follow the macOS / Linux side.

## Data model

One table, defined once in `database/schema.sql`. No backend creates or migrates
schema at runtime (no EF migrations, no `create_all()`,
`spring.jpa.hibernate.ddl-auto=none`).

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

`created_at` / `updated_at` are set by the database, never by the client.

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks (optional `?status=` filter; includes comment count) |
| GET | `/api/tasks/{id}` | Get a single task |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/{id}` | Update a task |
| DELETE | `/api/tasks/{id}` | Delete a task (comments cascade) |
| GET | `/api/tasks/{id}/comments` | List comments on a task, oldest first |
| POST | `/api/tasks/{id}/comments` | Add a comment (`author`, `body`) |
| DELETE | `/api/tasks/{id}/comments/{commentId}` | Delete a comment |
| GET | `/health` | Liveness check → `{"status":"ok"}` |

Error contract: `404` for a missing id, `422` for a missing title, unknown
status, or a blank/too-long comment author or body. Full request/response
detail is in [docs/usecase.md](docs/usecase.md#api-contract).

> The Python backend returns the timestamp keys as `created_at` / `updated_at` /
> `task_id` / `comment_count`; .NET and Java use camelCase (`createdAt`,
> `taskId`, `commentCount`). The board UI does not depend on either.

## Configuration

Nothing sensitive is committed. Each backend reads its configuration from
environment variables (shown per-backend below); the frontend reads a Vite
variable from `frontend/.env.local`.

| Variable | Used by | Notes |
|----------|---------|-------|
| `ConnectionStrings__DefaultConnection` | .NET backend | ADO-style connection string |
| `DATABASE_URL` | Python backend | SQLAlchemy async URL (`postgresql+asyncpg://…`) |
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | Java backend | JDBC URL + credentials (Spring binds these automatically) |
| `FRONTEND_ORIGIN` | Python & Java backends | CORS allow-list (defaults to the Vite dev server, `http://localhost:5173`) |
| `VITE_API_BASE_URL` | frontend | `http://localhost:8000` (Python), `http://localhost:5088` (.NET), or `http://localhost:8080` (Java) |

`*.env` / `.env.local` files are git-ignored. The dev defaults baked into each
backend assume a database URL of
`postgresql://postgres:postgres@localhost:5432/taskboard`.

## Running it

### 1. Database

Start PostgreSQL (local install or Docker), then apply the schema and seed data.

**With a local `psql` (any platform)**

```
psql "postgresql://postgres:postgres@localhost:5432/taskboard" -f database/schema.sql
psql "postgresql://postgres:postgres@localhost:5432/taskboard" -f database/seed.sql
```

**Docker container, macOS / Linux**

```bash
docker exec -i taskboard-db psql -U postgres -d taskboard < database/schema.sql
docker exec -i taskboard-db psql -U postgres -d taskboard < database/seed.sql
```

**Docker container, Windows (PowerShell)**

```powershell
Get-Content database/schema.sql | docker exec -i taskboard-db psql -U postgres -d taskboard
Get-Content database/seed.sql   | docker exec -i taskboard-db psql -U postgres -d taskboard
```

`seed.sql` is safe to re-run — it truncates and reloads six sample tasks.

### 2. Pick ONE backend

Each exposes the same API. Run the commands from the backend's own folder.

#### Option A — Python (FastAPI), port 8000

```bash
cd backend-python
python3 -m venv .venv && source .venv/bin/activate   # Windows: python -m venv .venv ; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```bash
# macOS / Linux
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/taskboard"
```
```powershell
# Windows (PowerShell)
$env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/taskboard"
```
```
uvicorn main:app --reload
```

#### Option B — .NET (ASP.NET Core), port 5088

```bash
cd backend-dotnet
```
```bash
# macOS / Linux
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=taskboard;Username=postgres;Password=postgres"
```
```powershell
# Windows (PowerShell)
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=taskboard;Username=postgres;Password=postgres"
```
```
dotnet run --project src/TaskBoard.Api
```

#### Option C — Java (Spring Boot), port 8080

```bash
cd backend-java
```
```bash
# macOS / Linux
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/taskboard"
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=postgres
./mvnw spring-boot:run
```
```powershell
# Windows (PowerShell)
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/taskboard"
$env:SPRING_DATASOURCE_USERNAME = "postgres"
$env:SPRING_DATASOURCE_PASSWORD = "postgres"
.\mvnw.cmd spring-boot:run
```

(`./mvnw` / `mvnw.cmd` is the bundled Maven wrapper — use `mvn` directly if you
have it installed.)

### 3. Frontend

```
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Point it at the backend you started by creating `frontend/.env.local`
(see `frontend/.env.example`):

**macOS / Linux**

```bash
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
```

**Windows (PowerShell)** — force UTF-8 so Vite reads it correctly:

```powershell
Set-Content -Encoding utf8 .env.local "VITE_API_BASE_URL=http://localhost:8000"
```

Use `:5088` for .NET or `:8080` for Java instead of `:8000`.

## Testing

Run each block from its folder.

```
# .NET backend  — in backend-dotnet/
dotnet build
dotnet test

# Python backend  — in backend-python/ (virtualenv activated)
pip install -r requirements.txt
pytest

# Java backend  — in backend-java/
./mvnw -B test            # Windows: .\mvnw.cmd -B test

# Frontend  — in frontend/
npm install
npm run build
npm test -- --run
```

Verify the schema loads into a clean database (Docker example):

```bash
docker exec -i taskboard-db psql -U postgres -d postgres -c "CREATE DATABASE taskboard_check;"
docker exec -i taskboard-db psql -U postgres -d taskboard_check < database/schema.sql
docker exec -i taskboard-db psql -U postgres -d taskboard_check < database/seed.sql
docker exec -i taskboard-db psql -U postgres -d postgres -c "DROP DATABASE taskboard_check;"
```

Expected state:

- [ ] `dotnet build` and `dotnet test` pass (14 tests)
- [ ] `pytest` passes (25 tests)
- [ ] `./mvnw -B test` passes (16 tests)
- [ ] `npm run build` succeeds and `npm test -- --run` passes (12 tests)
- [ ] `schema.sql` + `seed.sql` load into a clean database without error
- [ ] The board renders the seeded tasks and CRUD works against a live backend

## Copilot & agent customization

`.github/` holds the GitHub Copilot enterprise customization this repo is built
to demonstrate:

| Path | Purpose |
|------|---------|
| `copilot-instructions.md` | Repository-wide engineering rules |
| `instructions/*.instructions.md` | Path-scoped rules (frontend, tests) |
| `prompts/*.prompt.md` | Reusable prompts (`new-endpoint`, `impact-analysis`) |
| `agents/*.agent.md` | Custom chat agents (e.g. `code-reviewer`) |
| `skills/*/SKILL.md` | Agent skills (e.g. `test-coverage-report`) |
