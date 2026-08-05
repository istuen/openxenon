# Design: builtin 资产迁移至 packages/engine/src/builtin/

> **DraftType**: design
> **Status**: 🟡 Draft（待执行）
> **Date**: 2026-08-05
> **Author**: issac + opencode (grilling session)
> **Decision Source**: 2026-08-05 `/grilling` session — Q1=A, Q2=C, Q3=E, Q4=G, Q5=I 组合

## Context

v0.6.x 起 `src/builtin/` 是 OXN 仓库根的"种子资产"目录（27 个 .md：19 probes + 3 blueprints + 5 starter templates），承载 RFC-0011 D1 的 `@oxn/` scope 物理位置。

**两个问题**：

1. **`src/builtin/` 不属于 engine 包**——`bunx oxn` 用户拿不到 builtin assets（`resolveBuiltinDir()` 4 级向上到 repo 根，在 npm 安装后路径不存在）。这是 OXN **仓库布局**，不是 engine **包功能**。
2. **`projects/starter/` 目录嵌套冗余**——ADR-0089 D1 选 `src/builtin/projects/starter/{domains,workflows,...}/` 是为"将来多种 starter"预留，但当前只有一种（doc-md）；starter 应是 **Asset 属性**（frontmatter tag），不是**目录嵌套**。

## Decision（Q1=A + Q2=C + Q3=E + Q4=G + Q5=I）

### D1：目标布局（flat 5-kind）

```
packages/engine/src/
├── ... (现有 kernel/ oxl/ infra/ Asset/ ...)
└── builtin/                          # 🆕 engine 自带资产库
    ├── probes/        (19 个 .md)   # 引擎内置 Probe
    ├── blueprints/    (3 个 .md)    # 引擎内置 Blueprint
    ├── domains/       (1 个 .md)    # 🆕 doc-md-domain.md
    ├── workflows/     (1 个 .md)    # 🆕 md-author-workflow.md
    ├── stacks/        (1 个 .md)    # 🆕 md-stack.md
    └── assetmaps/     (1 个 .md)    # 🆕 md-system.md
```

- 5 类 kind 全部填齐（解除 RFC-0011 D3 的 D18 延后）
- 删 `projects/starter/` 嵌套（YAGNI）
- "starter" 改为 frontmatter `tags: [starter]` 标记

### D2：Engine registry 加载 5 类

`packages/engine/src/oxl/scope/oxn-builtin-registry.ts`：

- `resolveBuiltinDir()` 路径：`../../../../src/builtin` → `../../builtin`（3 级向上）
- `readBuiltinAsset()` 5 类 kind subdir 全部填入
- `listByType()` 5 类全部支持

### D3：Engine npm 包携带 builtin

`packages/engine/package.json`：

- 添加 `"files": ["src/**/*"]`
- builtin .md 跟着 engine npm 包一起发布

### D4：onboard CLI 路径候选更新

`packages/cli/src/commands/onboard.ts`：

- 路径候选列表改为 `packages/engine/src/builtin/`（不再有 `projects/starter/`）
- 5 Asset 按 kind 平铺复制

### D5：测试覆盖

- `src/builtin/__tests__/builtin-assets-md.test.ts` → `packages/engine/src/builtin/__tests__/`
- 加 `engine/src/builtin/__tests__/registry-load.test.ts`：验证 27 个文件全被 registry 加载

### D6：文档同步

- `docs/adrs/0089-onboarding-starter-assets.md` D1：修订路径
- `docs/rfc/zh-cn/RFC-0011-builtin-asset-two-layer.md` D1/D3：修订物理位置 + 解除 D18
- `CONTEXT-MAP.md`：builtin 两层机制说明同步

## 改动清单（执行步骤）

| # | 路径 | 改动 |
|---|---|---|
| 1 | `src/builtin/projects/starter/domains/doc-md-domain.md` | `mv` → `packages/engine/src/builtin/domains/` |
| 2 | `src/builtin/projects/starter/workflows/md-author-workflow.md` | `mv` → `packages/engine/src/builtin/workflows/` |
| 3 | `src/builtin/projects/starter/stacks/md-stack.md` | `mv` → `packages/engine/src/builtin/stacks/` |
| 4 | `src/builtin/projects/starter/blueprints/md-author-blueprint.md` | `mv` → `packages/engine/src/builtin/blueprints/` |
| 5 | `src/builtin/projects/starter/assetmaps/md-system.md` | `mv` → `packages/engine/src/builtin/assetmaps/` |
| 6 | `src/builtin/projects/starter/` | `rmdir` 空目录 |
| 7 | `src/builtin/probes/*.md` (19) | `mv` → `packages/engine/src/builtin/probes/` |
| 8 | `src/builtin/blueprints/*.md` (3) | `mv` → `packages/engine/src/builtin/blueprints/` |
| 9 | `src/builtin/__tests__/builtin-assets-md.test.ts` | `mv` + 路径常量更新 |
| 10 | `src/builtin/blueprints/__tests__/` | `rmdir` 空目录 |
| 11 | `src/builtin/` | `rmdir` 空目录 |
| 12 | `packages/engine/src/oxl/scope/oxn-builtin-registry.ts` | `resolveBuiltinDir()` 路径 + `readBuiltinAsset` 5 类 + `listByType` 5 类 |
| 13 | `packages/engine/package.json` | `"files": ["src/**/*"]` |
| 14 | `packages/cli/src/commands/onboard.ts` | 路径候选列表更新 |
| 15 | `packages/engine/src/builtin/__tests__/registry-load.test.ts` | 🆕 新建：27 文件全加载守卫 |
| 16 | `docs/adrs/0089-onboarding-starter-assets.md` | D1 路径修订 |
| 17 | `docs/rfc/zh-cn/RFC-0011-builtin-asset-two-layer.md` | D1 表格 + D3 解除延后 |
| 18 | `CONTEXT-MAP.md` | 两层机制说明同步 |

## 验收标准

- [ ] `src/builtin/` 目录不再存在（完全迁移）
- [ ] `packages/engine/src/builtin/{probes,blueprints,domains,workflows,stacks,assetmaps}/` 5 类齐全
- [ ] `bun run typecheck` 通过
- [ ] `bun run lint` 通过
- [ ] `bun test packages/engine/src/builtin/__tests__/` 通过
- [ ] `bun test src/builtin/__tests__/` 不再存在（已迁移）
- [ ] `oxn asset list --builtin` 输出 5 类全部 27 个
- [ ] `oxn onboard --new` 在全新目录跑通（5 Asset 复制 + validate + marker）
- [ ] 5 个 starter Asset 包含 `tags: [starter]` frontmatter 标记

## 风险

- `bunx oxn` 路径解析重测（resolveBuiltinDir 候选路径减少）
- `src/daemon/` 和 `src/watcher/` 是否要同时迁入 engine？——**本次 Draft 不涉及**，留单独 ADR 评审

## Promote 路径

执行完成后，**晋升为 ADR-0090**（builtin 物理位置迁移 + 解除 D18 延后）：
- 路径收敛 + ADR-0089 5 starter 落地后的补全
- 跟 RFC-0011 D1/D3 强绑定

## 参考

- RFC-0011: 内置 Asset 两层机制——`@oxn/` fallback + `@prj/` override
- ADR-0089: 项目消费者 Onboarding 统一入口（5 内置起手 Asset）
- ADR-0069: Asset Bootstrap Completeness（被 ADR-0089 部分 superseded）
- ADR-0050: Onboarding via Starter Work（archived，被 ADR-0089 路径 B2 继承）
- `.openxenon/.archived/pools/drafts/builtin-assets-scope.md`: v0.6 builtin split 决策
