## Why

当前文档（architecture.md 和 README.md）存在严重的定位问题：

1. **版本错位**：文档标题写"1.1 物理学定稿"，实际代码处于 0.1 探索阶段，大量目标特性（Daemon 裁决、ESLint 铁丝网、逃逸检测）尚未实现

2. **架构错位**：文档描述 Daemon-center 架构，但 0.1 实际运行在 CLI-direct 模式（不依赖 Daemon）

3. **定性而非探索**：文档措辞像产品宣传（"控制引擎"、"可靠可追溯"），而非实验记录（"我们假设 X，验证中"）

这导致：
- 新工程师阅读文档后以为系统已是成熟产品，踩坑后才知道是探索阶段
- 代码实现与文档描述不符时，工程师难以判断是"代码 bug"还是"文档超前"

## What Changes

- **README.md**：从"定性型"改为"探索型"，明确 0.1 状态、核心假设、自举定义、CLI 依赖说明
- **architecture.md §1**：新增"探索问题清单"（Q1-Q6）和"自举定义"章节，概述改为探索型措辞
- **architecture.md §5**：完全重写，明确区分 CLI-direct（0.1 当前）和 Daemon 裁决（0.2 目标）
- **architecture.md 版本/状态**：从"1.1 物理学定稿"改为"0.1 探索阶段"
- **architecture.md §8/9/10**：标注为 0.2 目标，不属于 0.1 范围
- **architecture.md §11**：辐射狗清单更新为实际状态，新增实际目录结构

## Capabilities

### New Capabilities

- `exploration-docs`：文档体系从"定性描述目标"转为"探索记录当前状态"，包含核心假设清单、自举定义、0.1 vs 0.2 架构对比

### Modified Capabilities

（无——本次仅文档改动，不涉及 spec 级别的行为变更）

## Impact

- **文档**：docs/architecture.md、docs/README.md
- **无代码变更**：不影响运行时行为
- **无破坏性变更**：纯文档更新
