## ADDED Requirements

### Requirement: Daemon 禁止直接导入 fs

Daemon 层的所有模块（包括 `src/daemon/**`）**SHALL NOT** 直接导入 `fs` 或 `node:fs`。所有文件系统操作必须通过 `infra/fs.ts` 或 `infra/loader.ts` 执行。

#### Scenario: Daemon Registry 使用 Infra 扫描
- **WHEN** `daemon/registry.ts` 需要扫描目录
- **THEN** 调用 `infra/loader.ts` 的函数，不直接导入 `fs`

#### Scenario: ESLint 拦截直接 fs 导入
- **WHEN** ESLint 检测到 `src/daemon/**` 导入 `fs` 或 `node:fs`
- **THEN** 编译失败，错误信息：`🚨 Daemon 不能直接导入 fs，必须通过 Infra！`

#### Scenario: 允许通过 Infra 操作文件
- **WHEN** Daemon 代码调用 `import { fs } from '../infra/fs'`
- **THEN** ESLint 通过，这是合规的 I/O 操作路径