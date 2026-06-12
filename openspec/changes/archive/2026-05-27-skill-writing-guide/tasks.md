## Tasks

### Phase 1: 建立基础规范

- [x] 更新 `oxn-cli/instruction.md` 应用 LAYER 0 规范
  - 变量格式改为 `{{VARIABLE (constraint)}}`
  - 所有 CLI 命令添加 `--json`
  - 添加熔断退出流程

- [x] 更新 `oxn-task/instruction.md` 应用 LAYER 0 规范
  - 同上

- [x] 更新 `oxn-work/instruction.md` 应用 LAYER 0 规范
  - 同上

- [x] 更新 `oxn-forge/instruction.md` 应用 LAYER 0 规范
  - 同上

- [x] 更新 `oxn-plan/instruction.md` 应用 LAYER 0 规范
  - 同上

### Phase 2: 环境准备

- [x] 确认 `oxn init` 创建 `.openxenon/error/skills/` 目录
  - 已在 `src/cli/init.ts` 中添加 `error/skills` 目录创建逻辑

### Phase 3: 验证

- [x] 验证各 Skill 文件语法正确
- [x] 验证熔断报告格式符合规范
- [x] 验证变量占位符格式符合规范

## Progress

| Phase | Status |
|-------|--------|
| Phase 1: 基础规范 | ✅ 完成 |
| Phase 2: 环境准备 | ✅ 完成 |
| Phase 3: 验证 | ✅ 完成 |