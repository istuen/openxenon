import { defineCommand, runMain } from 'citty'
import { cliContext } from './cli-context'

const main = defineCommand({
  meta: {
    name: 'oxn',
    version: '1.0.0',
    description: 'OpenXenon CLI - 面向大语言模型的工程化控制引擎'
  },
  subCommands: {
    init: () => import('./commands/init').then(m => m.default),
    daemon: () => import('./commands/daemon').then(m => m.default),
    api: () => import('./commands/api').then(m => m.default),
    inspect: () => import('./commands/inspect').then(m => m.default),
    trace: () => import('./commands/trace').then(m => m.default),
    rollback: () => import('./commands/rollback').then(m => m.default),
    'force-pass': () => import('./commands/force-pass').then(m => m.default),
    'proof-list': () => import('./commands/proof-list').then(m => m.default),
    migrate: () => import('./commands/migrate').then(m => m.default),
    task: () => import('./commands/task').then(m => m.default),
    draft: () => import('./commands/draft').then(m => m.default),
    export: () => import('./commands/export').then(m => m.default),
    gc: () => import('./commands/gc').then(m => m.default),
  },
  args: {
    verbose: {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output',
      default: false
    },
    json: {
      alias: 'j',
      type: 'boolean',
      description: 'Output in JSON format',
      default: false
    }
  },
  async run({ args }) {
    cliContext.setJsonMode(args.json as boolean)
    if (!cliContext.isJsonMode()) {
      console.log('OpenXenon CLI')
      console.log('Run `oxn --help` for usage information')
    }
  }
})

runMain(main)
