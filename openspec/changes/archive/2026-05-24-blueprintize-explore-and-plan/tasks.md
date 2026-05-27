## 1. Blueprint 定义

- [x] 1.1 创建 `.openxenon/arsenals/blueprints/explore-flow/canonical.oxn`，定义 scan/qa/report slots
- [x] 1.2 创建 `.openxenon/arsenals/blueprints/plan-flow/canonical.oxn`，定义 analyze/design/estimate/review slots

## 2. Skill Instruction 重写

- [x] 2.1 重写 `src/skills/locales/zh-CN/oxn-explore/instruction.md`，使用 oxn work 命令流程
- [x] 2.2 新建 `src/skills/locales/zh-CN/oxn-plan/instruction.md`，使用 oxn work 命令流程

## 3. Skill Loader 注册

- [x] 3.1 在 `src/skills/loader.ts` 注册 oxn-plan skill

## 4. 兼容层

- [x] 4.1 在 `src/cli/explore-cmd.ts` 标注旧命令为 DEPRECATED（已添加 @deprecated 注释）
- [x] 4.2 验证旧 `oxn explore` 命令与新 `oxn work` 命令数据路径兼容