## 1. 修改 forge.ts

- [x] 1.1 添加 `save`, `name`, `global` 参数
- [x] 1.2 实现 `--save` 模式的 YAML 保存逻辑
- [x] 1.3 JSON 格式输出 `{ ok, data, error }`
- [x] 1.4 测试 `oxn forge --help`

## 2. 重写 task.ts

- [x] 2.1 实现 `submit` 子命令（读 blueprint 文件 → POST /api/v1/task/submit）
- [x] 2.2 实现 `next` 子命令（GET /api/v1/task/next）
- [x] 2.3 实现 `verify` 子命令（POST /api/v1/step/verify）
- [x] 2.4 所有子命令 JSON 格式输出
- [x] 2.5 测试 `oxn task --help`

## 3. 修改 Skills

- [x] 3.1 更新 `oxn-task.ts` instruction（指向真实命令）
- [x] 3.2 更新 `oxn-forge.ts` instruction（加 --save 用法）
- [x] 3.3 更新 `oxn-init.ts` instruction（oxn status → oxn daemon status）
- [x] 3.4 更新 `oxn-status.ts` instruction（oxn api → oxn task）

## 4. 验证

- [x] 4.1 `pnpm run typecheck`
- [x] 4.2 `pnpm run build`
- [x] 4.3 手动测试 forge --save
- [x] 4.4 手动测试 task submit/next/verify