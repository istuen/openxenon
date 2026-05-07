import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

export interface Blueprint {
  id: string
  status: 'CANONICAL' | 'DRAFT'
  topology: string[]
  edges: Array<{ from: string; to: string }>
  source?: string
}

export function loadBlueprint(path: string): Blueprint | null {
  if (!existsSync(path)) {
    return null
  }

  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(content)

    if (!parsed.id || !parsed.status || !parsed.topology || !parsed.edges) {
      return null
    }

    return parsed as Blueprint
  } catch {
    return null
  }
}

export function saveBlueprint(path: string, blueprint: Blueprint): void {
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(path, JSON.stringify(blueprint, null, 2), 'utf-8')
}

export function promoteBlueprint(fromPath: string): Blueprint | null {
  if (!existsSync(fromPath)) {
    return null
  }

  const blueprint = loadBlueprint(fromPath)
  if (!blueprint) {
    return null
  }

  if (blueprint.status !== 'DRAFT') {
    throw new Error(`Blueprint is not in draft state: ${fromPath}`)
  }

  const newPath = fromPath.replace('/draft.json', '/canonical.json')

  renameSync(fromPath, newPath)

  return {
    ...blueprint,
    status: 'CANONICAL'
  }
}

export function copyBlueprintToTask(
  sourcePath: string,
  _taskId: string,
  taskBlueprintsDir: string
): Blueprint | null {
  const blueprint = loadBlueprint(sourcePath)
  if (!blueprint) {
    return null
  }

  if (!existsSync(taskBlueprintsDir)) {
    mkdirSync(taskBlueprintsDir, { recursive: true })
  }

  const taskBlueprintPath = join(taskBlueprintsDir, 'bp_001.json')

  const taskBlueprint: Blueprint = {
    ...blueprint,
    status: 'DRAFT',
    source: blueprint.id
  }

  saveBlueprint(taskBlueprintPath, taskBlueprint)

  return taskBlueprint
}

export function promoteToArsenal(
  taskBlueprintPath: string,
  blueprintName: string,
  arsenalBlueprintsDir: string
): void {
  const blueprint = loadBlueprint(taskBlueprintPath)
  if (!blueprint) {
    throw new Error(`Task Blueprint not found: ${taskBlueprintPath}`)
  }

  const blueprintDir = join(arsenalBlueprintsDir, blueprintName)
  if (!existsSync(blueprintDir)) {
    mkdirSync(blueprintDir, { recursive: true })
  }

  const canonicalPath = join(blueprintDir, 'canonical.json')
  const draftPath = join(blueprintDir, 'draft.json')

  if (existsSync(canonicalPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archiveDir = join(blueprintDir, 'archive')
    if (!existsSync(archiveDir)) {
      mkdirSync(archiveDir, { recursive: true })
    }
    const archivePath = join(archiveDir, `v${timestamp}.json`)
    renameSync(canonicalPath, archivePath)
  }

  const taskBlueprintForArsenal: Blueprint = {
    ...blueprint,
    status: 'DRAFT'
  }

  saveBlueprint(draftPath, taskBlueprintForArsenal)
}

export function resolveStageReference(reference: string): string | null {
  if (reference.startsWith('defaults/') || reference.startsWith('custom/')) {
    const stageName = reference.split('/')[1]
    return `arsenals/stages/${stageName}/canonical.md`
  }

  return null
}