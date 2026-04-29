## 1. 创建 daemon 命令

- [x] 1.1 创建 `src/commands/daemon.ts` 主命令文件
- [x] 1.2 实现 `oxn daemon start` 子命令
- [x] 1.3 实现 `oxn daemon stop` 子命令
- [x] 1.4 实现 `oxn daemon status` 子命令
- [x] 1.5 在 `src/cli.ts` 添加 daemon 命令引用

## 2. 创建 draft 命令

- [x] 2.1 创建 `src/commands/draft.ts` 主命令文件
- [x] 2.2 在 `src/cli.ts` 添加 draft 命令引用

## 3. 创建 export 命令

- [x] 3.1 创建 `src/commands/export.ts` 命令文件
- [x] 3.2 实现任务轨迹读取逻辑
- [x] 3.3 实现 --output 参数支持
- [x] 3.4 实现 stdout 输出（无 --output 时）
- [x] 3.5 实现任务不存在错误处理
- [x] 3.6 在 `src/cli.ts` 添加 export 命令引用

## 4. 创建 gc 命令

- [x] 4.1 创建 `src/commands/gc.ts` 命令文件
- [x] 4.2 实现任务目录扫描逻辑
- [x] 4.3 实现 --dry-run 预览模式
- [x] 4.4 实现 --keep 保留策略
- [x] 4.5 在 `src/cli.ts` 添加 gc 命令引用

## 5. 修复 CLI 别名

- [x] 5.1 将 `src/cli.ts` 第 21 行 `standards:` 改为 `arsenal:`

## 6. 验证构建

- [x] 6.1 运行 `pnpm build` 验证构建成功
- [x] 6.2 运行 `pnpm typecheck` 验证类型检查通过（存在预先存在的类型错误）
