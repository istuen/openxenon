## 1. 重命名 work init → work new

- [x] 1.1 在 `src/cli/work.ts` 中将 `init` 子命令重命名为 `new`
- [x] 1.2 更新 help text 中的命令描述
- [x] 1.3 添加 `init` 命令作为废弃 alias，显示弃用提示

## 2. 实现 work resume 命令

- [x] 2.1 创建 `src/cli/work-resume.ts` 实现恢复逻辑
- [x] 2.2 读取 `.openxenon/work/<type>/<work-id>/state.json` 获取状态
- [x] 2.3 遍历 parts 找到下一个未完成的 part
- [x] 2.4 返回 slot 名称和 deps 状态
- [x] 2.5 在 `src/cli/work.ts` 中注册 `resume` 子命令

## 3. 实现 work complete 命令

- [x] 3.1 创建 `src/cli/work-complete.ts` 实现完成逻辑
- [x] 3.2 更新 `state.json` 中 status 为 "completed"
- [x] 3.3 添加完成时间戳（可选）
- [x] 3.4 在 `src/cli/work.ts` 中注册 `complete` 子命令

## 4. 验证与测试

- [x] 4.1 运行 `bun test` 确保所有测试通过
- [x] 4.2 手动测试 `work new`、`work resume`、`work complete`