## 1. 分析 fs-execute.ts 的 executeProbe

- [ ] 1.1 读取 `src/daemon/ipc/handlers/fs-execute.ts`
- [ ] 1.2 确认本地 executeProbe 函数位置（line 215）
- [ ] 1.3 确认调用的地方（handleExecuteTask line 91, handleExecuteStep line 149）

## 2. 修改 executeProbe 使用 infra handlers

- [ ] 2.1 导入 `getProbeHandler` 从 `infra/probes`
- [ ] 2.2 导入 `evaluateProbe` 从 `kernel/probes/evaluator`
- [ ] 2.3 重写 executeProbe:
  - 调用 infra handler
  - 调用 kernel evaluateProbe
  - 返回 verdict

## 3. 处理 probe 类型映射

- [ ] 3.1 `fs_content_match` → `fs_match`: 解析 `file:regex` 模式
- [ ] 3.2 `exec_exit_zero` → `shell_exec`: 直接用 command

## 4. 移除死代码

- [ ] 4.1 删除 `executeFsExistsProbe` (line 228)
- [ ] 4.2 删除 `executeFsContentMatchProbe` (line 236)
- [ ] 4.3 删除 `executeExecExitZeroProbe` (line 260)
- [ ] 4.4 删除本地 `ProbeResult` interface (line 209)

## 5. 验证

- [ ] 5.1 `pnpm run typecheck` 通过
- [ ] 5.2 `pnpm build` 通过