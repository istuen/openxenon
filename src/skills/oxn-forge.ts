import type { OpenXenonSkill } from './types'

const probeFormatMd = `# Probe 格式参考

## OXN Mode（推荐，Phase 1+）

\`\`\`hcl
probe "fs-exists" {
  description = "检查文件存在"
  prop "pattern" { type = string; required = true }
}
\`\`\`

## Forge 格式 vs Blueprint 格式（⚠️ 最常见的混淆）

Forge 定义的是"能力声明"（我需要什么参数）：
\`\`\`hcl
type: fs_exists
description: "检查文件存在"
props:           ← 注意：是数组
  - name: pattern
    type: string
    required: true
\`\`\`

Blueprint 定义的是"调用方式"（我传什么值）：
\`\`\`hcl
type: fs_exists
params:               ← 注意：是对象
  pattern: "src/**/*.ts"
\`\`\`

⚠️ \`oxn forge probe -s\` 用的是 Forge 格式，不是 Blueprint 格式！

## 各类型参数速查

### fs_exists
参数：pattern (string, required) — glob 模式

示例：
\`\`\`hcl
type: fs_exists
description: "检查配置文件存在"
props:
  - name: pattern
    type: string
    required: true
    description: "要检查的文件 glob 模式"
\`\`\`

### fs_not_exists
参数：pattern (string, required) — glob 模式

示例：
\`\`\`hcl
type: fs_not_exists
description: "检查临时文件已清理"
props:
  - name: pattern
    type: string
    required: true
    description: "不应存在的文件模式"
\`\`\`

### fs_content_match
参数：path (string, required) + contains (string, required)

示例：
\`\`\`hcl
type: fs_content_match
description: "检查源码包含版权声明"
props:
  - name: path
    type: string
    required: true
    description: "要检查的文件路径（glob 模式）"
  - name: contains
    type: string
    required: true
    description: "文件内容必须匹配的正则"
\`\`\`

### exec_exit_zero
参数：command (string, required)

示例：
\`\`\`hcl
type: exec_exit_zero
description: "执行 lint 检查"
props:
  - name: command
    type: string
    required: true
    description: "要执行的 shell 命令"
\`\`\`

## ❌ 常见错误

1. **Forge 格式写成 Blueprint 格式**
   \`\`\`hcl
   # 错误
   type: fs_exists
   params: { pattern: "src" }

   # 正确
   type: fs_exists
   props: [{ name: pattern, type: string, required: true }]
   \`\`\`

2. **props 里的 name 和 type 写反**
   \`\`\`hcl
   # 错误
   props: [{ type: pattern, name: string }]

   # 正确
   props: [{ name: pattern, type: string }]
   \`\`\`

3. **使用了旧类型名**
   \`\`\`hcl
   # 错误
   type: fs_match         # 旧名，应改为 fs_content_match
   type: shell_exec       # 旧名，应改为 exec_exit_zero

   # 正确
   type: fs_content_match
   type: exec_exit_zero
   \`\`\`

4. **fs_content_match 使用了错误的参数名**
   \`\`\`hcl
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

const blueprintFormatMd = `# Blueprint 格式参考

## OXN Mode (v3.1 Slot 范式)

\`\`\`oxn
blueprint "deploy-mysql" {
  version = 1
  prop "env" { type = enum("dev", "prod"); default = "dev" }

  part slot "prepare" {
    deps = []
  }

  part slot "deploy" {
    deps = ["prepare"]
  }
}
\`\`\`

## Part 独立定义

Part 是 Arsenal 可复用资产：

\`\`\`oxn
part "docker-prepare" {
  description = "确保 Docker 环境就绪"
  prop "image" { type = string; default = "mysql:8" }

  probe check_docker ref "@oxn/probes/exec-exit-zero" {
    params = { command = "docker ps" }
  }
  execution = [check_docker]
}
\`\`\`

## probes 参数格式

\`\`\`
fs_exists:        { pattern: "glob模式" }
fs_not_exists:    { pattern: "glob模式" }
fs_content_match: { path: "文件路径", contains: "正则" }
exec_exit_zero:   { command: "shell命令" }
\`\`\`

## deps 规则

- deps 声明在 \`part slot\` 或 \`part\` 上
- 不能循环依赖（A→B→A）

## ❌ 常见错误

1. **使用了旧类型名**
   \`\`\`
   # 错误
   type: fs_match        # 旧名
   type: shell_exec      # 旧名

   # 正确
   type: fs_content_match
   type: exec_exit_zero
   \`\`\`
  `

const stageFormatMd = `# Part 格式参考（原 Stage）

> Stage 概念已在 OXN DSL v3.1 中废除，替换为 Part + Slot 机制

## Part 独立定义

\`\`\`oxn
part "install-laravel" {
  description = "安装 Laravel 项目"
  prop "project_dir" { type = string; default = "." }

  probe install ref "@oxn/probes/exec-exit-zero" {
    params = { command = "composer create-project laravel/laravel \${prop.project_dir}" }
  }
  execution = [install]
}
\`\`\`

## Part 在 Blueprint 中的使用

\`\`\`oxn
blueprint "app-init" {
  part slot "setup" { deps = [] }
}
\`\`\`

\`\`\`oxn
task "init-prod" use "@prj/blueprints/app-init" {
  part slot "setup" ref "@prj/parts/install-laravel" {
    prop project_dir = "/var/www/app"
  }
}
\`\`\`

## 探针类型

\`\`\`
# 正确
fs_exists
fs_not_exists
fs_content_match
exec_exit_zero

# 错误（旧名）
fs_match          # → fs_content_match
shell_exec        # → exec_exit_zero
\`\`\`
  `

export const oxnForgeSkill: OpenXenonSkill = {
  id: 'oxn-forge',
  description: '通过自然语言生成 Draft 标准资产（Blueprint/Probe/Part）',
  instruction: `# /oxn-forge — 锻造 Draft 标准资产

你是 OpenXenon 的资产锻造专家。当你收到工程师的自然语言请求时：

## 步骤 1：解析意图

解析工程师的意图，确定要生成什么类型的资产：
- Blueprint（蓝图）：包含多个 Part slot 的完整流程定义
- Probe（探针）：单一检查，如"检查文件存在"、"检查命令执行成功"
- Part（零件）：包含 probes/execution 的可复用执行单元

## 步骤 2：获取约束

执行以下命令获取对应类型的元 Forge 约束：
\`\`\`bash
oxn forge <type>
\`\`\`
- type 可选值: probe, part, blueprint
- 例如: oxn forge probe

## 步骤 3：生成资产

- **OXN Mode (默认)**：生成 HCL-like 语法资产

## 步骤 4：保存 Draft

\`\`\`bash
oxn forge <type> --save '<oxn内容>' --name <资产名称>
\`\`\`
- 例如:
  \`\`\`bash
  oxn forge probe --save 'probe "redis-config-check" {
  description = "检查 Redis 配置文件"
  prop "pattern" { type = string; required = true }
}' --name redis-config-check
  \`\`\`

## 步骤 5：审查 Draft

读取内容：
\`\`\`bash
cat .openxenon/forges/<type>/<name>/draft.oxn
\`\`\`

将 Draft 内容转化为人类可读的摘要，向工程师展示：
- 资产类型和名称
- 主要参数和用途
- 判定逻辑说明

## 步骤 6：请求 Promote 确认

向工程师确认是否提升为正式资产：
> 审查完成后，是否提升为正式资产？
> 执行：\`oxn arsenal promote <type>/<name>\`

## 约束

- 只生成 DRAFT 状态的资产（保存到 forges/ 目录）
- 不执行任何探针逻辑
- 确保 OXN/JSON 结构符合 Schema
- 审查阶段必须读取实际文件内容，不能假设

## 参考

需要详细格式说明时，读取 references/ 下的文件：
- references/probe-format.md：Probe 格式说明 + 正误对比
- references/blueprint-format.md：Blueprint 格式说明 + 正误对比
- references/stage-format.md：Part 格式说明 + 正误对比

## 示例

- 生成 Probe: \`/oxn-forge 帮我写一个检查文件存在的 Probe\`
- 生成 Blueprint: \`/oxn-forge 创建一个部署 MySQL 的 Blueprint\`
- 生成全局 Probe: \`/oxn-forge --global 帮我写一个检查文件存在的 Probe\`
- 生成 Part: \`/oxn-forge 创建一个安装 Laravel 的 Part\`
`,
  examples: {
    '生成 Probe': '/oxn-forge 帮我写一个检查文件存在的 Probe',
    '生成 Blueprint': '/oxn-forge 创建一个部署 MySQL 的 Blueprint',
    '生成全局 Probe': '/oxn-forge --global 帮我写一个检查文件存在的 Probe',
    '生成 Part': '/oxn-forge 创建一个安装 Laravel 的 Part',
  },
  references: [
    { filename: 'probe-format.md', content: probeFormatMd },
    { filename: 'blueprint-format.md', content: blueprintFormatMd },
    { filename: 'stage-format.md', content: stageFormatMd },
  ],
}
