## Context

当前 `src/kernel/` 目录结构混乱，Schema/Contract/Processor 边界不清：

**问题现状:**
```
src/kernel/
├── lib/                     # 混合: types/ + *.ts 逻辑函数
│   ├── types/               # 状态类型定义
│   │   ├── core.ts          # 重复! 与 enums.ts 功能重叠
│   │   ├── task-state.ts    # 重复! 与 task-trace.ts 功能重叠
│   │   └── ...
│   ├── project.ts           # 路径函数, 直接 import node:path
│   ├── task-trace.ts        # 逻辑函数
│   └── ...
├── compiler/                # 逻辑函数, 应在 processors/
├── task/                    # 逻辑函数, 应在 processors/
├── explore/                 # 混合: types.ts + evaluator.ts
├── enums.ts                 # 状态枚举
├── constants.ts             # 路径常量
└── policy.ts               # 混合: 接口 + 实现
```

**三方审查结论 (kernel-45):**
- Schema = types/ + validators/
- Contract = probe-port + path-port
- Processor = 纯逻辑, 不碰宿主环境
- 宿主依赖通过 Contract 注入

## Goals / Non-Goals

**Goals:**
- 实现 Kernel L0 的 Schema/Contract/Processor 三元物理分离
- 删除 `lib/` 目录，将类型归入 `schemas/types/`，逻辑归入 `processors/`
- 创建 `path-port.ts`，Kernel 通过接口获取宿主路径计算能力
- 更新 `validate-dependencies.ts` 识别新目录结构

**Non-Goals:**
- 不改变 Kernel 的外部 API (kernel/index.ts 导出内容)
- 不改变 Infra 实现 (probe 执行逻辑)
- 不改变 Runtime 组装逻辑 (Work/Arsenal/CLI/Daemon)

## Decisions

### Decision 1: 废止 `lib/` 目录

**方案:**
```
原: src/kernel/lib/types/*.ts + src/kernel/lib/*.ts
新: src/kernel/schemas/types/*.ts + src/kernel/processors/*.ts
```

**理由:**
- `lib/types/` 是旧时代的产物，类型定义应归属 `schemas/`
- `lib/*.ts` 中的逻辑函数应归属 `processors/`
- `lib/` 这个名称无业务语义，应废止

### Decision 2: 类型重组为 `schemas/types/`

**方案:**
```
src/kernel/schemas/types/
├── enums.ts                 # 合并 core.ts, 移除 Xn 前缀
├── action.ts
├── artifact.ts
├── task.ts
├── task-trace.ts            # 唯一真相源, 合并 task-state.ts
├── part.ts
├── probe.ts
├── sample.ts
├── spec.ts
└── policy.ts                # ExecutionPolicy 接口
```

**理由:**
- `types/` 比 `domain/` 更准确: 它就是 Processor 的入参出参类型
- 将 `task-state.ts` 合并入 `task-trace.ts`，用可选字段兼容旧逻辑
- `XnTaskStatus` → `TaskStatus`，删除冗余别名

### Decision 3: Zod 校验归 `schemas/validators/`

**方案:**
```
src/kernel/schemas/validators/
├── blueprint.schema.ts
├── frozen-schema.ts
└── dag-validator.ts
```

**理由:**
- Zod 校验是 Schema 的运行时守门员，属于 Schema 的一部分
- 与 `types/` 物理隔离，保证"纯类型"与"运行时校验"的边界清晰

### Decision 4: 新增 `path-port.ts`

**方案:**
```typescript
// src/kernel/contracts/path-port.ts
export interface PathPort {
  join(...segments: string[]): string
  resolve(base: string, ...segments: string[]): string
}
```

**理由:**
- Kernel 不应直接 `import path from 'node:path'`
- 路径计算是宿主环境能力，通过 Contract 注入
- Runtime 注入 Infra 实现 (Bun/Node/Deno)

### Decision 5: 逻辑函数归 `processors/`

**方案:**
```
src/kernel/processors/
├── probes/
│   ├── namespace.ts
│   └── evaluator.ts
├── explore/
│   ├── converters.ts
│   ├── evaluator.ts
│   └── reporter.ts
├── policies/
│   └── execution-policy.ts
├── blueprint-compiler.ts
├── blueprint-freezer.ts
├── task-dir.ts
└── sandbox-manager.ts
```

**理由:**
- 所有包含计算过程的代码必须在 `processors/`
- `processors/` 可以 import `node:path`，但 `schemas/` 绝对不行

## Risks / Trade-offs

[Risk] 大量文件移动会导致 git history 碎片化
→ Mitigation: 使用 `--follow` 选项追踪重命名文件

[Risk] 外部依赖方 (CLI/Daemon/Work) 需要更新 import 路径
→ Mitigation: kernel/index.ts 保持原有导出，内部路径调整对外部透明

[Risk] 验证脚本更新不及时导致误报
→ Mitigation: 先更新验证脚本，再执行文件移动

## Migration Plan

1. **阶段 1: 更新验证脚本**
   - 修改 `scripts/validate-dependencies.ts` 识别新的三层结构
   - 运行验证确保 0 违规

2. **阶段 2: 创建新的目录结构**
   - 创建 `schemas/types/`、`schemas/validators/`、`processors/` 子目录
   - 创建 `contracts/path-port.ts`

3. **阶段 3: 移动文件**
   - 将 `lib/types/*.ts` → `schemas/types/`
   - 将 `explore/types.ts` → `schemas/explore.types.ts`
   - 将 `lib/*.ts` 逻辑函数 → `processors/`
   - 将 `compiler/*.ts` → `processors/`
   - 将 `task/*.ts` → `processors/`

4. **阶段 4: 删除旧目录**
   - 删除 `lib/` 目录
   - 删除 `compiler/` 目录
   - 删除 `task/` 目录
   - 删除 `explore/types.ts`

5. **阶段 5: 更新 kernel/index.ts**
   - 调整内部 re-export 路径

6. **阶段 6: 验证**
   - 运行 `bun run scripts/validate-dependencies.ts` 输出 0 违规
   - 运行 `bun run typecheck` 无错误
   - 运行 `bun run lint` 无错误

## Open Questions

1. `dag-validator.ts` 是否需要移动到 `schemas/validators/`? (已确认: 归 Schema)
2. `explore/types.ts` 改名 `explore.types.ts` 还是保持原名? (已确认: 移动到 schemas/)
3. 是否需要更新 `openspec/specs/kernel-no-infra-import/spec.md`? (待确认)