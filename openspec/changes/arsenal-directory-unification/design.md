## Context

当前 Arsenal 的物理存储结构是平行的 `forges/` 和 `arsenals/` 顶级目录：

```
.openxenon/
├── arsenals/          ← 正式资产
│   └── blueprints/<name>/canonical.oxn
│   └── parts/<name>.oxn
│   └── probes/<name>.oxn
└── forges/            ← 草稿资产
    └── blueprints/<name>/draft.oxn
    └── parts/<name>.oxn
    └── probes/<name>.oxn
```

这个结构存在三个问题：

1. **统一入口缺失**：`forges/` 和 `arsenals/` 是平行关系，没有统一入口违反了"Arsenal 是单一资产管理域"的原则
2. **state 过滤失效**：`loadStandardByName` 先查 canonical 再查 draft，可能意外返回草稿资产
3. **命名不一致**：架构文档用 `drafts/` (复数)，代码用 `draft/` (单数)

## Goals / Non-Goals

**Goals:**
- 统一 Arsenal 物理入口到 `arsenal/` 目录
- 合并 `forges/` 和 `arsenals/` 为单一 `arsenal/` 入口
- 添加 state 过滤能力到 `loadStandardByName`
- 保持向前兼容，提供迁移脚本

**Non-Goals:**
- 不修改 Arsenal 的抽象接口（`loadStandardByName` 签名可以扩展，但行为要兼容）
- 不修改 Task/Work 的执行逻辑（只改存储结构）
- 不修改 OXN DSL 语法

## Decisions

### Decision 1: 统一入口结构

**选择**：将 `forges/` 和 `arsenals/` 合并到 `arsenal/` 下，draft 状态嵌套在类型内部

```
.openxenon/arsenal/
├── blueprints/
│   ├── drafts/<name>/draft.oxn     ← Forge 产物
│   └── <name>/canonical.oxn        ← Promote 产物
├── parts/
│   ├── drafts/<name>.oxn           ← Forge 产物
│   └── <name>.oxn                  ← Promote 产物
└── probes/
    ├── drafts/<name>.oxn           ← Forge 产物
    └── <name>.oxn                  ← Promote 产物
```

**理由**：
- 类型是第一分类维度，状态是第二维度（嵌套）
- 开发者找资产第一反应是"找 Part"，不是"找 Draft"
- 与 `work/<type>/<id>/` 的类型优先结构呼应

**替代方案**：
- 状态优先（`drafts/parts/`）→ 违背开发者直觉
- 保持平行结构 → 违背统一入口原则

### Decision 2: 路径常量重构

**选择**：移除 `GLOBAL_FORGES_ROOT`，统一使用 `GLOBAL_ARSENAL_ROOT/drafts/`

修改 `infra/paths.ts`：
```typescript
// 移除
// export const GLOBAL_FORGES_ROOT = join(GLOBAL_BOUNDARY, 'forges')

// 新增
export const GLOBAL_ARSENAL_ROOT = join(GLOBAL_BOUNDARY, 'arsenal')
```

修改 `arsenals/paths.ts`：
```typescript
// 移除 GLOBAL_FORGES_* 常量
// 调整 getArsenalsPath 返回 'arsenal' 而非 'arsenals'
```

### Decision 3: `loadStandardByName` 添加 state 过滤

**选择**：添加 `options.state` 参数，默认只返回 canonical

```typescript
export function loadStandardByName(
  scope: Scope,
  projectBoundary: string | undefined,
  name: string,
  type: AssetType,
  options?: {
    state?: 'canonical' | 'draft' | 'both'
  }
): StandardAsset | null
```

**查找顺序**：
- `state='canonical'` → 只查 `arsenal/<type>/<name>.oxn` 和 `arsenal/<type>/<name>/canonical.oxn`
- `state='draft'` → 只查 `arsenal/<type>/drafts/<name>.oxn`
- `state='both'` → 两个都查

### Decision 4: `promoter.ts` 路径替换逻辑

**选择**：重构 `promoteToCanonical` 的路径判断逻辑

当前：
```typescript
const isForgeFormat = fromPath.includes('/forges/')
const newDir = fromPath.replace('/forges/', '/arsenals/')
```

新：
```typescript
const isDraftFormat = fromPath.includes('/drafts/')
const newDir = fromPath.replace('/drafts/', '/')
```

从 `drafts/` 目录移动到正式的 `<type>/` 目录。

### Decision 5: Forge 写入路径调整

**选择**：`forge.ts` 写入路径改为 `drafts/` 嵌套

```typescript
// 当前
return join(projectBoundary, 'forges', type, name, `draft.${ext}`)

// 新
return join(projectBoundary, 'arsenal', type, 'drafts', name, `draft.${ext}`)
```

## Risks / Trade-offs

[Risk] 迁移期间 Task/Work 可能读到旧路径的资产
→ **Mitigation**：迁移脚本先复制再删除，确保原子性

[Risk] `loadStandardByName` 默认行为变更可能破坏现有调用
→ **Mitigation**：默认 `state='both'` 保持兼容，显式传 `state='canonical'` 才严格过滤

[Risk] 路径判断使用字符串包含而非结构化数据
→ **Mitigation**：未来可改为 `path.startsWith()` + 常量比较，但当前改动范围已经很大

## Migration Plan

**Phase 1: 路径常量**
- 修改 `infra/paths.ts`：移除 `GLOBAL_FORGES_ROOT`，新增 `GLOBAL_ARSENAL_ROOT`
- 修改 `arsenals/paths.ts`：移除 `GLOBAL_FORGES_*`，调整路径常量

**Phase 2: Forge 写入**
- 修改 `arsenals/forge.ts`：写入路径改为 `drafts/` 嵌套
- 修改 `arsenals/init.ts`：目录创建逻辑

**Phase 3: Promote 迁移**
- 修改 `arsenals/promoter.ts`：路径替换逻辑
- 更新 CLI `arsenal-promote.ts` 和 `global-arsenal-promote.ts`

**Phase 4: Loader 合并**
- 修改 `infra/loader.ts`：合并 `scanForgesDirectory` 到 `scanArsenalsDirectory`
- 添加 `state` 过滤参数到 `loadStandardByName`

**Phase 5: 迁移脚本**
- 更新 `cli/arsenal-migrate.ts`：将旧路径迁移到新路径

**Phase 6: 清理**
- 删除 `GLOBAL_FORGES_*` 的所有引用
- 确认没有 `/forges/` 字符串判断残留

## Open Questions

1. 全局 Arsenal（`~/.openxenon/`）是否同步修改结构？
   - **裁决**：是，全局和项目级保持一致结构

2. 迁移脚本是否需要支持回滚？
   - **裁决**：不需要，迁移前会备份旧路径

3. 现有的 `forges/` 目录是否保留作为软链接兼容？
   - **裁决**：否，直接迁移，不保留兼容层