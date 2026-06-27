# 0.3.0 — MD-SSOT 体系落地（5 阶段完整闭环）

> **主题**：Intent 唯一 MD 化 + .oxn ↔ .md 双轨制 + 3 automation scripts
> **范围**：1 个主分支（feat/v0.3-md-ssot，9 commits）+ 25 篇 sprint 文档
> **基线**：v0.2.0 frozen (commit `5b81e8d`) — 1393 tests pass
> **当前**：1545 tests pass（+152）
> **作者**：opencode（与用户决策协作，2026-06-20 ~ 2026-06-21，~2 天）
>
> 完整实施报告：[`.openxenon/pools/sprints/v0.3-md-ssot/design/arch-v0.3-implementation-report.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/arch-v0.3-implementation-report.md)
> 完整路线图：[`.openxenon/pools/sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md) v3.2
> Intent SSOT 边界权威：[`intent-ssot-boundary.md` v1.0](../.openxenon/pools/sprints/v0.3-md-ssot/design/intent-ssot-boundary.md)

---

## 0. 核心命题

> **MD-SSOT 不是"所有文档 MD 化"，而是"Intent 唯一 MD 化"**。
>
> Intent（domain/blueprint/work/task/proof）是 OpenXenon 内部 SSOT，强制 MD + mdast + 5 E_MD_xxx。
>
> 外部文档保持原状，Intent MD 通过 URL/相对路径外链引用。

**真值来源（v0.3 §11.2 锁定）**：

> **`.md` = 唯一写入入口**。`.oxn` 由 `.md` 自动编译生成，**禁止反向修改**。

---

## 1. 阶段 0 — 战略 + 文档 + 抽象 ✅

### 1.1 关键成果

| 成果 | 角色 |
|---|---|
| **18 篇 v0.3 文档** | 核心架构 + 路线图 + 边界权威 + 5 阶段 + 4 跨切 |
| **`pools/sprints/v0.3-md-ssot/` 子目录** | 版本化 sprint 容器（方便 v0.4/v0.5 对比）|
| **OxlDriver 抽象** | langium + mdast 双 driver 切换（driver-registry 运行时选）|
| **langium-driver 内聚** | `src/oxl/langium/` → `src/oxl/langium-driver/`（纯路径迁移）|

### 1.2 关键决策（4 项）

| 决策 | 含义 |
|---|---|
| **Intent 唯一 MD 化** | v2 错误命题"全栈 MD 化"被纠正为"Intent 唯一 MD 化" |
| **.md = 唯一写入入口** | 双轨制下禁止反向修改 .oxn |
| **E_MD_REFERENCE_BROKEN 二级** | 内部 = Fatal（阻断），外部 = Warn（警告）|
| **scope C v3 → v3.1 收窄为 2 阶段 → v3.2 扩展为 5 阶段** | 用户决策一次性完成 0+1+2+3+4 |

### 1.3 文件变更

**新增**：

- `src/oxl/contracts/oxl-driver.ts`（129 行）— OxlDriver 抽象接口
- `src/oxl/md-bridge/driver-registry.ts`（110 行）— driver 注册表
- `src/oxl/md-bridge/mdast-oxl-driver.ts`（101 行）— mdast driver 实现
- `src/oxl/md-bridge/index.ts`（131 行）— md-bridge 统一 barrel
- `src/oxl/langium-driver/`（物理迁移，3 文件 + generated/）

**修改**：

- `src/oxl/` 多处 import 路径调整（langium → langium-driver）

---

## 2. 阶段 1 — md-bridge 核心 ✅

### 2.1 关键交付

**新增 5 unified 依赖**（`package.json`）：

- `unified` ^11.0.5
- `remark-parse` ^11.0.0
- `remark-directive` ^3.0.0
- `remark-frontmatter` ^5.0.0
- `mdast-util-from-markdown` ^2.0.0

**新增 6 核心文件**（`src/oxl/md-bridge/`，~1,985 行）：

| 文件 | 行数 | 角色 |
|---|---|---|
| `pipeline.ts` | 394 | unified pipeline 编排（4 阶段管线）|
| `remark-to-mdast.ts` | 319 | .md → mdast AST（5 类 Intent 实体 parse API）|
| `mdast-validator.ts` | 309 | 5 E_MD_xxx 校验（Fatal/Warn 二级）|
| `mdast-to-kernel.ts` | 399 | **核心**：5 类 mdast → Kernel Schema（Zod 验证）|
| `cache.ts` | 300 | contentHash 缓存（7 天 TTL，chmod 0o444）|
| `reference-checker.ts` | 265 | 内部/外部引用分级（Fatal/Warn）|

**新增 5 测试文件**（`src/oxl/md-bridge/__tests__/`，~1,750 行）：

- `pipeline.test.ts`（20 cases）
- `remark-to-mdast.test.ts`（25 cases）
- `mdast-validator.test.ts`（15 cases）
- `mdast-to-kernel.test.ts`（20 cases）
- `cache.test.ts`（17 cases）

### 2.2 端到端链路

```
[Intent MD file]
    │  1. unified pipeline（remark-parse + remark-directive + remark-frontmatter）
    ▼
[mdast AST]
    │  2. 5 E_MD_xxx 校验
    ▼
[Validated mdast]
    │  3. mdast-to-kernel 转换器（5 类实体）
    ▼
[Kernel Schema（Zod 验证后）]
    │  4. IAP 引擎消费
    ▼
[Work execution + Proof verdict]
```

### 2.3 5 E_MD_xxx 错误码

| 错误 | 严重 | 触发 |
|---|---|---|
| `E_MD_INVALID_SYNTAX` | Fatal | mdast 解析失败 |
| `E_MD_MISSING_REQUIRED` | Fatal | 必填字段缺失 |
| `E_MD_TYPE_MISMATCH` | Fatal | 字段类型不符 |
| `E_MD_REFERENCE_BROKEN_FATAL` | Fatal | 内部 Intent 引用断链 |
| `E_MD_REFERENCE_BROKEN_WARN` | Warn | 外部 URL/路径失效 |
| `E_MD_HASH_MISMATCH` | Fatal | frozen.json hash 不一致 |

### 2.4 5 类 Intent 实体 MD 化

| 实体 | 容器指令 | Kernel Schema |
|---|---|---|
| `domain` | `:::domain` | `DomainSchema` (Zod) |
| `blueprint` | `:::blueprint` | `BlueprintSchema` (Zod) |
| `work` | `:::work` | `WorkSchema` (Zod) |
| `task` | `:::task` | `TaskSchema` (Zod) |
| `proof` | `:::proof` | `ProofSchema` (Zod) |

**注**：proof 编译到 `CompiledBlueprint`（`FrozenBlueprint` = alias）

### 2.5 L0–L3 兼容

- L0-Schema：Zod 不感知上游（mdast vs Langium）— ✅
- L0-Contract：兼容 — ✅
- L0-Processor：14 builtin probe 函数体不变（adapter 模式）— ✅
- L1-Infra：filesystem-async 重用 — ✅
- L1-OXL：新增 `md-bridge/`（在 L1-OXL 内）— ✅
- L2-Builtin：14 probe 模板**不动**（v0.3 仅 .md 解析，probe 仍 .oxn）— ✅
- L3-CLI：CLI 暂不需 detect 5 类 MD（v0.3 不暴露）— ✅

---

## 3. 阶段 2 — .oxn ↔ .md 双轨制 ✅

### 3.1 关键交付

**新增 3 核心文件**（`src/oxl/md-bridge/`，~1,040 行）：

| 文件 | 行数 | 角色 |
|---|---|---|
| `oxl-md-source-hash.ts` | 282 | contentHash 管理（防 .oxn/.md 漂移）|
| `oxl-md-compiler.ts` | 447 | mdast → .oxn 编译器（保留注释 + 生成 sourceHash）|
| `oxl-md-adapter.ts` | 313 | .oxn ↔ .md 双向 adapter（parse + serialize）|

**新增 1 测试文件**（`src/oxl/md-bridge/__tests__/oxl-md-stage2.test.ts`，459 行，30 cases）：

- hash 一致性：5 case
- 编译正确性：10 case
- 双向 adapter：10 case
- 错误处理：5 case

### 3.2 双轨期数据流

```
用户/AI 编辑 .md
    ↓
pre-commit hook（v0.4 实施，本期提供 API）:
    1. 检测 .md contentHash
    2. 读取 .oxn sourceHash
    3. 若 H_md ≠ H_oxn：
       a. 触发 .md → .oxn 编译
       b. 更新 .oxn + sourceHash
       c. 写 meta: regenerated-from-md
    4. 若 H_md = H_oxn：跳过
    ↓
CI 守卫（v0.4 实施）：
    • 拒绝 .oxn 手工修改
    • 强制 .md 重新编译（hash mismatch）
    ↓
运行时：
    • Kernel 优先读 .oxn（v0.2.0 兼容）
    • v0.4+ 可切换优先读 .md
```

### 3.3 sourceHash 机制

- **contentHash 算法**：SHA-256(mdast 规范化后)
- **存储位置**：`.oxn` 文件头注释（`# source-hash: <hash>`）
- **校验时机**：pre-commit hook + 启动时 sanity check
- **防漂移**：双轨期任何手动修改 .oxn 立即被 hash mismatch 捕获

### 3.4 与 v0.2.0 兼容

- v0.2.0 frozen (`5b81e8d`) 100% 兼容
- Kernel 仍优先读 .oxn（v0.2.0 行为不变）
- v0.3.0 启动时不强制 .md 存在
- v0.4.0 计划：driver-registry 切换为 mdast 优先

---

## 4. 阶段 3 — forges/ 7 Intent 文档迁移 ✅

### 4.1 关键发现

`forges/` 48 文档 ≠ 全部是 Intent 决策。**只有 7 篇是 OpenXenon 内部 Intent 决策**：

| 类别 | 数量 | 处理 |
|---|---|---|
| **Intent 决策** | 5 | ✅ 迁移到 `pools/sprints/v0.3-md-ssot/{design,journal}/` |
| **DEPRECATED 路线** | 2 | ✅ 归档到 `pools/sprints/v0.3-md-ssot/_archive/2026-06/` |
| **v0.1.x / v0.0.x 历史** | 23 | 🟡 保留 `forges/`（外部历史源）|
| **Sprint 1-9 设计稿** | 18 | 🟡 保留 `forges/sprints/` |
| **总计** | **48** | — |

### 4.2 关键决策

> **`forges/` 物理目录**保留**为外部历史源；不再"物理删除"（v0.2 计划已废除）**。

理由：
1. 41 篇是 v0.1.x / v0.2.x 实施历史，OpenXenon 不应控制
2. 物理删除将丢失大量过程产物，影响未来审计与回溯
3. forges/ 本就 gitignored（`.gitignore` 第 78 行 `.openxenon/forges/`），保留仅占本地磁盘

### 4.3 Group A — Intent 决策迁移（5 篇）

| 旧路径（`forges/`） | 新路径 | 角色 |
|---|---|---|
| `2026-06-13-intent-pool-design.md` | `pools/sprints/v0.3-md-ssot/journal/2026-06-13-intent-pool-design-v0.3.0.md` | Intent Pool v3 决策 |
| `2026-06-14-probe-signal-taint-design.md` | `pools/sprints/v0.3-md-ssot/design/probe-signal-taint-design.md` | Probe Taint 系统设计 |
| `2026-06-14-three-layer-proof-design.md` | `pools/sprints/v0.3-md-ssot/design/three-layer-proof-design.md` | Three-Layer Proof 设计 |
| `2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md` | `pools/sprints/v0.3-md-ssot/design/domain-as-ssot-doc-binding.md` | Domain SSOT 提议 |
| `2026-06-18-md-as-canonical-rewrite-design.md` | `pools/sprints/v0.3-md-ssot/journal/2026-06-18-md-canonical-v1.md` | **路线 C v1 基线** |

### 4.4 Group B — DEPRECATED 路线归档（2 篇）

| 旧路径（`forges/`） | 新路径 | 角色 |
|---|---|---|
| `2026-06-18-md-as-friendly-view-spike-design.md` | `pools/sprints/v0.3-md-ssot/_archive/2026-06/2026-06-18-md-friendly-view-deprecated.md` | **路线 A**（DEPRECATED）|
| `2026-06-18-ddd-terms-decouple-oxl-grammar-design.md` | `pools/sprints/v0.3-md-ssot/_archive/2026-06/2026-06-18-ddd-terms-deprecated.md` | **路线 B**（DEPRECATED）|

**`_archive/` 目录约定**（v0.3 阶段 0 引入）：
- 位置：`pools/sprints/v0.3-md-ssot/_archive/2026-06/`
- 命名：`<原文件名>-deprecated.md`
- 永久保留，不修改

### 4.5 Group C — forges/ 保留（41 篇）

`forges/` 41 篇不变（**永久保留**）：

- 23 篇 top-level（v0.0.27 / v0.1.0 / v0.1.x 各类 + audits）
- 18 篇 `forges/sprints/`（sprint-1 至 sprint-9 + EXECUTION-ORDER.md）

详见 [`process-forges-deprecation-migration.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/process-forges-deprecation-migration.md)

---

## 5. 阶段 4 — scripts 自动化 ✅

### 5.1 关键交付

**新增 3 自动化 scripts**（`scripts/`，~790 行）：

| 文件 | 行数 | 角色 |
|---|---|---|
| `version-aggregate.ts` | ~300 | CHANGELOG 聚合（按版本分组，输出 JSON/stdout）|
| `check-naming.ts` | ~220 | 文件名规范校验（5 种命名模式：date+slug / scope+topic / version 等）|
| `parse-mdast.ts` | ~270 | 全量 md-bridge 解析检查（5 E_MD_xxx + hash 校验）|

**新增 2 测试文件**（`scripts/__tests__/`，~330 行）：

- `version-aggregate.test.ts`（8 cases）
- `check-naming.test.ts`（12 cases）
- `parse-mdast` 集成测试（在 `__tests__/integration/`）

### 5.2 5.2 package.json 新增 scripts

```jsonc
{
  "scripts": {
    "version:aggregate": "bun run scripts/version-aggregate.ts",
    "check:naming": "bun run scripts/check-naming.ts",
    "check:mdast": "bun run scripts/parse-mdast.ts"
  }
}
```

### 5.3 5.3 version-aggregate 输出示例

```json
{
  "byVersion": {
    "v0.3.0": [
      { "path": ".openxenon/pools/sprints/v0.3-md-ssot/design/md-ssot-system.md", "entity": "design", "title": "MD-SSOT 系统架构" }
    ]
  },
  "total": 25,
  "skipped": []
}
```

---

## 6. 累计交付

### 6.1 代码交付

| 类别 | 文件 | 行数 | 测试 |
|---|---|---|---|
| **md-bridge 源码（阶段 1+2）** | 9 | ~3,025 | — |
| **md-bridge 测试** | 7 | ~2,200 | 127 |
| **OxlDriver 抽象** | 1 | 129 | 10 |
| **langium-driver 内聚** | 4 | ~440 | 复用 |
| **scripts 自动化** | 3 | ~790 | 20 |
| **scripts 测试** | 2 | ~330 | 20 |
| **总新增** | **26** | **~6,914** | **177** |

### 6.2 文档交付

| 类别 | 数量 | 行数 |
|---|---|---|
| **pools/sprints/v0.3-md-ssot/design/** | 18 | ~5,800 |
| **pools/sprints/v0.3-md-ssot/audit/** | 2 | ~543 |
| **pools/sprints/v0.3-md-ssot/journal/** | 3 | ~770 |
| **pools/sprints/v0.3-md-ssot/_archive/2026-06/** | 2 | ~700 |
| **pools/pool-roadmap.md** | 1 | ~280 |
| **v0.3 sprint 文档总计** | **25** | **~7,800** |

### 6.3 测试统计

| 项 | 数据 |
|---|---|
| **v0.2.0 frozen** | 1393 tests pass |
| **v0.3.0 完成** | **1545 tests pass** |
| **净增测试** | **+152**（md-bridge 127 + scripts 20 + driver 10 - 5 调整）|
| **失败** | 0 |
| **typecheck / biome / eslint** | 0 error |

### 6.4 累计 commits（9 个 in feat/v0.3-md-ssot）

```
336b64f docs(v0.3): update roadmap + pool-roadmap to v3.2 5-stage completed   [v0.3.0 release prep]
1236e7f feat(scripts): v0.3 stage 4 - 3 automation scripts (T13-T15)         [stage 4]
aff79b8 docs(v0.3): add v0.3 stage 0-3 implementation report                  [implementation report]
b6560d6 feat(pools): v0.3 stage 3 — forges/ 7 Intent docs migration          [stage 3]
3fe00a9 feat(oxl): v0.3 stage 2 — .oxn ↔ .md dual-track implementation     [stage 2]
5052b10 feat(oxl): v0.3 stage 1 T2-T8 — md-bridge complete implementation   [stage 1]
9b36284 build(deps): add unified ecosystem for v0.3 md-bridge (T1)           [stage 1 T1]
1092e4e refactor(pools): aggregate v0.3 docs into sprints/v0.3-md-ssot/      [stage 0]
7f710e2 feat(v0.3): stage 0 launch — 18 docs + langium-driver refactor + md-bridge  [stage 0 launch]
```

---

## 7. 实施时间线

| 日期 | 事件 | commit |
|---|---|---|
| 2026-06-20 | 阶段 0 启动：18 篇文档 + langium-driver 内聚 | `7f710e2` |
| 2026-06-20 | Pools 重构：sprints/v0.3-md-ssot/ 子目录 | `1092e4e` |
| 2026-06-20 | T1：package.json +5 unified 依赖 | `9b36284` |
| 2026-06-21 | 阶段 1 T2-T8：md-bridge 核心（97 tests）| `5052b10` |
| 2026-06-21 | 阶段 2：.oxn ↔ .md 双轨制（30 tests）| `3fe00a9` |
| 2026-06-21 | 阶段 3：forges/ 7 Intent 文档迁移 | `b6560d6` |
| 2026-06-21 | 实施报告：arch-v0.3-implementation-report.md | `aff79b8` |
| 2026-06-21 | 阶段 4：3 automation scripts（25 tests）| `1236e7f` |
| 2026-06-21 | Roadmap 文档 v3.1 → v3.2 更新 | `336b64f` |

**总时长**：~2 天（2026-06-20 ~ 2026-06-21）

---

## 8. 与 v0.2.0 边界对比

| 维度 | v0.2.0 | v0.3.0 |
|---|---|---|
| Intent 实体格式 | .oxn（Langium DSL）| .oxn + .md（双轨期，.md 优先写入）|
| 外部文档 | forges/（gitignored）| forges/ 保留为外部源（**永久**）|
| unified 生态 | 不涉及 | ✅ 引入（unified ^11.0.5）|
| mdast 范围 | 不涉及 | ✅ **仅 Intent 5 类** |
| 5 E_MD_xxx | 不涉及 | ✅ **仅 Intent** |
| 双轨制 | 不涉及 | ✅ `.md` 优先 + `oxl-md-adapter` 桥接 |
| OxlDriver 抽象 | 无 | ✅ 双 driver 切换（langium + mdast）|
| scripts | 0 个新 | ✅ **3 个新** |
| 测试 | 1393 | **1545**（+152）|
| 路线图 | 6 阶段 ~18 周 | 5 阶段 0-4（~8 周）|
| 14 builtin probe | .oxn 模板 | 不动（v0.4 实施）|
| 5 类实体可 MD 化 | 否 | ✅ Domain / Blueprint / Work / Task / Proof |
| sprint 文档 | 0 | **25**（v0.3-md-ssot）|
| forges/ 物理删除 | 计划 v0.3 阶段 5 | **永久保留**（v0.3 阶段 3 决策）|

---

## 9. 风险与回退

| 风险 | 缓解 | 回退 |
|---|---|---|
| unified 生态与 L0-Processor 边界冲突 | mdast → Kernel 经 Zod 验证 | 保留 Langium 双轨 |
| mdast-to-kernel 适配复杂 | 渐进式：domain → blueprint → work → task → proof | 暂停 v0.3，回滚 v0.2.0 |
| 双轨期 hash 校验过严 | pre-commit hook 可禁用（CI 强制）| 强制 .md 重新编译 |
| 14 builtin probe 渐进替换 | v0.3 不动 probe；v0.4 由用户驱动 | v0.3 仅完成 md-bridge |
| 41 篇 forges/ 永久保留 | 接受（历史价值 > 存储成本）| 改为 _archive |
| `.gitignore` 第 83 行实际未生效 | 暂不修（设计稿 tracked）| v0.4 修复 |

**v0.3 完成后风险大幅降低**（5 阶段全部完成，1393 → 1545 tests pass）。

---

## 10. 后续 (v0.4.0 推迟清单)

### 10.1 工具类（v0.4 实施）

- [ ] `naming-system.md` 完整 CI 校验（`check-naming.ts` 已有，CI 集成）
- [ ] pre-commit hook 实施（基于 `oxl-md-source-hash.ts` + `oxl-md-compiler.ts`）
- [ ] `.changes/` 重组 + version:check/sync 增强
- [ ] CHANGELOG 自动化（`version-aggregate.ts` 已有，CI 集成）
- [ ] 修复 `.gitignore` 第 83 行（`pools/*/!(.gitkeep)` 实际未生效）

### 10.2 内容类（v0.4 实施）

- [ ] 14 builtin probe `.oxn` → `.md` 渐进迁移
- [ ] `oxn-md` CLI 完整化（`oxn <asset> sync` / `oxn <asset> md-create`）
- [ ] `oxn validate` CLI 增强
- [ ] `oxn work` v1.1 8 阶段工作流
- [ ] Langium 渐进删除路径（v0.4 准备，v0.5 实施）

### 10.3 文档类（v0.4 实施）

- [ ] forges/ 添加 README 说明其"外部历史源"角色
- [ ] `pools/sprints/v0.3-md-ssot/` 添加 CHANGELOG（基于 version-aggregate）
- [ ] `pools/sprints/v0.3-md-ssot/audit/retro-v0.3.0-roadmap-execution.md` 复盘

---

## 11. v0.3.0 release 清单

- [x] **代码**：md-bridge 核心 + 双轨制 + scripts 自动化（~7,000 行）
- [x] **测试**：1545 pass / 0 fail
- [x] **文档**：v0.3 sprint 25 篇 + 实施报告 1 篇 + changelog 1 篇（本文）
- [x] **commit**：9 commits（feat/v0.3-md-ssot）
- [ ] **push**：双 remote 同步（github + yuheng-forgejo）— 等待
- [ ] **CHANGELOG**：写 `docs/zh-cn/changelog/CHANGELOG.md` + `docs/en/changelog/CHANGELOG.md` — 等待
- [ ] **package.json version**：`0.3.0-alpha` → `0.3.0` — 等待
- [ ] **PR**：feat/v0.3-md-ssot → dev — 等待
- [ ] **npm publish**：`npm publish 0.3.0` — 等待
- [ ] **git tag v0.3.0** — 等待

---

## 关联

- v0.3 实施报告：[`arch-v0.3-implementation-report.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/arch-v0.3-implementation-report.md)
- v0.3 路线图（v3.2 完成版）：[`v0.3.0-roadmap.md`](../.openxenon/pools/sprints/v0.3-md-ssot/design/v0.3.0-roadmap.md)
- Intent SSOT 边界权威：[`intent-ssot-boundary.md` v1.0](../.openxenon/pools/sprints/v0.3-md-ssot/design/intent-ssot-boundary.md)
- Pool 入口：[`pool-roadmap.md`](../.openxenon/pools/pool-roadmap.md)
- v0.2.0 tag：`v0.2.0` (commit `5b81e8d`)
- v0.2.0 复盘：[`retro-v0.2.0-roadmap-execution.md`](../.openxenon/pools/sprints/v0.3-md-ssot/audit/retro-v0.2.0-roadmap-execution.md)
- v0.4.0 推迟清单：见 §10
