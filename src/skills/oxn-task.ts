import type { OpenXenonSkill } from './types'
import type { Stage } from '../kernel/lib/types/stage'

export const oxnTaskSkill: OpenXenonSkill = {
  id: 'oxn-task',
  description: '发起 OpenXenon 任务，依据 Target State 拆解并提交 Blueprint',
  instruction: `# \`/oxn-task\` — 发起 OpenXenon 任务

## 行为约束

当你收到 \`/oxn-task <需求>\` 指令时，必须严格按以下步骤执行，禁止自由发挥。

## 步骤 1：确保 Daemon 运行

在终端执行以下命令确保 Core daemon 正在运行：

\`\`\`bash
oxn daemon start
\`\`\`

如果 daemon 已运行则跳过此步骤。

## 步骤 2：搜索可用资产

使用 CLI 命令搜索可用的 Stage/Probe 资产：

\`\`\`bash
oxn arsenal search <关键词>
\`\`\`

该命令返回当前项目可用的 Arsenal 资产列表。

## 步骤 3：拆解任务

基于用户需求和可用资产列表，按照 Target State 理念拆解任务：

1. 确定最终目标状态（Target State）
2. 逆向推导所需的中间 Stage
3. 为每个 Stage 选择合适的 Probe

## 步骤 4：编写 Blueprint

将 Blueprint 保存为 YAML 文件（如 \`my-task.yaml\`），包含：
- 任务名称
- 各个 Stage 的定义和依赖关系
- 每个 Stage 对应的 Probe

## 步骤 5：提交 Blueprint

将填充好的 Blueprint 提交给 Daemon：

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

## 绝对禁止

- 禁止跳过任何步骤
- 禁止使用 HTTP/curl 调用，必须使用 CLI 命令
- 禁止在未通过 Core 验证的情况下自行推进任务
`,
  examples: {
    stage_example: {
      id: 'stage_1',
      name: '定义数据模型',
      spec: { constraints: ['必须使用 TypeScript 接口定义 User 类型'] },
      proof: 'fs-content-match',
    } as unknown as Stage,
    target_state: {
      type: 'file_content',
      path: 'src/types/user.ts',
      must_contain: 'export interface User',
    },
  },
}