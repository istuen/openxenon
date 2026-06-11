/**
 * Task 2.3 — OXN 三件套编译器
 *
 * oxn compile <path> 命令实现：
 *   1. <name>.bundle.oxn — 人类可读源码包
 *   2. <name>.bundle.assembly.json — 纯数据契约
 *   3. <name>.bundle.assembly.schema.json — JSON Schema
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { URI } from 'langium'
import { basename, dirname, join } from 'path'
import { parse as parseYaml } from 'yaml'
import type { OxnAssemblyBundle, OxnAssemblyBundleEntity } from '../schemas/oxn-assembly.schema'
import { flattenBundle } from '../flattener/bundle-flattener.js'
import type { OXNDocument } from '../generated/ast.js'
import { generateOxnAssembly } from '../generator/oxn-generator.js'
import { createOxnServices, resetOxnServices } from '../langium/oxn-services.js'

// ========================
// JSON Schema 生成器 (简化版)
// ========================

function generateJsonSchema(entities: OxnAssemblyBundleEntity[]): Record<string, unknown> {
  const typeSchemas: Record<string, Record<string, unknown>> = {}

  for (const entity of entities) {
    const data = entity.data as Record<string, unknown>
    const schema: Record<string, unknown> = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    }

    if (data.props && Array.isArray(data.props)) {
      const props = data.props as Array<Record<string, unknown>>
      const propSchema: Record<string, Record<string, unknown>> = {}
      for (const p of props) {
        propSchema[p.name as string] = {
          type: (p.type as string).startsWith('enum') ? 'string' : (p.type as string),
        }
      }
      schema.properties = {
        ...(schema.properties as Record<string, unknown>),
        props: { type: 'object', properties: propSchema },
      } as Record<string, unknown>
    }

    if (data._version !== undefined) {
      ;(schema.properties as Record<string, unknown>)._version = { type: 'number' }
    }

    typeSchemas[entity.type] = schema
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'OXN Bundle Assembly Schema',
    type: 'object',
    properties: {
      entities: {
        type: 'array',
        items: { oneOf: Object.entries(typeSchemas).map(([type, s]) => ({ ...s, title: type })) },
      },
    },
  }
}

// ========================
// Bundle 编译器
// ========================

/**
 * 通过 Langium 解析 .oxn 文件提取实体列表
 */
function parseOxnViaLangium(
  sourcePath: string,
  content: string,
): { entities: OxnAssemblyBundleEntity[]; errors: string[] } {
  const errors: string[] = []
  try {
    resetOxnServices()
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)

    const factory = shared.workspace.LangiumDocumentFactory
    const uri = URI.file(sourcePath)
    const doc = factory.fromString(content, uri, undefined)

    if (!doc.parseResult?.value) {
      return { entities: [], errors: ['Langium 文档解析失败: 无有效 parseResult'] }
    }

    if (doc.parseResult.parserErrors?.length > 0) {
      for (const e of doc.parseResult.parserErrors) {
        errors.push(`[P] ${e.message}`)
      }
    }
    if (doc.parseResult.lexerErrors?.length > 0) {
      for (const e of doc.parseResult.lexerErrors) {
        errors.push(`[L] ${e.message}`)
      }
    }

    if (errors.length > 0) {
      return { entities: [], errors }
    }

    const bundle = generateOxnAssembly(doc.parseResult.value as OXNDocument)
    return { entities: bundle.entities, errors: [] }
  } catch (err) {
    return { entities: [], errors: [String(err)] }
  }
}

export interface BundleCompileResult {
  bundlePath: string
  assemblyPath: string
  schemaPath: string
  entityCount: number
}

export class BundleCompiler {
  /**
   * 编译指定的 .oxn 文件或目录，产出三件套
   */
  compile(sourcePath: string, outputDir?: string): BundleCompileResult {
    if (!existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`)
    }

    const sourceName = basename(sourcePath).replace(/\.(yaml|yml|oxn|json)$/, '')
    const outDir = outputDir || dirname(sourcePath)

    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }

    // 1. 读取源文件
    const content = readFileSync(sourcePath, 'utf-8')
    let entities: OxnAssemblyBundleEntity[] = []
    const warnings: string[] = []

    if (sourcePath.endsWith('.yaml') || sourcePath.endsWith('.yml')) {
      const parsed = parseYaml(content) as Record<string, unknown>
      entities = this._yamlToEntities(parsed)
    } else if (sourcePath.endsWith('.json')) {
      const parsed = JSON.parse(content) as OxnAssemblyBundle
      entities = parsed.entities
    } else if (sourcePath.endsWith('.oxn')) {
      const { entities: langiumEntities, errors } = parseOxnViaLangium(sourcePath, content)
      if (langiumEntities.length > 0) {
        entities = langiumEntities
      } else {
        warnings.push(`Langium 解析失败: ${errors.join('; ')}, 回退到 YAML 降级解析`)
        try {
          const parsed = parseYaml(content) as Record<string, unknown>
          entities = this._yamlToEntities(parsed)
        } catch {
          entities = [{ type: 'blueprint', data: { name: sourceName, _version: 1 } } as OxnAssemblyBundleEntity]
        }
      }
    }

    const bundle: OxnAssemblyBundle = { entities }

    // 2. 扁平化
    const { bundle: flatBundle } = flattenBundle(bundle)

    // 3. 输出三件套
    const bundlePath = join(outDir, `${sourceName}.bundle.oxn`)
    const assemblyPath = join(outDir, `${sourceName}.bundle.assembly.json`)
    const schemaPath = join(outDir, `${sourceName}.bundle.assembly.schema.json`)

    writeFileSync(bundlePath, this._bundleToOxn(bundle), 'utf-8')
    writeFileSync(assemblyPath, JSON.stringify(flatBundle, null, 2), 'utf-8')
    writeFileSync(schemaPath, JSON.stringify(generateJsonSchema(entities), null, 2), 'utf-8')

    return { bundlePath, assemblyPath, schemaPath, entityCount: entities.length }
  }

  private _yamlToEntities(parsed: Record<string, unknown>): OxnAssemblyBundleEntity[] {
    const entities: OxnAssemblyBundleEntity[] = []

    const name = (parsed.name || parsed.id || 'blueprint') as string
    entities.push({
      type: 'blueprint',
      data: {
        name,
        id: name,
        _version: (parsed._version || 1) as number,
        props: (parsed.props || []) as any[],
        stages: (parsed.parts || parsed.stages || []) as any[],
        expectations: (parsed.expectations as any[]) || [],
        rules: (parsed.rules as any[]) || [],
      } as any,
    })

    return entities
  }

  private _bundleToOxn(bundle: OxnAssemblyBundle): string {
    const lines: string[] = ['// === OXN Bundle (assembled) ===']
    for (const entity of bundle.entities) {
      const data = entity.data as Record<string, unknown>
      const name = (data.name || data.id || 'unnamed') as string
      lines.push(`${entity.type} "${name}" {`)
      if (data.implements) lines.push(`  implements = "${data.implements}"`)
      if (data._version) lines.push(`  version = ${data._version}`)
      lines.push('  // ... (full definition in assembly.json)')
      lines.push('}')
      lines.push('')
    }
    return lines.join('\n')
  }
}

export function compileBundle(sourcePath: string, outputDir?: string): BundleCompileResult {
  return new BundleCompiler().compile(sourcePath, outputDir)
}
