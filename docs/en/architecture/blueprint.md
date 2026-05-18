# Blueprint

Blueprint is the task's engineering drawing, defining the complete execution topology (DAG).

## Definition

Blueprint doesn't invent logic, it only instantiates and orchestrates Stages from Arsenal.

## Structure

```yaml
name: Build and Test
stages:
  - id: build
    ref: stages/build
    params:
      output: dist/
    deps: []

  - id: test
    ref: stages/test
    params:
      coverage: 80
    deps: [build]
```

## Field Description

| Field | Type | Required | Meaning |
|-------|------|----------|---------|
| `name` | string | Yes | Task name |
| `stages` | array | Yes | Stage instance list |
| `stages[].id` | string | Yes | Instance unique identifier |
| `stages[].ref` | string | Yes | Reference to Stage in Arsenal |
| `stages[].params` | object | No | Parameter injection |
| `stages[].deps` | array | No | Dependent Stage ID list |

## DAG Orchestration

Define dependencies between Stages via `deps` field:

```yaml
stages:
  - id: install
    deps: []

  - id: build
    deps: [install]

  - id: test
    deps: [build]

  - id: deploy
    deps: [test]
```

Core executes in topological order, ensuring dependencies are satisfied before executing downstream Stages.

## Parameterization

Blueprint can inject parameters via `params` for reuse:

```yaml
# template.yaml
name: Deploy Service
stages:
  - id: deploy
    ref: stages/deploy
    params:
      env: ${env}
      region: ${region}
```

Inject parameters at submission:

```bash
oxn task submit --blueprint template.yaml --param env=prod --param region=us-west
```

## Asset Value

- **Intent precipitation**: Engineer's complete task structure can be saved and reused
- **Parameterized**: Same Blueprint supports different parameter combinations
- **Templateable**: Common task patterns can be abstracted as templates