## Context

Xenonix 是一个面向大语言模型的工程化控制引擎，采用全局/项目双层物理隔离架构。Core 引擎是全局唯一的常驻进程，通过挂载不同项目的上下文来实施控制。系统需要在物理层面建立严格的边界，在数据层面实现可靠的状态管理，在类型层面提供端到端的约束。

当前状态：项目处于架构设计阶段，缺乏目录结构、数据库设计和类型定义。

约束：
- 运行时：Bun (追求冷启动毫秒级、单一可执行文件)
- 类型系统：TypeScript Strict Mode (类型即约束)
- 数据库：SQLite (全局 core.db + 项目 project.db with WAL)
- 通信：Bun.serve (微秒级路由解析)

## Goals / Non-Goals

**Goals:**

- 建立符合 README.md 定义的全局物理边界目录结构
- 建立符合 README.md 定义的项目物理边界目录结构
- 设计全局元数据数据库表结构，支持跨项目注册表管理
- 设计项目状态数据库表结构，支持状态机、逃逸时间戳、Proof 校验日志
- 定义 Playbook、Step、Spec、Proof、Task 等核心 TypeScript 类型接口
- 设计文件监听机制，实现 JSON 到 DB 的单向管道
- 设计双轨验证机制的数据模型，支持明线验证和暗线逃逸检测

**Non-Goals:**

- 不涉及具体 API 端点的实现
- 不涉及 Proof 探针的具体实现
- 不涉及 AI 助手 Skill 的具体实现
- 不涉及前端 UI 设计

## Decisions

### 1. 目录结构设计

**决策：采用双层物理隔离架构**

```
~/.xenonix/                          # 全局物理边界
├── core.db                          # 全局元数据数据库
├── proofs/                          # 全局探针库
│   ├── common/                      # 通用验证探针
│   └── templates/                   # Playbook 模板
└── daemon.sock                      # Core 进程通信 Socket

<project>/.xenonix/                  # 项目物理边界
├── project.db                       # 项目状态数据库 (WAL)
├── proofs/                          # 项目探针库 (可选)
└── tasks/
    └── <task_id>/
        ├── step-manifest.json       # AI 写入的状态管道
        └── task-trace.yaml          # 任务完成后的案卷
```

**理由：**
- 全局与项目严格隔离，避免跨项目污染
- Core.db 只存跨项目元数据，职责单一
- Project.db 作为项目唯一真理源，WAL 模式支持并发读写
- JSON 管道兼容 LLM 文件输出能力
- YAML 案卷便于人类阅读和版本控制

**备选方案：**
- 方案 B: 所有数据存在一个全局数据库 - 拒绝理由：破坏项目隔离性，增加并发风险
- 方案 C: 使用 PostgreSQL - 拒绝理由：引入外部依赖，违背"无依赖分发"原则

### 2. 数据库表结构设计

**决策：Core.db 采用单表注册表设计**

```sql
-- core.db: 全局项目注册表
CREATE TABLE projects (
  id TEXT PRIMARY KEY,               -- 项目 UUID
  path TEXT UNIQUE NOT NULL,         -- 项目绝对路径
  name TEXT,                         -- 项目名称
  status TEXT DEFAULT 'active',      -- active | archived
  last_heartbeat INTEGER,            -- 最后心跳时间戳
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

**决策：Project.db 采用多表状态机设计**

```sql
-- project.db: 项目状态管理

-- 任务表
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,               -- 任务 ID
  name TEXT NOT NULL,                -- 任务名称
  playbook TEXT NOT NULL,            -- Playbook JSON
  status TEXT DEFAULT 'pending',     -- pending | running | completed | failed
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 步骤状态表
CREATE TABLE steps (
  id TEXT PRIMARY KEY,               -- 步骤 ID
  task_id TEXT NOT NULL,             -- 所属任务 ID
  name TEXT NOT NULL,                -- 步骤名称
  spec TEXT NOT NULL,                -- 执行规范
  proof TEXT NOT NULL,               -- 验证探针
  status TEXT DEFAULT 'pending',     -- pending | running | passed | failed
  started_at INTEGER,                -- 开始时间
  completed_at INTEGER,              -- 完成时间
  last_heartbeat INTEGER,            -- 最后心跳时间
  manifest_snapshot TEXT,            -- step-manifest.json 快照
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- 逃逸检测表
CREATE TABLE escape_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  detected_at INTEGER NOT NULL,      -- 检测时间
  manifest_before TEXT,              -- 变更前快照
  manifest_after TEXT,               -- 变更后快照
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (step_id) REFERENCES steps(id)
);

-- Proof 校验日志表
CREATE TABLE proof_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id TEXT NOT NULL,
  proof_name TEXT NOT NULL,
  result TEXT NOT NULL,              -- success | failure
  output TEXT,                       -- 校验输出
  executed_at INTEGER NOT NULL,
  FOREIGN KEY (step_id) REFERENCES steps(id)
);

-- 索引优化
CREATE INDEX idx_steps_task ON steps(task_id);
CREATE INDEX idx_escape_logs_task ON escape_logs(task_id);
CREATE INDEX idx_proof_logs_step ON proof_logs(step_id);
```

**理由：**
- Tasks 表管理任务生命周期
- Steps 表记录每个步骤的状态和验证信息
- Escape_logs 表记录逃逸检测事件，支持审计
- Proof_logs 表记录所有验证结果，支持追溯
- 索引优化高频查询性能

**备选方案：**
- 方案 B: 将所有状态存入单一 JSON 字段 - 拒绝理由：查询和索引能力受限
- 方案 C: 使用关系型数据库外键约束 - 拒绝理由：SQLite 外键约束默认关闭，增加复杂度

### 3. TypeScript 类型接口设计

**决策：采用严格的类型定义，支持端到端类型同构**

```typescript
// 核心类型定义

// Playbook: 执行计划
export interface Playbook {
  task: string;                      // 任务名称
  steps: Step[];                     // 步骤列表
}

// Step: 原子步骤
export interface Step {
  id: string;                        // 步骤 ID
  name: string;                      // 步骤名称
  spec: string;                      // 执行规范
  proof: string;                     // 验证探针 ID
}

// Task: 任务实体
export interface Task {
  id: string;                        // 任务 UUID
  name: string;                      // 任务名称
  playbook: Playbook;                // 执行计划
  status: TaskStatus;                // 任务状态
  createdAt: number;                 // 创建时间戳
  updatedAt: number;                 // 更新时间戳
}

// TaskStatus: 任务状态枚举
export type TaskStatus = 
  | 'pending'                        // 待执行
  | 'running'                        // 执行中
  | 'completed'                      // 已完成
  | 'failed';                        // 已失败

// StepStatus: 步骤状态枚举
export type StepStatus =
  | 'pending'                        // 待执行
  | 'running'                        // 执行中
  | 'passed'                         // 已通过
  | 'failed';                        // 已失败

// StepManifest: 步骤舱单 (AI 写入)
export interface StepManifest {
  taskId: string;                    // 任务 ID
  stepId: string;                    // 当前步骤 ID
  status: StepStatus;                // 步骤状态
  artifacts: Artifact[];             // 产生的工程产物
  timestamp: number;                 // 时间戳
}

// Artifact: 工程产物
export interface Artifact {
  path: string;                      // 文件路径
  type: ArtifactType;                // 产物类型
  hash: string;                      // 文件哈希
}

// ArtifactType: 产物类型枚举
export type ArtifactType =
  | 'code'                           // 代码文件
  | 'config'                         // 配置文件
  | 'document'                       // 文档文件
  | 'test';                          // 测试文件

// Proof: 验证探针
export interface Proof {
  id: string;                        // 探针 ID
  name: string;                      // 探针名称
  type: ProofType;                   // 探针类型
  path: string;                      // 探针脚本路径
}

// ProofType: 探针类型枚举
export type ProofType =
  | 'validation'                     // 验证型
  | 'lint'                           // 代码检查型
  | 'test';                          // 测试型

// Project: 项目实体
export interface Project {
  id: string;                        // 项目 UUID
  path: string;                      // 项目绝对路径
  name: string;                      // 项目名称
  status: 'active' | 'archived';     // 项目状态
  lastHeartbeat: number;             // 最后心跳
  createdAt: number;                 // 创建时间
  updatedAt: number;                 // 更新时间
}
```

**理由：**
- 类型定义严格对应数据库表结构
- 枚举类型约束状态流转
- 接口支持 AI 助手与 Core 之间的类型同构
- 便于 TypeScript 编译器进行静态检查

**备选方案：**
- 方案 B: 使用 Zod 进行运行时校验 - 可考虑作为补充，但类型定义仍需保留
- 方案 C: 使用 Interface 合并数据库实体和业务实体 - 拒绝理由：混淆数据层和业务层

### 4. 文件监听机制设计

**决策：采用 Bun 文件系统监听 + SQLite WAL 模式**

```typescript
// 监听器伪代码
class ManifestWatcher {
  private db: Database;              // project.db 连接
  
  async watch(taskPath: string) {
    const manifestPath = path.join(taskPath, 'step-manifest.json');
    
    // 使用 Bun 文件监听
    const watcher = fs.watch(manifestPath, (event, filename) => {
      if (event === 'change') {
        this.handleManifestChange(manifestPath);
      }
    });
    
    return watcher;
  }
  
  private handleManifestChange(manifestPath: string) {
    // 1. 读取变更后的 JSON
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    // 2. 记录快照到 project.db
    this.db.run(`
      UPDATE steps 
      SET manifest_snapshot = ?, last_heartbeat = ?
      WHERE id = ?
    `, [JSON.stringify(manifest), Date.now(), manifest.stepId]);
    
    // 3. 逃逸检测
    this.detectEscape(manifest);
  }
  
  private detectEscape(manifest: StepManifest) {
    // 检查是否超时未发起验证请求
    const lastHeartbeat = this.db.query(`
      SELECT last_heartbeat FROM steps WHERE id = ?
    `).get(manifest.stepId);
    
    const timeout = 30000; // 30 秒超时
    if (Date.now() - lastHeartbeat > timeout) {
      // 记录逃逸事件
      this.db.run(`
        INSERT INTO escape_logs (task_id, step_id, detected_at)
        VALUES (?, ?, ?)
      `, [manifest.taskId, manifest.stepId, Date.now()]);
      
      // 抛出异常
      throw new Error('AI 模型逃逸检测');
    }
  }
}
```

**理由：**
- Bun 原生文件监听，零依赖
- SQLite WAL 模式支持并发读写
- 双轨机制（明线验证 + 暗线监听）确保 AI 不会逃逸
- 时间戳比对简单可靠

**备选方案：**
- 方案 B: 使用 Node.js chokidar 库 - 拒绝理由：引入 npm 依赖，违背 Bun 原生原则
- 方案 C: 轮询检查文件变更 - 拒绝理由：性能差，无法实时捕获

### 5. 双轨验证机制设计

**决策：明线 API 验证 + 暗线文件监听**

```
明线路径 (AI 主动):
  1. AI 完成 Step
  2. AI 写入 step-manifest.json
  3. AI 调用 /api/v1/step/verify
  4. Core 执行 Proof 探针
  5. Core 更新 project.db
  6. Core 返回结果

暗线路径 (Core 监听):
  1. Core 监听 step-manifest.json 变更
  2. Core 同步快照到 project.db
  3. Core 记录时间戳
  4. Core 检查是否超时未验证
  5. 若超时，判定逃逸并记录
```

**理由：**
- 明线保证正常流程的高效性
- 暗线保证异常流程的可控性
- 双重保险，避免 AI 绕过验证
- 时间戳比对简单有效

**备选方案：**
- 方案 B: 仅依赖 API 验证 - 拒绝理由：无法防止 AI 绕过 API
- 方案 C: 仅依赖文件监听 - 拒绝理由：增加 AI 调试难度

## Risks / Trade-offs

**风险 1: SQLite WAL 模式并发性能**
- 风险：高并发写入时可能产生锁竞争
- 缓解：使用连接池、批量写入、定期 checkpoint

**风险 2: 文件监听的实时性**
- 风险：大量文件变更时监听可能延迟
- 缓解：使用 Bun 原生监听、限制监听范围、增加心跳频率

**风险 3: 逃逸检测的误判**
- 风险：网络延迟或系统负载高可能触发误判
- 缓解：设置合理的超时阈值（30 秒）、支持人工确认

**风险 4: 类型定义与数据库不一致**
- 风险：类型定义和数据库表结构可能不同步
- 缓解：建立类型生成工具、定期同步检查

**权衡: 性能 vs 可靠性**
- 选择：优先保证可靠性，牺牲部分性能
- 理由：工程化控制引擎的核心价值在于可靠性

**权衡: 复杂度 vs 可维护性**
- 选择：保持设计简洁，降低复杂度
- 理由：简洁的设计更易于理解和维护
