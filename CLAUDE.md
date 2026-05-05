# Dorothy — project conventions

## Issue-based workflow (default)

For any feature, bug fix, or non-trivial change request in this project, follow this loop. Skip only for un-shipped typo fixes; when in doubt, create the issue.

1. **Create a GitHub issue** first (`gh issue create`). Body should state intent, scope, and how the change will be verified.
2. **Branch off `main`** as `issue-<num>/<short-slug>`.
3. **Implement** on that branch. Verify locally (typecheck, build, manual smoke as appropriate).
4. **Open a PR to `main`** (`gh pr create`) with `Closes #<num>` in the body so the issue auto-closes on merge. Title and body should match the change at hand.
5. **Comment on the issue** (`gh issue comment <num>`) when there's information beyond what the PR diff shows — trade-offs taken, follow-up tickets discovered, manual validation results.
6. **Merge** with `gh pr merge <num> --rebase --delete-branch` after the user approves. Rebase keeps `main` history linear.

### Naming + commit style

- Branch: `issue-<num>/<short-slug>` (e.g., `issue-9/breadcrumb-root-to-home`)
- Commit message ends with a `Closes #<num>` line so merging closes the issue
- Commit prefix follows existing history: `feat(scope):`, `fix(scope):`, `ui(scope):`, `chore(scope):`, `docs(scope):`

### When to skip the issue

- Bootstrapping changes that introduce the convention itself (this file)
- Reverting an obviously broken commit immediately after pushing
- Adjusting `HANDOFF.md` (session note, intentionally untracked)

Otherwise, file the issue first.
