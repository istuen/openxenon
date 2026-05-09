## 1. 修复 src/arsenals/ 导入路径

- [x] 1.1 修复 `src/arsenals/init.ts`：`./arsenals-paths` → `./paths`
- [x] 1.2 修复 `src/arsenals/loader.ts`：`./project` → `../kernel/lib/project`
- [x] 1.3 修复 `src/arsenals/paths.ts`：`./global` → `../infra/global`

## 2. 删除废弃代码

- [x] 2.1 删除 `src/cli/api/` 目录（13 个废弃文件）

## 3. 修复引用已删除模块的代码

- [x] 3.1 修复 `src/cli/task.ts`：移除对已删除 `./api/*` 的子命令引用

## 4. 验证

- [ ] 4.1 运行 `pnpm build` 确认构建成功
- [ ] 4.2 运行 `pnpm run typecheck` 确认无类型错误