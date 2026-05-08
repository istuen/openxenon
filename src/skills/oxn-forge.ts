import type { OpenXenonSkill } from './types'
import { createDraftFromYaml } from '../api/arsenal-draft'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'
import { BOUNDARY_DIR } from '../kernel/constants'

const META_BLUEPRINTS = {
  probe: 'meta-probe',
  proof: 'meta-proof',
  stage: 'meta-stage',
  blueprint: 'meta-blueprint'
} as const

function loadMetaBlueprintFromProject(type: keyof typeof META_BLUEPRINTS): string[] | null {
  const name = META_BLUEPRINTS[type]
  const projectBoundary = join(process.cwd(), BOUNDARY_DIR)

  const forgePath = join(projectBoundary, 'meta', name, 'canonical.yaml')
  if (existsSync(forgePath)) {
    try {
      const content = readFileSync(forgePath, 'utf-8')
      const parsed = parseYaml(content)
      const constraints = parsed?.stages?.[0]?.proof?.spec?.constraints
      return constraints ?? null
    } catch {
      return null
    }
  }

  return null
}

function getDefaultConstraints(type: keyof typeof META_BLUEPRINTS): string[] {
  const defaults: Record<string, string[]> = {
    probe: [
      '必须包含 type',
      'type 必须是 fs_exists, fs_content_match, fs_not_exists, fs_parseable, exec_exit_zero 之一',
    ],
    proof: [
      '必须包含 target, spec, probes',
      'target 必须包含 description',
      'spec 必须包含 description',
      'probes 必须是数组',
    ],
    stage: [
      '必须包含 id, name, proof',
      'proof 必须包含 target, spec, probes',
      'deps 必须是字符串数组',
    ],
    blueprint: [
      '必须包含 id, name, stages',
      'stages 必须是数组',
      '每个 stage 必须包含 id, name, proof',
    ]
  }
  return defaults[type] || []
}

export const oxnForgeSkill: OpenXenonSkill = {
  id: 'oxn-forge',
  description: '通过自然语言生成 Draft 标准资产（Blueprint/Probe/Proof/Stage）',
  instruction: `你是 OpenXenon 的资产锻造专家。当你收到工程师的自然语言请求时：

1. 解析工程师的意图，确定要生成什么类型的资产：
   - Blueprint（蓝图）：包含多个 Stage 的完整流程定义
   - Probe（探针）：单一检查，如"检查文件存在"、"检查命令执行成功"
   - Proof（验证闭环）：组合多个 Probe 或检查
   - Stage（工序节点）：包含 Proof 和执行顺序

2. 通过 CLI 获取元蓝图约束：
   - 执行 'oxn forge <type>' 获取对应类型的元蓝图
   - type 可选值: probe, proof, stage, blueprint
   - 例如: oxn forge probe

3. 根据元蓝图约束生成资产 YAML

4. 调用 createDraftFromYaml 保存到 .openxenon/arsenals/<type>/<name>/draft.yaml

约束：
- 只生成 DRAFT 状态的资产
- 不执行任何探针逻辑
- 确保 YAML/JSON 结构符合 Schema`,
  examples: {
    '生成 Blueprint': '/oxn-forge 创建一个部署 MySQL 的 Blueprint',
    '生成 Probe': '/oxn-forge 帮我写一个检查文件存在的 Probe',
    '生成全局 Probe': '/oxn-forge --global 帮我写一个检查文件存在的 Probe',
    '生成 Proof': '/oxn-forge 写一个验证 Laravel 安装的 Proof',
    '生成 Stage': '/oxn-forge 创建一个安装 Laravel 的 Stage'
  }
}

export function parseForgeRequest(input: string): { type: 'probe' | 'proof' | 'stage' | 'blueprint', description: string, scope: 'project' | 'global' } {
  const lowerInput = input.toLowerCase()
  const isGlobal = lowerInput.includes('--global') || lowerInput.includes('全局')
  const cleanInput = input.replace(/--global/gi, '').trim()

  if (cleanInput.toLowerCase().includes('blueprint')) {
    return { type: 'blueprint', description: cleanInput, scope: isGlobal ? 'global' : 'project' }
  }
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

  return { type: 'probe', description: cleanInput, scope: isGlobal ? 'global' : 'project' }
}

export function getForgeConstraints(type: 'Blueprint' | 'Stage' | 'Proof'): string[] {
  const key = type.toLowerCase() as keyof typeof META_BLUEPRINTS

  const fromProject = loadMetaBlueprintFromProject(key)
  if (fromProject) {
    return fromProject
  }

  return getDefaultConstraints(key)
}

export { createDraftFromYaml }