# New endpoint

Scaffold a new Task Board endpoint across repository, service, controller/router, and tests.

**How to run:** `/new-endpoint GET /api/tasks/count count of tasks matching optional status`

Parse the text after the command as: HTTP method, route path, then behaviour. If any of those are missing, ask once and stop.

Add the endpoint to the **currently open backend** only.

Follow `.cursor/rules/engineering-standards.mdc` (same policy as `.github/copilot-instructions.md`) exactly:

1. Start with the **repository** method (all DB access here).
2. Add the **service** method that calls it (validation / rules here).
3. Add the **controller/router** handler (HTTP translation + error mapping only).
4. Add or update tests in the matching test file first, covering the happy path plus `404` / `422` where they apply.
5. Do not touch `database/schema.sql` unless I explicitly ask for a schema change.
