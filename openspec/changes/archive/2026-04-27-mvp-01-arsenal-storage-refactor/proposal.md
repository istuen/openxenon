## Why

当前 OpenXenon 的 Blueprint/Stage/Proof 实体直接存储在 SQLite DB 表中，导致：
1. **结构不可读**：工程师无法直接审查 Blueprint 拓扑，必须查数据库
2. **版本控制缺失**：Blueprint 的变更无法通过 Git diff 追溯
3. **与新架构不兼容**：新设计的四层架构（Task → Blueprint → Stage → Proof）需要 Blueprint 以 YAML 文件形态存在

MVP 0.1 的核心目标是验证"双轨并行 + 物理隔离"机制的可工作性。存储模型的重构是实现这一目标的基础设施。

## What Changes

1. **Blueprint/Stage 从 DB 迁移到 YAML 文件**
   - Blueprint 存储为 `tasks/<task_id>/blueprint.json`
   - Stage 的 target/spec/action/proof 信息下沉到 Blueprint YAML 内部
   - DB 表降级为"运行时索引"（只存路径指针）

2. **Validator 重命名为 Proof**
   - Stage 字段从 `validator: {...}` 改为 `proof: {...}`
   - 内部结构保持：`target` + `spec` + `action` + `probes`

3. **Probe 类型直接引用 builtin proofs**
   - MVP 定义 4 种 Probe type：`glob_match`、`file_contains`、`file_forbids`、`exec`
   - 这 4 种 type 直接映射到现有的 builtin proofs
   - Blueprint YAML 中的 `probes[].type` 使用 builtin proof 名称

4. **Staging 目录缓冲机制**
   - AI 生成代码先写入 `tasks/<id>/staging/`
   - Core 验证通过后 mv 到 `src/` 落盘为 Artifact
   - 验证失败则清理 staging/

5. **DB Schema 调整**
   - `tasks` 表新增 `blueprint_file` 字段（指向 YAML 路径）
   - `blueprints`/`stages` 表保留但标记为 deprecated（仅作历史索引）
   - 新增 `escape_log_v2` 简化逃逸记录

## Capabilities

### New Capabilities

- `blueprint-yaml-storage`: Blueprint 以 YAML 文件形态存储在 task 目录下，支持 Git 版本控制
- `staging-buffer`: AI 生成代码先写入 staging 缓冲目录，验证通过后落盘
- `builtin-proof-as-probe`: MVP 定义 4 种 Probe type，直接引用 builtin proofs 实现验证

### Modified Capabilities

（无 - 现有 spec 无需修改，MVP 0.1 是全新的存储架构）

## Impact

- **存储层**：`space.oxn` DB Schema 变更（新增字段，降级部分旧表）
- **Core 引擎**：`src/core/stage/executor.ts`、`src/core/proof-dispatcher.ts` 需要适配新的 YAML 加载逻辑
- **API Handlers**：`task-submit.ts`、`step-verify.ts` 需要适配 Blueprint YAML 解析和 staging 联动
- **新增文件**：`src/types/arsenal/blueprint.ts`（Zod schemas）、`src/core/blueprint-loader.ts`、`src/core/staging.ts`
- **迁移脚本**：`0002_mvp_01_arsenal_schema.sql`
