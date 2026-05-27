## ADDED Requirements

### Requirement: Builtin Asset Three-Level Fallback

内置资产的查找顺序为：项目级 → 全局级 → 内置级。当项目级和全局级都找不到目标资产时，系统 SHALL 在内置级 `src/arsenals/`（编译后为 `dist/arsenals/`）中查找。

内置资产为只读，查找顺序确保项目级自定义资产能覆盖内置资产。

#### Scenario: loadMetaForge finds builtin meta-forge

- **WHEN** 用户执行 `oxn forge probe` 且项目级和全局级都找不到 `meta-probe`
- **THEN** 系统返回 `src/arsenals/forges/meta-probe/canonical.yaml` 的内容，包括 name 和 constraints

#### Scenario: arsenalListStandards includes builtin assets

- **WHEN** 用户执行 `oxn arsenal list` 且项目级和全局级都无资产
- **THEN** 系统返回内置资产列表

#### Scenario: Project-level asset overrides builtin

- **WHEN** 项目级 `.openxenon/arsenals/forges/meta-probe/canonical.yaml` 存在
- **THEN** 系统返回项目级资产而非内置级

### Requirement: Builtin Asset Discovery Path

内置资产的发现路径计算方式：对于编译后的二进制，`BUILTIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'arsenals')` 应指向 `dist/arsenals/`。

对于开发模式（`bun run dev`），同样计算方式应指向 `src/arsenals/`。

#### Scenario: Builtin root resolves correctly in compiled binary

- **WHEN** 执行 `dist/oxn forge probe`
- **THEN** `import.meta.url` 指向 `file:///path/to/dist/oxn`，`dirname` 解析为 `dist/`，拼接 `'arsenals'` 后命中 `dist/arsenals/`

#### Scenario: Builtin root resolves correctly in dev mode

- **WHEN** 执行 `bun run dev -- oxn forge probe`
- **THEN** `import.meta.url` 指向源文件路径，`dirname` 解析为 `src/`，拼接 `'arsenals'` 后命中 `src/arsenals/`

### Requirement: Build Process Includes Builtin Assets

`package.json` 的 `build` 脚本 SHALL 在编译后复制 `src/arsenals/` 目录到 `dist/arsenals/`，确保编译产物包含所有内置资产。

#### Scenario: Build output contains arsenals directory

- **WHEN** 执行 `pnpm build`
- **THEN** `dist/arsenals/` 目录存在且包含 `forges/`、`probes/`、`proofs/`、`stages/` 等子目录及其所有 canonical.yaml 文件

### Requirement: Skills Use Daemon-Independent Commands

`src/skills/oxn-task.ts` SHALL 使用不依赖 daemon 的命令实现自举流程。具体为：使用 `oxn arsenal list` 替代 `oxn arsenal search`，移除 `oxn daemon start` 指令。

#### Scenario: Skill uses arsenal list instead of search

- **WHEN** AI 执行 `/oxn-task` 技能
- **THEN** 技能指令中不包含 `oxn arsenal search`，也不包含 `oxn daemon start`

#### Scenario: Task submission works without daemon

- **WHEN** 用户提交任务 `oxn task submit --blueprint <path>`
- **THEN** 命令成功执行（纯文件操作），不依赖 daemon 运行状态