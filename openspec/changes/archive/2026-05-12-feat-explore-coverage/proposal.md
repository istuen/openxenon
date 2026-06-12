## Why

当前 OpenXenon 是单向消耗型验证：Blueprint → Stage → Probe → Verdict → 结束。没有反馈，没有积累。

探索机制需要解决两个问题：
1. **输出形式**：终端输出无法持久化，无法自举验证
2. **扩展性**：每加一个探索维度就要改代码，和早期硬编码 Probe 的错误一样

新设计的关键洞察：**探索器和 Probe 是同构的**。Probe 验证文件状态，探索器探索项目状态。两者都输出文件，都可被验证。

## What Changes

- 新增 `Exploration` 资产类型：定义探索规则（YAML）
- 新增 `ExplorationResult` 类型：统一所有探索维度的输出
- 新增 `evaluateExploration` 通用引擎：规则 + 上下文 → Findings
- 新增 `renderMarkdown` 渲染器：ExplorationResult → Markdown
- 新增 `collectContext` 数据采集：扫描项目、Arsenal、Trace
- 新增 `oxn explore` 命令：调度探索器，输出 Markdown 到 `.openxenon/explore/`
- 新增 3 个探索器资产：coverage、quality、automation

## Capabilities

### New Capabilities

- `exploration`：探索器资产，定义探索规则
- `exploration-engine`：通用探索分析引擎
- `exploration-report`：Markdown 格式的探索报告

### Modified Capabilities

（无规格变更，仅新增功能）

## Impact

- `src/kernel/explore/types.ts` — 新增（Finding, ExplorationResult）
- `src/kernel/explore/evaluator.ts` — 新增（evaluateExploration 纯函数）
- `src/kernel/explore/reporter.ts` — 新增（renderMarkdown 纯函数）
- `src/infra/explore/collector.ts` — 新增（collectContext, saveReport）
- `src/cli/explore.ts` — 新增
- `src/arsenals/explorations/coverage/canonical.yaml` — 新增
- `src/arsenals/explorations/quality/canonical.yaml` — 新增
- `src/arsenals/explorations/automation/canonical.yaml` — 新增
- `src/cli/entry.ts` — 修改（注册 explore 命令）
