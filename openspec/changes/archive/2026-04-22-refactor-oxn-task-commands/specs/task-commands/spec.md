## ADDED Requirements

### Requirement: Stage Schema
Stage SHALL be defined with the following Zod schema:

```typescript
{
  id: string,
  name: string,
  deps: string[],
  target: string,
  spec: string,
  action?: string,
  proof: string | string[]
}
```

### Requirement: Blueprint Schema
Blueprint SHALL be defined with the following Zod schema:

```typescript
{
  id: string,
  taskId: string,
  name: string,
  status: 'DRAFT' | 'CANONICAL' | 'SAMPLE',
  stages: Stage[]
}
```

### Requirement: Task Schema（复数 blueprints）
Task SHALL contain multiple blueprints:

```typescript
{
  id: string,
  name: string,
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ESCAPED' | 'TERMINATED',
  activeBlueprintId?: string,
  createdAt: string (datetime),
  blueprints: Blueprint[]
}
```

#### Scenario: Task with multiple blueprints
- **WHEN** A Task is created with multiple blueprints
- **THEN** `blueprints` array contains all blueprints, `activeBlueprintId` points to the current one

### Requirement: task new 命令输出 Task 模板
`task new` SHALL output full Task JSON template with blueprints array.

### Requirement: task list 命令
`task list` SHALL list all tasks with basic info.

#### Scenario: task list --json
- **WHEN** user runs `xn task list --json`
- **THEN** output is JSON format
