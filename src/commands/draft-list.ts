import { defineCommand } from 'citty'
import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { cliContext } from '../cli-context'

export default defineCommand({
  meta: {
    name: 'list',
    description: '列出 drafts 目录中的所有草案文件'
  },
  args: {},
  async run() {
    const draftsDir = join(process.cwd(), '.openxenon', 'drafts')

    if (!existsSync(draftsDir)) {
      if (!cliContext.isJsonMode()) {
        console.log('No drafts directory found.')
      }
      return
    }

    const files = readdirSync(draftsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.json') || f.endsWith('.yml'))

    if (files.length === 0) {
      if (!cliContext.isJsonMode()) {
        console.log('No draft files found.')
      }
      return
    }

    if (!cliContext.isJsonMode()) {
      console.log(`\nDraft files in ${draftsDir}:`)
      for (const file of files) {
        const filePath = join(draftsDir, file)
        const stat = statSync(filePath)
        const mtime = new Date(stat.mtime).toISOString()
        console.log(`  ${file} (modified: ${mtime})`)
      }
      console.log(`\nTotal: ${files.length} files`)
    }
  }
})
