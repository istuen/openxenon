---
id: ai-three-modes
theme: AI 三模式 (Edit / Plan / Apply)
priority: medium
status: planned
created-at: 2026-07-23
scheduled-version: ~
synced-at: 2026-07-27
note: |
  从 dev/versions/0-7-1-ai-three-modes.md 迁移 (2026-07-27 grilling session)。
  移除 version 绑定，进入规划池备选。
---

# 0.7.1 — AI 三模式分级：Guided / Adaptive / Unmanaged

> **v0.7.1 主题**：把 AI Agent 执行监督程度从二元（Guided 默认 / 无监督实验）扩展为**三档分级**。基于 v0.7.0 模式库累积，新增 `mode_recommendation` Insight 类型，让 AI 模式选择成为 Insight 驱动的工程化决策。
>
> **前提**：v0.7.0（Insight 审核闭环 + 模式库 + CachePort 热路径）。
> **核心 RFC**：[v0.7.1 AI Three Modes RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7.1-ai-three-modes-rfc.md) 📝 Draft

## 核心变化

### 1. AI 三模式契约

| 模式 | 监督 | 验证 | CLI | 占比（目标） |
|---|---|---|---|---|
| **Guided** | 全程 | 严格 Probe + 人工 review | `oxn work --mode guided`（默认） | 80% |
| **Adaptive** | 跳过 action 重放 | Probe 警告级（YELLOW flag 透传） | `oxn work --mode adaptive` | 15% |
| **Unmanaged** | 无监督 | 仅 lint + Hall 告警 | `oxn work --mode unmanaged` | 5% |

### 2. 模式注入与状态机

`packages/engine/src/Work/dual-state-exec.ts::runWork()` 注入 mode：

```ts
const mode = opts.mode ?? 'guided'
const guardLevel = { guided: 'strict', adaptive: 'warn', unmanaged: 'lint-only' }[mode]

state.mode = mode
state.guardLevel = guardLevel
```

### 3. Probe 信任基线（trustBaseline）

`packages/engine/src/Proof/runner.ts`：

| mode | trustBaseline | YELLOW flag 行为 |
|---|---|---|
| guided | `strict` | 阻断 |
| adaptive | `warn` | 透传 + interferenceFlags 记录 |
| unmanaged | `lint-only` | 仅 lint 检查 |

### 4. `mode_recommendation` Insight 类型

模式库新增第 4 种类型（除 `cross_work_pattern` 外）：

```json
{
  "id": "mode-rec-2026-12-C1",
  "type": "mode_recommendation",
  "domain": "RefactorContext",
  "suggestedMode": "adaptive",
  "rationale": "此 Domain 80% 的 Work 走 adaptive，平均 1.8 round，verdict 全 PASSED",
  "confidence": 0.78,
  "status": "open"
}
```

`oxn insight apply mode-rec-XXX` → 写入 `OxnConfig.aiDefaultMode = "adaptive"`。

### 5. reputation.json 扩展

```json
{
  "schemaVersion": 2,
  "perMode": {
    "guided":    { "works": 12, "avgRounds": 2.3 },
    "adaptive":  { "works": 4,  "avgRounds": 1.8 },
    "unmanaged": { "works": 1,  "avgRounds": 1.0 }
  }
}
```

### 6. Hall HealthPanel 模式分布卡片

`docs/.vitepress/theme/components/HealthPanel.vue`：

- "Mode Distribution" 卡片：Guided / Adaptive / Unmanaged 比例饼图
- "Recent Mode Recs" 列表：最近 5 条 `mode_recommendation`

### 7. 错误码扩展

```typescript
ExecErrorCode = {
  // ... v0.7.0 已有
  OXNI_MODE_NOT_SUPPORTED: 'OXNI_MODE_NOT_SUPPORTED',
  OXNI_MODE_RECOMMENDATION_NOT_FOUND: 'OXNI_MODE_RECOMMENDATION_NOT_FOUND',
}
```

## 物理布局（v0.7.1 新增/修改）

### 新增

```
packages/engine/src/Insight/
├── mode-recommender.ts             # AI 模式推荐引擎（L0 纯函数）
└── __tests__/mode-recommender.test.ts  # 8 cases

packages/cli/src/commands/
└── __tests__/work-mode-e2e.test.ts     # 4 cases（guided/adaptive/unmanaged 各 1 + 默认值 1）
```

### 修改

- `packages/engine/src/Proof/runner.ts` — 加 `trustBaseline` 参数
- `packages/engine/src/Work/dual-state-exec.ts` — 注入 mode 到 state.json
- `packages/engine/src/infra/insight/insight-collector.ts` — `mode_recommendation` 类型处理
- `packages/cli/src/commands/work.ts` — 注册 `--mode` flag
- `packages/cli/src/commands/insight.ts` — `mode_recommendation` 类型分支
- `packages/cli/src/errors/iap-error.ts` — 新增错误码
- `docs/.vitepress/theme/components/HealthPanel.vue` — 模式分布卡片

## 测试 / 构建结果（目标）

- **typecheck**: 0 errors ✅
- **测试**: ≥ 2,075 pass（v0.7.0 末 2,058 + 17）
- **CLI build**: 集成 `--mode` flag

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| AI 在 unmanaged 模式失控 | 中 | 高 | Hall 顶部 banner 强提示 + verdict FAIL 强制 Insight |
| 模式推荐误判 | 中 | 中 | 工程师显式 `oxn insight apply` 审批 |
| 模式分布失衡（80% unmanaged） | 低 | 高 | Hall 协同健康度告警 |

## v0.7.1 不做

- 模式自动切换（AI 自动升降级）→ v0.9
- 模式机器学习 → v0.9
- 多 AI Agent 协同分级 → v1.0

## 迁移路径（开发者视角）

```bash
# v0.7.0 → v0.7.1
bun install
bun run build

# 使用新模式
oxn work create my-feature --type develop --mode adaptive --asset ...
oxn work run my-feature --mode adaptive

# 查看模式分布
# 访问 http://localhost:5173/hall/health/  → Mode Distribution 卡片
```

## 参考

- [v0.7.1 AI Three Modes RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7.1-ai-three-modes-rfc.md) 📝 Draft
- [v0.7 Emergence RFC](../../.openxenon/pools/sprints/v0.7-emergence/design/v0.7-emergence-rfc.md) §2.2 模式库（前置）
- [v0.7+ Roadmap Overview](../../.openxenon/pools/sprints/v0.7-plus-roadmap/overview.md) §2 v0.7.1 阶段
- [ADR-0022 Guided / Adaptive / Unmanaged](../../.openxenon/docs/adrs/0022-guided-adaptive-unmanaged-ai-modes.md)