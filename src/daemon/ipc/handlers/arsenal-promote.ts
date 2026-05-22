import { registerRoute } from '../router'
import { globalArsenalRegistry } from '../../registry'
import { existsSync, renameSync } from '../../../infra/filesystem'
import { join } from 'path'
import type { AssetType } from '../../../arsenals/paths'

interface PromoteRequest {
  asset: string
  assetType: AssetType
}

async function handleArsenalPromote(request: Request, projectPath: string): Promise<Response> {
  try {
    const body = (await request.json()) as PromoteRequest
    const { asset, assetType } = body

    if (!asset || !assetType) {
      return new Response(JSON.stringify({ error: 'InvalidRequest', message: 'asset and assetType are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const projectBoundary = projectPath || process.cwd()
    const draftPath = join(projectBoundary, 'arsenals', assetType, asset, 'draft.yaml')

    if (!existsSync(draftPath)) {
      return new Response(
        JSON.stringify({ error: 'NotFound', message: `Draft asset not found: ${asset}/${assetType}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const canonicalPath = join(projectBoundary, 'arsenals', assetType, asset, 'canonical.yaml')

    if (existsSync(canonicalPath)) {
      return new Response(
        JSON.stringify({ error: 'Conflict', message: `Canonical asset already exists: ${asset}/${assetType}` }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      )
    }

    renameSync(draftPath, canonicalPath)

    globalArsenalRegistry.buildIndex(projectBoundary)

    return new Response(
      JSON.stringify({
        success: true,
        asset,
        assetType,
        fromPath: draftPath,
        toPath: canonicalPath,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: 'InternalError', message: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

registerRoute('POST', '/api/v1/arsenal/promote', handleArsenalPromote)

export { handleArsenalPromote }
