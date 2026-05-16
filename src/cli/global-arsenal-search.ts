import { defineCommand } from 'citty'
import { sendToDaemon } from './socket-client'
import { isDaemonRunning } from '../daemon/process'
import { DAEMON_SOCK_PATH } from '../infra/global'
import { OxnErrorCode, ErrorCategory } from '../kernel/enums'

export default defineCommand({
  meta: {
    name: 'arsenal-search',
    description: '搜索全局标准资产（通过 Daemon 的 Registry）'
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
      console.log(JSON.stringify({
        ok: false,
        error: {
          code: OxnErrorCode.SOCKET_REFUSED,
          message: 'Daemon 未运行',
          category: ErrorCategory.INFRA,
          recoverable: true,
          suggestion: `请先执行 oxn global daemon start 启动 Daemon（socket: ${DAEMON_SOCK_PATH}）`
        }
      }))
      return
    }

    const query = ctx.args.query as string || ''

    const response = await sendToDaemon({
      method: 'GET',
      path: '/api/v1/arsenal/search',
      body: { query, scope: 'global' }
    }) as { ok: boolean; data?: { matches: Array<{ name: string; type: string; semantics: { intent: string; tags: string[]; useWhen: string } }> }; error?: { code: string; message: string; category: string; recoverable: boolean; suggestion: string } }

    if (!response.ok) {
      throw response.error
    }

    const matches = response.data?.matches || []

    if (matches.length === 0) {
      console.log('No global assets found.')
      return
    }

    console.log(`Found ${matches.length} global asset(s):\n`)

    console.log('NAME          TYPE       TAGS                USEWHEN')
    console.log('─'.repeat(70))

    for (const match of matches) {
      const name = match.name.padEnd(12)
      const type = match.type.padEnd(9)
      const tags = JSON.stringify(match.semantics.tags).padEnd(18)
      const useWhen = match.semantics.useWhen ? match.semantics.useWhen.substring(0, 30) + '...' : ''
      console.log(`${name} ${type} ${tags} ${useWhen}`)
    }
  }
})