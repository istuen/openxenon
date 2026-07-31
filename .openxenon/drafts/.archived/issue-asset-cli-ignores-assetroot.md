# Issue: `oxn asset` 命令族忽略 `.oxnrc` 的 `assetRoot` 配置

- **DraftType**: issue（问题记录）
- **优先级**: P3 配置
- **修复成本**: S（统一传 config 而非 null）
- **关联**: `design-asset-exploration-ux-overview.md` §5 v0.7.0+；被 I-4 阻塞

## 1. 问题

`.oxnrc` 支持自定义 `assetRoot`（可跳出 `.openxenon/`），resolver 也实现了完整路径规则。但 `packages/engine/src/Asset/` 下 6 个调用点**全部传 `config = null`**，导致用户配了 `assetRoot` 完全不生效。

## 2. 受影响调用点

| 文件:行 | 调用 | 是否读 config |
|---|---|---|
| `packages/engine/src/Asset/list.ts:8-10` | `list({kind, projectRoot})` | ❌ null |
| `packages/engine/src/Asset/internal/resolver.ts:21-23` | `resolveAssetDir(config, kind)` | ❌ null |
| `packages/engine/src/Asset/validate.ts:65-72` | DAG scan `resolveAssetDir(config, kind)` | ❌ null |
| `packages/engine/src/Asset/validate.ts:49-83` | validate single Asset `resolveAssetFile(config, kind, name)` | ❌ null |
| `packages/engine/src/Asset/internal/reference-checker.ts:36-43` | reverse-ref scan | ❌ null |
| `packages/engine/src/Asset/internal/reference-checker.ts:36-51` | forward-ref scan | ❌ null |

## 3. 现状根因

### 3.1 resolver 支持到位
`packages/engine/src/infra/paths.ts:103-150` 实现了：
- `assetRoot: "assets"` → `<project>/.openxenon/assets/<kind-dir>`
- `assetRoot: "my-assets"` → `<project>/.openxenon/my-assets/<kind-dir>`
- `assetRoot: "./my-assets"` → `<project>/my-assets/<kind-dir>`（跳出 `.openxenon`）
- 每 kind 单独 `assetDirs.<kind>` 支持绝对路径

### 3.2 调用方未传 config
`Asset/*` 模块的函数签名是 `list({kind, projectRoot})`，**没有 config 参数**。CLI 调用时无 `loadOxnRc()` 注入。

### 3.3 两套配置分裂
- `.oxnrc`：`assetRoot` 由 `oxn config set assetRoot` 写（`config-cmd.ts:42-60`），由 `loadOxnRc()` 读（`infra/oxnrc.ts:73-107`）
- `.openxenon/config.json`：`assetRoot` 在 `ProjectConfig` 类型里（`commands/project.ts:16-22`）

`oxn domain` / `oxn blueprint` 用 `ProjectConfig`；`oxn asset` 用 `loadOxnRc()` 但不传。**两套配置在同一项目里可能指向不同根**——这本身就是 bug。

## 4. 影响

- 用户配 `assetRoot: "./shared-assets"` 期望团队共享资产库，**实际无效果**
- 存量项目搬移 Asset 后，`.oxnrc` 不更新路径，CLI 继续扫空目录
- 与 Domain/Blueprint 命令行为不一致——后者读 `.openxenon/config.json` 的 `assetRoot` 生效

## 5. 修复方向

### 5.1 短期（v0.7.0 内随 I-4 一起）

修改 `Asset/*` 函数签名加 config 参数：

```ts
// list.ts 改为
export function list(opts: { kind?: AssetKind; projectRoot: string; config?: ProjectConfig }): AssetEntry[]
```

调用方改为：
```ts
const config = loadOxnRc(projectRoot) ?? loadProjectConfig(projectRoot);
list({ kind, projectRoot, config });
```

### 5.2 统一两套配置

决定 `.oxnrc` vs `.openxenon/config.json` 谁是 SSOT：
- 选项 X：`.oxnrc` 是 SSOT，`config.json` 是其派生视图（`oxn config set` 写两边）
- 选项 Y：`.openxenon/config.json` 是 SSOT，`.oxnrc` 仅为兼容 alias
- 选项 Z：合并为单一文件

**推荐选项 Y**（`.openxenon/config.json` SSOT，因为 Domain/Blueprint 已经在用，且位于项目目录内更符合"项目资产"语义）。

### 5.3 验证

```bash
# 在 .openxenon/config.json 配 assetRoot
echo '{"assetRoot":"./test-assets"}' > .openxenon/config.json
mkdir -p ./test-assets/workflows && echo "..." > ./test-assets/workflows/test-wf.md

# 修复前
oxn asset list --kind workflow
# 期望：列出 15 个内置 workflow（不含 test-wf）
# 实际：仍读 .openxenon/assets/workflows/，test-wf 不可见

# 修复后
oxn asset list --kind workflow
# 期望：列出 15 + 1（含 test-wf）
```

## 6. Promote 路径

- 修改签名属 breaking change → 走 RFC 拍板
- `oxn work create --blueprint doc-rfc-workflow` → `docs/rfc/zh-cn/RFC-XXXX-asset-config-ssot.md`（统一两套配置）
- 同步 Doc(dev) `docs/dev/zh-cn/configuration.md`
- changelog `.changes/0-7-0-asset-config-unify.md`

## 7. 与其他 issue 的关系

| 关系 | 说明 |
|---|---|
| **被 I-4 阻塞** | RFC-0011 overlay 设计需先定 `assetRoot` 在双层机制中的角色（项目根 vs builtin 根不能混） |
| **与 I-3 独立** | validate 走 compiler dispatch 不依赖 config |
| **与 I-6 部分独立** | tree/unarchive 不依赖 config（仍走默认根），但 diff/migrate 强依赖（要对比 builtin + 项目） |