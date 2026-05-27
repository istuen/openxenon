## ADDED Requirements

### Requirement: Projects registry file

系统必须在 `~/.openxenon/projects.json` 文件中维护已注册项目的注册表。

#### Scenario: 读取不存在的 projects.json
- **WHEN** 读取 `projects.json` 且文件不存在
- **THEN** 返回空项目列表 `[]`

#### Scenario: 注册新项目
- **WHEN** 调用 `registerProject(projectRoot, name)` 且项目尚未注册
- **THEN** 系统追加新记录到 projects.json，包含 id、path、name、status、lastHeartbeat、createdAt、updatedAt

#### Scenario: 更新已有项目的心跳
- **WHEN** 调用 `registerProject(projectRoot, name)` 且项目已存在
- **THEN** 系统更新该项目的 lastHeartbeat 和 updatedAt 字段

#### Scenario: 列出所有项目
- **WHEN** 调用 `getAllProjects()`
- **THEN** 返回 projects.json 中的所有项目记录

---

### Requirement: Daemon 配置文件

系统必须在 `~/.openxenon/daemon-config.json` 文件中存储 Daemon 的配置信息。

#### Scenario: 读取不存在的 daemon-config.json
- **WHEN** 读取 `daemon-config.json` 且文件不存在
- **THEN** 返回默认配置 `{ address: null, startedAt: null }`

#### Scenario: 设置 Daemon 地址
- **WHEN** 调用 `setDaemonAddress(address)`
- **THEN** 系统更新 daemon-config.json 中的 address 字段

#### Scenario: 清除 Daemon 地址
- **WHEN** 调用 `clearDaemonAddress()`
- **THEN** 系统将 daemon-config.json 中的 address 设为 null

#### Scenario: 获取 Daemon 地址
- **WHEN** 调用 `getDaemonAddress()`
- **THEN** 返回 daemon-config.json 中存储的 address 值（可能为 null）

---

### Requirement: 项目级配置文件

系统必须在 `.openxenon/config.json` 文件中存储项目级配置。

#### Scenario: 读取项目配置
- **WHEN** 读取 `.openxenon/config.json` 且文件不存在
- **THEN** 返回默认配置 `{ version: 1, mode: 'PRODUCTION' }`

#### Scenario: 设置 Space Mode
- **WHEN** 调用 `setSpaceMode(projectRoot, 'SANDBOX')`
- **THEN** 系统更新 `.openxenon/config.json` 中的 mode 字段为 'SANDBOX'

#### Scenario: 获取 Space Mode
- **WHEN** 调用 `getSpaceMode(projectRoot)`
- **THEN** 返回该项目的 mode 配置（默认 'PRODUCTION'）

---

### Requirement: 配置文件原子写入

配置文件的写入必须采用 .tmp + rename() 模式，确保多进程访问时的文件完整性。

#### Scenario: 配置文件写入原子性
- **WHEN** 写入 projects.json 或 daemon-config.json
- **THEN** 系统先写入 `<file>.tmp`，再通过 rename() 原子替换目标文件

#### Scenario: 写入失败时清理临时文件
- **WHEN** 配置文件写入 .tmp 成功但 rename 失败
- **THEN** 系统清理残留的 .tmp 文件
