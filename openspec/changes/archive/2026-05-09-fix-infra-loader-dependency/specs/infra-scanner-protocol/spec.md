## ADDED Requirements

### Requirement: Infra 扫描器只接收路径字符串

Infra 层的扫描器函数 SHALL NOT 接受或调用任何 Kernel 模块。函数签名必须只接收原始路径字符串参数，所有路径计算由调用方负责。

#### Scenario: scanArsenalsDirectory 接收路径参数
- **WHEN** 调用 `scanArsenalsDirectory(rootPath, type, state)`
- **THEN** 函数使用传入的 `rootPath` 直接拼接 `join(rootPath, type, state)` 构建扫描路径

#### Scenario: 拒绝隐式路径计算
- **WHEN** `infra/loader.ts` 中的任何函数尝试导入或调用 `getProjectBoundaryPath`
- **THEN** ESLint 规则 `no-restricted-imports` 报错，阻止编译

#### Scenario: CLI 提供完整路径
- **WHEN** CLI 调用 `infra/loader.ts` 的函数
- **THEN** CLI 先调用 `Kernel.getProjectBoundaryPath(cwd)` 获取路径，再传递给 Infra

### Requirement: 函数签名不变，I/O 功能保持

重构后的 `infra/loader.ts` SHALL 保持原有的 I/O 功能：目录扫描、文件读取、文件重命名、存在性检查。

#### Scenario: 扫描新结构格式
- **WHEN** 调用 `scanNewStructure(rootPath, 'probes', 'draft')` 且目录存在
- **THEN** 返回所有 `{name, type, state, path, content}` 格式的 StandardAsset 数组

#### Scenario: 扫描旧结构格式
- **WHEN** 调用 `scanArsenalsDirectory(rootPath, 'probes', 'draft')` 且存在旧格式目录
- **THEN** 返回所有匹配的文件资产

#### Scenario: promoteStandard 执行文件重命名
- **WHEN** 调用 `promoteStandard(fromPath)` 且文件存在
- **THEN** 执行 `renameSync(fromPath, toPath)` 并返回更新后的 StandardAsset