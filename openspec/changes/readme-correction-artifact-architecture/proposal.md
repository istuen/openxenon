## Why

当前 README.md 存在关键性架构描述错误，需要修正以准确反映 OpenXenon 的宪法原则：
1. **Artifact 物理归属错误**：Section 3.1 将 Artifact 归属为 `work/<type>/<type-id>/`，实际应为宿主项目目录
2. **L0 Kernel 职责越界**：Section 8.3 描述 L0 "生成 frozen.json"，实际上 L0 只输出纯数据 Verdict，写入是 L2 的职责
3. **主/从 Agent 架构缺失**：缺少 Main Agent（战略家）与 Sub Agent（执行者）的协同模型说明
4. **Artifact 绑定机制模糊**：Probe 参数如何与真实产物路径关联，需要明确为 CLI CRUD 动态绑定方案

这些错误会导致工程师和 AI 对 OpenXenon 架构的误解，影响正确使用。

## What Changes

- **修正 Section 3.1 概念层级表**：明确 Artifact 归属为宿主项目目录（如 `src/`），Work 空间只存储 Blueprint 实例和快照
- **修正 Section 3.3 关键约束**：补充"边界与留痕原则"——OpenXenon 固化边界指导 AI 工作，而非杜绝逃逸；证据链是核心约束力
- **修正 Section 4.2 任务执行流程**：体现主/从 Agent 协同模型，以及 AI 通过 CLI CRUD 将产物路径动态绑定到 Blueprint Probe 参数的机制
- **修正 Section 7 快速开始**：verify 命令体现产物上报机制
- **修正 Section 8.2 核心流转**：验证流描述纠正，明确 L0 输出 Verdict，L2 负责生成 frozen.json
- **修正 Section 8.3 L0 职责**：L0 纯逻辑推演零 IO，只输出 Verdict，不生成任何文件

## Capabilities

### New Capabilities

无

### Modified Capabilities

无（本次为文档修正，不涉及 Spec 级别的行为变更）

## Impact

- **文档**：`README.md` 多处修正
- **架构澄清**：Main/Sub Agent 协同模型、证据链审计模型