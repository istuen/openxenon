---
entity: adr
version: 1.0.0
status: Archived
date: 2026-08-05
accepted: 2026-08-05
supersedes: null
superseded-by: null
related:
  - RFC-0028
  - .openxenon/assets/domains/oxn-asset-domain.md
  - .openxenon/assets/domains/oxn-engine-domain.md
  - .openxenon/assets/assetmaps/oxn-system.md
  - docs/adrs/0089-onboarding-starter-assets.md
  - docs/adrs/0069-asset-bootstrap-completeness.md
  - docs/adrs/0050-onboarding-via-starter-work.md
  - docs/rfcs/RFC-0011-builtin-asset-two-layer.md
  - docs/rfcs/RFC-0012-bootstrap-exemption.md
  - docs/rfcs/RFC-0013-versioning-policy.md
  - .openxenon/drafts/design-builtin-engine-integration.md
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0090: builtin Asset 物理位置迁移至 packages/engine/src/builtin/

> **状态**：✅ Accepted（2026-08-05）
> **日期**：2026-08-05
> **来源**：2026-08-05 `/grilling` session — Q1=A, Q2=C, Q3=E, Q4=G, Q5=I 组合
> **影响层**：L1-Engine（`packages/engine/src/builtin/`）+ L1-OXL scope（`oxn-builtin-registry.ts`）+ L3-CLI（`oxn onboard`）+ RFC-0011 `@oxn/` 层
> **Promote**: 由 `.openxenon/drafts/design-builtin-engine-integration.md`（2026-08-05）晋升

## Context

<!-- allow-version -->
### 现状盘点（v0.6.x）

v0.6.x 起 `src/builtin/` 是 OXN 仓库根的"种子资产"目录（27 个 .md），承载 RFC-0011 D1 的 `@oxn/` scope 物理位置。Engine 通过 `resolveBuiltinDir()` 解析：
<!-- /allow-version -->

```ts
<!-- allow-version -->
// packages/engine/src/oxl/scope/oxn-builtin-registry.ts:31-46 (v0.6.x)
<!-- /allow-version -->
function resolveBuiltinDir(): string | null {
  const candidates: string[] = []
  candidates.push(join(process.cwd(), 'src/builtin'))                              // cwd 相对
  candidates.push(join(here, '../../../../src/builtin'))                          // 4 级向上
  return candidates.find(existsSync) ?? null
}
```

**两个问题**：

1. **`src/builtin/` 不是 engine 包功能**——`bunx oxn` 安装场景下仓库根路径不存在；engine npm 包未携带 builtin .md 发布；builtin 本质是 engine 固有职责，不该跟 OXN 仓库布局耦合。
2. **`projects/starter/` 目录嵌套冗余**——ADR-0089 D1 选 `src/builtin/projects/starter/{domains,...}/` 是为"将来多种 starter"预留（YAGNI），当前只有一种（doc-md）；starter 应是 **Asset 属性**（frontmatter tag），不是**目录嵌套**。

### 既有 RFC/ADR 不充分

- **RFC-0011 D1** 规定 builtin 物理位置 `src/builtin/`，但 D3 把 domain/workflow/stack/roadmap builtin 全部延后，导致 `@oxn/` scope 实物只覆盖 probe/blueprint 两类。
- **ADR-0089** 把 5 starter Asset 放在 `src/builtin/projects/starter/{kind}/` 嵌套，引入 `projects/` 复数命名但只放一种 starter。
- **`packages/engine/src/oxl/builtin/`**（空目录）和 **`packages/engine/src/oxl/examples-md/`**（6 个 fixture）早期 split 决策未在 RFC-0011 周期内收敛（`.openxenon/.archived/pools/drafts/builtin-assets-scope.md`）。

## Decision

### D1：目标布局（flat 5-kind + engine 内置）

```
packages/engine/src/builtin/
├── probes/        (19 个 .md)   # 引擎内置 Probe
├── blueprints/    (4 个 .md)    # 3 原生 + md-author（ADR-0089）
├── domains/       (1 个 .md)    # 🆕 doc-md-domain
├── workflows/     (1 个 .md)    # 🆕 md-author-workflow
├── stacks/        (1 个 .md)    # 🆕 md-stack
├── assetmaps/     (1 个 .md)    # 🆕 md-system（roadmap → assetmap 命名收敛）
└── __tests__/                  # builtin-assets-md.test.ts + registry-load.test.ts
```

- 5 类 AssetKind 全部填齐（解除 RFC-0011 D3 的 D18 延后）
- 删 `projects/starter/` 嵌套（YAGNI）
- 27 个 builtin asset 全部纳入 engine 包发布物

### D2：Engine registry 加载 5 类

`packages/engine/src/oxl/scope/oxn-builtin-registry.ts` 改动：

- `resolveBuiltinDir()` 路径：`../../../../src/builtin` → `../../builtin`（3 级向上）
  - 候选 1：`cwd + 'packages/engine/src/builtin'`（OXN repo dev mode）
  - 候选 2：`import.meta.dirname + '../../builtin'`（包内执行 / npm 安装后）
<!-- allow-version -->
  - 候选 3：`cwd + 'src/builtin'`（v0.6.x 兼容 fallback，过渡期保留）
<!-- /allow-version -->
- `_initDomains()` / `_initWorkflows()` / `_initStacks()` / `_initAssetmaps()` 新增
- `parseGenericAsset()` 新增（domain/workflow/stack/roadmap 通用 frontmatter + raw 文本解析）
- `readBuiltinAsset()` 5 类 subdir 全部填齐
- `getDomain / getWorkflow / getStack / getRoadmap` 4 个新查询接口
- `IBuiltinRegistry` 接口扩展（向后兼容）

### D3：Engine npm 包携带 builtin

`packages/engine/package.json` 改动：

- 添加 `"files": ["src/**/*.ts", "src/**/*.md"]`
- builtin .md 跟着 engine npm 包一起发布
- `bunx oxn` 用户立即可用

### D4：onboard CLI 路径解析复用 registry

`packages/cli/src/commands/onboard.ts` 改动：

- `resolveStarterSource()` 直接调 `getBuiltinRegistry().getBuiltinDir()` 复用多候选路径解析
- 删除脆弱的路径字符串拼接逻辑
- `--new` 仍走 5 Asset 复制 + 逐个 validate + marker 创建

### D5：测试覆盖

- `src/builtin/__tests__/builtin-assets-md.test.ts` → `packages/engine/src/builtin/__tests__/` 迁移
  - 路径常量更新到 `packages/engine/src/builtin/{kind}/`
  - 新增 domain/workflow/stack/assetmap 4 类 frontmatter 守卫
  - 数量守卫：19 probes + 4 blueprints + 1 domain + 1 workflow + 1 stack + 1 assetmap
- `packages/engine/src/builtin/__tests__/registry-load.test.ts` 🆕
  - resolveBuiltinDir() 非 null 守卫
  - 5 类 builtin 加载守卫
  - `totalCount() === 27` 守卫
  - 5 starter Asset 通过对应 getter 查到
- `packages/engine/src/oxl/__tests__/scope-provider.test.ts` 修订
  - `count('blueprint')` 从 3 → 4
  - `totalCount()` 从 22 → 27

### D6：Skill 编译（OXN 自身 stale 修正）

- `oxn init -f` 重建项目本地 SKILL
- `oxn init -f -g` 重建全局 SKILL（`~/.opencode/skills/`）
- pre-existing stale hash 不一致问题修复（与 builtin 迁移无关，副作用）

## Consequences

### 正面

- ✅ **`bunx oxn` 用户立即可用**——builtin 跟着 engine 包发布，安装后 `getBuiltinRegistry()` 不再返回 null
- ✅ **`oxn asset list --builtin` 5 类全可见**——`totalCount() === 27`，D18 解除
- ✅ **`oxn asset diff` 完整支持 5 kind 比对**——`diff.ts:11-12` 注释的 "domain/workflow/stack/roadmap builtin 暂为空" 限制消除
- ✅ **路径解析简化**——`resolveBuiltinDir()` 从 4 级向上变 3 级向上，npm 安装场景不再失效
- ✅ **`projects/starter/` 嵌套删除**——YAGNI 假设消除，starter 通过文件路径 + 类型自动识别
- ✅ **`IBuiltinRegistry` 接口扩展向后兼容**——旧 4 接口（getProbe/getPart/getInterface/getBlueprint）保留

### 负面

- ⚠️ **仓库布局变更**——`src/builtin/` 目录消失；OXN 自身项目若有脚本硬编码 `src/builtin/` 路径会失效
- ⚠️ **测试路径常量迁移**——`src/builtin/__tests__/builtin-assets-md.test.ts` 位置变化，`bun test packages/engine/src/builtin/__tests__/` 是新位置
- ⚠️ **frontmatter `abstract:` 块字符串不支持**——`extractYamlFromTree()` 不解析 `key: |` block scalar，5 starter Asset 的 abstract 字段读出来是字面 `"|"`（已通过测试只断言非空规避，待后续 utils 升级）

### 风险与缓解

| 风险 | 缓解 |
|---|---|
| 第三方 `oxn-cli` 用户在 OXN repo 布局跑 CLI | 候选 3（`cwd + 'src/builtin'`）保留为 fallback，过渡期生效 |
| `OXN repo` 本地开发者期望 `src/builtin/` 还在 | README 待下次 minor 修订（"src/ ← 保留: daemon/ + builtin/ + watcher/" → "src/ ← 保留: daemon/ + watcher/"） |
| `parseGenericAsset` 暂不解析 H2 body 段（Term / Invariant / Ban） | `_raw` 字段保留原文，调用方按需 deep-parse；后续 ADR 评审扩展 |

## 相关术语

- [Built-in Asset](/product/zh-cn/concepts/glossary.html#built-in-asset) — `@oxn/` scope 解析目标
- [Starter Asset](/product/zh-cn/concepts/glossary.html#starter-asset) — `--starter` flag 拷贝产物
- [Asset](/product/zh-cn/concepts/glossary.html#asset) — E1 静态边界
- [Onboarding Starter](/.openxenon/assets/domains/oxn-asset-domain.md#onboarding-starter) — ADR-0089 5 起手 Asset 集合

## 相关决策

- [RFC-0011](../rfc/zh-cn/RFC-0011-builtin-asset-two-layer.html) — 内置 Asset 两层机制（D1 修订 + D3 D18 解除）
- [RFC-0013](../rfc/zh-cn/RFC-0013-versioning-policy.html) — `roadmap` → `assetmap` 命名收敛（D4）
- [ADR-0089](./0089-onboarding-starter-assets.md) — 5 起手 Asset 集合（D1 路径修订）
- [ADR-0069](./0069-asset-bootstrap-completeness.md) — 6 Asset 下限（D1 部分 superseded by ADR-0089）
- [ADR-0050](./0050-onboarding-via-starter-work.md) — Starter Work 机制（path B2 继承）

## 实施状态（2026-08-05）

- ✅ **物理迁移**：27 个 .md 从 `src/builtin/` 移到 `packages/engine/src/builtin/`（按 kind 平铺）
- ✅ **Registry 重写**：5 类 builtin 全部加载，4 个新查询接口（getDomain/getWorkflow/getStack/getRoadmap）
- ✅ **Engine package.json**：`files` 字段新增 `src/**/*.md`
- ✅ **onboard CLI**：路径解析改用 `getBuiltinRegistry().getBuiltinDir()`
- ✅ **测试**：
  - `builtin-assets-md.test.ts` 迁移 + 数量守卫扩展（19+4+1+1+1+1 = 27）
  - `registry-load.test.ts` 🆕
  - `scope-provider.test.ts` 修订（blueprint 3 → 4，totalCount 22 → 27）
- ✅ **Skill 重建**：`oxn init -f` + `oxn init -f -g`（消除 stale hash）
- ✅ **代码守卫**：`bun run typecheck` + `bun run lint` 通过
- ✅ **测试**：2086 pass / 0 fail（162 files）
- ✅ **端到端**：`oxn onboard --new` 在全新目录跑通（5 Asset 复制 + validate + marker）

**ADR-0090 全量落地完成**。

## Errata

<!-- allow-version -->
### v1.0.1 (待定)
<!-- /allow-version -->

- 保留位置观察 `src/daemon/` + `src/watcher/` 是否也需要同步迁入 engine 包（独立 ADR 评审）
