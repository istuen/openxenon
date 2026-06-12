## 1. Schema 层修复

- [x] 1.1 修改 `src/kernel/schemas/probe.ts` ProbeTypeSchema 枚举值
  - `fs_content_match` → `fs_match`
  - `exec_exit_zero` → `shell_exec`
  - 新增 `fs_not_exists`
- [x] 1.2 修改 `FsContentMatchParamsSchema` → `FsMatchParamsSchema`
  - 参数 `path` → `pattern`
  - 新增 `contains` 参数
- [x] 1.3 更新 `ProbeParamsSchema` union 中的引用

## 2. Infra 层修复

- [x] 2.1 修复 `src/infra/probes/shell-exec.ts` isAbsolute bug
  - `shell: true` 时直接传 command，不做 join
- [x] 2.2 为 shell-exec 添加 30 秒默认 timeout
  - 使用 `setTimeout` + `proc.kill()`
- [x] 2.3 验证 `fs_match` handler 参数处理正确（pattern + contains）

## 3. Arsenal YAML 同步

- [x] 3.1 更新 `src/arsenals/probes/fs-match/canonical.yaml`
  - 确认参数名为 `pattern` 和 `patterns`（如有）
- [x] 3.2 更新 `src/arsenals/probes/shell-exec/canonical.yaml`
  - 确认 type 为 `shell_exec`

## 4. Spec 更新

- [x] 4.1 创建 `openspec/specs/probe-type-schema/spec.md`
- [x] 4.2 创建 `openspec/specs/kernel-schema-tests/spec.delta.md`

## 5. 验证

- [x] 5.1 运行 `pnpm build` 确保编译通过
- [x] 5.2 运行现有测试确保无回归
- [x] 5.3 手动测试 task verify 流程
