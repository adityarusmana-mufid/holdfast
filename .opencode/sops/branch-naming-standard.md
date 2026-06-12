# Branch Naming Standard

Standard for branch naming and scope discipline across all agentic workflows.

## Naming Convention

All branches must follow this format:

```
<type>/<description>
```

| Type | When To Use | Example |
|------|-------------|---------|
| `feat/` | New feature, phase, or logical work unit | `feat/grid-editor` |
| `fix/` | Bug fix, CI fix, lint/type error | `fix/deployment-collision` |
| `refactor/` | Code restructuring, no behavior change | `refactor/combat-system` |
| `docs/` | Documentation only | `docs/design-spec-update` |
| `test/` | Tests only | `test/dp-system-regression` |
| `chore/` | Config, tooling, CI, dependencies | `chore/vite-config` |

**Rules:**
- Use `kebab-case` only (no underscores, no CamelCase)
- Keep descriptions under 40 characters
- Use nouns, not verbs (`grid-editor` not `build-grid-editor`)
- No issue/PR numbers in the branch name

## Scope Guidelines

### One Concern Per Branch

A branch should represent **one logical unit of work**. If the scope expands beyond the original intent, create a new branch.

| Scenario | Action |
|----------|--------|
| Building Phase 1 (grid + editor) | One branch: `feat/grid-editor` |
| Phase 1 scope creep: adding DP fields mid-way | Keep it (same phase, related scope) |
| Starting Phase 2 | New branch: `feat/unit-deployment` |
| Phase 2 reveals unrelated grid bug | Same branch (related scope) |
| Fixing unrelated pathing bug while on Phase 2 | New branch: `fix/pathing-collision` |

**Rule of thumb:** If the branch name no longer describes the work, you need a new branch.

### Branch Lifetime

- A branch should live at most **one phase** or **one week of active work**
- Stale branches (>7 days without commits) should be deleted after merging

### Maximum Files Per Concern

If a single commit touches files across >3 unrelated directories or >2 concerns, split it into separate commits on separate branches.

## Branch Lifecycle

```
User request → Create topic branch → Work → Verify → Commit → PR → Merge → Delete branch
```

| Stage | Action |
|-------|--------|
| **Start** | Create branch: `git checkout -b <type>/<description>` from `main` |
| **During** | Commit small, commit often. One concern per commit. |
| **Scope creep** | If branch name no longer fits → create new branch, cherry-pick relevant commits |
| **Before PR** | Run verification gate (lint → typecheck → test → build) |
| **After merge** | Delete the branch immediately |

## Base Branch Rules

| Base | Purpose | Who Pushes |
|------|---------|-----------|
| `main` | Production. Never push directly. | Maintainer only |
| `<type>/<description>` | Topic branch. Work happens here. | You |

Always base topic branches off `main`.

## Enforcement

### For Agents

Before creating any branch, agents MUST:

1. Verify the branch name follows `<type>/<description>` format with kebab-case
2. Confirm the name accurately describes the work scope (not future scope, not past scope)
3. If continuing existing work: verify the branch name still matches the current scope. If not, flag it to the user.

## Examples

### Good Branch Names

```
feat/grid-editor              # — single phase, clear scope
fix/deployment-collision       # — single bug, scoped to one system
refactor/combat-system         # — refactor of one subsystem
docs/design-spec-update        # — documentation only
test/dp-system-regression      # — tests for one domain
chore/vite-config              # — tooling change
```

### Bad Branch Names

```
fix/                             # — missing description
feat/all-the-things              # — scope too broad, vague
FIX-GRID-ISSUES                 # — uppercase, underscores, imperative verb
update                           # — no type prefix, no description
wip                              # — unfinished work, doesn't describe purpose
phase-1                          # — no type prefix, too vague
```

## Handling Stale Branches

When resuming work on an existing branch:

1. Check if the branch name still describes the current scope
2. If the scope has drifted: rename (`git branch -m old new`)
3. If the work is unrelated to the branch name: create a new branch instead
