# 0.2.0 — Sprint 1 T1a: src/cli/ 22 文件 fs 直引收口到 src/infra/filesystem

> 父文档拆分：T1 估 23 调用点，实测 52 生产文件，拆为 t1a (cli 22) + t1b (其余 30 + 5 死 Port)。本片段仅 t1a。

## 变更

### src/cli/*.ts import 替换（22 文件 1 行/文件）

把 `import { ... } from 'fs'` 改为 `import { ... } from '../infra/filesystem'`，**零调用点改动**（`existsSync` 等符号来源变化，调用语法不变）。

- src/cli/blueprint.ts (19)
- src/cli/cache-clear.ts (2)
- src/cli/cache-stats.ts (2)
- src/cli/config-cmd.ts (10)
- src/cli/config-loader.ts (22)
- src/cli/debug.ts (1)
- src/cli/domain.ts (3)
- src/cli/explore-cmd.ts (6)
- src/cli/export.ts (2)
- src/cli/gc.ts (2)
- src/cli/init.ts (2)
- src/cli/install-skill.ts (22)
- src/cli/migrate-probe-refs.ts (1)
- src/cli/migrate-yaml.ts (18)
- src/cli/oxn-compile.ts (2)
- src/cli/oxn-dual-track.ts (11)
- src/cli/oxn-validate.ts (2)
- src/cli/project-config-io.ts (1)
- src/cli/proof.ts (28)
- src/cli/skill-compiler.ts (2)
- src/cli/task-filesystem.ts (1)
- src/cli/work.ts (35)

括号内为原 `from 'fs'` 在文件中的行号。

### 回归测试

- 新增 `src/cli/__tests__/no-direct-fs-imports-cli.test.ts`（47 case）—— 守护 src/cli/*.ts 不得直引 `fs` / `node:fs` / `fs/promises` / `node:fs/promises`
  - 背景：lint 的 `no-restricted-imports` 规则仅在 L0-Kernel 与 L3-Daemon 启用，L3-CLI 仍可直引 → 需 grep guard 守护

## 影响

- src/cli 22 文件全部经由 src/infra/filesystem.ts 收口
- 实际代码改动：22 行 import 替换 + 47 行 guard 测试 = 69 行净增
- 测试：1121 → 1169（+48，零回归）
- L0–L3 依赖图：0 变化（cli→infra 单向，infra→fs 单向）
- 行为：0 变化（符号相同，来源变化）
- 死 Port 文件：**未删**（属 t1b 范围）
- `src/infra/filesystem-async.ts`：**未建**（cli 22 文件 100% 同步 API，async 收口在 t1b 处理）

## 后续

- t1b：剩余 30 文件 + 5 死 Port 清理（待 t1a 合入后开工）
- 见 `.openxenon/forges/sprints/sprint-1/2026-06-15-infra-io-phase2-6.md` 父文档
- 见 `.openxenon/forges/sprints/EXECUTION-ORDER.md` §3 任务依赖
