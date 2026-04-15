# Xenonix TypeScript 类型定义

## 概述

Xenonix 使用 TypeScript Strict Mode 进行类型定义，确保类型安全和端到端类型同构。

## 核心类型

### 状态枚举

#### TaskStatus

任务状态枚举。

```typescript
export type TaskStatus = 
  | 'pending'    // 待执行
  | 'running'    // 执行中
  | 'completed'  // 已完成
  | 'failed'     // 已失败
```

#### StepStatus

步骤状态枚举。

```typescript
export type StepStatus =
  | 'pending'   // 待执行
  | 'running'   // 执行中
  | 'passed'    // 已通过验证
  | 'failed'    // 验证失败
```

#### ArtifactType

工程产物类型枚举。

```typescript
export type ArtifactType =
  | 'code'      // 代码文件
  | 'config'    // 配置文件
  | 'document'  // 文档文件
  | 'test'      // 测试文件
```

#### ProofType

验证探针类型枚举。

```typescript
export type ProofType =
  | 'validation'  // 验证型
  | 'lint'        // 代码检查型
  | 'test'        // 测试型
```

#### ProjectStatus

项目状态枚举。

```typescript
export type ProjectStatus = 
  | 'active'    // 活跃
  | 'archived'  // 已归档
```

## 实体类型

### Playbook

执行计划，由 AI 助手生成并提交给 Core 保存。

```typescript
export interface Playbook {
  task: string      // 任务名称
  steps: Step[]     // 步骤列表
}
```

**示例**：

```json
{
  "task": "实现 RBAC 权限校验",
  "steps": [
    {
      "id": "step_1",
      "name": "定义数据模型",
      "spec": "禁止使用 NoSQL，必须使用 Prisma ORM 定义 User 与 Role 的多对多关系表",
      "proof": "prisma-validate"
    },
    {
      "id": "step_2",
      "name": "实现中间件",
      "spec": "必须拦截特定路由，且不可绕过，抛出 403 错误需符合 RFC 规范",
      "proof": "eslint-and-test"
    }
  ]
}
```

### Step

原子步骤，Playbook 的最小执行单元。

```typescript
export interface Step {
  id: string      // 步骤 ID
  name: string    // 步骤名称
  spec: string    // 执行规范
  proof: string   // 验证探针 ID
}
```

### Task

任务实体，对应一个完整的工程任务。

```typescript
export interface Task {
  id: string           // 任务 UUID
  name: string         // 任务名称
  playbook: Playbook   // 执行计划
  status: TaskStatus   // 任务状态
  createdAt: number    // 创建时间戳
  updatedAt: number    // 更新时间戳
}
```

### StepManifest

步骤舱单，由 AI 写入，Core 监听。

```typescript
export interface StepManifest {
  taskId: string        // 任务 ID
  stepId: string        // 当前步骤 ID
  status: StepStatus    // 步骤状态
  artifacts: Artifact[] // 产生的工程产物
  timestamp: number     // 时间戳
}
```

**示例**：

```json
{
  "taskId": "task-123",
  "stepId": "step-1",
  "status": "passed",
  "artifacts": [
    {
      "path": "src/models/user.ts",
      "type": "code",
      "hash": "abc123..."
    }
  ],
  "timestamp": 1699999999000
}
```

### Artifact

工程产物，Step 执行产生的文件。

```typescript
export interface Artifact {
  path: string          // 文件路径
  type: ArtifactType    // 产物类型
  hash: string          // 文件哈希
}
```

### Proof

验证探针，用于机械校验 AI 产物。

```typescript
export interface Proof {
  id: string          // 探针 ID
  name: string        // 探针名称
  type: ProofType     // 探针类型
  path: string        // 脚本路径
}
```

### Project

项目实体，对应一个工程化项目。

```typescript
export interface Project {
  id: string              // 项目 UUID
  path: string            // 项目绝对路径
  name: string            // 项目名称
  status: ProjectStatus   // 项目状态
  lastHeartbeat: number   // 最后心跳时间戳
  createdAt: number       // 创建时间戳
  updatedAt: number       // 更新时间戳
}
```

## 类型关系图

```
┌─────────────────┐
│    Project      │
├─────────────────┤
│ id              │
│ path            │
│ name            │
│ status          │
│ lastHeartbeat   │
└─────────────────┘
         │
         │ creates
         ▼
┌─────────────────┐         ┌─────────────────┐
│      Task       │─────────│    Playbook     │
├─────────────────┤ contains├─────────────────┤
│ id              │         │ task            │
│ name            │         │ steps[]         │
│ playbook        │         └─────────────────┘
│ status          │                  │
│ createdAt       │                  │ contains
│ updatedAt       │                  ▼
└─────────────────┘         ┌─────────────────┐
         │                  │      Step       │
         │ has many         ├─────────────────┤
         ▼                  │ id              │
┌─────────────────┐         │ name            │
│  StepManifest   │         │ spec            │
├─────────────────┤         │ proof           │
│ taskId          │         └─────────────────┘
│ stepId          │                  │
│ status          │                  │ references
│ artifacts[]     │                  ▼
│ timestamp       │         ┌─────────────────┐
└─────────────────┘         │     Proof       │
         │                  ├─────────────────┤
         │ contains         │ id              │
         ▼                  │ name            │
┌─────────────────┐         │ type            │
│    Artifact     │         │ path            │
├─────────────────┤         └─────────────────┘
│ path            │
│ type            │
│ hash            │
└─────────────────┘
```

## 类型使用示例

### 创建 Playbook

```typescript
import type { Playbook, Step } from './types'

const playbook: Playbook = {
  task: '实现用户认证',
  steps: [
    {
      id: 'step-1',
      name: '创建用户模型',
      spec: '使用 Prisma 定义 User 模型',
      proof: 'prisma-validate'
    }
  ]
}
```

### 更新步骤状态

```typescript
import type { StepStatus } from './types'

function updateStepStatus(status: StepStatus): void {
  // TypeScript 会检查状态值是否合法
  if (status === 'passed') {
    console.log('Step passed!')
  }
}
```

### 处理 StepManifest

```typescript
import type { StepManifest, Artifact } from './types'

function processManifest(manifest: StepManifest): void {
  console.log(`Task: ${manifest.taskId}`)
  console.log(`Step: ${manifest.stepId}`)
  
  manifest.artifacts.forEach((artifact: Artifact) => {
    console.log(`Artifact: ${artifact.path} (${artifact.type})`)
  })
}
```

## 类型守卫

用于运行时类型检查：

```typescript
function isTaskStatus(value: unknown): value is TaskStatus {
  return ['pending', 'running', 'completed', 'failed'].includes(value as string)
}

function isStepStatus(value: unknown): value is StepStatus {
  return ['pending', 'running', 'passed', 'failed'].includes(value as string)
}

function isArtifactType(value: unknown): value is ArtifactType {
  return ['code', 'config', 'document', 'test'].includes(value as string)
}
```

## 导出

所有类型从 `src/types/index.ts` 统一导出：

```typescript
export * from './core'
export * from './playbook'
export * from './task'
export * from './artifact'
export * from './proof'
export * from './project'
```

使用方式：

```typescript
import type { Task, Step, Playbook } from './types'
```
