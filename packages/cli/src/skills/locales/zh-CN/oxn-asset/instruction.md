# /oxn-asset — Asset 生命周期管理 v0.7+

## 目标
管理 Asset 整个生命周期：创建 / 修改 / 演进 / 删除 / 查询，覆盖 5 种 AssetKind（v0.6.1-alpha.4 三边界框架）：
**domain** / **workflow** / **stack** / **blueprint** / **assetmap**

底层走 `oxn work create --type asset --asset-kind X`（IAP 闭环）。

> **🆕 v0.6.4 命名收敛**：用户面 CLI 命令与目录从 `roadmap` 收敛为 `assetmap`（`oxn assetmap`、`assets/assetmaps/`）；**AssetKind 枚举值亦同步从 `'roadmap'` 改为 `'assetmap'`**（v0.7 RFC-0013 D4 原锁定枚举值不变，但 v0.6.4 设计决定全面回收 Roadmap 术语；break-change）。

## 硬规则
- Asset 创建后 planLock 锁定，修改必须走 `oxn work create --type asset`（v0.6.3+ hard-block）
- `references[]` DAG 校验：不能有循环依赖（同 kind 隔离；跨类型由 Blueprint 组合）
- `abstract` / `references` / `citations` / `auditTrail` 4 字段必须填完整
- 5 种 AssetKind 的 H2 分类白名单**不可混用**
- **External inline**：`url` 或 `path` 二选一（互斥）；`kind` ∈ 6 值 enum
- External 状态变化**不参与** Asset content_hash

## 🆕 v0.6.4 PR-D references 语法（Q7 B 方案）

v0.6.4 之前 references 3 套语法并存（bare name / `@md/{kind}/{name}` / file path），`isAssetReferenced()` 假阴性导致 archive/delete 守门失效。v0.6.4 收敛为 **bare name + parent-kind metadata** 推断：

- **Asset frontmatter `references:` 字段**：使用 **bare name**（canonical）；强制同 AssetKind（例 `references: [oxn-engine-domain, oxn-work-domain]`，解析时 parent kind = domain）
- **`@md/{kind}/{name}`**：deprecated 仍兼容（Blueprint frontmatter 老代码能跑）；新代码不写
- **跨 kind 引用**：必须用 Blueprint `## Use` 段（显式 `kind:` 字段，例 `- workflow: oxn-workflow`）
- 解析优先级：(1) bare name → 强制 parent kind 推断 → `assets/{parentKind}s/{name}.md` 查
  (2) `@md/{kind}/{name}` → 显式 kind + name（deprecated）
  (3) 跨 kind → Blueprint `## Use` 段（显式 kind）
- 解析器：`packages/engine/src/Asset/internal/reference-checker.ts:extractReferences(parentKind, refStr)` + `resolveReference(parentKind, refStr, projectRoot)`

## 范式速记（三边界）
- **Domain** = 业务边界（term/ban/invariant + 可选 ## Externals）
- **Workflow** = 执行边界（slot DAG + 可选 ## Externals）
- **Stack** = 环境边界（runtime/linter/test + 可选 ## Externals）
- **Blueprint** = 组合模板（`## Refs`；**无 ## Externals**）
- **Roadmap / AssetMap** = 导航图（scene → Domain/Workflow/Stack/Blueprint）

## 执行
1. **选 AssetKind**：查 `references/asset-kind-reference.md`
2. **fork 模板**：`assets/<kind>.md` → 改名 `<Name>.md`
3. **创建流程**：查 `references/asset-creation.md`
4. **修改/演进**：查 `references/asset-evolution.md`
5. **删除/归档**：查 `references/asset-lifecycle.md`
6. **完成**：`oxn asset list` 确认入库

## 模板选择（v0.6.1-alpha.4）
| AssetKind | 模板 | 核心 H2 |
|---|---|---|
| domain | `assets/domain.md` | Terms / Bans / Invariants / **Externals** |
| workflow | `assets/workflow.md` | Props / Slots / **Externals** |
| stack | `assets/stack.md` | Runtimes / Linters / Tests / **Externals** |
| blueprint | `assets/blueprint.md` | **Refs** |
| assetmap | `assets/assetmaps/assetmap.md` | Scenes |

> **External 详细 + kind enum + 状态 + CLI**：见 `references/asset-kind-reference.md` + `references/asset-creation.md`

## 关键错误码
- `IAP_ASSET_PATH_CONFLICT` / `IAP_ALIGN_LOCK_HASH_MISMATCH` → YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` / `E_MD_CATEGORY_UNKNOWN` → 修复 H3/H2 命名
- `E_MD_EXTERNAL_KIND_INVALID` / `_URL_PATH_CONFLICT` / `_URL_PATH_REQUIRED` → 修复 External 字段
- 🆕 `IAP_INTENT_CROSS_KIND_REF`（v0.6.4 PR-D 保留）→ 跨 kind references 走 Blueprint `## Use` 段

## 禁止项
- 不写废弃语法：`noun` / `verb` / `domain_rules` / `expectation` / `rule`
- 不直接 `write_file` 改 .oxn（v0.6.3+ hard-block）
- 不锁后改 .oxn（先 `oxn work unlock`）
- 不混用 Asset 模式和 Work 模式
- 不删被引用的 Asset（先 `oxn asset archive`）
- 不创建 library/external Asset 类型（v0.6.1-alpha.4 已删除）
- 不在 Blueprint 内声明 External（Blueprint 是纯组合层）
- 🆕 不在 Asset `references:` 字段写 `@md/{kind}/{name}` 形式（v0.6.4 PR-D deprecated）
- 🆕 不在 Asset `references:` 字段写跨 kind 引用（必须走 Blueprint `## Use` 段，Inv15/Inv30）

## AssetMap 路由

```bash
oxn assetmap show oxn-system --scene <scene>
oxn assetmap suggest --goal "<goal>" --scene <scene> --top 5
oxn assetmap sync oxn-system --scene <scene> --dry-run   # 手动 hint
```

> **与 `oxn-work` 的职责边界**：本 Skill 管 Asset 生命周期；Work 编排 / Run / Submit / Proof 是 `oxn-work`。详见 `references/asset-vs-work.md`。