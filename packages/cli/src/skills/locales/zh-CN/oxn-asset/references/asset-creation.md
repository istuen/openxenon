# Asset 创建流程（v0.6.1-alpha.4）

> 本文件是 `oxn-asset` Skill 的按需加载补充。创建新 Asset 时查阅。

## 创建流程（5 步）

### 步骤 1：选择 AssetKind + 模板

从 `assets/` 目录选对应模板（v0.6.1-alpha.4 5 种 AssetKind）：

| AssetKind | 模板 | H3 示例数 | 核心 H2 |
|---|---|---|---|
| domain | `assets/domain.md` | 3 terms + 1 ban + 3 invariants + **externals**（可选）| Terms / Bans / Invariants / **Externals** |
| workflow | `assets/workflow.md` | 2 props + 3 slots + **externals**（可选）| Props / Slots / **Externals** |
| stack | `assets/stack.md` | 2 runtimes + 1 linter + 1 test + **externals**（可选）| Runtimes / Linters / Tests / **Externals** |
| blueprint | `assets/blueprint.md` | 3 boundary refs + 可选 nested blueprint | **Refs**（仅此一个）|
| assetmap | `assets/assetmaps/assetmap.md` | N 个 scene H3 | Scenes (sub: scene) |

### 步骤 2：fork 模板

```bash
cp docs/zh-cn/asset-templates/domain.md /tmp/MyDomain.md
# 编辑：name / abstract / references / citations / Terms / Bans / Invariants / Externals（可选）
```

### 步骤 3：填字段

每个模板的 H3 都有**最小示例**，按示例改：
- **Domain**: term 名 + desc，ban 名 + items，invariant 名 + value，**external 名 + url/path/kind/ttl/auth/summary**
- **Workflow**: prop 名 + type/values/required/default，slot 名 + deps/observe，**external 名 + 字段同上**
- **Stack**: runtime 名 + version，linter 名 + config，test 名 + command/coverage，**external 名 + 字段同上**
- **Blueprint**: ref 名 + kind + ref（kind ∈ domain/workflow/stack/blueprint）；**不允许 ## Externals**
- **Roadmap**: scene 名 + description + 表格（kind, name, description）

### 步骤 4：填 External inline（v0.6.1-alpha.4 可选）

**仅 Domain/Workflow/Stack 可声明 `## Externals`**。**Blueprint 不支持**。

#### External 字段

```oxl
### external-name
- url: https://api.example.com/v1   # 或 path（互斥）
- kind: rest-api                     # 必填，6 值 enum
- ttl: 7d                            # 可选
- auth: api-key                      # 可选
- summary: ...                       # 可选
```

#### kind enum（6 值）

`rest-api` | `webhook` | `documentation` | `library` | `config` | `service`

#### url vs path 互斥

- `url`：网络路径（`https://api.example.com/v1`）
- `path`：项目相对路径（`./docs/architecture.md`）
- 二选一；同时存在报 `E_MD_EXTERNAL_URL_PATH_CONFLICT`；都不存在报 `E_MD_EXTERNAL_URL_PATH_REQUIRED`

### 步骤 5：验证 + 写入

```bash
# 验证（语法 + Asset Paper 4 字段 + External 校验）
oxn asset validate <name>

# 通过后写入资产目录
mv /tmp/MyDomain.md .openxenon/assets/domains/MyDomain.md
```

### 步骤 6（可选）：External 状态检查

```bash
# 扫描所有 External + 检查可达性 + 写入 .openxenon/.cache/external-status.json
oxn external check

# 查看状态
oxn external status

# 手动标记
oxn external mark --name "stripe-api" --status stale --reason "API 维护中"
```

## 创建 Blueprint 组合模板的特殊规则

Blueprint 不引用 `domain X ref` 的传统语法，而是引用 **asset ID**：

```oxl
blueprint "integrate-payment" {
  abstract: 支付集成组合模板

  ## Refs
  ### payment-domain
  - kind: domain
  - ref: @md/domains/PaymentContext
  ### fix-issue-workflow
  - kind: workflow
  - ref: @md/workflows/fix-issue
  ### node-stack
  - kind: stack
  - ref: @md/stacks/node-ts
}
```

**3 引用规则**：
- Blueprint 必须引用至少 1 个 Domain + 1 个 Workflow + 1 个 Stack（缺一报错）
- 引用路径使用 `@md/<scope>/<name>` 或 `@prj/<scope>/<name>` 格式
- Blueprint 可嵌套（`kind: blueprint` ref），DAG 校验防环

## 创建 Workflow（原 Blueprint）的特殊规则

`assets/workflow.md` 模板与原 `assets/blueprint.md` 内容**一致**（只是 entity type 改 `entity: workflow`）。创建时直接 fork 即可。