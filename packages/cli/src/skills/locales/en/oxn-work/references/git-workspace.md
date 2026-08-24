# Git Workspace Guide (v0.0.27+)

> This file is the on-demand supplement to `SKILL.md`. **Load only in git worktree scenarios.**
>
> Note: the `oxn-work` Skill main flow does not handle git scenarios; this sub-scenario runs through the builtin `git-workflow` blueprint independently.

## Core Boundary

> **OXN never commits / pushes / merges on behalf of humans.** It only observes and produces mergeability evidence for humans to consume when running `git merge`.

## builtin `git-workflow` Blueprint

OXN provides a builtin `git-workflow` blueprint (`src/builtin/blueprints/git-workflow.oxn`) in git worktree scenarios, with all 4-phase slots connected to the L1 git adapter (`src/infra/git/workspace.ts`) + 4 catalog probes (`git-clean` / `git-branch-exists` / `git-status-clean` / `git-merge-feasible`).

## Derived Builtin Blueprint (Standard cp Convention, v0.6 path)

```bash
oxn init
# v0.6.1-alpha.0: builtin blueprint derivation aligned with v0.6 assets/ layout
mkdir -p .openxenon/assets/blueprints
cp src/builtin/blueprints/git-workflow.oxn .openxenon/assets/blueprints/git-workflow.oxn
chmod 644 .openxenon/assets/blueprints/git-workflow.oxn  # unlock from 0o444 lock state
oxn domain create ProgramContext          # Must include at least term: WorkingTree / Branch / MergeCommit
oxn blueprint validate git-workflow
```

## Integration with Work 8-Stage Flow (v0.6.1-alpha.0: create auto-generates task.oxn skeletons)

```bash
# v0.6.1-alpha.0 #3-3 fix: work create automatically generates tasks/<slot>/task.oxn skeleton per blueprint slot
oxn work create gw-feat-x --blueprint git-workflow
# After creation, .openxenon/works/gw-feat-x/ automatically contains:
#   work.oxn
#   tasks/init/task.oxn
#   tasks/build/task.oxn
#   tasks/verify/task.oxn
#   tasks/ship/task.oxn       (git-workflow has 4 slots = 4 task.oxn skeletons)
# Just edit the files to fill skill_context etc., **no need to run add-task manually**

# Manual add-task is still available (if you need to add more tasks later):
oxn work add-task gw-feat-x --task extra --blueprint git-workflow --domain ProgramContext

oxn work validate gw-feat-x --json
oxn work lock gw-feat-x --json
```

## Manual Git Operations (OXN Does Not Participate)

```bash
git worktree add -b feat/gw-feat-x ../wt-feat-x
cd ../wt-feat-x && $EDITOR files && git add -A && git commit -m "feat: ..."
cd -
oxn work run gw-feat-x --json
oxn work submit gw-feat-x --task ship --json          # 4 times (4 part = 4 slot)
oxn work status gw-feat-x --json                       # overallStatus = passed
oxn work finalize gw-feat-x --json                     # ⚠️ REMOVED in RFC-0032 Phase 2; use `oxn work submit --work <w> --task <t>` instead
```

## Obtaining Mergeability Evidence (Critical)

`oxn work context` does not expose `checkMergeFeasibility` (writing the workspace → violates the OXN boundary of not making decisions for humans). To obtain evidence, **call probes manually** or read the L1 adapter:

```bash
# E2E test demo (src/cli/__tests__/work-git-workspace-e2e.test.ts)
#  Calling checkMergeFeasibility(branch, 'main', worktreePath):
#    → can_ff_merge / can_merge_clean / has_conflicts / dirty_worktree / unknown
```

## Things Not Done

- ❌ `oxn work create --worktree` (Plan C, not implemented)
- ❌ OXN committing / merging for humans (philosophical boundary)
- ❌ Drift source `.oxn` after lock (won't trigger planLock — it locks per-work slim index `works/<w>/blueprints.json`)

## Further Reading

- Detailed design: `docs/architecture/git-workflow-workspace.md`
- 4 probe registration: `src/kernel/verdicts/catalog.ts:390-491`
- L1 adapter: `src/infra/git/workspace.ts:1-317`
- E2E end-to-end validation: `src/cli/__tests__/work-git-workspace-e2e.test.ts`
