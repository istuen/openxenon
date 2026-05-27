## ADDED Requirements

### Requirement: CLI 渲染 HTML 验证报告

CLI SHALL 提供 `oxn task render <name> --format=html` 命令，基于指定 Task 的 `task-trace.yaml` 渲染单文件 HTML 验证报告。

报告必须包含以下内容：
- Task 整体状态（PASSED / FAILED / ESCAPED）及其持续时间
- 每个 Stage 的执行状态、耗时及关联的 Probe 结果
- FAILED 的 Probe 必须红色高亮，并折叠显示完整 stacktrace
- 每个 Probe 结果提供"Jump to: <相关文件>"跳转链接（如果适用）
- 提供"Copy Error"按钮，复制错误信息到剪贴板
- 提供"Open in Browser"按钮，调用系统默认浏览器打开 HTML 文件

报告格式要求：
- 单文件 HTML，所有 CSS/SVG 内联，零外部依赖
- 不进入 Git 版本控制，纯临时消费
- 可在手机/桌面浏览器中自适应显示

#### Scenario: Task 验证失败时生成 HTML 报告

- **WHEN** human 执行 `oxn task render t123 --format=html`
- **THEN** CLI 读取 `task-trace.yaml`，渲染 HTML 报告并打开系统默认浏览器

#### Scenario: 报告高亮失败探针

- **WHEN** 某个 Probe 的结果为 FAILED
- **THEN** 该 Probe 在 HTML 报告中红色高亮，其 stacktrace 折叠显示

#### Scenario: 复制错误信息

- **WHEN** human 点击 Probe 结果旁的"Copy Error"按钮
- **THEN** 该 Probe 的错误信息被复制到系统剪贴板

### Requirement: CLI 渲染 Blueprint DAG 拓扑预览

CLI SHALL 提供 `oxn arsenal render <name> --html` 命令，将 Draft Blueprint YAML 渲染为 DAG 拓扑图。

预览必须包含以下内容：
- 每个 Stage 为一个节点，节点显示 Stage ID 和 policy (AND/OR/manual)
- DAG 依赖关系用箭头连接（parent → child）
- 每个 Stage 节点内列出其包含的 Probes（type + 参数摘要）
- 提供"Promote to Canonical"按钮（唤起 `oxn arsenal promote`）
- 提供"Cancel"按钮（返回上一级）
- 提供"Edit YAML"按钮（唤起系统默认编辑器打开 YAML 文件）

拓扑渲染要求：
- 使用内联 SVG 绘制节点和连线
- 节点按 DAG 拓扑序排列（上游节点在上游，下游节点在下游）
- 方向性依赖用箭头明确标识

#### Scenario: Promote 前预览 Draft Blueprint

- **WHEN** human 执行 `oxn arsenal render deploy-shopify --html`
- **THEN** CLI 读取 `arsenal/draft/deploy-shopify/blueprint.yaml`，渲染 DAG 拓扑图并打开浏览器

#### Scenario: Blueprint 含多层级依赖

- **WHEN** Blueprint 存在 3 层以上 DAG 依赖
- **THEN** 拓扑图垂直排列各层节点，用箭头连接 parent → child，保持拓扑序

### Requirement: AI 禁止生成 HTML

AI 不得生成任何用于呈现验证结果或 Blueprint 拓扑的 HTML 文件。该约束为物理约束，通过以下方式保证：
- CLI 渲染引擎不接受 AI 的输出作为输入
- HTML 生成命令（`oxn task render <name> --format=html`、`oxn arsenal render <name> --html`）的输入源只能是文件系统中的 YAML/JSON
- 不提供任何 AI → HTML 的桥接路径

#### Scenario: AI 尝试通过 step-manifest 注入 HTML

- **WHEN** AI 在 `step-manifest.json` 中添加 `html_report` 字段
- **THEN** CLI 忽略该字段，只读取 task-trace.yaml 进行渲染