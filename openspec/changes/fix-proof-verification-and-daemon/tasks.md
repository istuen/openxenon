## 1. Daemon 启动路径修复

- [x] 1.1 修改 `src/commands/daemon.ts` 使用 `import.meta.dir` 获取 server.ts 路径
- [ ] 1.2 测试从任意目录启动 daemon

## 2. Target State 存储

- [x] 2.1 修改 `src/types/playbook.ts` 添加 `targetState?: string` 字段
- [x] 2.2 修改 `src/db/schema/project.ts` 添加 `target_state` 列
- [x] 2.3 修改 `src/db/operations/steps.ts` 支持 target_state
- [x] 2.4 修改 `src/api/handlers/task-submit.ts` 存储 target_state

## 3. Proof 自动执行

- [x] 3.1 创建 `src/api/proof-finder.ts` proof 查找模块
- [x] 3.2 修改 `src/api/handlers/step-verify.ts` 自动查找并执行 proof
- [x] 3.3 proofPath 参数改为可选

## 4. 测试验证

- [ ] 4.1 手动测试：从非 xenonix 目录启动 daemon
- [ ] 4.2 手动测试：提交含 target_state 的 Playbook
- [ ] 4.3 手动测试：不带 proofPath 验证 step
