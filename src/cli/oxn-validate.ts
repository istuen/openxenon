import { defineCommand } from 'citty'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { URI } from 'langium'
import { validateFrozenBlueprint } from '../kernel/schemas/frozen-schema'
import type { OxnAssemblyIR, OxnAssemblySlotBinding } from '../oxn-dsl/schemas/oxn-assembly.schema'
import { validateOxnAssemblyIR } from '../oxn-dsl/schemas/oxn-assembly.schema'
import { adaptOxnToFrozen } from '../oxn-dsl/compiler/oxn-adapter'
import type { OXNDocument } from '../oxn-dsl/generated/ast.js'
import { generateOxnAssembly } from '../oxn-dsl/generator/oxn-generator.js'
import { createOxnServices, resetOxnServices } from '../oxn-dsl/langium/oxn-services.js'
import { output, outputError } from './output'

export interface ValidationResult {
  file: string
  ok: boolean
  errors: string[]
  warnings: string[]
}

function validateOxnFile(filePath: string, content: string, examplesDir: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const fileName = filePath.replace(`${examplesDir}/`, '')

  try {
    resetOxnServices()
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)
    const uri = URI.file(filePath)
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = factory.fromString(content, uri, undefined)

    if (doc.parseResult?.lexerErrors?.length) {
      for (const e of doc.parseResult.lexerErrors) {
        errors.push(`[Lexer] L${e.line}:${e.column} ${e.message}`)
      }
    }
    if (doc.parseResult?.parserErrors?.length) {
      for (const e of doc.parseResult.parserErrors) {
        errors.push(`[Parser] ${e.message}`)
      }
    }
    if (errors.length > 0) {
      return { file: fileName, ok: false, errors, warnings }
    }

    const bundle = generateOxnAssembly(doc.parseResult.value as OXNDocument)

    const blueprintEntity = bundle.entities.find((e) => e.type === 'blueprint')
    if (!blueprintEntity) {
      warnings.push('No blueprint found in file (may be intentional for probe/part examples)')
      return { file: fileName, ok: true, errors: [], warnings }
    }

    const assembly = validateOxnAssemblyIR((blueprintEntity as { data: unknown }).data)

    const workEntity = bundle.entities.find((e) => e.type === 'work')
    let slotBindings: OxnAssemblySlotBinding[] = []
    if (workEntity) {
      const workData = (workEntity as { data: { slotBindings?: OxnAssemblySlotBinding[] } }).data
      slotBindings = workData.slotBindings || []
    }

    const result = adaptOxnToFrozen(assembly as OxnAssemblyIR, slotBindings)
    validateFrozenBlueprint(result.frozen)

    if (result.warnings.length > 0) {
      warnings.push(...result.warnings)
    }

    return { file: fileName, ok: true, errors: [], warnings }
  } catch (err) {
    return {
      file: fileName,
      ok: false,
      errors: [err instanceof Error ? err.message : String(err)],
      warnings,
    }
  }
}

export default defineCommand({
  meta: {
    name: 'validate',
    description: '验证 OXN example 文件是否符合语法标准',
  },
  args: {
    '--standard': { type: 'boolean', description: '验证 examples 目录下的所有标准 example 文件' },
  },
  async run(_ctx) {
    const examplesDir = join(__dirname, '..', 'oxn-dsl', 'examples')

    if (!existsSync(examplesDir)) {
      return outputError({
        code: 'OXN_VALIDATE_NOT_FOUND',
        message: `Examples 目录不存在: ${examplesDir}`,
      })
    }

    const files = readdirSync(examplesDir)
      .filter((f) => f.endsWith('.oxn'))
      .filter((f) => ['probe-example.oxn', 'part-example.oxn', 'blueprint-example.oxn', 'work-example.oxn'].includes(f))
    if (files.length === 0) {
      return outputError({
        code: 'OXN_VALIDATE_NO_FILES',
        message: 'No .oxn files found in examples directory',
      })
    }

    const results: ValidationResult[] = []
    let allOk = true

    for (const file of files) {
      const filePath = join(examplesDir, file)
      const content = readFileSync(filePath, 'utf-8')
      const result = validateOxnFile(filePath, content, examplesDir)
      results.push(result)
      if (!result.ok) allOk = false
    }

    const passed = results.filter((r) => r.ok)
    const failed = results.filter((r) => !r.ok)

    const lines: string[] = []
    lines.push('OXN Example 验证结果:')
    lines.push('')

    for (const r of results) {
      const icon = r.ok ? '✓' : '✗'
      const status = r.ok ? 'PASS' : 'FAIL'
      lines.push(`  ${icon} [${status}] ${r.file}`)
      if (r.errors.length > 0) {
        for (const e of r.errors) {
          lines.push(`      └─ ${e}`)
        }
      }
      if (r.warnings.length > 0) {
        for (const w of r.warnings) {
          lines.push(`      └─ (warning) ${w}`)
        }
      }
    }

    lines.push('')
    lines.push(`汇总: ${passed.length} passed, ${failed.length} failed`)

    if (allOk) {
      return output({
        data: { ok: true, results },
        human: lines.join('\n'),
      })
    } else {
      return outputError({
        code: 'OXN_VALIDATE_FAILED',
        message: lines.join('\n'),
      })
    }
  },
})
