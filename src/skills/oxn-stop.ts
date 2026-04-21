import type { OpenXenonSkill } from './types'

export const oxnStopSkill: OpenXenonSkill = {
  id: 'oxn-stop',
  description: '人工熔断，要求 AI 停止一切生成行为',
  instruction: `# \`/oxn-stop \`— 停止任务执行

## 行为约束

当你收到 \`/oxn-stop\` 指令时，必须立即执行以下操作，禁止延迟或忽略。

## 步骤 1：立即停止

**立即停止**当前 Step 的所有代码生成和文件写入操作。

## 步骤 2：发送终止信号

使用 CLI 命令停止任务：

\`\`\`bash
oxn api task-stop --task-id <任务ID>
\`\`\`

## 步骤 3：确认状态

该命令会：
1. 锁定当前项目的状态机
2. 保存已完成的步骤记录
3. 标记任务为 \`stopped\` 状态

## 步骤 4：通知工程师

告知工程师："任务已停止，当前状态已保存。使用 \`/oxn-resume\` 可恢复执行。"

## 重要提醒

- 停止后，所有未完成的步骤将保持 \`pending\` 状态
- 已完成的步骤不会回滚
- 恢复执行时将从断点继续
`,
}