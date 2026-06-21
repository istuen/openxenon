# Intent SSOT 边界权威定义

> **角色**：OpenXenon **Intent** 与 **外部文档** 的边界权威定义
>
> **读者**：所有 OpenXenon 协作者（AI + 人类）；创建/分类/迁移任何 .openxenon/ 文档前必读
>
> **版本**：v1.0（2026-06-20 锁定）
>
> **基础**：[`md-ssot-system.md` v3 §2](./md-ssot-system.md) 4 条边界规则
>
> **关键命题**：
> > **SSOT 不在于格式，而在于控制权。**
> > 只要 OpenXenon 控制了 Intent，就控制了信任的基石。

---

## What — Intent vs 文档

| 范畴 | 定义 | 控制方 | SSOT 归属 |
|---|---|---|---|
| **Intent** | OpenXenon 引擎需要被"锁定和证明"的内部资产 | **OpenXenon** | **OpenXenon SSOT**（唯一权威）|
| **外部文档** | 各项目自有 / OpenXenon 外部输入 | **项目 / 外部** | 各项目自有；不被 OpenXenon SSOT 接管 |

**5 类 Intent 资产**（v0.3 mdast 解析范围）：

| 资产 | 路径 | 角色 |
|---|---|---|
| Domain | `domains/<Name>.md`（PascalCase）| 业务规则（DDD 风格）|
| Blueprint | `blueprints/<name>.md`（kebab-case）| 技术模式 |
| Work | `works/<work>/work.md` | 编排主文件 |
| Task | `works/<work>/tasks/<task>.md` | 任务子文件 |
| Proof | `proofs/<proof>/verdict.md` | 验证产物（frozen）|

**外部文档范围**（v0.3 不解析）：

| 类型 | 路径 |
|---|---|
| 历史设计稿 | `forges/*.md`（51 篇 v0.1.x 时代）|
| 调研材料 | `pools/research/*.md` |
| 项目流程 | `pools/design/process-*.md`（项目级，非 OpenXenon 内部）|
| 问题追踪 | `pools/issue/*.md` |
| 历史 Sprint 复盘 | `pools/audit/retro-*.md`（v0.2.0 收尾）|
| 项目 issue tracker | `issues/` |

---

## Why — 为什么需要边界

### 1. SSOT 唯一性

如果 MD-SSOT 包括所有文档，外部项目文档的变更会污染 SSOT——**失去 SSOT 价值**。

```
❌ 错误：SSOT = "所有 OpenXenon 看得见的 .md 文件"
✅ 正确：SSOT = "OpenXenon 控制的 5 类 Intent 资产"
```

### 2. 责任分离

| 责任 | OpenXenon | 项目/外部 |
|---|---|---|
| Intent 资产维护 | ✅ | ❌ |
| 外部文档维护 | ❌ | ✅ |
| Intent 强结构校验 | ✅ | ❌ |
| 外部文档格式选择 | ❌ | ✅ |

### 3. 工具侵入性最小化

- **v2 思路**："OpenXenon 接管所有文档" → 工具侵入性过强
- **v3 思路**："OpenXenon 只死死咬住内部 5 类资产" → **外松内紧**

**结果**：外部项目用各自格式（README/ADR/Issue tracker/调研笔记），Intent 用 MD 统一。

---

## How — 4 条边界规则

### 规则 1 — 所有者（Ownership）

| 维度 | Intent | 外部 |
|---|---|---|
| 决策方 | OpenXenon 核心团队 | 项目所有者 / 外部 |
| 修改权限 | OpenXenon 控制（CI 校验）| 项目所有者全权 |
| 责任主体 | OpenXenon | 项目 |

**判定问句**：*"这个文档的决策由谁做出？"*

- OpenXenon 内部决策 → Intent
- 项目 / 外部决策 → 外部

### 规则 2 — 强结构（Strong Structure）

| 维度 | Intent | 外部 |
|---|---|---|
| heading 骨架 | 必填（CI 校验）| 可选 |
| 5 E_MD_xxx | 必填（5 类错误）| 不校验 |
| mdast 解析 | ✅ 进入 | ❌ 跳过 |
| 命名规范 | 强制（`naming-system.md`）| 建议 |

**判定问句**：*"这个文档需要被 OpenXenon 强校验吗？"*

- 是 → Intent
- 否 → 外部

### 规则 3 — 版本绑定（Version Binding）

| 维度 | Intent | 外部 |
|---|---|---|
| 版本号 | **强绑定** OpenXenon 版本（v<X.Y.Z>）| 不绑定或项目自有 |
| 升级触发 | OpenXenon 版本变更时同步 | 项目版本变更时按需 |
| CHANGELOG | 进入 `version-aggregate.ts` | 不进入 |

**判定问句**：*"这个文档的生命周期跟随 OpenXenon 版本吗？"*

- 是 → Intent
- 否 → 外部

### 规则 4 — 更新触发（Update Trigger）

| 维度 | Intent | 外部 |
|---|---|---|
| 同步机制 | 自动（OpenXenon 工具链）| 手动（项目所有者）|
| 引用方式 | Intent MD → 外部 URL/路径（桥接）| 反向不引用 Intent |
| 失效处理 | 内部引用 → Fatal；外部引用 → Warn | 不校验 |

**判定问句**：*"这个文档的更新由谁驱动？"*

- OpenXenon 工具链驱动 → Intent
- 项目/外部事件驱动 → 外部

---

## 典型判定案例（12 例）

### Intent 案例（7 例）

| 文档 | 判定 | 理由 |
|---|---|---|
| `domains/OrderContext.md` | Intent | OpenXenon 业务规则；版本绑定；强结构 |
| `blueprints/dev-workflow.md` | Intent | OpenXenon 技术模式；CI 校验 |
| `works/v0-3-md-ssot/work.md` | Intent | OpenXenon 编排主文件 |
| `works/v0-3-md-ssot/tasks/t1.md` | Intent | OpenXenon 任务子文件（v3 新增）|
| `proofs/v0-3-stage-1/verdict.md` | Intent | OpenXenon frozen 验证 |
| `pools/audit/audit-v0.2.0-md-ssot-readiness.md` | Intent | OpenXenon 版本收尾审计 |
| `pools/journal/2026-06-20-md-ssot-decision.md` | Intent | OpenXenon 内部决策日志 |

### 外部案例（5 例）

| 文档 | 判定 | 理由 |
|---|---|---|
| `forges/2026-06-13-intent-pool-design.md` | 外部 | v0.1.x 历史设计参考（v0.3 阶段 3 待迁）|
| `pools/research/2026-07-payment-gateway-research.md` | 外部 | 项目调研材料 |
| `pools/issue/2026-08-bug-oxc-1234.md` | 外部 | 项目 bug 跟踪 |
| `pools/design/process-forges-deprecation-migration.md` | Intent | OpenXenon 内部流程 |
| `pools/audit/retro-v0.2.0-roadmap-execution.md` | Intent | v0.2.0 复盘（绑版本）|

**注意**：`pools/` 5 池**不全是 Intent**——具体看文档内容判定。

---

## 判定流程（决策树）

```
新文档 / 待分类文档
    ↓
Q1: 是 OpenXenon 内部决策？
    ├─ 否 → 外部
    └─ 是 ↓
    Q2: 需要 OpenXenon 强结构校验？
        ├─ 否 → 外部
        └─ 是 ↓
        Q3: 生命周期跟随 OpenXenon 版本？
            ├─ 否 → 外部
            └─ 是 ↓
            Q4: 更新由 OpenXenon 工具链驱动？
                ├─ 否 → 外部
                └─ 是 → Intent
```

**保守原则**：任何一题答案不确定 → 默认外部（**避免误分类导致 SSOT 污染**）

---

## 边界冲突与解决

### 冲突 1：forges/ 内部文档

| 维度 | 现状 |
|---|---|
| 物理目录 | 外部（gitignored）|
| 部分内容 | OpenXenon 内部决策 |

**解决**：

- forges/ 整体视为外部源
- 判定为 Intent 的子集 → v0.3 阶段 3（W6-7）批量迁移至 `pools/{design/arch, journal}/`
- 迁移后**立即**进入 mdast 解析范围
- 迁移前**永久不触发** E_MD_xxx 校验

详见 [`md-ssot-system.md` v3 §11.5](./md-ssot-system.md)

### 冲突 2：pools/ 内部混合

| 池 | 主要判定 | 备注 |
|---|---|---|
| `pools/research/` | **外部** | 调研材料本身是外部输入 |
| `pools/design/` | **混合** | arch-* = Intent；process-* = 外部 |
| `pools/issue/` | **外部** | 项目 bug 跟踪 |
| `pools/audit/` | **Intent** | 版本收尾审计绑版本 |
| `pools/journal/` | **Intent** | 内部决策日志 |

**解决**：每篇单独判定（参考 §典型判定案例）

### 冲突 3：双轨期 .oxn ↔ .md

| 维度 | 规则 |
|---|---|
| 真值来源 | **`.md` = 唯一写入入口** |
| .oxn 来源 | 由 `.md` 自动编译生成 |
| 反向修改 | ❌ **禁止** |
| hash mismatch | `E_MD_HASH_MISMATCH` 强制阻断 |

详见 [`md-ssot-system.md` v3 §11.2](./md-ssot-system.md)

---

## 5 E_MD_xxx 严重级别（Intent 专用）

| 错误码 | 严重级别 | 适用 | 行为 |
|---|---|---|---|
| `E_MD_INVALID_SYNTAX` | Fatal | Intent | 阻断 Proof（exit 1）|
| `E_MD_MISSING_REQUIRED` | Fatal | Intent | 阻断 Proof |
| `E_MD_TYPE_MISMATCH` | Fatal | Intent | 阻断 Proof |
| `E_MD_REFERENCE_BROKEN_FATAL` | Fatal | Intent → 内部 Intent | 阻断 Proof |
| `E_MD_REFERENCE_BROKEN_WARN` | Warn | Intent → 外部 URL/路径 | 警告不阻断（exit 0）|
| `E_MD_HASH_MISMATCH` | Fatal | Intent frozen | 强制阻断（双轨期）|

**外部文档不触发任何 E_MD_xxx**。

详见 [`md-ssot-system.md` v3 §11.3](./md-ssot-system.md)

---

## Intent MD 模板

```markdown
---
entity: <domain|blueprint|work|task|proof>   # 必填
version: 0.3.0                                # 强绑定 OpenXenon 版本
status: active|archived|draft                 # 状态
intent: true                                  # 标记 Intent SSOT（默认 true）
---

# <Title>

> **角色**：...
> **读者**：...
> **版本**：v<X.Y.Z>
> **关联**：[`<other-intent>.md`](./<other-intent>.md) | [外部参考](https://...)

---

## What — ...

## Why — ...

## How — ...

:::intent{#invariant-1 type="invariant" scope="domain"}
- 不变量 1
- 不变量 2
:::
```

**关键字段**：

- `entity`：5 类 Intent 之一
- `version`：强绑定 OpenXenon 版本
- `intent: true`：CI 校验开关（外部文档设为 false 或省略）

---

## 外部文档模板

```markdown
# <Title>

> **角色**：...
> **读者**：...
> **状态**：@draft|@wip|@done
> **关联**：[OpenXenon Intent](../../domains/<Name>.md)（可选外链）

---

## 背景

...

## 内容

...
```

**特点**：

- 无 frontmatter `entity` 字段
- 无 `version` 强绑定
- 无 `:::intent` 容器指令
- 无 mdast 解析
- 无 E_MD_xxx 校验

---

## 桥接——Intent MD 引用外部

Intent MD 可通过 URL 或相对路径引用外部文档：

### 绝对 URL 引用

```markdown
详细业务背景参见 [业务需求文档](https://project.com/spec/order.md)。
```

**风险**：URL 可能失效（项目搬迁、文档删除）

**缓解**：`E_MD_REFERENCE_BROKEN_WARN` 警告不阻断

### 相对路径引用

```markdown
参见 [`pools/research/2026-07-payment-gateway.md`](../../pools/research/2026-07-payment-gateway.md)
```

**风险**：路径可能移动

**缓解**：
- 相对路径变化 → `E_MD_REFERENCE_BROKEN_WARN`（外部）
- 相对路径指向内部 Intent → `E_MD_REFERENCE_BROKEN_FATAL`（阻断）

### 引用判定规则

```typescript
if (targetPath.startsWith('.openxenon/')) {
  // 内部 Intent 引用
  return { severity: 'Fatal' }
} else {
  // 外部文档引用
  return { severity: 'Warn' }
}
```

---

## 实施检查清单

### v0.3 阶段 0（已完成）

- [x] 写 [`md-ssot-system.md` v3](./md-ssot-system.md)（核心架构 + 4 边界规则）
- [x] 写 [`v0.3.0-roadmap.md` v3](./v0.3.0-roadmap.md)（简化路线图 5 阶段 ~10 周）
- [x] 写本文档 [`intent-ssot-boundary.md`](./intent-ssot-boundary.md)（边界权威定义）

### v0.3 阶段 1（W1-3）

- [ ] mdast 解析器（仅 Intent 5 类）
- [ ] 5 E_MD_xxx 实现（含 Fatal/Warn 二级）
- [ ] contentHash 缓存层

### v0.3 阶段 3（W6-7）

- [ ] 51 forges/ 文档判定（Intent vs 外部）
- [ ] Intent 子集迁移至 `pools/{design/arch, journal}/`
- [ ] 迁移后进入 mdast 解析范围

### v0.3 阶段 4（W8-10）

- [ ] `scripts/parse-mdast.ts`（仅 Intent 5 类）
- [ ] `scripts/check-naming.ts`（全部）
- [ ] `scripts/version-aggregate.ts`（仅 Intent）

---

## 关键不变量（10 条）

1. **Intent = OpenXenon SSOT**（5 类资产唯一权威）
2. **外部文档保持原状**（forges/ + pools/{research,issue,design/process-*}）
3. **mdast 仅解析 Intent 5 类**（含 task.md）
4. **5 E_MD_xxx 仅 Intent**（Fatal/Warn 二级）
5. **`.md` = 唯一写入入口**（双轨期禁止反向修改 .oxn）
6. **forges/ 永久保留**（废除物理删除）
7. **proofs/ frozen**（chmod 0o444 + contentHash）
8. **AI + 人类双消费**（MD 是共同语言）
9. **contentHash 缓存**（Task 解析性能）
10. **保守原则**（判定不确定 → 默认外部）

---

## 参考

- [`md-ssot-system.md` v3](./md-ssot-system.md) — 核心架构 + 4 边界规则
- [`v0.3.0-roadmap.md` v3](./v0.3.0-roadmap.md) — 简化路线图
- [`naming-system.md` v1.0](./naming-system.md) — 命名规范
- [`process-forges-deprecation-migration.md`](./process-forges-deprecation-migration.md) — forges/ 分类迁移
- [`l0-l3-alignment.md`](./l0-l3-alignment.md) — L0–L3 兼容性
- [`pool-roadmap.md`](../pool-roadmap.md) — Pool 导航
- [`2026-06-20-md-ssot-decision.md`](../journal/2026-06-20-md-ssot-decision.md) — 决策日志

---

**关键命题**：
> **SSOT 不在于格式，而在于控制权。**
> **只要 OpenXenon 控制了 Intent，就控制了信任的基石。**
