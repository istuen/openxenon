import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import YAML from 'yaml'
import { cliContext } from '../cli-context'
import { loadProjectContext } from '../api/context'
import { getBlueprintById } from '../db/operations/blueprints'
import { getStagesByBlueprintId } from '../db/operations/stages'

interface DraftStage {
  id: string
  name: string
  deps?: string[]
  target: string
  spec: string
  action?: string
  proof: string | string[]
}

interface DraftFile {
  blueprint?: { name?: string }
  stages: DraftStage[]
}

interface DiffResult {
  added: DraftStage[]
  removed: Array<{ id: string; name: string }>
  modified: DraftStage[]
}

export default defineCommand({
  meta: {
    name: 'diff',
    description: '对比草案与数据库当前状态的差异'
  },
  args: {
    file: {
      type: 'positional',
      required: true,
      description: '草案文件路径'
    },
    '--blueprint-id': {
      type: 'string',
      description: '对比的 Blueprint ID（默认为当前活跃的）'
    }
  },
  async run({ args }) {
    const ctx = loadProjectContext(process.cwd())
    if (ctx instanceof Response) {
      console.error('Project not initialized')
      return
    }

    const filePath = args.file as string
    const blueprintId = args['--blueprint-id'] as string | undefined

    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      process.exit(1)
    }

    // Parse draft file
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

    // Get blueprint from DB
    let blueprint = blueprintId
      ? getBlueprintById(ctx.db, blueprintId)
      : null

    if (!blueprint && !blueprintId) {
      const row = ctx.db.query(
        'SELECT active_blueprint_id FROM tasks WHERE active_blueprint_id IS NOT NULL ORDER BY created_at DESC LIMIT 1'
      ).get() as { active_blueprint_id: string } | undefined

      if (row?.active_blueprint_id) {
        blueprint = getBlueprintById(ctx.db, row.active_blueprint_id)
      }
    }

    if (!blueprint) {
      console.log('No active blueprint to compare against.')
      return
    }

    // Get stages from DB
    const dbStages = getStagesByBlueprintId(ctx.db, blueprint.id)
    const dbStageMap = new Map(dbStages.map(s => [s.id, s]))
    const draftStageMap = new Map(draft.stages.map(s => [s.id, s]))

    // Calculate diff
    const diff: DiffResult = {
      added: [],
      removed: [],
      modified: []
    }

    // Added: in draft but not in DB
    for (const s of draft.stages) {
      if (!dbStageMap.has(s.id)) {
        diff.added.push(s)
      }
    }

    // Removed: in DB but not in draft
    for (const s of dbStages) {
      if (!draftStageMap.has(s.id)) {
        diff.removed.push({ id: s.id, name: s.name })
      }
    }

    // Modified: in both but different
    for (const s of draft.stages) {
      const dbStage = dbStageMap.get(s.id)
      if (dbStage) {
        const dbDeps = JSON.parse(dbStage.deps || '[]')
        const draftDeps = s.deps || []
        const dbProof = dbStage.proof
        const draftProof = Array.isArray(s.proof) ? JSON.stringify(s.proof) : s.proof

        if (dbStage.name !== s.name ||
            JSON.stringify(dbDeps) !== JSON.stringify(draftDeps) ||
            dbStage.target !== s.target ||
            dbStage.spec !== s.spec ||
            dbStage.action !== (s.action || null) ||
            dbProof !== draftProof) {
          diff.modified.push(s)
        }
      }
    }

    // Output
    if (!diff.added.length && !diff.removed.length && !diff.modified.length) {
      console.log('No changes detected.')
      return
    }

    if (!cliContext.isJsonMode()) {
      if (diff.added.length > 0) {
        console.log(`\n+ Added stages (${diff.added.length}):`)
        for (const s of diff.added) {
          console.log(`  + ${s.id}: ${s.name}`)
        }
      }

      if (diff.removed.length > 0) {
        console.log(`\n- Removed stages (${diff.removed.length}):`)
        for (const s of diff.removed) {
          console.log(`  - ${s.id}: ${s.name}`)
        }
      }

      if (diff.modified.length > 0) {
        console.log(`\n~ Modified stages (${diff.modified.length}):`)
        for (const s of diff.modified) {
          console.log(`  ~ ${s.id}: ${s.name}`)
        }
      }
    }
  }
})
