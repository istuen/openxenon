import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createOxnServices } from '../oxn-dsl/langium/oxn-services'
import { categorizeEntities } from '../oxn-dsl/generator/oxn-generator'
import type { OXNDocument } from '../oxn-dsl/generated/ast'
import { URI } from 'langium'

const BUILTIN_BASE = resolve(process.cwd(), 'src/builtin')

export function resolveOxnBuiltin(ref: string): string | null {
  if (!ref.startsWith('@oxn/')) {
    return null
  }

  const parts = ref.replace('@oxn/', '').split('/')
  if (parts.length < 2) {
    return null
  }

  const [type, name] = parts
  const ext = '.oxn'

  switch (type) {
    case 'blueprints':
      return resolve(BUILTIN_BASE, 'blueprints', `${name}${ext}`)
    case 'probes':
      return resolve(BUILTIN_BASE, 'probes', `${name}${ext}`)
    case 'parts':
      return resolve(BUILTIN_BASE, 'parts', `${name}${ext}`)
    default:
      return null
  }
}

export function loadBuiltinAsset(ref: string): string | null {
  const path = resolveOxnBuiltin(ref)
  if (!path) {
    return null
  }

  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return null
  }
}

export function isBuiltinRef(ref: string): boolean {
  return ref.startsWith('@oxn/')
}

export function resolveBuiltinBlueprint(workRef: string): { blueprint: unknown; parts: unknown[] } | null {
  if (!workRef.startsWith('@oxn/blueprints/')) {
    return null
  }

  const blueprintPath = resolveOxnBuiltin(workRef)
  if (!blueprintPath) {
    return null
  }

  try {
    const content = readFileSync(blueprintPath, 'utf-8')
    const services = createOxnServices()
    const shared = services.shared
    shared.ServiceRegistry.register(services)
    const uri = URI.file(blueprintPath)
    const factory = shared.workspace.LangiumDocumentFactory
    const doc = factory.fromString(content, uri, undefined)

    if (doc.parseResult?.parserErrors?.length) {
      return null
    }

    const ast = doc.parseResult?.value as OXNDocument
    const categorized = categorizeEntities(ast)

    return {
      blueprint: categorized.blueprints[0] || null,
      parts: categorized.parts,
    }
  } catch {
    return null
  }
}
