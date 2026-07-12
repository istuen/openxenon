# onboarding Work

> End-to-end Work case: cross-domain orchestration. New member registration + welcome bonus issuance.

## Scenario

When a new member registers, we also need to operate on OrderContext — two bounded contexts collaborate. This is a demonstration of **Pattern 4: cross-domain orchestration**.

## Files

- `work.md` — Work orchestration (declares MemberContext + OrderContext two domain refs)
- `tasks/register-member/task.md` — Register member task
- `tasks/grant-welcome-bonus/task.md` — Issue welcome bonus task

## How to run

```bash
# 1. Copy into the project
cp -r .openxenon/works/onboarding .openxenon/works/

# 2. Validate
oxn work validate onboarding --json

# 3. Lock
oxn work lock onboarding --json

# 4. Run
oxn work run onboarding --json

# 5. AI executes and advances
oxn work submit --work onboarding --task register-member --json
oxn work submit --work onboarding --task grant-welcome-bonus --json
```

See [Recipes §3](../../recipes.md#recipe-3-cross-domain-orchestration).
