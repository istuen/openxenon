import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import YAML from 'yaml'
import { ZodError } from 'zod'
import { cliContext } from '../cli-context'
import { loadProjectContext } from '../api/context'
import { validateDagTopology, type DagNode } from '../core/dag.validator'
import { hasProof } from '../core/proof-dispatcher'
import { createTask } from '../db/operations/tasks'
import { createBlueprint } from '../db/operations/blueprints'
import { createStage } from '../db/operations/stages'
import { BlueprintSchema, StageSchema } from '../types/schemas'

interface DraftFile {
  task?: { name: string }
  blueprint: {
    name: string
    status?: string
  }
  stages: Array<{
    id: string
    name: string
    deps?: string[]
    target: string
    spec: string
    action?: string
    proof: string | string[]
  }>
}

export default defineCommand({
  meta: {
    name: 'apply',
    description: '将草案文件导入数据库'
  },
  args: {
    file: {
      type: 'positional',
      required: true,
      description: '草案文件路径 (.yaml 或 .json)'
    },
    '--dry-run': {
      type: 'boolean',
      description: '仅做校验，不写入数据库'
    },
    '--force': {
      type: 'boolean',
      description: '强制覆盖已存在的 Blueprint'
    }
  },
  async run({ args }) {
    const ctx = loadProjectContext(process.cwd())
    if (ctx instanceof Response) {
      console.error('Project not initialized')
      return
    }

    const filePath = args.file as string

    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      process.exit(1)
    }

    // Step 1: Parse file
    let draft: DraftFile
    try {
      const content = readFileSync(filePath, 'utf-8')
      draft = content.trim().startsWith('{')
        ? JSON.parse(content)
        : YAML.parse(content)
    } catch (e) {
      console.error(`Failed to parse file: ${e instanceof Error ? e.message : String(e)}`)
      process.exit(1)
    }

    // Step 2: Zod Schema validation
    const validationErrors = validateWithZod(draft)
    if (validationErrors.length > 0) {
      if (!cliContext.isJsonMode()) {
        console.log('\n=== Zod Schema Validation Failed ===')
        for (const err of validationErrors) {
          console.log(`  [SCHEMA] ${err}`)
        }
      }
      process.exit(1)
    }

    // Step 3: DAG Topology validation
    const dagNodes: DagNode[] = draft.stages.map(s => ({
      id: s.id,
      deps: s.deps || []
    }))
    const dagResult = validateDagTopology(dagNodes)
    if (!dagResult.valid) {
      if (!cliContext.isJsonMode()) {
        console.log('\n=== DAG Topology Validation Failed ===')
        for (const err of dagResult.errors) {
          console.log(`  [TOPOLOGY] ${err}`)
        }
      }
      process.exit(1)
    }

    // Step 4: Proof existence scanning
    const proofErrors: string[] = []
    for (const stage of draft.stages) {
      const proofs = Array.isArray(stage.proof) ? stage.proof : [stage.proof]
      for (const proof of proofs) {
        if (!hasProof(proof, ctx.projectPath)) {
          proofErrors.push(`Proof '${proof}' not found for stage '${stage.id}'`)
        }
      }
    }
    if (proofErrors.length > 0) {
      if (!cliContext.isJsonMode()) {
        console.log('\n=== Proof Validation Failed ===')
        for (const err of proofErrors) {
          console.log(`  [PROOF] ${err}`)
        }
      }
      process.exit(1)
    }

    // Dry-run mode
    if ((args['--dry-run'] as boolean)) {
      if (!cliContext.isJsonMode()) {
        console.log('\n=== Dry-run: All validations passed ===')
        console.log(`File: ${filePath}`)
        console.log(`Task: ${draft.task?.name || '(unnamed)'}`)
        console.log(`Blueprint: ${draft.blueprint.name}`)
        console.log(`Stages: ${draft.stages.length}`)
        console.log('\nNo changes written to database.')
      }
      process.exit(0)
    }

    // Step 5: Write to database
    try {
      const db = ctx.db

      // Create Task
      let taskId: string | undefined
      if (draft.task) {
        const task = createTask(db, draft.task.name)
        taskId = task.id
      }

      // Create Blueprint
      const blueprint = createBlueprint(
        db,
        taskId!,
        draft.blueprint.name,
        (draft.blueprint.status as any) || 'DRAFT'
      )

      // Create Stages
      for (const stage of draft.stages) {
        createStage(
          db,
          blueprint.id,
          stage.name,
          stage.target,
          stage.spec,
          Array.isArray(stage.proof) ? JSON.stringify(stage.proof) : stage.proof,
          stage.deps || [],
          stage.action
        )
      }

      // Update Task's activeBlueprintId if CANONICAL
      if (draft.blueprint.status === 'CANONICAL' && taskId) {
        const { updateTaskActiveBlueprint } = await import('../db/operations/tasks')
        updateTaskActiveBlueprint(db, taskId, blueprint.id)
      }

      if (!cliContext.isJsonMode()) {
        console.log(`\nBlueprint created: ${blueprint.id}`)
        console.log(`Stages: ${draft.stages.length}`)
      }
    } catch (e) {
      console.error(`Database write failed: ${e instanceof Error ? e.message : String(e)}`)
      process.exit(1)
    }
  }
})

function validateWithZod(draft: DraftFile): string[] {
  const errors: string[] = []

  try {
    if (draft.blueprint) {
      BlueprintSchema.parse({
        id: 'temp',
        taskId: 'temp',
        name: draft.blueprint.name,
        status: draft.blueprint.status || 'DRAFT',
        createdAt: new Date().toISOString()
      })
    }
  } catch (e) {
    if (e instanceof ZodError) {
      for (const err of e.issues) {
        errors.push(`${err.path.join('.')}: ${err.message}`)
      }
    }
  }

  for (let i = 0; i < draft.stages.length; i++) {
    const stage = draft.stages[i]
    if (!stage) continue
    try {
      StageSchema.parse({
        id: stage.id,
        blueprintId: 'temp',
        name: stage.name,
        deps: stage.deps || [],
        target: stage.target,
        spec: stage.spec,
        action: stage.action,
        proof: stage.proof
      })
    } catch (e) {
      if (e instanceof ZodError) {
        for (const err of e.issues) {
          errors.push(`stages[${i}].${err.path.join('.')}: ${err.message}`)
        }
      }
    }
  }

  return errors
}
