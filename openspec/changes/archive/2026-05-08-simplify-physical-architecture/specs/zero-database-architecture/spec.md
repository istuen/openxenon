## ADDED Requirements

### Requirement: 物理边界目录结构

系统 SHALL 在项目根目录下创建 `.openxenon/` 目录作为物理边界。

### Requirement: 状态存储格式

系统 SHALL 使用 YAML 文件作为唯一的状态存储格式，禁止使用任何数据库（包括 SQLite）。

### Requirement: 项目配置

系统 SHALL 在 `.openxenon/config.json` 中存储项目配置（mode: PRODUCTION | SANDBOX）。

#### Scenario: 初始化项目时创建边界目录
- **WHEN** 执行 `oxn init` 命令
- **THEN** 系统 SHALL 创建 `.openxenon/` 目录及其子目录

#### Scenario: 读取项目配置
- **WHEN** 系统需要读取项目配置
- **THEN** 系统 SHALL 从 `.openxenon/config.json` 读取

### Requirement: 零数据库约束

系统 SHALL NOT 包含任何对 SQLite 或其他数据库的依赖。

#### Scenario: 验证无数据库依赖
- **WHEN** 构建系统时
- **THEN** 系统 SHALL NOT 链接任何数据库驱动

## REMOVED Requirements

### Requirement: projects.json 注册机制

**Reason**: 违反零数据库宪法，项目信息存储在各自的 `.openxenon/config.json` 中
**Migration**: 通过扫描项目目录下的 `.openxenon/config.json` 来发现项目