import type { OpenXenonSkill } from './types'

export const oxnResumeSkill: OpenXenonSkill = {
  id: 'oxn-resume',
  description: '恢复断点，从中止的步骤继续执行',
  instruction: `# /oxn-resume — 恢复任务执行

## 行为约束

当你收到 \`/oxn-resume\` 指令时，必须严格按以下步骤执行，禁止自由发挥。

## 步骤 1：获取 Core 通信地址

\`\`\`bash
oxn api base
\`\`\`

## 步骤 2：查询当前任务状态

\`\`\`bash
curl -s $(oxn api base)/api/v1/task/status
\`\`\`

## 步骤 3：定位断点

从返回的状态中确定：
1. 当前执行到哪个 Step
2. 该 Step 的状态（pending/running/failed）
3. 失败原因（如有）

## 步骤 4：恢复执行

- 如果 Step 状态为 \`failed\`：分析失败原因，修正问题后重新执行
- 如果 Step 状态为 \`running\`：检查是否需要回滚
- 如果 Step 状态为 \`pending\`：直接开始执行

## 步骤 5：继续执行循环

按照 Blueprint 继续执行剩余步骤，每完成一步都要请求 Core 验证。

## 错误处理

- 如果没有活跃任务，提示工程师使用 \`/oxn-task\` 发起新任务
- 如果任务已完成，提示工程师查看 \`/oxn-trace\` 获取案卷
`,
}
