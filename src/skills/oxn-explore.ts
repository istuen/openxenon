import type { OpenXenonSkill } from './types'

export const oxnExploreSkill: OpenXenonSkill = {
  id: 'oxn-explore',
  description: '探索项目与任务，扫描资料、AI-工程师问答、报告归档',
  instruction: `# /oxn-explore — 探索模式

## 行为约束

当你收到 \`/oxn-explore <name>\` 指令时，必须严格按以下步骤执行。

## 流程

\`\`\`
new → scan → qa → report
\`\`\`

## 步骤 1：创建探索

在终端执行以下命令创建新探索：

\`\`\`bash
oxn explore new <name>
\`\`\`

这会在 \`.openxenon/explores/<name>/\` 下创建目录结构：
- \`docs/\` - 扫描的资料文档
- \`qa.md\` - 问答记录
- \`report.md\` - 报告文档

## 步骤 2：扫描资料

根据探索目标，使用 CLI 命令扫描所需资料：

\`\`\`bash
oxn explore scan <name> --path <文件或目录>
\`\`\`

扫描的资料会保存到 \`.openxenon/explores/<name>/docs/\`

读取文档内容（仅展示，不保存）：

\`\`\`bash
oxn explore scan <name> --read <file-path>
\`\`\`

## 步骤 3：AI-工程师问答模式

这是核心步骤。AI 提出问题，工程师回答，记录关键信息。

### AI 行为

1. **先阅读已扫描的资料**
   \`\`\`bash
   cat .openxenon/explores/<name>/docs/*.md
   \`\`\`

2. **基于资料提出探索性问题**
   - 开放式问题：关于背景、目标、约束
   - 澄清性问题：确认理解、消除歧义
   - 深入性问题：挖掘细节、风险、假设

3. **记录问答**
   \`\`\`bash
   oxn explore qa <name> --add "Q:工程师的回答是什么|A:AI的理解"
   \`\`\`

4. **查看当前问答记录**
   \`\`\`bash
   oxn explore qa <name> --list
   \`\`\`

### 何时结束问答

当工程师确认信息充足时，提示可以生成报告。

### 问答格式

\`\`\`markdown
## Q: [AI的问题]
**A:** [工程师的回答]

## Q: [AI的问题]
**A:** [工程师的回答]
\`\`\`

## 步骤 4：报告

在工程师确认问答完成后，生成报告：

\`\`\`bash
oxn explore report <name>
\`\`\`

## 其他命令

### 列出所有探索
\`\`\`bash
oxn explore list
\`\`\`

### 删除探索
\`\`\`bash
oxn explore delete <name>
\`\`\`

## 探索目录结构

\`\`\`
.openxenon/explores/<name>/
├── docs/           # 扫描的资料
├── qa.md          # AI-工程师问答
└── report.md      # 最终报告
\`\`\`

## 绝对禁止

- 禁止在未创建探索目录前进行操作
- 禁止跳过扫描步骤直接进行问答
- 禁止 AI 未阅读资料就提问`,
  examples: {
    新建探索: '/oxn-explore auth-system',
    继续探索: '/oxn-explore auth-system scan',
    问答模式: '/oxn-explore auth-system qa',
  },
}
