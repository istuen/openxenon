## 1. Schema 与类型定义

- [x] 1.1 创建 `src/types/arsenal/blueprint.ts`
  - 定义 `BlueprintSchema`、`StageSchema`、`ProofSchema`（含 target/spec/action/probes 四元组）
  - 使用 Zod 进行运行时校验

- [x] 1.2 创建 `src/types/arsenal/index.ts`
  - 统一导出所有 arsenal 相关类型

- [x] 1.3 更新 `src/types/stage.ts`
  - 将 `proof` 字段从 `string | string[]` 改为 `ProofSchema` 对象
  - 保持向后兼容注释

## 2. 数据库迁移

- [x] 2.1 创建 `src/db/migrations/0002_mvp_01_arsenal_schema.sql`
  - tasks 表新增 `blueprint_file TEXT` 字段
  - blueprints 表新增 `yaml_path TEXT` 字段
  - stages 表新增 `yaml_path TEXT` 字段
  - 创建 `escape_log_v2` 表（简化版）
  - 编写 `@down` 回滚脚本

- [x] 2.2 在 `src/db/migrator.ts` 中注册新迁移
  - 迁移文件通过 `import.meta.glob` 自动发现，无须手动注册

## 3. Blueprint 加载与持久化

- [x] 3.1 创建 `src/core/blueprint-loader.ts`
  - 实现 `loadBlueprintFromYaml(taskId: string): Blueprint`
  - 实现 `resolveBlueprintPath(taskId: string): string`
  - 使用 Zod 校验 YAML 结构

- [x] 3.2 创建 `src/core/blueprint-persister.ts`
  - 实现 `saveBlueprintToYaml(taskId: string, blueprint: Blueprint): void`
  - 将 Blueprint JSON 写入 `tasks/<task_id>/blueprint.json`

- [x] 3.3 创建 `src/core/staging.ts`
  - 实现 `StagingManager` 类
  - `ensureStagingDir(taskId: string)`: 创建 `tasks/<task_id>/staging/`
  - `getStagingPath(taskId: string): string`
  - `cleanup(taskId: string)`: 删除 staging 目录内容
  - `moveToSrc(taskId: string)`: 将 staging 内容 mv 到 `src/`

## 4. Probe 路由机制调整

- [x] 4.1 创建 `src/core/arsenal-probe-router.ts`
  - 实现 `routeProbeToBuiltin(probe: Probe, context: ProofExecutionContext): Promise<ProofOutput>`
  - 根据 `probe.type` 路由到对应 builtin proof
  - `fs_exists` → `executeBuiltInProof('fs_exists', { path: probe.pattern }, context)`
  - `fs_content_match` → `executeBuiltInProof('fs_content_match', { path: probe.pattern, pattern: probe.pattern }, context)`
  - `fs_forbid` → 复用 `fs_content_match` 逻辑，取反结果
  - `exec` → `executeBuiltInProof('exec_exit_zero', { command: probe.command, cwd: probe.cwd }, context)`

- [x] 4.2 修改 `src/core/proof-dispatcher.ts`
  - 新增 `dispatchArsenalProof(proof: ProofSchema, context: ProofExecutionContext)` 方法
  - 遍历 `proof.probes[]`，依次执行
  - 所有 probe 通过才算 PASSED，任一失败则 FAILED

## 5. Stage Executor 集成

- [x] 5.1 修改 `src/core/stage/executor.ts`
  - 执行前调用 `staging.ensureStagingDir()`
  - 执行后调用 `staging.cleanup()`（失败时）或 `staging.moveToSrc()`（成功时）

- [x] 5.2 修改 `src/core/stage/dispatcher.ts`
  - 从 Blueprint YAML 加载 stages 列表
  - 按 `deps` 顺序（v0.1 为数组顺序）执行

## 6. API Handlers 适配

- [x] 6.1 修改 `src/api/handlers/task-submit.ts`
  - AI 提交 Blueprint JSON 时，持久化为 YAML 文件
  - 更新 `tasks` 表的 `blueprint_file` 字段

- [x] 6.2 修改 `src/api/handlers/step-verify.ts`
  - 从 Blueprint YAML 读取当前 stage 的 proof
  - 将 staging 目录作为探针执行的工作目录
  - 通过后触发 `staging.moveToSrc()`

- [x] 6.3 修改 `src/api/handlers/task-next.ts`
  - 从 Blueprint YAML 读取当前应执行的 stage 信息
  - 返回 `stage.id`、`stage.name`、`proof.spec`

## 7. 验收测试

- [x] 7.1 端到端流程测试（通过 `tests/mvp-01.test.ts` 自动化测试验证）
- [x] 7.2 逃逸检测测试
- [x] 7.3 YAML 解析失败测试

> 注：7.1-7.3 通过 `tests/mvp-01.test.ts` 自动化测试覆盖，包含：
> - StagingManager 单元测试（创建/清理/moveToSrc）
> - Blueprint YAML 保存/加载测试
> - API: Task Submit with Blueprint YAML
> - API: Task Next (YAML-based)
> - API: Step Verify with Staging
> - End-to-End Flow
