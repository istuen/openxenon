import { parse as parseYaml } from 'yaml'
import type { PartDefinition } from '../kernel/schemas/validators/part-asset'
import { type PartPort } from '../kernel/contracts/part-port'
import { parseProbeNamespace } from '../oxn-dsl/validators/probe-namespace'
import { BUILTIN_PARTS } from './builtin'
import { loadStandardByName } from '../infra/loader'
import { getProjectBoundaryPath } from '../cli/project'
import { URI } from 'langium'
import type { OXNDocument } from '../oxn-dsl/generated/ast.js'
import { generateOxnAssembly } from '../oxn-dsl/generator/oxn-generator.js'
import { createOxnServices, resetOxnServices } from '../oxn-dsl/langium/oxn-services.js'

function parseOxnPartFromContent(content: string, path: string): PartDefinition {
  let services: ReturnType<typeof createOxnServices> | undefined
  try {
    services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)

    const factory = shared.workspace.LangiumDocumentFactory
    const uri = URI.file(path)
    const doc = factory.fromString(content, uri, undefined)

    if (!doc.parseResult?.value) {
      throw new Error(`无法解析 ${path}: 无有效 parseResult`)
    }

    if (doc.parseResult.parserErrors?.length > 0) {
      const errs = doc.parseResult.parserErrors.map((e) => `[P] ${e.message}`).join('; ')
      throw new Error(`解析 ${path} 失败: ${errs}`)
    }
    if (doc.parseResult.lexerErrors?.length > 0) {
      const errs = doc.parseResult.lexerErrors.map((e) => `[L] ${e.message}`).join('; ')
      throw new Error(`词法分析 ${path} 失败: ${errs}`)
    }

    const bundle = generateOxnAssembly(doc.parseResult.value as OXNDocument)

    const partEntity = bundle.entities.find((e) => e.type === 'part')
    if (partEntity) {
      const part = (partEntity as unknown as { data: PartDefinition }).data
      if (part?.name) {
        if (!part.id) part.id = part.name
        return part
      }
    }
  } finally {
    resetOxnServices()
  }
  throw new Error(`无法从 ${path} 解析出有效的 Part`)
}

function resolveBuiltinPart(name: string): PartDefinition | null {
  const def = BUILTIN_PARTS[name]
  if (!def) return null
  return {
    id: def.id || name,
    name: def.name || name,
    _version: def._version ?? 1,
    description: def.description || '',
    props: def.props,
    target: def.target,
    spec: def.spec,
    action: def.action,
    probes: def.probes as PartDefinition['probes'],
    deps: def.deps,
  }
}

function resolveFromArsenal(
  type: 'parts' | 'probes' | 'blueprints',
  name: string,
  scope: 'project' | 'global',
  projectBoundary: string,
): PartDefinition | null {
  const asset = loadStandardByName(scope, projectBoundary, name, type)
  if (!asset) return null

  try {
    if (asset.path.endsWith('.oxn')) {
      return parseOxnPartFromContent(asset.content, asset.path)
    }
    return parseYaml(asset.content) as PartDefinition
  } catch {
    return null
  }
}

export class ArsenalPartPort implements PartPort {
  private projectBoundary: string

  constructor(projectBoundary?: string) {
    this.projectBoundary = projectBoundary || getProjectBoundaryPath(process.cwd())
  }

  async fetchPartDefinition(logicalRef: string): Promise<PartDefinition | null> {
    const parsed = parseProbeNamespace(logicalRef)
    if (!parsed) {
      if (logicalRef.startsWith('oxn://')) {
        const match = logicalRef.match(/^oxn:\/\/([^\/]+)\/(.+)$/)
        if (match) {
          const name = match[2]
          if (name) {
            return resolveBuiltinPart(name)
          }
        }
      }
      return null
    }

    const { namespace, scopeName, probeName } = parsed

    if (namespace === 'oxn') {
      return resolveBuiltinPart(probeName)
    }

    if (namespace === 'scope' && scopeName) {
      const isProjectScope = scopeName === 'prj' || scopeName === 'project'
      let cleanProbeName = probeName
      const matchResult = probeName.match(/^(parts|probes|blueprints|stages)\/(.+)$/)
      if (matchResult?.[2]) {
        cleanProbeName = matchResult[2]
      }
      return resolveFromArsenal('parts', cleanProbeName, isProjectScope ? 'project' : 'global', this.projectBoundary)
    }

    if (namespace === 'project') {
      return resolveFromArsenal('parts', probeName, 'project', this.projectBoundary)
    }

    return null
  }
}

export function createArsenalPartPort(projectBoundary?: string): PartPort {
  return new ArsenalPartPort(projectBoundary)
}
