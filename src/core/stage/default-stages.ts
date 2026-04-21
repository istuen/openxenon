import type { ProofInput } from '../../types/proof'

export interface DefaultStage {
  id: string
  name: string
  proof: string
  description: string
  exampleInput: ProofInput
}

export const defaultStages: DefaultStage[] = [
  {
    id: 'default:fs_exists',
    name: 'File Exists Check',
    proof: 'fs_exists',
    description: '检查文件或目录是否存在',
    exampleInput: {
      path: 'package.json'
    }
  },
  {
    id: 'default:fs_not_exists',
    name: 'File Not Exists Check',
    proof: 'fs_not_exists',
    description: '检查文件或目录是否不存在',
    exampleInput: {
      path: 'dist'
    }
  },
  {
    id: 'default:fs_content_match',
    name: 'File Content Match',
    proof: 'fs_content_match',
    description: '检查文件内容是否包含指定正则表达式',
    exampleInput: {
      path: 'README.md',
      pattern: 'OpenXenon'
    }
  },
  {
    id: 'default:fs_parseable',
    name: 'File Parseable Check',
    proof: 'fs_parseable',
    description: '检查文件是否可解析为指定格式',
    exampleInput: {
      path: 'package.json',
      parser: 'json'
    }
  }
]

export function getAllDefaultStages(): DefaultStage[] {
  return defaultStages
}

export function getDefaultStageById(id: string): DefaultStage | undefined {
  return defaultStages.find(stage => stage.id === id)
}

export function isDefaultStageId(id: string): boolean {
  return id.startsWith('default:')
}

export function resolveDefaultStageId(proofId: string): string {
  return `default:${proofId}`
}
