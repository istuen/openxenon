# fix-issue Work

> End-to-end Work case: failure fix. 4-stage diagnose → locate → fix → verify.

## Scenario

Fix a bug, with 4 tasks serially chained: "diagnose → locate → fix → verify". This is a demonstration of **Pattern 3: multiple tasks in series**.

## Files

- `work.md` — Work orchestration
- `tasks/diagnose/task.md` — Diagnose task
- `tasks/locate/task.md` — Locate task
- `tasks/fix/task.md` — Fix task
- `tasks/verify/task.md` — Verify task

## How to run

```bash
cp -r .openxenon/works/fix-issue .openxenon/works/
oxn work validate fix-issue --json
oxn work lock fix-issue --json
oxn work run fix-issue --json

# advance the 4 tasks serially
for t in diagnose locate fix verify; do
  oxn work submit --work fix-issue --task $t --json
done
```

See [Recipes §4](../../recipes.md#recipe-4-fix-a-failure).
