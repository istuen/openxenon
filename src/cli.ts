import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'xn',
    version: '1.0.0',
    description: 'Xenonix CLI - 面向大语言模型的工程化控制引擎'
  },
  subCommands: {
    init: () => import('./commands/init').then(m => m.default),
    daemon: () => import('./commands/daemon').then(m => m.default),
    api: () => import('./commands/api').then(m => m.default),
    inspect: () => import('./commands/inspect').then(m => m.default),
    trace: () => import('./commands/trace').then(m => m.default),
    rollback: () => import('./commands/rollback').then(m => m.default),
    'force-pass': () => import('./commands/force-pass').then(m => m.default),
    'proof-list': () => import('./commands/proof-list').then(m => m.default)
  },
  args: {
    verbose: {
      alias: 'v',
      type: 'boolean',
      description: 'Enable verbose output',
      default: false
    }
  },
  async run() {
    console.log('Xenonix CLI')
    console.log('Run `xn --help` for usage information')
  }
})

runMain(main)
