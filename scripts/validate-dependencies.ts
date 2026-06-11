#!/usr/bin/env bun
// =============================================================================
// L0-L3 Dependency Validator (v0.1.4 PR-K 简化)
//
// 实施 OpenXenon 元域的依赖宪法。完整分层定义见：
//   docs/architecture/l0-l3-constitution.md
//
// 关键规则（PR-K 简化后）：
//   - L0 Kernel 是单一 L0 子层，对外只暴露 src/kernel/index.ts
//   - L1/L2/L3 可以 'import ... from "..kernel/index"' 或 'import ... from "..kernel"'（=index）
//   - L1/L2/L3 禁止走子层路径：
//       from '.../kernel/contracts/xxx'
//       from '.../kernel/schemas/xxx'
//       from '.../kernel/processors/xxx'
//       from '.../kernel/verdicts/xxx'
//     （即 kernel/ 后还有子目录的形式全部黑名单）
//   - L0 内部 4 子层（contracts/ schemas/ processors/ verdicts/）的互引
//     自由——它们是"内部职责分工"，对外透明（宪法 §3 修订后）。
//   - L1+ 子层（infra/ oxn-dsl/ builtin/ work/ cli/daemon/...）互相之间：
//     仍按旧的 8 子层白名单 + 跨层禁止矩阵（外层不能调内层 algorithm
//     等等）。本文件保留这部分规则——它们与 Kernel 公开面正交。
//
// 关键设计：
//   - type-only imports (`import type`) 不算真实依赖（编译后消除）
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

type LayerName = 'L0-Kernel' | 'L1-Infra' | 'L1-OXN-DSL' | 'L2-Builtin' | 'L2-Work' | 'L3-CLI'

/**
 * 8 子层 → 4 大类的归类（PR-K 简化后）：
 *   - L0-Kernel:  src/kernel/ 整体对外是一个 L0 实体（公开面 = index.ts）
 *   - L1-Infra:   src/infra/
 *   - L1-OXN-DSL: src/oxn-dsl/
 *   - L2-Builtin: src/builtin/
 *   - L2-Work:    src/work/
 *   - L3-CLI:     src/cli/ + src/daemon/ + src/hall/ + src/skills/ +
 *                 src/watcher/ + src/core/ + src/i18n/
 */
function getLayerFromPath(filePath: string): LayerName | null {
  const relativePath = relative(process.cwd(), filePath)

  if (relativePath.startsWith('src/kernel/')) {
    return 'L0-Kernel'
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

/**
 * PR-K 新规则：L1/L2/L3 禁止走 kernel 子层路径
 *
 * 黑名单形式（相对路径形式）：
 *   .../kernel/contracts/xxx
 *   .../kernel/schemas/xxx
 *   .../kernel/processors/xxx
 *   .../kernel/verdicts/xxx
 *   .../kernel/enums.ts
 *   .../kernel/constants.ts
 *
 * 白名单形式（合法）：
 *   .../kernel/index
 *   .../kernel/index.ts
 *   .../kernel       (TypeScript 会自动解析为 kernel/index.ts)
 */
function isForbiddenKernelDeepPath(importPath: string): boolean {
  // 形如 './xxx' 或 '../xxx'，最后一段路径段含 'kernel/<sub>/...' 或 'kernel/xxx.ts'
  if (!importPath.includes('kernel/')) return false
  // kernel/index 或 kernel 自身合法
  if (/kernel\/(index(\.ts)?)?$/.test(importPath)) return false
  // 否则 deep path 违规
  return true
}

/**
 * 旧 L1-L2-L3 跨层规则（保留）。
 *
 * Kernel 现在是单一 L0；旧 8 子层白名单矩阵不再适用。
 * 仅保留 L1/L2/L3 之间的边：外层可以调内层（L2 调 L1 合法），
 * 内层不能调外层（L1 调 L2 违规）。
 */
const LAYER_RULES: Record<LayerName, { canCall: LayerName[]; cannotCall: LayerName[] }> = {
  'L0-Kernel': {
    canCall: [],
    cannotCall: ['L1-Infra', 'L1-OXN-DSL', 'L2-Builtin', 'L2-Work', 'L3-CLI'],
  },
  'L1-Infra': {
    canCall: ['L0-Kernel'],
    cannotCall: ['L2-Work', 'L3-CLI'],
  },
  'L1-OXN-DSL': {
    canCall: ['L0-Kernel'],
    cannotCall: ['L2-Builtin', 'L2-Work', 'L3-CLI'],
  },
  'L2-Builtin': {
    canCall: ['L1-Infra', 'L0-Kernel'],
    cannotCall: ['L2-Work', 'L3-CLI'],
  },
  'L2-Work': {
    canCall: ['L1-Infra', 'L1-OXN-DSL', 'L0-Kernel'],
    cannotCall: ['L3-CLI'],
  },
  'L3-CLI': {
    canCall: ['L2-Builtin', 'L2-Work', 'L1-Infra', 'L1-OXN-DSL', 'L0-Kernel'],
    cannotCall: [],
  },
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

          // PR-K 新规则：L1+ 文件禁止走 kernel 子层路径
          if (layer !== 'L0-Kernel' && isForbiddenKernelDeepPath(imp.path)) {
            violations.push({
              from: relative(process.cwd(), fullPath),
              to: imp.path,
              rule: `${layer} cannot deep-path into kernel/ (use '.../kernel/index' instead)`,
              line: imp.line,
            })
            continue
          }

          // L0 内部 4 子层互引——同层 skip（不算违规）
          if (layer === 'L0-Kernel') {
            // L0 文件可以自由 import 其他 L0 文件（包括子层）
            continue
          }

          const resolvedPath = resolveImportToFile(imp.path, fullPath)
          if (!resolvedPath) continue

          const targetLayer = getLayerFromPath(resolvedPath)
          if (!targetLayer) continue
          if (targetLayer === layer) continue

          const rules = LAYER_RULES[layer]
          if (!rules) continue

          if (rules.cannotCall.includes(targetLayer)) {
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
