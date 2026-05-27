## 1. 验证 Ground Truth

- [x] 1.1 确认 src/cli/index.ts 中的 subCommands 列表
- [x] 1.2 确认每个命令的参数定义

## 2. 修正 README.md CLI 速查表

- [x] 2.1 删除不存在的命令（oxn task new、oxn task list 等）
- [x] 2.2 添加实际存在的命令（oxn task submit/next/verify/status）
- [x] 2.3 验证修正后格式正确

## 3. 重写 docs/manual/04-cli-ref.md

- [x] 3.1 只保留实际存在的命令
- [x] 3.2 修正命令参数格式
- [x] 3.3 删除所有"想象中的 API"

## 4. 修正 docs/manual/05-arsenal.md

- [x] 4.1 将 Probe 示例从 Invocation 格式改为 Definition 格式
- [x] 4.2 确保 parameters 包含 description 字段

## 5. 修正 docs/manual/06-troubleshooting.md

- [x] 5.1 将 `oxn standards` 替换为 `oxn arsenal`
- [x] 5.2 验证无遗漏

## 6. 验证

- [x] 6.1 运行 `pnpm typecheck` 确认无报错
- [x] 6.2 对照 src/cli/*.ts 逐个确认文档准确性