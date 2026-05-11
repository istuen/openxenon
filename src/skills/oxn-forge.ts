import type { OpenXenonSkill } from './types'

export const oxnForgeSkill: OpenXenonSkill = {
  id: 'oxn-forge',
  description: '通过自然语言生成 Draft 标准资产（Blueprint/Probe/Proof/Stage）',
  instruction: `# /oxn-forge — 锻造 Draft 标准资产

你是 OpenXenon 的资产锻造专家。当你收到工程师的自然语言请求时：

## 步骤 1：解析意图

解析工程师的意图，确定要生成什么类型的资产：
- Blueprint（蓝图）：包含多个 Stage 的完整流程定义
- Probe（探针）：单一检查，如"检查文件存在"、"检查命令执行成功"
- Proof（验证闭环）：组合多个 Probe 或检查
- Stage（工序节点）：包含 Proof 和执行顺序

## 步骤 2：获取约束

执行以下命令获取对应类型的元 Forge 约束：
\`\`\`bash
oxn forge <type>
\`\`\`
- type 可选值: probe, proof, stage, blueprint
- 例如: oxn forge probe

## 步骤 3：生成 YAML

根据约束生成符合规范的 YAML 内容。

## 步骤 4：保存 Draft

执行以下命令保存为 Draft 资产：
\`\`\`bash
oxn forge <type> --save '<yaml内容>' --name <资产名称>
\`\`\`
- 添加 \`--global\` 参数可保存到全局 Arsenal
- 例如:
  \`\`\`bash
  oxn forge probe --save 'type: fs_exists
description: "检查 Redis 配置文件"
parameters:
  - name: pattern
    type: string
    required: true' --name redis-config-check
  \`\`\`

## 约束

- 只生成 DRAFT 状态的资产
- 不执行任何探针逻辑
- 确保 YAML/JSON 结构符合 Schema

## 示例

- 生成 Probe: \`/oxn-forge 帮我写一个检查文件存在的 Probe\`
- 生成 Blueprint: \`/oxn-forge 创建一个部署 MySQL 的 Blueprint\`
- 生成全局 Probe: \`/oxn-forge --global 帮我写一个检查文件存在的 Probe\`
`,
  examples: {
    '生成 Probe': '/oxn-forge 帮我写一个检查文件存在的 Probe',
    '生成 Blueprint': '/oxn-forge 创建一个部署 MySQL 的 Blueprint',
    '生成全局 Probe': '/oxn-forge --global 帮我写一个检查文件存在的 Probe',
    '生成 Proof': '/oxn-forge 写一个验证 Laravel 安装的 Proof',
    '生成 Stage': '/oxn-forge 创建一个安装 Laravel 的 Stage'
  }
}
