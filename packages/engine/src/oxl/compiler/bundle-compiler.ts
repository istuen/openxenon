/**
 * bundle-compiler.ts — Bundle compilation (v0.7.0: Langium removed)
 *
 * v0.7.0: Only YAML and JSON input supported; .oxn parsing removed
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { basename, dirname, join } from 'path'
import { parse as parseYaml } from 'yaml'
import type { OxnAssemblyBundle, OxnAssemblyBundleEntity } from '../schemas/oxn-assembly.schema'
import { flattenBundle } from '../flattener/bundle-flattener.js'

// ========================
// JSON Schema generator (simplified)
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
// Bundle compiler
// ========================

export interface BundleCompileResult {
  bundlePath: string
  assemblyPath: string
  schemaPath: string
  entityCount: number
}

export class BundleCompiler {
  /**
   * Compile specified .yaml/.json file, producing three artifacts
   */
  compile(sourcePath: string, outputDir?: string): BundleCompileResult {
    if (!existsSync(sourcePath)) {
      throw new Error(`Source file not found: ${sourcePath}`)
    }

    const sourceName = basename(sourcePath).replace(/\.(yaml|yml|json)$/, '')
    const outDir = outputDir || dirname(sourcePath)

    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }

    // 1. Read source file
    const content = readFileSync(sourcePath, 'utf-8')
    let entities: OxnAssemblyBundleEntity[] = []

    if (sourcePath.endsWith('.yaml') || sourcePath.endsWith('.yml')) {
      const parsed = parseYaml(content) as Record<string, unknown>
      entities = this._yamlToEntities(parsed)
    } else if (sourcePath.endsWith('.json')) {
      const parsed = JSON.parse(content) as OxnAssemblyBundle
      entities = parsed.entities
    } else {
      throw new Error(`Unsupported file format: ${sourcePath}. Only .yaml/.yml/.json are supported in v0.7.0`)
    }

    const bundle: OxnAssemblyBundle = { entities }

    // 2. Flatten
    const { bundle: flatBundle } = flattenBundle(bundle)

    // 3. Output three artifacts
    const bundlePath = join(outDir, `${sourceName}.bundle.yaml`)
    const assemblyPath = join(outDir, `${sourceName}.bundle.assembly.json`)
    const schemaPath = join(outDir, `${sourceName}.bundle.assembly.schema.json`)

    writeFileSync(bundlePath, this._bundleToYaml(bundle), 'utf-8')
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

  private _bundleToYaml(bundle: OxnAssemblyBundle): string {
    const lines: string[] = ['# === OXN Bundle (assembled) ===']
    for (const entity of bundle.entities) {
      const data = entity.data as Record<string, unknown>
      const name = (data.name || data.id || 'unnamed') as string
      lines.push(`${entity.type}:`)
      lines.push(`  name: "${name}"`)
      if (data.implements) lines.push(`  implements: "${data.implements}"`)
      if (data._version) lines.push(`  version: ${data._version}`)
      lines.push('  # ... (full definition in assembly.json)')
      lines.push('')
    }
    return lines.join('\n')
  }
}

export function compileBundle(sourcePath: string, outputDir?: string): BundleCompileResult {
  return new BundleCompiler().compile(sourcePath, outputDir)
}
