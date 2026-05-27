## 1. 修复路径引用（arsenal → arsenals）

- [x] 1.1 更新 `src/skills/oxn-forge.ts` 中的路径：`.openxenon/arsenal/` → `.openxenon/arsenals/`
- [x] 1.2 更新 `src/commands/arsenal-inspect.ts` 中的路径分割

## 2. 修改状态目录为小写

- [x] 2.1 修改 `src/core/standards-paths.ts` 中的 `AssetState` 类型：`'DRAFT'` → `'draft'`
- [x] 2.2 修改 `src/core/standards-paths.ts` 中的目录路径常量（使用小写目录名）
- [x] 2.3 添加向后兼容别名：`DRAFT` = `'draft'`

## 3. 重新编译 Skill

- [x] 3.1 运行 `oxn init --compile-force` 重新编译所有 Skill

## 4. 验证

- [x] 4.1 运行 `pnpm build` 验证构建成功
- [x] 4.2 运行 `pnpm typecheck` 验证类型检查通过