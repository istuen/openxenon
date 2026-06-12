## Context

当前 Schema Definition 存在三个问题：

### 1. StageDefinitionSchema 缺 description

```typescript
// stage.ts — 当前
StageDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  proof: z.string(),
  deps: z.array(z.string()).optional()
  // ❌ 缺少 description
})

// 但 Invocation 有 description
StageInvocationSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  proof: z.string(),
  deps: z.array(z.string()).optional()
})
```

**反了：Definition（给 AI 看的资产定义）没有 description，Invocation（调用格式）反而有。**

### 2. ProofDefinitionSchema.probes 只是 string[]

```typescript
// proof.ts:26
probes: z.array(z.string())  // ❌ 只是名字列表，无角色描述
```

AI 看到 `probes: ["fs_exists", "exec_exit_zero"]` 不知道每个 probe 验证什么、为什么要用它。

### 3. ParameterDefSchema.description 是 optional

```typescript
// probe.ts:29
description: z.string().optional()  // ❌ optional 但 Definition 是给 AI 看的
```

AI 不知道 `pattern` 参数是什么意思，需要 description 告诉它。

## Goals / Non-Goals

**Goals:**

- StageDefinitionSchema 加 `description` 字段（required）
- ProofDefinitionSchema.probes 改为结构化数组
- ParameterDefSchema.description 改为 required

**Non-Goals:**

- 不修改 Invocation Schema
- 不修改 validate 函数以外的业务逻辑
- 不修改 Infra 层 probe 执行器

## Decisions

### 1. StageDefinitionSchema 加 description

```typescript
export const StageDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),  // ✅ 新增，required
  proof: z.string(),
  deps: z.array(z.string()).optional()
})
```

### 2. ProofDefinitionSchema.probes 改为结构化

```typescript
export const ProbeRefSchema = z.object({
  ref: z.string(),           // probe 名字
  description: z.string(),  // 这个 probe 在本 proof 中的角色
  params: z.record(z.unknown()).optional()  // 默认参数（可选）
})

export const ProofDefinitionSchema = z.object({
  target: z.object({
    description: z.string()
  }),
  spec: z.object({
    description: z.string(),
    constraints: z.array(z.string()).optional()
  }),
  probes: z.array(ProbeRefSchema)  // ✅ 改为结构化数组
})
```

### 3. ParameterDefSchema.description 改为 required

```typescript
export const ParameterDefSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean']),
  required: z.boolean().optional().default(false),
  default: z.unknown().optional(),
  description: z.string()  // ✅ required
})
```

## 影响范围

### 需更新的文件

1. `src/kernel/schemas/stage.ts`: StageDefinitionSchema 加 description
2. `src/kernel/schemas/proof.ts`: ProofDefinitionSchema.probes 改为 ProbeRefSchema[]
3. `src/kernel/schemas/probe.ts`: ParameterDefSchema.description required

### 兼容性问题

- 现有 draft 资产可能没有 description 字段
- 校验会失败，需要手动补充
- 这是 **breaking change**，但对 AI 理解和校验是必要的

## 验证

1. `pnpm run typecheck`
2. `pnpm run build`
3. `oxn init -f` 重新编译 Skills