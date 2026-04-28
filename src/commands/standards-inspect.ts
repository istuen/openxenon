import { defineCommand } from 'citty'
import { loadStandardByPath } from '../core/standards-loader'
import { ensureStandardsDirectories } from '../core/standards-init'

export default defineCommand({
  meta: {
    name: 'standards-inspect',
    description: '查看标准资产内容'
  },
  args: {
    path: {
      type: 'positional',
      required: true,
      description: '资产路径（如 standards/proofs/DRAFT/my-proof.yaml）'
    }
  },
  async run(ctx) {
    ensureStandardsDirectories()

    const relativePath = ctx.args.path
    const asset = loadStandardByPath(relativePath)

    if (!asset) {
      console.error(`Asset not found: ${relativePath}`)
      console.error('Please provide a valid asset path.')
      return
    }

    console.log(`# ${asset.name}`)
    console.log(`Type: ${asset.type}`)
    console.log(`State: ${asset.state}`)
    console.log(`Path: ${asset.path}`)
    console.log('\n--- Content ---')
    console.log(asset.content)
  }
})