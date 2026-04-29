import { defineCommand } from 'citty'
import { promoteStandard, loadStandardByPath } from '../core/arsenals-loader'
import { ensureArsenalsDirectories } from '../core/arsenals-init'

export default defineCommand({
  meta: {
    name: 'arsenal-promote',
    description: '将 DRAFT 资产转正为 CANONICAL'
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: 'DRAFT 资产路径'
    }
  },
  async run(ctx) {
    ensureStandardsDirectories()

    const relativePath = ctx.args.path

    const asset = loadStandardByPath(relativePath)
    if (!asset) {
      console.error(`Asset not found: ${relativePath}`)
      return
    }

    if (asset.state !== 'draft') {
      console.error(`Asset is not in draft state: ${relativePath}`)
      console.error('Only draft assets can be promoted.')
      return
    }

    try {
      const promoted = promoteStandard(relativePath)

      if (!promoted) {
        console.error('Failed to promote asset.')
        return
      }

      console.log('Asset promoted successfully!')
      console.log(`  Name: ${promoted.name}`)
      console.log(`  Type: ${promoted.type}`)
      console.log(`  New State: ${promoted.state}`)
      console.log(`  New Path: ${promoted.path}`)
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
})