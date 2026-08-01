# /oxn-asset — Asset 生命周期管理 v0.7+

## 目标
管理 Asset 整个生命周期：创建 / 修改 / 演进 / 删除 / 查询，覆盖 5 种 AssetKind（v0.6.1-alpha.4 三边界框架）：
**domain** / **workflow** / **stack** / **blueprint** / **roadmap**

底层走 `oxn work create --type asset --asset-kind X`（IAP 闭环）。

> **v0.7 命名收敛**：用户面 CLI 命令与目录从 `roadmap` 收敛为 `assetmap`（`oxn assetmap`、`assets/assetmaps/`）；**AssetKind 枚举值仍为 `roadmap`**（RFC-0013 D4 明确不改代码枚举，内部代码/AssetKind 字段使用 `'roadmap'`）。

## 硬规则
- Asset 创建后 planLock 锁定，修改必须走 `oxn work create --type asset`（v0.6.3+ hard-block）
- `references[]` DAG 校验：不能有循环依赖（同 kind 隔离；跨类型由 Blueprint 组合）
- `abstract` / `references` / `citations` / `auditTrail` 4 字段必须填完整
- 5 种 AssetKind 的 H2 分类白名单**不可混用**
- **External inline**：`url` 或 `path` 二选一（互斥）；`kind` ∈ 6 值 enum
- External 状态变化**不参与** Asset content_hash

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
| roadmap | `assets/roadmap.md` | Scenes |

> **External 详细 + kind enum + 状态 + CLI**：见 `references/asset-kind-reference.md` + `references/asset-creation.md`

## 关键错误码
- `IAP_ASSET_PATH_CONFLICT` / `IAP_ALIGN_LOCK_HASH_MISMATCH` → YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` / `E_MD_CATEGORY_UNKNOWN` → 修复 H3/H2 命名
- `E_MD_EXTERNAL_KIND_INVALID` / `_URL_PATH_CONFLICT` / `_URL_PATH_REQUIRED` → 修复 External 字段

## 禁止项
- 不写废弃语法：`noun` / `verb` / `domain_rules` / `expectation` / `rule`
- 不直接 `write_file` 改 .oxn（v0.6.3+ hard-block）
- 不锁后改 .oxn（先 `oxn work unlock`）
- 不混用 Asset 模式和 Work 模式
- 不删被引用的 Asset（先 `oxn asset archive`）
- 不创建 library/external Asset 类型（v0.6.1-alpha.4 已删除）
- 不在 Blueprint 内声明 External（Blueprint 是纯组合层）

## AssetMap 路由

```bash
oxn assetmap show oxn-system --scene <scene>
oxn assetmap suggest --goal "<goal>" --scene <scene> --top 5
oxn assetmap sync oxn-system --scene <scene> --dry-run   # 手动 hint
```

> **与 `oxn-work` 的职责边界**：本 Skill 管 Asset 生命周期；Work 编排 / Run / Submit / Proof 是 `oxn-work`。详见 `references/asset-vs-work.md`。