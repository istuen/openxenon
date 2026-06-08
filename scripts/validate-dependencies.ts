#!/usr/bin/env bun
// =============================================================================
// L0-L3 Dependency Validator
//
// 实施 OpenXenon 元域的依赖宪法。完整分层定义见：
//   docs/architecture/l0-l3-constitution.md
//
// 关键规则：
//   - 内层不依赖外层（CPU 缓存类比）
//   - type-only 导入 (`import type`) 不算真实依赖
//   - test 文件 (`__tests__/`) 视为 relaxed boundary
//   - CI 自动拦截 forbidden 跨层
// =============================================================================

import { readdirSync, readFileSync } from 'fs'
import { join, relative } from 'path'

interface Violation {
  from: string
  to: string
  rule: string
  line: number
}

interface Summary {
  totalFiles: number
  totalImports: number
  violationsCount: number
  skippedTypeOnly: number
  skippedTests: number
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
  | 'L2-Builtin'
  | 'L2-Work'
  | 'L3-CLI'

const LAYER_RULES: Record<LayerName, LayerRules> = {
  'L0-Schema': {
    allowedDeps: [],
    forbiddenDeps: ['L0-Contract', 'L0-Processor', 'L1-Infra', 'L1-OXN-DSL', 'L2-Builtin', 'L2-Work', 'L3-CLI'],
  },
  'L0-Contract': {
    allowedDeps: ['L0-Schema'],
    forbiddenDeps: ['L0-Processor', 'L1-Infra', 'L1-OXN-DSL', 'L2-Builtin', 'L2-Work', 'L3-CLI'],
  },
  'L0-Processor': {
    allowedDeps: ['L0-Schema', 'L0-Contract'],
    forbiddenDeps: ['L1-Infra', 'L1-OXN-DSL', 'L2-Builtin', 'L2-Work', 'L3-CLI'],
  },
  'L1-Infra': {
    allowedDeps: ['L0-Schema', 'L0-Contract', 'L2-Builtin'],
    forbiddenDeps: ['L0-Processor', 'L2-Work', 'L3-CLI'],
  },
  'L1-OXN-DSL': {
    allowedDeps: ['L0-Schema', 'L0-Contract'],
    forbiddenDeps: ['L0-Processor', 'L2-Builtin', 'L2-Work', 'L3-CLI'],
  },
  'L2-Builtin': {
    allowedDeps: ['L1-Infra', 'L0-Schema', 'L0-Contract'],
    forbiddenDeps: ['L2-Work', 'L3-CLI'],
  },
  'L2-Work': {
    allowedDeps: ['L1-Infra', 'L1-OXN-DSL', 'L0-Schema', 'L0-Contract', 'L0-Processor'],
    forbiddenDeps: ['L3-CLI'],
  },
  'L3-CLI': {
    allowedDeps: ['L2-Builtin', 'L2-Work', 'L1-Infra', 'L1-OXN-DSL', 'L0-Schema', 'L0-Contract', 'L0-Processor'],
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
  if (relativePath.startsWith('src/builtin/')) {
    return 'L2-Builtin'
  }
  if (relativePath.startsWith('src/work/')) {
    return 'L2-Work'
  }
  // L3 Runtime: CLI + Daemon + Hall + Skill + Watcher + Core + i18n
  if (
    relativePath.startsWith('src/cli/') ||
    relativePath.startsWith('src/daemon/') ||
    relativePath.startsWith('src/hall/') ||
    relativePath.startsWith('src/skills/') ||
    relativePath.startsWith('src/watcher/') ||
    relativePath.startsWith('src/core/') ||
    relativePath.startsWith('src/i18n/')
  ) {
    return 'L3-CLI'
  }

  return null
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

function isTypeOnlyImport(line: string): boolean {
  // `import type { ... } from '...'`
  // `import type ... from '...'`
  return /^import\s+type\s+/.test(line)
}

function isInTestsDirectory(filePath: string): boolean {
  return filePath.includes('/__tests__/') || filePath.endsWith('.test.ts')
}

function scanImports(filePath: string): Array<{ path: string; line: number; typeOnly: boolean }> {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const imports: Array<{ path: string; line: number; typeOnly: boolean }> = []

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i]!
    const typeOnly = isTypeOnlyImport(currentLine)

    const importMatch = currentLine.match(/^import\s+(?:type\s+)?.*?\s+from\s+['"]([^'"]+)['"]/)
    if (importMatch) {
      imports.push({ path: importMatch[1]!, line: i + 1, typeOnly })
    }
    const requireMatch = currentLine.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/)
    if (requireMatch) {
      imports.push({ path: requireMatch[1]!, line: i + 1, typeOnly: false })
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
  let totalFiles = 0
  let skippedTypeOnly = 0
  let skippedTests = 0

  function processDirectory(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        processDirectory(fullPath)
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        // Skip test files: relaxed boundary per L0-L3 宪法 §4.3
        if (isInTestsDirectory(fullPath)) {
          skippedTests++
          continue
        }

        const layer = getLayerFromPath(fullPath)
        if (!layer) continue

        totalFiles++
        const imports = scanImports(fullPath)
        totalImports += imports.length

        for (const imp of imports) {
          // Skip type-only imports: zero runtime coupling
          if (imp.typeOnly) {
            skippedTypeOnly++
            continue
          }

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
              rule: `${layer} cannot depend on ${targetLayer}`,
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
      totalFiles,
      totalImports,
      violationsCount: violations.length,
      skippedTypeOnly,
      skippedTests,
    },
  }
}

const srcDir = join(process.cwd(), 'src')
const result = validateDependencies(srcDir)

console.log(JSON.stringify(result, null, 2))

if (!result.valid) {
  process.exit(1)
}
