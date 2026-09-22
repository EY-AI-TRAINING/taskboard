# Engineering Task Board Constitution

## Core Principles

### I. Layered Architecture (NON-NEGOTIABLE)

Every backend MUST keep three layers and MUST NOT skip or collapse them:

- Controller / Router: translate HTTP to domain objects and map errors to
  status codes. MUST NOT contain business rules or SQL.
- Service: validation and business rules. MUST NOT contain HTTP concerns or SQL.
- Repository: ALL database access. MUST NOT contain validation or HTTP concerns.

The React app MUST follow the same layering: `components/` (presentational) →
`pages/` (state and data fetching) → `services/` (all HTTP). Components and
pages MUST NOT call `fetch` or Axios directly.

Rationale: the three backends stay interchangeable only if responsibilities
stay in the same place. Layer-skipping is the usual way this repo drifts.

### II. Shared REST Contract

The three backends (.NET, Python, Java) MUST remain behaviourally identical.
A change to one MUST be portable to the others with the same request/response
shape. Timestamp key casing MAY differ (`created_at` vs `createdAt`); no other
JSON shape divergence is allowed.

The frontend MUST talk to whichever backend is running through
`VITE_API_BASE_URL` and MUST NOT special-case a stack.

Rationale: this repo exists to demonstrate one contract, three stacks. Drift
between backends is a constitution violation, not a style preference.

### III. Test-First Endpoints (NON-NEGOTIABLE)

Any new or changed endpoint MUST have a test in the same layer before the
change is considered done. Endpoint tests MUST cover: the happy path, `404`
for a missing id, and `422` for a missing title or an unknown status.

Tests MUST use the existing in-memory / fixture setup. They MUST NOT hit a
real database. Tests MUST be named for behaviour
(e.g. `returns_422_when_title_missing`), not for the method under test.

Rationale: the domain is small so the contract is the product. Untested
endpoints are how the three backends stop matching.

### IV. Single Schema Ownership

Schema is owned once, in `database/schema.sql`. Backends MUST NOT add EF
migrations, call `Base.metadata.create_all()`, or set JPA `ddl-auto` to any
value other than `none`. New tables are allowed only as reviewed edits to
`schema.sql`.

`created_at` / `updated_at` MUST be set by the database, never by the client.

Rationale: three ORMs plus migration tooling would fork the data model. One
SQL file is the only source of truth that all stacks can share.

### V. Simplicity

The domain is deliberately small. Contributors MUST prefer editing an existing
file over creating a new one, MUST match the style of the file being edited,
and MUST NOT reformat untouched lines.

Contributors MUST NOT invent extra HTTP status codes, extra task statuses, CSS
frameworks, or features that the spec does not ask for. Complexity MUST be
justified against this constitution.

Rationale: the point of the repo is disciplined full-stack change, not product
growth. Extra surface area makes the three backends harder to keep in sync.

## Error Contract and Domain Constraints

`status` is exactly one of: `todo`, `in-progress`, `done`. Frontend status
values and column labels MUST come from `src/constants.js`; components MUST
NOT hard-code those strings.

Error contract:

- `404` for a missing id (or other missing resource).
- `422` for a missing title or an unknown status (or other bad request body).

Contributors MUST NOT invent other codes for those cases.

Secrets: do not access or read `.env`, `.env.local`, or any other `.env.*`
files (except `.env.example`), environment variables directly, API keys, or
secrets. Use the configuration system of the framework. Sensitive values MUST
NOT be committed.

Frontend styling MUST stay in existing plain CSS (`index.css`). Do not add a
CSS framework or styling library.

## Quality Gates

A backend or frontend change is not done until the matching suite passes:

- .NET: `dotnet test` in `backend-dotnet/`
- Python: `pytest` in `backend-python/`
- Java: `./mvnw -B test` in `backend-java/`
- Frontend: `npm test -- --run` in `frontend/`

Test stacks MUST stay as they are:

- .NET: xUnit + `WebApplicationFactory` for controller tests.
- Python: pytest + `httpx.AsyncClient` against the FastAPI app.
- Java: JUnit 5 + `@SpringBootTest` / `MockMvc`.
- Frontend: Vitest + Testing Library.

Runtime development guidance lives in `.github/copilot-instructions.md` and
`AGENTS.md`. Path-scoped rules live in `.github/instructions/`. Those files
MUST remain consistent with this constitution; if they conflict, this file
wins and the guidance files MUST be updated.

## Governance

This constitution supersedes informal practice, README examples, and agent
defaults. PRs and reviews MUST verify compliance with the principles above.

Amendments:

1. Update this file with the proposed change and a Sync Impact Report comment.
2. Bump `CONSTITUTION_VERSION` using semantic versioning:
   - MAJOR: backward-incompatible principle removal or redefinition.
   - MINOR: new principle or section, or materially expanded guidance.
   - PATCH: clarifications, wording, typos, non-semantic refinements.
3. Set **Last Amended** to the amendment date (ISO `YYYY-MM-DD`).
4. Remove the Sync Impact Report before the amendment is committed.
5. Align `.github/copilot-instructions.md` and `AGENTS.md` in the same change
   if runtime guidance would otherwise drift.

Compliance review: any spec, plan, or implementation that would skip a layer,
fork the REST contract, create schema outside `database/schema.sql`, ship an
endpoint without tests, or invent error codes MUST be rejected until it
conforms.

**Version**: 1.0.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-09-21
