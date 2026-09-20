# Two-Branch Solo Development Workflow

Holdfast uses two long-lived branches only: `dev` and `main`.

## Branch Roles

| Branch | Purpose | Rule |
|---|---|---|
| `dev` | Active development and integration | Make every code, level, test, and documentation change here. |
| `main` | Stable, publishable milestones | Do not develop directly here. Promote verified `dev` milestones only. |

Do not create `feat/*`, `fix/*`, or other temporary branches. The work itself is kept isolated through small commits, not branch proliferation.

## Daily Workflow

1. Start on `dev`: `git switch dev` and pull its latest state if working across machines.
2. Make one coherent change: for example, one tutorial correction, a single unit-balance adjustment, or its matching regression test.
3. Review `git diff`; stage only the files for that change.
4. Run the narrowest relevant check. Before a milestone, run `npx tsc --noEmit`, `npm test`, and `npm run build`.
5. Commit and push promptly: `git commit -m "fix(tutorial): clarify deployment step"`, then `git push`.

## Commit Discipline

- Use `type(scope): imperative description`; allowed types are `feat`, `fix`, `refactor`, `docs`, `chore`, and `test`.
- Keep subjects under 72 characters.
- One concern per commit; normally touch no more than three files across two related concerns.
- Do not mix refactors, balance changes, UI work, and unrelated cleanup in one commit.
- Keep user-owned or unrelated working-tree changes unstaged.

## Promotion to Main

At a reviewed milestone, inspect `main..dev`, run the full verification gate, and merge or fast-forward `dev` into `main`. Push `main` only after that verification. `main` is the source for releases and itch.io builds.
