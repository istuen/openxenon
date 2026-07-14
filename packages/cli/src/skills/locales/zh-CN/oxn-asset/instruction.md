# /oxn-asset — Asset 生命周期管理 v0.6.1

## 目标
管理 Asset 整个生命周期：创建 / 修改 / 演进 / 删除 / 查询，覆盖 5 种 AssetKind（v0.6.1-alpha.4 三边界框架）：
**domain** / **workflow** / **stack** / **blueprint** / **roadmap**

底层走 `oxn work create --type asset --asset-kind X`（IAP 闭环）。

> **v0.6.1-alpha.4 变化**：AssetKind 6→5；原 blueprint 改名 **workflow**；新 **Blueprint** = 组合模板（用 `## Use` 引用 3 边界 + `## Boundaries` 编排）。
>
> **v0.7+ 移除 External**：外部资源统一通过 Asset Paper Schema 的 `references: [{ url }]` 字段声明，不再有 `## Externals` H2 category。

## 硬规则
- Asset 创建后 planLock 锁定，修改必须走 `oxn work create --type asset`（v0.6.3+ hard-block）
- `references[]` DAG 校验：不能有循环依赖（同 kind 隔离；跨类型由 Blueprint 组合）
- `abstract` / `references` / `citations` / `auditTrail` 4 字段必须填完整
- 5 种 AssetKind 的 H2 分类白名单**不可混用**
- **外部资源**：统一通过 Asset Paper Schema 的 `references: [{ url }]` 字段声明（无 `## Externals`）

## 范式速记（三边界）
- **Domain** = 业务边界（term/ban/invariant）
- **Workflow** = 执行边界（slot DAG with desc only）
- **Stack** = 环境边界（tools 列表）
- **Blueprint** = 组合模板（`## Use` 引用 3 边界 + `## Boundaries` 编排单元）
- **Roadmap** = 跨类型导航索引

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
| domain | `assets/domain.md` | Terms / Bans / Invariants |
| workflow | `assets/workflow.md` | Slots（仅 desc 字段）|
| stack | `assets/stack.md` | Tools |
| blueprint | `assets/blueprint.md` | Use / Boundaries |
| roadmap | `assets/roadmap.md` | Scenes |

> **模板细节**：见 `references/asset-kind-reference.md` + `references/asset-creation.md`

## 关键错误码
- `IAP_ASSET_PATH_CONFLICT` / `IAP_ALIGN_LOCK_HASH_MISMATCH` → YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` / `E_MD_CATEGORY_UNKNOWN` → 修复 H3/H2 命名

## 禁止项
- 不写废弃语法：`noun` / `verb` / `domain_rules` / `expectation` / `rule`
- 不直接 `write_file` 改 .oxn（v0.6.3+ hard-block）
- 不锁后改 .oxn（先 `oxn work unlock`）
- 不混用 Asset 模式和 Work 模式
- 不删被引用的 Asset（先 `oxn asset archive`）
- 不创建 library/external Asset 类型（v0.6.1-alpha.4 已删除）
- 不在 Blueprint 内声明 External（Blueprint 是纯组合层，外部引用由被组合的 Domain/Workflow/Stack 承担）

## Roadmap 路由

```bash
oxn roadmap show oxn-system --scene <scene>
oxn roadmap suggest --goal "<goal>" --scene <scene> --top 5
oxn roadmap sync oxn-system --scene <scene> --dry-run   # 手动 hint
```

> **与 `oxn-work` 的职责边界**：本 Skill 管 Asset 生命周期；Work 编排 / Run / Submit / Proof 是 `oxn-work`。详见 `references/asset-vs-work.md`。