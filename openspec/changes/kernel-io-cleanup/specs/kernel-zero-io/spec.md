## ADDED Requirements

### Requirement: Kernel 层零 fs 导入

Kernel 层 SHALL 不包含任何 `from 'fs'` 导入。

#### Scenario: 无 fs 导入
- **WHEN** 检查 `src/kernel/**/*.ts` 源代码
- **THEN** 不存在任何 `from 'fs'` 导入

### Requirement: Kernel 层零 os 导入

Kernel 层 SHALL 不包含任何 `from 'os'` 导入。

#### Scenario: 无 os 导入
- **WHEN** 检查 `src/kernel/**/*.ts` 源代码
- **THEN** 不存在任何 `from 'os'` 导入

### Requirement: Kernel 层零 crypto 导入

Kernel 层 SHALL 不包含任何 `from 'crypto'` 导入。

#### Scenario: 无 crypto 导入
- **WHEN** 检查 `src/kernel/**/*.ts` 源代码
- **THEN** 不存在任何 `from 'crypto'` 导入

### Requirement: Infra 层提供 hasher 能力

Infra SHALL 提供 `computeContentHash(content: string): string` 函数，用于计算内容哈希。

#### Scenario: 计算 SHA256 哈希
- **WHEN** 调用 `computeContentHash('hello world')`
- **THEN** 返回 SHA256 哈希值（64 字符十六进制字符串）

### Requirement: Infra 层提供全局路径能力

Infra SHALL 提供获取全局边界路径的函数，包含对 `os.homedir()` 的调用。

#### Scenario: 获取全局边界路径
- **WHEN** 调用 `getGlobalBoundaryPath()`
- **THEN** 返回 `~/.openxenon` 或等效全局路径

### Requirement: Infra 层提供沙箱管理能力

Infra SHALL 提供沙箱目录管理函数，包含 fs 操作。

#### Scenario: 创建沙箱目录
- **WHEN** 调用 `createSandbox(taskId)`
- **THEN** 在任务目录下创建 `.sandbox/` 子目录

#### Scenario: 删除沙箱目录
- **WHEN** 调用 `deleteSandbox(taskId)`
- **THEN** 删除对应的沙箱目录（如果存在）