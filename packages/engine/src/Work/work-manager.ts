import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR, TASK_OXN_FILE } from '@openxenon/engine/kernel'
import {
  isBlueprintDeclaration,
  isDomainDeclaration,
  type BlueprintDeclaration,
} from '@openxenon/engine/oxl'
import { renderWorkSkeleton } from './work-skeleton'
import { isWorkStarted } from './dual-state-exec'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractWorkIR } from '@openxenon/engine/oxl/md-pipeline/transformers/work.js'
import { serializeWorkToOxn } from '@openxenon/engine/oxl/md-pipeline/oxn-serializer.js'
import { compileOxnToMd } from '@openxenon/engine/oxl/md-bridge/oxl-md-decompiler.js'
import { parseOxnFile, validateWorkFile } from '@openxenon/engine/oxl/work-file-loader'
import { resolveAssetPrimaryPath, resolveAssetAltPath } from '@openxenon/engine/infra/paths'
import type { AssetFormat } from '@openxenon/engine/infra/paths'

function ensureDirectory(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function parsePartName(raw: string): string {
  return raw.replace(/^"|"$/g, '')
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

export function validateWorkName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Name is required' }
  if (name.length < 2) return { valid: false, error: 'Name too short (min 2 chars)' }
  if (name.length > 64) return { valid: false, error: 'Name too long (max 64 chars)' }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return { valid: false, error: 'Name must be kebab-case (lowercase letter, lowercase letters/numbers, hyphens)' }
  }
  if (name.endsWith('-')) return { valid: false, error: 'Name cannot end with hyphen' }
  return { valid: true }
}

export function validateTaskName(name: string): { valid: boolean; error?: string } {
  if (!name) return { valid: false, error: 'Task name is required' }
  if (name.length < 1) return { valid: false, error: 'Task name too short' }
  if (name.length > 64) return { valid: false, error: 'Task name too long (max 64 chars)' }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return {
      valid: false,
      error: 'Task name must be kebab-case (lowercase letter, lowercase letters/numbers, hyphens)',
    }
  }
  if (name.endsWith('-')) return { valid: false, error: 'Task name cannot end with hyphen' }
  return { valid: true }
}

export interface CreateWorkParams {
  projectRoot: string
  workName: string
  workType: string
  assetFormat: AssetFormat
  autoSync: boolean
  blueprint?: { name?: string; file?: string }
  outputDir?: string
  force: boolean
}

export interface CreateWorkResult {
  ok: true
  workName: string
  outputDir?: string
  blueprintPath?: string
  blueprint?: { name: string; version: number; slotCount: number; slots: string[] }
  files: { work: string }
  nextStep?: string
}

export async function createWork(params: CreateWorkParams): Promise<CreateWorkResult> {
  const { projectRoot, workName, workType, assetFormat, autoSync, force } = params
  const blueprintDecl = params.blueprint
  const customOutputDir = params.outputDir

  const validation = validateWorkName(workName)
  if (!validation.valid) {
    throw new Error(`Invalid work name: ${validation.error}`)
  }

  if (blueprintDecl?.name || blueprintDecl?.file) {
    const defaultCandidates = blueprintDecl.name
      ? [
          join(projectRoot, '.openxenon', 'blueprints', `${blueprintDecl.name}.oxn`),
          join(projectRoot, '.openxenon', 'blueprints', blueprintDecl.name, 'blueprint.oxn'),
        ]
      : []
    const blueprintPath = blueprintDecl.file ? join(projectRoot, blueprintDecl.file) : null
    let absBlueprint: string | null = blueprintPath
    if (!absBlueprint || !existsSync(absBlueprint)) {
      if (blueprintDecl.file) {
        throw new Error(`blueprint file not found: ${blueprintDecl.file}`)
      }
      const found = defaultCandidates.find((p) => existsSync(p))
      if (!found) {
        throw new Error(`blueprint file not found: tried ${defaultCandidates.join(', ')}`)
      }
      absBlueprint = found
    }
    try {
      const { doc } = await parseOxnFile(absBlueprint)
      const blueprint = doc.entities.find(isBlueprintDeclaration) as BlueprintDeclaration | undefined
      if (!blueprint) {
        throw new Error(`No Blueprint declaration found in ${absBlueprint}`)
      }
      if (!blueprint.name) {
        throw new Error('Blueprint has no name')
      }
      if (blueprint.partSlots.length === 0) {
        throw new Error(`Blueprint "${blueprint.name}" has no part slots`)
      }
      const resolvedBlueprintName = parsePartName(blueprint.name)
      const slots = blueprint.partSlots.map((s) => ({
        name: parsePartName(s.name),
        align: capitalize(parsePartName(s.name)),
      }))
      const outputDir = customOutputDir
        ? join(projectRoot, customOutputDir)
        : join(projectRoot, '.openxenon', 'works', workName)
      if (!force && existsSync(outputDir)) {
        throw new Error(`output directory already exists: ${outputDir}`)
      }
      ensureDirectory(outputDir)
      const workPrimaryPath = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
      const workAltPath = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
      const workPrimaryDir = join(workPrimaryPath, '..')
      const workAltDir = join(workAltPath, '..')
      if (!existsSync(workPrimaryDir)) mkdirSync(workPrimaryDir, { recursive: true })
      if (!existsSync(workAltDir)) mkdirSync(workAltDir, { recursive: true })
      const workFile = workPrimaryPath
      if (!force && existsSync(workFile)) {
        throw new Error(`${assetFormat === 'oxn' ? 'work.oxn' : 'work.md'} already exists in ${outputDir}`)
      }
      const workContent = renderWorkSkeleton(workName, resolvedBlueprintName, slots, assetFormat)
      writeFileSync(workFile, workContent, 'utf-8')

      if (autoSync) {
        try {
          if (assetFormat === 'oxn') {
            const altResult = await compileOxnToMd(workContent, { entity: 'work', frontmatter: true })
            writeFileSync(workAltPath, altResult.md, 'utf-8')
          } else {
            const { tree, frontmatter: fm } = parseMarkdown(workContent)
            const ir = extractWorkIR(tree, fm)
            const altContent = serializeWorkToOxn(ir)
            writeFileSync(workAltPath, altContent, 'utf-8')
          }
        } catch {
          // autoSync failure does not block
        }
      }
      return {
        ok: true,
        workName,
        outputDir,
        blueprintPath: absBlueprint,
        blueprint: {
          name: resolvedBlueprintName,
          version: blueprint.version ?? 1,
          slotCount: slots.length,
          slots: slots.map((s) => s.name),
        },
        files: { work: workFile },
        nextStep: `Edit the file, then run: oxn work add-task <name> --task <slot> --blueprint ${resolvedBlueprintName}\n  oxn work run <name>`,
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('blueprint')) throw err
      if (err instanceof Error && err.message.startsWith('No Blueprint')) throw err
      if (err instanceof Error && err.message.startsWith('Blueprint')) throw err
      if (err instanceof Error && err.message.startsWith('output')) throw err
      if (err instanceof Error && err.message.includes('already exists')) throw err
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`DSL parse failed: ${message}`)
    }
  }

  const workDir = join(projectRoot, BOUNDARY_DIR, 'work', workType)
  if (!existsSync(workDir)) {
    ensureDirectory(workDir)
  }

  const workFileFinal = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
  const workAltFileFinal = resolveAssetAltPath(projectRoot, 'work', workName, assetFormat)
  const workFileDir = join(workFileFinal, '..')
  if (!existsSync(workFileDir)) mkdirSync(workFileDir, { recursive: true })
  if (existsSync(workFileFinal)) {
    throw new Error(`work "${workName}" already exists (type: ${workType})`)
  }

  const workOxnContent = renderWorkSkeleton(
    workName,
    'TODO-blueprint',
    [{ name: 'stage-1', align: 'TODO' }],
    assetFormat,
  )
  writeFileSync(workFileFinal, workOxnContent, 'utf-8')

  if (autoSync) {
    try {
      if (assetFormat === 'oxn') {
        const altResult = await compileOxnToMd(workOxnContent, { entity: 'work', frontmatter: true })
        writeFileSync(workAltFileFinal, altResult.md, 'utf-8')
      } else {
        const { tree, frontmatter: fm } = parseMarkdown(workOxnContent)
        const ir = extractWorkIR(tree, fm)
        const altContent = serializeWorkToOxn(ir)
        writeFileSync(workAltFileFinal, altContent, 'utf-8')
      }
    } catch {
      // autoSync failure does not block
    }
  }

  return {
    ok: true,
    workName,
    files: { work: workFileFinal },
  }
}

export interface AddTaskParams {
  projectRoot: string
  workName: string
  taskName: string
  blueprintName: string
  domainName?: string
  assetFormat: AssetFormat
  force: boolean
}

export interface AddTaskResult {
  ok: true
  workName: string
  taskName: string
  blueprint: string
  domain: string
  path: string
}

export async function addTaskToWork(params: AddTaskParams): Promise<AddTaskResult> {
  const { projectRoot, workName, taskName, blueprintName, domainName, assetFormat, force } = params

  const workValidation = validateWorkName(workName)
  if (!workValidation.valid) {
    throw new Error(`Invalid work name: ${workValidation.error}`)
  }
  const taskValidation = validateTaskName(taskName)
  if (!taskValidation.valid) {
    throw new Error(`Invalid task name: ${taskValidation.error}`)
  }

  if (!isWorkStarted(projectRoot, workName) === false) {
    throw new Error(`work "${workName}" is already running; cannot modify`)
  }

  const workFile = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
  if (!existsSync(workFile)) {
    throw new Error(`work "${workName}" not found at ${workFile}`)
  }

  const taskDir = join(projectRoot, BOUNDARY_DIR, 'works', workName, 'tasks', taskName)
  const taskFile = join(taskDir, TASK_OXN_FILE)
  if (existsSync(taskFile) && !force) {
    throw new Error(`task.oxn already exists at ${taskFile}`)
  }

  let allowedBlueprints: string[] = []
  let allowedDomains: string[] = []
  try {
    const validated = await validateWorkFile(workFile)
    if (validated.ok && validated.doc) {
      allowedBlueprints = validated.doc.entities
        .filter(isBlueprintDeclaration)
        .map((bp) => bp.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0)
      allowedDomains = validated.doc.entities
        .filter(isDomainDeclaration)
        .map((d) => d.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0)
    }
  } catch {
    // soft degradation: AST parse failure does not block add-task
  }

  if (allowedBlueprints.length > 0 && !allowedBlueprints.includes(blueprintName)) {
    throw new Error(`blueprint "${blueprintName}" not declared in work "${workName}" (allowed: ${allowedBlueprints.join(', ')})`)
  }

  if (domainName && allowedDomains.length > 0 && !allowedDomains.includes(domainName)) {
    throw new Error(`domain "${domainName}" not declared in work "${workName}" (allowed: ${allowedDomains.join(', ')})`)
  }

  const domainLine = domainName ? `  domain "${domainName}"` : ''
  const template = `// Task: ${taskName} (work: ${workName}, blueprint: ${blueprintName})
// Created by: oxn work add-task <name> --task ${taskName} --blueprint ${blueprintName} ${domainName ? `--domain ${domainName}` : ''}
//
// 任务执行：
//   oxn work status <name>
//   oxn work context <name> --task ${taskName}

task "${taskName}" {
  blueprint "${blueprintName}"
${domainLine}
  part "slot-name" {
    skill_context = "TODO: 描述 AI 执行指令"
  }
}
`
  ensureDirectory(taskDir)
  writeFileSync(taskFile, template, 'utf-8')

  return {
    ok: true,
    workName,
    taskName,
    blueprint: blueprintName,
    domain: domainName ?? '',
    path: taskFile,
  }
}

export interface EditTaskParams {
  projectRoot: string
  workName: string
  taskName: string
  objective?: string
  addConstraint?: string
  addDomain?: string
  assetFormat: AssetFormat
}

export interface EditTaskResult {
  ok: true
  workName: string
  taskName: string
  file: string
  edited: boolean
}

export function editTask(params: EditTaskParams): EditTaskResult {
  const { projectRoot, workName, taskName, assetFormat } = params
  const newObjective = params.objective
  const addConstraint = params.addConstraint ?? ''
  const addDomain = params.addDomain ?? ''

  if (!isWorkStarted(projectRoot, workName) === false) {
    throw new Error(`work "${workName}" is already running; cannot modify`)
  }

  const taskFile = join(projectRoot, BOUNDARY_DIR, 'works', workName, 'tasks', taskName, TASK_OXN_FILE)
  if (!existsSync(taskFile)) {
    throw new Error(`task.oxn not found at ${taskFile}`)
  }
  let content = readFileSync(taskFile, 'utf-8')

  if (newObjective !== undefined) {
    const replaced = content.replace(
      /objective\s*=\s*"((?:[^"\\]|\\.)*)"/,
      `objective = "${newObjective.replace(/"/g, '\\"')}"`,
    )
    if (replaced === content) {
      throw new Error('task.oxn has no objective field; cannot update')
    }
    content = replaced
  }

  if (addConstraint) {
    const newConstraint = addConstraint.replace(/"/g, '\\"')
    const re = /(constraints\s*=\s*\[)([^\]]*?)(\])/m
    if (re.test(content)) {
      content = content.replace(re, (_m, head: string, body: string, tail: string) => {
        if (body.trim() === '') {
          return `${head}"${newConstraint}"${tail}`
        }
        const newBody =
          body.trimEnd().endsWith(',') || body.trimEnd() === ''
            ? `${body} "${newConstraint}",`
            : `${body}, "${newConstraint}",`
        return `${head}${newBody} ${tail}`
      })
    } else {
      content = content.replace(
        /(context\s*\{)([^}]*?)(\})/m,
        (_m, head: string, body: string, tail: string) => `${head}\n    constraints = ["${newConstraint}"];${body}${tail}`,
      )
    }
  }

  if (addDomain) {
    const workFile = resolveAssetPrimaryPath(projectRoot, 'work', workName, assetFormat)
    if (existsSync(workFile)) {
      let workContent = readFileSync(workFile, 'utf-8')
      if (workFile.endsWith('.md')) {
        try {
          const parsed = parseMarkdown(workContent)
          const ir = extractWorkIR(parsed.tree, parsed.frontmatter)
          workContent = serializeWorkToOxn(ir)
        } catch {
          // soft degradation: still use regex on original content
        }
      }
      const allowed = Array.from(workContent.matchAll(/domain\s+"([^"]+)"/g)).map((m) => m[1]!)
      if (allowed.length > 0 && !allowed.includes(addDomain)) {
        throw new Error(`domain "${addDomain}" not declared in work "${workName}" (allowed: ${allowed.join(', ')})`)
      }
    }
    if (/\bblueprint\b/.test(content)) {
      content = content.replace(/(blueprint\s+"[^"]+"\s*;)/, `$1\n  domain "${addDomain}";`)
    } else {
      content = content.replace(/(task\s+"[^"]+"\s*\{)/, `$1\n  domain "${addDomain}";`)
    }
  }

  writeFileSync(taskFile, content, 'utf-8')
  return {
    ok: true,
    workName,
    taskName,
    file: taskFile,
    edited: true,
  }
}

export interface DeleteTaskParams {
  projectRoot: string
  workName: string
  taskName: string
  force: boolean
  keepState: boolean
}

export interface DeleteTaskResult {
  ok: true
  workName: string
  taskName: string
  deleted: boolean
  keptState: boolean
}

export function deleteTask(params: DeleteTaskParams): DeleteTaskResult {
  const { projectRoot, workName, taskName, force, keepState } = params

  if (!isWorkStarted(projectRoot, workName) === false) {
    throw new Error(`work "${workName}" is already running; cannot modify`)
  }

  const taskDir = join(projectRoot, BOUNDARY_DIR, 'works', workName, 'tasks', taskName)
  if (!existsSync(taskDir)) {
    throw new Error(`task directory not found: ${taskDir}`)
  }

  if (!force) {
    throw new Error(`deletion requires --force. pass --force to confirm deletion of ${taskDir}`)
  }

  if (keepState) {
    const taskOxn = join(taskDir, TASK_OXN_FILE)
    if (existsSync(taskOxn)) {
      unlinkSync(taskOxn)
    }
  } else {
    rmSync(taskDir, { recursive: true, force: true })
  }

  return {
    ok: true,
    workName,
    taskName,
    deleted: true,
    keptState: keepState,
  }
}
