## Why

docs/manual 是新工程师的第一接触点，但它描述的是"理想态 Core 引擎架构"，不是 0.1 的实际状态。

**核心错位**：01/02/03 的内容结构是按"Core 引擎是中心"设计的，但 0.1 根本没有 Core 引擎——是 CLI-direct 模式。

这导致：
- 新工程师看完 manual，以为系统是"Daemon + CLI → Core"架构
- 实际 0.1 是"CLI 直接调用 Kernel + Infra"，没有任何常驻进程
- 手册里的"逃逸检测"、"熔断"、"明线/暗线"都是 0.2 目标，不是 0.1 功能

## What Changes

### 重写（3 个文件）

**01-intro.md**：
- 删除"综合集成研讨厅"（学术化）
- 删除"工程化控制引擎"（定性过度）
- 重写架构图为 CLI-direct 模式
- 删除"逃逸检测"、"熔断"、"围栏式 vs 放养式"等未实现概念

**02-concepts.md**：
- 删除术语表中的旧概念：Core 引擎、降维执行器、负熵源、明线/暗线、逃逸检测、模型逃逸、样本分支
- 保留有效概念：Blueprint、Arsenal、Stage、Proof、Probe
- 删除 Sample 机制（已废弃）
- 更新 space.oxn → task-trace.yaml

**03-lifecycle.md**：
- 删除以 Core 引擎为中心的流程图
- 删除"三种水流"（正常流/偏差流/演化流）
- 删除 Sample 机制
- 删除熔断逻辑
- 重写为 0.1 CLI-direct 实际流程

### 改（1 个文件）

**README.md (manual)**：
- 术语替换：Core 引擎 → Daemon（或删除）
- 命令签名修正：oxn task new → oxn task submit --blueprint
- "提交任务到 Core" → "提交任务"

### 微调（3 个文件）

**04-cli-ref.md**：
- "Core 引擎生命周期" → "Daemon 进程管理"

**05-arsenal.md**：
- "Core Zod Schema 校验" → "Kernel Schema 校验"
- 更新目录结构描述

**06-troubleshooting.md**：
- "Core 引擎无响应" → "Daemon 无响应"

**07-dev.md**：
- "Core 引擎守护进程" → "Daemon"
- git clone URL 修正

## Capabilities

### New Capabilities

- `manual-intro-rewrite`：01-intro.md 重写，CLI-direct 架构图
- `manual-concepts-prune`：02-concepts.md 删除废弃概念，保留有效概念
- `manual-lifecycle-rewrite`：03-lifecycle.md 重写为 CLI-direct 流程

### Modified Capabilities

- `manual-readme-fix`：README.md 术语替换和命令签名修正
- `manual-cli-ref-fix`：04-cli-ref.md 术语微调
- `manual-arsenal-fix`：05-arsenal.md 术语和目录结构修正
- `manual-troubleshooting-fix`：06-troubleshooting.md 术语微调
- `manual-dev-fix`：07-dev.md 术语和 URL 修正

## Impact

- **文档**：docs/manual/（7 个文件）
- **无代码变更**：不影响运行时行为
- **无破坏性变更**：纯文档更新，不影响功能描述准确性（因为原描述本来就不准确）
