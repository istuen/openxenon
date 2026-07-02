import type { LangiumCoreServices, LangiumSharedCoreServices } from 'langium'
import { createDefaultCoreModule, createDefaultSharedCoreModule, inject } from 'langium'
import { NodeFileSystem } from 'langium/node'
import { OpenXenonLanguageGeneratedSharedModule, OXNGeneratedModule } from './generated/module.js'
import { registerOxnValidators } from '../validator/oxn-validation.js'

let _sharedServices: LangiumSharedCoreServices | null = null
let _oxnServices: LangiumCoreServices | null = null

export function createOxnSharedServices(): LangiumSharedCoreServices {
  if (_sharedServices) return _sharedServices

  _sharedServices = inject(
    createDefaultSharedCoreModule({
      fileSystemProvider: (_services: LangiumSharedCoreServices) => NodeFileSystem,
    } as Record<string, unknown> as any),
    OpenXenonLanguageGeneratedSharedModule,
  ) as unknown as LangiumSharedCoreServices

  // v0.6.1-alpha.0 #1-14/#2-10: Monkey-patch ServiceRegistry.register to be
  // idempotent. Langium internally warns "multiple languages" on every
  // duplicate .oxn registration. Our codebase has 8+ callers of
  // `shared.ServiceRegistry.register(services)` which makes the warning
  // appear multiple times. Wrap register to dedupe by fileExtension.
  const registry = _sharedServices.ServiceRegistry as unknown as {
    _oxnRegistered?: Set<string>
    register: (language: unknown) => void
  }
  if (!(registry as { _oxnRegistered?: Set<string> })._oxnRegistered) {
    ;(registry as { _oxnRegistered?: Set<string> })._oxnRegistered = new Set<string>()
    const originalRegister = registry.register.bind(registry)
    registry.register = (language: unknown) => {
      const data = (
        language as { LanguageMetaData?: { fileExtensions?: string[]; fileNames?: string[]; languageId?: string } }
      ).LanguageMetaData
      if (!data) {
        originalRegister(language)
        return
      }
      const seen = (registry as { _oxnRegistered?: Set<string> })._oxnRegistered!
      let dup = false
      for (const ext of data.fileExtensions ?? []) {
        if (seen.has(ext)) dup = true
        else seen.add(ext)
      }
      for (const name of data.fileNames ?? []) {
        if (seen.has(name)) dup = true
        else seen.add(name)
      }
      if (dup) return // skip duplicate (langium still functions)
      originalRegister(language)
    }
  }

  return _sharedServices
}

export function createOxnServices(shared?: LangiumSharedCoreServices): LangiumCoreServices {
  if (_oxnServices) return _oxnServices

  const sharedServices = shared || createOxnSharedServices()

  _oxnServices = inject(
    createDefaultCoreModule({ shared: sharedServices } as Record<string, unknown> as any),
    OXNGeneratedModule,
  ) as unknown as LangiumCoreServices

  // v0.6.1-alpha.0 #1-14/#2-10: ServiceRegistry.register is patched
  // to be idempotent in createOxnSharedServices. Direct register here
  // is still safe (it'll be a no-op if already registered).
  _oxnServices.shared.ServiceRegistry.register(_oxnServices)

  registerOxnValidators(_oxnServices)

  return _oxnServices
}

export function getOxnServices(): LangiumCoreServices {
  return _oxnServices || createOxnServices()
}

export function getOxnSharedServices(): LangiumSharedCoreServices {
  return _sharedServices || createOxnSharedServices()
}

export function resetOxnServices(): void {
  _sharedServices = null
  _oxnServices = null
}

// ---------------------------------------------------------------------------
// OxnParser — minimal async-style parser, ported from the mvp leader so the
// CLI does not need to import Langium's full document builder. Builds a
// Langium document from an in-memory string and reports parse/lexer errors.
// ---------------------------------------------------------------------------

import type { URI } from 'langium'

export type OxnParseResult = {
  uri: URI
  content: string
  ast: unknown
  parseErrors: string[]
  lexerErrors: string[]
}

export class OxnParser {
  private services: LangiumCoreServices
  private registered = false

  constructor(services: LangiumCoreServices) {
    this.services = services
  }

  private ensureRegistered(): void {
    if (this.registered) return
    // Langium requires each language's services to be registered with the
    // shared ServiceRegistry before documents can be built. Idempotent.
    this.services.shared.ServiceRegistry.register(this.services)
    this.registered = true
  }

  async parse(content: string, uri: URI): Promise<OxnParseResult> {
    this.ensureRegistered()
    const factory = this.services.shared.workspace.LangiumDocumentFactory
    const doc = factory.fromString(content, uri, undefined)
    return {
      uri,
      content,
      ast: doc.parseResult?.value,
      parseErrors: (doc.parseResult?.parserErrors || []).map((e: { message: string }) => e.message),
      lexerErrors: (doc.parseResult?.lexerErrors || []).map((e: { message: string }) => e.message),
    }
  }
}

/**
 * Convenience: build an OxnParser over the singleton services.
 * Mirrors `getOxnServices()` for the parser layer.
 */
export function createOxnParser(): OxnParser {
  return new OxnParser(getOxnServices())
}
