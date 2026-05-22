import type { LangiumSharedCoreServices, LangiumCoreServices } from 'langium'
import { inject, createDefaultSharedCoreModule, createDefaultCoreModule } from 'langium'
import { NodeFileSystem } from 'langium/node'
import { OXNDSLGeneratedSharedModule, OXNGeneratedModule } from '../generated/module.js'

let _sharedServices: LangiumSharedCoreServices | null = null
let _oxnServices: LangiumCoreServices | null = null

export function createOxnSharedServices(): LangiumSharedCoreServices {
  if (_sharedServices) return _sharedServices

  _sharedServices = inject(
    createDefaultSharedCoreModule({
      fileSystemProvider: (_services: LangiumSharedCoreServices) => NodeFileSystem,
    } as Record<string, unknown> as any),
    OXNDSLGeneratedSharedModule,
  ) as unknown as LangiumSharedCoreServices

  return _sharedServices
}

export function createOxnServices(shared?: LangiumSharedCoreServices): LangiumCoreServices {
  if (_oxnServices) return _oxnServices

  const sharedServices = shared || createOxnSharedServices()

  _oxnServices = inject(
    createDefaultCoreModule({ shared: sharedServices } as Record<string, unknown> as any),
    OXNGeneratedModule,
  ) as unknown as LangiumCoreServices

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
