## Context

当前 OpenXenon CLI 的输出链路基于纯文本（YAML/JSON）。task-trace.yaml 是验证执行的历史记录，Blueprint YAML 定义了 DAG 拓扑依赖。两者均为机器友好的纯文本格式，但人类阅读成本高。

随着探针数量增长和 Stage DAG 复杂化，纯文本的表达密度已达到瓶颈：超过 100 行的 trace 工程师基本不会通读，超过 3 层依赖的 Blueprint 也难以在脑内重建拓扑。

## Goals / Non-Goals

**Goals:**
- 提供 `--format=html` 输出选项，CLI 基于物理真相源渲染单文件 HTML 报告
- 验证报告高亮 PASSED/FAILED，含折叠长 stacktrace，提供跳转链接
- Blueprint 预览渲染 DAG 拓扑图，供 Promote 前审阅
- HTML 为只读视图，不入 Git，纯临时消费

**Non-Goals:**
- 不实现交互式 HTML 编辑器（违反 Blueprint 手写 YAML 的物理约束）
- 不允许 AI 生成任何 HTML（信任边界不可越界）
- 不内嵌 Web 服务器（极简减法原则）
- 不改变现有 YAML/JSON 输出链路

## Decisions

### 决策 1：渲染时机与命令拓扑

| 命令 | 输入 | 渲染者 | 时机 |
|------|------|--------|------|
| `oxn task render <name> --format=html` | task-trace.yaml | CLI (读命令) | Task 结束后 human 主动触发 |
| `oxn arsenal render <name> --html` | blueprint.yaml | CLI (读命令) | Promote 前 human 主动触发 |

两者均为"读命令"，CLI 只读取文件系统并渲染，不涉及实时写入。因此渲染逻辑属于 CLI 的"Export 模块"，不涉及 Daemon/Core 的写入链路。

### 决策 2：HTML 单文件内联设计

所有 CSS/SVG 内联于单一 HTML 文件，零外部依赖。理由：
- 方便分享（同事在任何设备打开 URL 即可）
- 不依赖 CDN/网络
- 文件可存档、可转发

DAG 拓扑图使用纯 HTML + SVG 手绘节点和连线，手动计算拓扑序并绘制箭头，不依赖任何外部库。

### 决策 3：Blueprint 预览仅针对 Draft

`oxn arsenal render <name> --html` 默认读取 Draft 层 (`arsenal/draft/<name>/blueprint.yaml`)，而非 Canonical 层。Draft 是 Promote 前的最后审批节点，此时渲染 HTML 提供"公开展读"的视觉辅助。一旦 Promote，Blueprint 即成为铁律，再渲染 HTML 仅作存档查阅，价值有限。

### 决策 4：AI 完全踢出 HTML 生成链路

HTML 渲染器属于 CLI 的 Pure Function，AI 无权调用。所有 HTML 基于文件系统中的物理真相源（task-trace.yaml / blueprint.yaml），经 CLI 渲染引擎转换生成。这确保了报告的信任根不被污染。

## Risks / Trade-offs

| 风险 | 描述 | 缓解方案 |
|------|------|----------|
| HTML 生成耗时 | 复杂 DAG 渲染可能较慢 | 控制在秒级，可用 loading spinner |
| 版本不一致 | HTML 报告与源码不同步 | HTML 纯临时消费，不入版本控制 |
| 终端兼容性 | `open` 命令依赖系统浏览器 | 提示用户备用方案：`--output <path>` 导出文件 |

## Open Questions

- 是否需要在 `oxn task verify` 失败时自动提示生成 HTML 报告？
- Blueprint 预览是否需要支持 Canonical 层（用于存档查阅）？
- HTML 报告是否需要提供 PDF 导出选项？
- DAG 节点布局算法是否需要支持横向（LR）+ 纵向（TB）两种模式？