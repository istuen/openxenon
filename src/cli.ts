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
    task: () => import('./commands/task').then(m => m.default),
    arsenal: () => import('./commands/arsenal').then(m => m.default),
    export: () => import('./commands/export').then(m => m.default),
    gc: () => import('./commands/gc').then(m => m.default),
    forge: () => import('./commands/forge').then(m => m.default),
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
