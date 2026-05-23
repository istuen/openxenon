import { URI } from 'langium'
import { parse as parseYaml } from 'yaml'
import { BUILTIN_PARTS } from '../../arsenals/builtin'
// eslint-disable-next-line no-restricted-imports -- TODO(Phase-3): pure functions to kernel, loadStandardByName via higher-order injection
import { isBareProbeRef, isValidProbeRef, loadStandardByName, parseProbeNamespace } from '../../infra/loader'
import type { OXNDocument } from '../../oxn-dsl/generated/ast.js'
import { generateOxnAssembly } from '../../oxn-dsl/generator/oxn-generator.js'
import { createOxnServices, resetOxnServices } from '../../oxn-dsl/langium/oxn-services.js'
import type { PartDefinition } from '../schemas/part-asset'

export interface PartResolution {
  found: boolean
  part?: PartDefinition
  namespace: 'oxn' | 'scope' | 'project'
  scopeName?: string
  originalPath?: string
  rawRef: string
}

export function resolveBuiltinPart(name: string): PartDefinition | null {
  const builtin = BUILTIN_PARTS[name]
  if (!builtin) return null
  return {
    id: builtin.id || name,
    name: builtin.name || name,
    _version: builtin._version ?? 1,
    description: builtin.description || '',
    props: builtin.props,
    target: builtin.target,
    spec: builtin.spec,
    action: builtin.action,
    probes: builtin.probes as PartDefinition['probes'],
    deps: builtin.deps,
  }
}

export function resolvePartRef(ref: string, projectBoundary: string): PartResolution {
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
    const part = resolveBuiltinPart(probeName)
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
