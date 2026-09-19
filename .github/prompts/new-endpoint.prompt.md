<!-- .github/prompts/new-endpoint.prompt.md -->
---
description: Scaffold a new Task Board endpoint across router, service, repository, and tests
mode: agent
---
Add a new endpoint to the **currently open backend** only.

Endpoint: `${input:method:HTTP method, e.g. GET}` `${input:path:route, e.g. /api/tasks/count}`
Behaviour: ${input:behaviour:what it should do}

Follow `.github/copilot-instructions.md` exactly:
1. Start with the **repository** method (all DB access here).
2. Add the **service** method that calls it (validation / rules here).
3. Add the **controller/router** handler (HTTP translation + error mapping only).
4. Add or update tests in the matching test file FIRST-class, covering the happy
   path plus `404` / `422` where they apply.
5. Do not touch `database/schema.sql` unless I explicitly ask for a schema change.