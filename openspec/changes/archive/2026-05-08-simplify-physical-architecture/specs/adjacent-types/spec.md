## ADDED Requirements

### Requirement: 邻接原则

如果一个类型只被一个模块使用，它必须以 `*.type.ts` 的形式紧邻该模块放置。

#### Scenario: 邻接类型示例
- **WHEN** `daemon/ipc/server.ts` 需要 `SocketRequest` 类型
- **THEN** `SocketRequest` SHALL 放在 `daemon/ipc/server.type.ts`

### Requirement: 共享类型放入 common/

如果一个类型被多个模块使用，它必须放在 `common/` 目录中。

#### Scenario: 共享枚举示例
- **WHEN** `TaskStatus` 被 CLI 和 Daemon 共同使用时
- **THEN** `TaskStatus` SHALL 放在 `common/enums.ts`

### Requirement: 类型目录结构

`common/` 目录 SHALL 只包含被多处引用的枚举、常量、类型和 Schema。

#### Scenario: common 目录结构
- **WHEN** 查看 `common/` 目录时
- **THEN** 目录 SHALL 包含 `enums.ts`、`constants.ts`、`types/`、`schemas/`