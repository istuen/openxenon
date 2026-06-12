## Context

### 当前状态

当前代码存在**三层架构断裂**：

**1. Schema 错位**

```
 ProbeSchema (调用格式):
   { type: 'fs_exists', params: { path: string } }

 canonical.yaml (定义格式):
   { type: 'fs_exists', description: string, parameters: [...], semantics: {...} }
```

`createDraftProbe()` 用 `ProbeSchema` 校验 `canonical.yaml` 格式的内容，必然失败。

**2. Forge 循环断裂**

```
Skill 指令: "oxn forge probe --save '<yaml>' --name xxx"
CLI 实现:   只有 displayMetaForge()，--save 分支虽然存在于本地修改但校验会失败
```

**3. Task 循环断裂**

```
Skill 指令: "oxn task submit / next / verify"
CLI 实现:   subCommands: {} 空壳
```

### 约束

- TypeScript + Bun
- CLI/Daemon 通过 Unix Socket 传递纯 JSON
- Kernel 绝对禁止任何 I/O 操作
- Skill 必须是纯文本指令，不应 import 任何模块

## Goals / Non-Goals

**Goals:**
- 新增 DefinitionSchema (定义格式)，与 InvocationSchema (调用格式) 分离
- Forge 循环闭合：CLI --save + Schema 修复
- Task 循环闭合：4 个子命令实现
- Skill 架构净化：删除所有 import 和辅助函数

**Non-Goals:**
- 不修改 Daemon IPC handlers
- 不修改 Infra 层实现
- 不修改 architecture.md 本身

## Decisions

### Decision 1: 新增 DefinitionSchema 还是复用 InvocationSchema

**选择: 新增 DefinitionSchema (ProbeDefinitionSchema / ProofDefinitionSchema / StageDefinitionSchema)**

**理由:**
- 定义格式和调用格式是两种不同生命周期的数据，不能共用同一个 Schema
- 定义格式用于 canonical.yaml/draft.yaml，包含 `parameters` 元信息
- 调用格式用于 step-manifest.json，包含具体的 `params` 参数值
- 两者结构完全不同，不能通过简单改造兼容

**替代方案:**
- 方案 A (复用): 把 parameters 加到 InvocationSchema → 结构歧义，不能区分"元参数定义"和"实际参数值"
- 方案 B (改名): 把现有 Schema 改名为 InvocationSchema，新增 DefinitionSchema → 职责清晰，各自职责单一

### Decision 2: Skill 保留辅助函数还是彻底纯文本化

**选择: 彻底纯文本化，删除所有辅助函数**

**理由:**
- Skill 的 `instruction` 字段是给 AI 看的执行指令
- `getDefaultConstraints()`、`loadMetaBlueprintFromProject()` 这些辅助函数做了 I/O，违反了 Skill 纯文本原则
- 约束信息应该通过 CLI 命令获取（`oxn forge probe`），不是 Skill 自己读文件系统
- 彻底纯文本化后，Skill 的职责更清晰：只描述"做什么"，不关心"怎么做"

**替代方案:**
- 方案 A (保留辅助函数): 保留纯函数的辅助方法 → Skill 仍可执行，有隐蔽副作用
- 方案 B (彻底纯文本): 删除所有 import 和辅助函数 → Skill 是纯文本契约，职责边界清晰

### Decision 3: 先修 Schema 还是先修 CLI

**选择: 先修 Schema，再修 CLI，最后修 Skill**

**理由:**
- Schema 是基础设施，CLI 和 Skill 都依赖正确的 Schema
- 如果先修 CLI，Schema 仍是错的，Forge 循环仍然失败
- 按依赖顺序：Schema → CLI → Skill

## Decisions

### Decision 1: Schema 设计

```
ProbeDefinitionSchema (资产定义格式):
  type: ProbeTypeSchema
  description: z.string()
  parameters: z.array(ParameterDefSchema)
  semantics: SemanticsSchema.optional()

ProbeInvocationSchema (调用格式，现有的 ProbeSchema 改名):
  type: ProbeTypeSchema
  params: ProbeParamsSchema
```

**关键点:**
- `parameters` 是"参数定义"（告诉 AI 这个 Probe 接受什么参数）
- `params` 是"实际参数值"（给 Infra 执行时用）
- 两者不能混淆

### Decision 2: Skill 纯文本化

Skill 删掉所有 import，只保留 `instruction` 文本：

```
oxn-forge.ts:
  - 删除 import { createDraftFromYaml } from '../cli/draft'
  - 删除 import { existsSync, readFileSync } from 'fs'
  - 删除 import { BOUNDARY_DIR } from '../kernel/constants'
  - 删除 loadMetaBlueprintFromProject()
  - 删除 getDefaultConstraints()
  - 删除 parseForgeRequest()
  - 删除 getForgeConstraints()
  - 只保留: export const oxnForgeSkill: OpenXenonSkill = { id, description, instruction, examples }

oxn-task.ts:
  - 删除 import type { Stage } from '../kernel/lib/types/stage'
  - 删除 examples 中的 as unknown as Stage
  - 只保留 instruction 纯文本
```

### Decision 3: 修改范围

```
kernel/schemas/probe.ts:
  + ParameterDefSchema
  + SemanticsSchema
  + ProbeDefinitionSchema
  + ProbeInvocationSchema (= 现有 ProbeSchema 改名)
  + validateProbeDefinition()
  ~ validateProbe() 改为调用 ProbeInvocationSchema

kernel/schemas/proof.ts:
  + ProofDefinitionSchema
  + ProofInvocationSchema (= 现有 ProofSchema 改名)
  + validateProofDefinition()

kernel/schemas/stage.ts:
  + StageDefinitionSchema
  + StageInvocationSchema (= 现有 StageSchema 改名)
  + validateStageDefinition()

kernel/schemas/index.ts:
  ~ 导出新 Schema 和函数

cli/draft.ts:
  ~ createDraftProbe() 调用 validateProbeDefinition()
  ~ createDraftProof() 调用 validateProofDefinition()
  ~ createDraftStage() 调用 validateStageDefinition()
```

## Risks / Trade-offs

| 风险 | 描述 | 缓解 |
|------|------|------|
| Schema 改名影响范围 | ProbeSchema 改名可能影响大量引用方 | 保留旧名字作为别名指向新名字 |
| Skill 纯文本化后约束获取 | 删除 getDefaultConstraints() 后 AI 怎么知道约束 | Skill instruction 明确告诉 AI 执行 `oxn forge <type>` 获取约束 |
| Task 子命令实现不完整 | 本地修改只有空壳 | 验证循环时先跑 `oxn task submit`，确认 IPC 调用成功 |

## Migration Plan

**步骤 1: Schema 修复**
```bash
# 修改 4 个 schema 文件
# 改完后手动跑: oxn forge probe --save '...' --name test
# 验证输出 { ok: true, data: { path: "..." } }
```

**步骤 2: CLI 验证**
```bash
# Forge 循环: oxn forge probe --save '<yaml>' --name xxx
# Task 循环: oxn task submit --blueprint xxx.yaml
```

**步骤 3: Skill 纯文本化**
```bash
# 删除 import 和辅助函数
# 验证 Skill 编译仍能正常工作
```

**回滚:**
```bash
git reset --hard  # 回到未修改状态
```

## Open Questions

1. **Proof/Stage 的 DefinitionSchema 结构是否与 Probe 一致？** 需要对照现有 canonical.yaml 确认具体字段。
2. **Skill 的 examples 字段是否需要删除？** examples 中的 Stage 类型引用了 kernel types，需要确认是否可以硬编码示例。
3. **local 侧的 uncommitted 修改是否先 commit？** 如果需要保留干净的 commit 历史，建议先 commit 本地修改再开始实现。
