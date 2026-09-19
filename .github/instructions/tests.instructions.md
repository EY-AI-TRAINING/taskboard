---
applyTo: "**/*{test,Test,tests,Tests,_test}*.{cs,py,js,jsx,java}"
---
# Writing tests for the Task Board

- Mirror the structure of the neighbouring existing test file — same framework,
  same naming, same arrange/act/assert rhythm.
  - .NET: xUnit + `WebApplicationFactory` for controller tests.
  - Python: pytest + `httpx.AsyncClient` against the FastAPI app.
  - Java: JUnit 5 + `@SpringBootTest` / `MockMvc`.
  - Frontend: Vitest + Testing Library.
- Every endpoint test covers: the happy path, `404` for a missing id, and
  `422` for a missing title or an unknown status.
- Do not hit a real database — use the existing in-memory / fixture setup from
  `conftest.py`, the test factory, or the repository fake already in the suite.
- Name tests for the behaviour, not the method: `returns_422_when_title_missing`.