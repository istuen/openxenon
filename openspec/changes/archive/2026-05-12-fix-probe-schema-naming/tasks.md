## 1. 修改 Schema

- [x] 1.1 修改 `src/kernel/schemas/probe.ts`
  - `ProbeTypeSchema` 添加 `fs_not_exists`
  - `FsContentMatchParamsSchema` 改为 `{ path, contains }`
  - `FsExistsParamsSchema` 保持 `{ pattern }`（不变）
  - `ExecExitZeroParamsSchema` 保持 `{ command }`（不变）

## 2. 修改 oxn-forge references

- [x] 2.1 修改 `probe-format.md`
  - `fs_match` → `fs_content_match`
  - `shell_exec` → `exec_exit_zero`
  - `fs_content_match` 参数：`path` + `contains`（不是 `pattern` + `contains`）

- [x] 2.2 修改 `blueprint-format.md`
  - 同步探针类型名：`fs_content_match`, `exec_exit_zero`
  - 同步参数名：`path` + `contains`

- [x] 2.3 修改 `stage-format.md`
  - 同步探针类型名（如有引用）

## 3. 修改 oxn-task references

- [x] 3.1 修改 `blueprint-format.md`
  - 同步探针类型名和参数名

## 4. 重新编译 Skills

- [x] 4.1 运行 `bun run src/cli.ts init --force` 重新编译

## 5. 验证

- [ ] 5.1 验证 Schema 校验接受新类型名
- [ ] 5.2 验证 Schema 校验拒绝旧类型名
- [ ] 5.3 验证 AI 调用 skill() 后生成符合新 Schema 的 YAML