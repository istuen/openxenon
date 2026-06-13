# develop-member Work

> End-to-end Work case: single-domain full development. Implement the Member registration feature.

## Scenario

Implement the new-member registration feature + unit tests + end-to-end verification. This is a demonstration of **Pattern 2: single domain, multiple parts** (1 task with multiple parts aligned to Blueprint's multiple slots).

## Files

- `work.oxn` — Work orchestration
- `tasks/register-member/task.oxn` — Register member task (3 parts: develop / test / verify)

## How to run

```bash
cp -r .openxenon/works/develop-member .openxenon/works/
oxn work validate develop-member --json
oxn work lock develop-member --json
oxn work run develop-member --json
oxn work submit --work develop-member --task register-member --json
```

See [Recipes §2](../../recipes.md#recipe-2-develop-a-new-feature).
