## Why

OXN 当前 TaskDeclaration 的设计存在语义模糊：Task/Plan 作为不同的声明类型，但功能上都是对 Blueprint 的实例化，导致语法冗余且扩展性差。需要统一为 WorkDeclaration，通过 `type` 属性区分语义角色，同时为 Blueprint 引入 `type` 系统实现 1:1 绑定校验。

## What Changes

- **新增 `WorkDeclaration`**：替代现有的 `TaskDeclaration` 和 `PlanDeclaration`，通过 `type` 属性区分语义
  - 语法：`work "name" type "task" ref "@prj/bp/task.oxn" { ... }`
- **Blueprint 新增 `type` 字段**：声明 Blueprint 的类型，默认为 `"task"`
  - 语法：`blueprint "bp-name" type "task" { ... }`
- **PartSlotDeclaration 引入 `slot[]` 语法**：表示 slot 可多次实例化
  - 语法：`part slot[] "worker" { deps = [...] }`
- **删除 `TaskDeclaration`**：完全移除，原有功能由 WorkDeclaration 替代
- **外部文件引用循环检测**：外部 .oxn 文件引用深度限制 4 层（Work → Blueprint → Part → Probe）
- **新增 `oxn-work` skill**：复制 `oxn-task`，替换 task → work
- **新增 `work` CLI 指令**：复制 `task` CLI

### Breaking Changes

- **移除 `task` keyword**：TaskDeclaration 删除，`task` 不再作为顶级声明
- **移除 `use` 字段**：原 TaskDeclaration 的 `use` 字段改为 WorkDeclaration 的 `ref` 字段

## Capabilities

### New Capabilities

- `work-declaration`：WorkDeclaration 的完整语法和语义定义
- `blueprint-type-system`：Blueprint 的 type 字段及其与 Work 的 1:1 校验机制
- `multi-instance-slot`：slot[] 语法支持同一 slot 多次实例化
- `work-cli`：work CLI 指令及 oxn-work skill

### Modified Capabilities

- `task-execution`：TaskDeclaration 变更为 WorkDeclaration，需更新相关规范

## Impact

- `src/oxn-dsl/langium/oxn.langium`：Grammar 修改
- `src/oxn-dsl/generated/*.ts`：Langium 自动重新生成
- `src/oxn-dsl/oxn-document-builder.ts`：扩展 ref 收集逻辑
- `src/oxn-dsl/oxn-generator.ts`：convertTaskDeclaration → convertWorkDeclaration
- `src/oxn-dsl/validator/`：新增 type 1:1 校验
- `.opencode/skills/oxn-work/`：新增 skill
- CLI `work` 指令：新增