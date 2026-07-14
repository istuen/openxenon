# Asset 创建流程（v0.6.1-alpha.4）

> 本文件是 `oxn-asset` Skill 的按需加载补充。创建新 Asset 时查阅。

## 创建流程（5 步）

### 步骤 1：选择 AssetKind + 模板

从 `assets/` 目录选对应模板（v0.6.1-alpha.4 5 种 AssetKind）：

| AssetKind | 模板 | H3 示例数 | 核心 H2 |
|---|---|---|---|
| domain | `assets/domain.md` | 3 terms + 1 ban + 3 invariants | Terms / Bans / Invariants |
| workflow | `assets/workflow.md` | 3 slots（desc only）| Slots |
| stack | `assets/stack.md` | 4 tools | Tools |
| blueprint | `assets/blueprint.md` | 3 boundary refs + 可选 nested blueprint | Use / Boundaries |
| roadmap | `assets/roadmap.md` | N 个 scene H3 | Scenes (sub: scene) |

### 步骤 2：fork 模板

```bash
cp docs/zh-cn/asset-templates/domain.md /tmp/MyDomain.md
# 编辑：name / abstract / references / citations / Terms / Bans / Invariants
```

### 步骤 3：填字段

每个模板的 H3 都有**最小示例**，按示例改：
- **Domain**: term 名 + desc，ban 名 + items，invariant 名 + value
- **Workflow**: slot 名 + desc（仅 desc 字段，deps/observe 由 Blueprint 编排）
- **Stack**: tool 名 + version/config/command
- **Blueprint**: ref 名 + kind + ref（kind ∈ domain/workflow/stack/blueprint）；外部引用由被组合的边界承担
- **Roadmap**: scene 名 + description + 表格（kind, name, description）

### 步骤 4：验证 + 写入

```bash
# 验证（语法 + Asset Paper 4 字段）
oxn asset validate <name>

# 通过后写入资产目录
mv /tmp/MyDomain.md .openxenon/assets/domains/MyDomain.md
```

## 创建 Blueprint 组合模板的特殊规则

Blueprint 不引用 `domain X ref` 的传统语法，而是引用 **asset ID**：

```oxl
blueprint "integrate-payment" {
  abstract: 支付集成组合模板

  ## Use
  ### payment-domain
  - kind: domain
  - ref: @md/domains/PaymentContext
  ### fix-issue-workflow
  - kind: workflow
  - ref: @md/workflows/fix-issue
  ### node-stack
  - kind: stack
  - ref: @md/stacks/node-ts

  ## Boundaries
  ### build
  - refs:
    - domain: payment-domain
    - workflow: fix-issue-workflow
    - stack: node-stack
  - observe: [ts-compiles]
  - deps: []
}
```

**3 引用规则**：
- Blueprint 必须引用至少 1 个 Domain + 1 个 Workflow + 1 个 Stack（缺一报错）
- 引用路径使用 `@md/<scope>/<name>` 或 `@prj/<scope>/<name>` 格式
- Blueprint 可嵌套（`kind: blueprint` ref），DAG 校验防环

## 创建 Workflow（原 Blueprint）的特殊规则

`assets/workflow.md` 模板与原 `assets/blueprint.md` 内容**一致**（只是 entity type 改 `entity: workflow`）。创建时直接 fork 即可。