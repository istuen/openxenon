## 1. 项目结构与基础设施

- [x] 1.1 在 `src/cli/` 下新建 `render/` 目录，用于存放 HTML 渲染相关模块
- [x] 1.2 创建 `src/cli/render/task-trace-renderer.ts` - task-trace.yaml → HTML
- [x] 1.3 创建 `src/cli/render/blueprint-renderer.ts` - blueprint.yaml → HTML DAG
- [x] 1.4 创建 `src/cli/render/templates/` - 内联 HTML/CSS/SVG 模板字符串

## 2. Task Trace HTML 渲染器

- [x] 2.1 实现 `taskTraceToHtml(trace: TraceEvent[]): string` 纯函数
- [x] 2.2 实现 SVG 折叠 stacktrace 组件（FAILED Probe 用）
- [x] 2.3 实现"Copy Error"按钮的 Clipboard API 集成
- [x] 2.4 实现"Open in Browser"调用 `open()` 系统命令
- [x] 2.5 实现响应式 CSS 布局（桌面/移动端自适应）
- [x] 2.6 验证：Kernel 无 I/O import（纯函数）
- [x] 2.7 验证：生成的文件是单文件 HTML（无外部依赖）

## 3. Blueprint DAG HTML 渲染器

- [x] 3.1 实现 `blueprintToDagHtml(blueprint: BlueprintYAML): string` 纯函数
- [x] 3.2 实现 DAG 拓扑排序算法（按依赖序排列 Stage 节点）
- [x] 3.3 实现 SVG 绘制节点和箭头连线
- [x] 3.4 在节点内渲染 Stage ID、policy 标签、Probe 列表
- [x] 3.5 实现"Promote to Canonical"按钮（唤起子进程执行 `oxn arsenal promote`）- 通过 URL scheme 实现
- [x] 3.6 实现"Edit YAML"按钮（调用 `open -a <editor>` 打开源文件）- 已在 spec 中设计，简化实现
- [x] 3.7 实现响应式 CSS 布局
- [x] 3.8 验证：Kernel 无 I/O import（纯函数）

## 4. CLI 命令集成

- [x] 4.1 在 `src/cli/task.ts` 新增 `render <task-id> --format=html` 子命令，调用 taskTraceToHtml
- [x] 4.2 在 `src/cli/arsenal.ts` 新增 `render <name> --html` 子命令，调用 blueprintToDagHtml
- [x] 4.3 实现临时 HTML 文件的生成逻辑（每次生成带时间戳的唯一文件）
- [x] 4.4 在终端输出"HTML 报告已生成，正在打开浏览器..."提示
- [x] 4.5 验证：AI 无法通过 step-manifest 注入 HTML 字段（CLI 忽略该字段，只读取 task-trace.yaml）

## 5. 端到端测试

- [ ] 5.1 准备一个含 FAILED Probe 的 task-trace.yaml，测试 `oxn task render <name> --format=html`
- [ ] 5.2 准备一个 3 层依赖的 Draft Blueprint，测试 `oxn arsenal render <name> --html`
- [ ] 5.3 验证 HTML 报告在 Safari/Chrome 中正常渲染
- [ ] 5.4 验证无网络环境下 HTML 完整可读（零外部依赖）
- [ ] 5.5 测试"Copy Error"按钮是否正确复制到剪贴板