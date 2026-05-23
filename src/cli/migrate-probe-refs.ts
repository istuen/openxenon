import { existsSync, readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'
import { join } from 'path'

interface MigrationResult {
  file: string
  oldRef: string
  newRef: string
}

interface ProbeMapping {
  [bareName: string]: string
}

const BUILTIN_PROBES: ProbeMapping = {
  fs_exists: 'oxn/fs-exists',
  fs_not_exists: 'oxn/fs-not-exists',
  fs_match: 'oxn/fs-match',
  fs_content_match: 'oxn/fs-content-match',
  fs_parseable: 'oxn/fs-parseable',
  exec_exit_zero: 'oxn/exec-exit-zero',
  shell_exec: 'oxn/shell-exec',
  'exec-exit-zero': 'oxn/exec-exit-zero',
  exec_exit_code: 'oxn/exec-exit-zero',
  file_exists: 'oxn/fs-exists',
  file_not_exists: 'oxn/fs-not-exists',
  content_match: 'oxn/fs-content-match',
}

function detectAndConvertRef(ref: string): string | null {
  const trimmed = ref.trim()

  if (trimmed.startsWith('canonical://')) {
    const pathPart = trimmed.replace('canonical://', '')
    const parts = pathPart.split('/')
    const name = parts[parts.length - 1]
    if (!name) return null
    if (BUILTIN_PROBES[name]) {
      return BUILTIN_PROBES[name]
    }
    if (name.includes('-')) {
      return `oxn/${name}`
    }
    return null
  }

  if (BUILTIN_PROBES[trimmed]) {
    return BUILTIN_PROBES[trimmed]
  }

  if (trimmed.includes('/')) {
    return null
  }

  if (trimmed === 'fs-exists' || trimmed === 'fs_exists') {
    return 'oxn/fs-exists'
  }
  if (trimmed === 'fs-not-exists' || trimmed === 'fs_not_exists') {
    return 'oxn/fs-not-exists'
  }
  if (trimmed === 'fs-match' || trimmed === 'fs_match') {
    return 'oxn/fs-match'
  }
  if (trimmed === 'fs-content-match' || trimmed === 'fs_content_match') {
    return 'oxn/fs-content-match'
  }
  if (trimmed === 'exec-exit-zero' || trimmed === 'exec_exit_zero') {
    return 'oxn/exec-exit-zero'
  }
  if (trimmed === 'shell-exec' || trimmed === 'shell_exec') {
    return 'oxn/shell-exec'
  }

  return null
}

function migrateYamlFile(filePath: string, dryRun: boolean = false): MigrationResult[] {
  const results: MigrationResult[] = []
  const content = readFileSync(filePath, 'utf-8')
  let newContent = content

  const refPattern = /ref:\s*['"]?([^'"\n]+)['"]?/g
  let match

  while ((match = refPattern.exec(content)) !== null) {
    const oldRef = match[1]
    if (!oldRef) continue
    const newRef = detectAndConvertRef(oldRef)

    if (newRef && newRef !== oldRef) {
      newContent = newContent.replace(`ref: ${oldRef}`, `ref: ${newRef}`)
      results.push({ file: filePath, oldRef, newRef })
    }
  }

  if (results.length > 0 && !dryRun) {
    writeFileSync(filePath, newContent, 'utf-8')
  }

  return results
}

function migrateDirectory(dirPath: string, dryRun: boolean = false): MigrationResult[] {
  const results: MigrationResult[] = []

  if (!existsSync(dirPath)) {
    return results
  }

  const files = globSync('**/*.{yaml,yml}', { cwd: dirPath, absolute: true })

  for (const file of files) {
    const fileResults = migrateYamlFile(file, dryRun)
    results.push(...fileResults)
  }

  return results
}

export function migrateProbeRefs(projectRoot: string, dryRun: boolean = false): MigrationResult[] {
  const results: MigrationResult[] = []

  const probesDir = join(projectRoot, '.openxenon', 'arsenals', 'probes')
  results.push(...migrateDirectory(probesDir, dryRun))

  const blueprintsDir = join(projectRoot, '.openxenon', 'arsenals', 'blueprints')
  results.push(...migrateDirectory(blueprintsDir, dryRun))

  const partsDir = join(projectRoot, '.openxenon', 'arsenals', 'parts')
  results.push(...migrateDirectory(partsDir, dryRun))

  const rootBlueprint = join(projectRoot, 'blueprint.yaml')
  if (existsSync(rootBlueprint)) {
    results.push(...migrateYamlFile(rootBlueprint, dryRun))
  }

  const openxenonBlueprint = join(projectRoot, '.openxenon', 'blueprint.yaml')
  if (existsSync(openxenonBlueprint)) {
    results.push(...migrateYamlFile(openxenonBlueprint, dryRun))
  }

  return results
}

export function formatMigrationReport(results: MigrationResult[]): string {
  if (results.length === 0) {
    return 'No probe refs need migration.'
  }

  const lines = ['\n=== Probe Ref Migration Report ===\n']

  const byFile: Record<string, MigrationResult[]> = {}
  for (const r of results) {
    if (!byFile[r.file]) {
      byFile[r.file] = []
    }
    byFile[r.file]?.push(r)
  }

  for (const [file, itemResults] of Object.entries(byFile)) {
    lines.push(`📄 ${file}`)
    for (const r of itemResults) {
      lines.push(`  ${r.oldRef} → ${r.newRef}`)
    }
    lines.push('')
  }

  lines.push(`Total: ${results.length} ref(s) migrated in ${Object.keys(byFile).length} file(s)\n`)

  return lines.join('\n')
}

export const migrationCommands = {
  'migrate-probe-refs': {
    description: 'Migrate legacy probe refs to namespaced format',
    async handler(args: { projectRoot: string; dryRun?: boolean; force?: boolean }) {
      const { projectRoot, dryRun = false } = args

      console.log(dryRun ? '🔍 Dry run mode - no changes will be made' : '⚠️ Migration will modify files in place')

      const results = migrateProbeRefs(projectRoot, dryRun)
      console.log(formatMigrationReport(results))

      if (!dryRun && results.length > 0) {
        console.log('✅ Migration complete. Please review changes and run tests.')
      }

      return { migrated: results.length, results }
    },
  },
}

if (import.meta.main) {
  const projectRoot = process.cwd()
  const dryRun = process.argv.includes('--dry-run')

  console.log('🔍 Scanning for legacy probe refs...')
  const results = migrateProbeRefs(projectRoot, dryRun)
  console.log(formatMigrationReport(results))

  if (!dryRun && results.length > 0) {
    process.exit(0)
  }
}
