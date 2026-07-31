# Design: Asset 探索 UX 总览与修复路线图

- **DraftType**: design（设计稿）
- **创建日期**: 2026-07-30
- **主题**: 存量项目 OXN Asset 探索的当前缺陷总览与修复排序
- **关联 Draft**: 6 份 issue（见末尾索引）
- **数据源**: 基于 `report-asset-investory-2026-07-30.md` 与实际源码审计

## 1. 现状一句话

OXN v0.6.2 的 `oxn asset` 命令族是**项目文件浅扫 wrapper**，未串接 5 个 kind-specific compiler、未暴露 RFC-0011 双层机制、未读取 `.oxnrc` 自定义根。对存量项目（已有 `.openxenon/assets/` 的用户）而言，**只能走 5 次 `--kind` list + 专用命令（`oxn domain` / `oxn blueprint` / `oxn roadmap`）**，Workflow/Stack/Roadmap 强校验缺失，无 diff / migrate / tree 工具。

## 2. 6 个缺陷总览

| ID | 缺陷 | 类型 | 优先级 | 文件 | 修复成本 |
|---|---|---|---|---|---|
| I-1 | `listAll` 硬编码漏 workflow/roadmap | bug | **P0** | `packages/engine/src/Asset/list.ts:25-31` | XS（一行数组） |
| I-2 | Skill 文档 flag drift（`--dry-run` / `--scope` 等不存在的 flag） | doc | **P0** | `packages/cli/src/skills/locales/en/oxn-asset/references/*.md` | S（改文档） |
| I-3 | `oxn asset validate` 不调 5 个 kind compiler | 架构 | **P1** | `packages/engine/src/Asset/validate.ts:35-46` | M（加 dispatch table） |
| I-4 | RFC-0011 两层机制对 Asset CLI 不可见 | 设计 | **P2** | `packages/engine/src/oxl/scope/oxn-builtin-registry.ts` + `oxn-scope.ts` | L（牵涉 RFC 全量落地） |
| I-5 | `oxn asset` 忽略 `.oxnrc` `assetRoot` | 配置 | **P3** | `packages/engine/src/Asset/list.ts:8-10` 等 6 处 | S（传 config 而非 null） |
| I-6 | 缺 `diff` / `migrate` / `tree` / `unarchive` 命令 | 产品缺口 | **P3** | — | XL（新增 4 命令） |

## 3. 依赖图

```
I-1 (P0 hotfix)         ── 独立，可立即修
I-2 (P0 hotfix)         ── 独立，可立即修
I-3 (P1)                ── 独立，但要等 design 拍板：是否每个 kind 都强校验？roadmap 是否走 scene parser 还是 RoadmapCompiler？

I-4 (P2)                ── RFC-0011 全量落地，依赖：
  ├── I-5 必须先解（不然 overlay 行为不可预期）
  └── 新增 `oxn asset list --scope oxn|prj|effective` 命令（I-6 子集）

I-5 (P3)                ── 阻塞 I-4
I-6 (P3)                ── 多命令合集，含：
  ├── oxn asset diff（依赖 I-4 的 scope 解析）
  ├── oxn asset migrate（独立，但要 schema 元数据）
  ├── oxn asset tree（独立）
  └── oxn asset unarchive（独立，复用 archive 路径）
```

## 4. 优先级矩阵（影响 × 成本）

```
高影响 │  I-3 (核心)  I-4 (RFC 全量)
       │
       │  I-1 ★      I-5 ★
       │  I-2 ★
低影响 │
       └──────────────────────────────
        低成本        高成本
        (XS/S)        (M/L/XL)
       ★ = 立即可做（hotfix 候选）
```

## 5. 修复路线图

### v0.6.3 hotfix（本周内）

- **I-1**：`listAll()` 改用 `ALL_ASSET_KINDS` 枚举而非硬编码 3 个
- **I-2**：扫描 `oxn-asset` Skill 所有 references，修掉不存在的 flag

### v0.7.0 设计期（2-4 周）

- **I-3** design 决策：
  - 选项 A：`oxn asset validate --kind X` 内置 5-way dispatch（统一入口）
  - 选项 B：保持 `oxn asset validate` 弱校验，强校验留给 `oxn domain/blueprint/workflow/stack/roadmap validate`
  - 选项 C：混合——`oxn asset validate` 默认 weak，加 `--strict` 触发 kind compiler
- **I-4** RFC-0011 全量落地：
  - 新增 `oxn asset list --scope oxn|prj|effective --json`
  - 新增 `oxn asset show --scope oxn`
  - 内置 registry 接入 asset 命令

### v0.7.0+ 长尾

- **I-5**：resolver 调用统一传 `config = loadOxnRc()`
- **I-6**：
  - `oxn asset tree`（依赖图可视化）
  - `oxn asset diff`（vs 内置默认）
  - `oxn asset migrate`（schema 版本升级）
  - `oxn asset unarchive`（归档可逆）

## 6. 设计原则建议

修复 I-3 / I-4 时需锁定：

1. **5 个 kind 必须有对称的命令面**——不能 domain 有专用 list/index/validate，workflow 没有
2. **`oxn asset` 应是聚合入口**——kind-specific 命令是 escape hatch，不是主路径
3. **scope 概念必须显式**——`@oxn/` / `@prj/` / `effective` 三态必须在 list 输出可见
4. **缓存层必须统一**——Domain/Blueprint 已有 `.openxenon/.cache/`，其他 3 类需要补齐

## 7. Promote 路径聚合

| Issue | 单独 Promote 路径 | 聚合 Promote 路径 |
|---|---|---|
| I-1, I-2 | 各自 Doc(dev) hotfix 说明 | 合一份 `hotfix-0-6-3-asset-cli.md` → Doc(dev) |
| I-3 | 单独 RFC（架构决策）+ Doc(dev) | `RFC-XXXX-asset-validate-dispatch.md` |
| I-4 | RFC-0011 errata 段追加 + Doc(dev) | 修订 RFC-0011，扩 v0.7 落地路径 |
| I-5 | Doc(dev)（config 加载说明） | 合并到 I-4 |
| I-6 | 各命令单独 RFC（4 份）+ Roadmap 加 scene | 拆 4 个独立 RFC |

## 8. 关联 Draft 索引

| Draft | 类型 | 优先级 |
|---|---|---|
| `issue-asset-list-omits-workflow-roadmap.md` | issue | P0 |
| `issue-asset-skill-flag-drift.md` | issue | P0 |
| `issue-asset-validate-skips-compilers.md` | issue | P1 |
| `issue-rfc0011-asset-exploration-overlay.md` | issue | P2 |
| `issue-asset-cli-missing-commands.md` | issue | P3 |
| `issue-asset-cli-ignores-assetroot.md` | issue | P3 |

## 9. 下一步动作

按 I-1 → I-2 → I-3 → I-4 → I-5 → I-6 顺序，每个 issue 独立走：
1. 填写 issue 内容（复现/影响/修复方向）
2. 评估是否进 v0.6.3 hotfix / v0.7.0 / backlog
3. 决定后走 `oxn work create --blueprint doc-dev-workflow` 晋升为开发文档，或走 `oxn asset create` + IAP 闭环修复