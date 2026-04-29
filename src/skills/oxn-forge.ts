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
   - 默认保存到项目级：<project>/.openxenon/arsenals/<type>/draft/
   - 如果用户请求包含 "--global"，保存到全局：~/.openxenon/arsenals/<type>/draft/

4. 输出以下格式的确认信息：
   "已生成 Draft [资产类型]：[名称]
   路径：.openxenon/arsenals/[类型]/draft/[文件名]（项目级）
   或：~/.openxenon/arsenals/[类型]/draft/[文件名]（全局级）
   请使用 'oxn arsenal inspect' 查看内容，确认后使用 'oxn arsenal promote' 转正。"

约束：
- 只生成 DRAFT 状态的资产
- 不执行任何探针逻辑
- 确保 YAML/JSON 结构符合 Schema
- 如果用户明确说"全局"或"--global"，使用全局作用域`,
  examples: {
    '生成 Probe': '/oxn-forge 帮我写一个检查文件存在的 Probe',
    '生成全局 Probe': '/oxn-forge --global 帮我写一个检查文件存在的 Probe',
    '生成 Proof': '/oxn-forge 写一个验证 Laravel 安装的 Proof',
    '生成 Stage': '/oxn-forge 创建一个安装 Laravel 的 Stage'
  }
}

export function parseForgeRequest(input: string): { type: 'probe' | 'proof' | 'stage', description: string, scope: 'project' | 'global' } {
  const lowerInput = input.toLowerCase()
  const isGlobal = lowerInput.includes('--global') || lowerInput.includes('全局')
  const cleanInput = input.replace(/--global/gi, '').trim()

  if (cleanInput.toLowerCase().includes('probe')) {
    return { type: 'probe', description: cleanInput, scope: isGlobal ? 'global' : 'project' }
  }
  if (cleanInput.toLowerCase().includes('proof')) {
    return { type: 'proof', description: cleanInput, scope: isGlobal ? 'global' : 'project' }
  }
  if (cleanInput.toLowerCase().includes('stage')) {
    return { type: 'stage', description: cleanInput, scope: isGlobal ? 'global' : 'project' }
  }

  if (cleanInput.includes('检查') || cleanInput.includes('check')) {
    return { type: 'probe', description: cleanInput, scope: isGlobal ? 'global' : 'project' }
  }
  if (cleanInput.includes('验证') || cleanInput.includes('验证')) {
    return { type: 'proof', description: cleanInput, scope: isGlobal ? 'global' : 'project' }
  }

  return { type: 'probe', description: cleanInput, scope: 'project' }
}

export { createDraftFromYaml }
