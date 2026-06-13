# fix-issue Work

> End-to-end Work case: failure fix. 4-stage diagnose → locate → fix → verify.

## Scenario

Fix a bug, with 4 tasks serially chained: "diagnose → locate → fix → verify". This is a demonstration of **Pattern 3: multiple tasks in series**.

## Files

- `work.oxn` — Work orchestration
- `tasks/diagnose/task.oxn` — Diagnose task
- `tasks/locate/task.oxn` — Locate task
- `tasks/fix/task.oxn` — Fix task
- `tasks/verify/task.oxn` — Verify task

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
