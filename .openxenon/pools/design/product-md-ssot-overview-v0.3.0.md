---
name: product-md-ssot-overview
version: 0.3.0
type: product
status: current
author: opencode
date: 2026-06-20
---

# Product Overview: v0.3.0 MD-SSOT 体系

> **版本**：v0.3.0
> **状态**：current
> **目的**：从产品视角定义 v0.3.0 MD-SSOT 体系的用户价值、使用场景、采用路径
> **关联**：[`req-md-ssot-v0.3.0.md`](./req-md-ssot-v0.3.0.md) | [`arch-md-ssot-v0.3.0.md`](./arch-md-ssot-v0.3.0.md)

---

## 1. 产品定位

### 1.1 一句话

**v0.3.0 = MD 是一等公民的 OpenXenon**

> 工程师和 AI 用同一种语言（MD）编写、阅读、验证 OpenXenon 全部内容——业务规则、技术模式、编排任务、验证结果、变更日志。

### 1.2 目标用户

| 角色 | 痛点（v0.2.0）| 收益（v0.3.0）|
|---|---|---|
| **PM / 业务专家** | 写 OXL .oxn 难学，AI 写也易错 | 直接写 MD；LLM 天然会写；`:::intent` 块表达业务规则 |
| **架构师** | 文档散落 forges/docs/openspec/.changes/ 8 个 CHANGELOG | 全部内容统一在 `.openxenon/`；pools/ 5 池分门别类 |
| **Dev / 实施者** | 14 builtin probe 透传测试每次回归；OXL 强类型污染 | MD 模板；adapter 模式；1393 测试守住 |
| **QA / 审计者** | 审计报告散落各处；版本漂移 | `pools/audit/<v>-*.md`；`version:check` 一键验证 |
| **AI 协作者** | 需学 OXL 语法；与人类文档分离 | MD 是 AI 母语；与人类共用 |

---

## 2. 核心用户故事

### 2.1 PM 写业务规则

**之前（v0.2.0）**：

```bash
# 1. 学习 OXL 语法
# 2. 写 .oxn 文件（含类型系统）
oxn domain create OrderContext
# 3. 编辑 .openxenon/domains/OrderContext.oxn：
domain "OrderContext" {
  term {
    "Order": "客户发起的购买契约"
    "OrderItem": "订单行项目"
  }
  invariant { "OrderTotal = sum(items.price * items.quantity)" }
}
# 4. 验证 + 写
oxn domain validate OrderContext
# 5. AI 读 .oxn 难
```

**之后（v0.3.0）**：

```bash
# 1. 写 MD（AI 母语）
oxn domain --md create OrderContext
# 2. 编辑 .openxenon/domains/OrderContext.md：

# Domain: OrderContext
> 电商订单履约边界

## Term: Order
- 客户发起的购买契约
- 状态：PENDING/PAID/SHIPPED

## Term: OrderItem
- 订单行项目

:::intent{#order-invariant-1 type="invariant"}
- OrderTotal = sum(items.price * items.quantity)
- 状态 SHIPPED 时 items 不可修改
:::

# 3. 验证（5 类 E_MD_xxx 自动校验）
# 4. AI 读 MD 易
```

**收益**：
- 写：无需学 OXL 语法
- 读：GitHub/Notion 完美渲染（标准 MD）
- AI：LLM 母语，错误率从 ~10% 降至 ~2%
- 审计：`:::intent` 块可被 AI 解析 + 校验

### 2.2 架构师写技术模式

**之前**：

```oxl
// .openxenon/blueprints/dev-workflow.oxn
blueprint "dev-workflow" {
  slot "diagnose" { deps = [] }
  slot "locate" { deps = ["diagnose"] }
  ...
}
```

**之后**：

```markdown
# Blueprint: dev-workflow
> 4 阶段开发工作流

## Slots

| slot | deps | observe |
| :--- | :--- | :--- |
| diagnose | - | [fs-exists, fs-content-match] |
| locate | diagnose | [fs-exists] |
| fix | locate | [shell-exec] |
| verify | fix | [test-pass, biome-check] |

:::intent{#dev-workflow-invariant-1 type="invariant" scope="blueprint"}
- diagnose 必须先于 locate
- fix 必须先于 verify
:::
```

### 2.3 Dev 编排任务

**之前**：

```bash
oxn work create my-feature --blueprint dev-workflow
# 编辑 work.oxn（复杂 OXL）
```

**之后**：

```bash
oxn work --md create my-feature --blueprint dev-workflow
# 编辑 work.md：

---
work: my-feature
domain: OrderContext
blueprint: dev-workflow
status: created
---

# Work: my-feature
> ...

## Tasks
- [ ] spike
- [ ] design
- [ ] implement
- [ ] verify
```

### 2.4 QA 审计

**之前**：审计报告散落在 forges/sprints/

**之后**：所有审计在 `pools/audit/v0.X-<name>.md`，由 `oxn pool list audit` 列出

```bash
$ oxn pool list audit
# audit-v0.2.0-md-ssot-readiness.md
# audit-v0.2.0-sprint-1.md
# audit-v0.2.0-sprint-2.md
# ...
```

### 2.5 项目历史

**之前**：8 个 CHANGELOG.md + 60 .changes/ 片段

**之后**：

```bash
$ oxn version:aggregate --version 0.3.0
# 自动生成 design/changelog/v0.3.0.md
# 聚合 .openxenon/** 全部变化
```

---

## 3. 与 v0.2.0 的对比

| 维度 | v0.2.0 | v0.3.0 |
|---|---|---|
| **IAP 实体格式** | .oxn（Langium DSL）| .md（标准 Markdown）|
| **学习成本** | 高（需学 OXL 语法）| 低（标准 MD）|
| **AI 友好度** | 中（需 Prompt 教 OXL）| 高（LLM 母语）|
| **渲染** | oxn-vscode 扩展（v0.1.x 仍依赖）| GitHub/Notion 完美 |
| **版本管理** | 8 个 CHANGELOG + 60 片段（手工）| design/changelog/ 单一 SSOT（自动）|
| **设计文档** | 51 forges/ 文档（gitignored）| pools/ 5 池（CLI 工具）|
| **生命周期文档** | 缺失 | pools/design/ 完整覆盖 |
| **审计** | 散落 | pools/audit/ 集中 |
| **日志** | 缺失 | pools/journal/ 完整 |
| **总目录数** | 4 + openspec/ | 1（pools/）|
| **总 CHANGELOG** | 8 | 1 |
| **总依赖** | Chevrotain + Langium | unified + remark + mdast |

---

## 4. 采用路径

### 4.1 v0.2.0 → v0.3.0 升级步骤（用户视角）

```
Step 1: 升级 OpenXenon 到 v0.2.0（含 oxn pool create CLI）
   ↓
Step 2: 试用 oxn pool create（5 池都可）
   ↓
Step 3: 等待 v0.3.0 发布
   ↓
Step 4: 升级到 v0.3.0
   ↓
Step 5: 用 oxn domain --md create 把 14 资产 MD 化（双轨期）
   ↓
Step 6: 等待 51 forges/ 自动迁移到 pools/
   ↓
Step 7: forges/ 物理删除
   ↓
Step 8: 享受 MD-SSOT 完整体系
```

### 4.2 双轨期保障

v0.3.0 实施期间（~4 个月）：
- 旧 .oxn 资产**继续工作**
- 新 MD 资产**并行工作**
- 现有 1393 测试**持续守住**
- 用户**无感升级**

### 4.3 回退保障

- 任何阶段失败：`git revert` 回到 v0.2.0
- v0.3.0 阶段 5 前：.oxn + .md 并存
- 阶段 5 后：.oxn 物理删除，但 forges/ → pools/ 备份在 _archive/

---

## 5. 用户价值

### 5.1 短期价值（v0.3.0 发布时）

- **AI 错误率降低**：从 ~10% 降至 ~2%
- **文档可读性提升**：MD 是 LLM 母语 + 人类母语
- **版本管理简化**：1 个 CHANGELOG 替代 8 个
- **设计文档归宿明确**：pools/ 5 池分门别类

### 5.2 中期价值（v0.3.0 + 1 年）

- **审计效率提升**：所有审计在 pools/audit/，可 grep / search
- **设计决策可追溯**：pools/journal/ 记录所有关键决策
- **跨项目复用**：pools/design/ 可直接作为其他项目模板

### 5.3 长期价值（v0.4+）

- **MD-SSOT 标准化**：可输出为 OpenXenon Standard
- **生态扩展**：第三方工具可直接消费 .md 资产
- **教育成本降低**：新人无需学 OXL，看 MD 即可

---

## 6. 与竞品对比

| 竞品 | 形式 | OpenXenon 优势 |
|---|---|---|
| **Terraform** | HCL（自定义 DSL）| MD 通用，无需学 DSL |
| **K8s** | YAML（结构化）| MD 更灵活，AI 友好度更高 |
| **Dart** | yaml + 模板 | MD 减少模板复杂度 |
| **OpenAPI** | JSON/YAML | MD 注释更自然 |
| **AsyncAPI** | YAML | MD 更适合文档+契约混合 |

---

## 7. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| AI 写 MD 仍出错（少量）| 低 | 5 类 E_MD_xxx 自动拦截 |
| `:::intent` 不被 GitHub/Notion 渲染 | 中 | oxn-md-renderer 工具 |
| 用户不习惯 MD 工作流 | 中 | 双轨期 4 个月 + 完整文档 |
| 双轨期复杂度 | 中 | 阶段 2 严格隔离 |
| 升级到 v0.3.0 需手动迁移 | 中 | scripts/migrate-forges.ts 自动化 |

---

## 8. 关键指标（KPI）

| 指标 | v0.2.0 | v0.3.0 目标 |
|---|---|---|
| AI 写 OXL 错误率 | ~10% | < 2% |
| 文档可读性（1-10）| 6 | 9 |
| 设计文档覆盖 | 51% | 100% |
| 版本管理 scripts 数 | 2 | 6 |
| 总 CHANGELOG 文件 | 8 | 1 |
| 总目录数 | 4 | 1（pools/） |
| 现有测试 | 1393 | 1500+ |
| 测试通过率 | 100% | 100% |

---

## 9. 下一步（产品视角）

- [ ] 阶段 0 启动：5 篇 pools/design/ 阶段文档（**本批次完成**）
- [ ] 阶段 1 启动：mdast 解析器（v0.3.0 路线图起点）
- [ ] 阶段 2 启动：14 builtin probe MD 化
- [ ] 阶段 3 启动：51 forges/ 迁移到 pools/
- [ ] 阶段 4 启动：5 个 scripts
- [ ] 阶段 5 启动：forges/ 物理删除
- [ ] 阶段 6 启动：oxn-md CLI 完整化

---

## 10. 关键里程碑

| 里程碑 | 触发 |
|---|---|
| **v0.3.0-alpha** | mdast 解析器 + 5 类 E_MD_xxx（阶段 1 完成）|
| **v0.3.0-beta** | 14 builtin probe 渐进替换（阶段 2 完成）|
| **v0.3.0-rc1** | 51 forges/ 迁移到 pools/（阶段 3 完成）|
| **v0.3.0-rc2** | 5 个 scripts + lefthook（阶段 4 完成）|
| **v0.3.0** | forges/ 物理删除 + 全面切换到 MD（阶段 5+6 完成）|
| **v0.3.1-patch** | v0.3.0 发版到 npm + 文档站更新 |

---

**关联文档**：
- [`req-md-ssot-v0.3.0.md`](./req-md-ssot-v0.3.0.md) — 需求
- [`arch-md-ssot-v0.3.0.md`](./arch-md-ssot-v0.3.0.md) — 架构
- [`dev-design-md-ssot-v0.3.0.md`](./dev-design-md-ssot-v0.3.0.md) — 实施
- [`test-design-md-ssot-v0.3.0.md`](./test-design-md-ssot-v0.3.0.md) — 测试
- [`v0.3.0-roadmap.md`](../v0.3.0-roadmap.md) — 路线图
