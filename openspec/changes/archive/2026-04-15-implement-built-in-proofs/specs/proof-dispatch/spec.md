## ADDED Requirements

### Requirement: 三段式降级查找逻辑

系统 SHALL 实现三段式降级查找逻辑：内置探针 → 项目级自定义探针 → 全局级自定义探针 → 熔断。

#### Scenario: 内置探针优先查找
- **WHEN** AI 请求探针（如 `fs_exists`）
- **THEN** 系统 SHALL 首先在内存字典中查找内置探针定义

#### Scenario: 项目级自定义探针降级查找
- **WHEN** AI 请求的探针不在内置探针中
- **THEN** 系统 SHALL 在当前项目的 `.xenonix/proofs/` 目录中查找对应的 `.ts` 文件

#### Scenario: 全局级自定义探针降级查找
- **WHEN** AI 请求的探针既不在内置探针中，也不在项目级自定义探针中
- **THEN** 系统 SHALL 在全局 `~/.xenonix/custom-proofs/` 目录中查找对应的 `.ts` 文件

#### Scenario: 终极熔断
- **WHEN** AI 请求的探针在三层查找中均未找到
- **THEN** 系统 SHALL 返回 `ProofNotFoundError`，判定当前 Step 为 FAILED

### Requirement: 内置探针内存字典查找

系统 SHALL 为内置探针建立内存字典，实现无文件 IO 的直接调用。

#### Scenario: 内存字典直接调用
- **WHEN** AI 请求内置探针（如 `fs_content_match`）
- **THEN** 系统 SHALL 直接在二进制内存中调用底层引擎执行，无文件系统访问

#### Scenario: 内置探针查找性能
- **WHEN** AI 请求内置探针
- **THEN** 系统 SHALL 在 O(1) 时间复杂度内完成探针查找

### Requirement: 项目级探针优先于全局级

系统 SHALL 确保项目级自定义探针优先于全局级自定义探针，以支持特定业务需求的隔离。

#### Scenario: 项目级同名探针优先
- **WHEN** 项目级和全局级存在同名自定义探针
- **THEN** 系统 SHALL 优先使用项目级的探针定义

#### Scenario: 项目级探针覆盖全局级
- **WHEN** 项目级自定义探针与全局级同名
- **THEN** 系统 SHALL 不加载全局级同名探针

### Requirement: 拒绝未知探针

系统 SHALL 绝不猜测或创建未知探针，必须通过熔断机制拦截所有未定义的探针请求。

#### Scenario: 拒绝未定义探针
- **WHEN** AI 请求一个不存在的探针名称（如 `magic_proof`）
- **THEN** 系统 SHALL 返回 `ProofNotFoundError`，绝不尝试猜测或创建该探针

#### Scenario: 严格探针名称匹配
- **WHEN** AI 请求探针时
- **THEN** 系统 SHALL 进行严格的名称匹配，不进行模糊匹配或自动补全

### Requirement: 探针调度日志记录

系统 SHALL 记录探针调度的详细日志，包括探针类型、查找路径、执行结果。

#### Scenario: 记录内置探针调用
- **WHEN** 内置探针被调用
- **THEN** 系统 SHALL 记录探针名称、类型（built-in）、执行结果

#### Scenario: 记录自定义探针调用
- **WHEN** 自定义探针被调用
- **THEN** 系统 SHALL 记录探针名称、类型（project 或 global）、文件路径、执行结果

#### Scenario: 记录熔断事件
- **WHEN** 探针查找失败并触发熔断
- **THEN** 系统 SHALL 记录请求的探针名称、查找路径、熔断原因
