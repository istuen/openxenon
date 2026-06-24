# OpenXenon v0.3 — unified + 纯 MD 语法样例集

> v0.3.0 改革后的 **5 类 Intent 资产**全部用纯原生 Markdown 表达。
> 0 个 `:::intent{...}` 容器指令，0 个新 npm 依赖。
>
> **canonical 范式（RFC v0.3.0 §3.4）**：
> - **H1 顶层实体** / **H2 分类** / **H3 实例** / **嵌套列表子结构**
> - **一行一个 `- key: value`**（无 `;` 内联分隔）
> - **H3 = canonical name**（无冗余 `- name: <H3>`）
> - **数组 = 缩进列表**（无 `items: A, B, C` 逗号字符串、无 `values: [a, b, c]` 内联数组）
> - **自然语言字段**（`desc` / `value` / `expect` / `guidance` / `instruction`）允许 `;` 作为句内分隔符（中文习惯）

## 5 类 Intent 资产 → 5 个 .md 文件

| 资产 | 文件 | H1 | H2 分类 | 业务场景 |
|---|---|---|---|---|
| Domain | `order-domain.md` | `# Domain: OrderDomain` | Terms / Bans / Invariants | 电商订单限界上下文 |
| Blueprint | `order-workflow-blueprint.md` | `# Blueprint: order-workflow` | Props / Slots | validate → charge → ship 拓扑 |
| Work | `place-order-work.md` | `# Work: place-order` | Context / Tasks | 编排 3 个 task 链 |
| Task | `t1-validate-task.md` | `# Task: t1-validate` | Parts / Probes | 校验购物车 |
| Proof | `order-build-validity-proof.md` | `# Proof: order-build-validity` | Verdicts / Runtime | build 步骤判决书 |

## Canonical 核心范式

```markdown
---
entity: <domain|blueprint|work|task|proof>
version: <X.Y.Z>
name: <entity-name>
---

# <EntityType>: <name>              ← H1 顶层实体

> 一句话业务描述（可选）

## <Category>                       ← H2 分类（每个实体有白名单）

### <InstanceName>                  ← H3 实例（H3 文本 = canonical name）
- key: value                        ← 标量字段（一行一个 key）
- list_field:                       ← 列表字段（必须用缩进列表）
  - element_1
  - element_2
- nested:                           ← 嵌套对象
  - child_key: child_value
```

## 5 个反模式（v0.3.0 全部禁止）

| 反模式 | 错误样例 | 正确样例 |
|---|---|---|
| **`;` 内联分隔 key** | `- type: string; default: USD; required: true` | `- type: string`<br>`- default: USD`<br>`- required: true` |
| **冗余 `- name:`** | `### Cart`<br>`- name: Cart`<br>`- desc: ...` | `### Cart`<br>`- desc: ...` |
| **`items: A, B, C` 逗号字符串** | `- items: cart-job, order-pipeline, charge-plugin` | `- items:`<br>&nbsp;&nbsp;`- cart-job`<br>&nbsp;&nbsp;`- order-pipeline` |
| **`values: [a, b, c]` 内联数组** | `- values: [dev, staging, prod]` | `- values:`<br>&nbsp;&nbsp;`- dev`<br>&nbsp;&nbsp;`- staging` |
| **意义不明 wrapper H3** | `### main` (work context) | `### primary` |
| | `### observed` (proof runtime) | `### snapshot` |

## 自然语言字段白名单（允许 `;`）

| 字段 | 业务用途 | 是否允许 `;` |
|---|---|---|
| `desc` | 描述（H3 的人类可读说明）| ✅ 允许（中文常用 `;` 作为句内分隔）|
| `value` | 不变量/判决书的事实陈述 | ✅ 允许 |
| `expect` | probe 验收条件（自然语言谓词）| ✅ 允许 |
| `guidance` | AI 引导说明 | ✅ 允许 |
| `instruction` | skill instruction 正文 | ✅ 允许 |
| 其他结构性字段（`type` / `default` / `required` / `items` / `values` / `deps` / `observe` / `domain` / `blueprint` / `part` / `scheme` / `name` / ...）| — | ❌ **禁止 `;`**（应拆成多行）|

## 与 v0.2 `:::intent{...}` 对照

| 维度 | v0.2（旧）| v0.3 unified（纯 MD）|
|---|---|---|
| 容器指令 | `:::intent{#id type="term" name="X"}` | `### X`（H3 替代）|
| 列表属性 | `deps="a,b,c" observe="x,y"`（字符串拼接）| `- deps:` + 缩进列表 |
| 嵌套属性 | 引号 + 多个属性 | 缩进列表（mdast 树形天然支持）|
| 解析器 | `remark-directive` + attribute parser | `remark-parse` + heading-context + 列表递归 |
| 编辑器支持 | 0 工具原生 | GitHub / Obsidian / VSCode 全识别 |
| AI 生成准确率 | 28-62% | 95%+（嵌套列表 LLM 训练集最丰富）|
| 错误码数 | 6 个 E_MD_xxx | 13 个 E_MD_xxx + 1 E_OXL_ENTITY_NOT_REGISTERED |

## 各实体 H2 分类白名单（编译期硬校验）

| 实体 | 允许的 H2 |
|---|---|
| Domain | Terms / Bans / Invariants |
| Blueprint | Props / Slots |
| Work | Context / Tasks |
| Task | Parts / Probes |
| Proof | Verdicts / Runtime |

未知 H2 → `E_MD_CATEGORY_UNKNOWN` 错误

## H3 唯一性约束（强制）

**强制 H3 文本在所属 H2 分类内唯一**。
重复 H3 → `E_MD_DUPLICATE_H3` 错误（带首次出现行号）

## 完整 Roundtrip 路径

```
.openxenon/domains-md/<name>.md        ← 唯一权威（人类编辑入口）
       ↓ runMdPipeline (unified 链)
mdast (Root) → extractHeadingContexts → extractListFields
       ↓ EntityRegistry.getCompiler(entity)
FrozenDomain / FrozenBlueprint / FrozenWork / FrozenTask / FrozenProof
       ↓ kernel 阶段
判定 / 编排 / 执行
```

`.oxn` 是可选的「编译产物」（CLI 暂未实装 `oxn domain compile`），但 `.md` 永远是 canonical 源。

## 错误码速查（13 E_MD_xxx + 5 canonical 守卫）

### 13 个 E_MD_xxx（md-bridge 内置）

| 错误码 | 触发条件 |
|---|---|
| E_MD_INVALID_SYNTAX | mdast 解析失败 |
| E_MD_MISSING_REQUIRED | 必填字段缺失（如 frontmatter.entity）|
| E_MD_TYPE_MISMATCH | 字段类型不符 |
| E_MD_REFERENCE_BROKEN_FATAL | 内部 Intent 引用断链 |
| E_MD_REFERENCE_BROKEN_WARN | 外部 URL/路径断链 |
| E_MD_HASH_MISMATCH | contentHash 不匹配 |
| E_MD_DEPRECATED_SYNTAX | 检测到 `:::intent{...}` 旧语法（v0.3 强制）|
| E_MD_DUPLICATE_H3 | 同 H2 下 H3 文本重复 |
| E_MD_H1_MISSING | 缺 H1（如 `# Domain: name`）|
| E_MD_H1_MISMATCH | H1 与 frontmatter.name 不一致 |
| E_MD_CATEGORY_UNKNOWN | H2 不在实体白名单 |
| E_MD_LIST_FORMAT_INVALID | 列表层级/缩进错乱 |
| E_MD_NESTED_LEVEL_OVERFLOW | 嵌套深度超限（>3）|

### 5 个 canonical 守卫（check-md-canonical.ts，CI 拦截）

| 规则 | 触发条件 |
|---|---|
| E_MD_CANONICAL_NAME_REDUNDANT | `- name: <H3-text>` 冗余（H3 已是 canonical name）|
| E_MD_CANONICAL_ITEMS_COMMA_STRING | `items: A, B, C` 逗号字符串（必须缩进列表）|
| E_MD_CANONICAL_VALUES_INLINE_ARRAY | `values: [a, b, c]` 内联数组（必须缩进列表）|
| E_MD_CANONICAL_SEMICOLON_INLINE | 结构性字段含 `;`（自然语言字段豁免）|
| E_MD_INVALID_SYNTAX | md-bridge pipeline 解析失败 |

## CI 守卫

`bun scripts/check-md-canonical.ts src/oxl/examples-md docs/{zh-cn,en}/intent.md`

退出码 0 = 全部通过，1 = 有违规（带 file:line:rule 详情）。
