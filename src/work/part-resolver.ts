import { URI } from 'langium'
import { parse as parseYaml } from 'yaml'
import type { StandardAsset } from '../infra/loader'
import { loadStandardByName } from '../infra/loader'
import { isBareProbeRef, isValidProbeRef, parseProbeNamespace } from '../kernel/probes/namespace'
import type { OXNDocument } from '../oxn-dsl/generated/ast.js'
import { generateOxnAssembly } from '../oxn-dsl/generator/oxn-generator.js'
import { createOxnServices, resetOxnServices } from '../oxn-dsl/langium/oxn-services.js'
import type { PartDefinition } from '../kernel/schemas/part-asset'

export interface PartResolution {
  found: boolean
  part?: PartDefinition
  namespace: 'oxn' | 'scope' | 'project'
  scopeName?: string
  originalPath?: string
  rawRef: string
}

export function resolveBuiltinPart(name: string, builtinArsenal: StandardAsset[]): PartDefinition | null {
  const builtin = builtinArsenal.find((a) => a.name === name && a.type === 'parts')
  if (!builtin) return null
  try {
    const def = JSON.parse(builtin.content)
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
  } catch {
    return null
  }
}

export function resolvePartRef(ref: string, projectBoundary: string, builtinArsenal?: StandardAsset[]): PartResolution {
  if (isBareProbeRef(ref)) {
    throw new Error(`Part ref "${ref}" 缺少命名空间前缀。必须使用 oxn/、@scope/ 或 ./ 前缀。`)
  }

  if (!isValidProbeRef(ref)) {
    throw new Error(`Part ref "${ref}" 格式无效`)
  }

  const parsed = parseProbeNamespace(ref)
  if (!parsed) {
    return { found: false, namespace: 'project', rawRef: ref }
  }

  const { namespace, scopeName, probeName } = parsed

  if (namespace === 'oxn') {
    const builtinAssets = builtinArsenal ?? []
    const part = resolveBuiltinPart(probeName, builtinAssets)
    return {
      found: part !== null,
      part: part ?? undefined,
      namespace: 'oxn',
      rawRef: ref,
    }
  }

  if (namespace === 'scope' && scopeName) {
    const isProjectScope = scopeName === 'prj' || scopeName === 'project'
    let cleanProbeName = probeName
    const matchResult = probeName.match(/^(parts|probes|blueprints|stages)\/(.+)$/)
    if (matchResult?.[2]) {
      cleanProbeName = matchResult[2]
    }
    const partData = loadStandardByName(isProjectScope ? 'project' : 'global', projectBoundary, cleanProbeName, 'parts')
    if (partData) {
      try {
        const part = partData.path.endsWith('.oxn')
          ? parseOxnPartFromContent(partData.content, partData.path)
          : (parseYaml(partData.content) as PartDefinition)
        return {
          found: true,
          part,
          namespace: 'scope',
          scopeName,
          originalPath: partData.path,
          rawRef: ref,
        }
      } catch {
        return { found: false, namespace: 'scope', scopeName, rawRef: ref }
      }
    }
    return { found: false, namespace: 'scope', scopeName, rawRef: ref }
  }

  if (namespace === 'project') {
    const partData = loadStandardByName('project', projectBoundary, probeName, 'parts')
    if (partData) {
      try {
        const part = partData.path.endsWith('.oxn')
          ? parseOxnPartFromContent(partData.content, partData.path)
          : (parseYaml(partData.content) as PartDefinition)
        return {
          found: true,
          part,
          namespace: 'project',
          originalPath: partData.path,
          rawRef: ref,
        }
      } catch {
        return { found: false, namespace: 'project', rawRef: ref }
      }
    }
    return { found: false, namespace: 'project', rawRef: ref }
  }

  return { found: false, namespace: 'project', rawRef: ref }
}

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
