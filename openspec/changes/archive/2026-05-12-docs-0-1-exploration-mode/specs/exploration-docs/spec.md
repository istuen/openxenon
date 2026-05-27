# exploration-docs

## ADDED Requirements

### Requirement: README.md 必须反映项目探索状态

README.md SHALL 以"探索工程师意图如何成为 AI 工程里的资产"为核心定位，替代原有的"控制引擎"定性描述。

README.md SHALL 包含以下章节：

- 当前状态：明确标注 0.1 探索阶段
- 核心假设表：列出 H1-H4 假设及验证方式
- 自举定义表：明确 L1/L2/L3 各级成功标准
- CLI 速查表：标注每个命令是否依赖 Daemon
- 架构概要：用简洁图示说明当前架构

### Requirement: architecture.md 版本号必须与代码版本对齐

architecture.md SHALL 将版本从"1.1 物理学定稿"修改为"0.1 探索阶段"。

architecture.md SHALL 在文档头部明确标注"物理学框架已建立，核心假设待验证"。

### Requirement: architecture.md §5 必须区分 CLI-direct 和 Daemon 两种模式

§5 运行模式章节 SHALL 明确区分：

- 0.1 CLI 直连模式：所有核心命令可用的实际运行模式
- 0.2 Daemon 裁决模式：标注为"目标架构，当前尚未完全实现"
- 两种模式的对比表：包含状态管理、逃逸检测、并发控制等维度

### Requirement: architecture.md 必须包含探索问题清单

§1 概述章节 SHALL 新增"探索问题清单"，包含但不限于：

- Q1: 约束能否提升 AI 生成质量？
- Q2: 资产复用是否可行？
- Q3: 工程师意图能否系统资产化？
- Q4: Probe 验证是否比人工检查更可靠？
- Q5: 物理学架构是否必要？（标注为最关键问题）
- Q6: Daemon 裁决模式是否优于 CLI 直连？

每个问题 SHALL 包含验证指标和目标值。

### Requirement: architecture.md §8/9/10 必须标注为 0.2 目标

逃逸检测（§8）、安全模型（§9）、ESLint 铁丝网（§10）SHALL 标注为"0.2 目标，当前尚未实现"。

### Requirement: 自举验证定义必须明确 L2 为 0.1 目标

自举验证定义 SHALL 明确三级标准：

- L1 编译自举：pnpm build 产出可执行二进制
- L2 资产自举：Forge→Draft→Promote→Task→Verify 全链路跑通（0.1 目标）
- L3 质量自举：OpenXenon 自身开发通过 OpenXenon 管理（0.2 目标）
