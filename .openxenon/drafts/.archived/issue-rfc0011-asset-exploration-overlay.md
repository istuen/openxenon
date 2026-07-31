# Issue: RFC-0011 双层机制对 `oxn asset` CLI 不可见

- **DraftType**: issue（问题记录）
- **优先级**: P2 设计（牵涉 RFC-0011 全量落地）
- **修复成本**: L（RFC 全量 + 新增命令）
- **关联**: `design-asset-exploration-ux-overview.md` §5 v0.7.0 设计期；阻塞 I-5

## 1. 问题

RFC-0011（`docs/rfc/zh-cn/RFC-0011-builtin-asset-two-layer.md`）定义了：

| Layer | Scope | Location | Priority |
|---|---|---|---|
| 内置 fallback | `@oxn/` | `src/builtin/` | 低 |
| 项目 override | `@prj/` | `.openxenon/assets/` | 高 |

但**实现范围被 RFC 自身收窄**：

> RFC-0011 §"明确范围"：当前仅落地到 built-in **probes 和 blueprints**；built-in domain / workflow / stack / roadmap 推迟。

并且**实现细节**与 RFC 描述不一致：

1. `@oxn` / `@prj` 是**显式 scope 分支**（`oxn-scope.ts:93-119`），不是**同名自动覆盖链**——`@oxn/foo` 永远查 builtin，**不**先试 `.openxenon/assets/foo` 是否存在
2. Work blueprint resolver 在 v1 显式拒绝 `@oxn` 引用（`Work/per-work-blueprints-merger.ts:167-180` 报 `@oxn/ scope has no builtin blueprint registry (V1)`）
3. **`oxn asset list/show/validate` 完全不读 scope**——builtin 资产永远不出现在 list 输出，无 `scope` / `source` / `overrides` / `shadowedBy` 字段

## 2. 影响

- 用户无法用 `oxn asset` 列出"effective" 资产（含 builtin fallback）
- 用户无法知道某个项目资产是否覆盖了 builtin
- 用户无法用 `oxn asset diff` 对比项目 vs builtin 默认（该命令本就不存在）
- 物理内置目录 `src/builtin/` 只有 `probes/` + `blueprints/`，其他 3 类无 builtin 概念，**RFC 与实现分裂**

## 3. 根因

- RFC-0011 范围与实现范围未对齐（文档说全部 5 类，代码只 2 类）
- `oxn-builtin-registry.ts:26-49` 的扫描逻辑写死 `probes/` + `blueprints/`，其他 3 类目录不存在
- Asset 命令族（`packages/engine/src/Asset/`）与 OXL scope 模块（`packages/engine/src/oxl/scope/`）未打通——前者是 v0.6 新写的浅扫 wrapper，后者是老的 scope resolver

## 4. 修复方向

### Phase 1：补齐 RFC 与实现的范围声明

更新 RFC-0011 §"明确范围"，把现状明确写成 v0.6.2 partial：
- v0.6.2 实际落地：probe + blueprint
- v0.7.0 计划扩展：domain / workflow / stack / roadmap
- builtin registry 扫目录顺序统一为 5 类（即使当前只有 2 类有内容）

### Phase 2：打通 `oxn asset` 与 scope 解析

新增命令：
```
oxn asset list [--scope oxn|prj|effective] [--json]
oxn asset show <name> --kind X [--scope oxn|prj|effective]
```

修改 `packages/engine/src/Asset/list.ts`：在 list 项加 `scope: "oxn" | "prj"` 字段，`effective` 模式去重（`@prj/foo` 覆盖 `@oxn/foo`）。

### Phase 3：补全 builtin registry 5 类目录

`src/builtin/` 下新建空目录：
```
src/builtin/domains/
src/builtin/workflows/
src/builtin/stacks/
src/builtin/roadmaps/
```

即使当前空，也要让 builtin registry 统一扫 5 类。

### Phase 4：修复 Work blueprint resolver 的 v1 限制

`Work/per-work-blueprints-merger.ts:167-180` 移除 `@oxn/ scope has no builtin blueprint registry (V1)` 限制，让 blueprint Work 能引用 `@oxn/<blueprint-name>`。

## 5. 验证

```bash
# Phase 1
grep "明确范围" docs/rfc/zh-cn/RFC-0011-builtin-asset-two-layer.md

# Phase 2
oxn asset list --scope effective --json
# 期望每个项目 Asset 项含 scope 字段

# Phase 3
ls src/builtin/
# 期望看到 probes/ blueprints/ domains/ workflows/ stacks/ roadmaps/ 五个

# Phase 4
oxn work create test-builtin-blueprint --blueprint @oxn/<some-builtin-blueprint>
# 期望能成功解析，不报 V1 限制
```

## 6. Promote 路径

- RFC errata 段追加（v0.7.0 范围扩展计划）→ 直接编辑 RFC-0011
- Doc(dev) 同步：`oxn work create --blueprint doc-dev-workflow` → `docs/dev/zh-cn/builtin-asset-scope.md`
- 实际修复走 v0.7.0 大版本，4 个 phase 串行
- changelog `.changes/0-7-0-rfc0011-full-rollout.md`

## 7. 阻塞关系

- 阻塞 I-5（`assetRoot` 被忽略）：overlay 设计需先理解 `assetRoot` 在两层机制中的角色
- 阻塞 I-6 的 `oxn asset diff`：diff 的"基线"就是 builtin