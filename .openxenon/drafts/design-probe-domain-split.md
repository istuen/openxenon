---
entity: design
target-entity: domain
version: 0.1.0
name: probe-domain-split
status: archived
archived: 2026-08-02
archived-reason: v0.6.3 Probe Domain 拆分已 ship（commit `4a7c6ec`），见 `.changes/0-6-3-probe-domain-split.md`
abstract: |
  Probe Domain 拆分设计 —— 把 Probe / ProbeOutcome / InterferenceFlag / outcome
  从 oxn-proof-domain.md 抽出到独立 oxn-probe-domain.md；理清 5 层命名
  （probeName / useName / ref / probeType / file）+ 聚合结构（summary）+ 聚合
  禁止用 outcome；保留目标 frozen.json 结构在 Probe Domain 锚定。
references:
  - oxn-proof-domain
  - oxn-engine-domain
  - oxn-domain
citations: 0
promote-target: asset
created-from: draft-skeleton-fork@0.1.0
synced-at: 2026-08-05
promote-kind: domain
---

# Design: Probe Domain Split

> 2026-08-05 收敛设计：从 oxn-proof-domain.md 拆出 Probe Domain。
> 决策：保留 probes 容器 + useName 作 key 强约束唯一性；summary 包裹 aggregate；outcome 字段 Probe 专用；schema 字段对照表放 Probe Domain。

## 1. 背景与问题

### 1.1 现状

`oxn-proof-domain.md` 当前含 11 个 Term（Bans 之外）、4 个 invariant、复杂的多层命名：

| Term | 描述问题 |
|---|---|
| Probe | 5 层名混在一起无区分 |
| ProbeOutcome | 3 套拼写未解释 |
| outcome | 与 Probe 内 outcome 撞名 |
| Boundary Deviation | 已 deprecated 但仍占 Term |
| InterferenceFlag | 注释写 "8 RED + 4 YELLOW" 计数错误 |
| Proof | 描述列 5 义（Phase/CLI/Domain/File/Schema）实际只有 1 个 Domain term |

### 1.2 用户 4 个修正反馈

1. **`useName` 不是新词**：业务场景名 = `useName`（已确认）
2. **Proof Domain 含 N 个 Term**：不是 1 个，是多个 term 收敛不冲突
3. **`outcome` 字段归属**：先分 Proof 聚合 vs Probe 单个，outcome 专属 Probe
4. **`probes` 结构**：保留容器 + useName 作 key（强约束唯一性）

### 1.3 拆分判定

Probe 有自己的完整语义空间：
- 5 层命名（probeName/useName/ref/probeType/file）
- 3 态拼写（lowercase/uppercase -ED/uppercase 无 -ED）
- 12 项 InterferenceFlag
- 19 个 catalog 注册 handler
- 独立 PROBE_CATALOG

应独立 Domain（oxn-probe-domain.md）。

## 2. 决策矩阵

| 决策 | 选定 | 备选 |
|---|---|---|
| Q1 Probe 5 层命名 probeName | = Probe 本体名（catalog 注册名） | = 业务场景名（已否决） |
| Q1 业务场景名 | `useName` | scenario/case/useName/checkId |
| Q2 probes 结构 | **B：保留 probes 容器 + useName 作 key** | A 扁平 / C 数组 |
| Q3 Domain 拆分 | **2：拆分独立 Probe Domain** | 1 嵌套 |
| Q4 schema 字段对照表 | 放 Probe Domain | Proof Domain / 双份 |
| Q5 目标结构写入 | **写目标结构** | 仅概念表 |
| Q6 迁移路径 | **不写（后续直接删旧）** | 加迁移说明 |

## 3. 目标文件结构

### 3.1 新建 `oxn-probe-domain.md`

**Frontmatter**：

```yaml
---
entity: domain
version: 0.1.0
name: OxnProbeDomain
abstract: OXN Probe 业务领域（物理观测工具，Proof 阶段使用）。
references:
  - oxn-engine-domain
  - oxn-domain
citations: 0
synced-at: 2026-08-05
---
```

**5 个 Term**：

- Probe
- ProbeOutcome
- useName（新增）
- probeName（重定义）
- InterferenceFlag

**4 条 Invariant**：

- inv-26: Probe 5 层名都在 Probe Domain 内（probeName / useName / ref / probeType / file）
- inv-27: outcome 字段 Probe 专用；aggregate 必须用 summary
- inv-28: InterferenceFlag canonical（Taint / Boundary Deviation 永久 ban）
- inv-29: 3 态拼写分层是设计

**Bans**：

- Taint
- TaintMark
- Boundary Deviation
- 干涉（中文统一）

### 3.2 修改 `oxn-proof-domain.md`

**总改动**：

```
frontmatter.references   +1（加 oxn-probe-domain）
删除 Term                5 个（Probe/ProbeOutcome/outcome/Boundary Deviation/InterferenceFlag）
修改 Term                1 个（Proof 描述收窄）
新增/修改 invariant      0（4 条新 inv 全部进 Probe Domain）
Bans 追加                1 项（Boundary Deviation 冗余记录）
```

**frontmatter 改动**：

```yaml
references:
  - oxn-engine-domain
  - oxn-work-domain
  - oxn-asset-domain
  - oxn-domain
  - oxn-probe-domain            # ← 新增
```

**删除 5 个 Term 段**：

- `### Probe`（line 23-25）
- `### ProbeOutcome`（line 27-29）
- `### outcome`（line 31-33）
- `### Boundary Deviation`（line 51-53）
- `### InterferenceFlag`（line 59-61）

**修改 1 个 Term 段**：

- `### Proof` 描述收窄，去掉 "5 义"（Phase/CLI/Domain/File/Schema）列举，收窄到 Domain 概念本身

**Bans 追加**（Boundary Deviation 已在 Probe Domain 主 ban，此处冗余记录可删）：

```yaml
items:
  - ...（原有）
  - Boundary Deviation  # 冗余（主 ban 在 Probe Domain）
```

推荐**直接删**这一行，避免双 ban。

## 4. 关键 Term 描述草案

### 4.1 Probe Domain 新 Term 描述

#### Probe

> OXN 内置探针 = "一次客观事实校验"的统一抽象。物理观测 L1-Infra Provider 执行 → 客观结果 L0-Kernel 产出 ProbeOutcome。同一个 Probe 可在多个 Proof 中被多个业务场景复用。

#### ProbeOutcome

> L0 Kernel 产出的单个 Probe 客观结果。**3 态拼写是设计分层**（proof-frozen-writer.ts:11-25 记录）：
>
> | 层 | 拼写 | 用途 |
> |---|---|---|
> | human canonical `.md` | `pass` / `fail` / `inconclusive` | proof.md 人类阅读 |
> | machine SSOT JSON | `COMPLETED` / `DEVIATED` / `INCONCLUSIVE` | frozen.json |
> | Kernel ProbeOutcome TS union | `PASS` / `FAIL` / `INCONCLUSIVE` | 接口契约 |
>
> 映射边界在 `buildFrozenProof` / `proof-compiler.ts`。"完成"指探测完成，不是目标完成。`outcome` 字段仅 Probe 内部专用（aggregate 层不可用）。

#### useName

> 业务场景名 = 一次 Probe 使用的**业务场景名**（"这次要验证什么"）。在 proof.md 是 H3 key，在 frozen.json 是 `probes` 对象的 key。字符集约束 `^[a-zA-Z0-9-]+$`（保证可作 JSON object key）。

#### probeName

> Probe 本体名 = Probe 实体自己的名字（catalog 注册名）。从 `ref` 去除 `@oxn/probes/` 前缀派生。

#### InterferenceFlag

> 信号污染标记 = L1-Infra Provider 在 IO 时检测到的干扰信号。是 "Taint / Boundary Deviation / InterferenceFlag" 三个旧术语的**唯一收敛目标**（ADR-0086 + ADR-0066）。
>
> **真实枚举 = 9 RED + 3 YELLOW = 12 项**（trust-baseline.ts:23-36；domain 旧注释 "8 RED + 4 YELLOW" 是历史勘误）：
>
> | RED（短路 → INCONCLUSIVE） | YELLOW（透传 + 记录） |
> |---|---|
> | waf_detected, just_modified, detached_head, shallow_clone, sandbox_violation, network_timeout, response_truncated, permission_denied, unknown | cdn_cache, cache_path, symlink |
>
> RED/YELLOW 不可配置（ADR-0086：信任是系统决策不是用户决策）。

### 4.2 Proof Domain 收窄后 Term 描述

#### Proof（收窄）

> OXN 验证 AI Agent 执行结果并记录的协作**过程**证明（不是结果证明）。执行主体 OXN Engine（ADR-0031 记录事实不评判）；物理观测 L1-Infra + 客观结果 L0-Kernel。物理产物（`frozen.json` + `outcome.md` + `trace.jsonl` + `state.json`）是副作用，不是 Proof 术语本身。

> 关于 Proof 聚合结果的字段名，详见 `### outcome`（oxn-probe-domain.md）的 inv-27 约束。

#### outcome（保留作为聚合专用术语）

> Proof 聚合结果。在 schema 中以 `summary` 容器出现：
>
> ```json
> "summary": {
>   "outcome": "DEVIATED",
>   "totalCount": 4,
>   "passedCount": 3,
>   "failedCount": 1,
>   "inconclusiveCount": 0
> }
> ```
>
> 聚合算法：任一 INCONCLUSIVE → INCONCLUSIVE；否则全 PASSED → COMPLETED；其余 DEVIATED。
>
> **禁止**：在 aggregate 层直接使用 `outcome` 作为字段名（撞名 ProbeOutcome 专用字段），必须用 `summary.<...>` 形式。`passed: boolean` 是 v0.1 legacy 兼容字段，将随 v0.8 移除。

## 5. Schema 字段对照表（Probe Domain 内）

| 概念 | 字段名 | 类型 | 出现位置 |
|---|---|---|---|
| Probe 本体名 | `probeName` | string | `probes[<useName>].probeName`（从 ref 派生） |
| 业务场景名 | `useName` | string | `probes.<key>` |
| Probe 引用 | `ref` | string | `probes[<useName>].ref` |
| 运行时类型 | `probeType` | string | `probes[<useName>].output.observation.probeType` |
| 实现文件 | file | string | `packages/engine/src/infra/probes/<probeName>.ts` |
| 验证结果 | `outcome` | enum | `probes[<useName>].outcome`（仅 Probe 内部） |

## 6. 目标 frozen.json 结构（Plan 目标，**非当前实现**）

```json
{
  "name": "demo-proof-first",
  "runAt": "2026-08-01T04:13:31.952Z",
  "summary": {
    "outcome": "DEVIATED",
    "totalCount": 4,
    "passedCount": 3,
    "failedCount": 1,
    "inconclusiveCount": 0
  },
  "probes": {
    "package-json-exists": {
      "probeName": "fs-exists",
      "ref": "@oxn/probes/fs-exists",
      "description": "确认 package.json 存在",
      "target": "./package.json",
      "outcome": "COMPLETED",
      "passed": true,
      "output": {
        "observation": {
          "probeType": "fs_exists",
          "interference": { "flags": [] },
          "executedAt": 1785557611913
        }
      },
      "durationMs": 1
    },
    "working-tree-clean": {
      "probeName": "git-clean",
      "ref": "@oxn/probes/git-clean",
      "outcome": "DEVIATED",
      "passed": false,
      "output": {...},
      "errorMessage": "3 dirty file(s) found",
      "durationMs": 30
    }
  },
  "_xenon_meta": {
    "frozen_at": "...",
    "content_hash": "..."
  }
}
```

**关键改动**：

- `probes` 从 array 改 object，key = `useName`
- 新增 `summary` 容器包裹 aggregate 字段
- `outcome` 字段只剩 per-probe（Probe 内部）

## 7. Invariant 草案（4 条全进 Probe Domain）

| # | 内容 |
|---|---|
| **inv-26** | Probe 的 5 层名都在 Probe Domain 内：`probeName` = 本体名；`useName` = 业务场景名（key 字符集 `^[a-zA-Z0-9-]+$`）；`ref` = scope + 本体名；`probeType` = runtime 派发键；file = 实现 |
| **inv-27** | `outcome` 字段是 Probe 内验证结果专用；aggregate 层**禁止**使用 `outcome` 字段名，必须使用 `summary` 容器 |
| **inv-28** | InterferenceFlag 是信任/污染/干扰的唯一术语；`Taint` / `Boundary Deviation` 永久 ban |
| **inv-29** | Probe 验证的 3 态拼写分层（human lowercase / json uppercase -ED / TS uppercase no -ED）是设计；禁止在边界外互换 |

## 8. 跨域引用关系

```
oxn-domain (meta)
    │
    ├── oxn-engine-domain
    │       ▲
    │       │ 引用
    ├── oxn-work-domain
    │
    ├── oxn-asset-domain
    │
    └── oxn-proof-domain  ←── 引用 OxnProbeDomain
            │
            │ 引用
            ▼
       oxn-probe-domain (新)
```

## 9. glossary.md 同步结果（预期）

sync 脚本生成：

```markdown
### Probe
- [oxn-probe-domain] — 完整定义
- [oxn-work-domain] — 嵌入上下文（保留）

### ProbeOutcome
- [oxn-probe-domain] — 完整定义

### useName
- [oxn-probe-domain] — 业务场景名（新增）

### probeName
- [oxn-probe-domain] — Probe 本体名（重定义）

### InterferenceFlag
- [oxn-probe-domain] — 完整定义

### outcome
- [oxn-proof-domain] — Proof 聚合专用（重定义）
```

## 10. 风险评估

| 风险 | 等级 | 缓解 |
|---|---|---|
| schema 字段对照写"真"会变成承诺 | 中 | 用 markdown 引用块标注"目标结构，非当前实现" |
| `probes` array → object 是 schema breaking | 中 | 当前 PR 只动 Domain；schema 改动需 v0.8 迁移路径 |
| `Boundary Deviation` 业务侧还在用 | 低 | grep 全仓验证；如有用，加 1 个 alias 暂留 |
| Domain 拆分改动 domain 数量 | 低 | 资产注册表自动适应（grep `oxn-*-domain.md`） |
| 4 个新 invariant 与既有冲突 | 低 | 与 inv-9/10 主题不重叠 |
| `references` 调整可能 break DAG 校验 | 低 | 加 probe domain 是新增边，不删边 |

## 11. 不做的事（明确边界）

- ❌ 不改 `proof-schema.ts`（schema 改动 = 单独 PR）
- ❌ 不改 `proof-frozen-writer.ts`（写入器逻辑）
- ❌ 不改 `outcome-writer.ts`
- ❌ 不改 `PROOF_VERDICT_MD` 别名（方案 E 独立 PR）
- ❌ 不改 `passed` 字段（legacy 兼容）
- ❌ 不清 `Taint` 注释残留（13 处，独立 PR）
- ❌ 不统一 `干扰` vs `干涉` 中文（这 PR 已 ban，落地另开 PR）

## 12. 执行步骤

1. grep -rn "Boundary Deviation" 全仓，确认无硬引用
2. 新建 `.openxenon/assets/domains/oxn-probe-domain.md`（含 5 term + 4 inv + bans）
3. 编辑 `.openxenon/assets/domains/oxn-proof-domain.md`：
   - frontmatter 加 references: oxn-probe-domain
   - 删除 5 个迁移 term
   - Proof 描述收窄
4. `bun scripts/check-doc-boundary.ts` 守门
5. `bun scripts/sync-domain-glossary.ts` 重建 glossary.md
6. 阅读生成的 glossary.md 验证（Probe 移到 oxn-probe-domain）
7. grep `passed:|outcome:` 验证文案一致
8. git diff 复核所有变更
9. 写入 `.changes/0-6-3-probe-domain-split.md`

## 13. 回滚方案

- 删除新建文件
- revert 改动
- 零代码改动，无需重启
