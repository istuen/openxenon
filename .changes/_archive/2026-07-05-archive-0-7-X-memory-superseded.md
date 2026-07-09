---
version: 0.7.x
date: 2026-11-30
type: minor
SUPERSEDED: 2026-07-05
SUPERSEDED-by: docs/zh-cn/asset-paper.md + ADR-0048-0051
rfc:
  - .openxenon/pools/sprints/v0.7-emergence/design/v0.7.x-memory-rfc.md
adr:
  - .openxenon/forges/sprints/archive/docs-tmp-era/decisions/0040-memory-entry-schema.md
  - .openxenon/forges/sprints/archive/docs-tmp-era/decisions/0041-memory-replaces-pool.md
  - .openxenon/forges/sprints/archive/docs-tmp-era/decisions/0042-insight-double-source.md
  - .openxenon/forges/sprints/archive/docs-tmp-era/decisions/0043-onboarding-wizard.md
  - .openxenon/forges/sprints/archive/docs-tmp-era/decisions/0044-memory-apply-protocol.md
  - .openxenon/forges/sprints/archive/docs-tmp-era/decisions/0045-ttl-decay-formula.md
  - .openxenon/forges/sprints/archive/docs-tmp-era/decisions/0046-pool-migration.md
  - .openxenon/forges/sprints/archive/docs-tmp-era/decisions/0047-closed-loop-validation.md
---

# 0.7.x — Memory 闭环：项目内聚合层 + Insight 双源改造

> **v0.7.x 主题**：填补 v0.6.1 三大空白 — 新项目引导空白 / Pool 5 种分裂 / Insight 单源。把 5 种 Pool 统一为 Memory，Insight 升级为双源（内部 + Memory），新增 Onboarding Wizard 引导新项目。
>
> **前提**：v0.7.0（Insight apply + 模式库）。
> **核心 RFC**：[v0.7.x Memory RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7.x-memory-rfc.md) 📝 Draft

## 核心变化

### 1. Memory 取代 Pool（破坏性变更 · 3 minor 兼容期）

**v0.5/v0.6 现状**：5 种 Pool（research/design/issue/audit/journal），语义边界模糊，5 目录维护成本。

**v0.7.x 改造**：Memory 完全取代，5 种语义统一为 `MemoryEntry.type` 字段：

```bash
# 旧：5 个 subcommand
oxn pool create audit --from-insight
oxn pool list
oxn pool review <slug>
oxn pool approve <slug>      # → apply
oxn pool reject <slug>

# 新：统一的 memory 子命令
oxn memory ingest             # 工程师手动
oxn memory ingest --from-insight
oxn memory list               # 列出
oxn memory show <id>          # 详情
oxn memory apply <id>         # 写 Asset（取代 approve）
oxn memory reject <id> --reason <text>
oxn memory onboard            # 5 步向导
oxn memory migrate-from-pools # v0.5/v0.6 → v0.7.x 迁移
```

### 2. MemoryEntry Schema（核心数据结构）

```typescript
// packages/engine/src/kernel/schemas/memory-entry-schema.ts

export const MemorySourceSchema = z.enum(['external', 'engineer', 'agent'])

export const MemoryTypeSchema = z.enum([
  // v0.5 Pool 兼容 5 种
  'research', 'design', 'issue', 'audit', 'journal',
  // 新增 4 种
  'dependency_update', 'doc_note', 'discussion', 'test_result',
])

export const MemoryEntrySchema = z.object({
  id: z.string().regex(/^mem-\d{4}-\d{2}-\d{2}-\d{3}$/),
  source: MemorySourceSchema,
  type: MemoryTypeSchema,
  title: z.string(),
  content: z.string(),
  trustScore: z.number().min(0).max(1),
  ttl: z.number().int().nullable(),
  relatedAssetIds: z.array(z.string()).default([]),
  relatedRoadmapItem: z.string().nullable().default(null),
  timestamp: z.number().int(),
  approval: ApprovalRecordSchema.nullable().default(null),
  supersededBy: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
})
```

### 3. Insight 双源改造

**v0.6.x 现状**：pipeline-compute 仅消费 `frozen.json + domains + blueprints + works + proofs`。

**v0.7.x 改造**：增加 `memory: MemoryEntry[]` 输入 + 新维度 `memory_projection`：

```typescript
function computePipelineInsightFromInputs(input: {
  projectRoot: string
  domains: Domain[]
  blueprints: Blueprint[]
  works: Work[]
  allFrozenProofs: FrozenProof[]
  memory: MemoryEntry[]    // ← 新增
})

// 新增维度
export const MemoryProjectionEntrySchema = z.object({
  memoryId: z.string(),
  recommendedAsset: z.object({
    kind: z.enum(['domain', 'blueprint', 'stack']),
    name: z.string(),
    rationale: z.string(),
  }),
  priority: z.enum(['high', 'medium', 'low']),
  sourceTrust: z.number(),
})
```

```bash
# 新增 flag
$ oxn insight --pipeline --write-memory
# 行为：
# · 所有 MemoryProjection entry → 写 memory/entries/mem-NEW.md (source='agent', trust=0.6)
# · 所有 Insight pattern → upsert insight-patterns/
# · 写 events.jsonl 审计
```

### 4. Onboarding Wizard（双入口）

**入口 A**：`oxn init --ai opencode --memory-onboarding`（init 流程中触发）

**入口 B**：`oxn memory onboard`（独立命令，已 init 项目补做）

**5 步交互流程**：

```
Step 1: Project Type        [web/mobile/cli/library/monorepo/other]
Step 2: Tech Stack         [language/runtime/framework]
Step 3: Business Domain     [e-commerce/auth/payment/content/...]
Step 4: Auto-Discovery     [扫 README/package.json → 推测]
Step 5: Memory Write       [写 5 条 MemoryEntry + 推荐 Asset]
```

### 5. Memory Apply Protocol（取代 Pool Approve）

**与 v0.5 intent-overwriter 的关键差异**：

| 维度 | v0.5 intent-overwriter | v0.7.x memory-overwriter |
|---|---|---|
| 写盘 | `writeFileSync` 直接覆盖 | `renameSync` 原子 + `.bak` |
| chmod | 维持可写（**0o644 漏**） | **0o444 恢复** |
| PlanLock 重算 | ❌ 缺失 | ✅ spawn `oxn validate` |
| 错误处理 | 无 try/finally | 完整 try/finally + 回滚 |

### 6. trust_score 自衰减 + TTL 归档

```
t_current = max(0, T0 - (now - timestamp) / ttl * (T0 - 0.3))
```

- trust=1.0, ttl=30d, elapsed=15d → **0.65**
- trust=0.7, ttl=30d, elapsed=30d → **0.30**（边界）
- 归档阈值：decay < 0.3 OR TTL 过期 OR supersededBy

```bash
oxn memory gc                  # 实际归档
oxn memory gc --dry-run        # 预览
oxn memory gc --min-trust 0.5  # 自定义阈值
```

### 7. 物理布局

```
.openxenon/
├── memory/                              ← 新增
│   ├── index.json                       # MemoryEntry 索引
│   ├── entries/
│   │   ├── mem-2026-11-15-001.md        # 单条
│   │   └── ...
│   └── archive/                         # TTL 过期归档
├── pools/                               # 现有 (改造)
│   ├── insight-patterns/                # v0.7.0 模式库 (保留)
│   ├── sprints/                         # 版本化 sprint (保留)
│   ├── memory-roadmap.md                # 取代 pool-roadmap.md
│   └── pool-roadmap.md                  # DEPRECATED
├── assets/                              # 现有
├── works/                               # 现有
└── proofs/                              # 现有
```

### 8. 错误码扩展

```typescript
ExecErrorCode = {
  // ... v0.7.2 已有
  OXN_MEMORY_ENTRY_NOT_FOUND: 'OXN_MEMORY_ENTRY_NOT_FOUND',
  OXN_MEMORY_TRUST_SCORE_LOW: 'OXN_MEMORY_TRUST_SCORE_LOW',
  OXN_MEMORY_TTL_EXPIRED: 'OXN_MEMORY_TTL_EXPIRED',
  OXN_MEMORY_APPLY_FAILED: 'OXN_MEMORY_APPLY_FAILED',
  OXN_MEMORY_DUPLICATE_ID: 'OXN_MEMORY_DUPLICATE_ID',
  OXN_MEMORY_MIGRATION_FAILED: 'OXN_MEMORY_MIGRATION_FAILED',
}
```

## 物理布局（v0.7.x 新增/修改）

### 新增

```
packages/engine/src/Memory/
├── entry.ts                      # MemoryEntry Zod schema
├── io.ts                         # readMemory / writeMemory
├── index-json.ts                 # index.json 维护
├── ttl.ts                        # trust_score 衰减 + 归档判定
├── query.ts                      # 查询引擎
├── aggregate.ts                  # 跨类型聚合
├── memory-overwriter.ts          # 取代 intent-overwriter
├── migration.ts                  # Pool → Memory 迁移
├── onboarding-wizard.ts          # 5 步向导
└── __tests__/
    ├── entry.test.ts
    ├── io.test.ts
    ├── ttl.test.ts
    ├── query.test.ts
    ├── migration.test.ts
    └── closed-loop.test.ts

packages/cli/src/commands/memory/
├── index.ts                      # barrel
├── ingest.ts                     # oxn memory ingest
├── list.ts                       # oxn memory list
├── show.ts                       # oxn memory show
├── query.ts                      # oxn memory query
├── apply.ts                      # oxn memory apply
├── reject.ts                     # oxn memory reject
├── onboard.ts                    # oxn memory onboard
├── migrate-from-pools.ts         # 迁移脚本
├── gc.ts                         # TTL 归档
└── __tests__/
    ├── ingest-e2e.test.ts
    ├── apply-e2e.test.ts
    ├── migrate-e2e.test.ts
    └── closed-loop-e2e.test.ts

packages/engine/src/kernel/verdicts/
├── pipeline-compute.ts           # 增加 memory 输入 + memory_projection
├── cross-proof-compute.ts        # memory 增强 trend
└── insight-schema.ts             # MemoryProjectionEntrySchema

.opencode/skills/oxn-memory/
├── SKILL.md                      # ≤ 200 tokens
├── references/
│   ├── memory-schema.md
│   ├── onboarding-wizard.md
│   ├── apply-protocol.md
│   └── ttl-decay-formula.md
└── assets/
    ├── web-typescript-react.oxn  # 模板
    ├── cli-go-cobra.oxn
    └── library-rust-cargo.oxn
```

### 修改

- `packages/engine/src/infra/probes/insight-collector.ts` — 读 `memory/index.json`
- `packages/engine/src/infra/insight/` — 增加 `memory-projection.ts`
- `packages/cli/src/commands/init.ts` — `--memory-onboarding` flag
- `packages/cli/src/commands/pool.ts` — 标记 DEPRECATED，shim 到 memory
- `docs/zh-cn/memory.md`（新建，Q7=A）
- `docs/zh-cn/insight.md` §11 Memory 集成段
- `docs/zh-cn/asset.md` §8 反模式（删除"audit pool approve"路径）
- `docs/zh-cn/work.md` §11.5 证据链（添加 Memory 节点）

### 删除（v0.10+ 推迟）

- `packages/cli/src/commands/pool-{create,approve,reject,review,list}.ts`（v0.10+ 完全删除，3 minor 兼容期内保留）

## 兼容期策略

| 阶段 | 行为 |
|---|---|
| v0.7.x 早期 | 双写（Pool + Memory 同时存在），Memory 为 SSOT |
| v0.7.x 中期 | Pool → shim（deprecation warning） |
| v0.8.x | Pool 命令保留（warning 升级） |
| v0.9.x | Pool 命令移除（仅 Memory） |
| v0.10+ | `pools/` 目录物理删除（保留 `insight-patterns/` 和 `sprints/`） |

## 测试 / 构建结果（目标）

- **typecheck**: 0 errors ✅
- **biome check**: 0 issues
- **测试**: ≥ 2,178 pass（v0.7.2 末 2,132 + 46）
- **CLI build**: 集成 `oxn memory` 10+ 子命令
- **docs:build**: 包含 `memory.md` 新章节

## 测试统计

| 类型 | 文件 | 数量 |
|---|---|---|
| 单元 | entry / io / index-json / migration | 8 |
| 单元 | ttl-decay / trust-decay | 4 |
| 单元 | insight-pipeline-compute + memory | 6 |
| 单元 | memory-projection 计算 | 4 |
| E2E | memory ingest / list / show / query | 6 |
| E2E | memory apply (atomic rename + .bak) | 3 |
| E2E | memory onboard (interactive + non-interactive) | 4 |
| E2E | migrate-from-pools (dry-run + apply) | 3 |
| 集成 | closed-loop (T1-T8 trace 验证) | 4 |
| 集成 | Skill (oxn-memory) | 4 |
| **合计** | — | **46** |

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Memory 取代 Pool 破坏 v0.6.1 audit pool | 低 | 中 | 3 minor 兼容期 + migration + .gitkeep |
| Onboarding wizard 推荐 Asset 不合理 | 中 | 中 | trust_score 0.5-0.7 + 工程师确认 |
| Memory 注入 AI 上下文导致 Token 爆炸 | 中 | 高 | trust_score 阈值 + TTL 衰减 + 归档 |
| `oxn memory apply` atomic rename 失败 | 低 | 高 | .bak 备份 + try/finally + chmod 恢复 |
| Pool → Memory 数据丢失 | 低 | 高 | dry-run + backup 目录 + 验证 hash |

## v0.7.x 不做（明确推迟）

| 功能 | 推迟到 |
|---|---|
| 跨 Project Memory 共享 | v0.8.0 Skill Registry |
| Memory 向量索引（语义检索） | v0.9.0 |
| Memory 自动学习 | v1.0+ |
| Roadmap 实现 | v0.8.0 |
| MemoryEntry 全文搜索引擎（lunr.js） | v0.7.x 末 |

## 迁移路径（开发者视角）

```bash
# v0.7.0 → v0.7.x (本 RFC)
bun install
bun run langium:generate
bun run build

# 1. 迁移已有 audit pool
$ oxn memory migrate-from-pools --dry-run
$ oxn memory migrate-from-pools --apply
# → .openxenon/.pools-backup-2026-11-15/

# 2. 新项目：onboarding 触发
$ oxn init --ai opencode --memory-onboarding
# → 5 步向导 → Memory 写满 → 推荐 Asset

# 3. 已有项目：直接写 memory
$ oxn memory ingest --type dependency_update \
    --content "bun 1.2.0 released: ..."

# 4. Insight 双源
$ oxn insight --pipeline --write-memory

# 5. Memory apply
$ oxn memory list --type audit --min-trust 0.7
$ oxn memory apply mem-2026-11-15-003

# 6. 验证闭环
$ oxn memory aggregate --cross-pool --since 7d
```

## 参考

- [v0.7.x Memory RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7.x-memory-rfc.md) 📝 Draft
- [v0.7 Emergence RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7-emergence-rfc.md) ✅ Approved
- [ADR-0040 ~ 0047 系列](../../.openxenon/forges/sprints/archive/docs-tmp-era/decisions/)
- [v0.6 RFC §v0.7 主题预告 · Memory 层](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- [harness-3.md §Memory 层](../../.openxenon/forges/sprints/archive/docs-tmp-era/2026-07-02-harness-3.md)