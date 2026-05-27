## Why

当前 OpenXenon 的输出以纯文本（YAML/JSON）为主，工程师需要手动解析 task-trace.yaml 才能理解验证结果。随着探针数量增加和 DAG 拓扑复杂化，纯文本的表达密度已达到瓶颈。同时，Blueprint YAML 的 DAG 依赖关系在纯文本状态下难以直观理解，影响 Promote 决策效率。

引入 HTML 渲染引擎后，CLI 将把 YAML/JSON 翻译为高密度可读的 HTML 报告，在不破坏"CLI 独占生成"信任边界的前提下，帮助工程师保持在 Loop 里的主权。

## What Changes

- 新增 `oxn task render <name> --format=html` 命令：将指定 Task 的 task-trace.yaml 渲染为单文件 HTML 验证报告
- 新增 `oxn arsenal render <name> --html` 命令：将 Draft Blueprint YAML 渲染为 DAG 拓扑图（纯 HTML + SVG）
- HTML 文件为只读视图，不入 Git，纯临时消费
- 所有 HTML 由 CLI 基于物理真相源（task-trace.yaml / blueprint.yaml）渲染生成，AI 绝对不可介入

## Capabilities

### New Capabilities

- `html-verdict-report`: CLI 将 task-trace.yaml 渲染为 HTML 验证报告，含颜色高亮、折叠长 stacktrace、跳转链接
- `html-blueprint-preview`: CLI 将 Blueprint YAML 渲染为 DAG 拓扑图，供 Promote 前审阅

### Modified Capabilities

- 无

## Impact

- CLI 新增 `oxn task render <name> --format=html` 和 `oxn arsenal render <name> --html` 两个命令
- 不新增外部依赖，所有 CSS/SVG 内联于单文件 HTML
- 不影响现有 YAML/JSON 输出链路
- `.gitignore` 无需修改（HTML 报告不进入版本控制）