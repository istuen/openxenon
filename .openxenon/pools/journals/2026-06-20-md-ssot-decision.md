---
event: md-ssot-decision
date: 2026-06-20
work: v0-3-md-ssot
type: decision
---

# Journal: 2026-06-20 v0.3 MD-SSOT 战略决策

> **事件**：v0.3 MD-SSOT 路线 C 远期档 v2 锁定
> **日期**：2026-06-20
> **类型**：战略决策

---

## 1. 背景

v0.2.0 刚冻结（commit `5b81e8d` + tag `v0.2.0`）。在用户与 opencode 的多轮讨论中，确定了 v0.3 的架构终局方向。

**核心问题**：OpenXenon 的 OXL（基于 Langium）有 3 个根本性问题：
1. LLM 写自定义 DSL 出错率高（~10%）
2. 文档系统碎片化（8 个 CHANGELOG、4 类目录）
3. 设计文档无归宿（51 个 forges/ 文档待迁移）

---

## 2. 关键决策（5 项）

### 决策 1：采纳路线 C 作为终局方向

**采纳** `unified + remark + mdast` 全栈替代 Langium。

- MD 是 OpenXenon 全部内容的原生格式（不是派生）
- 完整 IAP 生命周期文档化（需求/产品/开发/测试）
- 路线 A（MD 作为 friendly view）**DEPRECATED**
- 路线 B（OXL 语法解耦）**DEPRECATED**

### 决策 2：保留当前 `.openxenon/` 目录结构

**保留** v0.2.0 状态：
- `domains/` `blueprints/` `works/` `proofs/`
- `pools/` = `forges/` 升级版（5 类池）
- `issues/` + `config.json`

**废弃**新设计的 4 层 IAP 主导主体目录（design/intent/align/proof）。

### 决策 3：`pools/` = `forges/` 升级版

**确认** `pools/` 是 forges/ 的升级版。依据：
- AGENTS.md 原文："**forges/ 计划于 v0.1.x 升级为 `.openxenon/pools/` Intent Pool**"
- T13 (v0.2.0 commit `16fb880`) 已建 5 池

**51 forges/ 文档迁移目标** = `pools/{type}/<doc>.md`：
- 27 → `pools/audit/`
- 13 → `pools/design/`
- 1 → `blueprints/`
- 2 → `align/work/<w>/`
- 3 → `_archive/`
- 5（.changes/ 历史）→ 阶段 5 重组

### 决策 4：5 个新 scripts 实施版本管理自动化

| 脚本 | 职责 |
|---|---|
| `version-check.ts` | 验证 package.json vs `.openxenon/**` 一致性 |
| `version-aggregate.ts` | 从 `.openxenon/**` 聚合 CHANGELOG（v0.3 新建）|
| `version-release.ts` | 5 步原子化发布（v0.3 新建）|
| `audit-completeness.ts` | 4 层 IAP 完整性审计（v0.3 新建）|
| `check-naming.ts` | 命名规范校验（v0.3 新建）|

### 决策 5：CLI 5 类 create 已就绪

**5 类 IAP 资产全部有 `create` CLI**（v0.2.0 源码已实施）：

| CLI | v0.2.0 状态 |
|---|---|
| `oxn domain create` | ✅ 实施 |
| `oxn blueprint create` | ✅ 实施 |
| `oxn work create` | ✅ 实施 |
| `oxn proof create` | ✅ 实施 |
| `oxn pool create` | ✅ 实施（T13 同步）|

**注意**：v0.2.0 还未发布到 npm——全局 `oxn` 仍是 v0.1.8。

---

## 3. 命名体系（v1.0）

**格式**：`[<scope>-]<topic-slug>[@<status>][-v<X.Y.Z>].md`

| scope | 含义 |
|---|---|
| `arch` / `dev-design` / `process` / `plan` / `req` / `test-design` / `product` / `retro` / `journal` / `audit` | 文档类型 |

**目录模式**：
- `domains/<Name>.md` (PascalCase)
- `blueprints/<name>.md` (kebab-case)
- `works/<w>/work.md` + `tasks/<task>.md`
- `proofs/<p>/verdict.md`
- `pools/<type>/<doc>.md`（research/design/issue/audit/journal）

**6 篇跨切架构文档**全部在 `pools/design/`（v0.3.0 前位于 `design/architecture/`，已迁移）：
1. `v0.3.0-roadmap.md` (150 行)
2. `md-ssot-system.md` (341 行)
3. `naming-system.md` (459 行)
4. `process-version-iteration-flow.md` (414 行)
5. `process-forges-deprecation-migration.md` (266 行)
6. `l0-l3-alignment.md` (341 行)

**5 篇 pools/design/ 阶段文档**（v0.3.0 阶段）：
1. `req-md-ssot-v0.3.0.md` (165 行) — 需求
2. `arch-md-ssot-v0.3.0.md` (298 行) — 架构
3. `dev-design-md-ssot-v0.3.0.md` (524 行) — 实施
4. `test-design-md-ssot-v0.3.0.md` (468 行) — 测试
5. `product-md-ssot-overview-v0.3.0.md` (337 行) — 产品

**合计 11 篇设计文档（1971 + 1792 = 3763 行）**。

---

## 4. 实施阶段（v0.3 路线图）

| 阶段 | 周次 | 内容 | 关键交付 |
|---|---|---|---|
| **0** | W0 | 路线 C v2 + 阶段文档 | 11 篇 pools/design/（6 跨切 + 5 阶段）✅ |
| **1** | W1-3 | mdast 解析器 | `src/oxl/md-bridge/remark-to-kernel.ts` + 5 类 E_MD_xxx |
| **2** | W4-6 | 14 builtin probe MD 化 | probe 模板 .oxn → .md |
| **3** | W7-9 | forges/ → pools/ 迁移 | `scripts/migrate-forges.ts` + 51 文档迁移 |
| **4** | W10-12 | 5 个 scripts | version-aggregate/release + audit-completeness |
| **5** | W13-14 | forges/ 物理删除 | `rm -rf forges/` + `_archive/2026-06-forges/` |
| **6** | W15-18 | oxn-md CLI 完整化 | `oxn domain --md` + oxn-md-renderer |

**总计**：~18 周 ≈ 4.5 个月

---

## 5. 关键不变量

1. **MD 是 SSOT**——所有内容用 MD 写
2. **保留当前 `.openxenon/` 目录结构**——`pools/` = `forges/` 升级版
3. **proofs/ frozen**——chmod 0o444 + contentHash
4. **5 类 E_MD_xxx 保留 Langium 强结构保护**
5. **AI + 人类双消费**——MD 是共同语言
6. **双轨期过渡**——.oxn + .md 并存
7. **L0-Processor 兰姆达真空**——adapter 模式
8. **forges/ 物理删除**——阶段 5 强制

---

## 6. L0–L3 兼容性

| 层 | 触达 | 兼容性 |
|---|---|---|
| L0-Schema | Zod 重写 | ✅ 兼容（Zod 不感知上游）|
| L0-Contract | 不变 | ✅ 兼容 |
| L0-Processor | 14 probe 函数体不变 | ✅ 兼容（adapter 模式）|
| L1-Infra | filesystem-async 重用 | ✅ 兼容 |
| L1-OXL | 新增 `md-bridge/` | ⚠️ 新增层（仍在 L1-OXL）|
| L2-Builtin | 14 probe 模板 .oxn → .md | ⚠️ 物理迁移 |
| L2-Work | 不变 | ✅ 兼容 |
| L3 | CLI `--md` flag | ✅ 兼容 |

---

## 7. 关联决策

- **依赖决策**：[`2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md`](../../forges/2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md) — Domain as SSOT 提议
- **基线决策**：[`2026-06-18-md-as-canonical-rewrite-design.md`](../../forges/2026-06-18-md-as-canonical-rewrite-design.md) — 路线 C v1
- **v2 决策**：[`md-ssot-system.md`](../md-ssot-system.md) — 路线 C v2
- **路线图**：[`v0.3.0-roadmap.md`](../v0.3.0-roadmap.md)

---

## 8. v3 决策更新（2026-06-20 路线 C v3 锁定）

> **触发**：用户对 v2 路线 C "全栈 MD 化" 反思后，提出 **Intent vs 文档 边界**洞察。
>
> **关键命题**：
> > **SSOT 不在于格式，而在于控制权。**
> > **只要 OpenXenon 控制了 Intent，就控制了信任的基石。**

### 8.1 4 项核心决策（v3 锁定）

| # | 决策 | 含义 |
|---|---|---|
| 1 | **Intent SSOT = 4 类 IAP 实体**（v3.1 升级为 5 类含 task.md）| domain/blueprint/work/task/proof 是 OpenXenon 唯一 SSOT |
| 2 | **外部文档 = Intent MD 外链 URL** | 不复制内容；Intent 用 URL/相对路径引用 |
| 3 | **双轨期 = 仅 Intent** | OXL + MD 并行只在 IAP 5 类上发生 |
| 4 | **forges/ = 永久保留为外部源** | 废除物理删除计划 |

### 8.2 4 项风险协议（A1 v3.1 落地）

| 风险 | 协议 | 文档 |
|---|---|---|
| 双轨期冲突 | `.md` = 唯一写入入口；`.oxn` 自动编译；禁止反向修改 | [`md-ssot-system.md` v3 §11.2](../design/md-ssot-system.md) |
| E_MD_REFERENCE_BROKEN 脆弱 | 二级：内部引用 = Fatal；外部引用 = Warn | [`md-ssot-system.md` v3 §11.3](../design/md-ssot-system.md) |
| Task 解析性能 | contentHash 缓存 + 7 天 TTL | [`md-ssot-system.md` v3 §11.4](../design/md-ssot-system.md) |
| forges/ 内部判定 | 迁 pools/ 前不触发 E_MD_xxx；迁后继承 Intent 约束 | [`md-ssot-system.md` v3 §11.5](../design/md-ssot-system.md) |

### 8.3 2 项取消

| 取消项 | 原计划 | 取消原因 |
|---|---|---|
| forges/ 物理删除 | v0.3 阶段 5 强制 | forges/ 永久保留为外部源 |
| oxn-md CLI 完整化 | v0.3 阶段 6 | 推迟 v0.4；Intent MD 化已通过 OXL 改造完成 |

### 8.4 路线图变化（v2 → v3）

| 维度 | v2 | v3 |
|---|---|---|
| 阶段数 | 6 阶段 0-6 | **5 阶段 0-4**（简化 17%）|
| 总周数 | ~18 周 | **~10 周**（简化 44%）|
| 阶段 1 范围 | 所有 IAP + pools/ | **仅 Intent 5 类**（含 v3.1 新增 task.md）|
| 阶段 2 范围 | 14 probe MD 化 | **5 类 Intent OXL↔MD 双轨期** |
| 阶段 3 范围 | 51 forges/ 全量迁移 | **forges/ 分类 + Intent 子集迁移** |
| 阶段 4 范围 | 5 scripts | **3 scripts**（version-aggregate + check-naming + parse-mdast）|
| 阶段 5 | forges/ 物理删除 | **取消**（废除）|
| 阶段 6 | oxn-md CLI | **取消**（推迟 v0.4）|

### 8.5 v3 关键文档（2026-06-20 落盘）

| 文档 | 行数 | 角色 |
|---|---|---|
| [`md-ssot-system.md`](../design/md-ssot-system.md) v3.1 | 506 | 路线 C v3 + 4 风险协议 |
| [`v0.3.0-roadmap.md`](../design/v0.3.0-roadmap.md) v3 | 323 | 简化路线图（5 阶段 ~10 周）|
| [`intent-ssot-boundary.md`](../design/intent-ssot-boundary.md) v1.0 | 411 | Intent SSOT 边界权威定义 |

### 8.6 关键约束（v3 锁定，10 条）

1. **Intent = OpenXenon SSOT**（5 类资产唯一权威）
2. **外部文档保持原状**（forges/ + pools/{research,issue,design/process-*}）
3. **mdast 仅解析 Intent 5 类**（含 task.md）
4. **5 E_MD_xxx 仅 Intent**（Fatal/Warn 二级）
5. **`.md` = 唯一写入入口**（双轨期禁止反向修改 .oxn）
6. **forges/ 永久保留**（废除物理删除）
7. **proofs/ frozen**（chmod 0o444 + contentHash）
8. **AI + 人类双消费**（MD 是共同语言）
9. **contentHash 缓存**（Task 解析性能 + 7 天 TTL）
10. **保守原则**（判定不确定 → 默认外部）

---

## 9. v3.1 决策更新（2026-06-20 范围收窄）

> **触发**：用户审阅 v3 路线图后，反思 v0.3 应聚焦 2 个核心交付，其他议题推迟 v0.4.0。
>
> **关键命题**：
> > **范围最小化让 v0.3 高度可预期、避免长周期重构。**
> > v0.3 仅做：**unified 接入 Kernel Schema** + **双轨制**。

### 9.1 2 项推迟决策（v3.1 锁定）

| # | 决策 | 含义 |
|---|---|---|
| 1 | **naming-system.md 仅保留文档** | 不进入 v0.3 实施范围；命名规范 CI 校验推迟 v0.4.0 |
| 2 | **process-version-iteration-flow.md 仅保留文档** | 不进入 v0.3 实施范围；5 scripts 推迟 v0.4.0 |

### 9.2 v0.3 范围（v3.1 锁定 2 阶段 ~6 周）

| 阶段 | 周次 | 内容 | 关键交付 |
|---|---|---|---|
| **1** | W1-3 | **unified 接入 Kernel Schema**（**核心 1**）| `src/oxl/md-bridge/` 6 个文件 + 5 E_MD_xxx + contentHash 缓存 |
| **2** | W4-5 | **Intent 5 类 .oxn ↔ .md 双轨制**（**核心 2**）| `oxl-md-adapter` + `oxl-md-compiler` + pre-commit hook + 25+ 集成测试 |

### 9.3 v3.1 vs v3 收窄对照

| 维度 | v3 | v3.1（当前）|
|---|---|---|
| 阶段数 | 5 阶段 0-4 | **2 阶段 1-2**（去 0-4 文档阶段）|
| 总周数 | ~10 周 | **~6 周**（v3.1 - 4 周）|
| 阶段 1 范围 | mdast 解析器 + 5 E_MD_xxx + 缓存 | **unified 接入 Kernel Schema**（更聚焦）|
| 阶段 2 范围 | Intent OXL↔MD 双轨 | **Intent 5 类 .oxn ↔ .md 双轨制**（更聚焦）|
| 阶段 3-4 | forges/ 分类 + 3 scripts | **取消**（v0.4.0）|
| scripts 总数 | 3 个 | 0（v0.4.0 实施）|
| 14 builtin probe | 不动 | 不动（v0.4.0）|
| 命名规范 CI | 阶段 4 实施 | **取消**（v0.4.0）|
| version scripts | 阶段 4 实施 | **取消**（v0.4.0）|

### 9.4 v0.4.0 推迟清单（v3.1 锁定）

- [ ] A3 `process-forges-deprecation-migration.md` 改写
- [ ] A5 `naming-system.md` 精简 + CI 校验
- [ ] forges/ 51 文档分类迁移
- [ ] `scripts/version-aggregate.ts`
- [ ] `scripts/check-naming.ts`
- [ ] `scripts/parse-mdast.ts`
- [ ] `oxn validate` CLI
- [ ] 14 builtin probe .md 化
- [ ] `.changes/` 重组
- [ ] version:check/sync 增强
- [ ] CHANGELOG 自动化聚合
- [ ] `oxn-md` CLI 完整化

### 9.5 v3.1 关键文档

| 文档 | 状态 | 行数 |
|---|---|---|
| [`md-ssot-system.md`](../design/md-ssot-system.md) v3.2 | ✅ 落盘 | 521 |
| [`v0.3.0-roadmap.md`](../design/v0.3.0-roadmap.md) v3.1 | ✅ 落盘 | 353 |
| [`intent-ssot-boundary.md`](../design/intent-ssot-boundary.md) v1.0 | ✅ 落盘 | 411 |
| [`naming-system.md`](../design/naming-system.md) v1.0 | ✅ 仅保留（v0.4.0 推迟）| 463 |
| [`process-version-iteration-flow.md`](../design/process-version-iteration-flow.md) | ✅ 仅保留（v0.4.0 推迟）| 419 |

### 9.6 阶段 1 启动清单（v0.3 唯一立即可执行）

| 任务 | 文件 | 角色 |
|---|---|---|
| T1 | `package.json` | +5 依赖（unified/remark-parse/remark-directive/remark-frontmatter/mdast-util-from-markdown）|
| T2 | `src/oxl/md-bridge/pipeline.ts` | unified pipeline 编排 |
| T3 | `src/oxl/md-bridge/remark-to-mdast.ts` | .md → mdast AST |
| T4 | `src/oxl/md-bridge/mdast-validator.ts` | 5 E_MD_xxx 校验 |
| T5 | `src/oxl/md-bridge/mdast-to-kernel.ts` | 5 类 mdast → Kernel Schema |
| T6 | `src/oxl/md-bridge/cache.ts` | contentHash 缓存 + 7 天 TTL |
| T7 | `src/oxl/md-bridge/reference-checker.ts` | 内部/外部引用分级（Fatal/Warn）|
| T8 | `__tests__/*.test.ts` | 30+ 单元测试 |

**总计**：8 任务 / 6 文件 / ~1500 行（含测试）

---

**记录人**：opencode（与用户决策协作）
**日期**：2026-06-20
**决策状态**：✅ v3.1 已锁定（2 推迟 + 2 阶段 ~6 周）
