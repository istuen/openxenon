## ADDED Requirements

### Requirement: Blueprint DAG 拓扑渲染

CLI SHALL 提供 `oxn arsenal render <name> --html` 命令，将 Blueprint YAML 渲染为单文件 HTML DAG 拓扑图。

该命令必须：
- 读取 `arsenal/draft/<name>/blueprint.yaml`（而非 Canonical 层）
- 按 DAG 拓扑序排列 Stage 节点（上游在上，下游在下）
- 用 SVG 箭头连接 parent → child 依赖关系
- 每个 Stage 节点内展示 Stage ID、policy (AND/OR/manual)、及 Probe 列表

#### Scenario: 渲染两层级联 DAG

- **WHEN** Blueprint 包含 2 层 DAG：install → build → deploy
- **THEN** HTML 中三个矩形节点垂直排列，箭头连接 install → build → deploy

#### Scenario: 渲染 AND/OR 策略标记

- **WHEN** Stage 设置 `policy: AND`
- **THEN** 该 Stage 节点内显示"AND"标签，表示其 Probes 为 AND 归约

### Requirement: Promote 前审批辅助

`oxn arsenal render --html` 的核心用途是 Promote 前的"二读"审批辅助。

该命令必须：
- 仅针对 Draft 层（Canonical 层不提供此渲染能力）
- 提供"Promote to Canonical"按钮，唤起 `oxn arsenal promote`
- 提供"Cancel"按钮关闭预览
- 提供"Edit YAML"按钮，用系统默认编辑器打开 YAML 源文件

#### Scenario: 工程师预览后决定 Promote

- **WHEN** 工程师通过 HTML 拓扑图确认 DAG 依赖无误
- **THEN** 点击"Promote to Canonical"执行 `oxn arsenal promote`

#### Scenario: 工程师预览后决定修改 YAML

- **WHEN** 工程师通过 HTML 拓扑图发现 DAG 依赖有误
- **THEN** 点击"Edit YAML"，用编辑器修改后重新渲染预览

### Requirement: 单文件 HTML 内联设计

拓扑图 HTML 必须满足：
- 所有 CSS/SVG 内联，零外部依赖
- 可在任何现代浏览器中打开
- 响应式设计，支持桌面和移动端
- 不进入 Git 版本控制，纯临时消费

#### Scenario: 无网络环境下打开拓扑图

- **WHEN** 工程师在无网络环境中执行 `oxn arsenal render --html`
- **THEN** HTML 文件正常渲染，DAG 拓扑完整显示，不依赖任何 CDN