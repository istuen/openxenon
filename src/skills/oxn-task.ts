import type { OpenXenonSkill } from './types'

const blueprintFormatMd = `# Blueprint 格式参考（oxn-task 用）

## 基本结构

\`\`\`yaml
name: <blueprint名称>
stages:
  - id: <stage唯一标识>
    name: <显示名称>
    deps: [<依赖的stage id>]   # 可选
    target:
      description: <目标描述>
    spec:
      description: <规格描述>
    probes:
      - type: <探针类型>
        params:
          <探针参数>
\`\`\`

## 完整示例

\`\`\`yaml
name: deploy-mysql
stages:
  - id: prepare
    name: 准备环境
    target:
      description: Docker 环境就绪
    probes:
      - type: exec_exit_zero
        params:
          command: docker ps | grep mysql
  - id: deploy
    name: 部署 MySQL
    deps: [prepare]
    target:
      description: MySQL 数据目录存在
    probes:
      - type: fs_exists
        params:
          pattern: "/data/mysql"
\`\`\`

## probes 参数速查

\`\`\`yaml
fs_exists:        { pattern: "glob模式" }
fs_not_exists:    { pattern: "glob模式" }
fs_content_match: { path: "文件路径", contains: "正则" }
exec_exit_zero:   { command: "shell命令" }
\`\`\`

## 命令用法

### 提交任务
\`\`\`bash
oxn task submit --blueprint <path-to-blueprint.yaml>
\`\`\`

### 获取下一个 Stage
\`\`\`bash
oxn task next --task-id <taskId>
\`\`\`

### 验证 Stage
\`\`\`bash
oxn task verify --task-id <taskId> --stage-id <stageId>
\`\`\`

## Task 工作流

\`\`\`
submit → next → execute → verify → (repeat until done)
\`\`\`

1. submit：提交 Blueprint，创建任务
2. next：获取当前需要执行的 Stage
3. execute：AI 执行 Stage 定义的工作
4. verify：验证 Stage 是否通过
5. 循环直到所有 Stage 完成

## ❌ 常见错误

1. **使用了旧类型名**
   \`\`\`yaml
   # 错误
   type: fs_match        # 旧名，应改为 fs_content_match
   type: shell_exec      # 旧名，应改为 exec_exit_zero

   # 正确
   type: fs_content_match
   type: exec_exit_zero
   \`\`\`

2. **fs_content_match 使用了错误的参数名**
   \`\`\`yaml
   # 错误
   type: fs_content_match
   params:
     pattern: "*.ts"        # 错误：应该是 path
     contains: "export"

   # 正确
   type: fs_content_match
   params:
     path: "*.ts"
     contains: "export"
   \`\`\`
`

export const oxnTaskSkill: OpenXenonSkill = {
  id: 'oxn-task',
  description: '发起 OpenXenon 任务，依据 Target State 拆解并提交 Blueprint',
  instruction: `# /oxn-task — 发起 OpenXenon 任务

## 行为约束

当你收到 \`/oxn-task <需求>\` 指令时，必须严格按以下步骤执行，禁止自由发挥。

## 步骤 1：初始化项目围栏（如需要）

在终端执行以下命令确保项目围栏存在：

\`\`\`bash
oxn init
\`\`\`

## 步骤 2：列出可用资产

使用 CLI 命令列出可用的 Stage/Probe 资产：

\`\`\`bash
oxn arsenal list
\`\`\`

该命令返回当前项目可用的 Arsenal 资产列表。

## 步骤 3：拆解任务

基于用户需求和可用资产列表，按照 Target State 理念拆解任务：

1. 确定最终目标状态（Target State）
2. 逆向推导所需的中间 Stage
3. 为每个 Stage 选择合适的 Probe

## 步骤 4：编写 Blueprint

将 Blueprint 保存为 YAML 文件（如 my-task.yaml），包含：
- 任务名称
- 各个 Stage 的定义和依赖关系
- 每个 Stage 对应的 Probe

## 步骤 4.1：创建任务描述文档

在提交 Blueprint 前，先创建任务描述文档 task.md：

\`\`\`markdown
# <任务名称>

## 目标
<工程师期望达成的最终状态>

## 背景
<为什么需要这个任务，有什么约束条件>

## 执行计划
<拆解的 Stage 列表和各自目标>

## 验收标准
<工程师如何判断任务成功完成>
\`\`\`

## 步骤 5：提交 Blueprint

将填充好的 Blueprint 提交：

\`\`\`bash
oxn task submit --blueprint <path-to-blueprint.yaml>
\`\`\`

该命令会创建任务并返回 taskId。

## 步骤 6：获取下一个 Stage

\`\`\`bash
oxn task next --task-id <taskId>
\`\`\`

## 步骤 7：执行并验证

1. AI 执行 Stage 定义的工作
2. 执行完成后，提交验证：

\`\`\`bash
oxn task verify --task-id <taskId> --stage-id <stageId>
\`\`\`

## 步骤 8：循环直到完成

重复步骤 6-7，直到所有 Stage 通过验证。

## 参考

需要 Blueprint 详细格式说明时，读取：
- references/blueprint-format.md：格式说明 + 命令用法 + 完整示例

## 绝对禁止

- 禁止跳过任何步骤
- 禁止使用 HTTP/curl 调用，必须使用 CLI 命令
- 禁止在未通过 Core 验证的情况下自行推进任务
`,
  examples: {
    '提交任务': '/oxn-task 部署 Laravel 应用',
    '查看状态': '/oxn-task 查看部署进度',
  },
  references: [
    { filename: 'blueprint-format.md', content: blueprintFormatMd }
  ]
}