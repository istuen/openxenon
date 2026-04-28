import type { OpenXenonSkill } from './types'
import { createDraftFromYaml } from '../api/standards-draft'

export const oxnForgeSkill: OpenXenonSkill = {
  id: 'oxn-forge',
  description: '通过自然语言生成 Draft 标准资产（Probe/Proof/Stage）',
  instruction: `你是 OpenXenon 的资产锻造专家。当你收到工程师的自然语言请求时：

1. 解析工程师的意图，确定要生成什么类型的资产：
   - Probe（探针）：单一检查，如"检查文件存在"、"检查命令执行成功"
   - Proof（验证闭环）：组合多个 Probe 或检查
   - Stage（工序节点）：包含 Proof 和执行顺序

2. 根据意图生成符合 Zod Schema 的 YAML/JSON 结构：
   - Probe 示例：
     { "type": "fs_exists", "params": { "path": "composer.json" } }
   - Proof 示例：
     { "name": "check_laravel", "proofs": ["check_composer", "check_vendor"] }
   - Stage 示例：
     { "name": "install_laravel", "proof": "check_laravel", "deps": [] }

3. 调用 Core API 将 Draft 资产保存到 DRAFT 目录：
   使用 createDraftFromYaml 函数保存资产

4. 输出以下格式的确认信息：
   "已生成 Draft [资产类型]：[名称]
   路径：.openxenon/standards/[类型]/DRAFT/[文件名]
   请使用 'oxn standards inspect' 查看内容，确认后使用 'oxn standards promote' 转正。"

约束：
- 只生成 DRAFT 状态的资产
- 不执行任何探针逻辑
- 确保 YAML/JSON 结构符合 Schema`',
  examples: {
    '生成 Probe': '/oxn-forge 帮我写一个检查文件存在的 Probe',
    '生成 Proof': '/oxn-forge 写一个验证 Laravel 安装的 Proof',
    '生成 Stage': '/oxn-forge 创建一个安装 Laravel 的 Stage'
  }
}

export function parseForgeRequest(input: string): { type: 'probe' | 'proof' | 'stage', description: string } {
  const lowerInput = input.toLowerCase()

  if (lowerInput.includes('probe')) {
    return { type: 'probe', description: input }
  }
  if (lowerInput.includes('proof')) {
    return { type: 'proof', description: input }
  }
  if (lowerInput.includes('stage')) {
    return { type: 'stage', description: input }
  }

  if (lowerInput.includes('检查') || lowerInput.includes('check')) {
    return { type: 'probe', description: input }
  }
  if (lowerInput.includes('验证') || lowerInput.includes('验证')) {
    return { type: 'proof', description: input }
  }

  return { type: 'probe', description: input }
}

export { createDraftFromYaml }