# Xenonix 架构设计

## 概述

Xenonix 采用全局/项目双层物理隔离架构，通过严格的边界约束确保 AI 推理过程的可控性和可追溯性。

**核心理念**：文件系统即真理源（File System as Single Source of Truth）

任务状态不再存储在 SQLite 数据库中，而是存储在文件系统中的 `task-trace.yaml` 文件里。

## 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        工程师 (Engineer)                         │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI 助手软件 (AI Assistant)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  /xn-task    │  │  /xn-status  │  │  /xn-trace   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Xenonix Core (全局唯一)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  API Server  │  │File Watcher  │  │Proof Executor│         │
│  │  (Bun.serve) │  │  (FS Watch)  │  │ (Bun.spawn)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                              ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   全局物理边界            │  │   项目物理边界            │
│   ~/.xenonix/            │  │   .openxenon/            │
│  ┌─────────────────┐    │  │  ┌─────────────────┐    │
│  │    core.oxn    │    │  │  │   project.oxn   │    │
│  │  (项目注册表)   │    │  │  │  (仅存 config)  │    │
│  └─────────────────┘    │  │  └─────────────────┘    │
│  ┌─────────────────┐    │  │  ┌─────────────────┐    │
│  │ proofs/         │    │  │  │ tasks/          │    │
│  │ (全局探针库)    │    │  │  │ (任务目录)      │    │
│  └─────────────────┘    │  │  └─────────────────┘    │
└──────────────────────────┘  └──────────────────────────┘
```

## 核心组件

### 1. Core 引擎

Core 引擎是全局唯一的常驻进程，负责：

- **API 服务**：提供 HTTP API 供 AI 助手调用
- **文件监听**：监听 step-manifest.json 变更
- **Proof 执行**：执行验证探针脚本
- **状态管理**：通过文件系统管理任务状态

**技术栈**：
- 运行时：Bun
- 类型系统：TypeScript (Strict Mode)
- 数据库：SQLite（仅用于 projects 和 config 表）
- HTTP 服务：Bun.serve

### 2. 双层物理边界

#### 全局边界 (`~/.xenonix/`)

```
~/.xenonix/
├── core.oxn            # 全局项目注册表（projects 表）
├── proofs/             # 全局探针库
│   ├── common/         # 通用验证探针
│   └── templates/      # Playbook 模板
└── daemon.sock         # Core 进程通信 Socket
```

#### 项目边界 (`<project>/.openxenon/`)

```
<project>/.openxenon/
├── config.json         # 项目配置
├── project.oxn         # 项目数据库（仅存 config 表）
└── tasks/
    └── <task_id>/
        ├── blueprint.yaml      # 任务蓝图
        ├── step-manifest.json   # AI 写入的状态管道
        └── task-trace.yaml      # 任务执行轨迹（状态真理源）
```

### 3. 文件系统优先的任务执行

任务状态存储在文件系统中的 YAML/JSON 文件里：

- **blueprint.yaml**: 任务蓝图定义
- **step-manifest.json**: AI 实时更新的意图和尝试次数
- **task-trace.yaml**: Core 写入的执行案卷（状态真理源）

```
任务执行流程：

1. oxn task new <id>           → CLI 创建 tasks/<id>/ 目录
2. AI 写入 blueprint.yaml      → 定义任务蓝图
3. oxn task start              → CLI 读取 blueprint，发送 Payload 给 Core
4. Core 执行探针                → 结果写入 task-trace.yaml
5. oxn task status             → CLI 读取 task-trace.yaml 返回状态
```

### 4. 双轨验证机制

#### 明线（主动验证）

```
1. AI 完成 Step
2. AI 写入 step-manifest.json
3. AI 调用 /api/v1/step/verify
4. Core 执行 Proof 探针
5. Core 更新 task-trace.yaml
6. Core 返回结果
```

#### 暗线（逃逸检测）

```
1. Core 监听 step-manifest.json 变更
2. Core 同步快照到 task-trace.yaml
3. Core 记录时间戳
4. Core 检查是否超时未验证
5. 若超时，判定逃逸并记录
```

## 数据流

### 任务创建流程

```
工程师 → AI 助手 → Core → 全局 Proof 扫描 → 项目 Proof 扫描 → 返回 Proof 列表 → AI 填充 Blueprint → Core 保存到 tasks/<id>/blueprint.yaml
```

### 步骤执行流程

```
AI 执行 Step → 写入 step-manifest.json →
  ├─→ [明线] 调用 API 验证 → Core 执行 Proof → 更新 task-trace.yaml
  └─→ [暗线] Core 监听变更 → 同步快照 → 逃逸检测
```

### 任务完成流程

```
AI 通知完成 → Core 从 task-trace.yaml 导出记录 → 推送报告给工程师
```

## 设计决策

### 为什么选择文件系统优先？

- **简单性**：无需数据库同步机制
- **可追溯性**：每个任务有独立目录，便于 Git 版本控制
- **可调试性**：直接查看 YAML/JSON 文件，无需 SQL 查询
- **可靠性**：操作系统级别的文件锁定，无数据库损坏风险

### 为什么仍保留 SQLite？

仅用于存储：
- **projects 表**：全局项目注册表
- **config 表**：项目配置

这些是不经常变更且需要跨任务共享的数据。

### 为什么选择 Bun？

- 冷启动毫秒级，适合常驻 Daemon
- 原生打包为单一可执行文件
- 内置 SQLite 绑定，零 npm 依赖
- 内置 HTTP 服务和文件监听

### 为什么选择双层物理边界？

- 全局与项目严格隔离，避免跨项目污染
- 每个项目有独立的状态目录
- 支持多项目并行工作
- 项目删除不影响全局注册表

## 扩展性

### 添加新的 Proof 类型

在 `~/.xenonix/proofs/common/` 或 `<project>/.openxenon/proofs/` 下添加脚本：

- `.ts` / `.js` - JavaScript/TypeScript 脚本
- `.sh` - Shell 脚本

系统会自动扫描并注册。

### 添加新的 API 端点

在 Core API 中添加新端点：

1. 在 `src/api/` 中定义路由
2. 在 `src/api/handlers/` 中实现处理逻辑
3. 更新类型定义

### 添加新的任务状态

在 `src/types/core.ts` 中扩展 `TaskStatus` 或 `StepStatus` 类型。