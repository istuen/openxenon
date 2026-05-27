## Context

OXN (OpenXenon Notation) 是 OpenXenon 的领域特定语言，用于声明 Probe、Part、Blueprint 等资产。当前设计存在以下问题：

1. **TaskDeclaration 语义模糊**：`task` 和 `plan` 作为不同的顶级声明，但功能上都是对 Blueprint 的实例化
2. **Blueprint 缺乏类型系统**：无法表达 Blueprint 的语义角色，导致 Work 引用时缺乏校验
3. **Slot 不支持多次实例化**：一个 Blueprint slot 只能被绑定一次，无法表达"多个 worker"的场景

当前架构：
- Langium 语法解析（`.langium`）
- Document Builder 外部文件注入
- Generator 生成中间 IR
- Validator 语义校验

## Goals / Non-Goals

**Goals:**
- 统一 Task/Plan 为 WorkDeclaration，通过 `type` 属性区分语义
- 为 Blueprint 引入 `type` 系统，实现 1:1 绑定校验
- 支持 `part slot[]` 语法，允许同一 slot 多次实例化
- 保持外部引用深度限制 4 层

**Non-Goals:**
- 不修改 Probe/Part 声明的语法
- 不引入 Blueprint 之间的继承/组合机制
- 不实现 Blueprint 的版本管理

## Decisions

### Decision 1: WorkDeclaration 替代 TaskDeclaration + PlanDeclaration

**选择**：统一为 WorkDeclaration，通过 `type` 属性区分

**理由**：
- 减少语法冗余：Task/Plan 功能相同，只是语义标签不同
- 扩展性：新增 `flow` 等类型无需新增声明
- 1:1 校验：type 同名匹配即可，无需白名单

**替代方案考虑**：
- 分开声明（TaskDeclaration + PlanDeclaration）：语法清晰但扩展性差
- 通用 UseDeclaration：更灵活但语义模糊

### Decision 2: Blueprint type 默认值为 "task"

**选择**：不写 type 时默认为 "task"

**理由**：
- 向后兼容：现有 TaskDeclaration 迁移成本最低
- 约定优于配置：大多数 Blueprint 都是 task 类型

### Decision 3: `part slot[]` 语法表示可多次实例化

**选择**：`slot[]` 明确标记基数

**理由**：
- 语法显式：一眼看出该 slot 可多次实例化
- 向后兼容：不带 `[]` 的 slot 默认为单次，与现有行为一致

**替代方案考虑**：
- 隐式宽松：不标记也能多次绑定。**拒绝**：增加理解成本
- `max = N` 约束。**拒绝**：Proposal 阶段不约束

### Decision 4: type 校验为 1:1 同名匹配

**选择**：Work type 必须等于 Blueprint type，无白名单

**理由**：
- 简单直接：同名即匹配，无需维护白名单
- 灵活：用户可自定义 type（如 `flow`、`pipeline`），只需两边一致

### Decision 5: 外部文件引用不引入默认 ref

**选择**：Use/Work 中不提供 ref 时，无默认值

**理由**：
- 显式优于隐式：避免引用错误的资产
- Slot deps 只是依赖声明，不作为默认 ref

### Decision 6: 外部引用深度限制 4 层

**选择**：Work → Blueprint → Part → Probe (4层)

**理由**：
- 单向无环：Probe 是原子，不回向引用
- 检测循环：Document Builder 阶段检测并报错

## Risks / Trade-offs

**[Risk]** 现有 `.oxn` 文件中 `task` 声明需迁移
**→ Mitigation**：提供 codemod 脚本自动转换

**[Risk]** `type` 值拼写错误导致校验失败
**→ Mitigation**：Langium validator 提供建议修正

**[Risk]** 外部文件引用循环（理论不存在）
**→ Mitigation**：Document Builder 维护访问栈，检测深度超限

## Migration Plan

1. **Phase 1**: 修改 `oxn.langium`，新增 WorkDeclaration，保留 TaskDeclaration（标记废弃）
2. **Phase 2**: 更新 generator、document-builder、validator
3. **Phase 3**: 生成新的 `generated/*.ts`
4. **Phase 4**: 新增 `oxn-work` skill 和 `work` CLI
5. **Phase 5**: 提供 codemod 脚本迁移现有 `.oxn` 文件
6. **Phase 6**: 删除 TaskDeclaration（Breaking Change）

## Open Questions

1. **codemod 脚本是否需要支持部分迁移？** → **支持**，允许新旧语法共存一段时间
2. **`work` CLI 是否需要支持 `work use @prj/...` 这样的内联声明？** → **不支持**