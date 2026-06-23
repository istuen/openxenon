# OpenXenon v0.3 — unified + 纯 MD 语法样例集

> v0.3.0 改革后的 **5 类 Intent 资产**全部用纯原生 Markdown 表达。
> 0 个 `:::intent{...}` 容器指令，0 个新 npm 依赖。
>
> 范式：**H1 实体 / H2 分类 / H3 实例 / 嵌套列表子结构**

## 5 类 Intent 资产 → 5 个 .md 文件

| 资产 | 文件 | H1 | H2 分类 | 业务场景 |
|---|---|---|---|---|
| Domain | `order-domain.md` | `# Domain: OrderDomain` | Terms / Bans / Invariants | 电商订单限界上下文 |
| Blueprint | `order-workflow-blueprint.md` | `# Blueprint: order-workflow` | Props / Slots | validate → charge → ship 拓扑 |
| Work | `place-order-work.md` | `# Work: place-order` | Context / Tasks | 编排 3 个 task 链 |
| Task | `t1-validate-task.md` | `# Task: t1-validate` | Parts / Probes | 校验购物车 |
| Proof | `order-build-validity-proof.md` | `# Proof: order-build-validity` | Verdicts / Runtime | build 步骤判决书 |

## 核心范式：H1 + H2 + H3 + 嵌套列表

```
# <EntityType>: <Name>           ← 顶层实体（H1）
> 一句话业务描述（可选）

## <Category>                     ← 分类（H2）

### <InstanceName>                ← 实例（H3）
- key: value                      ← 标量字段
- list_field:                     ← 列表字段
  - element_1
  - element_2
- nested:                         ← 嵌套对象
  - child_key: child_value
```

## 与 v0.2 `:::intent{...}` 对照

| 维度 | v0.2（旧）| v0.3 unified（纯 MD）|
|---|---|---|
| 容器指令 | `:::intent{#id type="term" name="X"}` | `### X` |
| 列表属性 | `deps="a,b,c" observe="x,y"`（字符串拼接）| `- deps: [a, b, c]`（嵌套列表）|
| 嵌套属性 | 引号 + 多个属性 | 缩进列表 |
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

## H3 唯一性约束

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

`.oxn` 是可选的"编译产物"（CLI 暂未实装 `oxn domain compile`），但 `.md` 永远是 canonical 源。

## 错误码速查（13 E_MD_xxx）

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
