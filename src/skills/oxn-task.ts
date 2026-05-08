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

## 步骤 2：申请可用探针与空白 Blueprint

使用 CLI 命令获取可用 Proof 探针列表：

\`\`\`bash
oxn api proofs-list
\`\`\`

该命令返回当前项目可用的 Proof 探针列表。

## 步骤 3：拆解任务

基于用户需求和返回的探针列表，按照 Target State 理念拆解任务：

1. 确定最终目标状态（Target State）
2. 逆向推导所需的中间 Stage
3. 为每个 Stage 绑定合适的 Proof 探针

## 步骤 4：提交 Blueprint

将填充好的 Blueprint 提交给 Core 进行预验证：

\`\`\`bash
oxn api task-submit \\
  --task "<任务描述>" \\
  --steps '[{"name":"<Stage 名称>","spec":"<约束规范>","proof":"<探针名称>"}]'
\`\`\`

## 步骤 5：处理预验证结果

- 若返回 \`PREVALIDATED\`：进入执行循环，开始执行第一个 Stage
- 若返回 \`REJECTED\`：依据 error 信息修正 Blueprint 后重新提交

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