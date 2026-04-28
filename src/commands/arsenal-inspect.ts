import { defineCommand } from 'citty'
import { createInterface } from 'node:readline'
import { loadStandardsByState, loadStandardByPath, type StandardAsset } from '../core/standards-loader'
import { ensureStandardsDirectories } from '../core/standards-init'

export default defineCommand({
  meta: {
    name: 'arsenal-inspect',
    description: '查看标准资产内容'
  },
  args: {
    path: {
      type: 'positional',
      required: false,
      description: '资产路径（如 arsenal/proofs/DRAFT/my-proof.yaml）'
    }
  },
  async run(ctx) {
    ensureStandardsDirectories()

    const relativePath = ctx.args.path as string | undefined

    if (!relativePath) {
      const draftAssets = loadStandardsByState('DRAFT')

      if (draftAssets.length === 0) {
        console.log('当前没有 DRAFT 状态的资产')
        return
      }

      console.log('请选择要查看的资产：\n')

      draftAssets.forEach((asset, index) => {
        const relativeAssetPath = asset.path.split('.openxenon/arsenal/')[1]
        console.log(`  [${index + 1}] ${relativeAssetPath}`)
      })

      console.log('\n输入编号 (或 q 退出):')

      const selectedAsset = await promptSelection(draftAssets)
      if (!selectedAsset) {
        console.log('已退出')
        return
      }

      displayAsset(selectedAsset)
      return
    }

    const asset = loadStandardByPath(relativePath)

    if (!asset) {
      console.error(`资产不存在: ${relativePath}`)
      console.error('请提供有效的资产路径。')
      return
    }

    displayAsset(asset)
  }
})

function displayAsset(asset: StandardAsset): void {
  console.log(`# ${asset.name}`)
  console.log(`Type: ${asset.type}`)
  console.log(`State: ${asset.state}`)
  console.log(`Path: ${asset.path}`)
  console.log('\n--- Content ---')
  console.log(asset.content)
}

async function promptSelection(assets: StandardAsset[]): Promise<StandardAsset | null> {
  const iface = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    iface.question('', (answer) => {
      iface.close()

      if (answer.toLowerCase() === 'q') {
        resolve(null)
        return
      }

      const index = parseInt(answer, 10) - 1
      if (isNaN(index) || index < 0 || index >= assets.length) {
        console.log('无效的选择')
        resolve(null)
        return
      }

      resolve(assets[index]!)
    })
  })
}