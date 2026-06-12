## 1. 修改 init 命令

- [x] 1.1 修改 `src/commands/init.ts` 中 `--force` 参数的 description
- [x] 1.2 修改 `src/commands/init.ts` 中 `compileForce` 的赋值逻辑：`force || compileForce`

## 2. 验证

- [x] 2.1 运行 `pnpm build` 验证构建成功
- [x] 2.2 运行 `pnpm typecheck` 验证类型检查通过