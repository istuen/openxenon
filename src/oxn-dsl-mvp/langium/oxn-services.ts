import type { LangiumCoreServices } from 'langium'
import { createServicesForGrammar } from 'langium/grammar'
import { OXNGrammar } from '../generated/grammar'
import { OXNGeneratedModule, OXNDSLGeneratedSharedModule } from '../generated/module'

export type OxnServices = LangiumCoreServices

let _services: OxnServices | null = null

export async function createOxnServices(): Promise<OxnServices> {
  if (_services) return _services
  _services = await createServicesForGrammar({
    grammar: OXNGrammar(),
    module: OXNGeneratedModule,
    sharedModule: OXNDSLGeneratedSharedModule,
  })
  return _services
}

export function resetOxnServices(): void {
  // Langium services are stateless singletons; no-op for MVP
}
