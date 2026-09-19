# Agent Instructions

The authoritative engineering rules for this repository are in
[`.github/copilot-instructions.md`](.github/copilot-instructions.md).
Read that file first and follow it exactly.

## Quick reference
- Three layers: Controller/Router → Service → Repository. No layer-skipping.
- Schema is owned only by `database/schema.sql`. No migrations.
- Error contract: 404 missing id, 422 missing title / unknown status.
- Add or update a test before considering an endpoint change done.

## Build & test
- Backend (.NET): `cd backend-dotnet && dotnet test`
- Backend (Python): `cd backend-python && pytest`
- Backend (Java): `cd backend-java && ./mvnw -B test`
- Frontend: `cd frontend && npm test -- --run`