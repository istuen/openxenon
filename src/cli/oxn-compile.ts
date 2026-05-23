import { defineCommand } from 'citty'
import { existsSync, readFileSync } from 'fs'
import { DocumentState, URI } from 'langium'
import { compileBundle } from '../oxn-dsl/compiler/bundle-compiler'
import type { OXNDocument } from '../oxn-dsl/generated/ast'
import { createOxnServices } from '../oxn-dsl/langium/oxn-services'
import { getFormatFromArgs, output, outputError } from './output'

export interface DiagnosticResult {
  ok: boolean
  diagnostics: LspDiagnostic[]
}

export interface LspDiagnostic {
  severity: 'error' | 'warning' | 'info'
  line: number
  column: number
  message: string
  code: string
}

function validateOxnSyntax(sourcePath: string, content: string): DiagnosticResult {
  if (!sourcePath.endsWith('.oxn')) {
    return { ok: true, diagnostics: [] }
  }

  const diagnostics: LspDiagnostic[] = []

  try {
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)
    const uri = URI.file(sourcePath)
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = factory.fromString(content, uri, undefined)

    if (doc.parseResult?.lexerErrors) {
      for (const err of doc.parseResult.lexerErrors) {
        diagnostics.push({
          severity: 'error',
          line: err.line ?? 0,
          column: err.column ?? 0,
          message: err.message,
          code: 'OXN_001',
        })
      }
    }

    if (doc.parseResult?.parserErrors) {
      for (const err of doc.parseResult.parserErrors) {
        diagnostics.push({
          severity: 'error',
          line: (err as any).range?.start?.line ?? (err as any).line ?? 0,
          column: (err as any).range?.start?.character ?? (err as any).column ?? 0,
          message: err.message,
          code: 'OXN_002',
        })
      }
    }

    if (doc.state >= DocumentState.Parsed) {
      const root = doc.parseResult?.value as OXNDocument | undefined
      if (!root?.entities || root.entities.length === 0) {
        diagnostics.push({
          severity: 'warning',
          line: 1,
          column: 1,
          message: 'OXN document parsed but contains no entities',
          code: 'OXN_003',
        })
      }
    } else {
      diagnostics.push({
        severity: 'error',
        line: 1,
        column: 1,
        message: `Document state is ${doc.state}, expected at least Parsed(${DocumentState.Parsed})`,
        code: 'OXN_004',
      })
    }
  } catch (err) {
    diagnostics.push({
      severity: 'error',
      line: 0,
      column: 0,
      message: err instanceof Error ? err.message : 'Langium parser initialization failed',
      code: 'OXN_999',
    })
  }

  return {
    ok: diagnostics.filter((d) => d.severity === 'error').length === 0,
    diagnostics,
  }
}

export default defineCommand({
  meta: {
    name: 'compile',
    description: '编译 .oxn/.yaml 为三件套 (.bundle.oxn + assembly.json + schema.json)',
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: '源文件路径 (.oxn 或 .yaml)',
    },
    output: {
      type: 'string',
      alias: 'o',
      description: '输出目录（默认为源文件同目录）',
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出 (含结构化诊断)' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args)
    const sourcePath = ctx.args.path as string
    const outputDir = ctx.args.output as string | undefined

    if (!existsSync(sourcePath)) {
      return outputError(
        {
          code: 'OXN_COMPILE_FAILED',
          message: `源文件不存在: ${sourcePath}`,
        },
        format,
      )
    }

    const content = readFileSync(sourcePath, 'utf-8')

    if (sourcePath.endsWith('.oxn')) {
      const syntaxCheck = validateOxnSyntax(sourcePath, content)

      if (!syntaxCheck.ok && format === 'json') {
        return output(
          {
            data: { ok: false, diagnostics: syntaxCheck.diagnostics },
            human: JSON.stringify({ ok: false, diagnostics: syntaxCheck.diagnostics }, null, 2),
          },
          format,
        )
      }

      if (!syntaxCheck.ok) {
        const lines = syntaxCheck.diagnostics
          .map((d) => `  ${d.severity === 'error' ? '✗' : '⚠'} [${d.code}] L${d.line}:${d.column} ${d.message}`)
          .join('\n')
        return outputError(
          {
            code: 'OXN_COMPILE_FAILED',
            message: `语法校验失败:\n${lines}`,
          },
          format,
        )
      }
    }

    try {
      const result = compileBundle(sourcePath, outputDir)
      return output(
        {
          data: {
            ok: true,
            diagnostics: [],
            ...result,
          },
          human: `编译完成:
  Bundle:   ${result.bundlePath}
  Assembly: ${result.assemblyPath}
  Schema:   ${result.schemaPath}
  实体数:   ${result.entityCount}`,
        },
        format,
      )
    } catch (err) {
      if (format === 'json') {
        return output(
          {
            data: {
              ok: false,
              diagnostics: [
                {
                  severity: 'error' as const,
                  line: 0,
                  column: 0,
                  message: err instanceof Error ? err.message : '编译失败',
                  code: 'OXN_COMPILE_ERR',
                },
              ],
            },
          },
          format,
        )
      }
      return outputError(
        {
          code: 'OXN_COMPILE_FAILED',
          message: err instanceof Error ? err.message : '编译失败',
        },
        format,
      )
    }
  },
})
