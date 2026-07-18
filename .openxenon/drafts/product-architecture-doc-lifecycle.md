---
type: draft
created: 2026-07-18
status: active
abstract: |
  OpenXenon 最新产品/架构设计分析 + ADR/RFC 历史噪音重构 + 文档生命周期制度化方案。
  输出三条线索：① 现状有效设计是什么 ② ADR/RFC 如何除噪 ③ 6 层文档关系厘清 + 自举机制。
references:
  - domain-doc-vocabulary-alignment
  - openxenon-architecture-from-adrs
  - v0.7-domain-hierarchy-restructure
  - v0.7.3-ideal-data-flow
  - three-boundary-blueprint-elevation
  - work-unified-model
  - version-unification
  - v0.6.3-asset-paper-schema
---

# OpenXenon 产品/架构现状 + 文档生命周期制度化

## 1. 最新产品设计 & 架构设计

### 1.1 产品核心（v0.6.1 当前有效）

**一句话**：基于 IAP 范式（Intent→Align→Proof）的人机信任协作工具。

**核心叙事**：v0.6.1 = 最小信任闭环（四层确定性就位：D1 边界 + D2 验证 + D3 证据 + D4 记录）

**4 个结构实体 E1-E4**：

| 实体 | 性质 | 实现状态 |
|---|---|---|
| **E1 Asset** | 静态硬约束边界 | ✅ 完整（5 AssetKind + External H2 + AssetPaper 4 字段） |
| **E2 Work** | 动态协作（IAP+Round） | ✅ 完整（3 IAP 阶段 + Round + PlanLock + BirthCert + frozen.json） |
| **E3 Engine** | 独立公证 | ✅ 完整（L0-L3 分层 + Kernel 真空 + OXL MD-native） |
| **E4 Insight** | 涌现层（1+1>2） | 🟡 哲学占位 + CLI 入口 + 单 Work 历史 + 跨 Proof 趋势 |

### 1.2 架构核心（7 大栈）

| 栈 | 核心 ADR | 状态 |
|---|---|---|
| 三边界框架 | 0054/0055/0056 | ✅ Adopted + 已实现 |
| Blueprint 组合模板 | 0055 | ✅ 已实现 |
| 四层确定性/信任链 | 0057/0058 | ✅ 叙事已落地 |
| Kernel 兰姆达真空 | 0008/0009/0010/0013 | ✅ 已实现 |
| 证据链三件套 | 0011 | ✅ 已实现 |
| 审计链 | 0012 | ✅ 已实现 |
| 数据流契约 | 0061 | ✅ P0 落地（v0.7.3 backport） |

**工程实现**：Monorepo 双包（`packages/cli` + `packages/engine`）+ L0→L1→L2→L3 单向依赖 + MD-native OXL（Langium 已退役 ADR-0052）

### 1.3 可作为参考/调整基础的文档

| 文档 | 类型 | 质量 | 用途 |
|---|---|---|---|
| `openxenon-architecture-from-adrs.md` | 架构综合 | ⭐⭐⭐ 最全 | 从 30+ ADR 反向提取的完整架构图景 |
| `iap-paradigm.md` | 产品概念 | ⭐⭐⭐ | E1-E4 + IAP 范式 SSOT |
| `work-unified-model-rfc.md` | Work 模型 | ⭐⭐⭐ | 3 IAP 阶段 + Round + 引用收敛精确设计 |
| `v0.7.3-ideal-data-flow-rfc.md` | 数据流 | ⭐⭐⭐⭐ 最新 | Blueprint→Work→Task 数据流断裂点修复（P0-P8 完成） |
| `three-boundary-blueprint-elevation-rfc.md` | 三边界 | ⭐⭐⭐ | 三边界框架 + Blueprint 提升完整决策 |
| 7 个 Domain .md | 词汇权威 | ⭐⭐⭐ | 87 个 H3 Terms SSOT |
| `v0.7-domain-hierarchy-restructure-rfc.md` | Domain 重构 | ⭐⭐ | 方案 Draft，尚未执行 |
| `version-unification-rfc.md` | 版本规划 | ⭐⭐ | 信任链叙事确定但版本号已过时 |

---

## 2. ADR/RFC 历史噪音重构

### 2.1 ADR 分类重构

#### A 组：核心活跃（30 Adopted）——保留，按架构栈重聚合

| 架构栈 | ADR |
|---|---|
| 三边界 | 0054, 0055, 0056 |
| 信任链 | 0057, 0058 |
| Kernel 真空 | 0008, 0009, 0010, 0011, 0013, 0037 |
| OXL/Blueprint 哲学 | 0001, 0002, 0003, 0021 |
| AI 协作 | 0012, 0031, 0032 |
| Work/Asset | 0004, 0005, 0024, 0025, 0035, 0049, 0050, 0051, 0061 |
| Domain 治理 | 0052, 0059, 0060 |
| 寻址/i18n | 0018, 0023, 0038 |
| 意图/对齐映射 | 0020 |

#### B 组：5 个 Partially Adopted——逐个裁定

| ADR | 当前 | 噪音 | 建议 |
|---|---|---|---|
| 0026 Skill 三分区 | Partial | 已收敛为统一 oxn-work | **Superseded**，说明被统一 Skill 替代 |
| 0027 Domain SSOT 治理 | Partial | 精神落地但 0060 更精确 | **保留 Partial**，或标注被 0060 补充 |
| 0015 Insight 四实体证据链 | Partial | v0.6 Insight 升 E4 后 schema 待更新 | **保留 Partial**，v0.7 emergence 后更新 |
| 0017 probe-stats 跨 Proof | Partial | 已实现 | **升级 Adopted**，补充运行时状态注 |
| 0038 i18n 选型 | Partial | Paraglide 已选定但未全覆盖 | **保留 Partial** |

#### C 组：9 个 Proposed——分三档

| 档 | ADR | 建议 |
|---|---|---|
| 即将实施（v0.7 已规划 RFC） | 0022(AI 三模式), 0028(Port), 0029(Anchor), 0030(@term) | 保留 Proposed |
| 哲学声明（已写入 Doc 但无代码） | 0006(三相), 0007(Loop 观测), 0014(动机叙事), 0016(三不要) | 新增 **Philosophy** 状态 |
| 待定 | 0039(Skill 重构) | 保留 Proposed |

#### D 组：14 个 Superseded——已归档

0019, 0033, 0034, 0036, 0040-0047, 0048, 0053。全部已有 Superseded-by 链，无需动作。

### 2.2 RFC 分类重构

| RFC | 当前 | 建议 |
|---|---|---|
| three-boundary-blueprint-elevation | Approved/Implemented | ✅ 标记 **Implemented** |
| oxn-deprecation | Approved | ✅ 标记 **Implemented**（ADR-0052 落地） |
| version-unification | Draft(executed) | ✅ 标记 **Implemented**，更新版本号 |
| v0.7.3-ideal-data-flow | Accepted/Active | ✅ 保留 |
| work-unified-model | Draft | ⚠️ 与 v0.7.3 对齐，标注哪些 Decision 已落地 |
| v0.6.3-asset-paper-schema | Partial/Superseded | ⚠️ 标注"4 字段 schema 已落地，library/external 部分 Superseded-by ADR-0056" |
| openxenon-architecture-from-adrs | Draft | 🔄 **重分类为 `type: synthesis`**（非决策性 RFC，是参考综合文档） |
| v0.7-domain-hierarchy | Draft | ✅ 保留 |
| v0.7-emergence | Approved | ✅ 保留 |
| v0.7.0-infra-ports | Draft | ✅ 保留 |
| v0.7.1-ai-three-modes | Draft | ✅ 保留 |
| v0.7.2-anchor-slot | Draft | ✅ 保留 |
| v0.8.0-term-upstream-dag | Draft | ⚠️ 更新 Langium→MD-native 语法引用 |

---

## 3. 6 层文档关系厘清

### 3.1 现状问题

```
① Asset Domains（.openxenon/assets/domains/）  — 业务词汇权威
② docs/ 产品手册                                  — 外部用户 SSOT
③ docs/zh-cn/dev/ 开发手册                        — 贡献者手册
④ .openxenon/docs/adrs/                           — append-only 架构决策
⑤ .openxenon/docs/rfcs/                           — 定稿设计
⑥ .openxenon/pools/                               — 流动探索
+ dev/README.md                                    — 开发者入口
```

**核心矛盾**：

1. **Asset Domain vs Doc 的 SSOT 冲突**：Domain 87 个 H3 Terms 是"词汇权威源"，但 Doc 概念页是用户看到的"概念权威源"。两者不同步（31 个术语缺口）。
2. **ADR/RFC 与 Domain 重复**：ADR 定义了概念，Domain 也该有对应 Term，但两处独立维护、无同步机制。
3. **docs/zh-cn/dev/ 与 dev/ 分裂**：dev 页面物理在 docs/ 下（走 VitePress），但也存在根 dev/README.md。
4. **pools→docs 提升路径断裂**：doc-promote 只管 pools→rfcs/adrs，概念页（iap-paradigm 等）直接在 docs/ 写，不走 promote。

### 3.2 知识单元在 6 层中的角色

| 知识单元 | ①Domain | ②docs/product | ③docs/dev | ④ADR | ⑤RFC | ⑥pools |
|---|---|---|---|---|---|---|
| **业务词汇**（Work, Probe） | **SSOT** | 引用 Domain | 引用 | 引用 | 引用 | — |
| **产品概念**（IAP 范式, 信任链） | 术语体 | **SSOT** | 脚注链接 | 来源 ADR | 来源 RFC | 草稿 |
| **架构决策**（Kernel 真空） | 不入 | 不入 | 引用 ADR | **SSOT** | 来源 | 草稿 |
| **设计方案**（v0.7 涌现） | 不入 | 不入 | 引用 RFC | 定稿后入 | **SSOT** | 草稿 |
| **探索/草稿** | — | — | — | — | — | **SSOT** |
| **操作指南**（如何 release） | 不入 | 不入 | **SSOT** | — | — | — |

### 3.3 引用方向

```
②product ←── ③dev ←── ④ADR ←── ⑤RFC ←── ⑥pools
    │            │          │
    └──── ①Domain（词汇共享层，被所有层引用但不引用任何层）
```

### 3.4 完整文档生命周期

```
探索期                    决策期                    沉淀期                   产品期
─────                  ──────                  ──────                  ──────
pools/drafts/    →   .openxenon/docs/rfcs/  →   .openxenon/docs/adrs/  →   docs/product/
  (流动)               (定稿，不改)              (append-only)            (用户 SSOT)

         ↘ 同时
          新增 Domain Term（词汇注册表）
          在 .openxenon/assets/domains/ 对应 Domain .md
```

**5 条关键约束**：

1. **Domain Term 是词汇注册表**：概念被命名即注册。Domain 不等 promote——它是注册表不是文档。
2. **ADR 是决策终结点**：ADR Adopted 后，核心概念**必须**同步到 Domain（注册 Term）+ Doc（更新概念页）。
3. **RFC 是 ADR 前置**：RFC 定稿后产生 ADR，不直接进 Doc。
4. **pools 探索不产生 Term**：只有 promote 到 RFC/ADR 后才入 Domain。
5. **Dev 页面不走 promote**：dev/ 是操作手册，直接维护。

### 3.5 事件驱动的同步规则

| 事件 | Domain 动作 | Doc 动作 | ADR 动作 |
|---|---|---|---|
| 新概念在 pools 诞生 | 无 | 无 | 无 |
| RFC 定稿 | **立即注册 Term** | 不动（等代码落地） | **产生 ADR** |
| ADR Adopted | 确认 Term 已存在（否则补） | **更新概念页** | 确认 |
| 代码落地 | 验证 Term→代码一致性 | 更新 API/路径引用 | 标注 runtime-status |
| 概念被 Superseded | Term 加 superseded-by 注 | 标注废弃 | 新 ADR 标记旧 ADR Superseded |

### 3.6 自举机制

OpenXenon 自身的文档也走 OXN 文档生命周期：

```
1. 工程师发现概念缺失 → pools/drafts/ 写草稿
2. 草稿成熟 → oxn work create doc-promote --blueprint doc-promote
3. IAP 闭环 → promote 到 .openxenon/docs/rfcs/
4. RFC 决策拍板 → 写 ADR（append-only）
5. ADR Adopted → 同步更新 Domain Term + docs/ 概念页
6. 版本发布 → .changes/ 新增 changelog 片段
```

**缺失环节**：第 5 步没有自动化。ADR Adopted 后 Domain Term 更新和 Doc 更新全靠手工，容易遗漏（31 个 Domain Terms 缺失的根因）。

**改进方向**：ADR 模板增加"Domain Term 同步检查"段 + CI 守卫检测断裂。

---

## 4. 执行计划

### Phase A：ADR/RFC 除噪

| # | 动作 | 预期 |
|---|---|---|
| A1 | ADR-0026 标记 Superseded | 减 1 个 Partial |
| A2 | ADR-0017 升级为 Adopted | 减 1 个 Partial |
| A3 | RFC `openxenon-architecture-from-adrs.md` 重分类为 `type: synthesis` | 非"待决策 RFC" |
| A4 | RFC `version-unification` 标记 Implemented + 更新版本号 | 反映现实 |
| A5 | RFC `three-boundary` + `oxn-deprecation` 标记 Implemented | 反映现实 |
| A6 | RFC `v0.6.3-asset-paper-schema` 标注"library/external 部分 Superseded-by ADR-0056" | 消除歧义 |
| A7 | RFC `v0.8.0-term-upstream-dag` 更新 Langium→MD-native 语法引用 | 消除过时引用 |
| A8 | ADR INDEX 修正计数的标题不一致 | 消除噪音 |
| A9 | ADR 0006/0007/0014/0016 新增 Philosophy 状态 | 精确分类 |

### Phase B：Domain 补全

31 个新 H3 Terms 加入 4 个 Domain 文件 + Glossary 扩展。

详见 `domain-doc-vocabulary-alignment.md` §6。

### Phase C：文档生命周期制度化

| # | 动作 | 说明 |
|---|---|---|
| C1 | 定义 ADR→Domain 同步规则 | 补入 ADR 模板"实施检查"段 |
| C2 | 定义 RFC→ADR 产生规则 | 补入 RFC 模板 |
| C3 | 扩展 doc-promote Blueprint | 增加"Domain Term 同步"slot |
| C4 | 写入 `.openxenon/docs/refs/doc-lifecycle.md` | 文档生命周期 SSOT |
| C5 | `check-doc-boundary.ts` 增强 | 检测 Domain→Doc 引用断裂 |

### Phase D：docs/ 结构对齐

| # | 动作 | 说明 |
|---|---|---|
| D1 | docs/en/ 与 docs/zh-cn/ 结构对齐 | en 还是旧扁平结构 |
| D2 | docs/zh-cn/dev/architecture.md 与 `openxenon-architecture-from-adrs.md` 对齐 | dev/architecture 缺信任链、数据流等内容 |
| D3 | 根 dev/README.md 与 docs/zh-cn/dev/ 关系厘清 | 避免两处维护 |

---

## 5. 关键问题待决策

| # | 问题 | 选项 |
|---|---|---|
| Q1 | `openxenon-architecture-from-adrs.md` 移出 rfcs/ 还是留在 rfcs/ 加 synthesis 标记？ | 移出/留+标记 |
| Q2 | ADR 新增 Philosophy 状态是否需要 INDEX.md 共识更新？ | 是/否（直接改） |
| Q3 | docs/zh-cn/dev/ 的主页是 VitePress 页面还是根 dev/README.md？ | VitePress/dev/ |
| Q4 | C3 doc-promote Blueprint 扩展是否在 v0.7 做还是 v0.6.x hotfix？ | v0.7/v0.6.x |
| Q5 | ADR→Domain Term 同步是 CI 守卫还是手动检查？ | CI/手动/混合 |
