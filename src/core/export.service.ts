import { getTaskDirectory } from '../lib/task-dir'
import { readTaskTrace } from '../lib/task-trace'
import { readBlueprint } from '../lib/blueprint-parser'

export interface ExportOptions {
  taskId: string
  projectPath: string
  outputDir?: string
}

export function generateMermaidDag(stages: Array<{
  id: string
  name: string
  deps: string[]
}>): string {
  let mermaid = '```mermaid\ngraph LR\n'

  for (const stage of stages) {
    if (stage.deps.length === 0) {
      mermaid += `  ${stage.id}[${stage.name}]\n`
    } else {
      for (const dep of stage.deps) {
        mermaid += `  ${dep} --> ${stage.id}\n`
      }
    }
  }

  mermaid += '```\n'
  return mermaid
}

export function exportTaskToMarkdown(
  projectPath: string,
  taskId: string
): string | null {
  const taskDir = getTaskDirectory(projectPath, taskId)
  const trace = readTaskTrace(taskDir)

  if (!trace) return null

  const parsed = readBlueprint(taskDir)

  let md = `# ${trace.taskName}\n\n`
  md += `> **状态**: ${trace.status} | **开始时间**: ${trace.startedAt}\n\n`

  if (parsed) {
    md += `## 阶段 (${parsed.stages.length})\n\n`
    md += generateMermaidDag(parsed.stages)
  }

  if (trace.stages.length > 0) {
    md += `## 执行轨迹\n\n`
    for (const stage of trace.stages) {
      md += `### ${stage.stageId}: ${stage.stageName} [${stage.status}]\n\n`
      if (stage.probes.length > 0) {
        for (const probe of stage.probes) {
          md += `- ${probe.probeType}: ${probe.result}\n`
        }
      }
    }
  }

  return md
}