# Agent Instructions

This repository is a Kanban task board (PostgreSQL + React + one of three
interchangeable backends). Follow the Cursor rules in [`.cursor/rules/`](.cursor/rules/)
exactly. They are equivalent to [`.github/copilot-instructions.md`](.github/copilot-instructions.md)
and the path-scoped files under [`.github/instructions/`](.github/instructions/).

| Cursor rule | Applies when | Copilot source |
|-------------|--------------|----------------|
| [`.cursor/rules/engineering-standards.mdc`](.cursor/rules/engineering-standards.mdc) | Always | `.github/copilot-instructions.md` |
| [`.cursor/rules/frontend.mdc`](.cursor/rules/frontend.mdc) | `frontend/**` | `.github/instructions/frontend.instructions.md` |
| [`.cursor/rules/tests.mdc`](.cursor/rules/tests.mdc) | Test files | `.github/instructions/tests.instructions.md` |

Keep those three pairs in sync if you change engineering policy.

## Commands (Copilot prompts)

Type `/` in Agent chat. Extra text after the command name is the prompt input
(Copilot's `${input:...}` fields).

| Cursor command | Copilot prompt |
|----------------|----------------|
| `/new-endpoint` — [`.cursor/commands/new-endpoint.md`](.cursor/commands/new-endpoint.md) | `.github/prompts/new-endpoint.prompt.md` |
| `/impact-analysis` — [`.cursor/commands/impact-analysis.md`](.cursor/commands/impact-analysis.md) | `.github/prompts/impact-analysis.prompt.md` |

## Quick reference
- Three layers: Controller/Router → Service → Repository. No layer-skipping.
- React: `components/` presentational → `pages/` state + fetching → `services/` HTTP.
- Schema is owned only by `database/schema.sql`. No migrations at runtime.
- `status` is exactly `todo`, `in-progress`, or `done`.
- Error contract: 404 missing id, 422 missing title / unknown status.
- Add or update a test before considering an endpoint change done.
- Do not read `.env*` (except `.env.example`) or secrets.
- Match existing file style; keep backends behaviourally identical.

## Build & test
- Backend (.NET): `cd backend-dotnet && dotnet test`
- Backend (Python): `cd backend-python && pytest`
- Backend (Java): `cd backend-java && ./mvnw -B test`
- Frontend: `cd frontend && npm test -- --run`
