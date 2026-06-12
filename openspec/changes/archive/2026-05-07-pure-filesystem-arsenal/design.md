## Context

### 背景现状

当前 `StandardAsset` 接口包含 `state: AssetState` 字段：

```typescript
// arsenals-loader.ts:9-15
export interface StandardAsset {
  name: string
  type: AssetType
  state: AssetState      // ← 从路径派生，但被当作独立字段使用
  path: string
  content: string
}
```

状态在 `loadStandardByPath()` 时从路径派生：

```typescript
// arsenals-loader.ts:146-150
if (assetPath.includes('/draft/')) {
  state = 'draft'
} else if (assetPath.includes('/canonical/')) {
  state = 'canonical'
}
```

但随后在晋升验证时，代码又用 `asset.state` 做检查：

```typescript
// arsenals-loader.ts:175-177
if (asset.state !== 'draft') {
  throw new Error(`Asset is not in draft state: ${fromPath}`)
}
```

这是冗余的——如果我们已经知道 `asset.path`，直接检查路径即可，不需要先派生 state 再检查 state。

### 约束条件

- 不能改变现有的目录结构（`draft/`, `canonical/` 保持原样）
- `StandardAsset.state` 字段可以保留（用于 UI 展示），但不能再用于业务逻辑校验
- 晋升操作的本质是 `renameSync()`，不涉及数据库或状态文件

---

## Goals / Non-Goals

**Goals:**
- 移除晋升时的冗余 state 字段检查
- 纯化"状态由路径决定"这一约束

**Non-Goals:**
- 不删除 `StandardAsset.state` 字段（保留用于展示）
- 不改变 Arsenal 的目录结构
- 不实现复杂的状态机逻辑

---

## Decisions

### Decision 1: 路径检查替代字段检查

**当前代码**（`arsenal-promote.ts:68-72`）：
```typescript
if (asset.state !== 'draft') {
  console.error('Only draft assets can be promoted.')
  return
}
```

**修改后**：
```typescript
if (!asset.path.includes('/draft/')) {
  console.error('Only draft assets can be promoted.')
  return
}
```

**当前代码**（`arsenals-loader.ts:175-177`）：
```typescript
if (asset.state !== 'draft') {
  throw new Error(`Asset is not in draft state: ${fromPath}`)
}
```

**修改后**：
```typescript
if (!fromPath.includes('/draft/')) {
  throw new Error(`Asset is not in draft state: ${fromPath}`)
}
```

---

## Risks / Trade-offs

| Risk | 描述 | Mitigation |
|------|------|------------|
| **路径检查误判** | 如果文件名包含 "draft" 字样（如 `my-draft-plan.yaml`） | 当前只检查 `/draft/`，即目录层级，不是字符串包含 |
| **旧路径格式** | 同时支持 old (`<type>/draft/`) 和 new (`<type>/<name>/draft.yaml`) 格式 | `includes('/draft/')` 对两种格式都有效 |

---

## Open Questions

无。

此变更非常直接，不涉及复杂的架构决策。
