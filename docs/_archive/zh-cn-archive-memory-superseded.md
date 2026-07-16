---
title: 记忆
---

# 记忆（Memory · 项目内聚合层）

> **Memory 是 OXN 的项目内知识聚合层**——外部知识（项目文档 / 工程师讨论 / 依赖更新 / AI 探索）与内部知识（Asset / Work / Proof）的桥梁。
>
> v0.7.x 把 v0.5/v0.6 的 5 种 Pool（research / design / issue / audit / journal）**统一为 Memory**，通过 `trust_score` 量化权威度，通过 TTL 自衰减防止上下文膨胀。

## 1. Memory 在 IAP 闭环中的位置

```
                    External Knowledge
                    (docs / issues / deps / discussions)
                          ↓ 工程师手动 ingest / Insight 自动 collect
                   ┌─────────────────────┐
                   │   Memory (聚合层)    │
                   │   .openxenon/memory/ │
                   └──────────┬──────────┘
                              ↓ 双向（双源 Insight）
                   ┌─────────────────────┐
                   │   Insight (E4)      │
                   └──────────┬──────────┘
                              ↓ 推荐
                   ┌─────────────────────┐
                   │   Asset + Work      │
                   └──────────┬──────────┘
                              ↓ 累积（闭环）
                   ┌─────────────────────┐
                   │   Memory (闭环)     │
                   └─────────────────────┘
```

**核心命题**：Memory 是 OXN 从"封闭工具"走向"开放协作系统"的耗散结构层（持续吸收负熵流）。

## 2. MemoryEntry Schema

每条 Memory 是 `MemoryEntry`，字段：

| 字段 | 类型 | 含义 |
|---|---|---|
| `id` | `mem-YYYY-MM-DD-NNN` | 全局唯一 ID |
| `source` | `external` \| `engineer` \| `agent` | 信息来源 |
| `type` | 9 种（详见下） | 信息类型 |
| `title` | string | 标题 |
| `content` | markdown | 内容 |
| `trustScore` | 0-1 | 信任度评分 |
| `ttl` | 秒（nullable） | 有效期 |
| `relatedAssetIds` | string[] | 关联的 Asset ID |
| `relatedRoadmapItem` | string | 关联的 Roadmap 条目 |
| `timestamp` | ms epoch | 创建时间 |
| `approval` | ApprovalRecord | 审批记录（apply 后填） |
| `supersededBy` | string | 被哪条 entry 取代 |
| `tags` | string[] | 标签 |

### 2.1 source 字段（Q4=B · 无审批）

| source | 写入方式 | 默认 trust_score |
|---|---|---|
| `engineer` | 工程师手动 `oxn memory ingest` | 1.0 |
| `engineer` + reference | 工程师确认的 Insight 推荐 | 0.7-0.9 |
| `agent` | Insight 自动产出（`--write-memory`） | 0.5-0.7 |
| `external` | 外部抓取（webhook / paste） | 0.3-0.5 |

**关键不变量**：Q4=B 选择**无审批**，但信任度通过 `trust_score` 量化。AI 上下文注入时按 trust_score 阈值过滤。

### 2.2 type 字段（9 种）

继承自 v0.5 Pool 5 种 + 新增 4 种：

| type | 用途 | 来源 | 典型 trust |
|---|---|---|---|
| `research` | 调研笔记 | engineer | 1.0 |
| `design` | 设计文档 | engineer | 1.0 |
| `issue` | 问题分析 | engineer | 1.0 |
| `audit` | 改进建议（Insight apply 主用） | agent | 0.7 |
| `journal` | 时间线 | engineer | 1.0 |
| `dependency_update` | 依赖版本更新 | external | 0.5 |
| `doc_note` | 项目文档注释 | engineer | 1.0 |
| `discussion` | 工程师讨论记录 | engineer | 1.0 |
| `test_result` | 测试结果 | agent | 0.7 |

## 3. 物理布局

```
.openxenon/memory/                              ← 平级 (Q1)
├── index.json                                  # 全量索引
├── entries/
│   ├── mem-2026-11-15-001.md                   # 单条 markdown body
│   ├── mem-2026-11-15-002.md
│   └── ...
└── archive/                                    # TTL 过期归档
    ├── mem-2026-08-01-001.md
    └── ...
```

每条 entry 是一个独立 markdown 文件，frontmatter 含元数据，body 是 markdown 内容。

## 4. trust_score 自衰减公式（ADR-0045）

```
t_current = max(0, T0 - (now - timestamp) / ttl * (T0 - 0.3))
```

| 初始 trust | TTL (d) | elapsed (d) | 当前 trust |
|---|---|---|---|
| 1.0 | 30 | 15 | 0.65 |
| 0.7 | 30 | 30 | 0.30（边界） |
| 0.5 | 30 | 10 | 0.43 |
| 1.0 | null | ∞ | 1.0（不衰减） |

**归档阈值**：`decay < 0.3` OR TTL 过期 OR `supersededBy !== null`

## 5. Memory ↔ Insight 双源（ADR-0042）

Insight pipeline-compute 接受 `memory: MemoryEntry[]` 输入，新增 `memory_projection` 维度：

```typescript
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

`oxn insight --pipeline --write-memory` 自动把 MemoryProjection 写入 Memory。

## 6. Memory Apply Protocol（ADR-0044 · 取代 Pool Approve）

`oxn memory apply <id>` 取代 v0.5 `oxn pool approve <slug>`：

```
1. 读 memory/entries/<id>.md
2. 校验 status='approved'（trustScore ≥ 0.5）
3. 读 Asset 当前内容 + 算 beforeHash
4. 计算 newContent = applyPatch(original, meta.content)
5. ⚠ atomic rename（v0.5 缺失，v0.7.x 补齐）：
   a. copyFileSync(target, target.bak)    // .bak 备份
   b. writeFileSync(target.draft.tmp, newContent)
   c. renameSync(target.draft.tmp, target) // atomic
   d. chmodSync(target, 0o444)             // 恢复三层锁
6. spawn `oxn <kind> validate <name>` 重算 planLock
7. 写 approvalRecord 到 memory entry frontmatter
8. 写 events.jsonl 审计
```

**与 v0.5 的关键差异**：

| 维度 | v0.5 intent-overwriter | v0.7.x memory-overwriter |
|---|---|---|
| 写盘 | `writeFileSync` 直接覆盖 | `renameSync` 原子 + `.bak` |
| chmod | 维持可写（**0o644 漏**） | **0o444 恢复** |
| PlanLock 重算 | ❌ 缺失 | ✅ spawn `oxn validate` |
| 错误处理 | 无 try/finally | 完整 try/finally + 回滚 |

## 7. Onboarding Wizard（ADR-0043 · 双入口）

**入口 A**：`oxn init --ai opencode --memory-onboarding`（init 流程中触发）

**入口 B**：`oxn memory onboard`（独立命令，已 init 项目补做）

5 步交互：

```
Step 1: Project Type        [web/mobile/cli/library/monorepo/other]
Step 2: Tech Stack         [language/runtime/framework]
Step 3: Business Domain     [e-commerce/auth/payment/content/...]
Step 4: Auto-Discovery     [扫 README/package.json → 推测]
Step 5: Memory Write       [写 5 条 MemoryEntry + 推荐 Asset]
```

## 8. CLI 完整清单

### 8.1 写入

```bash
oxn memory ingest                                  # 工程师手动
oxn memory ingest --from-insight                   # 从 Insight 推荐
oxn memory ingest --type dependency_update \
    --content "bun 1.2.0 released" \
    --related-asset @prj/blueprints/dev-workflow \
    --trust-score 0.7 --ttl 30d
oxn memory onboard                                 # 5 步向导
oxn memory migrate-from-pools                      # v0.5/v0.6 → v0.7.x 迁移
```

### 8.2 查询

```bash
oxn memory list                                    # 列出所有
oxn memory list --type audit --since 7d
oxn memory list --source external --min-trust 0.5
oxn memory show <id>
oxn memory query --related-asset MemberContext
oxn memory query --tag onboarding
oxn memory query --fulltext "password"
oxn memory aggregate --by-type --by-source
oxn memory aggregate --cross-pool --since 7d
```

### 8.3 维护

```bash
oxn memory apply <id>                              # 写 Asset（取代 approve）
oxn memory reject <id> --reason <text>
oxn memory gc                                      # TTL 归档
oxn memory gc --dry-run
oxn memory gc --min-trust 0.5
```

### 8.4 Insight 集成

```bash
oxn insight --pipeline --write-memory              # 自动写 Memory
oxn insight --cross-proof --write-memory
```

## 9. 闭环验证（ADR-0047）

### Scenario A: 新项目空白启动

```
T1: oxn init --ai opencode --memory-onboarding
    → 启动 5 步 wizard → 写 5 条 MemoryEntry (trust=1.0)
    → Insight 聚合 → 推荐 Asset 列表

T2: oxn work create MemberContext --type asset --asset-kind domain
    → AI 从 Memory 抽取 → 写 .openxenon/assets/domains/MemberContext.oxn

T3-T4: ...

T5: oxn insight --pipeline --write-memory
    → 写 audit memory: add-invariant (trust=0.6)
    → Memory 自动累积 pattern

T7: oxn memory apply mem-XXX-003
    → atomic rename + .bak 回滚 + chmod 0o444 恢复 + planLock 重算

T8: 回到 T4（闭环）
```

### Scenario B: 现有项目

```
T1: oxn init --ai opencode
    → 检测 .openxenon/domains/ 已存在 → 跳过 wizard
    → 自动扫描 + 写 Memory（trust=0.8）

T2: oxn memory migrate-from-pools --apply
    → 迁移 v0.5/v0.6 已建 audit pool 条目

T3-T5: 工程师补充外部知识 → Insight 消费 → Memory apply
```

## 10. 错误码

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

## 11. 反模式

- ❌ `trustScore: 1.0` 用于一切（永不衰减 = 上下文炸弹）
- ❌ 不跑 `--dry-run` 直接 `oxn memory migrate-from-pools --apply`
- ❌ `oxn memory apply` 后删除 `.bak` 文件（丧失回滚能力）
- ❌ 跳过 Onboarding Step 4 Auto-Discovery（漏掉项目真实信息）
- ❌ `oxn memory onboard --force` 反复覆盖（破坏 Memory 历史）
- ❌ 在 Memory 中写 Asset 内容（Memory 是知识，不是 Asset）

## 12. Pool 迁移兼容期

| 阶段 | 行为 |
|---|---|
| v0.7.x 早期 | 双写（Pool + Memory 同时存在），Memory 为 SSOT |
| v0.7.x 中期 | Pool → shim（deprecation warning） |
| v0.8.x | Pool 命令保留（warning 升级） |
| v0.9.x | Pool 命令移除（仅 Memory） |
| v0.10+ | `pools/` 目录物理删除（保留 `insight-patterns/` 和 `sprints/`） |

## 13. 哲学锚定

| 理论 | 体现 |
|---|---|
| **耗散结构** | Memory 是开放系统的"负熵流"入口（吸收外部信息） |
| **控制论** | trust_score + TTL 自动反馈调节 |
| **系统论** | Memory ↔ Insight 双向耦合形成自稳态 |
| **信息论** | trust_score 阈值过滤信道噪音 |

## 14. 关键代码路径索引（v0.7.x）

| 文件 | 角色 |
|---|---|
| `packages/engine/src/kernel/schemas/memory-entry-schema.ts` | MemoryEntry Zod schema |
| `packages/engine/src/Memory/io.ts` | readMemory / writeMemory |
| `packages/engine/src/Memory/index-json.ts` | index.json 维护 |
| `packages/engine/src/Memory/ttl.ts` | trust_score 衰减 + 归档判定 |
| `packages/engine/src/Memory/memory-overwriter.ts` | atomic rename + .bak 回滚 |
| `packages/engine/src/Memory/migration.ts` | Pool → Memory 迁移 |
| `packages/engine/src/Memory/onboarding-wizard.ts` | 5 步向导 |
| `packages/engine/src/kernel/verdicts/pipeline-compute.ts` | Insight 双源（含 memory） |
| `packages/cli/src/commands/memory/*` | 10+ CLI 子命令 |
| `packages/engine/src/Memory/__tests__/closed-loop.test.ts` | 端到端闭环验证 |

---

## → 参考

- [v0.7.x Memory RFC（被反弹的 archive 版）](../../.openxenon/pools/sprints/v0.7-emergence/design/2026-07-05-archive-v0.7.x-memory-rfc-superseded.md) 📝 Archive
- [替代方案：v0.6.3 Asset Paper Schema RFC](../../.openxenon/pools/sprints/v0.6.x-observability-roadmap/design/v0.6.3-asset-paper-schema-rfc.md) 📝 Draft
- [替代方案：docs/zh-cn/asset-paper.md](../asset-paper.md) 新 SSOT（Asset 论文结构）
- [ADR-0040 ~ 0047 系列](../../.openxenon/docs/adrs/)
- [v0.6 RFC §v0.7 主题预告 · Memory 层](../../.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md)
- harness-3.md §Memory 层（已归档，见 git 历史）