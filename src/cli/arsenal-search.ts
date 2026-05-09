import { defineCommand } from 'citty'
import { sendToDaemon } from './socket-client'
import { isDaemonRunning } from '../daemon/process'
import { DAEMON_SOCK_PATH } from '../infra/global'

export default defineCommand({
  meta: {
    name: 'arsenal-search',
    description: '搜索标准资产（通过 Daemon 的 Registry）'
  },
  args: {
    query: {
      type: 'positional',
      required: false,
      default: '',
      description: '搜索关键词（支持名称、标签、用途）'
    }
  },
  async run(ctx) {
    const { isRunning } = isDaemonRunning()

    if (!isRunning) {
      console.error('Daemon is not running. Start with `oxn daemon start`')
      console.error(`Socket: ${DAEMON_SOCK_PATH}`)
      return
    }

    const query = ctx.args.query as string || ''

    try {
      const response = await sendToDaemon({
        method: 'GET',
        path: '/api/v1/arsenal/search',
        body: { query }
      }) as { matches: Array<{ name: string; type: string; semantics: { intent: string; tags: string[]; useWhen: string } }> }

      const { matches } = response

      if (matches.length === 0) {
        console.log('No assets found.')
        return
      }

      console.log(`Found ${matches.length} asset(s):\n`)

      console.log('NAME          TYPE       TAGS                USEWHEN')
      console.log('─'.repeat(70))

      for (const match of matches) {
        const name = match.name.padEnd(12)
        const type = match.type.padEnd(9)
        const tags = JSON.stringify(match.semantics.tags).padEnd(18)
        const useWhen = match.semantics.useWhen ? match.semantics.useWhen.substring(0, 30) + '...' : ''
        console.log(`${name} ${type} ${tags} ${useWhen}`)
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
})