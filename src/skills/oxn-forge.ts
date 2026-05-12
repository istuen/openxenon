import type { OpenXenonSkill } from './types'

const probeFormatMd = `# Probe 格式参考

## Forge 格式 vs Blueprint 格式（⚠️ 最常见的混淆）

Forge 定义的是"能力声明"（我需要什么参数）：
\`\`\`yaml
type: fs_exists
description: "检查文件存在"
parameters:           ← 注意：是数组
  - name: pattern
    type: string
    required: true
\`\`\`

Blueprint 定义的是"调用方式"（我传什么值）：
\`\`\`yaml
type: fs_exists
params:               ← 注意：是对象
  pattern: "src/**/*.ts"
\`\`\`

⚠️ \`oxn forge probe -s\` 用的是 Forge 格式，不是 Blueprint 格式！

## 各类型参数速查

### fs_exists
参数：pattern (string, required) — glob 模式

示例：
\`\`\`yaml
type: fs_exists
description: "检查配置文件存在"
parameters:
  - name: pattern
    type: string
    required: true
    description: "要检查的文件 glob 模式"
\`\`\`

### fs_not_exists
参数：pattern (string, required) — glob 模式

示例：
\`\`\`yaml
type: fs_not_exists
description: "检查临时文件已清理"
parameters:
  - name: pattern
    type: string
    required: true
    description: "不应存在的文件模式"
\`\`\`

### fs_match
参数：pattern (string, required) + contains (string, required)

示例：
\`\`\`yaml
type: fs_match
description: "检查源码包含版权声明"
parameters:
  - name: pattern
    type: string
    required: true
    description: "文件路径"
  - name: contains
    type: string
    required: true
    description: "文件内容必须匹配的正则"
\`\`\`

### shell_exec
参数：command (string, required)

示例：
\`\`\`yaml
type: shell_exec
description: "执行 lint 检查"
parameters:
  - name: command
    type: string
    required: true
    description: "要执行的 shell 命令"
\`\`\`

## ❌ 常见错误

1. **Forge 格式写成 Blueprint 格式**
   \`\`\`yaml
   # 错误
   type: fs_exists
   params: { pattern: "src" }

   # 正确
   type: fs_exists
   parameters: [{ name: pattern, type: string, required: true }]
   \`\`\`

2. **parameters 里的 name 和 type 写反**
   \`\`\`yaml
   # 错误
   parameters: [{ type: pattern, name: string }]

   # 正确
   parameters: [{ name: pattern, type: string }]
   \`\`\`

3. **忘了 required 字段**
   可选字段可以不写 required，但必填字段建议显式标注
`

const blueprintFormatMd = `# Blueprint 格式参考

## 基本结构

\`\`\`yaml
name: <blueprint名称>
stages:
  - id: <stage唯一标识>
    name: <显示名称>
    proof:
      probeRefs:
        - type: <探针类型>
          params:
            <探针参数>
    dependsOn: [<依赖的stage id>]   # 可选
\`\`\`

## 完整示例

\`\`\`yaml
name: check-project-structure
stages:
  - id: check-package-json
    name: 检查 package.json
    proof:
      probeRefs:
        - type: fs_exists
          params:
            pattern: package.json
  - id: check-readme
    name: 检查 README
    proof:
      probeRefs:
        - type: fs_exists
          params:
            pattern: README.md
  - id: check-lint
    name: 检查 lint 通过
    proof:
      probeRefs:
        - type: shell_exec
          params:
            command: npm run lint
    dependsOn: [check-package-json]
\`\`\`

## probeRefs 参数格式

⚠️ Blueprint 里的 probeRefs 用的是 \`params\` 对象，不是 \`parameters\` 数组！

\`\`\`yaml
fs_exists:    { pattern: "glob模式" }
fs_not_exists: { pattern: "glob模式" }
fs_match:     { pattern: "文件路径", contains: "正则" }
shell_exec:   { command: "shell命令" }
\`\`\`

## dependsOn 规则

- dependsOn 是可选的，没有依赖的 stage 可以并行验证
- dependsOn 里只能引用同 blueprint 内的 stage id
- 不能循环依赖（A→B→A）

## ❌ 常见错误

1. **probeRefs 里用了 parameters 数组**
   \`\`\`yaml
   # 错误
   probeRefs: [{ type: fs_exists, parameters: [{name: pattern, type: string}] }]

   # 正确
   probeRefs: [{ type: fs_exists, params: { pattern: "src" } }]
   \`\`\`

2. **dependsOn 引用了不存在的 stage id**
   确保 dependsOn 里的每个 id 都在 stages 里有定义

3. **stage id 含空格或中文**
   stage id 只用小写字母、数字和连字符：check-readme, deploy-mysql
`

const stageFormatMd = `# Stage 格式参考

## Forge 格式（定义 Stage 能力声明）

\`\`\`yaml
name: <stage名称>
description: "<stage描述>"
proofs:
  - name: "<proof名称>"
    policy: AND    # AND 或 OR
    probes:
      - type: <探针类型>
        parameters: { <参数键值> }
\`\`\`

## Blueprint 格式（在 Blueprint 中引用 Stage）

Blueprint 里直接定义 stage，不需要单独的 Stage 资产。
详见 blueprint-format.md

## ❌ 常见错误

1. 在 Blueprint 里用了 Forge 的 parameters 格式
   Blueprint 用的是 \`params\`，不是 \`parameters\`
`

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

## 参考

需要详细格式说明时，读取 references/ 下的文件：
- references/probe-format.md：Probe 格式说明 + 正误对比
- references/blueprint-format.md：Blueprint 格式说明 + 正误对比
- references/stage-format.md：Stage 格式说明 + 正误对比

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
  },
  references: [
    { filename: 'probe-format.md', content: probeFormatMd },
    { filename: 'blueprint-format.md', content: blueprintFormatMd },
    { filename: 'stage-format.md', content: stageFormatMd }
  ]
}