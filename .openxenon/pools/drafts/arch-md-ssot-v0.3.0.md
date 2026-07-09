---
name: arch-md-ssot
version: 0.3.0
type: architecture
status: current
author: opencode
date: 2026-06-20
---

# Architecture: v0.3.0 MD-SSOT 体系

> **版本**：v0.3.0
> **状态**：current
> **目的**：定义 v0.3.0 MD-SSOT 体系的架构组件、数据流、关键决策
> **关联**：[`req-md-ssot-v0.3.0.md`](./req-md-ssot-v0.3.0.md) | [`dev-design-md-ssot-v0.3.0.md`](./dev-design-md-ssot-v0.3.0.md) | [`l0-l3-alignment.md`](../l0-l3-alignment.md)

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        v0.3.0 MD-SSOT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   L3 CLI     │  │   L3 Daemon  │  │  L3 Skills   │          │
│  │ oxn domain   │  │  scanInten- │  │ oxn-cli/     │          │
│  │   --md       │  │  tPools     │  │ oxn-work/    │          │
│  │ oxn blueprint│  │             │  │ oxn-proof/   │          │
│  │   --md       │  │             │  │ oxn-md       │          │
│  │ oxn work     │  │             │  │  (新增)      │          │
│  │   --md       │  │             │  │              │          │
│  │ oxn proof    │  │             │  │              │          │
│  │   --md       │  │             │  │              │          │
│  │ oxn pool     │  │             │  │              │          │
│  │   create     │  │             │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                  │
│  ┌──────┴─────────────────┴─────────────────┴───────┐          │
│  │              L2-Work (oxn-work)                  │          │
│  │  ┌─────────────────────────────────────────┐   │          │
│  │  │     .openxenon/works/<w>/               │   │          │
│  │  │     - work.md (MD)                       │   │          │
│  │  │     - tasks/<task>.md (MD)              │   │          │
│  │  │     - state.json                        │   │          │
│  │  └─────────────────────────────────────────┘   │          │
│  └────────────────────────┬────────────────────────┘          │
│                           │                                    │
│  ┌────────────────────────┴────────────────────────┐          │
│  │              L2-Builtin (.openxenon/)           │          │
│  │  ┌──────────────┐  ┌──────────────┐            │          │
│  │  │   domains/   │  │ blueprints/  │            │          │
│  │  │   *.md       │  │   *.md       │            │          │
│  │  │  (IAP Intent)│  │ (IAP Intent)│            │          │
│  │  └──────────────┘  └──────────────┘            │          │
│  │  ┌──────────────┐  ┌──────────────┐            │          │
│  │  │   works/     │  │   proofs/    │            │          │
│  │  │  (IAP Align) │  │ (IAP Proof) │            │          │
│  │  └──────────────┘  └──────────────┘            │          │
│  │  ┌──────────────────────────────────────┐     │          │
│  │  │   pools/                              │     │          │
│  │  │   ├── research/  (5 池)              │     │          │
│  │  │   ├── design/                        │     │          │
│  │  │   ├── issue/                         │     │          │
│  │  │   ├── audit/                         │     │          │
│  │  │   └── journal/                       │     │          │
│  │  │   [forges/ 升级版]                   │     │          │
│  │  └──────────────────────────────────────┘     │          │
│  └───────────────────────────────────────────────┘          │
│                           │                                    │
│  ┌────────────────────────┴────────────────────────┐          │
│  │              L1-OXL (mdast 解析器)              │          │
│  │  ┌─────────────────────────────────────────┐   │          │
│  │  │  src/oxl/md-bridge/                     │   │          │
│  │  │  - remark-to-kernel.ts                 │   │          │
│  │  │  - mdast-validator.ts (5 类 E_MD_xxx)  │   │          │
│  │  └─────────────────────────────────────────┘   │          │
│  │  ┌─────────────────────────────────────────┐   │          │
│  │  │  src/oxl/validators/                    │   │          │
│  │  │  - probe-validator.ts                   │   │          │
│  │  │  - mdast-validator.ts                   │   │          │
│  │  └─────────────────────────────────────────┘   │          │
│  └───────────────────────────────────────────────┘          │
│                           │                                    │
│  ┌────────────────────────┴────────────────────────┐          │
│  │              L1-Infra (fs 收口)                │          │
│  │  ┌─────────────────────────────────────────┐   │          │
│  │  │  src/infra/                              │   │          │
│  │  │  - filesystem.ts / filesystem-async.ts │   │          │
│  │  │  - pool-writer.ts                       │   │          │
│  │  │  - frozen/                              │   │          │
│  │  └─────────────────────────────────────────┘   │          │
│  └───────────────────────────────────────────────┘          │
│                           │                                    │
│  ┌────────────────────────┴────────────────────────┐          │
│  │              L0-Processor (Kernel)              │          │
│  │  ┌─────────────────────────────────────────┐   │          │
│  │  │  src/kernel/                            │   │          │
│  │  │  - verdicts/ (14 builtin probe)        │   │          │
│  │  │  - contracts/ (Kernel Schema)          │   │          │
│  │  │  - schemas/ (Zod validation)            │   │          │
│  │  └─────────────────────────────────────────┘   │          │
│  │  不变量：Kernel 不感知 fs/net/child_process    │          │
│  └───────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心组件

### 2.1 mdast 解析器（L1-OXL）

**位置**：`src/oxl/md-bridge/remark-to-kernel.ts`

**职责**：
- 输入：`.md` 文本
- 输出：Kernel Schema 对象（Zod 验证后）
- 4 步流水线：结构校验 → mdast 解析 → 容器指令识别 → Kernel Schema 注入

**关键依赖**：
- `unified` (^11)
- `remark-parse` (^11)
- `remark-directive` (^3) — `:::intent` Container Directives
- `unist-util-visit` (^4) — 遍历 mdast 树
- `mdast-util-to-string` — 提取文本内容

### 2.2 5 类 E_MD_xxx 错误校验（L1-OXL）

**位置**：`src/oxl/md-bridge/mdast-validator.ts`

| 错误码 | 触发 | 实现 |
|---|---|---|
| `E_MD_MULTIPLE_H1` | 多个 `# Domain` 标题 | 扫描 mdast，统计 `depth: 1` 节点 |
| `E_MD_ORPHAN_H2` | `## Term` 无父 `# Domain` | 扫描 H2 节点，检查父链 |
| `E_MD_CROSS_AGGREGATE` | `:::intent` ID 跨 aggregate 引用 | mdast directive 节点 |
| `E_MD_TABLE_OUT_OF_AGGREGATE` | 表格越界 | mdast table 节点 |
| `E_MD_INVARIANT_OUT_OF_SCOPE` | `:::intent` 块在 `# Domain` 外 | mdast directive 节点 |

### 2.3 pools/ 5 池（L2-Builtin）

**位置**：`.openxenon/pools/`

| 池 | 主导 | 内容示例 | 实施时间 |
|---|---|---|---|
| `research/` | 调研者 | 竞品分析、技术调研 | v0.3 阶段 3 |
| `design/` | 设计者 | 架构、需求、开发、测试设计 | v0.3 阶段 3 |
| `issue/` | 问题记录者 | bug 报告、问题跟踪 | v0.3 阶段 3 |
| `audit/` | 审计者 | 代码质量审计、复盘 | v0.3 阶段 3 |
| `journal/` | 事件记录者 | 关键事件、决策日志 | v0.3 阶段 3 |

**CLI**（v0.2.0 已实施）：`oxn pool create <pool> <slug> --title "..." --content "..."`

### 2.4 14 builtin probe 重写（L0-Processor）

**Adapter 模式**：

```ts
// L0-Processor probe 函数不变
export async function executeFsSize(kernel: KernelSchema): Promise<Verdict> {
  const size = await readFileSize(kernel.path);
  return { status: 'PASS', actual: size, expected: kernel.expected };
}

// L1-OXL mdast 解析器把 .md → KernelSchema
// KernelSchema 与 v0.2 兼容（Zod 验证不感知）
```

**关键不变量**：
- L0-Processor 仍不导入 fs/net/child_process
- fs 操作走 `L1-Infra/filesystem-async.ts`（adapter）
- `kernel` 参数类型不变

---

## 3. 数据流（端到端）

```
[用户/AI 写 .md]
   ↓
[L3 CLI: oxn domain --md]
   ↓
[.openxenon/domains/<Name>.md]
   ↓
[L2-Builtin: 资产目录]
   ↓ (用户/AI 启动 work)
[L3 CLI: oxn work --md <name>]
   ↓
[.openxenon/works/<name>/work.md + tasks/<task>.md + state.json]
   ↓ (实施 + Probe 验证)
[L2-Builtin: proofs/<proof-name>/verdict.md (frozen)]
   ↓ (version:aggregate)
[L1-Infra: 扫描 + 聚合]
   ↓
[design/changelog/v0.X.md (auto-generated)]
   ↓
[package.json bump + git tag v0.X.0]
```

---

## 4. 关键决策

| 决策 | 选择 | 理由 |
|---|---|---|
| mdast vs Langium | mdast | LLM 天然会 MD；GitHub/Notion 完美；unified 生态成熟 |
| 强约束保护 | 5 类 E_MD_xxx + `:::intent` 容器指令 | 保留 Langium 强结构保护能力 |
| 4 层目录 | 保留当前 v0.2.0（domains/blueprints/works/proofs/pools）| 简洁；T13 已建 pools/ 5 池 |
| 强结构语法 | `:::intent` (RFC 7763 Container Directives) | unified 生态成熟；可与 `## 列表` 弱结构并存 |
| 双轨期 | .oxn + .md 并存 | v0.2 兼容性 + 平滑迁移 |
| L0-Processor 兰姆达真空 | adapter 模式 | 不破坏 Kernel 兰姆达真空 |

---

## 5. 关键不变量

1. **Kernel 不感知上游** —— L0-Processor 函数体不变
2. **L0-Processor 不导入 fs** —— 走 L1-Infra adapter
3. **proofs/ frozen** —— chmod 0o444 + contentHash 校验
4. **MD 强约束** —— 5 类 E_MD_xxx 覆盖 Langium 强结构
5. **双轨期平滑** —— .oxn + .md 并存到 v0.3 阶段 5

---

## 6. L0–L3 兼容性

参见 [`l0-l3-alignment.md`](../l0-l3-alignment.md)

| 层 | 触达 | 兼容性 |
|---|---|---|
| L0-Schema | 重写 | ✅ 兼容（Zod 不感知上游）|
| L0-Contract | 不变 | ✅ 兼容 |
| L0-Processor | 14 probe 函数体不变 | ✅ 兼容（adapter 模式）|
| L1-Infra | filesystem-async 重用 | ✅ 兼容 |
| L1-OXL | 新增 `md-bridge/` | ⚠️ 新增层（仍在 L1-OXL）|
| L2-Builtin | 14 probe 模板 .oxn → .md | ⚠️ 物理迁移 |
| L2-Work | 不变 | ✅ 兼容 |
| L3 | CLI `--md` flag | ✅ 兼容 |

---

## 7. 组件依赖

```
[unified] ──→ [remark-parse] ──→ [mdast AST]
                                      │
                                      ↓
                            [remark-directive]
                                      │
                                      ↓
                              [mdast + directives]
                                      │
                                      ↓
                            [remark-to-kernel]
                                      │
                                      ↓
                            [Kernel Schema (Zod)]
                                      │
                                      ↓
                            [14 builtin probe]
                                      │
                                      ↓
                              [Verdict → frozen]
```

---

## 8. 关键文件清单

| 文件 | 角色 | 阶段 |
|---|---|---|
| `src/oxl/md-bridge/remark-to-kernel.ts` | mdast 解析器 | 1 |
| `src/oxl/md-bridge/mdast-validator.ts` | 5 类 E_MD_xxx | 1 |
| `src/oxl/validators/mdast-validator.ts` | L1-OXL 校验 | 1 |
| `src/oxl/schemas/oxn-assembly.schema.ts` | 重写 Zod | 1 |
| `src/infra/frozen/pool-writer.ts` | 已实施（T13）| 1 |
| `src/cli/pool.ts` + `pool-create.ts` | 已实施（T13）| 1 |
| `src/cli/pool-list.ts` | 已实施（T13）| 1 |
| `src/builtin/probes/*.oxn` (14 个) | 迁移为 .md | 2 |
| `src/builtin/blueprints/*.oxn` (5 个) | 迁移为 .md | 2 |
| `src/cli/proof.ts` + `proof-create.ts` | 已实施（v0.1.2）| 2 |
| `scripts/version-aggregate.ts` | 新建 | 4 |
| `scripts/version-release.ts` | 新建 | 4 |
| `scripts/audit-completeness.ts` | 新建 | 4 |
| `scripts/check-naming.ts` | 新建 | 4 |
| `scripts/migrate-forges.ts` | 新建（基于 `oxn pool create`）| 3 |

---

**关联文档**：
- [`req-md-ssot-v0.3.0.md`](./req-md-ssot-v0.3.0.md) — 需求
- [`dev-design-md-ssot-v0.3.0.md`](./dev-design-md-ssot-v0.3.0.md) — 实施
- [`test-design-md-ssot-v0.3.0.md`](./test-design-md-ssot-v0.3.0.md) — 测试
- [`product-md-ssot-overview-v0.3.0.md`](./product-md-ssot-overview-v0.3.0.md) — 产品
- [`v0.3.0-roadmap.md`](../v0.3.0-roadmap.md) — 路线图
- [`l0-l3-alignment.md`](../l0-l3-alignment.md) — 架构护身咒兼容
