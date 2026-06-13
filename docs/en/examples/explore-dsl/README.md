# explore-dsl Work

> End-to-end Work case: exploration and analysis. Figure out the OXL module structure.

## Scenario

Exploratory work: figure out the four sub-modules grammar / schema / validator / compiler, and produce an analysis report. This is a demonstration of **Pattern 1: single domain, single task** (1 work + 1 task + 1 domain + 1 blueprint).

## Files

- `work.oxn` — Work orchestration
- `tasks/explore-dsl/task.oxn` — Explore task

## How to run

```bash
cp -r .openxenon/works/explore-dsl .openxenon/works/
oxn work validate explore-dsl --json
oxn work lock explore-dsl --json
oxn work run explore-dsl --json
oxn work submit --work explore-dsl --task explore-dsl --json
```

See [Recipes §5](../../recipes.md#recipe-5-explore-and-analyze).
