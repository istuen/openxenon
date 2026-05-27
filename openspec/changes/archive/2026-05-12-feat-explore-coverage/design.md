## Context

当前 OpenXenon 是单向消耗型验证，探索机制的目标是建立反馈回路。

关键设计洞察：**探索器和 Probe 是同构的**

| | Probe (验证) | Exploration (探索) |
|--|--|--|
| 原子定义 | canonical.yaml (type + params) | canonical.yaml (name + rules) |
| 执行层 | Infra/probes/ | Infra/explore/ |
| 分析层 | Kernel/evaluator → Verdict | Kernel/evaluator → Findings |
| 输出 | task-trace.yaml | Markdown 文件 |
| 自举验证 | 已实现 | fs_exists + fs_match |

## Goals / Non-Goals

**Goals:**
- 探索器作为 Arsenal YAML 资产定义
- 通用分析引擎，不理解具体维度语义
- Markdown 报告输出到 `.openxenon/explore/`
- 可自举验证（用 Probe 验证报告存在和格式）

**Non-Goals:**
- 不做自动 Draft 生成（Phase 2）
- 不做 confidence 分数
- 不跨项目分析

## Decisions

**统一类型系统**

不区分 CoverageGap、UnusedProbe、LintResult 等具体类型。只有 `Finding`：level + message + location + suggestion + evidence。

**规则引擎而非硬编码**

每个探索维度由 YAML 规则定义，Kernel 的 `evaluateExploration` 是通用匹配器。把声明式条件翻译为对上下文的查询。

**ExplorationContext 是纯数据**

```
projectFiles: string[]
projectDirs: { path, fileCount, hasTests }[]
probes: { type, pattern, source }[]
blueprintProbeRefs: { type, count }[]
traceSummary?: { totalStages, passRate, probeStats }
```

**按需扫描**

每次 `oxn explore` 执行时 glob 扫描，不持久化中间状态。

## Risks / Trade-offs

- 规则条件表达式需要简单、安全 → 限制支持的操作符
- 内置探索器的 pattern 如何定义 → 先 hardcode，后续作为探索器自己探索
