/**
 * 导出服务 - 将数据库状态反编译为 Markdown 文档
 */

import type { Database } from 'bun:sqlite'
import { getTaskById } from '../db/operations/tasks'
import { getBlueprintsByTaskId } from '../db/operations/blueprints'
import { getStagesByBlueprintId } from '../db/operations/stages'

export interface ExportOptions {
  taskId: string
  db: Database
  outputDir: string
  statusFilter?: 'active' | 'archive'
}

/**
 * 生成 Mermaid DAG 图
 */
export function generateMermaidDag(stages: Array<{
  id: string
  name: string
  deps: string
}>): string {
  let mermaid = '```mermaid\ngraph LR\n'

  for (const stage of stages) {
    const deps = JSON.parse(stage.deps || '[]')
    if (deps.length === 0) {
      mermaid += `  ${stage.id}[${stage.name}]\n`
    } else {
      for (const dep of deps) {
        mermaid += `  ${dep} --> ${stage.id}\n`
      }
    }
  }

  mermaid += '```\n'
  return mermaid
}

/**
 * 生成 YAML 代码块
 */
export function generateYamlBlock(
  blueprintName: string,
  blueprintStatus: string,
  stages: Array<{
    id: string
    name: string
    deps: string
    target: string
    spec: string
    action: string | null
    proof: string
  }>
): string {
  let yaml = '```yaml\n'
  yaml += `blueprint:\n`
  yaml += `  name: ${blueprintName}\n`
  yaml += `  status: ${blueprintStatus}\n`
  yaml += `stages:\n`

  for (const stage of stages) {
    const deps = JSON.parse(stage.deps || '[]')
    const proof = JSON.parse(stage.proof)

    yaml += `  - id: ${stage.id}\n`
    yaml += `    name: ${stage.name}\n`
    yaml += `    deps: ${JSON.stringify(deps)}\n`
    yaml += `    target: "${stage.target.replace(/"/g, '\\"')}"\n`
    yaml += `    spec: "${stage.spec.replace(/"/g, '\\"')}"\n`
    if (stage.action) {
      yaml += `    action: "${stage.action.replace(/"/g, '\\"')}"\n`
    }
    yaml += `    proof: ${JSON.stringify(proof)}\n`
  }

  yaml += '```\n'
  return yaml
}

/**
 * 导出 Task 为 Markdown 文档
 */
export function exportTaskToMarkdown(
  db: Database,
  taskId: string,
  statusFilter?: 'active' | 'archive'
): string | null {
  const task = getTaskById(db, taskId)
  if (!task) return null

  const blueprints = getBlueprintsByTaskId(db, taskId)

  let md = `# ${task.name}\n\n`
  md += `> **状态**: ${task.status} | **创建时间**: ${new Date(task.createdAt * 1000).toISOString()}\n\n`

  // Filter blueprints based on status
  let relevantBlueprints = blueprints
  if (statusFilter === 'active') {
    relevantBlueprints = blueprints.filter(b =>
      b.status === 'CANONICAL' || b.status === 'DRAFT'
    )
  } else if (statusFilter === 'archive') {
    relevantBlueprints = blueprints.filter(b =>
      b.status === 'ABANDONED' || task.status === 'COMPLETED' || task.status === 'TERMINATED'
    )
  }

  if (task.activeBlueprintId) {
    const activeBp = blueprints.find(b => b.id === task.activeBlueprintId)
    if (activeBp) {
      md += `## 活跃拓扑 (${activeBp.status})\n\n`
      const stages = getStagesByBlueprintId(db, activeBp.id)
      md += generateMermaidDag(stages)
      md += generateYamlBlock(activeBp.name, activeBp.status, stages)
    }
  }

  if (relevantBlueprints.length > 0) {
    md += `## 所有版本\n\n`
    for (const bp of relevantBlueprints) {
      md += `### ${bp.name} (${bp.status})\n\n`
      const stages = getStagesByBlueprintId(db, bp.id)
      md += generateMermaidDag(stages)
      md += generateYamlBlock(bp.name, bp.status, stages)
    }
  }

  return md
}
