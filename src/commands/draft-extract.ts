import { defineCommand } from 'citty'
import { existsSync, writeFileSync } from 'fs'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { cliContext } from '../cli-context'
import { loadProjectContext } from '../api/context'
import { getTaskById } from '../db/operations/tasks'
import { getBlueprintById } from '../db/operations/blueprints'
import { getStagesByBlueprintId } from '../db/operations/stages'

export default defineCommand({
  meta: {
    name: 'extract',
    description: '将数据库中的 Blueprint 导出为本地 YAML 文件'
  },
  args: {
    '--task-id': {
      type: 'string',
      description: 'Task ID（默认为当前活跃的 Task）'
    },
    '--blueprint-id': {
      type: 'string',
      description: 'Blueprint ID（默认为 active Blueprint）'
    }
  },
  async run({ args }) {
    const ctx = loadProjectContext(process.cwd())
    if (ctx instanceof Response) {
      console.error('Project not initialized')
      return
    }

    const taskId = args['--task-id'] as string | undefined
    const blueprintId = args['--blueprint-id'] as string | undefined

    let task, blueprint

    if (blueprintId) {
      blueprint = getBlueprintById(ctx.db, blueprintId)
      if (blueprint) {
        task = getTaskById(ctx.db, blueprint.task_id)
      }
    } else if (taskId) {
      task = getTaskById(ctx.db, taskId)
      if (task?.activeBlueprintId) {
        blueprint = getBlueprintById(ctx.db, task.activeBlueprintId)
      }
    } else {
      // Try to find active task
      const activeTask = ctx.db.query(`
        SELECT * FROM tasks
        WHERE status = 'RUNNING' OR status = 'PENDING'
        ORDER BY created_at DESC LIMIT 1
      `).get() as { id: string; active_blueprint_id: string | null } | undefined

      if (activeTask) {
        task = getTaskById(ctx.db, activeTask.id)
        if (activeTask.active_blueprint_id) {
          blueprint = getBlueprintById(ctx.db, activeTask.active_blueprint_id)
        }
      }
    }

    if (!task) {
      console.error('Task not found')
      process.exit(1)
    }

    if (!blueprint) {
      console.error('Blueprint not found')
      process.exit(1)
    }

    const stages = getStagesByBlueprintId(ctx.db, blueprint.id)

    // Generate YAML
    const yamlContent = generateYaml(task.name, blueprint.name, blueprint.status, stages)

    // Write to drafts directory
    const draftsDir = join(process.cwd(), '.openxenon', 'drafts')
    if (!existsSync(draftsDir)) {
      mkdirSync(draftsDir, { recursive: true })
    }

    const fileName = `${blueprint.id}-${Date.now()}.yaml`
    const filePath = join(draftsDir, fileName)
    writeFileSync(filePath, yamlContent)

    if (!cliContext.isJsonMode()) {
      console.log(`\nBlueprint extracted to: ${filePath}`)
    }
  }
})

function generateYaml(
  taskName: string,
  blueprintName: string,
  status: string,
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
  const stageLines: string[] = []

  for (const stage of stages) {
    const deps = JSON.parse(stage.deps || '[]')
    const proof = JSON.parse(stage.proof)

    stageLines.push(`  - id: ${stage.id}`)
    stageLines.push(`    name: ${stage.name}`)
    if (deps.length > 0) {
      stageLines.push(`    deps:`)
      for (const dep of deps) {
        stageLines.push(`      - ${dep}`)
      }
    }
    stageLines.push(`    target: "${stage.target.replace(/"/g, '\\"')}"`)
    stageLines.push(`    spec: "${stage.spec.replace(/"/g, '\\"')}"`)
    if (stage.action) {
      stageLines.push(`    action: "${stage.action.replace(/"/g, '\\"')}"`)
    }
    stageLines.push(`    proof: ${JSON.stringify(proof)}`)
    stageLines.push('')
  }

  return `task:
  name: ${taskName}

blueprint:
  name: ${blueprintName}
  status: ${status}

stages:
${stageLines.join('\n')}`
}
