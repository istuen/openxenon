# restore-arsenals-forges

## What

恢复 `src/arsenals/` 目录结构的正确配置：

1. **重命名** `src/arsenals/standards/` → `src/arsenals/proofs/`
2. **创建** `src/arsenals/forges/` 目录及 4 个 meta 模板:
   - `forges/meta-probe/canonical.yaml`
   - `forges/meta-proof/canonical.yaml`
   - `forges/meta-stage/canonical.yaml`
   - `forges/meta-blueprint/canonical.yaml`
3. **删除** `src/arsenals/arsenal/` 空目录
4. **更新** `src/cli/init.ts` - `META_SOURCE_PATH` 指向 `src/arsenals/forges/`
5. **更新** `src/cli/forge.ts` - 路径指向 `src/arsenals/forges/`
6. **更新** `src/skills/oxn-forge.ts` - 路径指向 `src/arsenals/forges/`
7. **更新** `kernel/constants.ts` - 删除 `FORGES_DIR` 和 `META_DIR`

## Why

在 commit db90e8f 中，架构迁移时错误地删除了 `src/meta/` 目录（包含 Forge 模板），而不是将其迁移到 `src/arsenals/forges/`。

`oxn init` 尝试从 `src/meta/` 复制 Forge 模板到项目，但由于源目录不存在，导致 Forge 功能失效。

## Scope

- `src/arsenals/` 目录结构
- `src/cli/init.ts`
- `src/cli/forge.ts`
- `src/skills/oxn-forge.ts`
- `src/kernel/constants.ts`
- `src/cli/draft.ts` (导入路径更新)

## Out of Scope

- 不修改 `src/arsenals/paths.ts` (运行时路径管理，仍需要)
- 不修改 `src/arsenals/loader.ts` (资产加载逻辑)
- 不修改 `src/arsenals/init.ts` (目录初始化逻辑)

## Dependencies

无

## Verification

```bash
pnpm run typecheck
pnpm build
oxn init --dry-run  # 确认 meta 文件被正确复制
oxn forge probe     # 确认 Forge 约束正确显示
```
