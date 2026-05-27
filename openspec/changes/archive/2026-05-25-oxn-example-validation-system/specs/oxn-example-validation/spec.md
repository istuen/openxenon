## ADDED Requirements

### Requirement: Example 文件覆盖所有 OXN 语法要素

系统 SHALL 提供四个 example 文件，分别展示 OXN DSL 的四种顶级声明：
- `probe-example.oxn`: 展示 probe 声明语法（属性、输出定义）
- `part-example.oxn`: 展示 part 声明语法（含 probe 引用）
- `blueprint-example.oxn`: 展示 blueprint 声明语法（含 slot、part、expectation、rule）
- `work-example.oxn`: 展示 work 声明语法（含 slot binding）

#### Scenario: Example 文件存在且可解析
- **WHEN** `oxn validate --standard` 执行
- **THEN** 所有 example 文件通过 Langium 语法解析

#### Scenario: Example 引用 @oxn 内置资源
- **WHEN** example 文件中引用 `@oxn/probes/*`、`@oxn/parts/*` 或 `@oxn/blueprints/*`
- **THEN** 引用能被 `preloadCompileDependencies` 正确解析

### Requirement: BUILTIN_BLUEPRINTS 包含最小可执行 Blueprint

系统 SHALL 提供 `BUILTIN_BLUEPRINTS['oxn-example']`，该 Blueprint SHALL 包含：
- 至少一个 named slot (`develop`)
- 至少两个 parts，其中一个引用 `@oxn/probes/shell_exec`

#### Scenario: oxn-example Blueprint 结构验证
- **WHEN** 系统加载 `BUILTIN_BLUEPRINTS`
- **THEN** `oxn-example` 包含 `slots.develop` 和至少两个 parts

#### Scenario: Blueprint 引用可被解析
- **WHEN** `work-example.oxn` 引用 `@oxn/blueprints/oxn-example`
- **THEN** 该引用在验证时被正确解析为 `BUILTIN_BLUEPRINTS['oxn-example']`

### Requirement: oxn validate --standard 全链路验证

`oxn validate --standard` 命令 SHALL 对每个 example 文件执行以下验证链路：
1. Langium Parse → AST（验证语法）
2. `generateOxnAssembly` → OxnAssemblyBundle（验证结构）
3. `OxnKernelAdapter.adaptStrict` → frozen.json（验证可执行性）
4. `validateFrozenBlueprint` → 通过或抛出错误（验证 schema）

#### Scenario: 全链路验证通过
- **WHEN** `oxn validate --standard` 对有效的 example 文件执行
- **THEN** 命令返回成功状态，无错误输出

#### Scenario: 全链路验证失败
- **WHEN** example 文件存在语法错误或结构不完整
- **THEN** 命令返回失败状态，并输出具体的失败阶段和错误信息

### Requirement: 验证结果清晰输出

`oxn validate --standard` SHALL 输出每个 example 文件的验证状态：
- 通过: 显示 green checkmark 或 "✓"
- 失败: 显示 red X 或 "✗"，并附带错误信息

#### Scenario: 验证结果格式
- **WHEN** 多个 example 文件被验证
- **THEN** 输出按文件分组的验证结果汇总

## REMOVED Requirements

（无）

## RENAMED Requirements

（无）