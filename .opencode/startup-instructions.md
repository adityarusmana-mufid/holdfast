# Tanknights Startup Instructions

## Plans

Before starting any work, check `.opencode/plans/CHECKLIST.md` for current
progress. If a plan file matching the current task exists, read it and respect
its status/progress. Do not skip steps between phases.

## Pre-Work Baseline Check

Before starting ANY implementation work, verify the project is runnable.
Record baseline results to `.opencode/explore/baseline-YYYY-MM-DD.md`.

### JavaScript/TypeScript Stack

```bash
npm install
npm run lint                                # ESLint/Biome check
npm run typecheck                           # tsc --noEmit
npm run test                                # vitest/jest
npm run build                               # vite build
```

## Verification Gate

After completing ANY phase of work, run the full verification suite.
No new errors are allowed beyond the established baseline.

```bash
npm run lint                                # must pass
npm run typecheck                           # must pass with no new errors
npm run test                                # all tests must pass
npm run build                               # must succeed
```

## Type Safety Baseline Strategy

We use an **incremental tightening** approach:

1. **Initial baseline**: Run typechecker at current level. Record existing errors.
2. **Each phase**: After verification, check if any new errors were introduced. Fix
   them immediately — do not add to ignore lists.
3. **POST-LAUNCH**: Periodically remove entries from ignore lists and fix underlying
   issues. Target: strictest feasible level with zero ignored errors.
4. **Never increase the ignored errors list** without documenting why.

When the typechecker fails after your changes: **fix your code, don't silence the tool**.
Only legacy pre-existing errors belong in the baseline.

## Changelog

After passing the verification gate for any phase, update `CHANGELOG.md`
with a dated entry:

```
## [YYYY-MM-DD] Phase N — Title
- Summary of changes (bullet points)
- Files created / modified
- Tests added
```

This is a client deliverable — it proves scope of work and serves as an audit trail.
Do not skip this step after completing a phase.

## Exploration Log

Whenever you explore the codebase across multiple files, write a concise summary
to `.opencode/explore/<topic>.md`. Each file should contain:

- Date of exploration
- What was explored and why
- Key findings (file paths, line numbers, patterns)
- Conclusions or decisions based on findings

Do not log single-file reads — only log multi-file searches or agent-driven
exploration. Keep summaries concise and actionable.

## CI/CD Alignment

Local verification must match CI pipeline steps exactly. Before pushing,
run the same commands that CI runs. See AGENTS.md for the exact CI steps.

If CI fails on something you didn't catch locally, add the missing check to
your local verification routine.

## Coverage Threshold

All projects enforce a minimum 80% line coverage in CI:
- `npm run test -- --coverage --threshold=80`

If coverage is below 80%, write tests before proceeding with new features.
