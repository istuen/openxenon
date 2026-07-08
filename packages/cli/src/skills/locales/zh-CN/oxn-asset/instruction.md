# /oxn-asset — Asset 生命周期管理 v0.6

## 目标
管理 Asset 整个生命周期：创建 / 修改 / 演进 / 删除 / 查询，覆盖 5 种 AssetKind：
**domain** / **blueprint** / **stack** / **library** / **external**

底层走 `oxn work create --type asset --asset-kind X`（IAP 闭环）。

## 硬规则
- Asset 创建后 planLock 锁定，修改必须走 `oxn work create --type asset`（v0.6.3+ hard-block）
- `references[]` DAG 校验：不能有循环依赖
- `abstract` / `references` / `citations` / `auditTrail` 4 字段必须填完整
- 5 种 AssetKind 的 H2 分类白名单**不可混用**（domain ≠ blueprint 的 H2）
- Asset 不是独立文件就能跑 — 必须被 `oxn-work` Skill 的 Work 引用

## 范式速记
- **Domain** = 业务边界（term/ban/invariant）
- **Blueprint** = 技术边界（slot DAG）
- **Stack** = 环境边界（runtime/linter/test）
- **Library** = 知识边界（文档聚合）
- **External** = 外部边界（API/服务）

## 执行
1. **选 AssetKind**：查 `references/asset-kind-reference.md`
2. **fork 模板**：`assets/<kind>.md` → 改名 `<Name>.md`
3. **走创建流程**：查 `references/asset-creation.md`
4. **修改/演进**：查 `references/asset-evolution.md`
5. **删除/归档**：查 `references/asset-lifecycle.md`
6. **完成**：`oxn asset list` 确认入库 + `citations` 自动 +1

## 模板选择（按 AssetKind）
| AssetKind | 模板 | 核心 H2 |
|---|---|---|
| domain | `assets/domain.md` | Terms / Bans / Invariants |
| blueprint | `assets/blueprint.md` | Props / Slots |
| stack | `assets/stack.md` | Runtimes / Linters / Tests |
| library | `assets/library.md` | Sources |
| external | `assets/external.md` | Links |

## 关键错误码（完整见 `oxn asset validate --help`）
- `IAP_ASSET_PATH_CONFLICT` → primary + fallback 路径冲突，YIELD_TO_HUMAN
- `IAP_ALIGN_LOCK_HASH_MISMATCH` → 改 Asset 时 Work 未解锁，YIELD_TO_HUMAN
- `E_MD_DUPLICATE_H3` → H3 在 ## Category 内重复
- `E_MD_CATEGORY_UNKNOWN` → H2 不在 AssetKind 白名单

## 与 `oxn-work` 的边界
- ✅ 本 Skill 管：创建/修改/演进/删除/查询 Asset
- ❌ 本 Skill **不**管：编排 Work、跑 Run、提交 Submit、展示 Proof（那是 `oxn-work`）

## 禁止项
- 不写废弃语法：`noun` / `verb` / `domain_rules` / `expectation` / `rule` 块
- 不直接 `write_file` 改 .oxn（v0.6.3+ hard-block）
- 不锁后改 .oxn（先 `oxn work unlock`）
- 不混用 Asset 模式和 Work 模式（asset 模式无 task DAG）
- 不删被引用的 Asset（先 `oxn asset archive` 归档）