# PR-3 方案：消费侧跟进 + 文档同步

> **状态**：Draft（探索稿 · Pool）
> **日期**：2026-07-14
> **触发**：PR-1+PR-2 落地后本地测试发现的副作用整理
> **落点**：本稿为探索稿；定稿后按 `oxn work create pr-3 --blueprint doc-promote` 走 IAP 流程，分 2-3 个 PR 落地

---

## 一、PR-1+PR-2 副作用清单

### 1.1 用户感知级（work create 流程）

| # | 现象 | 根因 | 严重度 |
|---|---|---|---|
| **S1** | work.md 生成后 `blueprints.json.declaredRefs: []`、`blueprintCount: 0` | `per-work-blueprints-merger.ts:81-90` `extractBlueprintRefs` 只识别 .oxn 格式（`blueprint "X" ref "Y";`），不解析 .md 格式（`## Use` 段） | 🔴 高 — Blueprint 依赖未记录到 planLock |
| **S2** | `oxn work finalize` 调 `collectWorkDomainProofs` 找不到 Domain 引用 | `work.ts:2892` 读 work.md `## Refs` 段找 `kind: domain`；新格式是 `## Use` | 🔴 高 — Domain 边界验证失效 |
| **S3** | `oxn work edit-task` 的 `setRef` / `appendRef` / `ensureRefs` 找不到目标段 | `work.ts:1400-1413` 用 `## Refs` regex | 🟢 低 — edit-task 操作 task.md，task.md 仍用 `## Refs`（正确）；不影响 |
| **S4** | work-skeleton.ts docs 注释还说"work ## Refs 只接受 blueprint" | `work-skeleton.ts:5,21,24,53,55` 注释过时 | 🟢 低 — 不影响功能 |

### 1.2 Blueprint 解析级

| # | 现象 | 根因 | 严重度 |
|---|---|---|---|
| **S5** | `parseBlueprintSlim` 不解析 .md 格式的 `## Use` 和 `## Boundaries` | `per-work-blueprints-merger.ts:189-256` 全文用 .oxn regex（`blueprint "X" { ... }`） | 🔴 高 — Blueprint 内部 boundary 解析全失效 |
| **S6** | `oxn blueprint validate create-doc-md` 输出 "0 use refs" | 同上：refs 解析失败 | 🔴 高 — 用户看到"valid"但实际 Blueprint 引用关系没校验 |
| **S7** | Asset/create.ts 的 `createBlueprintTemplate` 仍生成 `## Refs` 段 | `Asset/create.ts:113` 模板未更新 | 🟡 中 — `oxn asset create` 生成的 Blueprint 是旧格式 |
| **S8** | Asset/create.ts 的 `createWorkflowTemplate` 仍生成 `## Props` + `## Slots` | `Asset/create.ts:212-214` 注释+模板 | 🟡 中 — `oxn asset create` 生成的 Workflow 是旧格式 |
| **S9** | Asset/create.ts 的 `createStackTemplate` 仍生成 `## Runtimes`/`## Linters`/`## Tests` | `Asset/create.ts:217` 模板 | 🟡 中 — `oxn asset create` 生成的 Stack 是旧格式 |

### 1.3 Task 解析级

| # | 现象 | 根因 | 严重度 |
|---|---|---|---|
| **S10** | work-manager.ts 也有一个独立的 task 模板（含 `### slot-name` + `## Refs`） | `work-manager.ts:285-298` | 🟡 中 — `oxn work create` 走 work-manager.ts 路径，task 模板与 work.ts 路径不一致 |

### 1.4 文档/Skill 级

| # | 现象 | 根因 | 严重度 |
|---|---|---|---|
| **S11** | 11 个 .md 文档含 `## Refs`/`## Slots`/`## Externals` 旧语法 | oxn-asset + oxn-work skill docs（5 中文 + 6 英文） | 🟡 中 — 用户读 docs 学会的是旧语法 |
| **S12** | 4 个 oxn-asset 模板（中文）未更新 | `packages/cli/src/skills/locales/zh-CN/oxn-asset/assets/` | 🟡 中 — `oxn asset create` 用的模板 |
| **S13** | 4 个 oxn-asset 模板（英文）未更新 | `packages/cli/src/skills/locales/en/oxn-asset/assets/` | 🟡 中 |
| **S14** | en/zh 的 oxn-asset `references/asset-kind-reference.md` 和 `instruction.md` 描述旧 5 AssetKind 体系（含 Externals） | 同上 | 🟡 中 |
| **S15** | en/zh 的 oxn-work `instruction.md` 还说 `## Refs` | 同上 | 🟡 中 |

### 1.5 废弃的 External 命令

| # | 现象 | 根因 | 严重度 |
|---|---|---|---|
| **S16** | `oxn external check/status/mark` 命令可执行但找不到任何 ## Externals 段 | `external.ts:55` 读 `## Externals`；PR-1 已删除 | 🟢 低 — 3 个测试已 skip；命令变空操作 |

---

## 二、PR-3 范围划分

按"影响半径"和"优先级"划分 3 个 PR：

### PR-3.1：消费侧解析跟进（核心，🔴 高）

**目标**：让 work.md 的 `## Use` 段、Blueprint 的 `## Use`/`## Boundaries` 段被正确解析。

**改动文件**：

1. **`packages/engine/src/Work/per-work-blueprints-merger.ts`**
   - `extractBlueprintRefs`：增加 .md 格式解析（识别 `## Use` 段下的 `### name` + `- kind: blueprint` + `- ref: @prj/...`）
   - `parseBlueprintSlim`：增加 .md 格式解析（识别 `## Use` 提取 use 列表，识别 `## Boundaries` 提取 boundaries）
   - 注释更新（多处提到"## Refs"）

2. **`packages/cli/src/commands/work.ts`**
   - `collectWorkDomainProofs`：work.md `## Refs` regex → `## Use` regex
   - 注释更新（line 2881 等）

3. **`packages/engine/src/Work/work-skeleton.ts`**
   - 注释更新（5 处提到"work ## Refs"）

4. **新增/更新测试**
   - `per-work-blueprints-merger.test.ts`：增加 .md 格式测试
   - 新增 `work-md-extract-refs.test.ts`（work.md ## Use 段解析）

### PR-3.2：Asset 模板跟进（🟡 中）

**目标**：`oxn asset create` 生成的模板用新语法。

**改动文件**：

1. **`packages/engine/src/Asset/create.ts`**
   - `createBlueprintTemplate`：使用 `## Use` + `## Boundaries` 语法
   - `createWorkflowTemplate`：移除 `## Props` + `## Slots` 中的 `deps`/`observe`，保留 `desc` 字段，删除 `## Externals`
   - `createStackTemplate`：合并为 `## Tools`，删除 `## Externals`
   - 注释更新

2. **`packages/engine/src/Work/work-manager.ts`**
   - 第 285-298 行的 task 模板：更新为 `### implement`（与 work.ts 路径一致）

### PR-3.3：Skill 文档同步（🟡 中）

**目标**：用户通过 `oxn init` 获得的 Skills 反映新语法。

**改动文件**：

1. **`packages/cli/src/skills/locales/zh-CN/oxn-asset/`**
   - `assets/domain.md`、`workflow.md`、`stack.md`、`blueprint.md` — 已在 PR-1 完成 ✅
   - `instruction.md` — 描述更新为 5 AssetKind（移除 Externals/Stack 段说明）
   - `references/asset-kind-reference.md` — 移除 `## Externals` 相关描述
   - `references/asset-creation.md` — 同步更新
   
2. **`packages/cli/src/skills/locales/en/oxn-asset/`**（同上 5 个文件）

3. **`packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/instruction.md`**
   - `## Refs` → `## Use`

---

## 三、PR-3.1 详细设计

### 3.1.1 `extractBlueprintRefs` 支持 .md

```typescript
// 旧：只支持 .oxn
const re = /blueprint\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g

// 新：同时支持 .oxn 和 .md
export function extractBlueprintRefs(content: string): DeclaredBlueprintRef[] {
  const out: DeclaredBlueprintRef[] = []
  
  // .oxn 格式：blueprint "X" ref "Y";
  const oxnRe = /blueprint\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g
  for (const m of content.matchAll(oxnRe)) {
    out.push({ name: m[1]!, ref: m[2] ?? null })
  }
  
  // .md 格式：## Use 下 ### name + - kind: blueprint + - ref: @prj/...
  if (out.length === 0) {
    const useMatch = content.match(/## Use\n([\s\S]*?)(?=\n## |\n# |$)/)
    if (useMatch) {
      for (const block of useMatch[1]!.split(/\n(?=### )/)) {
        if (!block.startsWith('### ')) continue
        const name = block.replace(/^### /, '').trim()
        const kind = block.match(/- kind:\s*(\S+)/)?.[1]
        if (kind === 'blueprint') {
          const ref = block.match(/- ref:\s*(\S+)/)?.[1] ?? null
          out.push({ name, ref })
        }
      }
    }
  }
  
  return out
}
```

### 3.1.2 `parseBlueprintSlim` 支持 .md

```typescript
// 旧：全文用 .oxn regex
// 新：先用 .oxn regex，失败则 fallback 到 .md native parser（复用 extractBlueprintIR）

export function parseBlueprintSlim(content: string): ParsedBlueprintSlim {
  const errors: string[] = []
  
  // v0.7: 优先尝试 .md 格式（canonical）
  if (/^---\n/.test(content.trimStart()) || /## (Use|Boundaries)\b/m.test(content)) {
    return parseBlueprintSlimFromMd(content, errors)
  }
  
  // Fallback: .oxn 格式
  return parseBlueprintSlimFromOxn(content, errors)
}

function parseBlueprintSlimFromMd(content: string, errors: string[]): ParsedBlueprintSlim {
  // 复用 extractBlueprintIR 的 .md 解析
  // 把 use.domain/workflow/stack → domainRefs/workflowRefs/stackRefs
  // 把 boundaries → slots（保持向后兼容的 slim 接口）
  ...
}
```

### 3.1.3 `collectWorkDomainProofs` 支持 `## Use`

```typescript
// 旧：/## Refs\n([\s\S]*?)(?=\n## |\n# |$)/
// 新：/## Use\n([\s\S]*?)(?=\n## |\n# |$)/
const refsSection = content.match(/## Use\n([\s\S]*?)(?=\n## |\n# |$)/)
```

### 3.1.4 Task `## Refs` 保持不变

`work.ts:1400-1413` 的 `setRef` / `appendRef` / `ensureRefs` 是 `edit-task` 子命令用的，操作的是 task.md。task.md 仍用 `## Refs` 段（因为 Task 引用 blueprint/domain 是 use 关系，命名选择统一为 `## Refs`）。保持原样。

### 3.1.5 新增测试用例

```typescript
// per-work-blueprints-merger.test.ts 新增：
describe('extractBlueprintRefs (.md format)', () => {
  test('## Use 段提取单 ref', () => {
    const md = `## Use\n### foo\n- kind: blueprint\n- ref: @prj/blueprints/foo\n`
    expect(extractBlueprintRefs(md)).toEqual([
      { name: 'foo', ref: '@prj/blueprints/foo' }
    ])
  })

  test('## Use 段提取多 ref（保留顺序）', () => { ... })
  test('## Use 段空（无 ref）', () => { ... })
  test('.oxn 格式仍然工作（向后兼容）', () => { ... })
})
```

---

## 四、PR-3.2 详细设计

### 4.1.1 `createBlueprintTemplate` 用新语法

```typescript
function createBlueprintTemplate(name: string, format: AssetFormat): string {
  if (format === 'md') {
    return `---
entity: blueprint
version: 0.3.0
name: ${name}
abstract: TODO: one-line description of this composition template
---

# Blueprint: ${name}

> 组合模板：声明此工作所需的 Domain + Workflow + Stack 边界组合

## Use
### domain-1
- domain: @md/domains/YourDomain
### workflow-1
- workflow: @md/workflows/YourWorkflow
### stack-1
- stack: @md/stacks/YourStack

## Boundaries

### build
- refs:
  - domain: domain-1
  - workflow: workflow-1
  - stack: stack-1
- observe:
  - ts-compiles
- deps: []

### test
- refs:
  - domain: domain-1
  - workflow: workflow-1
  - stack: stack-1
- observe:
  - test-pass
- deps:
  - build
`
  }
  // .oxn 路径：保留（向后兼容），但也更新 use/boundary 语法
  ...
}
```

### 4.1.2 `createWorkflowTemplate` 简化

```typescript
function createWorkflowTemplate(name: string, format: AssetFormat, slots: ...): string {
  if (format === 'md') {
    return `---
entity: workflow
version: 0.3.0
name: ${name}
abstract: TODO: one-line description of this execution flow
---

# Workflow: ${name}

> TODO: one-line description of this execution flow

## Slots

### analyze
- desc: TODO: 分析阶段要做什么

### implement
- desc: TODO: 实现阶段要做什么

### verify
- desc: TODO: 验证阶段要做什么
`
  }
  ...
}
```

### 4.1.3 `createStackTemplate` 合并 Tools

```typescript
function createStackTemplate(name: string): string {
  return `---
entity: stack
version: 0.3.0
name: ${name}
abstract: TODO: one-line description of the tech stack
---

# Stack: ${name}

> TODO: one-line description of this tech stack

## Tools

### typescript
- version: ">=5.0.0"

### node
- version: ">=20.0.0"

### biome
- config: "biome.json"

### bun-test
- command: "bun test"
`
}
```

### 4.1.4 work-manager.ts task 模板

```typescript
// work-manager.ts:285-298
const template = `---
entity: task
version: 0.3.0
name: ${taskName}
---

# Task: ${taskName}

## Parts
### implement
- skill_context: "TODO: 描述 AI 执行指令"

## Refs
${refsSection}
`
```

---

## 五、PR-3.3 详细设计

### 5.1.1 `asset-kind-reference.md` 删除 Externals

```markdown
# 移除：
- **External inline**: external resource references declared via `## Externals` H2 category inside boundary types
- **可选 `## Externals`** 描述

# 替换为：
- **External inline**（已移除）：v0.7+ 外部资源引用统一通过 Asset Paper Schema 的 `references: [{ url: "..." }]` 字段声明
```

### 5.1.2 `instruction.md` 同步

```markdown
# 5 AssetKind 描述更新：
- **Domain** = 业务边界（term/ban/invariant）
- **Workflow** = 执行边界（slot DAG with desc only）
- **Stack** = 环境边界（tools 列表）
- **Blueprint** = 组合模板（`## Use` 引用 3 边界 + `## Boundaries` 编排单元）
- **Roadmap** = 跨类型导航索引
```

### 5.1.3 oxn-work `instruction.md` Use 替换

```markdown
# 替换：
- **Work 级 `## Use`**: 声明 blueprint refs（多个）
- 或手动 `fork assets/work-{explore,develop,fix,onboarding}.md → work.md` 自编辑 `## Use` + `## Context`。
```

---

## 六、验证标准

每个 PR 落地后：
- `bun run typecheck` 通过
- `bun run lint` 通过
- `bun test` 全部通过（不含已 skip 的 external 测试）
- 本地实际 `oxn init` + `oxn work create` 端到端跑通

PR-3.1 验收：跑 work create 后 `blueprints.json.declaredRefs` 不为空，包含 blueprint ref。

---

## 七、PR 拆分与依赖

```
PR-3.1 消费侧解析
  └─ 依赖：无（PR-1+PR-2 已完成）
PR-3.2 Asset 模板
  └─ 依赖：无（与 PR-3.1 独立）
PR-3.3 Skill 文档
  └─ 依赖：PR-3.2（doc 描述 Asset 模板要一致）
```

**建议顺序**：PR-3.1 → PR-3.2 → PR-3.3

---

## 八、不在 PR-3 范围

- `oxn external` 命令完全移除（推迟到 v0.7+ 删除命令）
- `## Externals` parser 模块移除（`external-validate.ts` 等保留，PR-3.1 不动）
- 老的 .oxn 格式输出（保留向后兼容）
- 老的 ## Slots / ## Props parser 移除（已通过 deprecation warning 标记）

---

## 九、参考

- [PR-1 探索稿](./blueprint-structure-design.md) — 总体设计
- [PR-2 changelog](../../../../.changes/0-6-1-blueprint-structure-pr2.md) — Work create 流程
- [blueprint-structure-design.md §八](./blueprint-structure-design.md#八与当前实现的差距) — 实施时的差距清单
- ADRs: 0054 (三边界框架) / 0055 (Blueprint 组合模板) / 0056 (External inline)
