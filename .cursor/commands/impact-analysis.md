# Impact analysis

Analyze a new or changed requirement and report its impact across the currently open backend before any code is written.

**How to run:** `/impact-analysis add an optional assignee filter on GET /api/tasks`

Treat all text after the command as the requirement. If none is given, ask once and stop.

Analyze this requirement against the **currently open backend** only. Do not write or edit any code — this is a report-only pass.

Read `.cursor/rules/engineering-standards.mdc` first (same policy as `.github/copilot-instructions.md`) and use its layering (Controller/Router → Service → Repository) and hard rules (schema ownership, error contract, `status` enum, `created_at`/`updated_at`) as the basis for the analysis.

Produce a markdown report with these sections:

1. **Summary** — one or two sentences on what the requirement asks for.
2. **Affected layers** — for each of Repository, Service, Controller/Router, and the matching test file, state whether it needs a change and why. Name the actual files.
3. **Schema impact** — does this require a change to `database/schema.sql`? If yes, flag it explicitly and stop short of proposing the change unless asked. If no, say so.
4. **Error contract impact** — does this introduce or change a `404` / `422` case, or does it need a status code outside that contract (flag as a question, don't invent one)?
5. **Cross-backend consistency** — note what an equivalent change would look like for the other two backends, so the same behaviour can be ported later.
6. **Risks / open questions** — ambiguities in the requirement, edge cases, or existing behaviour that could break.

Keep the report concise and skimmable. Do not modify any files.
