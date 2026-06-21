# OXL 语法与 DDD 术语解耦 —— 路线 B 候选设计稿 [DEPRECATED 2026-06-18]

> **状态**：**DEPRECATED 2026-06-18** ——路线 C 全栈重写（unified 替代 Langium）已被采纳为终局方向，本设计稿（路线 B）已被取代。保留为历史参考，不作为实施依据。
> **替代设计**：[`2026-06-18-md-as-canonical-rewrite-design.md`](./2026-06-18-md-as-canonical-rewrite-design.md)（路线 C 远期愿景）
>
> ---
>
> **历史信息（保留）**：
>
> - **日期**：2026-06-18
> - **状态**：路线 B 候选（v0.3 mid-term 演进目标；spike 阶段不动）
> - **前置（必读）**：
>   - [`2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md`](./2026-06-17-domain-as-ssot-doc-binding-skill-reorg.md) — Domain 作为 SSOT + 文档绑定 + Skills 重构
>   - [`2026-06-18-md-as-friendly-view-spike-design.md`](./2026-06-18-md-as-friendly-view-spike-design.md) — spike/md-as-canonical 设计（路线 A）[DEPRECATED]
> - **本稿价值**：在路线 A（spike 零回归）确立的"MD 作为 OXL 友好入口"基础上，**新增"OXL 语法与 DDD 术语完全解耦"维度**——三份设计互补，构成 OpenXenon 业务建模的完整三角。

---

## 0. 元信息

- **作者**：opencode（基于 `docs_tmp/domain-md-2.md` 10 轮 AI 讨论 + 用户决策 + 源码事实核对）
- **目标读者**：架构师 + OXN 维护者
- **本稿与前置两稿的边界**：
  - 2026-06-17 解决"**Domain 如何关联外部文档**"（`docs = [STRING...]` 字段）
  - 2026-06-18 spike 解决"**Domain 自身如何被 MD 写作**"（`.md` → `.oxn` 预处理器，零 grammar 修改）
  - **本稿解决"OXL 语法如何彻底解耦 DDD 术语"**（骨肉分离 + 统一寻址模型 + 战略 DAG）
- **关键决策（已与用户确认）**：
  - 路线承诺：spike 阶段**纯路线 A**（零 grammar 修改）
  - 4 精华点**全纳入**（@upstream / @term/X 寻址 / invariant 自然语言 / 骨肉分离）
  - **建独立 forges/ 文档**（与 2026-06-18 spike 并列，不合并）
  - 4 精华点中 2 个（invariant 自然语言、骨肉分离）已与现有 OXL 对齐；2 个（@upstream、@term/X）属路线 B 未来引入
- **影响路径**：
  - 路线 A 阶段：零影响（`src/oxl/langium/oxn.langium` 不动）
  - 路线 B 阶段：`src/oxl/langium/oxn.langium` 增量改动 + 14 现有资产 migration 工具 + builtin probe 兼容层

---

## 1. What：命题与 10 轮 Q&A 演进

### 1.1 命题

> OXL 现有 grammar 的 `DomainDeclaration` 包含 `term` / `ban` / `invariant` 三大块，但**没有显式的 DDD 战略层（如 aggregate / entity / vo 区分）**，且 `term` 仅是平铺名值对列表。**是否应该让 OXL 的语法彻底摆脱 DDD 战术术语的束缚，用通用拓扑结构承载任意业务模型？**

### 1.2 10 轮 AI 讨论要点（`docs_tmp/domain-md-2.md`）

| 轮次 | 议题 | 结论 |
|---|---|---|
| 1 | Langium 能否兼容 MD / TOML / YAML / JSON / XML 哪种适合 DDD | 倾向 **YAML 风格内嵌**（免类型、纯语义、Key-Value 排版） |
| 2 | 方案 1（花括号 + properties 子块）vs 2（YAML 嵌套） | 强烈推荐 1——LLM 写 YAML 缩进易错，花括号最稳 |
| 3 | properties 平铺 vs entities 物理嵌套 | 方案 1 优——避免"嵌套 5 层"右倾灾难 |
| 4 | Kernel 怎么逻辑判断 invariant? | **用户纠正**：Kernel 不执行业务逻辑，只做物理产物真实性判守 |
| 5 | Kernel 不关心语言类型，只调度 Probe | **再次纠正**：invariant 右值不是代码，是给 AI 的自然语言 |
| 6 | 方案 2 名值对风格 vs 方案 1 显式块 | 选 2——更契合 Probe 哲学（Key-Value 易于挂载 Probe） |
| 7 | TOML `[]` vs `@` 注解 | 选 `@`——Work/Task 已有 `@oxn` `@prj` `@gbl` 寻址 |
| 8 | `@upstream` vs `@proof` vs `@invariant`；aggregate 是否引入 | **去掉 aggregate 关键词**——term 是唯一结构基元；DDD 术语降维到 `desc:` 自然语言 |
| 9 | `assert totalAmount == sum(...)` 逻辑表达式错；`->` 伪指针错 | invariant 右值是自然语言；`->` 砍掉用 `@term/OrderItem` 字符串 |
| 10 | `@term/OrderItem` 寻址妙处；`@upstream` 战略 DAG；保留 invariant | 全部接受——形成终极语法图景 |
| 11 | 完整总结 | 给出"OXL 终极语法"作为讨论收尾 |

### 1.3 4 个精华点（用户决策全纳入）

| # | 精华点 | 一句话 |
|---|---|---|
| 1 | **@upstream 战略 DAG** | Domain 级别显式声明上游依赖，OpenXenon 内核做单向流（DAG）守护 |
| 2 | **@term/X 域内寻址** | term 之间用 `@term/Name` 字符串建立树形依赖；Langium 走 Cross-Reference 解析 |
| 3 | **invariant 右值是自然语言** | 拒绝逻辑表达式（`assert totalAmount == sum(...)`），右值是人类业务话术，AI 推理 + Probe 匹配 |
| 4 | **骨肉分离** | OXL 语法不引入 DDD 战术术语（aggregate/entity/vo），它们降维到 `desc:` 自然语言 |

---

## 2. Why：源码事实核对

下文所有 `file:line` 均经本地仓库核对。

### 2.1 现有 OXL grammar 的 5 个关键事实

| 文件位置 | 现状 |
|---|---|
| `src/oxl/langium/oxn.langium:173-179` | `DomainDeclaration` 块结构：`descriptions/terms/ban/invariants` |
| `src/oxl/langium/oxn.langium:181-187` | `term { "X": "Y"; }` 扁平名值对列表；无 `aggregate/entity/vo` 关键字 |
| `src/oxl/langium/oxn.langium:189-192` | `BanBlock: 'ban' '{' (bans+=STRING)* '}'` —— 块是 STRING 数组 |
| `src/oxl/langium/oxn.langium:194-207` | `InvariantDecl: value=STRING \| script=STRING \| manual=STRING \| scope=STRING` —— **右值是 STRING** |
| `.openxenon/domains/*.oxn` | 14 个现有资产全部按扁平 term 列表写，无任何 `@tag` 或 `aggregate` 关键字 |

**关键发现**：
- **骨肉分离**（精华点 4）—— 现有 OXL grammar **已经实现**：无 `aggregate` / `entity` / `vo` 关键字。DDD 角色由 AI 通过 STRING desc 内容理解。
- **invariant 自然语言右值**（精华点 3）—— 现有 `InvariantDecl` 全部 STRING（`value=STRING`、`script=STRING`、`manual=STRING`）。**已对齐**。
- **@upstream 战略 DAG**（精华点 1）—— 现有 grammar **完全没有**。`DomainDeclaration` 字段只有 `name/descriptions/terms/ban/invariants`（`oxn.langium:173-179`）。**需新引入**。
- **@term/X 域内寻址**（精华点 2）—— 现有 term 之间**没有显式寻址**。`term { "Order.id": "..." }` 用 dot-path 表达嵌套（spike 形态 A），但无 `@term/` 字符串 cross-ref。**需新引入**。

### 2.2 4 精华点的当前 OXL 状态

| 精华点 | 当前 OXL 是否实现 | 路线 A 是否实现 | 路线 B 引入时机 |
|---|---|---|---|
| **骨肉分离** | ✅ 已实现（无 aggregate 关键字） | ✅ 保持 | 不需新引入 |
| **invariant 自然语言右值** | ✅ 已实现（STRING 右值） | ✅ 保持 | 不需新引入 |
| **@term/X 域内寻址** | ❌ 未实现 | 走 dot-path 替代 | v0.3 mid-term |
| **@upstream 战略 DAG** | ❌ 未实现 | 不实现 | v0.3 mid-term |

**结论**：4 精华点中 **2 个已对齐、2 个待 v0.3 mid-term 引入**。这意味着路线 A（spike 阶段）只需"保持现状 + 文档化声明"，路线 B 才是真正的演进目标。

### 2.3 builtin probe 透传测试现状

- `src/builtin/probes/` 14 个 probe 全部走 IO 路径（fs/http/shell/git）
- 没有任何 probe 消费 `domain.invariant` 求值（`src/oxl/validators/` 多个文件读 invariant 但仅做静态校验）
- 路线 B 引入 `@upstream` 后，probe 仍无需修改（probe 不感知 DAG 拓扑）

**结论**：路线 B 的 probe 兼容层**几乎为零成本**——probe 与 DAG 正交。

---

## 3. 4 精华点的纳入映射

### 3.1 4×4 映射表

| 精华点 | 当前 OXL 状态 | 路线 A（spike）处理 | 路线 B（v0.3 mid）处理 |
|---|---|---|---|
| **@upstream 战略 DAG** | ❌ 不存在 | 文档化声明"未来支持" | 新增 `@upstream: STRING` 关键字 + `UpstreamDecl` AST 节点 + 写 `oxn domain validate --dag` 工具 |
| **@term/X 域内寻址** | ❌ 不存在 | 文档化声明"未来支持"（路线 A 走 dot-path 替代） | 新增 `FieldValue: STRING` 支持以 `@term/` 开头的 cross-ref；与 dot-path 并存，可迁移 |
| **invariant 自然语言右值** | ✅ 已对齐（`InvariantDecl` 全部 STRING） | 文档化声明"已对齐" | 不需改动 |
| **骨肉分离** | ✅ 已对齐（grammar 无 aggregate 关键词） | 文档化声明"已对齐"（路线 A 的 `@aggregate` prefix 是 STRING 子串而非 grammar 关键字） | 不需改动 |

### 3.2 路线 A 阶段的 4 精华点状态

```
✅ 骨肉分离               ─── 已对齐，无需改动
✅ invariant 自然语言右值  ─── 已对齐，无需改动
⏳ @term/X 域内寻址       ─── 路线 A 用 dot-path 替代；路线 B 再升级到 @term/
⏳ @upstream 战略 DAG     ─── 路线 A 暂不实现；v0.3 mid-term
```

### 3.3 路线 B 阶段的 4 精华点引入顺序

| 顺序 | 精华点 | 引入 PR | 风险 |
|---|---|---|---|
| 1 | @upstream 战略 DAG | `feat/v0.3-b1-upstream-dag` | 中（破坏性：Domain 块加新关键字） |
| 2 | @term/X 域内寻址 | `feat/v0.3-b2-term-addressing` | 低（增量：FieldValue 新增 cross-ref 类型） |
| 3 | 14 资产 migration 工具 | `feat/v0.3-b3-domain-migrate` | 中（14 资产逐个迁移） |
| 4 | builtin probe 兼容层 | `feat/v0.3-b4-probe-compat` | 低（probe 与 DAG 正交） |

---

## 4. 与路线 A（2026-06-18 spike）的边界

### 4.1 路线 A vs 路线 B 概览

| 维度 | 路线 A（spike） | 路线 B（v0.3 mid） |
|---|---|---|
| **目标** | MD 作为 OXL 友好入口 | OXL 语法与 DDD 术语彻底解耦 |
| **OXL grammar 改动** | 零改动（D4 红线） | 重大增量（新增 @upstream + @term/） |
| **14 现有资产** | 零迁移 | 需 migration 工具 |
| **builtin probe** | 零修改 | 兼容层（probe 与 DAG 正交，零成本） |
| **v0.2 兼容性** | 完全保持 | 不可保持（跨 v0.2 收尾期） |
| **触发条件** | spike commit 1 启动 | v0.2 全部 done 任务冻结 + 路线 A graduate |

### 4.2 不冲突的 4 个支撑点

1. **路线 A 的 term 块是"spike 友好形式"**——只要 OXL grammar 不动，路线 A 即可上线；路线 B 后续可以**渐进叠加** `@upstream` 与 `@term/` 字段
2. **dot-path（路线 A）与 @term/X（路线 B）可并存**——dot-path 走 STRING 内部字符，`@term/X` 走 FieldValue 语法层面；互不干扰
3. **invariant 自然语言右值**是两条路线**共同的前提**——路线 A 和 B 都遵循"右值 = 人类业务话术"
4. **骨肉分离**是两条路线**共同的原则**——路线 A 的 `@aggregate` prefix 在 STRING 内（不污染 grammar），路线 B 完全去掉 DDD 关键词（彻底净化）

### 4.3 graduate 路径对照

| 阶段 | 路线 A graduate | 路线 B graduate |
|---|---|---|
| **产出** | spike → `src/oxl/md-bridge/` + `src/cli/oxl/md-loader.ts` | 4 个 feat/* 分支 → `src/oxl/langium/oxn.langium` 增量 + 14 资产 migration 工具 + oxn-vscode 插件同步升级 |
| **触发** | D1–D5 全绿 | 路线 A graduate + v0.2 冻结 |
| **持续** | v0.3 早期 | v0.3 mid-term |

---

## 5. 终极语法图景（路线 B 目标态）

### 5.1 完整示例

```oxl
// ==========================================
// 1. 战略层：@upstream 声明单向流依赖（DAG）
// ==========================================
domain OrderContext {
  // 兼容 2026-06-17: docs 字段
  docs = ["docs/zh-cn/intent.md#intent"]

  // 路线 B 引入: @upstream 显式声明上游依赖
  @upstream: "@prj/domains/InventoryContext"

  // ==========================================
  // 2. 战术层：term 树形拓扑
  // ==========================================
  term Order {
    // 骨肉分离: DDD 角色写在 desc 自然语言里
    desc: "客户发起的购买契约 (DDD 聚合根)"

    // YAML 风格平铺名值对，零技术类型
    properties:
      id: "订单唯一标识"
      status: "订单状态，包含 PENDING、PAID、SHIPPED"

      // 路线 B 引入: 域内寻址 @term/OrderItem
      items: "@term/OrderItem"

      // 路线 B 引入: 跨边界寻址 @prj/domains/.../term/X
      skuId: "@prj/domains/InventoryContext/term/Product"

      // 现有: 值对象寻址
      shippingAddress: "@term/Address"

    // 现有: invariant 右值是自然语言（已对齐）
    invariant:
      "total_amount_rule": "反作弊总价约束：订单最终支付的总金额必须等于各个商品单价乘以数量之和"
      "status_shipped_ban": "状态禁令：当订单状态处于已发货（SHIPPED）时，物理上严禁发生任何修改订单行项目的行为"
  }

  term OrderItem {
    desc: "订单行项目 (DDD 内部实体)"
    properties:
      itemId: "项目ID"
      price: "商品单价"
      quantity: "商品数量"
  }

  term Address {
    desc: "收货地址信息 (DDD 值对象)"
    properties:
      city: "城市名"
      detail: "详细街道地址"
  }
}
```

### 5.2 关键设计原则

| 原则 | 体现 |
|---|---|
| **骨肉分离** | term 内部不出现 `aggregate` `entity` `vo` 关键字；DDD 角色仅在 `desc:` 自然语言 |
| **统一寻址** | `@` 符号全库统一：@oxn/@prj/@gbl（Work/Task 物理空间）+ @upstream/@term/Name（Domain 逻辑空间） |
| **自然语言 invariant** | 右值不是 `assert X == Y` 表达式，是业务话术；AI 推理 + Probe 匹配特征 |
| **战略 DAG 守护** | `@upstream: "@prj/domains/X"` 声明单向依赖；OpenXenon 写 `oxn domain validate --dag` 检测循环 |

### 5.3 与现有 OXL grammar 的 diff

```diff
 DomainDeclaration:
     'domain' name=STRING '{'
         (descriptions+=Description)?
+        (upstream=UpstreamDecl)?     // 路线 B 新增
+        (docs=DocBlock)?             // 兼容 2026-06-17
         (terms=TermBlock)?
         (ban=BanBlock)?
         (invariants+=InvariantBlock)*
     '}';

+UpstreamDecl:
+    '@upstream' ':' target=STRING ';';   // 路线 B 新增

 TermBlock:
     'term' '{'
         (terms+=TermDecl)*
     '}';

+// 路线 B: 重构 TermBlock 为 YAML 风格（破坏性）
+TermBlock:
+    'term' name=STRING '{'
+        (desc=Description)?
+        (properties=PropertyBlock)?     // properties: { ... }
+        (invariants=InvariantYamlBlock)? // invariant: { ... }
+    '}';
+
+PropertyBlock:
+    'properties' ':' '{' (fields+=Field)* '}';
+
+Field:
+    name=ID ':' value=FieldValue;
+
+FieldValue:
+    STRING                                // 普通字面量
+    | CrossReference;                     // 路线 B 新增
+
+CrossReference:
+    target=('@term' | '@prj') '/' path=ID ('/' path+=ID)*;
```

---

## 6. 路线 B 的 Langium 增量改动清单

### 6.1 增量改动总览

| # | 改动 | 文件 | 破坏性 |
|---|---|---|---|
| 1 | 新增 `UpstreamDecl` 节点 | `oxn.langium:179` 后 | 增量（向后兼容） |
| 2 | 新增 `DocBlock` 节点（兼容 2026-06-17） | `oxn.langium:178` 后 | 增量（向后兼容） |
| 3 | 重构 `TermBlock` 为 YAML 风格 | `oxn.langium:181-187` | **破坏性**（14 资产需 migration） |
| 4 | 新增 `Field` / `FieldValue` / `CrossReference` | `oxn.langium:181` 后 | **破坏性**（依赖 TermBlock 重构） |
| 5 | 重构 `BanBlock`（可保留，可废弃） | `oxn.langium:189-192` | 视决策 |
| 6 | 保留 `InvariantDecl` 现有 STRING 形式 | `oxn.langium:202-207` | 不变 |
| 7 | 重新生成 parser/ast/grammar | `src/oxl/generated/*` | 自动 |
| 8 | 更新 `OxnDomainIRSchema` | `oxn-assembly.schema.ts:146-150` | Zod 同步 |
| 9 | 写 14 资产 migration 工具 | `src/cli/domain-migrate.ts` | 新建 |
| 10 | 更新 builtin probe 透传测试 | `src/builtin/probes/__tests__/*` | 视 probe 改造 |
| 11 | oxn-vscode 插件同步升级 | `oxn-vscode/` | 跨仓 |

### 6.2 4 步 PR 序列（与 §3.3 对齐）

```
PR-B1: feat/v0.3-b1-upstream-dag
  └─ 改动 #1 + #7（UpstreamDecl 新增 + langium:generate）
  └─ 写 oxn domain validate --dag 工具（独立 .ts，不入 grammar）
  └─ 14 资产无影响（向后兼容）

PR-B2: feat/v0.3-b2-term-addressing
  └─ 改动 #4 + #7（FieldValue 支持 @term/ + @prj/ cross-ref）
  └─ 14 资产无影响（dot-path 仍然合法）
  └─ 写 14 资产 *新增* @term/ 寻址示例（不破坏旧资产）

PR-B3: feat/v0.3-b3-domain-migrate
  └─ 改动 #3 + #5（TermBlock 重构为 YAML + BanBlock 决策）
  └─ 写 oxn domain migrate 工具（一次性迁移 14 资产）
  └─ PR 验收：14 资产经 migrate 后能通过 OXL canonical 编译

PR-B4: feat/v0.3-b4-probe-compat
  └─ 改动 #8（Zod 同步）
  └─ 改动 #10（probe 透传测试更新）
  └─ 改动 #11（oxn-vscode 插件升级）
```

### 6.3 关键 Langium 规则（伪代码）

```langium
// @term/X 域内寻址
CrossReference:
    ('@term' | '@prj') '/' path+=ID ('/' path+=ID)*;

terminal ID: /[_a-zA-Z][\w-]*/;

// STRING 内允许以 @term/ 或 @prj/ 开头（不破坏现有 STRING 解析）
// Langium Cross-Reference 配置在 cross-ref.ts 中：
//   scopes: { termRef: scopes.domain.term, prjRef: scopes.project.term }
```

---

## 7. 路线 B 的执行条件

### 7.1 触发 checklist

| # | 条件 | 验证方法 |
|---|---|---|
| 1 | v0.2 全部 done 任务冻结 | `git log` + `EXECUTION-ORDER.md` 核对 |
| 2 | spike/md-as-canonical 全部 D1–D5 通过 | `bun test spike/md-as-canonical` |
| 3 | 14 资产 migration 工具就绪 | `oxn domain migrate --dry-run` 跑过 |
| 4 | oxn-vscode 插件同步升级方案明确 | 与 oxn-vscode 维护者确认 |
| 5 | builtin probe 透传测试 100% 通过 | `bun test src/builtin/probes/` |
| 6 | T10/T11/T12 done 任务的 compatibility 测试 100% 通过 | `bun test tests/architectural/` |

**任一条件不满足 → 路线 B 启动延期。**

### 7.2 rollback 策略

- 路线 B 是**破坏性**的，无法 rollback
- 缓解：14 资产 migration 工具必须支持 `--rollback` 参数
- 缓解：每个 PR 单独合入，单独可回退（PR-B1 → B2 → B3 → B4 顺序）

---

## 8. 风险与缓解

| # | 风险 | 影响 | 缓解 |
|---|---|---|---|
| 1 | 14 资产 migration 漏迁 | Domain 资产失效 | 写 `oxn domain migrate` 工具 + `--dry-run` 模式 + 逐个 diff 验证 |
| 2 | builtin probe 透传测试失败 | T10/T11/T12 跨 done 任务回归 | PR-B4 强制要求 `bun test src/builtin/probes/` 100% 通过 |
| 3 | `@upstream` DAG 循环依赖检测性能 | 编译期慢 | 缓存路径解析 + 增量扫描（仅扫 `oxn.langium` 改动文件） |
| 4 | 跨边界 `@prj/...` 性能 | term 解析慢 | 缓存 `oxn domain index` 一次扫全部 |
| 5 | 5 类错误扩展到路线 B 后超过 20 | structure-validator 限上限被触发 | 提升 `maxErrors` 默认到 50（路线 B 引入后 term 复杂度提升） |
| 6 | oxn-vscode 插件升级滞后 | IDE 高亮/跳转失效 | 路线 B PR-B4 强制要求插件同步合入 |
| 7 | 用户混淆 dot-path（路线 A）与 @term/X（路线 B） | 写法不一致 | 路线 B graduate 后写 `oxn domain migrate --to-@term` 工具 |

---

## 9. 与其他 forges 文档的关系

### 9.1 业务建模三角

| 文档 | 关注点 | 状态 |
|---|---|---|
| **2026-06-13-intent-pool-design** (v3) | 业务问题的**来源**（Intent Pool） | 活跃 |
| **2026-06-17-domain-as-ssot** | 业务问题的**结构化表达**（Domain + 文档绑定） | 活跃 |
| **2026-06-18-md-as-friendly-view** | 业务问题的**写作入口**（MD 友好形式，路线 A） | spike 验证中 |
| **本稿（2026-06-18-...）** | 业务问题的**语法解耦**（OXL 与 DDD 术语正交，路线 B） | v0.3 mid-term |

### 9.2 三角的字段叠加（路线 B 目标态）

```oxl
domain OrderContext {
  // 2026-06-13: Intent Pool 来源
  source_pool: "research/order-lifecycle"

  // 2026-06-17: 文档绑定
  docs = ["docs/zh-cn/intent.md#intent", "docs/zh-cn/align.md#work-task-part"]

  // 本稿: 战略 DAG
  @upstream: "@prj/domains/InventoryContext"

  term Order {
    desc: "客户发起的购买契约 (DDD 聚合根)"
    properties: { ... }
    invariant: { ... }
  }
}
```

四条独立 graduate 路径，可分四个 PR 合入。

---

## 10. 未决问题 + 结论

### 10.1 未决问题

- [ ] **Q1**：路线 B 启动时，v0.3 是开新 `feat/v0.3-oxl-rewrite` 总线还是分 4 个独立分支？目前推荐**4 个独立分支**（§6.2 PR-B1..B4）。
- [ ] **Q2**：`BanBlock`（`oxn.langium:189-192`）在路线 B 中**保留**还是**废弃**？目前推荐**保留但 deprecated**（`invariant:` 已能表达大部分 ban 场景）。
- [ ] **Q3**：路线 B 引入 `@term/X` 后，路线 A 的 dot-path（spike 形态 A）是**共存**还是**被替代**？目前推荐**共存**，graduate 后写 migration 工具。
- [ ] **Q4**：`@upstream` 的路径是否支持相对路径（如 `../InventoryContext`）？目前推荐**只支持绝对 `@prj/...`**，避免歧义。
- [ ] **Q5**：invariant 右值的"自然语言"是否需要 i18n（中英双语）？目前推荐**否**（与路线 A 一致）。
- [ ] **Q6**：14 资产的 migration 工具是 `oxn domain migrate` 子命令还是独立脚本？目前推荐**子命令**（CLI 体系内）。

### 10.2 结论

三轮 AI 讨论（`docs_tmp/domain-md-2.md` 10 轮）+ 用户决策 + 源码事实核对，**4 个精华点全纳入本文档**：

| 精华点 | 状态 | 引入时机 |
|---|---|---|
| 骨肉分离 | ✅ 已对齐（现有 grammar） | 路线 A 保持 |
| invariant 自然语言右值 | ✅ 已对齐（现有 STRING） | 路线 A 保持 |
| @term/X 域内寻址 | ⏳ 路线 B 引入 | v0.3 mid-term |
| @upstream 战略 DAG | ⏳ 路线 B 引入 | v0.3 mid-term |

**关键不变量**：

1. **spike 阶段零 grammar 修改**（D4 红线）—— 14 现有资产 + T10/T11/T12 全部 done 任务零回归
2. **4 精华点 2 个已对齐**——现有 OXL 实际已经实现了"骨肉分离"与"invariant 自然语言右值"，本稿补全文档化声明
3. **2 个精华点待 v0.3 mid-term**——@upstream 与 @term/X 属于 OXL 语法演进，必须等 v0.2 全部冻结
4. **路线 A 与路线 B 不冲突**——dot-path 与 @term/X 可共存；14 资产可渐进迁移
5. **路线 B 触发条件**硬门槛——6 项 checklist 全部通过才能启动

**graduate 路径**：
- 路线 A：`spike/md-as-canonical` → D1–D5 全绿 → `feat/v0.3-md-domain` 分支 → `src/oxl/md-bridge/` + `src/cli/oxl/md-loader.ts`
- 路线 B：v0.2 冻结 + 路线 A graduate → 4 个独立 PR（PR-B1..B4）→ `src/oxl/langium/oxn.langium` 增量 + 14 资产 migration 工具 + oxn-vscode 插件同步升级

下一步：**继续推进 spike commit 1（路线 A 验证零回归）**。路线 B 待 spike 全绿 + v0.2 冻结后再启动。
