---
applyTo: "frontend/**"
---
# Frontend conventions

- All HTTP goes through `src/services/` — components and pages never call
  `fetch` directly.
- Components in `src/components/` are presentational: props in, callbacks out,
  no data fetching.
- Status values and column labels come from `src/constants.js`. Do not hard-code
  the strings `todo` / `in-progress` / `done` in components.
- Keep the existing plain-CSS approach in `index.css`; do not add a CSS
  framework or styling library.