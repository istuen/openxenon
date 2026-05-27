## ADDED Requirements

### Requirement: PartPort 接口定义在 kernel/contracts/

Kernel SHALL 定义 `PartPort` 接口，位于 `src/kernel/contracts/part-port.ts`。

#### Scenario: PartPort 接口文件存在
- **WHEN** 检查 `src/kernel/contracts/` 目录
- **THEN** 存在 `part-port.ts` 文件

#### Scenario: PartPort 接口导出
- **WHEN** 查看 `src/kernel/contracts/part-port.ts`
- **THEN** 导出 `PartPort` 接口

### Requirement: PartPort 接口不包含物理路径参数

`PartPort` 接口的方法 SHALL 只接收逻辑引用，不包含 `projectBoundary` 等物理路径参数。

#### Scenario: 接口方法签名
- **WHEN** 查看 `PartPort` 接口定义
- **THEN** 接口方法为 `fetchPartDefinition(logicalRef: string): Promise<PartDefinition>`
- **AND** 不包含 `projectBoundary`、`path`、`cwd` 等物理路径参数

#### Scenario: 接口只接收逻辑引用
- **WHEN** 调用 `partPort.fetchPartDefinition('oxn://parts/git-commit')`
- **THEN** 传入的是逻辑引用字符串，不包含任何文件系统路径

### Requirement: PartPort 返回纯数据结构

`PartPort.fetchPartDefinition` SHALL 返回 `PartDefinition` 纯数据结构，不包含物理路径信息。

#### Scenario: 返回 PartDefinition
- **WHEN** 调用 `partPort.fetchPartDefinition('oxn://parts/git-commit')`
- **THEN** 返回包含 `id`、`name`、`description`、`props`、`target`、`spec`、`action`、`probes`、`deps` 字段的 PartDefinition 对象

### Requirement: PartPort 由 Runtime 注入

`PartPort` 的实现 SHALL 由 CLI 或 Daemon（Runtime）层注入，Kernel 不感知实现细节。

#### Scenario: BlueprintFreezer 接收 Port 注入
- **WHEN** 创建 `BlueprintFreezer` 实例
- **THEN** 构造函数接受 `PartPort` 类型参数
- **AND** 内部使用 `this.partPort.fetchPartDefinition()` 获取 Part 数据

#### Scenario: PartPort 实现由 Runtime 组装
- **WHEN** Runtime（CLI/Daemon）初始化时
- **THEN** 实例化 `PartPort` 实现（包含 projectBoundary 闭包）
- **AND** 注入到 `BlueprintFreezer` 构造函数

### Requirement: 消除 kernel → work 的反向依赖

通过 Port 注入机制 SHALL 完全消除 `kernel → work` 的模块依赖。

#### Scenario: kernel 不依赖 work 模块
- **WHEN** 检查 `src/kernel/` 目录所有文件的 import 语句
- **THEN** 无任何 import 指向 `../../work/` 或 `../work/`

#### Scenario: BlueprintFreezer 不直接导入 Work 模块
- **WHEN** 检查 `src/kernel/processors/blueprint-freezer.ts` 源代码
- **THEN** 无任何 import 语句指向 `../../work/`