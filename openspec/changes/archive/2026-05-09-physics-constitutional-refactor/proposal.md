# physics-constitutional-refactor

## What

根据《OpenXenon 架构设计文档（物理学定稿）》执行的严酷执法审查。

### 公理违反清单

| 违规文件 | 罪名 | 违反公理 |
|----------|------|----------|
| `kernel/lib/task-dir.ts` | 内含 `existsSync`, `mkdirSync` I/O | 公理二 (兰姆达真空) |
| `kernel/lib/custom-proofs-scanner.ts` | 内含 `readdirSync`, `statSync` I/O | 公理二 (兰姆达真空) |
| `kernel/lib/blueprint-parser.ts` | 内含 `existsSync`, `readFileSync` I/O | 公理二 (兰姆达真空) |
| `infra/blueprint/blueprint.ts` | 业务逻辑混入 Infra | 公理三 (图灵机边界) |
| `infra/staging/staging-manager.ts` | 未被引用的孤立代码 | 公理三 |
| `arsenals/proofs/*.ts` | Arsenal 混入 TS 代码 | 契约层定义 |
| `src/server.ts:6` | `import './api/handlers'` 目录不存在 | 错误引用 |
| `src/core/daemon-config.ts` | 孤立文件，`core/` 概念已废弃 | 架构混乱 |

## Why

当前源码虽然披上了 `kernel/infra/daemon` 的外衣，但微观层面仍残留大量"CRUD 时代的僵尸"和"物理倒灌的暗线"。

## Scope

### 1. Kernel (兰姆达真空) - 清洁 I/O 副作用

**task-dir.ts 拆分:**
- `getTaskDirectory()` → 纯函数，留在 kernel
- `ensureTaskDirectory()`, `taskDirectoryExists()` → 移至 infra/fs.ts

**custom-proofs-scanner.ts 重构:**
- 重命名为 `custom-proofs-resolver.ts`
- 移除所有 I/O (`readdirSync`, `statSync`, `existsSync`)
- 只接收 Infra 扫描返回的路径列表，纯逻辑组装

**blueprint-parser.ts 拆分:**
- `parseBlueprintYaml()` → 纯 YAML 解析，留在 kernel
- `readBlueprint()` → I/O，移至 infra/fs.ts

### 2. Infra (图灵机边界) - 移除业务逻辑

**infra/blueprint/blueprint.ts:**
- 业务逻辑移至 kernel/compiler/
- 仅保留 `fs.ts` 的文件读写能力

**infra/staging/staging-manager.ts:**
- 未被引用，删除

### 3. Daemon - 确认架构合规

- `daemon/trace/writer.ts` 保持现状（正确：I/O 在 daemon，纯函数从 kernel 导入）

### 4. CLI - 移除 handlers

**cli/handlers/ 全部删除:**
- 合并 `cli/handlers/task-submit.ts` → `cli/commands/task.ts`
- 合并 `cli/handlers/task-*.ts` → `cli/commands/task.ts`
- 合并 `cli/handlers/step-*.ts` → `cli/commands/step.ts`
- 合并 `cli/handlers/fs-execute.ts` → `cli/commands/fs.ts`

### 5. Arsenals - 净化为纯 YAML

**arsenals/proofs/*.ts 移至 kernel/schemas/:**
- `arsenals/proofs/probe.ts` → `kernel/schemas/probe.ts`
- `arsenals/proofs/proof.ts` → `kernel/schemas/proof.ts`
- `arsenals/proofs/stage.ts` → `kernel/schemas/stage.ts`
- `arsenals/proofs/index.ts` → `kernel/schemas/index.ts`

### 6. 删除 core/

- `core/daemon-config.ts` → 拆分到 infra/global.ts 和 daemon/status.ts
- 删除 `src/core/` 目录

### 7. 修复 server.ts

- 删除 `import './api/handlers'` (目录不存在)

## Out of Scope

- `kernel/lib/types/` 暂不合并（复杂，需要单独 change）
- `daemon/ipc/handlers/` 保持现状（已经在正确位置）

## Verification

```bash
pnpm run typecheck
pnpm run lint
pnpm build
```