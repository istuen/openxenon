#!/usr/bin/env bun
import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'

interface Violation {
  from: string
  to: string
  rule: string
  line: number
}

interface Summary {
  totalModules: number
  totalImports: number
  violationsCount: number
}

interface ValidationResult {
  valid: boolean
  violations: Violation[]
  summary: Summary
}

interface LayerRules {
  allowedDeps: string[]
  forbiddenDeps: string[]
}

type LayerName =
  | 'L0-Schema'
  | 'L0-Contract'
  | 'L0-Processor'
  | 'L1-Infra'
  | 'L1-OXN-DSL'
  | 'L2-Arsenal'
  | 'L2-Work'
  | 'L3-CLI'

const LAYER_RULES: Record<LayerName, LayerRules> = {
  'L0-Schema': {
    allowedDeps: [],
    forbiddenDeps: ['L0-Contract', 'L0-Processor', 'L1-Infra', 'L1-OXN-DSL', 'L2-Arsenal', 'L2-Work', 'L3-CLI'],
  },
  'L0-Contract': {
    allowedDeps: ['L0-Schema'],
    forbiddenDeps: ['L0-Processor', 'L1-Infra', 'L1-OXN-DSL', 'L2-Arsenal', 'L2-Work', 'L3-CLI'],
  },
  'L0-Processor': {
    allowedDeps: ['L0-Schema', 'L0-Contract'],
    forbiddenDeps: ['L1-Infra', 'L1-OXN-DSL', 'L2-Arsenal', 'L2-Work', 'L3-CLI'],
  },
  'L1-Infra': {
    allowedDeps: ['L0-Schema', 'L0-Contract', 'L2-Arsenal'],
    forbiddenDeps: ['L0-Processor', 'L2-Work', 'L3-CLI'],
  },
  'L1-OXN-DSL': {
    allowedDeps: ['L0-Schema', 'L0-Contract'],
    forbiddenDeps: ['L0-Processor', 'L2-Arsenal', 'L2-Work', 'L3-CLI'],
  },
  'L2-Arsenal': {
    allowedDeps: ['L1-Infra', 'L0-Schema', 'L0-Contract'],
    forbiddenDeps: ['L2-Work', 'L3-CLI'],
  },
  'L2-Work': {
    allowedDeps: ['L1-Infra', 'L1-OXN-DSL', 'L0-Schema', 'L0-Contract', 'L0-Processor'],
    forbiddenDeps: ['L3-CLI'],
  },
  'L3-CLI': {
    allowedDeps: ['L2-Arsenal', 'L2-Work', 'L1-Infra', 'L1-OXN-DSL', 'L0-Schema', 'L0-Contract', 'L0-Processor'],
    forbiddenDeps: [],
  },
}

function getLayerFromPath(filePath: string): LayerName | null {
  const relativePath = relative(process.cwd(), filePath)

  if (relativePath.startsWith('src/kernel/schemas/')) {
    return 'L0-Schema'
  }
  if (relativePath.startsWith('src/kernel/contracts/')) {
    return 'L0-Contract'
  }
  if (relativePath.startsWith('src/kernel/')) {
    return 'L0-Processor'
  }
  if (relativePath.startsWith('src/infra/')) {
    return 'L1-Infra'
  }
  if (relativePath.startsWith('src/oxn-dsl/')) {
    return 'L1-OXN-DSL'
  }
  if (relativePath.startsWith('src/arsenals/')) {
    return 'L2-Arsenal'
  }
  if (relativePath.startsWith('src/work/')) {
    return 'L2-Work'
  }
  if (relativePath.startsWith('src/cli/') || relativePath.startsWith('src/daemon/')) {
    return 'L3-CLI'
  }

  return null
}

function getLayerName(layer: LayerName): string {
  return layer
}

function normalizeImportPath(importPath: string): string {
  if (importPath.startsWith('.')) {
    return importPath.replace(/\.ts$/, '').replace(/\.js$/, '')
  }
  if (importPath.startsWith('../')) {
    return importPath.replace(/\.ts$/, '').replace(/\.js$/, '')
  }
  return importPath
}

function scanImports(filePath: string): Array<{ path: string; line: number }> {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const imports: Array<{ path: string; line: number }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const importMatch = line.match(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/)
    if (importMatch) {
      imports.push({ path: importMatch[1], line: i + 1 })
    }
    const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/)
    if (requireMatch) {
      imports.push({ path: requireMatch[1], line: i + 1 })
    }
  }

  return imports
}

function resolveImportToFile(importPath: string, currentFile: string): string | null {
  const normalized = normalizeImportPath(importPath)

  if (normalized.startsWith('../')) {
    const currentDir = join(currentFile, '..')
    const resolved = join(currentDir, normalized)
    return resolved
  }

  if (normalized.startsWith('src/')) {
    return normalized
  }

  if (normalized.startsWith('./')) {
    const currentDir = join(currentFile, '..')
    const resolved = join(currentDir, normalized)
    return resolved
  }

  return null
}

function validateDependencies(srcDir: string): ValidationResult {
  const violations: Violation[] = []
  let totalImports = 0

  function processDirectory(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        processDirectory(fullPath)
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        const layer = getLayerFromPath(fullPath)
        if (!layer) return

        const imports = scanImports(fullPath)
        totalImports += imports.length

        for (const imp of imports) {
          const resolvedPath = resolveImportToFile(imp.path, fullPath)
          if (!resolvedPath) continue

          const targetLayer = getLayerFromPath(resolvedPath)
          if (!targetLayer) continue
          if (targetLayer === layer) continue

          const rules = LAYER_RULES[layer]
          if (!rules) continue

          if (rules.forbiddenDeps.includes(targetLayer)) {
            violations.push({
              from: relative(process.cwd(), fullPath),
              to: resolvedPath,
              rule: `${getLayerName(layer)} cannot depend on ${getLayerName(targetLayer)}`,
              line: imp.line,
            })
          }
        }
      }
    }
  }

  processDirectory(srcDir)

  return {
    valid: violations.length === 0,
    violations,
    summary: {
      totalModules: 0,
      totalImports,
      violationsCount: violations.length,
    },
  }
}

const srcDir = join(process.cwd(), 'src')
const result = validateDependencies(srcDir)

console.log(JSON.stringify(result, null, 2))

if (!result.valid) {
  process.exit(1)
}
