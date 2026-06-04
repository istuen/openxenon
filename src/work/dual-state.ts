import { z } from 'zod'

// =============================================================================
// v0.1 DDD 双层状态机
//
// 层级 1: WorkspaceState (work.oxn 级)
//   - 范围：整个 work 编排
//   - 内容：work 名 + 上下文 + 任务 DAG 整体状态 + 所有 task 的轻量索引
//
// 层级 2: TaskState (task.oxn 级)
//   - 范围：单个 task 的执行
//   - 内容：blueprint + injects + slot 状态机 + probe 结果
//
// 两层独立读写，通过 workName 关联。
// =============================================================================

// ---------- Workspace 层 ----------

export const WorkspaceTaskStatusSchema = z.enum(['pending', 'running', 'passed', 'failed', 'error'])

export const WorkspaceTaskIndexSchema = z.object({
  taskName: z.string().min(1),
  blueprint: z.string().min(1),
  injects: z.array(z.string()).default([]),
  status: WorkspaceTaskStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
})

export const WorkspaceStateSchema = z.object({
  workName: z.string().min(1),
  status: WorkspaceTaskStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  // v0.1: 编排来源
  domains: z.array(z.string()).default([]),
  blueprints: z.array(z.string()).default([]),
  // 任务 DAG 索引（不存储详细执行，只存状态）
  tasks: z.array(WorkspaceTaskIndexSchema).default([]),
  // 可选 skill context（从 work.oxn 复制而来，便于离线读取）
  skillContext: z
    .object({
      overallGoal: z.string().default(''),
      constraints: z.array(z.string()).default([]),
      maxIterations: z.number().int().min(1).default(3),
    })
    .optional(),
})

export type WorkspaceTaskStatus = z.infer<typeof WorkspaceTaskStatusSchema>
export type WorkspaceTaskIndex = z.infer<typeof WorkspaceTaskIndexSchema>
export type WorkspaceState = z.infer<typeof WorkspaceStateSchema>

export function createInitialWorkspaceState(params: {
  workName: string
  domains?: string[]
  blueprints?: string[]
  tasks?: Array<{ taskName: string; blueprint: string; injects?: string[] }>
  overallGoal?: string
  constraints?: string[]
  maxIterations?: number
}): WorkspaceState {
  const now = new Date().toISOString()
  return {
    workName: params.workName,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    domains: params.domains ?? [],
    blueprints: params.blueprints ?? [],
    tasks: (params.tasks ?? []).map((t) => ({
      taskName: t.taskName,
      blueprint: t.blueprint,
      injects: t.injects ?? [],
      status: 'pending',
    })),
    skillContext: {
      overallGoal: params.overallGoal ?? '',
      constraints: params.constraints ?? [],
      maxIterations: params.maxIterations ?? 3,
    },
  }
}

// ---------- Task 层 ----------

export const TaskPartStatusSchema = z.enum(['pending', 'running', 'passed', 'failed', 'error'])

export const TaskPartExecutionSchema = z.object({
  partName: z.string().min(1),
  align: z.string().default(''),
  status: TaskPartStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  durationMs: z.number().optional(),
  probes: z.array(z.any()).default([]),
  // 可选 skill 快照
  skill: z
    .object({
      lifecycle: z.string().default('code'),
      objective: z.string().default(''),
      acceptance: z.array(z.string()).default([]),
      guidance: z.string().optional(),
    })
    .optional(),
})

export const TaskStateSchema = z.object({
  workName: z.string().min(1),
  taskName: z.string().min(1),
  blueprint: z.string().min(1),
  injects: z.array(z.string()).default([]),
  status: TaskPartStatusSchema,
  currentPart: z.string().nullable().default(null),
  completedParts: z.array(z.string()).default([]),
  loopMeta: z.object({
    currentIteration: z.number().int().min(0),
    maxIterations: z.number().int().min(1),
  }),
  partExecutions: z.array(TaskPartExecutionSchema).default([]),
  // 可选 skill context (从 task.oxn context 块)
  skillContext: z
    .object({
      objective: z.string().default(''),
      constraints: z.array(z.string()).default([]),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type TaskPartStatus = z.infer<typeof TaskPartStatusSchema>
export type TaskPartExecution = z.infer<typeof TaskPartExecutionSchema>
export type TaskState = z.infer<typeof TaskStateSchema>

export function createInitialTaskState(params: {
  workName: string
  taskName: string
  blueprint: string
  injects?: string[]
  partNames: string[]
  maxIterations?: number
  objective?: string
  constraints?: string[]
}): TaskState {
  const now = new Date().toISOString()
  return {
    workName: params.workName,
    taskName: params.taskName,
    blueprint: params.blueprint,
    injects: params.injects ?? [],
    status: 'running',
    currentPart: params.partNames[0] ?? null,
    completedParts: [],
    loopMeta: {
      currentIteration: 0,
      maxIterations: params.maxIterations ?? 3,
    },
    partExecutions: params.partNames.map((p) => ({
      partName: p,
      align: p,
      status: 'pending' as TaskPartStatus,
      probes: [],
    })),
    skillContext: {
      objective: params.objective ?? '',
      constraints: params.constraints ?? [],
    },
    createdAt: now,
    updatedAt: now,
  }
}

export function isWorkspaceState(value: unknown): value is WorkspaceState {
  return WorkspaceStateSchema.safeParse(value).success
}

export function isTaskState(value: unknown): value is TaskState {
  return TaskStateSchema.safeParse(value).success
}
