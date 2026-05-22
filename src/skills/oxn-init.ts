import type { OpenXenonSkill } from './types'

export const oxnInitSkill: OpenXenonSkill = {
  id: 'oxn-init',
  description: '初始化项目围栏，在当前项目植入 OpenXenon 基因',
  instruction: `# \`/oxn-init\` — 初始化 OpenXenon 项目围栏

## 行为约束

当 你收到 \`/oxn-init\` 指令时，必须严格按以下步骤执行，禁止自由发挥。

## 步骤 1：初始化项目围栏

在终端执行以下命令：

\`\`\`bash
oxn init
\`\`\`

该命令会：
1. 在当前目录创建 \`.openxenon/\` 目录
2. 创建 \`project.oxn\` 数据库
3. 向全局 \`core.oxn\` 注册当前项目路径

## 步骤 2：验证初始化结果

执行以下命令验证：

\`\`\`bash
ls .openxenon/
\`\`\`

应显示 \`.openxenon/\` 目录内容。

## 步骤 3：通知工程师

告知工程师："项目围栏已建立，可以使用 \`/oxn-task\` 发起任务。"

## 错误处理

- 如果 \`oxn\` 命令不存在，提示工程师安装 OpenXenon CLI
- 如果项目已初始化，告知工程师当前状态`,
}
