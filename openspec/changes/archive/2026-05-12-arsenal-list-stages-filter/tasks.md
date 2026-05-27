## 1. arsenal-list.ts 新增参数

- [x] 1.1 添加 `--type` 参数，支持 `probe`、`proof`、`stage`、`blueprint` 值
- [x] 1.2 添加 `--scope` 参数，支持 `project`、`global`、`builtin`、`fallback` 值
- [x] 1.3 修改 `listStandards` 调用，根据 `--type` 过滤结果

## 2. loader.ts stages 扫描修复

- [x] 2.1 检查 `scanNewStructure` 中 stages 类型扫描逻辑
- [x] 2.2 修复 stages 目录结构重叠问题
- [x] 2.3 验证 `oxn arsenal list --type stage` 显示所有 stages

## 3. 验证

- [x] 3.1 执行 `oxn arsenal list` 确认 stages 资产显示
- [x] 3.2 执行 `oxn arsenal list --type stage` 确认类型过滤生效
- [x] 3.3 执行 `oxn arsenal list --type probe --scope builtin` 确认组合过滤生效
- [x] 3.4 执行 `pnpm typecheck` 确认无类型错误