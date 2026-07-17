# External 注入设计：Work 预写入 + Task 自包含

> **日期**：2026-07-12
> **状态**：📝 Draft（待 review）
> **关联 ADR**：ADR-0056（External inline 收敛）、ADR-0054（三边界框架）
> **关联 RFC**：work-unified-model-rfc.md（Work 统一模型）

---

## 0. 问题

当前 External 机制（`## Externals` in Domain/Workflow/Stack）是**纯声明式**的：

1. DomainCompiler.parse() 解析元数据（name/kind/path/summary）
2. validateExternal() 校验结构（kind 枚举、url/path 互斥）
3. **work-context-builder.ts 完全不读 externals** — `WorkContextResult` 无 `externals` 字段
4. Work 执行时 **零消费** — `packages/engine/src/Work/` 无任何 external 引用
5. 只有 CLI `oxn external check` 手动触发可达性检查

**结果**：ADR 作为约束被 Domain 声明后，AI Agent 在执行 Work/Task 时看不到 ADR 内容，无法遵守约束。

---

## 1. 设计理念

### 1.1 核心原则

> **Work 层消化，Task 层消费。**

- Work Intent 阶段：AI 读取 External 元数据 + 文件内容 → 抽取概述 → 写入 Work 上下文
- Work 编排阶段：基于概述设计 Task → 把相关概述写入 task.md
- Task 执行阶段：加载 task.md（自包含）→ 不再读 Asset/External
- Task 升级阶段：遇到困难 → 向 Work 请求 → Work 按需读取 Asset/External

### 1.2 两层注入模型

```
Work 级（Intent 阶段，上下文消耗最大）
  ├─ 读取 Asset External 元数据（指针）
  ├─ AI 逐个读取 External 文件内容
  ├─ 抽取 Work 所需的"内容概述"
  └─ 概述写入 Work 上下文

Task 级（执行阶段，自包含）
  ├─ task.md 包含预写入的上下文（Work 概述子集）
  ├─ 不读 Asset、不读 External、不读 Work
  └─ 遇到困难时升级到 Work
```

### 1.3 External 的角色变化

| 之前 | 之后 |
|---|---|
| External = 运行时动态注入的指针 | External = Work Intent 阶段的一次性读取源 |
| 每次构建上下文都要重新读取 | Work 读取后"消化"为概述，写入 Task |
| Task 执行依赖外部文件 | Task 执行只依赖 task.md（自包含） |

---

## 2. 数据模型变更

### 2.1 DomainFileSummary 增加 externals

**文件**：`packages/engine/src/oxl/summary-extractors.ts`

```typescript
export type DomainFileSummary = {
  name: string
  description?: string
  language?: {
    terms: Array<{ name: string; desc: string }>
    ban: string[]
    invariant: string[]
  }
  externals?: Array<{        // ← 新增
    name: string
    url?: string | null
    path?: string | null
    kind: string
    summary?: string | null
  }>
} | null
```

### 2.2 WorkContextResult Work 级暴露 domainExternals

**文件**：`packages/engine/src/Work/work-context-builder.ts`

Work 级返回（无 taskName 时）新增 `domainExternals` 字段：

```typescript
domainExternals: Array<{
  domainName: string
  externals: Array<{
    name: string
    url?: string | null
    path?: string | null
    kind: string
    summary?: string | null
  }>
}>
```

---

## 3. 代码变更

### 3.1 readDomainFile 解析 ## Externals（轻量正则）

**文件**：`packages/engine/src/oxl/summary-extractors.ts`

在 `readDomainFile` 函数中增加 Externals 解析。**独立实现**，不引入 md-bridge 编译依赖。

解析目标：
```markdown
## Externals
### trust-chain-model
- path: .openxenon/docs/adrs/0057-trust-chain-core-model.md
- kind: adr
- summary: "信任链核心模型"
### axios-docs
- url: https://axios-http.com/docs
- kind: library
```

解析逻辑：
1. 匹配 `## Externals` H2 section
2. 在 section 内匹配 `### name` H3 条目
3. 对每个 H3 匹配嵌套列表字段（path/url/kind/summary）
4. 返回 `ExternalEntry[]`

### 3.2 WorkContextResult Work 级返回

**文件**：`packages/engine/src/Work/work-context-builder.ts`

Work 级路径（line 207-221）增加 `domainExternals`：

```typescript
// 读取所有引用 Domain 的 External 元数据
const domainExternals = work.domains.map(d => {
  const kebab = camelToKebab(d.name)
  const candidates = [
    join(root, BOUNDARY_DIR, 'domains', `${d.name}.md`),
    join(root, BOUNDARY_DIR, 'domains', `${kebab}.md`),
  ]
  for (const p of candidates) {
    const domData = readDomainFile(p)
    if (domData?.externals) {
      return { domainName: d.name, externals: domData.externals }
    }
  }
  return { domainName: d.name, externals: [] }
})

return {
  ...同上,
  domainExternals,
}
```

### 3.3 renderContextHuman 渲染 External 元数据

**文件**：`packages/engine/src/Work/work-context-builder.ts`

Work 级渲染时显示 External 元数据：

```
## External References (read during Intent)
  TrustChain Domain:
    - ADR-0057 (adr): .openxenon/docs/adrs/0057-trust-chain-core-model.md
    - ADR-0008 (adr): .openxenon/docs/adrs/0008-probe-observation-vs-verdict.md
  ProofAxis Domain:
    - axios-docs (library): https://axios-http.com/docs
```

---

## 4. AI 行为设计

### 4.1 Work Intent 阶段（AI 执行）

```
1. 读取 Work 上下文中的 External References
2. 对于每个 External：
   a. kind: adr → 读取 path 文件内容 → 抽取约束概述
   b. kind: library → 记录元数据（按需深读）
   c. kind: rest-api → 记录端点信息
   d. 其他 → 记录元数据
3. 将抽取的概述写入 Work 上下文
4. 编排 Task 时，将相关概述写入 task.md
```

### 4.2 Work 编排阶段（AI 执行）

```
1. 基于 Work 概述设计 Task 结构
2. 为每个 Task 选择 1 个 Domain（从 Work 级 ref 池）
3. 将该 Domain 相关的 External 概述写入 task.md
4. task.md = 预写入的完整上下文
```

### 4.3 Task 执行阶段（AI 执行）

```
1. 加载 task.md → 已包含完整上下文
2. 不读 Asset、不读 External、不读 Work
3. 按 task.md 中的约束执行
```

### 4.4 Task 升级阶段（AI 执行）

```
1. Task 遇到困难 → 向 Work 请求检查
2. Work 能解决 → 直接返回
3. Work 需要更多信息 → 读取 Asset（包括 External）内容
4. 返回结果给 Task
```

---

## 5. 渐进式选取

### 5.1 Work 级：元数据全量

Work 上下文看到所有引用 Domain 的 External 元数据（指针）。这是 Work Intent 阶段的"目录"。

### 5.2 Intent 阶段：AI 按需读取

AI 根据 External 的 kind 和 Work 的 goal 决定是否读取文件内容：

| kind | 读取策略 | 原因 |
|---|---|---|
| `adr` | **读取内容** | 约束必须完整了解 |
| `library` | 按需读取 | 参考文档可能很大 |
| `rest-api` | 仅元数据 | 端点信息，不需要全文 |
| `documentation` | 按需读取 | 参考文档 |
| `webhook` | 仅元数据 | 配置信息 |
| `config` | 仅元数据 | 配置信息 |
| `service` | 按需读取 | 服务文档 |

### 5.3 Task 级：预写入自包含

Task 执行时只加载 task.md，不读取任何外部文件。task.md 中已包含 Work Intent 阶段消化的 External 概述。

---

## 6. 上下文预算

| 场景 | 大小 | 评估 |
|---|---|---|
| 1 个 ADR（中位） | 1.1 KB | ✅ 极小 |
| 3 个 ADR | 3.4 KB | ✅ 可控 |
| 5 个 ADR | 5.7 KB | ✅ 可控 |
| 1 个 RFC（中位） | 17 KB | ⚠️ 较大（按需读取） |
| 1 个 library 文档 | 不确定 | ⚠️ 按需读取 |

**结论**：ADR 全量读取不会爆炸。RFC 和 library 按需读取。

---

## 7. 改动量

| 文件 | 改动 | 行数 |
|---|---|---|
| `summary-extractors.ts` | `DomainFileSummary` 加 `externals` + `readDomainFile` 解析 | ~30 行 |
| `work-context-builder.ts` | Work 级返回 `domainExternals` + `renderContextHuman` 渲染 | ~15 行 |
| oxn-work skill 文档 | Intent 阶段增加 External 读取指引 | ~10 行 |
| **总计** | | **~55 行** |

---

## 8. 后续扩展（v0.7+）

| 扩展 | 描述 | 优先级 |
|---|---|---|
| Proof 记录 External 合规性 | Task 执行后记录是否遵守了 ADR 约束 | P2 |
| External TTL 自动检查 | Work Intent 阶段检查 External 可达性 | P2 |
| External 版本追踪 | ADR 更新后 Work 检测漂移 | P3 |
