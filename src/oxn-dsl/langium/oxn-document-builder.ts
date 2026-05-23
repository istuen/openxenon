import { existsSync, readFileSync } from 'fs'
import type { AstNode, LangiumCoreServices, LangiumDocument, LangiumSharedCoreServices } from 'langium'
import { Cancellation, DocumentState, URI } from 'langium'
import { isAbsolute, join } from 'path'
import type { StandardAsset } from '../../infra/loader.js'
import type { TaskDeclaration } from '../generated/ast.js'
import { isSlotBinding, isTaskDeclaration } from '../generated/ast.js'
import type { IOxnWorkspaceManager } from '../scope/oxn-scope.js'
import { parseOxnReference } from '../scope/oxn-scope.js'
import { createOxnServices } from './oxn-services.js'

const { CancellationToken } = Cancellation

export interface ExternalInjectionResult {
  documents: LangiumDocument[]
  injectedCount: number
  errors: string[]
}

function collectBindingRefsFromDocument(document: LangiumDocument): string[] {
  const refs: string[] = []

  if (!document.parseResult?.value) return refs

  const root = document.parseResult.value as { entities?: AstNode[] }

  if (!root.entities) return refs

  for (const entity of root.entities) {
    if (!isTaskDeclaration(entity)) continue

    const task = entity as TaskDeclaration
    if (!task.slotBindings) continue

    for (const binding of task.slotBindings) {
      if (isSlotBinding(binding)) {
        refs.push(binding.ref || '')
      }
    }
  }

  return refs
}

function resolveRefsToPaths(refs: string[], workspaceManager: IOxnWorkspaceManager): Map<string, string> {
  const resolved = new Map<string, string>()

  for (const ref of refs) {
    const parsed = parseOxnReference(ref)
    if (!parsed) continue

    try {
      const asset = workspaceManager.resolve(ref, parsed.type)
      if (asset?.asset && 'path' in asset.asset) {
        const path = (asset.asset as StandardAsset).path
        if (path) {
          resolved.set(ref, path)
        }
      }
    } catch {
      // ref resolution failed, skip
    }
  }

  return resolved
}

export function createOxnDocumentBuilder(
  sharedServices: LangiumSharedCoreServices,
  workspaceManager: IOxnWorkspaceManager,
) {
  return new OxnDocumentBuilder(sharedServices, workspaceManager)
}

export class OxnDocumentBuilder {
  private sharedServices: LangiumSharedCoreServices
  private coreServices: LangiumCoreServices
  private workspaceManager: IOxnWorkspaceManager

  constructor(sharedServices: LangiumSharedCoreServices, workspaceManager: IOxnWorkspaceManager) {
    this.sharedServices = sharedServices
    this.coreServices = createOxnServices(sharedServices)
    this.workspaceManager = workspaceManager
  }

  async buildWithInjection(filePath: string): Promise<ExternalInjectionResult> {
    const errors: string[] = []
    const token = CancellationToken.None
    const langiumDocuments = this.sharedServices.workspace.LangiumDocuments
    const documentBuilder = this.sharedServices.workspace.DocumentBuilder
    const documentFactory = this.sharedServices.workspace.LangiumDocumentFactory

    if (!existsSync(filePath)) {
      return { documents: [], injectedCount: 0, errors: [`File not found: ${filePath}`] }
    }

    const absolutePath = isAbsolute(filePath) ? filePath : join(process.cwd(), filePath)
    const mainUri = URI.file(absolutePath)
    const mainText = readFileSync(absolutePath, 'utf-8')

    let mainDocument: LangiumDocument
    try {
      mainDocument = langiumDocuments.createDocument(mainUri, mainText)
    } catch {
      mainDocument = await documentFactory.fromString(mainText, mainUri, CancellationToken.None)
    }

    await documentBuilder.build([mainDocument], { validation: false }, token)

    if (mainDocument.state < DocumentState.Parsed) {
      return {
        documents: [mainDocument],
        injectedCount: 0,
        errors: ['Failed to parse main document'],
      }
    }

    const bindingRefs = collectBindingRefsFromDocument(mainDocument)
    const resolvedPaths = resolveRefsToPaths(bindingRefs, this.workspaceManager)

    const externalDocuments: LangiumDocument[] = [mainDocument]
    let injectedCount = 0

    for (const [ref, physicalPath] of resolvedPaths) {
      if (!existsSync(physicalPath)) {
        errors.push(`Resolved path not found for ref "${ref}": ${physicalPath}`)
        continue
      }

      try {
        const extUri = URI.file(physicalPath)
        if (langiumDocuments.hasDocument(extUri)) {
          continue
        }

        const extText = readFileSync(physicalPath, 'utf-8')
        const extDoc = await documentFactory.fromString(extText, extUri, token)
        langiumDocuments.addDocument(extDoc)
        externalDocuments.push(extDoc)
        injectedCount++
      } catch (err) {
        errors.push(`Failed to inject external document for ref "${ref}" at ${physicalPath}: ${String(err)}`)
      }
    }

    if (externalDocuments.length > 1) {
      await documentBuilder.build(externalDocuments, { validation: false }, token)
    }

    return { documents: externalDocuments, injectedCount, errors }
  }

  getCoreServices(): LangiumCoreServices {
    return this.coreServices
  }

  getSharedServices(): LangiumSharedCoreServices {
    return this.sharedServices
  }
}
