## 1. 准备阶段

- [x] 1.1 更新 `scripts/validate-dependencies.ts` 识别新的三层结构 (schemas/types, schemas/validators, processors)
- [x] 1.2 运行验证脚本，确认能识别现有违规

## 2. 创建新目录结构

- [x] 2.1 创建 `src/kernel/schemas/types/` 目录
- [x] 2.2 创建 `src/kernel/schemas/validators/` 目录
- [x] 2.3 创建 `src/kernel/processors/` 子目录 (probes/, explore/, policies/)
- [x] 2.4 创建 `src/kernel/contracts/path-port.ts` (PathPort 接口定义)

## 3. 移动 Schema 类型文件

- [x] 3.1 移动 `lib/types/enums.ts` → `schemas/types/enums.ts` (合并 core.ts，移除 Xn 前缀)
- [x] 3.2 移动 `lib/types/action.ts` → `schemas/types/action.ts`
- [x] 3.3 移动 `lib/types/artifact.ts` → `schemas/types/artifact.ts`
- [x] 3.4 移动 `lib/types/task.ts` → `schemas/types/task.ts`
- [x] 3.5 移动 `lib/types/task-trace.ts` → `schemas/types/task-trace.ts` (合并 task-state.ts)
- [x] 3.6 移动 `lib/types/part.ts` → `schemas/types/part.ts`
- [x] 3.7 移动 `lib/types/sample.ts` → `schemas/types/sample.ts`
- [x] 3.8 移动 `lib/types/spec.ts` → `schemas/types/spec.ts`
- [x] 3.9 创建 `schemas/types/policy.ts` (从根目录 policy.ts 抽取 ExecutionPolicy 接口)
- [x] 3.10 删除 `lib/types/core.ts` (已合并到 enums.ts)
- [x] 3.11 删除 `lib/types/task-state.ts` (已合并到 task-trace.ts)

## 4. 移动/拆分 Schema 校验文件

- [x] 4.1 移动 `schemas/part.ts` → `schemas/validators/part.ts`
- [x] 4.2 移动 `schemas/probe.ts` → `schemas/validators/probe.ts`
- [x] 4.3 移动 `schemas/blueprint.schema.ts` → `schemas/validators/blueprint.schema.ts`
- [x] 4.4 移动 `schemas/frozen-schema.ts` → `schemas/validators/frozen-schema.ts`
- [x] 4.5 移动 `schemas/dag-validator.ts` → `schemas/validators/dag-validator.ts`
- [x] 4.6 拆分 `schemas/part-asset.ts`:
      - Zod schemas (`PartRefSchema`, `PartDefinitionSchema` 等) → `schemas/validators/part-asset.ts`
      - 辅助函数 (`getNamespaceFromRef`, `getScopeNameFromRef`, `getPartNameFromRef`) → `processors/part-asset-helpers.ts`

## 5. 重命名 Contract 文件

- [x] 5.1 重命名 `contracts/probe.ts` → `contracts/probe-port.ts`
- [x] 5.2 更新 `kernel/index.ts` 的 re-export 路径

## 6. 移动 Processor 文件

- [x] 6.1 移动 `lib/project.ts` → `processors/project.ts`
- [x] 6.2 移动 `lib/project-config.ts` → `processors/project-config.ts`
- [x] 6.3 移动 `lib/task-dir.ts` → `processors/task-dir.ts`
- [x] 6.4 移动 `lib/blueprint-freezer.ts` → `processors/blueprint-freezer.ts`
- [x] 6.5 移动 `compiler/blueprint-compiler.ts` → `processors/blueprint-compiler.ts`
- [x] 6.6 移动 `compiler/frozen-to-blueprint-adapter.ts` → `processors/frozen-to-blueprint-adapter.ts`
- [x] 6.7 移动 `task/sandbox-manager.ts` → `processors/sandbox-manager.ts`
- [x] 6.8 移动 `probes/namespace.ts` → `processors/probes/namespace.ts`
- [x] 6.9 移动 `probes/evaluator.ts` → `processors/probes/evaluator.ts`
- [x] 6.10 移动 `explore/converters.ts` → `processors/explore/converters.ts`
- [x] 6.11 移动 `explore/evaluator.ts` → `processors/explore/evaluator.ts`
- [x] 6.12 移动 `explore/reporter.ts` → `processors/explore/reporter.ts`

## 7. 处理 Policy 文件

- [x] 7.1 从根目录 `policy.ts` 抽取 `ExecutionPolicy` 接口 → `schemas/types/policy.ts`
- [x] 7.2 将 `ProductionPolicy`/`SandboxPolicy` 实现 → `processors/policies/execution-policy.ts`

## 8. 删除旧目录

- [x] 8.1 删除 `src/kernel/lib/` 目录
- [x] 8.2 删除 `src/kernel/compiler/` 目录
- [x] 8.3 删除 `src/kernel/task/` 目录
- [x] 8.4 删除 `src/kernel/probes/` 目录
- [x] 8.5 删除 `src/kernel/explore/types.ts` (已移动)

## 9. 更新 kernel/index.ts

- [x] 9.1 更新所有 re-export 路径指向新的文件位置
- [x] 9.2 移除旧的导出路径 (lib/*, compiler/*, task/*, probes/*)

## 10. 更新 Infra import 路径

- [x] 10.1 更新 `src/infra/probes/*.ts` 中 `import ... from 'kernel/contracts/probe'` → `kernel/contracts/probe-port`
- [x] 10.2 检查其他 infra 模块是否有类似 import 需要更新

## 11. 创建 Infra PathPort 实现

- [x] 11.1 创建 `src/infra/path-port.ts` (实现 PathPort 接口，使用 node:path)
- [x] 11.2 从 `src/infra/index.ts` 导出 PathPort 实现

## 12. 验证

- [x] 12.1 运行 `bun run scripts/validate-dependencies.ts` 输出 0 违规
- [x] 12.2 运行 `bun run typecheck` 无错误
- [x] 12.3 运行 `bun run lint` 无错误
- [x] 12.4 搜索 `XnTaskStatus`/`XnPartStatus` 确认已清理
- [x] 12.5 搜索 `from 'kernel/contracts/probe'` (不含 -port) 确认无遗留