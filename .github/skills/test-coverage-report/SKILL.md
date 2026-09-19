---
name: test-coverage-report
description: 'Generate a test coverage report for the .NET backend and/or React frontend in a lab module. Use when asked to "generate test coverage report", "check test coverage", "coverage report", "how much of the code is tested", or "find untested code". Runs dotnet test with coverlet and/or vitest --coverage, parses results, flags files below threshold, and writes a markdown summary.'
argument-hint: '[module folder, e.g. module-01] [dotnet|frontend|both]'
---

# Test Coverage Report

Runs the coverage tooling for a lab module's backend-dotnet and/or frontend, parses the
results, and produces a single markdown summary highlighting files/areas below threshold.

## When to Use
- User asks to generate/check test coverage for a module
- User wants to know which files or functions are undertested before adding a feature
- Before a PR, to confirm coverage didn't regress

## Inputs
- **Module folder** — e.g. `labs/module-01`. Ask if not given or ambiguous (repo has multiple `labs/module-NN/` folders).
- **Target(s)** — `.NET backend-dotnet`, `frontend`, or both. Default to both if the module has both.
- **Threshold** — line-coverage % below which a file is flagged. Default 80% if the user doesn't specify one.

## Procedure

### 1. .NET backend (`backend-dotnet/`)
1. Run coverage collection:
   ```
   cd <module>/backend-dotnet && dotnet test --collect:"XPlat Code Coverage"
   ```
2. Locate the generated `coverage.cobertura.xml` under `**/TestResults/*/coverage.cobertura.xml` (newest one).
3. Parse the cobertura XML: overall `line-rate` (as %), and per-`<class>` `line-rate` to find files below threshold.
4. If `reportgenerator` is not installed, skip HTML generation — the cobertura XML is enough for the markdown summary.

### 2. Frontend (`frontend/`)
1. Check `package.json` devDependencies for `@vitest/coverage-v8`. If missing, install it first:
   ```
   npm install -D @vitest/coverage-v8
   ```
2. Run:
   ```
   cd <module>/frontend && npm test -- --run --coverage
   ```
3. Vitest prints a text coverage table to stdout (`% Stmts`, `% Branch`, `% Funcs`, `% Lines` per file) and writes `coverage/coverage-summary.json`. Prefer parsing `coverage-summary.json` if present for exact numbers; fall back to the printed table.
4. Flag files with `% Lines` below threshold.

### 3. Build the report
Write a single markdown report (do not scatter findings across multiple files). Suggested location: `report/coverage-<module>-<date>.md`, or print inline in chat if the user just wants a quick answer. Structure:

```markdown
# Test Coverage Report — <module> — <date>

## Summary
| Stack | Line Coverage | Threshold | Status |
|-------|---------------|-----------|--------|
| .NET backend | XX% | 80% | ✅/⚠️ |
| Frontend | XX% | 80% | ✅/⚠️ |

## Files below threshold
### .NET
- `path/to/File.cs` — XX%

### Frontend
- `src/path/File.jsx` — XX%

## Notes
- Any coverage tooling issues encountered (missing packages, no tests found, etc.)
```

### 4. Flag gaps and suggest next steps
For each file below threshold, briefly note what kind of test is missing (e.g. "no test for
the error branch in `handleAdvance`") based on a quick read of the file — don't just list the
percentage. Keep suggestions short; this skill reports gaps, it does not write the missing
tests unless the user explicitly asks for that as a follow-up.

## Notes
- Respect the repo's layering rules (`.github/copilot-instructions.md`) — do not treat missing
  coverage on Controller/Router or Repository layers as equivalent; call out if business logic
  in the Service layer is undertested, since that's the highest-value gap.
- If `dotnet` or `npm` is unavailable in the environment, report that instead of guessing numbers.
