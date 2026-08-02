# Diagnose: fix-asset-list-all-kinds

> **状态**：📦 **归档**：修复已落地（commit d09f217 `feat(asset): RFC-0011 I-3/I-4 落地 — list 全 kind + scope 模式`）；`packages/engine/src/Asset/list.ts:75` 已用 `[...ALL_ASSET_KINDS]` 替代硬编码 3 类；5 类覆盖单测已加。保留作历史溯源。

## 触发条件

```bash
bun run packages/cli/src/index.ts asset list
```

不带 `--kind` 参数。

## 期望 vs 实际

| 维度 | 期望 | 实际 |
|---|---|---|
| 返回 AssetKind 数 | 5（domain/workflow/stack/blueprint/roadmap） | 3（domain/blueprint/stack） |
| 返回 Asset 数 | 31 | 15 |
| 缺漏 | — | workflow（15 个）+ roadmap（1 个） |

## 根因定位

文件：`packages/engine/src/Asset/list.ts:25-31`

```ts
// 硬编码 3 类
['domain', 'blueprint', 'stack'].forEach((kind) => { ... })
```

未使用完整的 `ALL_ASSET_KINDS` 枚举（定义在 `packages/engine/src/infra/paths.ts:87-101`）。

## 对比验证

带 `--kind` 时正常：
```bash
bun run packages/cli/src/index.ts asset list --kind workflow   # 15
bun run packages/cli/src/index.ts asset list --kind roadmap    # 1
```

因为 `list({kind, projectRoot})` 单 kind 路径走 `ALL_ASSET_KINDS`。

## 修复方向

替换硬编码数组为：
```ts
ALL_ASSET_KINDS.forEach((kind) => { ... })
```

加单测覆盖 5 类输出。

## git blame

本次会话首次发现，未提交历史。