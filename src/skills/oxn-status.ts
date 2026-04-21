import type { OpenXenonSkill } from './types'

export const oxnStatusSkill: OpenXenonSkill = {
  id: 'oxn-status',
  description: '状态体检，通过自然语言了解项目进度',
  instruction: `# /oxn-status — 查看任务状态

## 行为约束

当你收到 \`/oxn-status\` 指令时，必须严格按以下步骤执行，禁止自由发挥。

## 步骤 1：获取 Core 通信地址

\`\`\`bash
oxn api base
\`\`\`

## 步骤 2：请求项目状态

\`\`\`bash
curl -s $(oxn api base)/api/v1/task/status
\`\`\`

## 步骤 3：解读状态并报告

将返回的状态转化为人类易读的进度报告：

1. **任务概览**：任务名称、总体状态
2. **步骤进度**：已完成/总数，当前步骤
3. **验证记录**：每个步骤的验证结果
4. **异常信息**：如有失败步骤，说明失败原因

## 输出格式

向工程师输出简洁的状态摘要：

\`\`\`
任务: <任务名称>
状态: <running|completed|failed>
进度: <N>/<M> 步骤完成
当前: <当前步骤名称>
\`\`\`

## 错误处理

- 如果没有活跃任务，告知工程师当前无任务
- 如果 Core 未运行，提示工程师启动 daemon
`,
}
