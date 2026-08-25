# /oxn-asset — Asset 生命周期管理 v0.7+

## 目标
管理 Asset 生命周期：创建/修改/演进/删除/查询，5 种 AssetKind：**domain** / **workflow** / **stack** / **blueprint** / **assetmap**。

底层走 `oxn work create --type asset --asset-kind X`（IAP 闭环）。

> **🆕 v0.6.4 命名收敛**：`roadmap` → `assetmap`（`oxn assetmap`、`assets/assetmaps/`；AssetKind 枚举值同步 `'assetmap'`；v0.7 RFC-0013 D4 锁定的原始枚举值不变，但 v0.6.4 设计决定全面回收 Roadmap 术语）。

## 硬规则
- 🗑️ **RFC-0033 D2**：Asset planLock 已删除；可自由修改，引用 Work 不需重锁
- 修改必须走 `oxn work create --type asset`（v0.6.3+ hard-block）
- `references[]` DAG 校验：无循环依赖（同 kind 隔离；跨类型由 Blueprint 组合）
- `abstract` / `references` / `citations` / `auditTrail` 4 字段必须填完整
- 5 种 AssetKind 的 H2 分类白名单**不可混用**
- **External inline**：`url` 或 `path` 二选一（互斥）
- External 状态变化**不参与** Asset content_hash

## references 语法（v0.6.4 PR-D）

v0.6.4 收敛为 **bare name + parent-kind metadata** 推断：

- **Asset frontmatter `references:`**：使用 **bare name**（canonical）；强制同 AssetKind（例 `references: [oxn-engine-domain, oxn-work-domain]`）
- **`@md/{kind}/{name}`**：deprecated 仍兼容；新代码不写
- **跨 kind 引用**：必须用 Blueprint `## Use` 段（例 `- workflow: dev-workflow`）
- 解析器：`packages/engine/src/Asset/internal/reference-checker.ts:extractReferences + resolveReference`
- 详见 `references/asset-creation.md`

## 范式速记
- **Domain** = 业务边界（term/ban/invariant）
- **Workflow** = 执行边界（slot DAG）
- **Stack** = 环境边界（runtime/linter/test）
- **Blueprint** = 组合模板（`## Refs`）
- **AssetMap** = 导航图（scene → Domain/Workflow/Stack/Blueprint）

## 执行
1. **选 AssetKind**：查 `references/asset-kind-reference.md`
2. **fork 模板**：`assets/<kind>.md` → 改名 `<Name>.md`
3. **创建流程**：查 `references/asset-creation.md`
4. **修改/演进**：查 `references/asset-evolution.md`
5. **删除/归档**：查 `references/asset-lifecycle.md`
6. **完成**：`oxn asset list` 确认入库

## 模板选择
| AssetKind | 模板 | 核心 H2 |
|---|---|---|
| domain | `assets/domain.md` | Terms / Bans / Invariants / Externals |
| workflow | `assets/workflow.md` | Props / Slots / Externals |
| stack | `assets/stack.md` | Runtimes / Linters / Tests / Externals |
| blueprint | `assets/blueprint.md` | **Refs** |
| assetmap | `assets/assetmaps/assetmap.md` | Scenes |

> 详见 `references/asset-kind-reference.md` + `references/asset-creation.md`

## 关键错误码
- `IAP_ASSET_PATH_CONFLICT` → YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` / `E_MD_CATEGORY_UNKNOWN` → 修复 H3/H2 命名
- `E_MD_EXTERNAL_KIND_INVALID` / `_URL_PATH_CONFLICT` / `_URL_PATH_REQUIRED` → 修复 External 字段

## 禁止项
- 不写废弃语法：`noun` / `verb` / `domain_rules` / `expectation` / `rule`
- 不直接 `write_file` 改 .md（v0.6.3+ hard-block）
- 🗑️ 不锁后改 .md（RFC-0033 D2：planLock 已删；改 Asset → run --validate-only 触发引用 Work DRIFT 检测）
- 不混用 Asset 模式和 Work 模式
- 不删被引用的 Asset（先 `oxn asset archive`）
- 不创建 library/external Asset 类型（v0.6.1-alpha.4 已删除）
- 不在 Blueprint 内声明 External
- 🆕 不写 `@md/{kind}/{name}` references（v0.6.4 PR-D deprecated）；不写跨 kind references（必须走 Blueprint `## Use`）

## AssetMap 路由

```bash
oxn assetmap show oxn-system --scene <scene>
oxn assetmap suggest --goal "<goal>" --scene <scene> --top 5
```

> 与 `oxn-work` 边界：Asset 生命周期归本 Skill；Work 编排 / Run / Submit 归 `oxn-work`。详见 `references/asset-vs-work.md`。