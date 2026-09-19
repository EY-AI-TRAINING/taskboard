# Engineering Task Board — Copilot Instructions

## What this project is
A Kanban task board: PostgreSQL + a React frontend + ONE backend (.NET, Python,
or Java) behind a shared REST contract. Domain is deliberately small; the point
is disciplined full-stack change.

## Architecture — do not violate
Every backend uses the same three layers. Keep responsibilities where they belong:

| Layer | Allowed to do | Never does |
|-------|---------------|------------|
| Controller / Router | Translate HTTP <-> domain, map errors to status codes | Business rules, SQL |
| Service | Validation, business rules | HTTP concerns, SQL |
| Repository | ALL database access | Validation, HTTP concerns |

The React app layers the same way: `components/` (presentational) → `pages/`
(state + data fetching) → `services/` (all HTTP in one place).

## Hard rules
- Do not access or read `.env`, `.env.local`, or any other `.env.*` files (except `.env.example`), environment variables directly, API keys, or secrets. Use the configuration system of the framework.
- **Schema is owned once**, in `database/schema.sql`. Do NOT add EF migrations,
  `Base.metadata.create_all()`, or `ddl-auto` values other than `none`.
- `created_at` / `updated_at` are set by the database, never by the client.
- `status` is exactly one of: `todo`, `in-progress`, `done`.
- Error contract: `404` for a missing id; `422` for a missing title or an
  unknown status. Do not invent other codes.
- Any new endpoint gets a test in the same layer BEFORE the implementation is
  considered done.

## Conventions
- Match the existing style of the file you are editing; do not reformat
  untouched lines.
- Keep the three backends behaviourally identical — a change to one should be
  portable to the others with the same request/response shape.
- Prefer editing an existing file over creating a new one.

## How to verify a change
- .NET: `dotnet test` in `backend-dotnet/`
- Python: `pytest` in `backend-python/`
- Java: `./mvnw -B test` in `backend-java/`
- Frontend: `npm test -- --run` in `frontend/`